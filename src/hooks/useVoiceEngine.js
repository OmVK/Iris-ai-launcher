import { useEffect, useRef, useCallback } from 'react'
import { useAssistantStore } from '../stores/assistantStore'
import { useAIStore } from '../stores/aiStore'
import { useAppStore } from '../stores/appStore'
import { SecureStorage } from '../utils/secureStorage'
import {
  speakTextNative,
  stopSpeakingNative,
  speakCartesiaNative,
  addAudioFinishedListener,
  stopAudio,
  isNative
} from '../components/LauncherPlugin'

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
    isSpeaking, setIsSpeaking,
    isLiveVoice, setIsLiveVoice,
    isPrivateSession,
    chatLog, setChatLog,
    sessions, activeSessionId,
    textPrompt, setTextPrompt,
    activeUserTranscript, setActiveUserTranscript,
    activeAiResponse, setActiveAiResponse,
    showLiveConfigModal, setShowLiveConfigModal,
    liveSetupEngine, setLiveSetupEngine,
    liveSetupKey, setLiveSetupKey,
    persistSessions,
  } = useAssistantStore()

  const { llmBackend, voiceEnabled, setLlmBackend, voicePitch, voiceRate } = useAIStore()

  const mountedRef = useRef(true)
  const isLiveVoiceRef = useRef(isLiveVoice)
  const isListeningRef = useRef(isListening)
  const isSpeakingRef = useRef(isSpeaking)
  const isPrivateSessionRef = useRef(isPrivateSession)
  const lastTtsTextRef = useRef('')
  const restartTimerRef = useRef(null)
  const finishSpeakingTimerRef = useRef(null)

  useEffect(() => { isLiveVoiceRef.current = isLiveVoice }, [isLiveVoice])
  useEffect(() => { isListeningRef.current = isListening }, [isListening])
  useEffect(() => { isSpeakingRef.current = isSpeaking }, [isSpeaking])
  useEffect(() => { isPrivateSessionRef.current = isPrivateSession }, [isPrivateSession])

  // Persist sessions on chatLog change
  useEffect(() => {
    if (isPrivateSession) return
    const timeoutId = setTimeout(() => persistSessions(), 1000)
    return () => clearTimeout(timeoutId)
  }, [chatLog, activeSessionId, isPrivateSession])

  // Cleanup private sessions on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current)
      if (finishSpeakingTimerRef.current) clearTimeout(finishSpeakingTimerRef.current)
      if (isPrivateSessionRef.current) {
        setChatLog([{ time: "00:00:00", sender: "IRIS", text: "PRIVATE_SESSION_ENDED // CHATLOG LOGS COMPROMISED AND SELF-DESTRUCTED.", type: "error" }])
      }
    }
  }, [])

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())
      return true
    } catch (e) {
      console.warn('Microphone permission denied:', e)
      alert('Microphone permission is required for live voice mode. Please allow microphone access in your device settings.')
      return false
    }
  }

  // Recognition event handlers
  useEffect(() => {
    if (!recognition) return
    recognition.onstart = () => {
      setIsListening(true)
      isListeningRef.current = true
    }
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      const lower = transcript.trim().toLowerCase()
      if (lastTtsTextRef.current) {
        const ttsSnippet = lastTtsTextRef.current.substring(0, 30)
        if (lower.includes(ttsSnippet) || ttsSnippet.includes(lower.substring(0, 20))) return
        stopSpeaking()
      }
      if (!backendIsGeneratingRef.current?.current) {
        submitPrompt(transcript)
      }
    }
    recognition.onerror = (e) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        console.warn("Recognition error:", e.error)
      }
      setIsListening(false)
      isListeningRef.current = false
    }
    recognition.onend = () => {
      setIsListening(false)
      isListeningRef.current = false
      if (isLiveVoiceRef.current && !backendIsGeneratingRef.current?.current) {
        const delay = isSpeakingRef.current ? 300 : 100
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current)
        restartTimerRef.current = setTimeout(() => {
          if (!mountedRef.current) return
          try {
            if (isLiveVoiceRef.current && !isListeningRef.current) {
              recognition.start()
            }
          } catch (e) { console.warn("Auto-restart recognition failed:", e) }
        }, delay)
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
      const hasPermission = await requestMicrophonePermission()
      if (!hasPermission) return
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

    // Fallback to native TTS
    if (isNative) {
      try {
        const m = await import('../components/LauncherPlugin')
        if (m.setVoiceSettingsNative) m.setVoiceSettingsNative(voicePitch, voiceRate)
        await speakTextNative(text)
        finishSpeaking()
      } catch (e) { console.warn('[IRIS] TTS speak failed:', e); finishSpeaking() }
      return
    }

    if (!window.speechSynthesis) { finishSpeaking(); return }

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    const voices = window.speechSynthesis.getVoices()
    const selectedVoice =
      voices.find(v => v.name.includes("Google US English") && v.name.includes("Natural")) ||
      voices.find(v => v.name.includes("Google") && v.name.includes("Natural")) ||
      voices.find(v => v.name.includes("Natural") || v.name.includes("Online")) ||
      voices.find(v => v.name.includes("Aria") || v.name.includes("Samantha")) ||
      voices.find(v => v.name.includes("Google US English")) ||
      voices.find(v => v.lang.startsWith("en-US")) ||
      voices.find(v => v.lang.startsWith("en")) ||
      voices[0]
    if (selectedVoice) utterance.voice = selectedVoice
    utterance.pitch = voicePitch
    utterance.rate = voiceRate
    utterance.onend = finishSpeaking
    utterance.onerror = finishSpeaking
    window.speechSynthesis.speak(utterance)
  }, [voicePitch, voiceRate])

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
