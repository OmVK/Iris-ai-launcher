import { useAIStore } from '../stores/aiStore'

const GEMINI_CACHE_KEY = 'iris_cached_gemini_models'
const GROQ_CACHE_KEY = 'iris_cached_groq_models'
const DEAD_GEMINI_KEY = 'iris_dead_gemini_models_v1'

export const DEFAULT_GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-2.5-pro',
]

export const DEFAULT_GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'deepseek-r1-distill-llama-70b',
  'qwen-qwq-32b',
]

function getDeadGeminiModelsSet() {
  try {
    const raw = localStorage.getItem(DEAD_GEMINI_KEY)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return new Set(arr.map((x) => String(x).toLowerCase()))
    }
  } catch {}
  return new Set()
}

export function isModelDiscontinuedError(status, errMsg = '') {
  if (status === 404) return true
  const msg = String(errMsg || '').toLowerCase()
  return (
    msg.includes('discontinued') ||
    msg.includes('deprecated') ||
    msg.includes('no longer available') ||
    msg.includes('decommissioned') ||
    msg.includes('retired') ||
    msg.includes('not found for api version') ||
    msg.includes('is not found') ||
    msg.includes('shut down')
  )
}

export function markGeminiModelDiscontinued(modelId) {
  if (!modelId || typeof modelId !== 'string') return
  const id = modelId.trim().toLowerCase().replace(/^models\//, '')
  if (!id || id === 'gemini-flash-latest' || id === 'gemini-flash-lite-latest') return
  try {
    const dead = getDeadGeminiModelsSet()
    dead.add(id)
    localStorage.setItem(DEAD_GEMINI_KEY, JSON.stringify([...dead]))
    const rawCache = localStorage.getItem(GEMINI_CACHE_KEY)
    if (rawCache) {
      const parsed = JSON.parse(rawCache)
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter((m) => String(m).toLowerCase() !== id)
        localStorage.setItem(GEMINI_CACHE_KEY, JSON.stringify(cleaned))
      }
    }
  } catch {}
}

