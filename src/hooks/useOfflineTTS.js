import { useEffect, useRef } from 'react'
import { registerPlugin } from '@capacitor/core'
import { useAIStore } from '../stores/aiStore'
import { speakTextNative as pluginSpeakNative, setVoiceSettingsNative, isNative } from '../components/LauncherPlugin'

const LauncherPlugin = registerPlugin('LauncherPlugin')

export default function useOfflineTTS({ speechInterruptRef }) {
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
      const jobId = Date.now().toString() + Math.random()

      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current)
      safetyTimerRef.current = setTimeout(() => { ttsResolvers.current.delete(jobId); resolve() }, 30000)
      
      const wrappedResolve = () => {
        if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current)
        ttsResolvers.current.delete(jobId)
        resolve()
      }
      ttsResolvers.current.set(jobId, { resolve: wrappedResolve })

      const { voiceTimbre, voicePitch, voiceRate } = useAIStore.getState()
      let pitchMod = 1.0
      if (voiceTimbre === 'narrator') pitchMod = 0.85
      const effectivePitch = Math.max(0.1, Math.min(2.0, voicePitch * pitchMod))

      if (onAudioStart) onAudioStart()
      
      if (isNative) {
        try {
          setVoiceSettingsNative(voicePitch, voiceRate, voiceTimbre)
          pluginSpeakNative(text).then(wrappedResolve).catch(wrappedResolve)
        } catch (_) { wrappedResolve() }
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
          u.onend = () => wrappedResolve()
          u.onerror = () => wrappedResolve()
          window.speechSynthesis.speak(u)
          setTimeout(wrappedResolve, Math.max(1500, text.length * 80))
        } catch (_) { wrappedResolve() }
      } else {
        setTimeout(wrappedResolve, 1000)
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
  }

  return { speakTextNative, stopSpeakingNative, canvasRef, activeAudioRef, ttsResolvers }
}
