import { playArrayBuffer } from './cartesiaTTS'

export async function speakPiper(text, voiceTimbre) {
  try {
    const piperWeb = await import('@mintplex-labs/piper-tts-web')
    const predictFn = piperWeb.predict || piperWeb.default?.predict
    if (typeof predictFn === 'function') {
      const pcmBuffer = await predictFn({
        text,
        voiceId: 'en_US-lessac-medium'
      })
      if (pcmBuffer) {
        await playArrayBuffer(pcmBuffer)
        return true
      }
    }
  } catch (e) {
    console.warn('[IRIS Piper TTS] Execution exception:', e)
  }
  return false
}
