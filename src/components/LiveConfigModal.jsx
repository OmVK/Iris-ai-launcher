import { SecureStorage } from '../utils/secureStorage'
import { useAIStore } from '../stores/aiStore'

export default function LiveConfigModal({ liveSetupEngine, setLiveSetupEngine, liveSetupKey, setLiveSetupKey, onSave, onClose }) {
  const handleEngineChange = async (newEngine) => {
    setLiveSetupEngine(newEngine)
    const keyMap = { GEMINI: 'gemini_api_key', GROQ: 'groq_api_key' }
    if (keyMap[newEngine]) {
      const key = await SecureStorage.getItem(keyMap[newEngine])
      setLiveSetupKey(key || '')
    } else {
      setLiveSetupKey('')
    }
  }

  return (
    <div className="fixed inset-0 bg-[#020617]/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-surface rounded-2xl p-5 border border-primary-fixed-dim/30 flex flex-col gap-4 font-mono-data text-xs bg-[#0b0e17]/90 text-left max-h-[90vh] overflow-y-auto scroll-container">
        <div className="flex justify-between items-center pb-2 border-b border-white/10">
          <span className="text-[#00f2ff] font-bold tracking-widest uppercase flex items-center gap-1.5"><span className="material-symbols-outlined text-sm">settings_voice</span>LIVE VOICE CORE SETUP</span>
          <button onClick={onClose} className="text-on-surface-variant/40 hover:text-white"><span className="material-symbols-outlined text-sm">close</span></button>
        </div>
        <p className="text-[10px] text-on-surface-variant/80 leading-relaxed uppercase">Please select the operational AI core to power the live conversation voice loop.</p>
        <div className="space-y-1.5">
          <label className="text-[9px] text-[#00f2ff] uppercase">COGNITIVE ENGINE BACKEND</label>
          <select value={liveSetupEngine} onChange={e => handleEngineChange(e.target.value)} className="w-full bg-black/50 border border-outline-variant/35 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#00f2ff]">
            <option value="GEMINI">Google Gemini Pro (Online)</option>
            <option value="GROQ">Groq Cloud Llama-3 (Online)</option>
            <option value="OLLAMA">Local Ollama API (Port 11434)</option>
            <option value="ONDEVICE">Gemini Nano (On-Device, No Key)</option>
          </select>
        </div>
        {['GEMINI', 'GROQ'].includes(liveSetupEngine) && (
          <div className="space-y-1.5">
            <label className="text-[9px] text-[#00f2ff] uppercase">{liveSetupEngine} API AUTHORIZATION KEY</label>
            <input type="password" placeholder={`Enter your ${liveSetupEngine} API key...`} value={liveSetupKey} onChange={e => setLiveSetupKey(e.target.value)} className="w-full bg-black/50 border border-outline-variant/35 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#00f2ff]" />
          </div>
        )}
        {liveSetupEngine === 'OLLAMA' && (
          <div className="p-2.5 bg-[#00f2ff]/5 border border-[#00f2ff]/30 rounded text-[9px] text-[#00f2ff] uppercase leading-relaxed">Ensure your local Ollama server is running at http://localhost:11434 with models pre-loaded before starting the voice protocol.</div>
        )}
        {liveSetupEngine === 'ONDEVICE' && (
          <div className="p-2.5 bg-[#00f2ff]/5 border border-[#00f2ff]/30 rounded text-[9px] text-[#00f2ff] uppercase leading-relaxed">Gemini Nano runs 100% on-device. No API key required. Requires a compatible device with Android AICore (Pixel 9+, Samsung S24+).</div>
        )}
        <div className="flex gap-2 pt-2 border-t border-white/5 justify-end">
          <button onClick={onClose} className="px-3 py-1.5 rounded hover:bg-white/10 text-on-surface-variant text-[10px]">CANCEL</button>
          <button onClick={onSave} className="px-4 py-1.5 rounded bg-primary-fixed-dim/20 border border-primary-fixed-dim/40 text-primary-fixed-dim font-bold active:scale-95 transition-transform text-[10px]">SAVE AND ENGAGE LIVE</button>
        </div>
      </div>
    </div>
  )
}
