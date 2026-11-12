import { create } from 'zustand'
import { SecureStorage } from '../utils/secureStorage'
import { getLS } from '../utils/storage'
import { syncAIConfig } from '../components/LauncherPlugin'

function syncToNative(backend, geminiKey, groqKey, model) {
  const key = backend === 'GROQ' ? groqKey : geminiKey
  syncAIConfig(backend, key, model, geminiKey, groqKey).catch(() => {})
}

export const useAIStore = create((set, get) => ({
  llmBackend: getLS('system_llm_backend', 'GEMINI'),
  geminiKey: '',
  groqKey: '',
  geminiModel: getLS('gemini_model', 'gemini-2.5-flash'),
  voiceEnabled: getLS('iris_voice_enabled', 'true') !== 'false',
  voicePitch: (() => { try { const v = parseFloat(getLS('iris_voice_pitch', '1.0')); return isNaN(v) ? 1.0 : v } catch { return 1.0 } })(),
  voiceRate: (() => { try { const v = parseFloat(getLS('iris_voice_rate', '0.96')); return isNaN(v) ? 0.96 : v } catch { return 0.96 } })(),
  voiceTimbre: getLS('iris_voice_timbre', 'natural_female'),
  voiceEngineProvider: getLS('iris_voice_engine_provider', 'CARTESIA'),
  cartesiaKey: '',
  _keysLoaded: false,

  loadKeys: async () => {
    await SecureStorage.migrateAll()
    const geminiKey = await SecureStorage.getItem('gemini_api_key') || ''
    const groqKey = await SecureStorage.getItem('groq_api_key') || ''
    const cartesiaKey = await SecureStorage.getItem('cartesia_api_key') || localStorage.getItem('cartesia_api_key') || ''
    set({ geminiKey, groqKey, cartesiaKey, _keysLoaded: true })
    syncToNative(get().llmBackend, geminiKey, groqKey, get().geminiModel)
  },

  setLlmBackend: (v) => {
    localStorage.setItem('system_llm_backend', v)
    set({ llmBackend: v })
    syncToNative(v, get().geminiKey, get().groqKey, get().geminiModel)
  },
  setGeminiKey: (v) => {
    const prev = get().geminiKey
    try {
      SecureStorage.setItem('gemini_api_key', v)
      set({ geminiKey: v })
      syncToNative(get().llmBackend, v, get().groqKey, get().geminiModel)
    } catch {
      set({ geminiKey: prev })
    }
  },
  setGroqKey: (v) => {
    const prev = get().groqKey
    try {
      SecureStorage.setItem('groq_api_key', v)
      set({ groqKey: v })
      syncToNative(get().llmBackend, get().geminiKey, v, get().geminiModel)
    } catch {
      set({ groqKey: prev })
    }
  },
  setCartesiaKey: (v) => {
    const trimmed = (v || '').trim()
    SecureStorage.setItem('cartesia_api_key', trimmed)
    localStorage.removeItem('cartesia_api_key')
    set({ cartesiaKey: trimmed })
  },
  setVoiceEngineProvider: (v) => { localStorage.setItem('iris_voice_engine_provider', v); set({ voiceEngineProvider: v }) },
  setGeminiModel: (v) => {
    localStorage.setItem('gemini_model', v)
    set({ geminiModel: v })
    syncToNative(get().llmBackend, get().geminiKey, get().groqKey, v)
  },
  setVoiceEnabled: (v) => { localStorage.setItem('iris_voice_enabled', v); set({ voiceEnabled: v }) },
  setVoicePitch: (v) => { localStorage.setItem('iris_voice_pitch', v); set({ voicePitch: v }) },
  setVoiceRate: (v) => { localStorage.setItem('iris_voice_rate', v); set({ voiceRate: v }) },
  setVoiceTimbre: (v) => { localStorage.setItem('iris_voice_timbre', v); set({ voiceTimbre: v }) },
}))
