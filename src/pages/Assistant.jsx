import { useState, useEffect, useRef, useCallback } from 'react'
import GlobeVisualizer from '../components/GlobeVisualizer'
import { NativeBiometric } from '@capgo/capacitor-native-biometric'
import { useAIStore } from '../stores/aiStore'
import { useAssistantStore } from '../stores/assistantStore'
import { useAppStore } from '../stores/appStore'
import { SecureStorage } from '../utils/secureStorage'
import { checkAllBackends, getBackendStatus } from '../utils/AIProviderManager'
import SessionSidebar from './assistant/SessionSidebar'
import EngineModelBar from './assistant/EngineModelBar'
import OllamaManager from './assistant/OllamaManager'
import DiagnosticsTerminal from './assistant/DiagnosticsTerminal'
import ChatMessage from './assistant/ChatMessage'

export default function Assistant({
  startVoiceInput, stopVoiceInput, speakText, stopSpeaking,
  submitPrompt,
  handleEngageLiveClick, handleSaveLiveConfig, handleOpenLiveMode, handleExitLiveModeOnly, handleStopLiveModeCompletely,
  autoTriggerLive, setAutoTriggerLive,
  isAppActive,
  onNavigate
}) {
  // Consume stores directly
  const { llmBackend, setLlmBackend, geminiKey, groqKey, voiceEnabled, setVoiceEnabled } = useAIStore()
  const { chatLog, setChatLog, textPrompt, setTextPrompt, isListening, isSpeaking, isLiveVoice, isPrivateSession, activeUserTranscript, activeAiResponse, sessions, activeSessionId, createNewSession, loadSession, deleteSession, togglePrivate, setIsLiveVoice, setIsListening } = useAssistantStore()
  const { isAppActive: storeAppActive } = useAppStore()

  const _effectiveAppActive = isAppActive !== undefined ? isAppActive : storeAppActive

  // Local UI state
  const [chatUnlocked, setChatUnlocked] = useState(false)
  const [isChatMinimized, setIsChatMinimized] = useState(true)
  const [isChatMaximized, setIsChatMaximized] = useState(false)
  const [showDiagTerminal, setShowDiagTerminal] = useState(false)
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [tempKeyVal, setTempKeyVal] = useState('')
  const [testingConnection, setTestingConnection] = useState(false)

  // Ollama local state
  const [ollamaStatus, setOllamaStatus] = useState('offline')
  const [ollamaModels, setOllamaModels] = useState([])
  const [selectedOllamaModel, setSelectedOllamaModel] = useState(() => localStorage.getItem('ollama_model') || '')
  const [showOllamaManager, setShowOllamaManager] = useState(false)

  // Dynamic model state
  const [activeGeminiModel, setActiveGeminiModel] = useState(() => localStorage.getItem('gemini_model') || 'gemini-2.5-flash')
  const [activeGroqModel, setActiveGroqModel] = useState(() => localStorage.getItem('groq_model') || 'llama-3.3-70b-versatile')
  const [activeNvidiaModel, setActiveNvidiaModel] = useState(() => localStorage.getItem('nvidia_model') || 'meta/llama-3.1-70b-instruct')
  const [dynamicGeminiModels, setDynamicGeminiModels] = useState([])
  const [dynamicGroqModels, setDynamicGroqModels] = useState([])
  const [dynamicNvidiaModels, setDynamicNvidiaModels] = useState([])

  const getGeminiKey = () => useAIStore.getState().geminiKey || ''
  const getGroqKey = () => useAIStore.getState().groqKey || ''
  const getNvidiaKey = async () => await SecureStorage.getItem('nvidia_api_key') || ''

  // Backend availability status
  const [backendStatus, setBackendStatus] = useState(() => ({
    ONDEVICE: getBackendStatus('ONDEVICE'),
    GEMINI: getBackendStatus('GEMINI'),
    GROQ: getBackendStatus('GROQ'),
    NVIDIA: getBackendStatus('NVIDIA'),
    OLLAMA: getBackendStatus('OLLAMA'),
  }))

  // Auto-check backends on mount + every 5 min
  useEffect(() => {
    let mounted = true
    const check = async () => {
      const results = await checkAllBackends(true)
      if (!mounted) return
      const status = {}
      for (const [k, v] of Object.entries(results)) {
        status[k] = v.available ? 'online' : 'offline'
      }
      setBackendStatus(status)
    }
    check()
    const interval = setInterval(check, 5 * 60 * 1000)
    return () => { mounted = false; clearInterval(interval) }
  }, [])

  // Ollama fetch
  const fetchOllamaModels = useCallback(async () => {
    try {
      setOllamaStatus('fetching')
      const endpoint = localStorage.getItem('ollama_endpoint') || 'http://localhost:11434'
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
    } catch (e) { setOllamaStatus('offline') }
  }, [])

  useEffect(() => { if (llmBackend === 'OLLAMA') fetchOllamaModels() }, [llmBackend, fetchOllamaModels])

  // Dynamic model fetching
  const fetchGeminiModels = async (key) => { if (!key) return; try { const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`); if (res.ok) { const data = await res.json(); if (data.models) { setDynamicGeminiModels(data.models.filter(m => m.supportedGenerationMethods?.includes('generateContent') || m.name.includes('gemini')).map(m => m.name.replace('models/', ''))) } } } catch (_e) { /* model fetch failed */ } }
  const fetchGroqModels = async (key) => { if (!key) return; try { const res = await fetch('https://api.groq.com/openai/v1/models', { headers: { 'Authorization': `Bearer ${key}` } }); if (res.ok) { const data = await res.json(); if (data.data) setDynamicGroqModels(data.data.map(m => m.id)) } } catch (_e) { /* model fetch failed */ } }
  const fetchNvidiaModels = async (key) => { const fb = ['meta/llama-3.1-405b-instruct', 'meta/llama-3.1-70b-instruct', 'meta/llama-3.1-8b-instruct', 'mistralai/mixtral-8x22b-instruct-v0.1', 'google/gemma-2-27b-it']; if (!key) return; try { const res = await fetch('https://integrate.api.nvidia.com/v1/models', { headers: { 'Authorization': `Bearer ${key}` } }); if (res.ok) { const data = await res.json(); if (data.data) { setDynamicNvidiaModels(data.data.map(m => m.id).filter(id => id.includes('instruct') || id.includes('chat')).slice(0, 20) || fb) } } } catch (e) { setDynamicNvidiaModels(fb) } }

  useEffect(() => { if (llmBackend === 'GEMINI') fetchGeminiModels(getGeminiKey()); if (llmBackend === 'GROQ') fetchGroqModels(getGroqKey()); if (llmBackend === 'NVIDIA') getNvidiaKey().then(k => fetchNvidiaModels(k)) }, [llmBackend, geminiKey, groqKey])

  // Connection test
  const testConnection = async (provider, key) => {
    if (!key) return alert("Please enter an API key first.")
    setTestingConnection(true)
    try {
      let res
      if (provider === 'GEMINI') res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)
      else if (provider === 'GROQ') res = await fetch('https://api.groq.com/openai/v1/models', { headers: { 'Authorization': `Bearer ${key}` } })
      else if (provider === 'NVIDIA') { try { res = await fetch('https://integrate.api.nvidia.com/v1/models', { headers: { 'Authorization': `Bearer ${key}` } }); if (!res.ok) throw new Error() } catch (e) { setDynamicNvidiaModels(['meta/llama-3.1-70b-instruct', 'meta/llama-3.1-405b-instruct', 'google/gemma-2-27b-it']); alert("NVIDIA CORS fallback. Key saved!"); setTestingConnection(false); return } }
      if (res && !res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d?.error?.message || `HTTP ${res.status}`) }
      alert("Connection Successful!")
    } catch (err) { alert(`Failed: ${err.message}`) } finally { setTestingConnection(false) }
  }

  // Auto-trigger live mode
  useEffect(() => { if (autoTriggerLive) { handleOpenLiveMode(); if (setAutoTriggerLive) setAutoTriggerLive(false) } }, [autoTriggerLive, handleOpenLiveMode, setAutoTriggerLive])

  const streamEndRef = useRef(null)
  useEffect(() => { if (streamEndRef.current) streamEndRef.current.scrollIntoView({ behavior: 'smooth' }) }, [chatLog])

  const handleInputSubmit = (e) => { e.preventDefault(); submitPrompt(textPrompt) }

  return (
    <div className="flex-1 mt-12 mb-20 flex flex-row overflow-hidden select-none">
      {!isChatMaximized && (
        <SessionSidebar sessions={sessions} activeSessionId={activeSessionId} isPrivateSession={isPrivateSession} voiceEnabled={voiceEnabled} onSetVoiceEnabled={setVoiceEnabled}
          onCreateNewSession={() => { createNewSession(); setIsChatMinimized(false); setChatUnlocked(true) }}
          onLoadSession={(id) => { loadSession(id); setIsChatMinimized(false) }}
          onDeleteSession={deleteSession}>
          {llmBackend === 'OLLAMA' && (
            <div className="p-3 border-b border-outline-variant/15 flex flex-col gap-2">
              <h4 className="font-label-caps text-[9px] text-[#00f2ff]/60 tracking-widest uppercase">OLLAMA ENGINE</h4>
              <div className="flex flex-col gap-1 text-[8px] font-mono-data">
                <div className="flex justify-between items-center">
                  <label className="text-on-surface-variant/50 uppercase">OLLAMA MODEL</label>
                  <span className={`text-[6px] font-bold px-1 rounded uppercase ${ollamaStatus === 'online' ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-error-container/10 text-error border border-error/30 animate-pulse'}`}>{ollamaStatus}</span>
                </div>
                <select value={selectedOllamaModel} onChange={e => { setSelectedOllamaModel(e.target.value); localStorage.setItem('ollama_model', e.target.value) }}
                  className="w-full bg-black/50 border border-outline-variant/30 rounded px-1.5 py-1 text-[8.5px] text-[#00f2ff] focus:outline-none focus:border-[#00f2ff] pr-5 cursor-pointer font-mono-data" disabled={ollamaStatus !== 'online' || ollamaModels.length === 0}>
                  {ollamaModels.length === 0 ? <option value="">(No models found)</option> : ollamaModels.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                </select>
              </div>
              <div className="pt-1.5 border-t border-white/5 space-y-1.5 font-mono-data text-[8px]">
                <div className="flex justify-between items-center text-[7.5px]"><span className="text-on-surface-variant/40">HOST:</span><span className="text-[#00f2ff] select-all truncate pr-1" style={{ maxWidth: '100px' }}>{(localStorage.getItem('ollama_endpoint') || 'http://localhost:11434').replace('http://', '')}</span></div>
                <div className="flex flex-col gap-1">
                  <button onClick={fetchOllamaModels} className="w-full py-1 rounded flex items-center justify-center gap-1 border border-[#00f2ff]/30 text-[#00f2ff] text-[8px] font-bold active:scale-95 transition-all hover:bg-[#00f2ff]/10"><span className="material-symbols-outlined text-[10px]">refresh</span>RESCAN SERVER</button>
                  <button onClick={() => setShowOllamaManager(!showOllamaManager)} className={`w-full py-1 rounded flex items-center justify-center gap-1 border text-[8px] font-bold active:scale-95 transition-all ${showOllamaManager ? 'bg-primary-fixed-dim/20 border-primary-fixed-dim/50 text-primary-fixed-dim' : 'border-primary-fixed-dim/30 text-primary-fixed-dim hover:bg-primary-fixed-dim/10'}`}>
                    <span className="material-symbols-outlined text-[10px]">cloud_download</span>{showOllamaManager ? 'BACK TO CHAT' : 'PULL NEW MODEL'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </SessionSidebar>
      )}

      <section className="flex-1 flex flex-col min-w-0 relative">
        {llmBackend === 'OLLAMA' && (ollamaModels.length === 0 || showOllamaManager) ? (
          <OllamaManager ollamaModels={ollamaModels} selectedOllamaModel={selectedOllamaModel} onSelectModel={(v) => { setSelectedOllamaModel(v); localStorage.setItem('ollama_model', v) }} onClose={() => setShowOllamaManager(false)} />
        ) : (
          <>
            <div className="flex-shrink-0 py-2 flex flex-col items-center justify-center relative bg-black/10 border-b border-outline-variant/10 z-20">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button onClick={() => { if (isLiveVoice) handleStopLiveModeCompletely(); if (onNavigate) onNavigate('home') }} className="w-7 h-7 rounded-lg bg-white/5 border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-white hover:bg-white/10 transition-all active:scale-90">
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                </button>
              </div>
              <EngineModelBar activeBackend={llmBackend} onSetBackend={(v) => { setLlmBackend(v); if (v === 'OLLAMA') fetchOllamaModels() }}
                selectedOllamaModel={selectedOllamaModel} onSetOllamaModel={(v) => { setSelectedOllamaModel(v); localStorage.setItem('ollama_model', v) }} ollamaModels={ollamaModels} ollamaStatus={ollamaStatus}
                activeGeminiModel={activeGeminiModel} onSetGeminiModel={(v) => { setActiveGeminiModel(v); localStorage.setItem('gemini_model', v) }} dynamicGeminiModels={dynamicGeminiModels}
                activeGroqModel={activeGroqModel} onSetGroqModel={setActiveGroqModel} dynamicGroqModels={dynamicGroqModels}
                activeNvidiaModel={activeNvidiaModel} onSetNvidiaModel={setActiveNvidiaModel} dynamicNvidiaModels={dynamicNvidiaModels}
                onFetchOllamaModels={fetchOllamaModels} onNewChat={() => { if (window.confirm('Start a new chat? Current conversation will be cleared.')) { setChatLog([]) } }}
                backendStatus={backendStatus} />

              {((llmBackend === 'GEMINI' && !getGeminiKey()) || (llmBackend === 'GROQ' && !getGroqKey())) && (
                <div className="w-full max-w-lg mt-2 px-3 py-1.5 bg-error-container/10 border border-error/35 rounded-xl flex flex-col gap-1.5 font-mono-data text-[8.5px] text-left animate-in fade-in duration-200 mx-auto">
                  <div className="flex justify-between items-center text-error font-bold uppercase">
                    <span>⚠️ {llmBackend} API KEY REQUIRED</span>
                    <button onClick={() => setShowKeyInput(!showKeyInput)} className="px-2 py-0.5 bg-error/15 border border-error/30 hover:bg-error/30 rounded text-[7.5px]">{showKeyInput ? 'CANCEL' : 'ENTER KEY NOW'}</button>
                  </div>
                  {showKeyInput ? (
                    <div className="flex gap-1.5 mt-0.5">
                      <input type="password" placeholder="ENTER AUTHENTICATION API KEY..." value={tempKeyVal} onChange={e => setTempKeyVal(e.target.value)} className="flex-grow bg-black/50 border border-outline-variant/30 rounded px-2 py-1 text-[8px] text-white focus:outline-none focus:border-error" />
                      <button onClick={() => testConnection(llmBackend, tempKeyVal.trim())} disabled={testingConnection || !tempKeyVal.trim()} className="px-2 bg-yellow-500/20 border border-yellow-500/40 text-yellow-500 hover:bg-yellow-500/30 rounded font-bold">{testingConnection ? 'TESTING...' : 'TEST'}</button>
                      <button onClick={async () => { if (tempKeyVal.trim()) { const keyName = llmBackend === 'GEMINI' ? 'gemini_api_key' : 'groq_api_key'; await SecureStorage.setItem(keyName, tempKeyVal.trim()); if (llmBackend === 'GEMINI') useAIStore.getState().setGeminiKey(tempKeyVal.trim()); else useAIStore.getState().setGroqKey(tempKeyVal.trim()); setTempKeyVal(''); setShowKeyInput(false); alert(`${llmBackend} key saved securely!`) } }} className="px-3 bg-error/20 border border-error/40 text-error hover:bg-error/30 rounded font-bold">SAVE</button>
                    </div>
                  ) : <p className="text-on-surface-variant/70 text-[7.5px] uppercase">No active credentials registered for this cognitive engine block. Please register a valid API authorization token.</p>}
                </div>
              )}
            </div>

            <div className="absolute bottom-[90px] right-4 z-50 flex flex-col items-end gap-2">
              {isSpeaking && <button onClick={stopSpeaking} className="px-3 py-1.5 bg-red-500/30 backdrop-blur-md border border-red-500/50 rounded-lg text-[10px] font-bold text-red-300 hover:bg-red-500/40 hover:border-red-500/70 transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse flex items-center gap-1.5"><span className="material-symbols-outlined text-[12px]">skip_next</span>SKIP</button>}
              {!isChatMinimized && <button onClick={() => setIsChatMaximized(!isChatMaximized)} className="px-3 py-1.5 bg-black/60 backdrop-blur-md border border-white/20 rounded-lg text-[10px] font-bold text-on-surface-variant hover:text-white hover:bg-white/10 hover:border-white/40 transition-all shadow-lg">{isChatMaximized ? 'RESTORE VIEW' : 'MAXIMIZE CHAT'}</button>}
              <button onClick={() => { setIsChatMinimized(!isChatMinimized); if (!isChatMinimized) { setChatUnlocked(false); setIsChatMaximized(false) } }} className="px-3 py-1.5 bg-black/60 backdrop-blur-md border border-white/20 rounded-lg text-[10px] font-bold text-on-surface-variant hover:text-white hover:bg-white/10 hover:border-white/40 transition-all shadow-lg shadow-[0_0_15px_rgba(0,242,255,0.15)]">{isChatMinimized ? 'OPEN CHAT LOG' : 'MINIMIZE CHAT'}</button>
            </div>

            <div className={`transition-all duration-500 ease-in-out flex justify-center items-center shrink-0 z-10 ${isChatMinimized ? 'flex-1 mb-10 scale-[1.4]' : 'mt-4 mb-2 scale-[0.8]'}`}>
              <div onClick={handleEngageLiveClick} className="cursor-pointer hover:scale-[1.05] active:scale-[0.95] transition-transform rounded-full p-4">
                <GlobeVisualizer state={isSpeaking ? 'speaking' : isListening ? 'listening' : chatLog?.some(x => x.loading) ? 'thinking' : 'idle'} className="" />
              </div>
            </div>

            {!isChatMinimized && (
              <>
                <div className="flex-1 px-4 overflow-hidden flex flex-col min-h-0 pt-3 relative">
                  {showDiagTerminal && <DiagnosticsTerminal onClose={() => setShowDiagTerminal(false)} />}

                  {!chatUnlocked && !isChatMinimized && (
                    <div onClick={async () => { try { const avail = await NativeBiometric.isAvailable(); if (avail.isAvailable) { await NativeBiometric.verifyIdentity({ reason: "Authenticate to decrypt Iris session", title: "Session Locked", subtitle: "Biometric Authentication Required" }); setChatUnlocked(true) } else { window.alert("Biometric hardware unavailable.") } } catch (e) { window.alert("Biometric failed: " + (e.message || e)) } }}
                      className="absolute inset-x-4 top-3 bottom-0 z-20 bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center gap-3 cursor-pointer group hover:bg-black/70 transition-colors rounded-t-xl">
                      <div className="relative"><div className="absolute inset-0 bg-[#00f2ff] blur-lg opacity-20 group-hover:opacity-40 transition-opacity rounded-full" /><span className="material-symbols-outlined text-4xl text-[#00f2ff]/70 group-hover:text-[#00f2ff] transition-colors relative z-10">fingerprint</span></div>
                      <span className="font-label-caps text-[#00f2ff]/60 tracking-widest text-xs uppercase bg-[#00f2ff]/10 px-3 py-1 rounded-full border border-[#00f2ff]/20">Tap To Decrypt Session</span>
                    </div>
                  )}

                  <div className="flex-1 glass-surface rounded-t-xl p-4 font-mono-data text-[10px] overflow-y-auto scroll-container space-y-3.5 border-b-0 leading-relaxed bg-[#0a0e17]/40 relative">
                    {chatLog.map((msg, index) => <ChatMessage key={msg.id || `msg-${index}`} msg={msg} index={index} chatUnlocked={chatUnlocked} onDelete={(i) => setChatLog(prev => prev.filter((_, idx) => idx !== i))} />)}
                    {activeUserTranscript && <div className={`flex gap-2 animate-pulse ${!chatUnlocked ? 'opacity-10 blur-md select-none' : ''}`}><span className="text-on-surface-variant/40 shrink-0">[{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }).toUpperCase()}]</span><span className="font-bold shrink-0 text-[#c6c5d4]">[USER]</span><span className="text-[#dfe2ef]/85">{activeUserTranscript}</span></div>}
                    {activeAiResponse && <div className={`flex gap-2 animate-pulse ${!chatUnlocked ? 'opacity-10 blur-md select-none' : ''}`}><span className="text-on-surface-variant/40 shrink-0">[{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }).toUpperCase()}]</span><span className="font-bold shrink-0 text-primary-container">[IRIS]</span><span className="text-on-surface">{activeAiResponse}</span></div>}
                    <div ref={streamEndRef} />
                  </div>
                </div>
              </>
            )}

            <div className="px-4 py-3 bg-surface-container-low/40 border-t border-outline-variant/20 backdrop-blur-md flex flex-col gap-2 relative z-20">
              {isLiveVoice ? (
                <>
                  {isSpeaking && <div className="flex items-center justify-center gap-2 py-1.5 px-3 bg-[#00f2ff]/10 border border-[#00f2ff]/25 rounded-lg text-[#00f2ff] text-[9px] font-mono-data animate-pulse"><span className="material-symbols-outlined text-[12px]">record_voice_over</span>LISTENING — SPEAK TO INTERRUPT</div>}
                  <div className="flex justify-between items-center gap-2 mt-1">
                    <button onClick={() => { try { handleExitLiveModeOnly() } catch(e) { console.warn('[IRIS] Exit failed:', e); setIsLiveVoice(false); setIsListening(false) } }} className="flex-1 py-2.5 rounded-lg bg-white/5 border border-outline-variant/30 text-on-surface-variant hover:text-white font-bold text-[10px] active:scale-95 transition-all flex justify-center items-center gap-1.5 font-mono-data"><span className="material-symbols-outlined text-sm">close</span><span className="font-label-caps tracking-widest">EXIT</span></button>
                    <button onClick={() => { try { isListening ? stopVoiceInput() : startVoiceInput() } catch(e) { console.warn('[IRIS] Voice toggle failed:', e) } }} className={`flex-1 py-2 rounded-lg flex justify-center items-center gap-2 border font-mono-data text-[10px] font-bold transition-all active:scale-95 ${isListening ? 'bg-primary-fixed-dim/20 border-primary-fixed-dim text-primary-fixed-dim shadow-[0_0_15px_rgba(0,242,255,0.3)] animate-pulse' : 'bg-surface-variant border-outline-variant text-on-surface hover:bg-surface-variant/80'}`}>
                      <span className="material-symbols-outlined text-sm">{isListening ? 'mic' : 'mic_off'}</span><span className="font-label-caps tracking-widest">{isListening ? 'PAUSE' : 'LISTEN'}</span>
                    </button>
                    <button onClick={() => { try { handleStopLiveModeCompletely() } catch(e) { console.warn('[IRIS] Stop failed:', e); setIsLiveVoice(false); setIsListening(false); setChatLog(prev => prev.filter(item => !item.loading)) } }} className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] shadow-[0_0_12px_rgba(220,38,38,0.45)] active:scale-95 transition-all flex justify-center items-center gap-1.5 font-mono-data"><span className="material-symbols-outlined text-sm">stop</span><span className="font-label-caps tracking-widest">STOP</span></button>
                  </div>
                </>
              ) : (
                <form onSubmit={handleInputSubmit} className="flex gap-2 mt-1">
                  <input type="text" value={textPrompt} onChange={e => setTextPrompt(e.target.value)} placeholder="ENTER COMMAND DIRECTIVE..." className="flex-1 bg-black/40 border border-outline-variant/30 rounded-lg px-3 py-2 text-xs font-mono-data placeholder:text-primary-fixed-dim/20 text-primary-fixed-dim focus:outline-none focus:border-primary-fixed-dim focus:ring-0" disabled={isListening} />
                  <button type="button" onClick={isSpeaking ? stopSpeaking : (isListening ? stopVoiceInput : startVoiceInput)} className={`rounded-lg flex items-center justify-center border transition-all active:scale-90 ${isSpeaking ? 'w-auto px-3 h-9 bg-red-500/30 border-red-500/60 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse gap-1.5' : isListening ? 'w-9 h-9 bg-error-container/30 border-error/50 text-error shadow-[0_0_10px_rgba(255,180,171,0.3)] animate-pulse' : 'w-9 h-9 bg-primary-fixed-dim/10 border-primary-fixed-dim/30 text-primary-fixed-dim hover:bg-primary-fixed-dim/20'}`}>
                    <span className="material-symbols-outlined text-lg">{isSpeaking ? 'skip_next' : isListening ? 'mic_off' : 'mic'}</span>{isSpeaking && <span className="text-[9px] font-bold uppercase tracking-wider">SKIP</span>}
                  </button>
                  <button type="submit" className="w-9 h-9 bg-[#00f2ff]/10 border border-[#00f2ff]/30 text-[#00f2ff] rounded-lg hover:bg-[#00f2ff]/20 active:scale-95 flex items-center justify-center transition-all"><span className="material-symbols-outlined text-lg">send</span></button>
                </form>
              )}

              <div className="flex gap-2 text-[8px] font-mono-data">
                <div className={`flex-1 py-1.5 rounded border flex items-center justify-center gap-1 ${isLiveVoice && isSpeaking ? 'border-red-500/35 text-red-300 animate-pulse' : isLiveVoice ? 'border-primary-fixed-dim/35 text-primary-fixed-dim' : 'border-outline-variant/10 text-on-surface-variant/40'}`}>
                  <span className="material-symbols-outlined text-[10px]">{isLiveVoice && isSpeaking ? 'record_voice_over' : 'sync'}</span>
                  <span className="font-label-caps text-[7px] tracking-wider">{isLiveVoice && isSpeaking ? 'SPEAKING — INTERRUPT ANYTIME' : isLiveVoice ? 'VOICE AUTOPILOT ACTIVE' : 'VOICE AUTOPILOT STANDBY'}</span>
                </div>
                <button onClick={togglePrivate} className={`flex-1 py-1.5 px-2 rounded border flex items-center justify-center gap-1 transition-all active:scale-95 ${isPrivateSession ? 'bg-error-container/20 border-error/55 text-error font-bold shadow-[0_0_10px_rgba(255,180,171,0.2)]' : 'bg-white/5 border-outline-variant/20 text-on-surface-variant/70 hover:text-white'}`}>
                  <span className="material-symbols-outlined text-[10px]">{isPrivateSession ? 'lock' : 'lock_open'}</span>
                  <span className="font-label-caps text-[7px] tracking-wider">{isPrivateSession ? 'PRIVATE ACTIVE' : 'PRIVATE OFF'}</span>
                </button>
                <button onClick={() => setShowDiagTerminal(!showDiagTerminal)} className={`flex-1 py-1.5 px-2 rounded border flex items-center justify-center gap-1 transition-all active:scale-95 ${showDiagTerminal ? 'bg-[#00f2ff]/10 border-[#00f2ff]/35 text-[#00f2ff]' : 'bg-white/5 border-outline-variant/20 text-on-surface-variant/70 hover:text-white'}`}>
                  <span className="material-symbols-outlined text-[10px]">monitoring</span>
                  <span className="font-label-caps text-[7px] tracking-wider">DIAGNOSTICS</span>
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
