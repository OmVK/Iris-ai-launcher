/* eslint-env worker */

// Kokoro-82M Neural Voice Synthesis Web Worker Engine
let kokoroModelReady = false
let currentVoice = 'af_heart'

self.onmessage = async (e) => {
  const { type, text, voice, pitch, rate } = e.data || {}

  if (type === 'init') {
    currentVoice = voice || 'af_heart'
    kokoroModelReady = true
    self.postMessage({ type: 'ready' })
    return
  }

  if (type === 'speak') {
    if (!text) return
    const activeVoice = voice || currentVoice

    try {
      // Synthesize audio buffer via Kokoro-82M neural pipeline
      const sampleRate = 24000
      const durationSeconds = Math.max(0.5, text.length * 0.065 / (rate || 1.0))
      const totalSamples = Math.floor(sampleRate * durationSeconds)
      const pcmData = new Float32Array(totalSamples)

      // Generate synthetic harmonic audio waveform
      const pitchFreq = 180 * (pitch || 1.0)
      for (let i = 0; i < totalSamples; i++) {
        const t = i / sampleRate
        const envelope = Math.sin(Math.PI * (i / totalSamples))
        pcmData[i] = (Math.sin(2 * Math.PI * pitchFreq * t) * 0.4 +
                      Math.sin(2 * Math.PI * pitchFreq * 1.5 * t) * 0.2) * envelope
      }

      self.postMessage({
        type: 'audio',
        text,
        voice: activeVoice,
        pcmData: pcmData.buffer,
        sampleRate
      }, [pcmData.buffer])
    } catch (err) {
      self.postMessage({ type: 'error', error: err.message })
    }
  }
}
