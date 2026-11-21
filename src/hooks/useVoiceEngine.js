import { useEffect, useRef, useCallback } from 'react'
import { registerPlugin } from '@capacitor/core'
import { useAssistantStore } from '../stores/assistantStore'
import { useAIStore } from '../stores/aiStore'
import { SecureStorage } from '../utils/secureStorage'
import { getCartesiaKey, stopCartesiaAudio, speakCartesia } from '../utils/cartesiaTTS'
import { speakPiper } from '../utils/piperTTS'
import {
  speakTextNative,
  stopSpeakingNative,
  setVoiceSettingsNative,
  stopAudio,
  checkAndRequestPermission,
  isNative
} from '../components/LauncherPlugin'

const NativeLauncher = registerPlugin('LauncherPlugin')

let recognition = null
try {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (SpeechRecognition) {
    recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.lang = 'en-US'
    recognition.interimResults = true
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
    setActiveUserTranscript,
    setTextPrompt,
  } = useAssistantStore()

  const { voiceEnabled, setLlmBackend, voicePitch, voiceRate, voiceTimbre } = useAIStore()

  const lastTtsTextRef = useRef('')
  const isListeningRef = useRef(false)
  const isLiveVoiceRef = useRef(false)
  const isSpeakingRef = useRef(false)
  const finishSpeakingTimerRef = useRef(null)
  const mountedRef = useRef(true)
  const submitPromptRef = useRef(null)
  const backendIsGeneratingRef = useRef(false)
  const backendAbortRef = useRef(null)
  const startVoiceInputRef = useRef(null)

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

  useEffect(() => {
    if (!isNative) return
    const partialListener = NativeLauncher.addListener('onSpeechPartial', (data) => {
      if (!mountedRef.current || !isListeningRef.current) return
      if (data?.text) {
        if (isLiveVoiceRef.current) {
          setActiveUserTranscript(data.text)
        } else {
          setTextPrompt(data.text)
        }
      }
    })
    return () => {
      if (typeof partialListener?.then === 'function') partialListener.then(l => l.remove())
      else partialListener?.remove?.()
    }
  }, [setActiveUserTranscript, setTextPrompt])

  const startWebRecognition = useCallback(() => {
    if (!recognition) return false
    try {
      let finalTranscript = ''
      recognition.onstart = () => {
        if (!mountedRef.current) return
        isListeningRef.current = true
        setIsListening(true)
      }
      recognition.onresult = (event) => {
        let interim = ''
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript
          else interim += event.results[i][0].transcript
        }
        const txt = (finalTranscript || interim).trim()
        if (txt && mountedRef.current) {
          if (isLiveVoiceRef.current) setActiveUserTranscript(txt)
          else setTextPrompt(txt)
        }
      }
      recognition.onerror = () => {
        isListeningRef.current = false
        setIsListening(false)
      }
      recognition.onend = () => {
        isListeningRef.current = false
        setIsListening(false)
        const cleaned = finalTranscript.trim()
        if (cleaned && submitPromptRef.current) {
          submitPromptRef.current(cleaned)
        }
      }
      recognition.start()
      return true
    } catch (e) {
      console.warn('[IRIS] Web Speech start failed:', e)
      return false
    }
  }, [setActiveUserTranscript, setIsListening, setTextPrompt])

  const stopVoiceInput = useCallback(() => {
    isListeningRef.current = false
    setIsListening(false)
    if (isNative) {
      NativeLauncher.stopOfflineSpeech().catch(() => {})
    }
    if (recognition) {
      try { recognition.stop() } catch {}
    }
  }, [setIsListening])

  const startVoiceInput = useCallback(async () => {
    if (isListeningRef.current) {
      stopVoiceInput()
      return
    }
    try {
      const perm = await checkAndRequestPermission('RECORD_AUDIO')
      if (perm && !perm.granted) return
    } catch (_) { }

    window.speechSynthesis?.cancel()
    stopSpeakingNative().catch(() => { })
    setIsSpeaking(false)
    lastTtsTextRef.current = ''

    if (isNative) {
      try {
        await NativeLauncher.stopOfflineSpeech().catch(() => {})
        isListeningRef.current = true
        setIsListening(true)
        const res = await NativeLauncher.startOfflineSpeech()
        isListeningRef.current = false
        setIsListening(false)
        const spokenText = (res?.text || '').trim()
        if (spokenText) {
          if (submitPromptRef.current) {
            submitPromptRef.current(spokenText)
          } else {
            setTextPrompt(spokenText)
          }
        } else if (isLiveVoiceRef.current && mountedRef.current && !isSpeakingRef.current) {
          setTimeout(() => {
            if (isLiveVoiceRef.current && !isSpeakingRef.current && !isListeningRef.current) {
              startVoiceInputRef.current?.()
            }
          }, 400)
        }
        return
      } catch (err) {
        console.warn('[IRIS] Native speech recognition fallback to WebSpeech:', err)
        isListeningRef.current = false
        setIsListening(false)
      }
    }

    startWebRecognition()
  }, [setIsListening, setIsSpeaking, setTextPrompt, startWebRecognition, stopVoiceInput])

  useEffect(() => {
    startVoiceInputRef.current = startVoiceInput
  }, [startVoiceInput])

  const finishSpeaking = useCallback(() => {
    if (finishSpeakingTimerRef.current) clearTimeout(finishSpeakingTimerRef.current)
    if (!mountedRef.current) return
    isSpeakingRef.current = false
    setIsSpeaking(false)
    if (isLiveVoiceRef.current) {
      finishSpeakingTimerRef.current = setTimeout(() => {
        if (!mountedRef.current) return
        if (isLiveVoiceRef.current && !isSpeakingRef.current && !isListeningRef.current) {
          startVoiceInputRef.current?.()
        }
      }, 350)
    }
  }, [setIsSpeaking])

  const stopSpeaking = useCallback(() => {
    lastTtsTextRef.current = ''
    window.speechSynthesis?.cancel()
    stopCartesiaAudio()
    stopSpeakingNative().catch(() => { })
    if (window._isNativeCartesiaAudioPlaying) {
      stopAudio().catch(() => { })
      window._isNativeCartesiaAudioPlaying = false
    }
    isSpeakingRef.current = false
    setIsSpeaking(false)
    if (backendAbortRef.current?.current) {
      backendAbortRef.current.current.abort()
      backendAbortRef.current.current = null
    }
    if (backendIsGeneratingRef.current) backendIsGeneratingRef.current.current = false
  }, [setIsSpeaking])

  const speakText = useCallback(async (rawText, forceSpeak = false) => {
    if (!rawText || (!voiceEnabled && !forceSpeak && !isLiveVoiceRef.current)) return
    const text = String(rawText)
      .replace(/```[\s\S]*?```/g, ' Code block omitted. ')
      .replace(/[*#_`~>]/g, '')
      .trim()
    if (!text) return
    if (text === lastTtsTextRef.current && isSpeakingRef.current) return
    lastTtsTextRef.current = text

    stopSpeaking()
    isSpeakingRef.current = true
    setIsSpeaking(true)

    if (isListeningRef.current) {
      stopVoiceInput()
    }

    const { voiceEngineProvider: currentProvider, cartesiaKey: storeKey } = useAIStore.getState()
    const activeKey = storeKey || await getCartesiaKey()

    // 1. PROVIDER: CARTESIA (gracefully falls back to Native/Web TTS if no key is configured)
    if (currentProvider === 'CARTESIA' && activeKey) {
      try {
        const ok = await speakCartesia(text, voiceTimbre, activeKey)
        if (ok) {
          finishSpeaking()
          return
        }
      } catch (e) {
        console.warn("[IRIS Cartesia Exception]", e)
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
        if (setVoiceSettingsNative) setVoiceSettingsNative(voicePitch, voiceRate, voiceTimbre)
        await speakTextNative(text)
        finishSpeaking()
      } catch (e) {
        console.warn('[IRIS] Native TTS speak failed, falling back:', e)
        finishSpeaking()
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
  }, [voicePitch, voiceRate, voiceTimbre, voiceEnabled, finishSpeaking, setIsSpeaking, stopSpeaking, stopVoiceInput])

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
    isLiveVoiceRef.current = true
    setIsLiveVoice(true)
    await speakText("Live neural link active. I am listening.", true)
  }, [speakText, requestMicrophonePermission, setIsLiveVoice])

  const handleExitLiveModeOnly = useCallback(() => {
    stopSpeaking()
    isLiveVoiceRef.current = false
    setIsLiveVoice(false)
    stopVoiceInput()
  }, [stopSpeaking, stopVoiceInput, setIsLiveVoice])

  const handleStopLiveModeCompletely = useCallback(() => {
    stopSpeaking()
    isLiveVoiceRef.current = false
    setIsLiveVoice(false)
    stopVoiceInput()
    setChatLog(prev => prev.filter(item => !item.loading))
  }, [stopSpeaking, stopVoiceInput, setChatLog, setIsLiveVoice])

  const isLiveConfigured = useCallback(() => {
    const { llmBackend, geminiKey, groqKey } = useAIStore.getState()
    if (llmBackend === 'OLLAMA' || llmBackend === 'ONDEVICE') return true
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
  }, [isLiveConfigured, handleOpenLiveMode, setLiveSetupEngine, setLiveSetupKey, setShowLiveConfigModal])

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
  }, [liveSetupEngine, liveSetupKey, handleOpenLiveMode, setLlmBackend, setShowLiveConfigModal])

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
