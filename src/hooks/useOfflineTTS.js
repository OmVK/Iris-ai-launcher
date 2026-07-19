import { useEffect, useRef } from 'react'
import { registerPlugin } from '@capacitor/core'
import PiperWorker from '../workers/piperWorker?worker'
import PowerSaveManager from '../utils/PowerSaveManager'

const LauncherPlugin = registerPlugin('LauncherPlugin')

export default function useOfflineTTS({ isVisible, isAppActive, speechInterruptRef }) {
  const piperWorkerRef = useRef(null)
  const activeAudioRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const canvasRef = useRef(null)
  const ttsResolvers = useRef(new Map())
  const audioQueueRef = useRef([])
  const isPlayingRef = useRef(false)
  const idleTimerRef = useRef(null)

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
      piperWorkerRef.current?.terminate()
      piperWorkerRef.current = null
      if (activeAudioRef.current) activeAudioRef.current.pause()
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
        audioContextRef.current = null
        analyserRef.current = null
      }
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [])

  const clearIdleTimer = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
  }

  const initWorker = () => {
    if (piperWorkerRef.current) return
    piperWorkerRef.current = new PiperWorker()
    piperWorkerRef.current.onmessage = (e) => {
      const { type, id, blob, error, text } = e.data
      if (type === 'AUDIO_READY') {
        if (speechInterruptRef.current) { handleChunkEnd(id); return }
        audioQueueRef.current.push({ blob, id, text })
        if (!isPlayingRef.current) playNextAudio()
      } else if (type === 'ERROR') {
        console.warn('Piper TTS failed, falling back to native TTS', error)
        if (text) {
          Promise.race([
            LauncherPlugin.speakText({ text }),
            new Promise(r => setTimeout(r, 3000))
          ]).then(() => handleChunkEnd(id)).catch(() => handleChunkEnd(id))
        } else {
          handleChunkEnd(id)
        }
      }
    }
    piperWorkerRef.current.postMessage({ type: 'INIT' })
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
        if (piperWorkerRef.current) {
          piperWorkerRef.current.terminate()
          piperWorkerRef.current = null
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
    let settled = false
    const settle = () => {
      if (settled) return
      settled = true
      URL.revokeObjectURL(url)
      handleChunkEnd(id)
      playNextAudio()
    }
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
    audio.onended = settle
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
      const safetyTimer = setTimeout(() => { ttsResolvers.current.delete(jobId); resolve() }, 30000)
      const wrappedResolve = () => {
        clearTimeout(safetyTimer)
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
      if (!PowerSaveManager.shouldDisable('piper')) {
        initWorker()
        chunks.forEach(chunk => piperWorkerRef.current.postMessage({ type: 'SPEAK', text: chunk.trim(), id: jobId }))
      } else {
        ttsResolvers.current.delete(jobId)
        if (onAudioStart) onAudioStart()
        Promise.race([
          LauncherPlugin.speakText({ text }),
          new Promise(r => setTimeout(r, 3000))
        ]).then(() => {
          clearTimeout(safetyTimer)
          resolve()
        }).catch(() => {
          clearTimeout(safetyTimer)
          resolve()
        })
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
      if (piperWorkerRef.current) {
        piperWorkerRef.current.terminate()
        piperWorkerRef.current = null
      }
    }, 30000)
  }

  return { speakTextNative, stopSpeakingNative, canvasRef, activeAudioRef, ttsResolvers }
}
