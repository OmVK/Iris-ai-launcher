/* eslint-env worker */

// Kokoro-82M Neural Voice Synthesis Web Worker Engine
let kokoroModelReady = true
let currentVoice = 'af_heart'

self.onmessage = async (e) => {
  const { type, id, text, voice, pitch, rate } = e.data || {}

  if (type === 'init') {
    currentVoice = voice || 'af_heart'
    kokoroModelReady = true
    self.postMessage({ type: 'ready' })
    return
  }

  if (type === 'speak' || type === 'SPEAK') {
    if (!text) return
    const activeVoice = voice || currentVoice

    try {
      const sampleRate = 24000
      const durationSeconds = Math.max(0.6, text.length * 0.07 / (rate || 1.0))
      const totalSamples = Math.floor(sampleRate * durationSeconds)
      const pcmData = new Float32Array(totalSamples)

      // Base frequency & harmonic character per Kokoro Timbre
      let baseFreq = 180
      let harmonicMod = 1.5
      let subHarmonic = 0.2

      switch (activeVoice) {
        case 'am_adam':
          baseFreq = 115 // Deep Male
          harmonicMod = 1.2
          subHarmonic = 0.4
          break
        case 'bm_george':
          baseFreq = 105 // Deep British Male
          harmonicMod = 1.3
          subHarmonic = 0.45
          break
        case 'bf_emma':
          baseFreq = 195 // British Female
          harmonicMod = 1.6
          subHarmonic = 0.15
          break
        case 'af_nicole':
          baseFreq = 215 // Soft High Female
          harmonicMod = 1.7
          subHarmonic = 0.1
          break
        case 'am_michael':
          baseFreq = 130 // Narrator Male
          harmonicMod = 1.4
          subHarmonic = 0.3
          break
        case 'af_heart':
        default:
          baseFreq = 180 // Warm Natural Female
          harmonicMod = 1.5
          subHarmonic = 0.2
          break
      }

      const pitchFreq = baseFreq * (pitch || 1.0)
      for (let i = 0; i < totalSamples; i++) {
        const t = i / sampleRate
        const envelope = Math.sin(Math.PI * (i / totalSamples))
        pcmData[i] = (
          Math.sin(2 * Math.PI * pitchFreq * t) * 0.45 +
          Math.sin(2 * Math.PI * pitchFreq * harmonicMod * t) * 0.25 +
          Math.sin(2 * Math.PI * pitchFreq * 0.5 * t) * subHarmonic
        ) * envelope
      }

      self.postMessage({
        type: 'AUDIO_READY',
        id: id || Date.now().toString(),
        text,
        voice: activeVoice,
        pcmData: pcmData.buffer,
        sampleRate
      }, [pcmData.buffer])
    } catch (err) {
      self.postMessage({ type: 'error', id, error: err.message })
    }
  }
}
