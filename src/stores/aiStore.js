import { create } from 'zustand'
import { SecureStorage } from '../utils/secureStorage'
import { getLS } from '../utils/storage'

export const useAIStore = create((set, get) => ({
  llmBackend: getLS('system_llm_backend', 'GEMINI'),
  geminiKey: '',
  groqKey: '',
  geminiModel: getLS('gemini_model', 'gemini-2.5-flash'),
  voiceEnabled: getLS('iris_voice_enabled', 'true') !== 'false',
  voicePitch: parseFloat(getLS('iris_voice_pitch', '1.0')),
  voiceRate: parseFloat(getLS('iris_voice_rate', '0.96')),
  _keysLoaded: false,

  loadKeys: async () => {
    await SecureStorage.migrateAll()
    const geminiKey = await SecureStorage.getItem('gemini_api_key') || ''
    const groqKey = await SecureStorage.getItem('groq_api_key') || ''
    set({ geminiKey, groqKey, _keysLoaded: true })
  },

  setLlmBackend: (v) => { localStorage.setItem('system_llm_backend', v); set({ llmBackend: v }) },
  setGeminiKey: (v) => { SecureStorage.setItem('gemini_api_key', v); set({ geminiKey: v }) },
  setGroqKey: (v) => { SecureStorage.setItem('groq_api_key', v); set({ groqKey: v }) },
  setGeminiModel: (v) => { localStorage.setItem('gemini_model', v); set({ geminiModel: v }) },
  setVoiceEnabled: (v) => { localStorage.setItem('iris_voice_enabled', v); set({ voiceEnabled: v }) },
  setVoicePitch: (v) => { localStorage.setItem('iris_voice_pitch', v); set({ voicePitch: v }) },
  setVoiceRate: (v) => { localStorage.setItem('iris_voice_rate', v); set({ voiceRate: v }) },
}))
