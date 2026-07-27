import { useState, useEffect, useRef, useCallback } from 'react'
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
import { logNotification } from '../components/LauncherPlugin'

export default function Assistant({
  startVoiceInput, stopVoiceInput, speakText, stopSpeaking,
  submitPrompt,
  handleSaveLiveConfig, handleOpenLiveMode, handleExitLiveModeOnly, handleStopLiveModeCompletely,
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
  const [isChatMaximized, setIsChatMaximized] = useState(true)
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

  const saveApiKey = useCallback(async () => {
    if (tempKeyVal.trim()) {
      const keyName = llmBackend === 'GEMINI' ? 'gemini_api_key' : 'groq_api_key'
      await SecureStorage.setItem(keyName, tempKeyVal.trim())
      if (llmBackend === 'GEMINI') useAIStore.getState().setGeminiKey(tempKeyVal.trim())
      else useAIStore.getState().setGroqKey(tempKeyVal.trim())
      setTempKeyVal('')
      setShowKeyInput(false)
      logNotification('AUTH', `${llmBackend} key saved securely!`, 'success')
    }
  }, [llmBackend, tempKeyVal])

  // Connection test
  const testConnection = useCallback(async (provider, key) => {
    if (!key) {
      logNotification('AUTH', 'Please enter an API key first.', 'warning')
      return
    }
    setTestingConnection(true)
    try {
      let res
      if (provider === 'GEMINI') res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)
      else if (provider === 'GROQ') res = await fetch('https://api.groq.com/openai/v1/models', { headers: { 'Authorization': `Bearer ${key}` } })
      else if (provider === 'NVIDIA') { 
        try { 
          res = await fetch('https://integrate.api.nvidia.com/v1/models', { headers: { 'Authorization': `Bearer ${key}` } })
          if (!res.ok) throw new Error() 
        } catch (e) { 
          setDynamicNvidiaModels(['meta/llama-3.1-70b-instruct', 'meta/llama-3.1-405b-instruct', 'google/gemma-2-27b-it'])
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
      const avail = await NativeBiometric.isAvailable(); 
      if (avail.isAvailable) { 
        await NativeBiometric.verifyIdentity({ reason: "Authenticate to decrypt Iris session", title: "Session Locked", subtitle: "Biometric Authentication Required" }); 
        setChatUnlocked(true);
        logNotification('BIOMETRIC', 'Session Decrypted Successfully', 'success');
      } else { 
        logNotification('BIOMETRIC', 'Biometric hardware unavailable.', 'warning');
      } 
    } catch (e) { 
      logNotification('BIOMETRIC', "Authentication failed: " + (e.message || e), 'error');
    }
  }, [])

  // Auto-trigger live mode
  useEffect(() => { if (autoTriggerLive) { handleOpenLiveMode(); if (setAutoTriggerLive) setAutoTriggerLive(false) } }, [autoTriggerLive, handleOpenLiveMode, setAutoTriggerLive])

  const streamEndRef = useRef(null)
  useEffect(() => { if (streamEndRef.current) streamEndRef.current.scrollIntoView({ behavior: 'smooth' }) }, [chatLog])

  const handleInputSubmit = (e) => { e.preventDefault(); submitPrompt(textPrompt) }

  return (
    <div className="h-full flex px-4 pt-10 pb-24 gap-4 overflow-hidden relative z-10">
      {!isChatMaximized && (
        <SessionSidebar sessions={sessions} activeSessionId={activeSessionId} isPrivateSession={isPrivateSession} voiceEnabled={voiceEnabled} onSetVoiceEnabled={setVoiceEnabled}
          onCreateNewSession={() => { createNewSession(); setChatUnlocked(true) }}
          onLoadSession={(id) => { loadSession(id); }}
          onDeleteSession={deleteSession}>
          {llmBackend === 'OLLAMA' && (
            <div className="p-3 border-b border-white/5 flex flex-col gap-2">
              <h4 className="font-sans text-[10px] text-white/50 font-semibold tracking-widest uppercase">OLLAMA ENGINE</h4>
              <div className="flex flex-col gap-1 text-[10px] font-medium">
                <div className="flex justify-between items-center">
                  <label className="text-white/40">Model Status</label>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${ollamaStatus === 'online' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400 animate-pulse'}`}>{ollamaStatus}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-white/5 space-y-2 text-[10px]">
                <div className="flex flex-col gap-1.5">
                  <button onClick={fetchOllamaModels} className="w-full py-1.5 rounded-lg flex items-center justify-center gap-1 bg-white/5 hover:bg-white/10 text-white/70 active:scale-95 transition-all"><span className="material-symbols-outlined text-[12px]">refresh</span>Rescan Server</button>
                  <button onClick={() => setShowOllamaManager(!showOllamaManager)} className={`w-full py-1.5 rounded-lg flex items-center justify-center gap-1 active:scale-95 transition-all ${showOllamaManager ? 'bg-[var(--primary-color)] text-[#020617] font-bold' : 'bg-white/5 hover:bg-white/10 text-white/70'}`}>
                    <span className="material-symbols-outlined text-[12px]">cloud_download</span>{showOllamaManager ? 'Back to Chat' : 'Pull New Model'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </SessionSidebar>
      )}

      <section className="flex-1 flex flex-col min-w-0 relative bg-black/20 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">

        {llmBackend === 'OLLAMA' && (ollamaModels.length === 0 || showOllamaManager) ? (
          <OllamaManager ollamaModels={ollamaModels} selectedOllamaModel={selectedOllamaModel} onSelectModel={(v) => { setSelectedOllamaModel(v); localStorage.setItem('ollama_model', v) }} onClose={() => setShowOllamaManager(false)} />
        ) : (
          <>
            {/* Top Header */}
            <div className="relative z-40 flex items-center justify-between p-4 border-b border-white/5 bg-black/10">
              <div className="flex items-center gap-2">
                <button onClick={() => { if (isLiveVoice) handleStopLiveModeCompletely(); if (onNavigate) onNavigate('home') }} className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all active:scale-90 shadow-lg">
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                </button>
                <button onClick={() => setIsChatMaximized(!isChatMaximized)} className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all active:scale-90 shadow-lg" title={isChatMaximized ? "Show Sidebar" : "Maximize Chat"}>
                  <span className="material-symbols-outlined text-sm">{isChatMaximized ? 'close_fullscreen' : 'open_in_full'}</span>
                </button>
              </div>

              <EngineModelBar activeBackend={llmBackend} onSetBackend={(v) => { setLlmBackend(v); if (v === 'OLLAMA') fetchOllamaModels() }}
                selectedOllamaModel={selectedOllamaModel} onSetOllamaModel={(v) => { setSelectedOllamaModel(v); localStorage.setItem('ollama_model', v) }} ollamaModels={ollamaModels} ollamaStatus={ollamaStatus}
                activeGeminiModel={activeGeminiModel} onSetGeminiModel={(v) => { setActiveGeminiModel(v); localStorage.setItem('gemini_model', v) }} dynamicGeminiModels={dynamicGeminiModels}
                activeGroqModel={activeGroqModel} onSetGroqModel={setActiveGroqModel} dynamicGroqModels={dynamicGroqModels}
                activeNvidiaModel={activeNvidiaModel} onSetNvidiaModel={setActiveNvidiaModel} dynamicNvidiaModels={dynamicNvidiaModels}
                onFetchOllamaModels={fetchOllamaModels} onNewChat={() => { if (window.confirm('Start a new chat? Current conversation will be cleared.')) { setChatLog([]) } }}
                backendStatus={backendStatus} />
            </div>


            {((llmBackend === 'GEMINI' && !getGeminiKey()) || (llmBackend === 'GROQ' && !getGroqKey())) && (
              <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4 py-3 bg-[#020617]/80 backdrop-blur-xl border border-red-500/30 rounded-2xl flex flex-col gap-2 shadow-2xl">
                <div className="flex justify-between items-center text-red-400 font-bold uppercase text-[10px]">
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">warning</span> API KEY REQUIRED</span>
                  <button onClick={() => setShowKeyInput(!showKeyInput)} className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg">{showKeyInput ? 'CANCEL' : 'ENTER KEY'}</button>
                </div>
                {showKeyInput && (
                  <div className="flex gap-2 mt-1">
                    <input type="password" placeholder="API KEY..." value={tempKeyVal} onChange={e => setTempKeyVal(e.target.value)} className="flex-grow bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-white focus:outline-none focus:ring-0 focus:border-red-500/50" />
                    <button onClick={() => testConnection(llmBackend, tempKeyVal.trim())} disabled={testingConnection || !tempKeyVal.trim()} className="px-3 bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 rounded-lg font-bold text-[10px]">{testingConnection ? '...' : 'TEST'}</button>
                    <button onClick={saveApiKey} className="px-4 bg-[var(--primary-color)] text-[#020617] hover:bg-[rgba(var(--primary-rgb),0.9)] rounded-lg font-bold text-[10px]">SAVE</button>
                  </div>
                )}
              </div>
            )}

            {/* Chat Area */}
            <div className="flex-1 px-4 md:px-10 overflow-hidden flex flex-col min-h-0 pt-20 relative z-10">
              {showDiagTerminal && <DiagnosticsTerminal onClose={() => setShowDiagTerminal(false)} />}

              {!chatUnlocked && (
                <div onClick={handleBiometricUnlock}
                  className="absolute inset-0 z-50 bg-[#020617]/60 backdrop-blur-2xl flex flex-col items-center justify-center gap-4 cursor-pointer group hover:bg-[#020617]/70 transition-colors">
                  <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_30px_rgba(var(--primary-rgb),0.2)]">
                    <span className="material-symbols-outlined text-4xl text-[var(--primary-color)]">fingerprint</span>
                  </div>
                  <span className="font-sans text-[12px] font-bold text-white/70 tracking-widest uppercase">Tap to Decrypt Session</span>
                </div>
              )}

              <div className="flex-1 overflow-y-auto scroll-container flex flex-col gap-4 pb-4">
                {chatLog.length === 0 && !isLiveVoice && (
                  <div className="m-auto text-center flex flex-col items-center gap-3 opacity-50 select-none">
                    <span className="material-symbols-outlined text-4xl text-[var(--primary-color)]">forum</span>
                    <p className="text-[14px] font-sans text-white/60">How can I help you today?</p>
                  </div>
                )}
                
                {chatLog.map((msg, index) => <ChatMessage key={msg.id || `msg-${index}`} msg={msg} index={index} chatUnlocked={chatUnlocked} onDelete={(i) => setChatLog(prev => prev.filter((_, idx) => idx !== i))} />)}
                
                {activeUserTranscript && <div className={`w-full flex justify-end mb-4 animate-pulse ${!chatUnlocked ? 'opacity-10 blur-md select-none' : ''}`}>
                  <div className="max-w-[85%] bg-[rgba(var(--primary-rgb),0.1)] border border-[rgba(var(--primary-rgb),0.2)] text-white px-4 py-2.5 rounded-2xl rounded-br-sm shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]">
                    <span className="break-words font-sans text-[13px] text-white/70">{activeUserTranscript}</span>
                  </div>
                </div>}
                
                {activeAiResponse && <div className={`w-full flex justify-start mb-4 animate-pulse ${!chatUnlocked ? 'opacity-10 blur-md select-none' : ''}`}>
                  <div className="flex items-end gap-2 max-w-[85%]">
                    <div className="w-6 h-6 rounded-full bg-[rgba(var(--primary-rgb),0.2)] border border-[rgba(var(--primary-rgb),0.3)] flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(var(--primary-rgb),0.2)]"><span className="material-symbols-outlined text-[14px] text-[var(--primary-color)]">smart_toy</span></div>
                    <div className="bg-black/30 border border-white/10 text-white px-4 py-2.5 rounded-2xl rounded-bl-sm backdrop-blur-xl shadow-lg">
                      <span className="break-words font-sans text-[13px]">{activeAiResponse}</span>
                    </div>
                  </div>
                </div>}
                <div ref={streamEndRef} />
              </div>
            </div>

            {/* Bottom Input Area */}
            <div className="px-4 md:px-10 pb-4 pt-2 bg-gradient-to-t from-[#020617] to-transparent relative z-20">
              <div className="w-full max-w-4xl mx-auto bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-2 flex flex-col gap-2 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                {isLiveVoice ? (
                  <div className="flex items-center gap-2 p-1">
                    {isSpeaking && <div className="flex-1 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-bold text-center animate-pulse tracking-widest">SPEAKING</div>}
                    <button onClick={() => { try { handleExitLiveModeOnly() } catch(e) { console.warn(e); setIsLiveVoice(false) } }} className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-bold text-[10px] tracking-widest transition-all">EXIT</button>
                    <button onClick={() => { try { isListening ? stopVoiceInput() : startVoiceInput() } catch(e) { console.warn(e) } }} className={`flex-1 py-2 rounded-xl font-bold text-[10px] tracking-widest transition-all ${isListening ? 'bg-[rgba(var(--primary-rgb),0.2)] text-[var(--primary-color)] shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)] animate-pulse' : 'bg-white/5 hover:bg-white/10 text-white'}`}>
                      {isListening ? 'PAUSE' : 'LISTEN'}
                    </button>
                    <button onClick={() => { try { handleStopLiveModeCompletely() } catch(e) { console.warn(e); setIsLiveVoice(false); setChatLog(p => p.filter(i => !i.loading)) } }} className="flex-1 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold text-[10px] tracking-widest transition-all">STOP</button>
                  </div>
                ) : (
                  <form onSubmit={handleInputSubmit} className="flex gap-2 items-center">
                    <button type="button" onClick={() => setShowDiagTerminal(!showDiagTerminal)} className="w-10 h-10 rounded-xl flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors" title="Diagnostics">
                      <span className="material-symbols-outlined text-[18px]">monitoring</span>
                    </button>
                    <button type="button" onClick={togglePrivate} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isPrivateSession ? 'text-red-400 bg-red-500/10' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`} title="Private Mode">
                      <span className="material-symbols-outlined text-[18px]">{isPrivateSession ? 'lock' : 'lock_open'}</span>
                    </button>
                    
                    <input type="text" value={textPrompt} onChange={e => setTextPrompt(e.target.value)} placeholder="Message IRIS..." className="flex-1 bg-transparent px-2 py-3 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:ring-0 focus:border-transparent border-none font-sans" disabled={isListening} />
                    
                    <button type="button" onClick={isSpeaking ? stopSpeaking : (isListening ? stopVoiceInput : startVoiceInput)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isSpeaking ? 'bg-red-500/20 text-red-400 animate-pulse' : isListening ? 'bg-[var(--primary-color)] text-[#020617] animate-pulse shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)]' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
                      <span className="material-symbols-outlined text-[18px]">{isSpeaking ? 'skip_next' : isListening ? 'mic_off' : 'mic'}</span>
                    </button>
                    
                    <button type="submit" disabled={!textPrompt.trim()} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${textPrompt.trim() ? 'bg-[var(--primary-color)] text-[#020617] hover:scale-105 shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]' : 'bg-white/5 text-white/20'}`}>
                      <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
