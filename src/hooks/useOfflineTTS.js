import { useEffect, useRef } from 'react'
import { registerPlugin } from '@capacitor/core'
import KokoroWorker from '../workers/kokoroWorker?worker'
import PowerSaveManager from '../utils/PowerSaveManager'

const LauncherPlugin = registerPlugin('LauncherPlugin')

function pcmToWavBlob(pcmData, sampleRate = 24000) {
  const numChannels = 1
  const bitsPerSample = 16
  const bytesPerSample = bitsPerSample / 8
  const blockAlign = numChannels * bytesPerSample
  const byteRate = sampleRate * blockAlign
  const dataSize = pcmData.length * bytesPerSample
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  const writeString = (v, offset, str) => {
    for (let i = 0; i < str.length; i++) v.setUint8(offset + i, str.charCodeAt(i))
  }

  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  let offset = 44
  for (let i = 0; i < pcmData.length; i++) {
    const s = Math.max(-1, Math.min(1, pcmData[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
    offset += 2
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

export default function useOfflineTTS({ speechInterruptRef }) {
  const kokoroWorkerRef = useRef(null)
  const activeAudioRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const canvasRef = useRef(null)
  const ttsResolvers = useRef(new Map())
  const audioQueueRef = useRef([])
  const isPlayingRef = useRef(false)
  const idleTimerRef = useRef(null)
  const safetyTimerRef = useRef(null)
  const objectUrlsRef = useRef([])

  // Audio Visualizer animation loop
  useEffect(() => {
    let animationFrame;
    const draw = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (analyserRef.current && isPlayingRef.current) {
          const bufferLength = analyserRef.current.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          analyserRef.current.getByteFrequencyData(dataArray);
          const barWidth = (canvas.width / bufferLength) * 2.5;
          let x = 0;
          for (let i = 0; i < bufferLength; i++) {
            const barHeight = dataArray[i] / 2;
            ctx.fillStyle = `rgba(0, 242, 255, ${Math.min(1, barHeight / 50 + 0.2)})`;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 2;
          }
        }
      }
      animationFrame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  // Cleanup audio resources on unmount
  useEffect(() => {
    return () => {
      kokoroWorkerRef.current?.terminate()
      kokoroWorkerRef.current = null
      if (activeAudioRef.current) activeAudioRef.current.pause()
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
        audioContextRef.current = null
        analyserRef.current = null
      }
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current)
      objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url))
      objectUrlsRef.current = []
    }
  }, [])

  const clearIdleTimer = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
  }

  const initWorker = () => {
    if (kokoroWorkerRef.current) return
    try {
      kokoroWorkerRef.current = new KokoroWorker()
      kokoroWorkerRef.current.onmessage = (e) => {
        const { type, id, blob, pcmData, sampleRate, error, text } = e.data
        if (type === 'AUDIO_READY' || type === 'audio') {
          if (speechInterruptRef.current) { handleChunkEnd(id); return }
          let audioBlob = blob
          if (!audioBlob && pcmData) {
            audioBlob = pcmToWavBlob(new Float32Array(pcmData), sampleRate || 24000)
          }
          if (audioBlob) {
            audioQueueRef.current.push({ blob: audioBlob, id, text })
            if (!isPlayingRef.current) playNextAudio()
          } else {
            handleChunkEnd(id)
          }
        } else if (type === 'ERROR' || type === 'error') {
          console.warn('Kokoro TTS error fallback:', error)
          handleChunkEnd(id)
        }
      }
      kokoroWorkerRef.current.postMessage({ type: 'init' })
    } catch (e) {
      console.warn('KokoroWorker initialization error:', e)
    }
  }

  const handleChunkEnd = (id) => {
    if (ttsResolvers.current.has(id)) {
      const state = ttsResolvers.current.get(id)
      state.remaining -= 1
      if (state.remaining <= 0) {
        state.resolve()
        ttsResolvers.current.delete(id)
      }
    }
  }

  const playNextAudio = () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false
      idleTimerRef.current = setTimeout(() => {
        if (kokoroWorkerRef.current) {
          kokoroWorkerRef.current.terminate()
          kokoroWorkerRef.current = null
        }
      }, 30000)
      return
    }
    if (speechInterruptRef.current) { audioQueueRef.current = []; isPlayingRef.current = false; return }
    isPlayingRef.current = true
    clearIdleTimer()
    const { blob, id, text } = audioQueueRef.current.shift()
    const url = URL.createObjectURL(blob)

    if (!activeAudioRef.current) {
      const el = new Audio();
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        const source = audioCtx.createMediaElementSource(el);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;
      } catch (e) { /* Web Audio API unavailable */ }
      activeAudioRef.current = el;
    }
    const audio = activeAudioRef.current;
    audio.src = url;
    objectUrlsRef.current.push(url)
    let settled = false
    const settle = () => {
      if (settled) return
      settled = true
      URL.revokeObjectURL(url)
      objectUrlsRef.current = objectUrlsRef.current.filter(u => u !== url)
      handleChunkEnd(id)
      playNextAudio()
    }
    audio.onended = settle
    audio.play().then(() => {
      const state = ttsResolvers.current.get(id)
      if (state && state.onFirstChunk) state.onFirstChunk()
    }).catch((err) => {
      console.warn('Audio playback blocked or failed, falling back to native TTS', err)
      const state = ttsResolvers.current.get(id)
      if (state && state.onFirstChunk) state.onFirstChunk()
      Promise.race([
        LauncherPlugin.speakText({ text: text || '' }),
        new Promise(r => setTimeout(r, 3000))
      ]).then(settle).catch(settle)
    })
  }

  const speakTextNative = (text, onAudioStart) => {
    return new Promise((resolve) => {
      if (speechInterruptRef.current) return resolve()
      if (localStorage.getItem('assistant_tts_enabled') === 'false') {
        const readTime = Math.max(1500, text.length * 50)
        if (onAudioStart) onAudioStart()
        setTimeout(resolve, readTime)
        return
      }
      clearIdleTimer()
      const chunks = text.match(/.*?[.!?](?:\s|$)|.+$/g)?.map(s => s.trim()).filter(Boolean) || [text]
      const jobId = Date.now().toString() + Math.random()
      let audioStarted = false
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current)
      safetyTimerRef.current = setTimeout(() => { ttsResolvers.current.delete(jobId); resolve() }, 30000)
      const wrappedResolve = () => {
        if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current)
        ttsResolvers.current.delete(jobId)
        const waitForAudio = () => {
          if (isPlayingRef.current || audioQueueRef.current.length > 0) {
            setTimeout(waitForAudio, 200)
          } else {
            resolve()
          }
        }
        waitForAudio()
      }
      ttsResolvers.current.set(jobId, {
        resolve: wrappedResolve,
        remaining: chunks.length,
        onFirstChunk: () => {
          if (!audioStarted) {
            audioStarted = true
            if (onAudioStart) onAudioStart()
          }
        }
      })

      const kokoroVoice = localStorage.getItem('kokoro_voice') || 'af_heart'
      const voicePitch = parseFloat(localStorage.getItem('iris_voice_pitch') || '1.0')
      const voiceRate = parseFloat(localStorage.getItem('iris_voice_rate') || '0.96')

      if (!PowerSaveManager.shouldDisable('piper')) {
        initWorker()
        if (kokoroWorkerRef.current) {
          chunks.forEach(chunk => kokoroWorkerRef.current.postMessage({ 
            type: 'speak', 
            text: chunk.trim(), 
            id: jobId, 
            voice: kokoroVoice,
            pitch: voicePitch,
            rate: voiceRate
          }))
        } else {
          ttsResolvers.current.delete(jobId)
          if (onAudioStart) onAudioStart()
          resolve()
        }
      } else {
        ttsResolvers.current.delete(jobId)
        if (onAudioStart) onAudioStart()
        if ('speechSynthesis' in window) {
          try {
            window.speechSynthesis.cancel()
            const u = new SpeechSynthesisUtterance(text)
            u.onend = () => resolve()
            u.onerror = () => resolve()
            window.speechSynthesis.speak(u)
            setTimeout(resolve, Math.max(1500, text.length * 80))
          } catch (_) { resolve() }
        } else {
          setTimeout(resolve, 1000)
        }
      }
    })
  }

  const stopSpeakingNative = () => {
    audioQueueRef.current = []
    isPlayingRef.current = false
    if (activeAudioRef.current) { activeAudioRef.current.pause() }
    try { LauncherPlugin.stopSpeakingNative() } catch (_) {}
    ttsResolvers.current.forEach(state => state.resolve())
    ttsResolvers.current.clear()
    idleTimerRef.current = setTimeout(() => {
      if (kokoroWorkerRef.current) {
        kokoroWorkerRef.current.terminate()
        kokoroWorkerRef.current = null
      }
    }, 30000)
  }

  return { speakTextNative, stopSpeakingNative, canvasRef, activeAudioRef, ttsResolvers }
}
