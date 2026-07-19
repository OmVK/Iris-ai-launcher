import { SecureStorage } from './secureStorage'
import { GenAI } from '../components/GenAIPlugin'

const CACHE_TTL = 5 * 60 * 1000

const BACKENDS = ['ONDEVICE', 'GEMINI', 'GROQ', 'NVIDIA', 'OLLAMA']

const statusCache = {
  ONDEVICE: { available: null, lastCheck: 0, error: null },
  GEMINI: { available: null, lastCheck: 0, error: null },
  GROQ: { available: null, lastCheck: 0, error: null },
  NVIDIA: { available: null, lastCheck: 0, error: null },
  OLLAMA: { available: null, lastCheck: 0, error: null },
}

const checkOnDevice = async () => {
  try {
    const ready = await GenAI.isReady()
    if (ready) return { available: true, error: null }
    const { available, error } = await GenAI.checkAvailability()
    if (available) {
      const { initialized } = await GenAI.initializeModel('gemini-nano')
      return { available: initialized, error: initialized ? null : 'Model init failed' }
    }
    return { available: false, error: error || 'Not supported on this device' }
  } catch (e) {
    return { available: false, error: e.message }
  }
}

const checkCloud = async (backend) => {
  let key = null
  try {
    if (backend === 'GEMINI') {
      const { geminiKey } = (await import('../stores/aiStore')).useAIStore.getState()
      key = geminiKey
    } else if (backend === 'GROQ') {
      const { groqKey } = (await import('../stores/aiStore')).useAIStore.getState()
      key = groqKey
    } else if (backend === 'NVIDIA') {
      key = await SecureStorage.getItem('nvidia_api_key')
    }
  } catch {}
  if (!key) return { available: false, error: 'No API key configured' }

  try {
    let url, headers, body
    if (backend === 'GEMINI') {
      const model = (localStorage.getItem('gemini_model') || 'gemini-2.5-flash').trim().replace(/\s+/g, '-')
      url = `https://generativelanguage.googleapis.com/v1beta/models/${model}?key=${key}`
      const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(8000) })
      if (res.ok) return { available: true, error: null }
      const data = await res.json().catch(() => ({}))
      return { available: false, error: data?.error?.message || `HTTP ${res.status}` }
    } else if (backend === 'GROQ') {
      url = 'https://api.groq.com/openai/v1/models'
      headers = { 'Authorization': `Bearer ${key}` }
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) })
      if (res.ok) return { available: true, error: null }
      const data = await res.json().catch(() => ({}))
      return { available: false, error: data?.error?.message || `HTTP ${res.status}` }
    } else if (backend === 'NVIDIA') {
      url = 'https://integrate.api.nvidia.com/v1/models'
      headers = { 'Authorization': `Bearer ${key}` }
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) })
      if (res.ok) return { available: true, error: null }
      const data = await res.json().catch(() => ({}))
      return { available: false, error: data?.error?.message || `HTTP ${res.status}` }
    }
  } catch (e) {
    if (e.name === 'AbortError') return { available: false, error: 'Connection timeout' }
    return { available: false, error: e.message }
  }
  return { available: false, error: 'Unknown backend' }
}

const checkOllama = async () => {
  const endpoint = localStorage.getItem('ollama_endpoint') || 'http://localhost:11434'
  try {
    const res = await fetch(`${endpoint}/api/tags`, { signal: AbortSignal.timeout(5000) })
    if (res.ok) return { available: true, error: null }
    return { available: false, error: `HTTP ${res.status}` }
  } catch (e) {
    return { available: false, error: e.name === 'AbortError' ? 'Connection timeout' : e.message }
  }
}

export const checkBackend = async (backend, force = false) => {
  const cached = statusCache[backend]
  const now = Date.now()
  if (!force && cached.available !== null && (now - cached.lastCheck) < CACHE_TTL) {
    return { available: cached.available, error: cached.error }
  }

  let result
  if (backend === 'ONDEVICE') result = await checkOnDevice()
  else if (backend === 'OLLAMA') result = await checkOllama()
  else result = await checkCloud(backend)

  statusCache[backend] = { available: result.available, lastCheck: now, error: result.error }
  return result
}

export const checkAllBackends = async (force = false) => {
  const results = {}
  await Promise.all(BACKENDS.map(async (b) => {
    results[b] = await checkBackend(b, force)
  }))
  return results
}

export const isBackendAvailable = (backend) => {
  const cached = statusCache[backend]
  return cached?.available === true
}

export const getAvailableBackends = () => {
  return BACKENDS.filter(b => statusCache[b].available === true)
}

export const getBackendPriorityChain = () => {
  const available = getAvailableBackends()
  const chain = ['ONDEVICE', 'GEMINI', 'GROQ', 'NVIDIA', 'OLLAMA']
  return chain.filter(b => available.includes(b))
}

export const getBackendStatus = (backend) => {
  const cached = statusCache[backend]
  if (!cached || cached.available === null) return 'unknown'
  return cached.available ? 'online' : 'offline'
}

export const getBackendError = (backend) => statusCache[backend]?.error || null

export const resetCache = () => {
  BACKENDS.forEach(b => {
    statusCache[b] = { available: null, lastCheck: 0, error: null }
  })
}

export { BACKENDS }
