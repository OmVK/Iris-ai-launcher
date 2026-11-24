import { create } from 'zustand'
import { SecureStorage } from '../utils/secureStorage'
import { getLS } from '../utils/storage'
import { syncAIConfig, getAIConfig } from '../components/LauncherPlugin'
import { fetchLiveGeminiModels, fetchLiveGroqModels } from '../utils/modelResolver'

const DEPRECATED_GEMINI_MODELS = new Set(['gemini-1.0-pro', 'gemini-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'])

function getInitialGeminiModel() {
  const saved = getLS('gemini_model', 'gemini-2.5-flash')
  if (!saved || DEPRECATED_GEMINI_MODELS.has(saved)) {
    try { localStorage.setItem('gemini_model', 'gemini-2.5-flash') } catch {}
    return 'gemini-2.5-flash'
  }
  return saved
}

function syncToNative(backend, geminiKey, groqKey, model, groqModel) {
  const key = backend === 'GROQ' ? groqKey : geminiKey
  syncAIConfig(backend, key, model, geminiKey, groqKey, groqModel).catch(() => {})
}

export const useAIStore = create((set, get) => ({
  llmBackend: getLS('system_llm_backend', 'GEMINI'),
  geminiKey: '',
  groqKey: '',
  geminiModel: getInitialGeminiModel(),
  groqModel: getLS('groq_model', 'llama-3.3-70b-versatile'),
  voiceEnabled: getLS('iris_voice_enabled', 'true') !== 'false',
  voicePitch: (() => { try { const v = parseFloat(getLS('iris_voice_pitch', '1.0')); return isNaN(v) ? 1.0 : v } catch { return 1.0 } })(),
  voiceRate: (() => { try { const v = parseFloat(getLS('iris_voice_rate', '0.96')); return isNaN(v) ? 0.96 : v } catch { return 0.96 } })(),
  voiceTimbre: getLS('iris_voice_timbre', 'natural_female'),
  voiceEngineProvider: getLS('iris_voice_engine_provider', 'NATIVE'),
  assistantActivationMode: getLS('iris_assistant_activation_mode', 'SYSTEM_ASSIST'),
  wakeWordEnabled: getLS('iris_assistant_activation_mode', 'SYSTEM_ASSIST') === 'HEY_IRIS',
  shakeWakeEnabled: getLS('iris_assistant_activation_mode', 'SYSTEM_ASSIST') === 'WRIST_SHAKE',
  shakeSensitivity: getLS('iris_shake_sensitivity', 'NORMAL'),
  callAutoWakeEnabled: getLS('iris_call_auto_wake', 'true') !== 'false',
  assistantWakeTarget: getLS('iris_assistant_wake_target', 'HOME_OVERLAY'),
  cartesiaKey: '',
  _keysLoaded: false,

  loadKeys: async () => {
    try {
      await SecureStorage.migrateAll()
    } catch {}
    let geminiKey = ''
    let groqKey = ''
    let cartesiaKey = ''
    try {
      geminiKey = await SecureStorage.getItem('gemini_api_key') || localStorage.getItem('gemini_api_key') || ''
      groqKey = await SecureStorage.getItem('groq_api_key') || localStorage.getItem('groq_api_key') || ''
      cartesiaKey = await SecureStorage.getItem('cartesia_api_key') || localStorage.getItem('cartesia_api_key') || ''
    } catch {}

    if (!geminiKey || !groqKey) {
      try {
        const nativeCfg = await getAIConfig()
        if (!geminiKey && nativeCfg?.geminiKey) {
          geminiKey = nativeCfg.geminiKey
          SecureStorage.setItem('gemini_api_key', geminiKey).catch(() => {})
        }
        if (!groqKey && nativeCfg?.groqKey) {
          groqKey = nativeCfg.groqKey
          SecureStorage.setItem('groq_api_key', groqKey).catch(() => {})
        }
      } catch {}
    }

    set({ geminiKey, groqKey, cartesiaKey, _keysLoaded: true })
    syncToNative(get().llmBackend, geminiKey, groqKey, get().geminiModel, get().groqModel)

    // Automatically sync live models & purge discontinued models in the background
    if (geminiKey) {
      fetchLiveGeminiModels(geminiKey).then((list) => {
        if (Array.isArray(list) && list.length > 0 && !list.includes(get().geminiModel)) {
          get().setGeminiModel(list[0])
        }
      }).catch(() => {})
    }
    if (groqKey) {
      fetchLiveGroqModels(groqKey).then((list) => {
        if (Array.isArray(list) && list.length > 0 && !list.includes(get().groqModel)) {
          get().setGroqModel(list[0])
        }
      }).catch(() => {})
    }
  },

  setLlmBackend: (v) => {
    localStorage.setItem('system_llm_backend', v)
    set({ llmBackend: v })
    syncToNative(v, get().geminiKey, get().groqKey, get().geminiModel, get().groqModel)
  },
  setGeminiKey: (v) => {
    const prev = get().geminiKey
    try {
      SecureStorage.setItem('gemini_api_key', v)
      set({ geminiKey: v })
      syncToNative(get().llmBackend, v, get().groqKey, get().geminiModel, get().groqModel)
      if (v && v.trim()) {
        fetchLiveGeminiModels(v).then((list) => {
          if (Array.isArray(list) && list.length > 0 && !list.includes(get().geminiModel)) {
            get().setGeminiModel(list[0])
          }
        }).catch(() => {})
      }
    } catch {
      set({ geminiKey: prev })
    }
  },
  setGroqKey: (v) => {
    const prev = get().groqKey
    try {
      SecureStorage.setItem('groq_api_key', v)
      set({ groqKey: v })
      syncToNative(get().llmBackend, get().geminiKey, v, get().geminiModel, get().groqModel)
      if (v && v.trim()) {
        fetchLiveGroqModels(v).then((list) => {
          if (Array.isArray(list) && list.length > 0 && !list.includes(get().groqModel)) {
            get().setGroqModel(list[0])
          }
        }).catch(() => {})
      }
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
    syncToNative(get().llmBackend, get().geminiKey, get().groqKey, v, get().groqModel)
  },
  setGroqModel: (v) => {
    localStorage.setItem('groq_model', v)
    set({ groqModel: v })
    syncToNative(get().llmBackend, get().geminiKey, get().groqKey, get().geminiModel, v)
  },
  setVoiceEnabled: (v) => { localStorage.setItem('iris_voice_enabled', v); set({ voiceEnabled: v }) },
  setVoicePitch: (v) => { localStorage.setItem('iris_voice_pitch', v); set({ voicePitch: v }) },
  setVoiceRate: (v) => { localStorage.setItem('iris_voice_rate', v); set({ voiceRate: v }) },
  setVoiceTimbre: (v) => { localStorage.setItem('iris_voice_timbre', v); set({ voiceTimbre: v }) },
  setAssistantActivationMode: (mode) => {
    const isHeyIris = mode === 'HEY_IRIS'
    const isShake = mode === 'WRIST_SHAKE'
    localStorage.setItem('iris_assistant_activation_mode', mode)
    localStorage.setItem('iris_wake_word_enabled', String(isHeyIris))
    localStorage.setItem('iris_shake_wake_enabled', String(isShake))
    set({
      assistantActivationMode: mode,
      wakeWordEnabled: isHeyIris,
      shakeWakeEnabled: isShake,
    })
  },
  setWakeWordEnabled: (v) => {
    const mode = v ? 'HEY_IRIS' : 'SYSTEM_ASSIST'
    get().setAssistantActivationMode(mode)
  },
  setShakeWakeEnabled: (v) => {
    const mode = v ? 'WRIST_SHAKE' : 'SYSTEM_ASSIST'
    get().setAssistantActivationMode(mode)
  },
  setShakeSensitivity: (v) => { localStorage.setItem('iris_shake_sensitivity', v); set({ shakeSensitivity: v }) },
  setCallAutoWakeEnabled: (v) => { localStorage.setItem('iris_call_auto_wake', String(!!v)); set({ callAutoWakeEnabled: !!v }) },
  setAssistantWakeTarget: (v) => { localStorage.setItem('iris_assistant_wake_target', v); set({ assistantWakeTarget: v }) },
}))
