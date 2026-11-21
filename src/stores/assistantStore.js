import { create } from 'zustand'

const DEFAULT_LOG = [
  { time: "14:02:12", sender: "IRIS", text: "Secure neuro-link established. How can I assist your objectives today, Commander?", type: "system" }
]

const loadSessions = () => {
  try {
    const cached = localStorage.getItem('iris_assistant_sessions')
    const parsed = cached ? JSON.parse(cached) : null
    if (Array.isArray(parsed) && parsed.length > 0) return parsed.length > 10 ? parsed.slice(-10) : parsed
  } catch {}
  return [{ id: 'default', name: 'Default Session Node', log: DEFAULT_LOG }]
}

const loadChatLog = (sessions) => {
  try {
    const activeId = localStorage.getItem('iris_assistant_active_session') || 'default'
    const found = sessions.find(s => s.id === activeId)
    if (found && Array.isArray(found.log)) return found.log.length > 50 ? found.log.slice(-50) : found.log
  } catch {}
  return DEFAULT_LOG
}

const initSessions = loadSessions()

export const useAssistantStore = create((set, get) => ({
  chatLog: loadChatLog(initSessions),
  textPrompt: '',
  isListening: false,
  isSpeaking: false,
  isGenerating: false,
  isLiveVoice: false,
  isPrivateSession: false,
  isLiveScreenOpen: false,
  activeUserTranscript: '',
  activeAiResponse: '',
  showLiveConfigModal: false,
  liveSetupEngine: (() => { try { return localStorage.getItem('system_llm_backend') || 'GEMINI' } catch { return 'GEMINI' } })(),
  liveSetupKey: '',
  assistantPersona: (() => { try { return localStorage.getItem('iris_assistant_persona') || 'COMMANDER' } catch { return 'COMMANDER' } })(),
  attachedImage: null,
  sessions: initSessions,
  activeSessionId: (() => { try { return localStorage.getItem('iris_assistant_active_session') || 'default' } catch { return 'default' } })(),
  _savedChatLog: null,

  setChatLog: (updater) => set((s) => ({
    chatLog: typeof updater === 'function' ? updater(s.chatLog) : updater
  })),
  setTextPrompt: (v) => set({ textPrompt: v }),
  setIsListening: (v) => set({ isListening: v }),
  setIsSpeaking: (v) => set({ isSpeaking: v }),
  setIsGenerating: (v) => set({ isGenerating: v }),
  setIsLiveVoice: (v) => set({ isLiveVoice: v }),
  setIsPrivateSession: (v) => set({ isPrivateSession: v }),
  setIsLiveScreenOpen: (v) => set({ isLiveScreenOpen: v }),
  setActiveUserTranscript: (v) => set({ activeUserTranscript: v }),
  setActiveAiResponse: (v) => set({ activeAiResponse: v }),
  setShowLiveConfigModal: (v) => set({ showLiveConfigModal: v }),
  setLiveSetupEngine: (v) => { set({ liveSetupEngine: v }) },
  setLiveSetupKey: (v) => set({ liveSetupKey: v }),
  setAssistantPersona: (v) => {
    try { localStorage.setItem('iris_assistant_persona', v) } catch {}
    set({ assistantPersona: v })
  },
  setAttachedImage: (v) => set({ attachedImage: v }),

  setSessions: (updater) => set((s) => ({
    sessions: typeof updater === 'function' ? updater(s.sessions) : updater
  })),
  setActiveSessionId: (v) => {
    try { localStorage.setItem('iris_assistant_active_session', v) } catch {}
    set({ activeSessionId: v })
  },

  autoTitleSession: (firstPromptText) => {
    const { sessions, activeSessionId, isPrivateSession } = get()
    if (isPrivateSession || !firstPromptText) return
    const cleaned = firstPromptText.replace(/\s+/g, ' ').trim()
    if (!cleaned) return
    const title = cleaned.length > 28 ? cleaned.slice(0, 28) + '…' : cleaned
    const updated = sessions.map(s => {
      if (s.id === activeSessionId && (s.name === 'Default Session Node' || s.name.startsWith('Session Node #') || s.name === 'New Chat')) {
        return { ...s, name: title }
      }
      return s
    })
    try { localStorage.setItem('iris_assistant_sessions', JSON.stringify(updated)) } catch {}
    set({ sessions: updated })
  },

  persistSessions: () => {
    const { sessions, activeSessionId, chatLog, isPrivateSession } = get()
    if (isPrivateSession) return
    let updated = sessions.map(s => s.id === activeSessionId ? { ...s, log: chatLog } : s)
    updated = updated.map(s => ({ ...s, log: s.log.length > 50 ? s.log.slice(-50) : s.log }))
    if (updated.length > 10) updated = updated.slice(-10)
    try { localStorage.setItem('iris_assistant_sessions', JSON.stringify(updated)) } catch {}
    set({ sessions: updated })
  },

  createNewSession: () => {
    const { isPrivateSession } = get()
    if (isPrivateSession) return
    const newId = `session_${Date.now()}`
    const newSession = {
      id: newId,
      name: 'New Chat',
      log: [{ time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), sender: "IRIS", text: "New session neuro-link ready. Awaiting prompt details.", type: "system" }]
    }
    set((s) => {
      const trimmed = [...s.sessions, newSession]
      const sessions = trimmed.length > 10 ? trimmed.slice(-10) : trimmed
      try {
        localStorage.setItem('iris_assistant_sessions', JSON.stringify(sessions))
        localStorage.setItem('iris_assistant_active_session', newId)
      } catch {}
      return { sessions, activeSessionId: newId, chatLog: newSession.log }
    })
  },

  loadSession: (id) => {
    const { isPrivateSession, sessions } = get()
    if (isPrivateSession) return
    const found = sessions.find(s => s.id === id)
    if (found) {
      try { localStorage.setItem('iris_assistant_active_session', id) } catch {}
      set({ activeSessionId: id, chatLog: found.log })
    }
  },

  deleteSession: (id) => {
    const { sessions, activeSessionId } = get()
    if (sessions.length <= 1) return
    const updated = sessions.filter(s => s.id !== id)
    try { localStorage.setItem('iris_assistant_sessions', JSON.stringify(updated)) } catch {}
    if (activeSessionId === id) {
      try { localStorage.setItem('iris_assistant_active_session', updated[0].id) } catch {}
      set({ sessions: updated, activeSessionId: updated[0].id, chatLog: updated[0].log })
    } else {
      set({ sessions: updated })
    }
  },

  togglePrivate: () => {
    const { isPrivateSession, sessions, activeSessionId, chatLog, _savedChatLog } = get()
    if (!isPrivateSession) {
      set({
        isPrivateSession: true,
        _savedChatLog: chatLog,
        chatLog: [{ time: "SECURE", sender: "IRIS", text: "HIGH-SECURITY PRIVATE NEURO-LINK ENGAGED. NO HISTORICAL NODES WILL BE PERSISTED.", type: "error" }]
      })
    } else {
      const found = sessions.find(s => s.id === activeSessionId)
      set({
        isPrivateSession: false,
        _savedChatLog: null,
        chatLog: _savedChatLog || (found ? found.log : [{ time: "14:02:12", sender: "IRIS", text: "Neuro-link restored to default log.", type: "system" }])
      })
    }
  },
}))
