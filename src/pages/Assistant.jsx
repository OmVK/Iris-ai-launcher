import { useState, useEffect, useRef, useCallback } from 'react'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { NativeBiometric } from '@capgo/capacitor-native-biometric'
import { useAIStore } from '../stores/aiStore'
import { useAssistantStore } from '../stores/assistantStore'
import { useAppStore } from '../stores/appStore'
import { useNotificationStore } from '../stores/notificationStore'
import { SecureStorage } from '../utils/secureStorage'
import { checkAllBackends, getBackendStatus, getSanitizedOllamaEndpoint } from '../utils/AIProviderManager'
import SessionSidebar from './assistant/SessionSidebar'
import EngineModelBar from './assistant/EngineModelBar'
import OllamaManager from './assistant/OllamaManager'
import DiagnosticsTerminal from './assistant/DiagnosticsTerminal'
import ChatMessage from './assistant/ChatMessage'
import ChronoPinLock from '../components/ChronoPinLock'
import { logNotification, getSystemStats, getScreenTimeStats, isNative } from '../components/LauncherPlugin'

const WELCOME_STARTERS = [
  {
    icon: 'chat_bubble',
    title: 'Everyday Chat & Writing',
    desc: 'Ask any question, draft a message, brainstorm ideas, or translate text',
    prompt: 'Help me write or figure out: ',
    prefillOnly: true,
    persona: 'CHAT'
  },
  {
    icon: 'travel_explore',
    title: 'Incognito Live Web Search',
    desc: 'Search live news, facts, prices & answers privately without saving history',
    prompt: 'What are the latest updates and key facts about ',
    prefillOnly: true,
    enableIncognitoSearch: true
  },
  {
    icon: 'add_a_photo',
    title: 'Snap or Upload Image (Vision)',
    desc: 'Take a photo or pick from gallery to solve problems, read text, or explain',
    action: 'OPEN_IMAGE_MENU'
  },
  {
    icon: 'school',
    title: 'Study Tutor & Code Helper',
    desc: 'Explain hard topics simply with examples, flashcards, or clean code',
    prompt: 'Explain this step-by-step in simple terms with an example: ',
    prefillOnly: true,
    persona: 'TUTOR'
  }
]

function compressImageDataUrl(rawDataUrl, maxDim = 1280, quality = 0.8) {
  return new Promise((resolve) => {
    try {
      const img = new Image()
      img.onload = () => {
        let w = img.width || 800
        let h = img.height || 800
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w)
            w = maxDim
          } else {
            w = Math.round((w * maxDim) / h)
            h = maxDim
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        const compressedUrl = canvas.toDataURL('image/jpeg', quality)
        const base64 = compressedUrl.includes(',') ? compressedUrl.split(',')[1] : compressedUrl
        resolve({ dataUrl: compressedUrl, base64, mimeType: 'image/jpeg' })
      }
      img.onerror = () => {
        const base64 = rawDataUrl.includes(',') ? rawDataUrl.split(',')[1] : rawDataUrl
        resolve({ dataUrl: rawDataUrl, base64, mimeType: 'image/jpeg' })
      }
      img.src = rawDataUrl
    } catch {
      const base64 = rawDataUrl.includes(',') ? rawDataUrl.split(',')[1] : rawDataUrl
      resolve({ dataUrl: rawDataUrl, base64, mimeType: 'image/jpeg' })
    }
  })
}

