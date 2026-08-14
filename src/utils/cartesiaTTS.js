import { SecureStorage } from './secureStorage'
import { speakCartesiaNative, isNative, addAudioFinishedListener, stopAudio } from '../components/LauncherPlugin'

export const CARTESIA_VOICES = {
  natural_female: "694f9389-aac1-45b6-b726-9d9369183238", // Barbershop / Sarah
  natural_male: "a0e99841-438c-4a64-b679-ae501e7d6091",   // Mason / Male US
  british_female: "79a125e8-cd45-4c13-8a67-188112f4dd22", // British Female
  british_male: "638ef502-b258-45e0-b6f2-777b7d603204",   // British Male
  narrator: "829ccd10-f8b3-43ed-b844-9f4460f06536"        // Deep Narrator
}

export async function getCartesiaKey() {
  try {
    const fromSecure = await SecureStorage.getItem('cartesia_api_key')
    if (fromSecure && fromSecure.trim()) return fromSecure.trim()
  } catch (_) {}
  const fromLS = localStorage.getItem('cartesia_api_key') || localStorage.getItem('ks_cartesia_api_key')
  return (fromLS || '').trim()
}

export async function testCartesiaKey(apiKey) {
  const key = (apiKey || '').trim()
  if (!key) return { success: false, error: 'API key is empty' }

  try {
    const res = await fetch('https://api.cartesia.ai/voices', {
      method: 'GET',
      headers: {
        'Cartesia-Version': '2024-06-10',
        'X-API-Key': key
      }
    })
    if (res.ok) {
      return { success: true, message: 'Cartesia 3.5 Neural Key Verified!' }
    } else {
      const txt = await res.text()
      let detail = `HTTP ${res.status}`
      try {
        const json = JSON.parse(txt)
        if (json.message) detail = json.message
      } catch (_) {}
      return { success: false, error: detail }
    }
  } catch (e) {
    return { success: false, error: e.message || 'Network connection failed' }
  }
}

export async function playArrayBuffer(arrayBuffer) {
  // Method 1: Web Audio API AudioContext decode
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (AudioCtx) {
      const ctx = new AudioCtx()
      if (ctx.state === 'suspended') {
        await ctx.resume().catch(() => {})
      }
      const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0))
      const source = ctx.createBufferSource()
      source.buffer = decoded
      source.connect(ctx.destination)
      window._cartesiaAudioNode = source
      return new Promise((resolve) => {
        source.onended = () => {
          window._cartesiaAudioNode = null
          ctx.close().catch(() => {})
          resolve(true)
        }
        source.start(0)
      })
    }
  } catch (e) {
    console.warn('[Cartesia] AudioContext playback failed, trying HTMLAudioElement:', e)
  }

  // Method 2: HTMLAudioElement Blob URL
  return new Promise((resolve) => {
    try {
      const blob = new Blob([arrayBuffer], { type: 'audio/mp3' })
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      window._cartesiaAudioEl = audio
      audio.onended = () => {
        URL.revokeObjectURL(url)
        window._cartesiaAudioEl = null
        resolve(true)
      }
      audio.onerror = () => {
        URL.revokeObjectURL(url)
        window._cartesiaAudioEl = null
        resolve(false)
      }
      audio.play().catch((err) => {
        console.warn('[Cartesia] HTMLAudioElement play error:', err)
        URL.revokeObjectURL(url)
        window._cartesiaAudioEl = null
        resolve(false)
      })
    } catch (e) {
      console.error('[Cartesia] Playback exception:', e)
      resolve(false)
    }
  })
}

export async function speakCartesia(text, voiceTimbre, apiKey) {
  const voiceId = CARTESIA_VOICES[voiceTimbre] || "694f9389-aac1-45b6-b726-9d9369183238"
  
  // 1. Android Native Execution (Uses Java HttpsURLConnection + Native MediaPlayer)
  if (isNative) {
    return new Promise((resolve) => {
      (async () => {
        try {
          if (window._cartesiaNativeListener) window._cartesiaNativeListener.remove()
          window._cartesiaNativeListener = await addAudioFinishedListener(() => {
            if (window._cartesiaNativeListener) window._cartesiaNativeListener.remove()
            window._cartesiaNativeListener = null
            resolve(true)
          })
          await speakCartesiaNative(text, voiceId, apiKey.trim())
        } catch (e) {
          console.error('[IRIS Native Cartesia Error]', e)
          resolve(false)
        }
      })()
    })
  }

  // 2. Web Browser Execution (Uses JS fetch + Web Audio)
  try {
    const res = await fetch('https://api.cartesia.ai/tts/bytes', {
      method: 'POST',
      headers: {
        'Cartesia-Version': '2024-06-10',
        'X-API-Key': apiKey.trim(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model_id: "sonic-3.5",
        transcript: text,
        voice: { mode: "id", id: voiceId },
        output_format: { container: "mp3", bit_rate: 128000, sample_rate: 44100 }
      })
    })

    if (res.ok) {
      const arrayBuf = await res.arrayBuffer()
      await playArrayBuffer(arrayBuf)
      return true
    } else {
      const errText = await res.text()
      console.warn("[IRIS Cartesia API Error]", res.status, errText)
      throw new Error(`HTTP ${res.status}: ${errText}`)
    }
  } catch (e) {
    console.error("[IRIS Cartesia Web Error]", e)
    throw e
  }
}

export async function stopCartesiaAudio() {
  if (isNative) {
    stopAudio().catch(() => {})
  }
  if (window._cartesiaAudioNode) {
    try { window._cartesiaAudioNode.stop() } catch (_) {}
    window._cartesiaAudioNode = null
  }
  if (window._cartesiaAudioEl) {
    try { window._cartesiaAudioEl.pause() } catch (_) {}
    window._cartesiaAudioEl = null
  }
}
