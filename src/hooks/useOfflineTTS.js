import { useEffect, useRef } from 'react'
import { registerPlugin } from '@capacitor/core'
import PiperWorker from '../workers/piperWorker?worker'
import PowerSaveManager from '../utils/PowerSaveManager'
import { useAIStore } from '../stores/aiStore'
import { speakTextNative as pluginSpeakNative, setVoiceSettingsNative, isNative } from '../components/LauncherPlugin'

const LauncherPlugin = registerPlugin('LauncherPlugin')

export default function useOfflineTTS({ speechInterruptRef }) {
  const piperWorkerRef = useRef(null)
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
      piperWorkerRef.current?.terminate()
      piperWorkerRef.current = null
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
    if (piperWorkerRef.current) return
    piperWorkerRef.current = new PiperWorker()
    piperWorkerRef.current.onmessage = (e) => {
      const { type, id, blob, error, text } = e.data
      if (type === 'AUDIO_READY') {
        if (speechInterruptRef.current) { handleChunkEnd(id); return }
        audioQueueRef.current.push({ blob, id, text })
        if (!isPlayingRef.current) playNextAudio()
      } else if (type === 'ERROR' || type === 'INIT_ERROR') {
        console.warn('Piper TTS worker fallback to native TTS:', error)
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

      const { voiceTimbre, voicePitch, voiceRate } = useAIStore.getState()
      let pitchMod = 1.0
      if (voiceTimbre === 'narrator') pitchMod = 0.85
      const effectivePitch = Math.max(0.1, Math.min(2.0, voicePitch * pitchMod))

      if (voiceTimbre === 'piper_offline' && !PowerSaveManager.shouldDisable('piper')) {
        initWorker()
        if (piperWorkerRef.current) {
          chunks.forEach(chunk => piperWorkerRef.current.postMessage({ type: 'SPEAK', text: chunk.trim(), id: jobId }))
        } else {
          ttsResolvers.current.delete(jobId)
          if (onAudioStart) onAudioStart()
          resolve()
        }
      } else {
        ttsResolvers.current.delete(jobId)
        if (onAudioStart) onAudioStart()
        
        if (isNative) {
          try {
            setVoiceSettingsNative(effectivePitch, voiceRate)
            pluginSpeakNative(text).then(resolve).catch(resolve)
          } catch (_) { resolve() }
        } else if ('speechSynthesis' in window) {
          try {
            window.speechSynthesis.cancel()
            const u = new SpeechSynthesisUtterance(text)
            const voices = window.speechSynthesis.getVoices()
            let selectedVoice = null
            if (voiceTimbre === 'british_female') {
              selectedVoice = voices.find(v => v.lang.startsWith('en-GB') && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('hazel') || v.name.toLowerCase().includes('victoria') || v.name.toLowerCase().includes('emma'))) ||
                              voices.find(v => v.lang.startsWith('en-GB'))
            } else if (voiceTimbre === 'british_male') {
              selectedVoice = voices.find(v => v.lang.startsWith('en-GB') && (v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('george') || v.name.toLowerCase().includes('oliver'))) ||
                              voices.find(v => v.lang.startsWith('en-GB'))
            } else if (voiceTimbre === 'natural_male' || voiceTimbre === 'narrator') {
              selectedVoice = voices.find(v => v.lang.startsWith('en') && (v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('guy') || v.name.toLowerCase().includes('george')))
            } else {
              selectedVoice = voices.find(v => v.name.includes("Google US English") && v.name.includes("Natural")) ||
                              voices.find(v => v.name.includes("Natural") || v.name.includes("Aria") || v.name.includes("Samantha")) ||
                              voices.find(v => v.lang.startsWith("en-US")) ||
                              voices.find(v => v.lang.startsWith("en")) ||
                              voices[0]
            }
            if (selectedVoice) u.voice = selectedVoice
            u.pitch = effectivePitch
            u.rate = voiceRate
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
      if (piperWorkerRef.current) {
        piperWorkerRef.current.terminate()
        piperWorkerRef.current = null
      }
    }, 30000)
  }

  return { speakTextNative, stopSpeakingNative, canvasRef, activeAudioRef, ttsResolvers }
}
