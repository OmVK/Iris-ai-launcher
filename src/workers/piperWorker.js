import { TtsSession, ONNX_BASE } from '@mintplex-labs/piper-tts-web';
import * as ort from 'onnxruntime-web';

ort.env.wasm.numThreads = 1;

let session = null;
let isInitializing = false;

function withTimeout(promise, ms, name) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${name} timed out`)), ms))
  ]);
}

// Initialize session
async function initSession() {
  if (session) return;
  if (isInitializing) return; // Prevent multiple concurrent initializations
  isInitializing = true;
  try {
    const origin = self.location.origin || 'https://localhost';
    session = await withTimeout(TtsSession.create({
      voiceId: 'en_US-ryan-medium',
      wasmPaths: {
        onnxWasm: origin + '/piper/',
        piperData: origin + '/piper/piper_phonemize.data',
        piperWasm: origin + '/piper/piper_phonemize.wasm'
      }
    }), 8000, 'Piper init');
  } catch (err) {
    console.error('Failed to initialize Piper:', err);
  } finally {
    isInitializing = false;
  }
}

self.onmessage = async (e) => {
  const { type, text, id } = e.data;

  if (type === 'INIT') {
    await initSession();
    if (!session) {
      self.postMessage({ type: 'INIT_ERROR', error: 'Failed to initialize Piper TTS session' });
      return;
    }
    self.postMessage({ type: 'INIT_DONE' });
  } else if (type === 'SPEAK') {
    if (!session) {
      await initSession();
    }
    
    if (!session) {
      self.postMessage({ type: 'ERROR', id, text, error: 'Session not initialized' });
      return;
    }
    try {
      // Predict returns a Blob of audio/wav
      const blob = await withTimeout(session.predict(text), 15000, 'Piper predict');
      self.postMessage({ type: 'AUDIO_READY', id, blob, text });
    } catch (err) {
      console.error('Piper predict error:', err);
      self.postMessage({ type: 'ERROR', id, text, error: err.message || String(err) });
    }
  }
};
