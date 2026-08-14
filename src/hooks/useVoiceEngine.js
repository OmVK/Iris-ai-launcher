import { useEffect, useRef, useCallback } from 'react'
import { useAssistantStore } from '../stores/assistantStore'
import { useAIStore } from '../stores/aiStore'
import { SecureStorage } from '../utils/secureStorage'
import { getCartesiaKey, stopCartesiaAudio, speakCartesia } from '../utils/cartesiaTTS'
import { speakPiper } from '../utils/piperTTS'
import {
  speakTextNative,
  stopSpeakingNative,
  stopAudio,
  checkAndRequestPermission,
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
    setChatLog,
    setShowLiveConfigModal,
    liveSetupEngine, setLiveSetupEngine,
    liveSetupKey, setLiveSetupKey,
  } = useAssistantStore()

  const { voiceEnabled, setLlmBackend, voicePitch, voiceRate, voiceTimbre, voiceEngineProvider } = useAIStore()

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

  useEffect(() => { isListeningRef.current = isListening }, [isListening])
  useEffect(() => { isLiveVoiceRef.current = isLiveVoice }, [isLiveVoice])
  useEffect(() => { isSpeakingRef.current = isSpeaking }, [isSpeaking])

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

  const finishSpeaking = useCallback(() => {
    if (finishSpeakingTimerRef.current) clearTimeout(finishSpeakingTimerRef.current)
    if (!mountedRef.current) return
    setIsSpeaking(false)
    if (isLiveVoiceRef.current) {
      finishSpeakingTimerRef.current = setTimeout(() => {
        if (!mountedRef.current) return
        if (isLiveVoiceRef.current && !isSpeakingRef.current && !isListeningRef.current && recognition) {
          try { recognition.start() } catch {}
        }
      }, 300)
    }
  }, [setIsSpeaking])

  const stopSpeaking = useCallback(() => {
    lastTtsTextRef.current = ''
    window.speechSynthesis?.cancel()
    stopCartesiaAudio()
    stopSpeakingNative().catch(() => {})
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
  }, [setIsSpeaking])

  const speakText = useCallback(async (text) => {
    if (!text || !voiceEnabled) return
    if (text === lastTtsTextRef.current && isSpeakingRef.current) return
    lastTtsTextRef.current = text

    stopSpeaking()
    setIsSpeaking(true)

    if (recognition && isListeningRef.current) {
      try { recognition.stop() } catch {}
      setIsListening(false)
    }

    const { voiceEngineProvider: currentProvider, cartesiaKey: storeKey } = useAIStore.getState()
    const activeKey = storeKey || await getCartesiaKey()

    // 1. PROVIDER: CARTESIA
    if (currentProvider === 'CARTESIA') {
      if (!activeKey) {
        alert("Cartesia API Key Missing: Please paste & save a Cartesia API Key in Voice Settings.")
        finishSpeaking()
        return
      }
      try {
        const ok = await speakCartesia(text, voiceTimbre, activeKey)
        if (ok) {
          finishSpeaking()
          return
        }
      } catch (e) {
        console.error("[IRIS Cartesia Exception]", e)
        alert(`Cartesia Connection Exception: ${e.message}`)
        finishSpeaking()
        return
      }
    }

    // 2. PROVIDER: PIPER
    if (currentProvider === 'PIPER') {
      const piperSuccess = await speakPiper(text, voiceTimbre)
      if (piperSuccess) {
        finishSpeaking()
        return
      }
    }

    let pitchMod = 1.0
    if (voiceTimbre === 'narrator') pitchMod = 0.85
    const effectivePitch = Math.max(0.1, Math.min(2.0, voicePitch * pitchMod))

    // 3. PROVIDER: NATIVE (Android Google TTS)
    if (currentProvider === 'NATIVE' || (isNative && currentProvider !== 'WEB')) {
      try {
        const m = await import('../components/LauncherPlugin')
        if (m.setVoiceSettingsNative) m.setVoiceSettingsNative(voicePitch, voiceRate, voiceTimbre)
        await speakTextNative(text)
        finishSpeaking()
      } catch (e) { 
        console.warn('[IRIS] Native TTS speak failed, falling back:', e)
      }
      return
    }

    if (!window.speechSynthesis) { finishSpeaking(); return }

    try {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
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

      if (selectedVoice) utterance.voice = selectedVoice
      utterance.pitch = effectivePitch
      utterance.rate = voiceRate
      utterance.onend = finishSpeaking
      utterance.onerror = finishSpeaking
      window.speechSynthesis.speak(utterance)
    } catch (err) {
      console.warn('[IRIS] SpeechSynthesis error:', err)
      finishSpeaking()
    }
  }, [voicePitch, voiceRate, voiceTimbre])

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
