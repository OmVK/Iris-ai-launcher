import { useEffect, useRef, useCallback } from 'react'
import { useAssistantStore } from '../stores/assistantStore'
import { useAIStore } from '../stores/aiStore'
import { useAppStore } from '../stores/appStore'
import { SecureStorage } from '../utils/secureStorage'
import KokoroWorker from '../workers/kokoroWorker?worker'
import {
  speakTextNative,
  stopSpeakingNative,
  speakCartesiaNative,
  addAudioFinishedListener,
  stopAudio,
  checkAndRequestPermission,
  isNative
} from '../components/LauncherPlugin'

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

let recognition = null
try {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (SpeechRecognition) {
    recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.lang = 'en-US'
    recognition.interimResults = false
  }
} catch (e) {
  console.warn("SpeechRecognition initialization failed:", e)
}

export default function useVoiceEngine() {
  const {
    isListening, setIsListening,
    setIsSpeaking,
    setIsLiveVoice,
    setChatLog,
    setShowLiveConfigModal,
    liveSetupEngine, setLiveSetupEngine,
    liveSetupKey, setLiveSetupKey,
  } = useAssistantStore()

  const { setLlmBackend, voicePitch, voiceRate, kokoroVoice } = useAIStore()

  const kokoroWorkerRef = useRef(null)
  const activeAudioRef = useRef(null)
  const lastTtsTextRef = useRef('')
  const isListeningRef = useRef(false)
  const isLiveVoiceRef = useRef(false)
  const isSpeakingRef = useRef(false)
  const finishSpeakingTimerRef = useRef(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (finishSpeakingTimerRef.current) {
        clearTimeout(finishSpeakingTimerRef.current)
        finishSpeakingTimerRef.current = null
      }
    }
  }, [])

  const startVoiceInput = useCallback(async () => {
    if (!recognition) {
      alert("Browser Speech Recognition blocked. Please type prompts below.")
      return
    }
    if (isListening) {
      recognition.stop()
    } else {
      try {
        const perm = await checkAndRequestPermission('RECORD_AUDIO')
        if (perm && !perm.granted) return
      } catch (_) {}
      window.speechSynthesis?.cancel()
      stopSpeakingNative().catch(() => {})
      setIsSpeaking(false)
      lastTtsTextRef.current = ''
      try { recognition.start() } catch (e) { console.error(e) }
    }
  }, [isListening])

  const stopVoiceInput = useCallback(() => {
    isListeningRef.current = false
    setIsListening(false)
    if (recognition) recognition.stop()
  }, [])

  const stopSpeaking = useCallback(() => {
    lastTtsTextRef.current = ''
    window.speechSynthesis?.cancel()
    stopSpeakingNative().catch(() => {})
    if (window._cartesiaAudio) {
      try { window._cartesiaAudio.stop() } catch {}
      window._cartesiaAudio = null
    }
    if (window._isNativeCartesiaAudioPlaying) {
      stopAudio().catch(() => {})
      window._isNativeCartesiaAudioPlaying = false
    }
    setIsSpeaking(false)
    if (backendAbortRef.current?.current) {
      backendAbortRef.current.current.abort()
      backendAbortRef.current.current = null
    }
    if (backendIsGeneratingRef.current) backendIsGeneratingRef.current.current = false
  }, [])

  const speakText = useCallback(async (text) => {
    if (!text || text.trim() === '') return
    setIsSpeaking(true)
    lastTtsTextRef.current = text.trim().toLowerCase()

    if (recognition && !isLiveVoiceRef.current) {
      try { recognition.abort() } catch {}
    }

    const finishSpeaking = () => {
      setIsSpeaking(false)
      lastTtsTextRef.current = ''
      if (isLiveVoiceRef.current && recognition && !isListeningRef.current) {
        if (finishSpeakingTimerRef.current) clearTimeout(finishSpeakingTimerRef.current)
        finishSpeakingTimerRef.current = setTimeout(() => {
          if (!mountedRef.current) return
          try {
            if (isLiveVoiceRef.current && !isSpeakingRef.current && !isListeningRef.current) {
              recognition.start()
            }
          } catch {}
        }, 200)
      }
    }

    // Try Cartesia TTS
    const cartesiaKey = await SecureStorage.getItem('cartesia_api_key')
    if (cartesiaKey && cartesiaKey.trim()) {
      try {
        const voiceId = localStorage.getItem('cartesia_voice_id') || "694f9389-aac1-45b6-b726-9d9369183238"
        if (isNative) {
          if (window._cartesiaNativeListener) window._cartesiaNativeListener.remove()
          window._cartesiaNativeListener = await addAudioFinishedListener(() => finishSpeaking())
          window._isNativeCartesiaAudioPlaying = true
          await speakCartesiaNative(text, voiceId, cartesiaKey.trim())
          return
        } else {
          const res = await fetch('https://api.cartesia.ai/tts/bytes', {
            method: 'POST',
            headers: {
              'Cartesia-Version': '2024-06-10',
              'X-API-Key': cartesiaKey.trim(),
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model_id: "sonic-3.5",
              transcript: text,
              voice: { mode: "id", id: voiceId },
              output_format: { container: "mp3", bit_rate: 128000, sample_rate: 44100 }
            })
          })
          if (res.ok) {
            const arrayBuffer = await res.arrayBuffer()
            if (!mountedRef.current) return
            const audioContext = new (window.AudioContext || window.webkitAudioContext)()
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
            const source = audioContext.createBufferSource()
            source.buffer = audioBuffer
            source.connect(audioContext.destination)
            window._cartesiaAudio = source
            source.onended = () => { 
              window._cartesiaAudio = null
              audioContext.close().catch(() => {})
              finishSpeaking() 
            }
            source.start(0)
            return
          }
        }
      } catch (e) {
        console.error("Cartesia Exception:", e)
      }
    }

    // Calculate dynamic pitch modulation based on selected Kokoro Voice Timbre
    let pitchMod = 1.0
    let targetLang = 'en-US'
    let isMale = false

    switch (kokoroVoice) {
      case 'am_adam':
        pitchMod = 0.82
        isMale = true
        break
      case 'bf_emma':
        pitchMod = 1.08
        targetLang = 'en-GB'
        break
      case 'bm_george':
        pitchMod = 0.80
        targetLang = 'en-GB'
        isMale = true
        break
      case 'af_nicole':
        pitchMod = 1.15
        break
      case 'am_michael':
        pitchMod = 0.88
        isMale = true
        break
      case 'af_heart':
      default:
        pitchMod = 1.0
        break
    }

    const effectivePitch = Math.max(0.1, Math.min(2.0, voicePitch * pitchMod))

    // Dynamic Kokoro-82M Neural Voice Synthesis via Web Worker
    try {
      if (!kokoroWorkerRef.current) {
        kokoroWorkerRef.current = new KokoroWorker()
      }
      const worker = kokoroWorkerRef.current
      const jobId = Date.now().toString()
      
      const onWorkerMessage = (e) => {
        const { type, pcmData, sampleRate } = e.data
        if (type === 'AUDIO_READY' || type === 'audio') {
          worker.removeEventListener('message', onWorkerMessage)
          if (pcmData) {
            const blob = pcmToWavBlob(new Float32Array(pcmData), sampleRate || 24000)
            const url = URL.createObjectURL(blob)
            if (activeAudioRef.current) {
              try { activeAudioRef.current.pause() } catch {}
              activeAudioRef.current = null
            }
            const audio = new Audio(url)
            activeAudioRef.current = audio
            audio.onended = () => {
              URL.revokeObjectURL(url)
              activeAudioRef.current = null
              finishSpeaking()
            }
            audio.onerror = () => {
              URL.revokeObjectURL(url)
              activeAudioRef.current = null
              finishSpeaking()
            }
            audio.play().catch(() => finishSpeaking())
          } else {
            finishSpeaking()
          }
        } else if (type === 'error' || type === 'ERROR') {
          worker.removeEventListener('message', onWorkerMessage)
          finishSpeaking()
        }
      }

      worker.addEventListener('message', onWorkerMessage)
      worker.postMessage({
        type: 'speak',
        text: text.trim(),
        id: jobId,
        voice: kokoroVoice,
        pitch: effectivePitch,
        rate: voiceRate
      })
      return
    } catch (e) {
      console.warn('[IRIS] Kokoro synthesis error:', e)
    }

    if (!window.speechSynthesis) { finishSpeaking(); return }

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    const voices = window.speechSynthesis.getVoices()
    
    // Intelligent voice matching based on locale (en-GB vs en-US) and gender (male vs female)
    let selectedVoice = null
    if (targetLang === 'en-GB') {
      selectedVoice = voices.find(v => v.lang.startsWith('en-GB') && (isMale ? v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('george') || v.name.toLowerCase().includes('oliver') : v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('hazel') || v.name.toLowerCase().includes('victoria'))) ||
                      voices.find(v => v.lang.startsWith('en-GB'))
    }
    if (!selectedVoice) {
      if (isMale) {
        selectedVoice = voices.find(v => v.lang.startsWith('en') && (v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('guy') || v.name.toLowerCase().includes('george') || v.name.toLowerCase().includes('adam')))
      } else {
        selectedVoice = voices.find(v => v.lang.startsWith('en') && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('aria') || v.name.toLowerCase().includes('samantha') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('natural')))
      }
    }
    if (!selectedVoice) {
      selectedVoice = voices.find(v => v.name.includes("Google US English")) ||
                      voices.find(v => v.lang.startsWith("en-US")) ||
                      voices.find(v => v.lang.startsWith("en")) ||
                      voices[0]
    }

    if (selectedVoice) utterance.voice = selectedVoice
    utterance.pitch = effectivePitch
    utterance.rate = voiceRate
    utterance.onend = finishSpeaking
    utterance.onerror = finishSpeaking
    window.speechSynthesis.speak(utterance)
  }, [voicePitch, voiceRate, kokoroVoice])

  const requestMicrophonePermission = useCallback(async () => {
    try {
      const perm = await checkAndRequestPermission('RECORD_AUDIO')
      if (!perm) return true
      return perm.granted
    } catch (_) {
      return true
    }
  }, [])

  const handleOpenLiveMode = useCallback(async () => {
    const hasPermission = await requestMicrophonePermission()
    if (!hasPermission) return
    setIsLiveVoice(true)
    speakText("Engaging live conversation mode. I am listening.")
  }, [speakText])

  const handleExitLiveModeOnly = useCallback(() => {
    stopSpeaking()
    setIsLiveVoice(false)
    isLiveVoiceRef.current = false
    isListeningRef.current = false
    setIsListening(false)
    isSpeakingRef.current = false
    if (recognition) try { recognition.stop() } catch {}
  }, [stopSpeaking])

  const handleStopLiveModeCompletely = useCallback(() => {
    stopSpeaking()
    setIsLiveVoice(false)
    isLiveVoiceRef.current = false
    isListeningRef.current = false
    setIsListening(false)
    isSpeakingRef.current = false
    if (recognition) try { recognition.stop() } catch {}
    setChatLog(prev => prev.filter(item => !item.loading))
  }, [stopSpeaking])

  const isLiveConfigured = useCallback(() => {
    const { llmBackend, geminiKey, groqKey } = useAIStore.getState()
    if (llmBackend === 'OLLAMA') return true
    if (llmBackend === 'GEMINI') return !!geminiKey
    if (llmBackend === 'GROQ') return !!groqKey
    if (llmBackend === 'NVIDIA') return localStorage.getItem('iris_has_nvidia_key') === 'true'
    return false
  }, [])

  const handleEngageLiveClick = useCallback(async () => {
    if (isLiveConfigured()) {
      handleOpenLiveMode()
    } else {
      const { llmBackend: backend } = useAIStore.getState()
      setLiveSetupEngine(backend)
      const keyMap = { GEMINI: 'gemini_api_key', GROQ: 'groq_api_key', NVIDIA: 'nvidia_api_key' }
      const storedKey = await SecureStorage.getItem(keyMap[backend] || '')
      setLiveSetupKey(storedKey || '')
      setShowLiveConfigModal(true)
    }
  }, [isLiveConfigured, handleOpenLiveMode])

  const handleSaveLiveConfig = useCallback(async () => {
    localStorage.setItem('system_llm_backend', liveSetupEngine)
    setLlmBackend(liveSetupEngine)
    if (liveSetupEngine === 'GEMINI') await SecureStorage.setItem('gemini_api_key', liveSetupKey.trim())
    else if (liveSetupEngine === 'GROQ') await SecureStorage.setItem('groq_api_key', liveSetupKey.trim())
    else if (liveSetupEngine === 'NVIDIA') await SecureStorage.setItem('nvidia_api_key', liveSetupKey.trim())
    if (liveSetupEngine === 'GEMINI') useAIStore.getState().setGeminiKey(liveSetupKey.trim())
    else if (liveSetupEngine === 'GROQ') useAIStore.getState().setGroqKey(liveSetupKey.trim())
    setShowLiveConfigModal(false)
    setTimeout(() => handleOpenLiveMode(), 200)
  }, [liveSetupEngine, liveSetupKey])

  // Bridge to useAIBackend — receives submitPrompt, isGeneratingRef, abortControllerRef
  const submitPromptRef = useRef(null)
  const backendIsGeneratingRef = useRef(false)
  const backendAbortRef = useRef(null)
  const setSubmitPrompt = useCallback((fn, isGenRef, abortRef) => {
    submitPromptRef.current = fn
    if (isGenRef) backendIsGeneratingRef.current = isGenRef
    if (abortRef) backendAbortRef.current = abortRef
  }, [])
  const submitPrompt = useCallback((prompt) => {
    if (submitPromptRef.current) submitPromptRef.current(prompt)
  }, [])

  return {
    startVoiceInput,
    stopVoiceInput,
    speakText,
    stopSpeaking,
    handleOpenLiveMode,
    handleExitLiveModeOnly,
    handleStopLiveModeCompletely,
    isLiveConfigured,
    handleEngageLiveClick,
    handleSaveLiveConfig,
    submitPrompt,
    setSubmitPrompt,
    submitPromptRef,
    recognition,
  }
}