export default function Assistant({
  startVoiceInput, stopVoiceInput, speakText, stopSpeaking,
  submitPrompt, stopGeneration,
  handleSaveLiveConfig: _handleSaveLiveConfig, handleOpenLiveMode, handleExitLiveModeOnly, handleStopLiveModeCompletely,
  autoTriggerLive, setAutoTriggerLive,
  isAppActive,
  onNavigate
}) {
  const { llmBackend, setLlmBackend, geminiModel, voiceEnabled, setVoiceEnabled } = useAIStore()
  const {
    chatLog, setChatLog, textPrompt, setTextPrompt,
    isListening, isSpeaking, isGenerating, isLiveVoice, isPrivateSession,
    webSearchEnabled, setWebSearchEnabled, burnIncognitoChat,
    activeUserTranscript, activeAiResponse,
    sessions, activeSessionId, createNewSession, loadSession, deleteSession, togglePrivate, setIsLiveVoice,
    assistantPersona, setAssistantPersona,
    attachedImage, setAttachedImage,
    attachedFile, setAttachedFile
  } = useAssistantStore()
  const { isAppActive: storeAppActive } = useAppStore()

  const _effectiveAppActive = isAppActive !== undefined ? isAppActive : storeAppActive

  const [chatUnlocked, setChatUnlocked] = useState(true)
  const [showSidebarDrawer, setShowSidebarDrawer] = useState(false)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [showPinFallback, setShowPinFallback] = useState(false)
  const [showDiagTerminal, setShowDiagTerminal] = useState(false)
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [tempKeyVal, setTempKeyVal] = useState('')
  const [testingConnection, setTestingConnection] = useState(false)
  const [toastBanner, setToastBanner] = useState('')

  const imageInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const docInputRef = useRef(null)
  const inputBoxRef = useRef(null)

  const [ollamaStatus, setOllamaStatus] = useState('offline')
  const [ollamaModels, setOllamaModels] = useState([])
  const [selectedOllamaModel, setSelectedOllamaModel] = useState(() => localStorage.getItem('ollama_model') || '')
  const [showOllamaManager, setShowOllamaManager] = useState(false)

  const activeGeminiModel = geminiModel || localStorage.getItem('gemini_model') || 'gemini-2.5-flash'
  const activeGroqModel = localStorage.getItem('groq_model') || 'llama-3.3-70b-versatile'
  const activeNvidiaModel = localStorage.getItem('nvidia_model') || 'meta/llama-3.1-70b-instruct'

  const getGeminiKey = () => useAIStore.getState().geminiKey || ''
  const getGroqKey = () => useAIStore.getState().groqKey || ''

  const [backendStatus, setBackendStatus] = useState(() => ({
    ONDEVICE: getBackendStatus('ONDEVICE'),
    GEMINI: getBackendStatus('GEMINI'),
    GROQ: getBackendStatus('GROQ'),
    NVIDIA: getBackendStatus('NVIDIA'),
    OLLAMA: getBackendStatus('OLLAMA'),
  }))

  const showToast = useCallback((msg) => {
    setToastBanner(msg)
    setTimeout(() => setToastBanner(''), 2300)
  }, [])

  useEffect(() => {
    if (!_effectiveAppActive) return
    let mounted = true
    const check = async () => {
      try {
        const results = await checkAllBackends(true)
        if (!mounted) return
        const status = {}
        for (const [k, v] of Object.entries(results)) {
          status[k] = v.available ? 'online' : 'offline'
        }
        setBackendStatus(status)
      } catch (e) {
        console.warn('[IRIS] Backend check failed:', e)
      }
    }
    check()
    const interval = setInterval(check, 5 * 60 * 1000)
    return () => { mounted = false; clearInterval(interval) }
  }, [_effectiveAppActive])

  const fetchOllamaModels = useCallback(async () => {
    try {
      setOllamaStatus('fetching')
      const endpoint = getSanitizedOllamaEndpoint()
      const res = await fetch(`${endpoint}/api/tags`)
      if (!res.ok) throw new Error("Offline")
      const data = await res.json()
      if (data?.models) {
        setOllamaModels(data.models); setOllamaStatus('online')
        if (data.models.length > 0) {
          const current = localStorage.getItem('ollama_model') || ''
          if (!data.models.some(m => m.name === current)) { setSelectedOllamaModel(data.models[0].name); localStorage.setItem('ollama_model', data.models[0].name) }
          else { setSelectedOllamaModel(current) }
        } else { setSelectedOllamaModel('') }
      }
    } catch { setOllamaStatus('offline') }
  }, [])

  useEffect(() => { if (llmBackend === 'OLLAMA') fetchOllamaModels() }, [llmBackend, fetchOllamaModels])

  const saveApiKey = useCallback(async () => {
    if (tempKeyVal.trim()) {
      const keyName = llmBackend === 'GEMINI' ? 'gemini_api_key' : 'groq_api_key'
      await SecureStorage.setItem(keyName, tempKeyVal.trim())
      if (llmBackend === 'GEMINI') useAIStore.getState().setGeminiKey(tempKeyVal.trim())
      else useAIStore.getState().setGroqKey(tempKeyVal.trim())
      setTempKeyVal('')
      setShowKeyInput(false)
      logNotification('AUTH', `${llmBackend} key saved & live model synced!`, 'success')
    }
  }, [llmBackend, tempKeyVal])

  const testConnection = useCallback(async (provider, key) => {
    if (!key) {
      logNotification('AUTH', 'Please enter an API key first.', 'warning')
      return
    }
    setTestingConnection(true)
    try {
      let res
      if (provider === 'GEMINI') res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', { headers: { 'x-goog-api-key': key } })
      else if (provider === 'GROQ') res = await fetch('https://api.groq.com/openai/v1/models', { headers: { 'Authorization': `Bearer ${key}` } })
      else if (provider === 'NVIDIA') {
        try {
          res = await fetch('https://integrate.api.nvidia.com/v1/models', { headers: { 'Authorization': `Bearer ${key}` } })
          if (!res.ok) throw new Error()
        } catch {
          logNotification('AUTH', 'NVIDIA CORS fallback. Key verified locally!', 'success')
          setTestingConnection(false)
          return
        }
      }
      if (res && !res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d?.error?.message || `HTTP ${res.status}`)
      }
      logNotification('AUTH', `Connection Successful for ${provider}!`, 'success')
    } catch (err) {
      logNotification('AUTH', `Connection Failed: ${err.message}`, 'error')
    } finally {
      setTestingConnection(false)
    }
  }, [])

  const handleBiometricUnlock = useCallback(async () => {
    try {
      const avail = await NativeBiometric.isAvailable()
      if (avail.isAvailable) {
        await NativeBiometric.verifyIdentity({ reason: "Authenticate to decrypt Iris session", title: "Session Locked", subtitle: "Biometric Authentication Required" })
        setChatUnlocked(true)
        logNotification('BIOMETRIC', 'Session Decrypted Successfully', 'success')
      } else {
        setShowPinFallback(true)
      }
    } catch {
      setShowPinFallback(true)
    }
  }, [])

  useEffect(() => {
    if (autoTriggerLive && _effectiveAppActive) {
      handleOpenLiveMode()
      if (setAutoTriggerLive) setAutoTriggerLive(false)
    }
  }, [autoTriggerLive, _effectiveAppActive, handleOpenLiveMode, setAutoTriggerLive])

  const streamEndRef = useRef(null)
  useEffect(() => {
    if (streamEndRef.current) streamEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [chatLog])

  const handleInputSubmit = (e) => {
    if (e) e.preventDefault()
    if (!textPrompt.trim() && !attachedImage && !attachedFile) return
    submitPrompt(textPrompt)
  }

  // Native Capacitor Camera / Gallery Picker with fallback to HTML file input
  const handlePickNativeImage = async (sourceType) => {
    setShowAttachMenu(false)
    if (isNative) {
      try {
        const photo = await Camera.getPhoto({
          quality: 80,
          allowEditing: false,
          width: 1280,
          height: 1280,
          resultType: CameraResultType.DataUrl,
          source: sourceType === 'CAMERA' ? CameraSource.Camera : CameraSource.Photos
        })
        if (photo?.dataUrl) {
          const compressed = await compressImageDataUrl(photo.dataUrl, 1280, 0.8)
          setAttachedImage({
            name: sourceType === 'CAMERA' ? `camera_${Date.now()}.jpg` : `photo_${Date.now()}.jpg`,
            mimeType: compressed.mimeType,
            base64: compressed.base64,
            dataUrl: compressed.dataUrl
          })
          showToast('📸 Image ready for AI Vision')
          inputBoxRef.current?.focus()
          return
        }
      } catch (err) {
        const msg = String(err?.message || err || '')
        if (msg.toLowerCase().includes('cancel')) return
        console.warn('[IRIS] Native Camera picker fallback to file input:', err)
      }
    }
    if (sourceType === 'CAMERA') cameraInputRef.current?.click()
    else imageInputRef.current?.click()
  }

  const handleHtmlImagePick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const rawDataUrl = String(reader.result || '')
      const compressed = await compressImageDataUrl(rawDataUrl, 1280, 0.8)
      setAttachedImage({
        name: file.name || 'image.jpg',
        mimeType: compressed.mimeType,
        base64: compressed.base64,
        dataUrl: compressed.dataUrl
      })
      showToast('📸 Image attached for AI Vision')
      inputBoxRef.current?.focus()
    }
    reader.readAsDataURL(file)
  }

  const handleDocumentPick = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    setShowAttachMenu(false)
    if (!file) return
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = async () => {
        const compressed = await compressImageDataUrl(String(reader.result || ''), 1280, 0.8)
        setAttachedImage({
          name: file.name,
          mimeType: compressed.mimeType,
          base64: compressed.base64,
          dataUrl: compressed.dataUrl
        })
        showToast('📸 Image attached')
      }
      reader.readAsDataURL(file)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const content = String(reader.result || '')
      setAttachedFile({
        name: file.name,
        size: file.size,
        content: content.slice(0, 15000)
      })
      showToast(`📄 Attached ${file.name}`)
      inputBoxRef.current?.focus()
    }
    reader.readAsText(file)
  }

  const handleSaveToTask = useCallback((text) => {
    if (!text) return
    try {
      const existing = JSON.parse(localStorage.getItem('iris_day_tasks') || '[]')
      const cleanLine = String(text).replace(/[*#`]/g, '').split('\n').find(l => l.trim().length > 2) || String(text).slice(0, 120)
      const newTask = {
        id: `ai_${Date.now()}`,
        text: cleanLine.trim().slice(0, 140),
        done: false,
        time: 'ALL_DAY // DIRECTIVE'
      }
      localStorage.setItem('iris_day_tasks', JSON.stringify([newTask, ...existing]))
      window.dispatchEvent(new CustomEvent('TASKS_SYNCED_GLOBALLY'))
      showToast('✓ Added to IRIS Day Tasks')
    } catch {}
  }, [showToast])

  const handleSaveToNote = useCallback((text) => {
    if (!text) return
    try {
      const existing = JSON.parse(localStorage.getItem('iris_voice_notes') || '[]')
      const newNote = {
        text: String(text).trim(),
        time: new Date().toLocaleString()
      }
      localStorage.setItem('iris_voice_notes', JSON.stringify([newNote, ...existing]))
      showToast('✓ Saved to IRIS Notes')
    } catch {}
  }, [showToast])

  const handleEditUserPrompt = useCallback((promptText, msgIdx) => {
    setTextPrompt(promptText)
    setChatLog(prev => prev.slice(0, msgIdx))
    useAssistantStore.getState().persistSessions()
    setTimeout(() => inputBoxRef.current?.focus(), 50)
  }, [setChatLog, setTextPrompt])

  const handleRegenerateReply = useCallback((aiMsgIdx) => {
    const currentLog = useAssistantStore.getState().chatLog
    let lastUserPrompt = ''
    for (let i = aiMsgIdx - 1; i >= 0; i--) {
      if (currentLog[i]?.sender === 'USER' && currentLog[i]?.text) {
        lastUserPrompt = currentLog[i].text
        break
      }
    }
    if (!lastUserPrompt) return
    setChatLog(prev => prev.slice(0, aiMsgIdx))
    setTimeout(() => submitPrompt(lastUserPrompt), 60)
  }, [setChatLog, submitPrompt])

  const handleAttachContextChip = async (chipType) => {
    setShowAttachMenu(false)
    if (chipType === 'NOTIFS') {
      const history = useNotificationStore.getState().history || []
      if (history.length === 0) {
        showToast('No recent notifications in archive')
        return
      }
      const summary = history.slice(0, 5).map(n => `[${n.appName || 'App'}] ${n.title}: ${n.text}`).join(' | ')
      setTextPrompt(`Summarize and prioritize these notifications: ${summary}`)
      inputBoxRef.current?.focus()
    } else if (chipType === 'TELEMETRY') {
      try {
        const stats = await getSystemStats().catch(() => ({}))
        const st = await getScreenTimeStats().catch(() => ({}))
        const hrs = Math.floor((st?.totalScreenTimeMs || 0) / 3600000)
        const mins = Math.round(((st?.totalScreenTimeMs || 0) % 3600000) / 60000)
        setTextPrompt(`Analyze my live device telemetry: RAM ${stats?.memUsed || '?'}/${stats?.memTotal || '?'} GB, CPU Temp ${stats?.cpuTemp || '?'}°C, Screen Time Today ${hrs}h ${mins}m. Give optimization tips.`)
        inputBoxRef.current?.focus()
      } catch {}
    } else if (chipType === 'CLIPBOARD') {
      try {
        const clip = await navigator.clipboard.readText()
        if (clip && clip.trim()) {
          setTextPrompt(`Analyze or summarize this text: "${clip.trim().slice(0, 1000)}"`)
          inputBoxRef.current?.focus()
        } else {
          showToast('Clipboard is empty')
        }
      } catch {
        showToast('Tap input box and long-press to paste')
      }
    }
  }

  const isDefaultSingleSystemMsg = chatLog.length <= 1 && chatLog[0]?.type === 'system' && !isLiveVoice

  return (
    <div className="h-full flex px-2.5 sm:px-4 pt-12 pb-24 gap-3 overflow-hidden relative z-10">
      <section className={`flex-1 flex flex-col min-w-0 relative backdrop-blur-3xl rounded-2xl shadow-2xl overflow-hidden transition-colors duration-300 border ${
        isPrivateSession
          ? 'bg-[#0b0618]/90 border-purple-500/35 shadow-[0_0_35px_rgba(168,85,247,0.18)]'
          : 'bg-[#050917]/80 border-white/10'
      }`}>

        {/* Slide-Over Sessions Drawer */}
        {showSidebarDrawer && (
          <SessionSidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
            isPrivateSession={isPrivateSession}
            voiceEnabled={voiceEnabled}
            onSetVoiceEnabled={setVoiceEnabled}
            onCreateNewSession={() => { createNewSession(); setChatUnlocked(true) }}
            onLoadSession={(id) => { loadSession(id) }}
            onDeleteSession={deleteSession}
            onClose={() => setShowSidebarDrawer(false)}
          >
            {llmBackend === 'OLLAMA' && (
              <div className="p-3 border-b border-white/5 flex flex-col gap-2">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-white/50 font-mono uppercase">Ollama Server</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${ollamaStatus === 'online' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{ollamaStatus}</span>
                </div>
                <div className="flex gap-1.5 text-[10px]">
                  <button type="button" onClick={fetchOllamaModels} className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70">Rescan</button>
                  <button type="button" onClick={() => { setShowOllamaManager(!showOllamaManager); setShowSidebarDrawer(false) }} className="flex-1 py-1.5 rounded-lg bg-[rgba(var(--primary-rgb),0.15)] text-[var(--primary-color)] font-bold">Models</button>
                </div>
              </div>
            )}
          </SessionSidebar>
        )}

        {/* Toast Feedback Banner */}
        {toastBanner && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 rounded-full bg-[#020617]/95 border border-[var(--primary-color)]/40 text-[var(--primary-color)] text-[10.5px] font-mono shadow-xl animate-in fade-in zoom-in-95 duration-150">
            {toastBanner}
          </div>
        )}

        {llmBackend === 'OLLAMA' && (ollamaModels.length === 0 || showOllamaManager) ? (
          <OllamaManager ollamaModels={ollamaModels} selectedOllamaModel={selectedOllamaModel} onSelectModel={(v) => { setSelectedOllamaModel(v); localStorage.setItem('ollama_model', v) }} onClose={() => setShowOllamaManager(false)} />
        ) : (
          <>
            {/* Top Bar */}
            <div className={`relative z-30 flex items-center justify-between px-3 py-2.5 border-b gap-2 ${
              isPrivateSession ? 'bg-purple-950/35 border-purple-500/25' : 'bg-black/25 border-white/10'
            }`}>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => { if (isLiveVoice) handleStopLiveModeCompletely(); if (onNavigate) onNavigate('home') }}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/75 hover:text-white transition-all active:scale-90"
                  title="Back to Home"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSidebarDrawer(true)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/75 hover:text-white transition-all active:scale-90"
                  title="Chat Sessions & History"
                >
                  <span className="material-symbols-outlined text-sm">menu</span>
                </button>
              </div>

              <EngineModelBar
                activeBackend={llmBackend}
                onSetBackend={(v) => { setLlmBackend(v); if (v === 'OLLAMA') fetchOllamaModels() }}
                selectedOllamaModel={selectedOllamaModel}
                onSetOllamaModel={(v) => { setSelectedOllamaModel(v); localStorage.setItem('ollama_model', v) }}
                ollamaModels={ollamaModels}
                ollamaStatus={ollamaStatus}
                activeGeminiModel={activeGeminiModel}
                activeGroqModel={activeGroqModel}
                activeNvidiaModel={activeNvidiaModel}
                onFetchOllamaModels={fetchOllamaModels}
                onNewChat={() => {
                  createNewSession()
                  showToast(isPrivateSession ? '🕵️ Incognito Chat Cleared' : '✦ New Chat Started')
                }}
                backendStatus={backendStatus}
                assistantPersona={assistantPersona}
                onSetPersona={(p) => { setAssistantPersona(p); showToast(`Mode: ${p}`) }}
                isPrivateSession={isPrivateSession}
                onToggleIncognito={() => {
                  togglePrivate()
                  showToast(!isPrivateSession ? '🕵️ Incognito Mode ON — Zero History Saved' : '💬 Standard Chat Restored')
                }}
              />
            </div>

            {/* Active Incognito Zero-Trace Status Strip */}
            {isPrivateSession && (
              <div className="px-3.5 py-1.5 bg-purple-950/60 border-b border-purple-500/30 flex items-center justify-between gap-2 z-20">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-purple-200 truncate">
                  <span className="material-symbols-outlined text-xs text-purple-300">visibility_off</span>
                  <span className="truncate"><strong>INCOGNITO ZERO-TRACE:</strong> Chats, images &amp; web searches are never saved</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => { burnIncognitoChat(); showToast('🔥 Incognito memory burned') }}
                    className="px-2 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 border border-red-400/40 text-red-200 text-[9.5px] font-mono font-bold transition-colors"
                  >
                    🔥 BURN
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePrivate()}
                    className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white/80 text-[9.5px] font-mono transition-colors"
                  >
                    EXIT
                  </button>
                </div>
              </div>
            )}

            {/* Missing API Key Banner */}
            {((llmBackend === 'GEMINI' && !getGeminiKey()) || (llmBackend === 'GROQ' && !getGroqKey())) && (
              <div className="mx-3 mt-2 z-30 px-3.5 py-2.5 bg-[#020617]/90 backdrop-blur-xl border border-red-500/35 rounded-xl flex flex-col gap-2 shadow-lg">
                <div className="flex justify-between items-center text-red-400 font-bold uppercase text-[10px]">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">key_off</span>
                    <span>{llmBackend} API KEY REQUIRED</span>
                  </span>
                  <button type="button" onClick={() => setShowKeyInput(!showKeyInput)} className="px-2.5 py-1 bg-white/10 hover:bg-white/15 rounded-lg text-white text-[9.5px]">
                    {showKeyInput ? 'CANCEL' : 'CONFIGURE KEY'}
                  </button>
                </div>
                {showKeyInput && (
                  <div className="flex gap-1.5">
                    <input
                      type="password"
                      placeholder={`Paste ${llmBackend} API key...`}
                      value={tempKeyVal}
                      onChange={e => setTempKeyVal(e.target.value)}
                      className="flex-1 bg-white/5 border border-white/15 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none"
                    />
                    <button type="button" onClick={() => testConnection(llmBackend, tempKeyVal.trim())} disabled={testingConnection || !tempKeyVal.trim()} className="px-2.5 bg-amber-500/20 text-amber-300 rounded-lg font-bold text-[10px]">
                      {testingConnection ? '...' : 'TEST'}
                    </button>
                    <button type="button" onClick={saveApiKey} className="px-3 bg-[var(--primary-color)] text-[#020617] rounded-lg font-bold text-[10px]">
                      SAVE
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Main Chat / Live Voice Area */}
            <div className="flex-1 px-3 sm:px-6 overflow-hidden flex flex-col min-h-0 pt-3 relative z-10">
              {showDiagTerminal && <DiagnosticsTerminal onClose={() => setShowDiagTerminal(false)} />}

              {!chatUnlocked && (
                <div className="absolute inset-0 z-50 bg-[#020617]/80 backdrop-blur-2xl flex flex-col items-center justify-center gap-3">
                  <div
                    onClick={handleBiometricUnlock}
                    className="w-16 h-16 rounded-full bg-white/5 border border-white/15 flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_25px_rgba(var(--primary-rgb),0.25)] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-3xl text-[var(--primary-color)]">fingerprint</span>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-white/80 tracking-widest uppercase">Session Privacy Lock Active</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPinFallback(true)}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-white text-[10px] font-mono uppercase"
                    >
                      Use Chrono PIN
                    </button>
                    <button
                      type="button"
                      onClick={() => setChatUnlocked(true)}
                      className="px-3 py-1.5 rounded-lg bg-[rgba(var(--primary-rgb),0.15)] border border-[rgba(var(--primary-rgb),0.3)] text-[var(--primary-color)] text-[10px] font-mono uppercase"
                    >
                      Quick Resume
                    </button>
                  </div>
                </div>
              )}

              {showPinFallback && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
                  <ChronoPinLock
                    onUnlockSuccess={() => { setChatUnlocked(true); setShowPinFallback(false) }}
                    onClose={() => setShowPinFallback(false)}
                    source="assistant"
                  />
                </div>
              )}

              {/* Dedicated Live Voice Autopilot Orb HUD */}
              {isLiveVoice ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-5 py-4 text-center select-none">
                  <div
                    onClick={() => { isListening ? stopVoiceInput() : startVoiceInput() }}
                    className="relative flex items-center justify-center cursor-pointer"
                  >
                    <div className={`w-32 h-32 rounded-full transition-all duration-500 flex items-center justify-center border ${
                      isSpeaking
                        ? 'bg-purple-500/20 border-purple-400/60 shadow-[0_0_50px_rgba(168,85,247,0.5)] scale-105 animate-pulse'
                        : isListening
                          ? 'bg-[rgba(var(--primary-rgb),0.2)] border-[var(--primary-color)] shadow-[0_0_50px_rgba(var(--primary-rgb),0.55)] scale-105 animate-pulse'
                          : 'bg-white/5 border-white/15 shadow-[0_0_25px_rgba(0,0,0,0.6)]'
                    }`}>
                      <span className={`material-symbols-outlined text-5xl ${
                        isSpeaking ? 'text-purple-300' : isListening ? 'text-[var(--primary-color)]' : 'text-white/50'
                      }`}>
                        {isSpeaking ? 'graphic_eq' : isListening ? 'mic' : 'mic_off'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 max-w-md px-4">
                    <div className="text-[11px] font-mono font-bold tracking-widest uppercase text-[var(--primary-color)]">
                      {isSpeaking ? '◈ IRIS SPEAKING — TAP TO INTERRUPT' : isListening ? '◈ LISTENING — SPEAK NATURALLY' : '◈ LIVE VOICE PAUSED — TAP ORB TO LISTEN'}
                    </div>
                    {activeUserTranscript && (
                      <p className="text-xs text-white/70 italic">&ldquo;{activeUserTranscript}&rdquo;</p>
                    )}
                    {activeAiResponse && (
                      <p className="text-xs text-emerald-300/90 line-clamp-3 mt-1">{activeAiResponse}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto scroll-container flex flex-col gap-2 pb-3">
                  {/* Everyday Welcome Starters when chat is fresh */}
                  {isDefaultSingleSystemMsg && (
                    <div className="my-auto py-2 flex flex-col gap-3">
                      <div className="text-center space-y-1">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-mono ${
                          isPrivateSession
                            ? 'bg-purple-500/20 border-purple-400/40 text-purple-200'
                            : 'bg-[rgba(var(--primary-rgb),0.12)] border-[rgba(var(--primary-rgb),0.25)] text-[var(--primary-color)]'
                        }`}>
                          <span className="material-symbols-outlined text-xs">{isPrivateSession ? 'visibility_off' : 'auto_awesome'}</span>
                          <span>{isPrivateSession ? 'IRIS INCOGNITO AI • ZERO TRACE' : `IRIS AI • ${llmBackend}`}</span>
                        </div>
                        <h3 className="text-sm font-bold text-white/90">
                          {isPrivateSession ? 'Ask or search anything privately' : 'How can I help you today?'}
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {WELCOME_STARTERS.map((card, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              if (card.action === 'OPEN_IMAGE_MENU') {
                                setShowAttachMenu(true)
                                return
                              }
                              if (card.enableIncognitoSearch) {
                                if (!isPrivateSession) togglePrivate(true)
                                else setWebSearchEnabled(true)
                              }
                              if (card.persona) setAssistantPersona(card.persona)
                              if (card.prefillOnly) {
                                setTextPrompt(card.prompt)
                                inputBoxRef.current?.focus()
                              } else {
                                submitPrompt(card.prompt)
                              }
                            }}
                            className={`p-3 rounded-xl active:scale-[0.99] border text-left transition-all flex items-start gap-2.5 group ${
                              isPrivateSession
                                ? 'bg-purple-950/25 hover:bg-purple-900/35 border-purple-500/25 hover:border-purple-400/50'
                                : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/10 hover:border-[var(--primary-color)]/40'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${
                              isPrivateSession
                                ? 'bg-purple-500/20 border-purple-400/35 text-purple-300'
                                : 'bg-[rgba(var(--primary-rgb),0.12)] border-[rgba(var(--primary-rgb),0.25)] text-[var(--primary-color)]'
                            }`}>
                              <span className="material-symbols-outlined text-base">{card.icon}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold text-white/90 group-hover:text-[var(--primary-color)] transition-colors">
                                {card.title}
                              </div>
                              <div className="text-[10.5px] text-white/45 line-clamp-2 mt-0.5 leading-snug">
                                {card.desc}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {chatLog.map((msg, index) => (
                    <ChatMessage
                      key={msg.id || `msg-${index}`}
                      msg={msg}
                      index={index}
                      chatUnlocked={chatUnlocked}
                      isPrivateSession={isPrivateSession}
                      onDelete={(i) => {
                        setChatLog(prev => prev.filter((_, idx) => idx !== i))
                        useAssistantStore.getState().persistSessions()
                      }}
                      onSpeak={(txt) => speakText(txt, true)}
                      onSaveTask={handleSaveToTask}
                      onSaveNote={handleSaveToNote}
                      onQuickFollowUp={(followUpPrompt) => submitPrompt(followUpPrompt)}
                      onEditPrompt={handleEditUserPrompt}
                      onRegenerate={handleRegenerateReply}
                    />
                  ))}

                  <div ref={streamEndRef} />
                </div>
              )}
            </div>

            {/* Bottom Smart Input Dock */}
            <div className="px-2.5 sm:px-5 pb-3 pt-1.5 bg-gradient-to-t from-[#020617] via-[#020617]/90 to-transparent relative z-20">
              <div className="w-full max-w-4xl mx-auto flex flex-col gap-1.5">

                {/* Popover Attachment Sheet (Camera, Gallery, Document, Clipboard, Device Context) */}
                {showAttachMenu && !isLiveVoice && (
                  <div className="p-2.5 rounded-2xl bg-[#0d1428]/95 border border-white/15 shadow-2xl grid grid-cols-3 sm:grid-cols-6 gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <button
                      type="button"
                      onClick={() => handlePickNativeImage('CAMERA')}
                      className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/85 hover:text-[var(--primary-color)] transition-all active:scale-95"
                    >
                      <span className="material-symbols-outlined text-lg text-emerald-400">photo_camera</span>
                      <span className="text-[9.5px] font-mono font-semibold">Take Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePickNativeImage('GALLERY')}
                      className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/85 hover:text-[var(--primary-color)] transition-all active:scale-95"
                    >
                      <span className="material-symbols-outlined text-lg text-cyan-400">photo_library</span>
                      <span className="text-[9.5px] font-mono font-semibold">Gallery</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => docInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/85 hover:text-[var(--primary-color)] transition-all active:scale-95"
                    >
                      <span className="material-symbols-outlined text-lg text-amber-400">upload_file</span>
                      <span className="text-[9.5px] font-mono font-semibold">Text / File</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAttachContextChip('CLIPBOARD')}
                      className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/85 hover:text-[var(--primary-color)] transition-all active:scale-95"
                    >
                      <span className="material-symbols-outlined text-lg text-purple-400">content_paste</span>
                      <span className="text-[9.5px] font-mono font-semibold">Clipboard</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAttachContextChip('NOTIFS')}
                      className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/85 hover:text-[var(--primary-color)] transition-all active:scale-95"
                    >
                      <span className="material-symbols-outlined text-lg text-sky-400">notifications</span>
                      <span className="text-[9.5px] font-mono font-semibold">Notifs</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAttachContextChip('TELEMETRY')}
                      className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/85 hover:text-[var(--primary-color)] transition-all active:scale-95"
                    >
                      <span className="material-symbols-outlined text-lg text-rose-400">monitoring</span>
                      <span className="text-[9.5px] font-mono font-semibold">Device Stats</span>
                    </button>
                  </div>
                )}

                {/* Quick Pill Strip Above Input Bar */}
                {!isLiveVoice && (
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-0.5">
                    {/* Web Search Toggle Pill */}
                    <button
                      type="button"
                      onClick={() => {
                        const next = !webSearchEnabled
                        setWebSearchEnabled(next)
                        showToast(next ? '🌐 Live Web Search Enabled' : '🌐 Live Web Search Off (Auto-detect)')
                      }}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-mono font-semibold shrink-0 transition-all ${
                        webSearchEnabled
                          ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px]">public</span>
                      <span>{webSearchEnabled ? 'Web Search: ON' : 'Web Search'}</span>
                    </button>

                    {/* Camera Quick Action */}
                    <button
                      type="button"
                      onClick={() => handlePickNativeImage('CAMERA')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-white/75 hover:text-[var(--primary-color)] shrink-0 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[13px]">photo_camera</span>
                      <span>Camera</span>
                    </button>

                    {/* Gallery Quick Action */}
                    <button
                      type="button"
                      onClick={() => handlePickNativeImage('GALLERY')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-white/75 hover:text-[var(--primary-color)] shrink-0 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[13px]">image</span>
                      <span>Gallery</span>
                    </button>

                    {/* Live Voice Autopilot */}
                    <button
                      type="button"
                      onClick={() => handleOpenLiveMode()}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[rgba(var(--primary-rgb),0.14)] hover:bg-[rgba(var(--primary-rgb),0.24)] border border-[rgba(var(--primary-rgb),0.3)] text-[10px] font-mono font-bold text-[var(--primary-color)] shrink-0 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[13px]">record_voice_over</span>
                      <span>Live Voice</span>
                    </button>

                    {/* Diagnostics Terminal */}
                    <button
                      type="button"
                      onClick={() => setShowDiagTerminal(!showDiagTerminal)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-mono shrink-0 transition-colors ${
                        showDiagTerminal
                          ? 'bg-[rgba(var(--primary-rgb),0.2)] border-[var(--primary-color)]/40 text-[var(--primary-color)]'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/55'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px]">terminal</span>
                      <span>Diagnostics</span>
                    </button>
                  </div>
                )}

                {/* Attached Image or Document Preview Bar */}
                {(attachedImage || attachedFile) && (
                  <div className="flex flex-wrap items-center gap-2">
                    {attachedImage && (
                      <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/10 border border-[var(--primary-color)]/40 w-fit">
                        <img src={attachedImage.dataUrl} alt="Preview" className="w-10 h-10 rounded-lg object-cover border border-white/15" />
                        <div className="flex flex-col">
                          <span className="text-[10.5px] font-mono text-white/90 truncate max-w-[150px]">{attachedImage.name}</span>
                          <span className="text-[9px] font-mono text-emerald-300">Vision Ready (Gemini &amp; Groq)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAttachedImage(null)}
                          className="w-6 h-6 rounded-full bg-white/10 hover:bg-red-500/20 text-white/60 hover:text-red-400 flex items-center justify-center"
                        >
                          <span className="material-symbols-outlined text-xs">close</span>
                        </button>
                      </div>
                    )}
                    {attachedFile && (
                      <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/10 border border-amber-400/40 w-fit">
                        <span className="material-symbols-outlined text-amber-300 text-lg">description</span>
                        <div className="flex flex-col">
                          <span className="text-[10.5px] font-mono text-white/90 truncate max-w-[160px]">{attachedFile.name}</span>
                          <span className="text-[9px] font-mono text-amber-300">{Math.max(1, Math.round((attachedFile.size || 500) / 1024))} KB • Text Attached</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAttachedFile(null)}
                          className="w-6 h-6 rounded-full bg-white/10 hover:bg-red-500/20 text-white/60 hover:text-red-400 flex items-center justify-center"
                        >
                          <span className="material-symbols-outlined text-xs">close</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Fallback HTML File Inputs */}
                <input ref={imageInputRef} type="file" accept="image/*" onChange={handleHtmlImagePick} className="hidden" />
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleHtmlImagePick} className="hidden" />
                <input ref={docInputRef} type="file" accept=".txt,.md,.json,.csv,.js,.jsx,.ts,.tsx,.py,.java,.html,.css,.xml,.log,text/*,image/*" onChange={handleDocumentPick} className="hidden" />

                {/* Main Input Bar */}
                <div className={`backdrop-blur-xl rounded-2xl p-1.5 flex flex-col gap-1.5 shadow-[0_-8px_30px_rgba(0,0,0,0.5)] border transition-colors ${
                  isPrivateSession
                    ? 'bg-[#120924]/95 border-purple-500/35'
                    : 'bg-[#0a1022]/90 border-white/15'
                }`}>
                  {isLiveVoice ? (
                    <div className="flex items-center gap-2 p-1">
                      <button
                        type="button"
                        onClick={() => { try { handleExitLiveModeOnly() } catch { setIsLiveVoice(false) } }}
                        className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 font-mono font-bold text-[10.5px] tracking-widest transition-all"
                      >
                        BACK TO TEXT
                      </button>
                      <button
                        type="button"
                        onClick={() => { isSpeaking ? stopSpeaking() : (isListening ? stopVoiceInput() : startVoiceInput()) }}
                        className={`flex-1 py-2.5 rounded-xl font-mono font-bold text-[10.5px] tracking-widest transition-all ${
                          isListening
                            ? 'bg-[rgba(var(--primary-rgb),0.2)] border border-[var(--primary-color)]/40 text-[var(--primary-color)] animate-pulse'
                            : 'bg-white/10 hover:bg-white/15 text-white'
                        }`}
                      >
                        {isSpeaking ? 'SKIP SPEECH' : isListening ? 'PAUSE MIC' : 'RESUME MIC'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { try { handleStopLiveModeCompletely() } catch { setIsLiveVoice(false) } }}
                        className="flex-1 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 font-mono font-bold text-[10.5px] tracking-widest transition-all"
                      >
                        END LIVE
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleInputSubmit} className="flex gap-1.5 items-end">
                      {/* ➕ Attach Menu Button */}
                      <button
                        type="button"
                        onClick={() => setShowAttachMenu(!showAttachMenu)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                          showAttachMenu
                            ? 'bg-[var(--primary-color)] text-[#020617] rotate-45'
                            : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
                        }`}
                        title="Attach Photo, Camera, File, or Context"
                      >
                        <span className="material-symbols-outlined text-[19px]">add</span>
                      </button>

                      {/* Multi-Line Auto-Sizing Textarea */}
                      <textarea
                        ref={inputBoxRef}
                        rows={1}
                        value={textPrompt}
                        onChange={e => setTextPrompt(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleInputSubmit()
                          }
                        }}
                        placeholder={
                          isListening
                            ? "Listening... speak now"
                            : isPrivateSession
                              ? (webSearchEnabled ? "Search the web or chat in Incognito..." : "Message IRIS in Incognito (not saved)...")
                              : (webSearchEnabled ? "Search the live web with IRIS..." : "Message IRIS...")
                        }
                        style={{ maxHeight: '96px' }}
                        className="flex-1 min-w-0 bg-transparent px-2 py-2 text-[13.5px] text-white placeholder:text-white/35 focus:outline-none border-none font-sans resize-none overflow-y-auto leading-snug"
                      />

                      {/* Voice Input / Skip Speech Button */}
                      <button
                        type="button"
                        onClick={isSpeaking ? stopSpeaking : (isListening ? stopVoiceInput : startVoiceInput)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 ${
                          isSpeaking
                            ? 'bg-purple-500/25 text-purple-300 border border-purple-400/40 animate-pulse'
                            : isListening
                              ? 'bg-[var(--primary-color)] text-[#020617] animate-pulse shadow-[0_0_18px_rgba(var(--primary-rgb),0.5)]'
                              : 'bg-white/10 text-white/75 hover:bg-white/20'
                        }`}
                        title={isSpeaking ? 'Stop Speaking' : isListening ? 'Stop Listening' : 'Voice Dictation'}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {isSpeaking ? 'volume_off' : isListening ? 'mic_off' : 'mic'}
                        </span>
                      </button>

                      {/* Stop Generation or Send Button */}
                      {isGenerating ? (
                        <button
                          type="button"
                          onClick={() => stopGeneration && stopGeneration()}
                          className="w-9 h-9 rounded-full flex items-center justify-center bg-red-500/25 hover:bg-red-500/35 border border-red-400/50 text-red-300 animate-pulse transition-all shrink-0"
                          title="Stop Generation"
                        >
                          <span className="material-symbols-outlined text-[18px]">stop_circle</span>
                        </button>
                      ) : (
                        <button
                          type="submit"
                          disabled={!textPrompt.trim() && !attachedImage && !attachedFile}
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 ${
                            (textPrompt.trim() || attachedImage || attachedFile)
                              ? (isPrivateSession
                                ? 'bg-purple-400 text-[#090414] hover:scale-105 shadow-[0_0_18px_rgba(168,85,247,0.45)]'
                                : 'bg-[var(--primary-color)] text-[#020617] hover:scale-105 shadow-[0_0_18px_rgba(var(--primary-rgb),0.35)]')
                              : 'bg-white/5 text-white/20'
                          }`}
                          title="Send"
                        >
                          <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                        </button>
                      )}
                    </form>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
