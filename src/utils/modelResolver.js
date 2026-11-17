import { useAIStore } from '../stores/aiStore'

const GEMINI_CACHE_KEY = 'iris_cached_gemini_models'
const GROQ_CACHE_KEY = 'iris_cached_groq_models'

export const DEFAULT_GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
]

export const DEFAULT_GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'deepseek-r1-distill-llama-70b',
  'qwen-qwq-32b',
]

export function getCachedGeminiModels() {
  try {
    const raw = localStorage.getItem(GEMINI_CACHE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return DEFAULT_GEMINI_MODELS
}

export function getCachedGroqModels() {
  try {
    const raw = localStorage.getItem(GROQ_CACHE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return DEFAULT_GROQ_MODELS
}

export async function fetchLiveGeminiModels(apiKey) {
  if (!apiKey || !apiKey.trim()) return getCachedGeminiModels()
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      headers: { 'x-goog-api-key': apiKey.trim() },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return getCachedGeminiModels()
    const data = await res.json()
    if (!Array.isArray(data?.models)) return getCachedGeminiModels()

    const models = data.models
      .filter((m) => {
        const name = (m.name || '').toLowerCase()
        const methods = m.supportedGenerationMethods || []
        return (
          methods.includes('generateContent') &&
          name.includes('gemini') &&
          !name.includes('embedding') &&
          !name.includes('imagen') &&
          !name.includes('veo') &&
          !name.includes('tts') &&
          !name.includes('audio') &&
          !name.includes('vision') &&
          !name.includes('1.0')
        )
      })
      .map((m) => m.name.replace(/^models\//, ''))

    // Sort: prefer 2.5-flash, 2.5-pro, 2.0-flash first
    models.sort((a, b) => {
      const score = (id) => {
        if (id === 'gemini-2.5-flash') return 100
        if (id === 'gemini-2.5-pro') return 95
        if (id.startsWith('gemini-2.5')) return 90
        if (id === 'gemini-2.0-flash') return 85
        if (id.startsWith('gemini-2.')) return 80
        if (id.includes('flash')) return 70
        return 50
      }
      return score(b) - score(a)
    })

    if (models.length > 0) {
      try {
        localStorage.setItem(GEMINI_CACHE_KEY, JSON.stringify(models))
      } catch {}
      return models
    }
  } catch {}
  return getCachedGeminiModels()
}

export async function fetchLiveGroqModels(apiKey) {
  if (!apiKey || !apiKey.trim()) return getCachedGroqModels()
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${apiKey.trim()}` },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return getCachedGroqModels()
    const data = await res.json()
    if (!Array.isArray(data?.data)) return getCachedGroqModels()

    const models = data.data
      .map((m) => m.id)
      .filter((id) => {
        if (!id) return false
        const lower = id.toLowerCase()
        return (
          !lower.includes('whisper') &&
          !lower.includes('guard') &&
          !lower.includes('tts') &&
          !lower.includes('playai') &&
          !lower.includes('orpheus') &&
          !lower.includes('embed')
        )
      })

    models.sort((a, b) => {
      const score = (id) => {
        if (id === 'llama-3.3-70b-versatile') return 100
        if (id.includes('llama-4')) return 95
        if (id.includes('70b-versatile')) return 90
        if (id.includes('deepseek')) return 85
        if (id.includes('qwen')) return 80
        if (id.includes('instant')) return 75
        return 50
      }
      return score(b) - score(a)
    })

    if (models.length > 0) {
      try {
        localStorage.setItem(GROQ_CACHE_KEY, JSON.stringify(models))
      } catch {}
      return models
    }
  } catch {}
  return getCachedGroqModels()
}

export async function resolveWorkingGeminiModel(apiKey, failedModel = '') {
  const models = await fetchLiveGeminiModels(apiKey)
  const candidate = models.find((m) => m !== failedModel) || 'gemini-2.5-flash'
  try {
    useAIStore.getState().setGeminiModel(candidate)
  } catch {}
  return candidate
}

export async function resolveWorkingGroqModel(apiKey, failedModel = '') {
  const models = await fetchLiveGroqModels(apiKey)
  const candidate = models.find((m) => m !== failedModel) || 'llama-3.3-70b-versatile'
  try {
    useAIStore.getState().setGroqModel(candidate)
  } catch {}
  return candidate
}
