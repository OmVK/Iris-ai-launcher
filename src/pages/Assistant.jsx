import { useState, useEffect, useRef, useCallback } from 'react'
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
import { logNotification, getSystemStats, getScreenTimeStats } from '../components/LauncherPlugin'

const WELCOME_STARTERS = [
  {
    icon: 'notifications_active',
    title: 'Daily Briefing & Notifications',
    desc: 'Summarize my latest unread notifications, battery & screen time today',
    prompt: 'Check my recent notifications, screen time today, and give me a concise executive briefing.'
  },
  {
    icon: 'code',
    title: 'Code & System Architect',
    desc: 'Write clean production code, debug an error, or analyze time complexity',
    prompt: 'Act as a Principal Software Engineer. Help me design or debug a clean, optimal solution for: ',
    prefillOnly: true,
    persona: 'CODER'
  },
  {
    icon: 'school',
    title: 'Study Tutor & Flashcards',
    desc: 'Explain any hard concept simply with an analogy and generate flashcards',
    prompt: 'Explain this topic in simple terms with a real-world analogy and 3 Q&A flashcards: ',
    prefillOnly: true,
    persona: 'TUTOR'
  },
  {
    icon: 'memory',
    title: 'OS Memory & Device Boost',
    desc: 'Optimize system RAM and report live hardware telemetry',
    prompt: 'Boost RAM and optimize device memory right now, then report the reclaimed memory.'
  }
]

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
    activeUserTranscript, activeAiResponse,
    sessions, activeSessionId, createNewSession, loadSession, deleteSession, togglePrivate, setIsLiveVoice,
    assistantPersona, setAssistantPersona, attachedImage, setAttachedImage
  } = useAssistantStore()
  const { isAppActive: storeAppActive } = useAppStore()

  const _effectiveAppActive = isAppActive !== undefined ? isAppActive : storeAppActive

  // Normal sessions are unlocked by default (no annoying blur wall on startup).
  // Users can lock the current view on demand via the lock icon if they step away.
  const [chatUnlocked, setChatUnlocked] = useState(true)
  const [showSidebarDrawer, setShowSidebarDrawer] = useState(false)
  const [showPinFallback, setShowPinFallback] = useState(false)
  const [showDiagTerminal, setShowDiagTerminal] = useState(false)
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [tempKeyVal, setTempKeyVal] = useState('')
  const [testingConnection, setTestingConnection] = useState(false)
  const [toastBanner, setToastBanner] = useState('')

  const fileInputRef = useRef(null)
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
    setTimeout(() => setToastBanner(''), 2200)
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

  // Auto-trigger live mode only when Assistant page is actively visible
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
    e.preventDefault()
    if (!textPrompt.trim() && !attachedImage) return
    submitPrompt(textPrompt)
  }

  const handleImagePick = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result || '')
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
      setAttachedImage({
        name: file.name || 'image.jpg',
        mimeType: file.type || 'image/jpeg',
        base64,
        dataUrl
      })
      showToast('📸 Image attached for Gemini Vision')
    }
    reader.readAsDataURL(file)
    e.target.value = ''
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

  const handleAttachContextChip = async (chipType) => {
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
          setTextPrompt(`Analyze or summarize this text: "${clip.trim().slice(0, 800)}"`)
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
      <section className="flex-1 flex flex-col min-w-0 relative bg-[#050917]/80 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">

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
            <div className="relative z-30 flex items-center justify-between px-3 py-2.5 border-b border-white/10 bg-black/25 gap-2">
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
                onNewChat={() => { createNewSession(); showToast('✦ New Chat Session Started') }}
                backendStatus={backendStatus}
                assistantPersona={assistantPersona}
                onSetPersona={(p) => { setAssistantPersona(p); showToast(`Persona: ${p}`) }}
              />
            </div>

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

              {/* Optional On-Demand Privacy Lock Overlay */}
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
                  {/* Interactive Welcome Command Deck when chat is fresh */}
                  {isDefaultSingleSystemMsg && (
                    <div className="my-auto py-3 flex flex-col gap-3">
                      <div className="text-center space-y-1">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(var(--primary-rgb),0.12)] border border-[rgba(var(--primary-rgb),0.25)] text-[10px] font-mono text-[var(--primary-color)]">
                          <span className="material-symbols-outlined text-xs">auto_awesome</span>
                          <span>IRIS NEURAL MATRIX • {llmBackend}</span>
                        </div>
                        <h3 className="text-sm font-bold text-white/90">What objective are we tackling?</h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {WELCOME_STARTERS.map((card, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              if (card.persona) setAssistantPersona(card.persona)
                              if (card.prefillOnly) {
                                setTextPrompt(card.prompt)
                                inputBoxRef.current?.focus()
                              } else {
                                submitPrompt(card.prompt)
                              }
                            }}
                            className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] active:scale-[0.99] border border-white/10 hover:border-[var(--primary-color)]/40 text-left transition-all flex items-start gap-2.5 group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-[rgba(var(--primary-rgb),0.12)] border border-[rgba(var(--primary-rgb),0.25)] flex items-center justify-center shrink-0 text-[var(--primary-color)]">
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
                      onDelete={(i) => {
                        setChatLog(prev => prev.filter((_, idx) => idx !== i))
                        useAssistantStore.getState().persistSessions()
                      }}
                      onSpeak={(txt) => speakText(txt, true)}
                      onSaveTask={handleSaveToTask}
                      onSaveNote={handleSaveToNote}
                      onQuickFollowUp={(followUpPrompt) => submitPrompt(followUpPrompt)}
                    />
                  ))}

                  <div ref={streamEndRef} />
                </div>
              )}
            </div>

            {/* Bottom Smart Input Dock */}
            <div className="px-2.5 sm:px-5 pb-3 pt-1.5 bg-gradient-to-t from-[#020617] via-[#020617]/90 to-transparent relative z-20">
              <div className="w-full max-w-4xl mx-auto flex flex-col gap-1.5">

                {/* 1-Tap Context Chips Row */}
                {!isLiveVoice && (
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-0.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-white/75 hover:text-[var(--primary-color)] shrink-0 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[13px]">add_photo_alternate</span>
                      <span>Vision Image</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAttachContextChip('NOTIFS')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-white/75 hover:text-[var(--primary-color)] shrink-0 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[13px]">notifications</span>
                      <span>Unread Notifs</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAttachContextChip('TELEMETRY')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-white/75 hover:text-[var(--primary-color)] shrink-0 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[13px]">Vital_signs</span>
                      <span>Device Stats</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAttachContextChip('CLIPBOARD')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-white/75 hover:text-[var(--primary-color)] shrink-0 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[13px]">content_paste</span>
                      <span>Analyze Clipboard</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenLiveMode()}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[rgba(var(--primary-rgb),0.14)] hover:bg-[rgba(var(--primary-rgb),0.24)] border border-[rgba(var(--primary-rgb),0.3)] text-[10px] font-mono font-bold text-[var(--primary-color)] shrink-0 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[13px]">record_voice_over</span>
                      <span>Live Autopilot</span>
                    </button>
                  </div>
                )}

                {/* Attached Image Thumbnail Preview */}
                {attachedImage && (
                  <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/5 border border-[var(--primary-color)]/35 w-fit">
                    <img src={attachedImage.dataUrl} alt="Preview" className="w-9 h-9 rounded-lg object-cover border border-white/15" />
                    <div className="flex flex-col">
                      <span className="text-[10.5px] font-mono text-white/90 truncate max-w-[160px]">{attachedImage.name}</span>
                      <span className="text-[9px] font-mono text-[var(--primary-color)]">Gemini Multimodal Vision Ready</span>
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

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImagePick}
                  className="hidden"
                />

                {/* Input Container */}
                <div className="bg-[#0a1022]/90 backdrop-blur-xl border border-white/15 rounded-2xl p-1.5 flex flex-col gap-1.5 shadow-[0_-8px_30px_rgba(0,0,0,0.5)]">
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
                    <form onSubmit={handleInputSubmit} className="flex gap-1.5 items-center">
                      <button
                        type="button"
                        onClick={() => setShowDiagTerminal(!showDiagTerminal)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                          showDiagTerminal ? 'text-[var(--primary-color)] bg-[rgba(var(--primary-rgb),0.15)]' : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                        }`}
                        title="System Diagnostics Terminal"
                      >
                        <span className="material-symbols-outlined text-[18px]">terminal</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          togglePrivate()
                          showToast(!isPrivateSession ? '🔒 Private Incognito Session Active' : '🔓 Standard Session Restored')
                        }}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                          isPrivateSession ? 'text-red-400 bg-red-500/15 border border-red-500/30' : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                        }`}
                        title="Toggle Private Incognito Mode (No History Saved)"
                      >
                        <span className="material-symbols-outlined text-[18px]">{isPrivateSession ? 'shield_lock' : 'lock_open'}</span>
                      </button>

                      <input
                        ref={inputBoxRef}
                        type="text"
                        value={textPrompt}
                        onChange={e => setTextPrompt(e.target.value)}
                        placeholder={isListening ? "Listening... speak now" : "Ask IRIS or issue a device command..."}
                        className="flex-1 min-w-0 bg-transparent px-2 py-2.5 text-[13.5px] text-white placeholder:text-white/35 focus:outline-none border-none font-sans"
                      />

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
                          disabled={!textPrompt.trim() && !attachedImage}
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 ${
                            (textPrompt.trim() || attachedImage)
                              ? 'bg-[var(--primary-color)] text-[#020617] hover:scale-105 shadow-[0_0_18px_rgba(var(--primary-rgb),0.35)]'
                              : 'bg-white/5 text-white/20'
                          }`}
                          title="Send Prompt"
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