export function scoreGeminiModel(id) {
  const lower = (id || '').toLowerCase().replace(/^models\//, '')
  if (!lower) return 0
  if (lower === 'gemini-flash-latest') return 145
  if (lower === 'gemini-flash-lite-latest') return 143

  const verMatch = lower.match(/^gemini-(\d+(?:\.\d+)?)-(flash-lite|flash|pro)(.*)$/)
  if (verMatch) {
    const ver = parseFloat(verMatch[1]) || 2.5
    const tier = verMatch[2]
    const suffix = verMatch[3] || ''
    const isPreviewOrExp = suffix.includes('preview') || suffix.includes('exp')
    const base = 100 + ver * 20
    const tierBonus = tier === 'flash' ? 6 : tier === 'flash-lite' ? 4 : -14
    const stabilityOffset = isPreviewOrExp ? -18 : 0
    return base + tierBonus + stabilityOffset
  }
  if (lower.startsWith('gemma-3-27b')) return 95
  if (lower.startsWith('gemma-3-')) return 90
  if (lower.includes('flash')) return 85
  return 50
}

export function isDiscontinuedGeminiModel(modelId) {
  if (!modelId || typeof modelId !== 'string') return true
  const id = modelId.trim().toLowerCase().replace(/^models\//, '')
  if (!id) return true
  if (getDeadGeminiModelsSet().has(id)) return true
  // Gemini 1.0, 1.5, and 2.0 families (including 2.0-flash, 2.0-flash-lite, 2.0-flash-exp) are discontinued/retired
  if (
    id === 'gemini-pro' ||
    id === 'gemini-pro-vision' ||
    id === 'gemini-ultra' ||
    id.startsWith('gemini-1.0') ||
    id.startsWith('gemini-1.5') ||
    id.startsWith('gemini-2.0') ||
    id.includes('1.0') ||
    id.includes('1.5-') ||
    id.includes('2.0-') ||
    id.includes('embedding') ||
    id.includes('imagen') ||
    id.includes('veo') ||
    id.includes('tts') ||
    id.includes('audio') ||
    id.includes('vision') ||
    id.includes('aqa') ||
    id.includes('learnlm') ||
    id.includes('bisect') ||
    id.includes('thinking-exp') ||
    id.includes('computer-use') ||
    id.includes('robotics') ||
    id.endsWith('-001') ||
    id.endsWith('-002')
  ) {
    return true
  }
  return false
}

export function sanitizeGeminiModelId(modelId) {
  const cleaned = (modelId || '').trim().replace(/^models\//, '').replace(/\s+/g, '-')
  if (!cleaned || isDiscontinuedGeminiModel(cleaned)) {
    const cached = getCachedGeminiModels()
    return cached[0] || 'gemini-flash-latest'
  }
  return cleaned
}

export function buildGeminiPayload(modelId, contents, systemInstructionText) {
  const isGemma = (modelId || '').toLowerCase().includes('gemma')
  if (isGemma || !systemInstructionText) {
    if (systemInstructionText && Array.isArray(contents) && contents.length > 0) {
      const cloned = contents.map((c, idx) => {
        if (idx === 0 && c.role === 'user' && Array.isArray(c.parts) && c.parts.length > 0) {
          const firstPart = c.parts[0]
          if (typeof firstPart.text === 'string') {
            return {
              ...c,
              parts: [
                { ...firstPart, text: `[System Instructions]:\n${systemInstructionText}\n\n[User Request]:\n${firstPart.text}` },
                ...c.parts.slice(1),
              ],
            }
          }
        }
        return c
      })
      return { contents: cloned }
    }
    return { contents }
  }
  return {
    contents,
    systemInstruction: { parts: [{ text: systemInstructionText }] },
  }
}

export function getCachedGeminiModels() {
  try {
    const raw = localStorage.getItem(GEMINI_CACHE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        const valid = parsed.filter((m) => !isDiscontinuedGeminiModel(m))
        if (valid.length !== parsed.length) {
          try { localStorage.setItem(GEMINI_CACHE_KEY, JSON.stringify(valid.length > 0 ? valid : DEFAULT_GEMINI_MODELS)) } catch {}
        }
        if (valid.length > 0) return valid
      }
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
        const rawId = (m.name || '').replace(/^models\//, '')
        const lower = rawId.toLowerCase()
        const methods = m.supportedGenerationMethods || []
        return (
          methods.includes('generateContent') &&
          (lower.startsWith('gemini-') || lower.startsWith('gemma-3-')) &&
          !isDiscontinuedGeminiModel(rawId)
        )
      })
      .map((m) => m.name.replace(/^models\//, ''))

    // Sort dynamically by generation version number (2.5 -> 3.0 -> 3.5 -> 4.0 -> 5.0+) and Free-Tier Flash stability
    models.sort((a, b) => scoreGeminiModel(b) - scoreGeminiModel(a))

    const uniqueModels = [...new Set(models)]
    if (uniqueModels.length > 0) {
      try {
        localStorage.setItem(GEMINI_CACHE_KEY, JSON.stringify(uniqueModels))
      } catch {}
      return uniqueModels
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

export async function getGeminiFallbackChain(apiKey, primaryModel = '') {
  const cleanPrimary = sanitizeGeminiModelId(primaryModel)
  const live = await fetchLiveGeminiModels(apiKey)
  // Combine live highest-version Flash models + Google's evergreen rolling aliases (gemini-flash-latest / gemini-flash-lite-latest)
  const chain = [
    cleanPrimary,
    ...live.filter((m) => !isDiscontinuedGeminiModel(m)),
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
  ].filter((m) => m && !isDiscontinuedGeminiModel(m))
  return [...new Set(chain)]
}

export async function resolveWorkingGeminiModel(apiKey, failedModel = '') {
  const models = await fetchLiveGeminiModels(apiKey)
  const failedSet = new Set(Array.isArray(failedModel) ? failedModel : [failedModel])
  const freeTierSafe = [
    ...models,
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
  ].filter((m) => m && !failedSet.has(m) && !isDiscontinuedGeminiModel(m))
  return freeTierSafe[0] || 'gemini-flash-latest'
}

export async function resolveWorkingGroqModel(apiKey, failedModel = '') {
  const models = await fetchLiveGroqModels(apiKey)
  const candidate = models.find((m) => m !== failedModel) || 'llama-3.3-70b-versatile'
  try {
    useAIStore.getState().setGroqModel(candidate)
  } catch {}
  return candidate
}
