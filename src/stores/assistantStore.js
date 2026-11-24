import { create } from 'zustand'

const DEFAULT_LOG = [
  { time: "READY", sender: "IRIS", text: "Hi! How can I help you today?", type: "system" }
]

const normalizePersona = (raw) => {
  if (!raw || raw === 'COMMANDER') return 'CHAT'
  return raw
}

const loadSessions = () => {
  try {
    const cached = localStorage.getItem('iris_assistant_sessions')
    const parsed = cached ? JSON.parse(cached) : null
    if (Array.isArray(parsed) && parsed.length > 0) return parsed.length > 10 ? parsed.slice(-10) : parsed
  } catch {}
  return [{ id: 'default', name: 'New Chat', log: DEFAULT_LOG }]
}

const loadChatLog = (sessions) => {
  try {
    const activeId = localStorage.getItem('iris_assistant_active_session') || 'default'
    const found = sessions.find(s => s.id === activeId)
    if (found && Array.isArray(found.log) && found.log.length > 0) {
      // Upgrade old military default greeting if it was untouched
      if (found.log.length === 1 && found.log[0]?.text?.includes('Secure neuro-link established')) {
        return DEFAULT_LOG
      }
      return found.log.length > 50 ? found.log.slice(-50) : found.log
    }
  } catch {}
  return DEFAULT_LOG
}

const stripHeavyImagesForStorage = (logArray) => {
  if (!Array.isArray(logArray)) return []
  return logArray.slice(-50).map(m => {
    if (m && m.imagePreview && m.imagePreview.length > 90000) {
      return { ...m, imagePreview: null, hadImageAttachment: true }
    }
    return m
  })
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
  webSearchEnabled: false,
  isLiveScreenOpen: false,
  showVoiceOverlay: false,
  activeUserTranscript: '',
  activeAiResponse: '',
  showLiveConfigModal: false,
  liveSetupEngine: (() => { try { return localStorage.getItem('system_llm_backend') || 'GEMINI' } catch { return 'GEMINI' } })(),
  liveSetupKey: '',
  assistantPersona: (() => { try { return normalizePersona(localStorage.getItem('iris_assistant_persona')) } catch { return 'CHAT' } })(),
  attachedImage: null,
  attachedFile: null,
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
  setWebSearchEnabled: (v) => set({ webSearchEnabled: v }),
  setIsLiveScreenOpen: (v) => set({ isLiveScreenOpen: v }),
  setShowVoiceOverlay: (v) => set({ showVoiceOverlay: v }),
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
  setAttachedFile: (v) => set({ attachedFile: v }),

  setSessions: (updater) => set((s) => ({
    sessions: typeof updater === 'function' ? updater(s.sessions) : updater
  })),
  setActiveSessionId: (v) => {
    try { localStorage.setItem('iris_assistant_active_session', v) } catch {}
    set({ activeSessionId: v })
  },

  hydrateEncryptedSessions: () => {
    const loaded = loadSessions()
    const log = loadChatLog(loaded)
    set({ sessions: loaded, chatLog: log })
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
    const safeLog = stripHeavyImagesForStorage(chatLog)
    let updated = sessions.map(s => s.id === activeSessionId ? { ...s, log: safeLog } : s)
    updated = updated.map(s => ({ ...s, log: stripHeavyImagesForStorage(s.log) }))
    if (updated.length > 10) updated = updated.slice(-10)
    try { localStorage.setItem('iris_assistant_sessions', JSON.stringify(updated)) } catch {}
    set({ sessions: updated })
  },

  createNewSession: () => {
    const { isPrivateSession } = get()
    if (isPrivateSession) {
      set({
        chatLog: [{ time: "INCOGNITO", sender: "IRIS", text: "🕵️ Incognito session cleared. Your chats and web searches are never saved.", type: "system" }],
        attachedImage: null,
        attachedFile: null
      })
      return
    }
    const newId = `session_${Date.now()}`
    const newSession = {
      id: newId,
      name: 'New Chat',
      log: [{ time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), sender: "IRIS", text: "Hi! How can I help you today?", type: "system" }]
    }
    set((s) => {
      const trimmed = [...s.sessions, newSession]
      const sessions = trimmed.length > 10 ? trimmed.slice(-10) : trimmed
      try {
        localStorage.setItem('iris_assistant_sessions', JSON.stringify(sessions))
        localStorage.setItem('iris_assistant_active_session', newId)
      } catch {}
      return { sessions, activeSessionId: newId, chatLog: newSession.log, attachedImage: null, attachedFile: null }
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

  burnIncognitoChat: () => {
    set({
      chatLog: [{ time: "INCOGNITO", sender: "IRIS", text: "🕵️ Incognito memory wiped. Nothing was saved to history or storage.", type: "system" }],
      textPrompt: '',
      attachedImage: null,
      attachedFile: null,
      activeUserTranscript: '',
      activeAiResponse: ''
    })
  },

  togglePrivate: (enableWebSearch = false) => {
    const { isPrivateSession, sessions, activeSessionId, chatLog, _savedChatLog } = get()
    if (!isPrivateSession) {
      set({
        isPrivateSession: true,
        webSearchEnabled: enableWebSearch ? true : get().webSearchEnabled,
        _savedChatLog: chatLog,
        attachedImage: null,
        attachedFile: null,
        chatLog: [{ time: "INCOGNITO", sender: "IRIS", text: "🕵️ **Incognito Mode Active** — Your messages, images, and web searches in this session are completely private and will vanish as soon as you exit.", type: "system" }]
      })
    } else {
      const found = sessions.find(s => s.id === activeSessionId)
      set({
        isPrivateSession: false,
        _savedChatLog: null,
        attachedImage: null,
        attachedFile: null,
        chatLog: _savedChatLog || (found ? found.log : DEFAULT_LOG)
      })
    }
  },
}))

if (typeof window !== 'undefined') {
  window.addEventListener('IRIS_SECURE_VAULT_HYDRATED', () => {
    try {
      useAssistantStore.getState().hydrateEncryptedSessions()
    } catch {}
  })
}
