import { useState, useEffect } from 'react'
import SettingsSection from './SettingsSection'
import { GenAI } from '../../components/GenAIPlugin'

const GEMINI_MODELS = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', desc: 'Fast + Reasoning' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', desc: 'Advanced Reasoning' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', desc: 'Legacy Fast' },
]

export default function LLMBackendSection({ expandedSections, toggleSection, llmBackend, setLlmBackend, geminiModel, setGeminiModel }) {
  const [genAIAvailable, setGenAIAvailable] = useState(null)
  const [genAIDeviceInfo, setGenAIDeviceInfo] = useState('')

  useEffect(() => {
    GenAI.checkAvailability().then(({ available, deviceInfo }) => {
      setGenAIAvailable(available)
      setGenAIDeviceInfo(deviceInfo || '')
    })
  }, [])

  return (
    <SettingsSection title="SYSTEM-WIDE LLM BACKEND" icon="neurology" sectionKey="llmBackend" expandedSections={expandedSections} toggleSection={toggleSection}
      badge={<span className="flex h-2 w-2 rounded-full bg-primary-fixed-dim animate-pulse-cyan" />}>
      <div className="grid grid-cols-2 gap-2">
        {[
          { id: 'OLLAMA', label: 'Ollama Engine (Local)', desc: 'Port 11434 LLM Services' },
          { id: 'ONDEVICE', label: 'Gemini Nano (On-Device)', desc: 'Zero-Cloud AI Inference', disabled: genAIAvailable === false },
          { id: 'GEMINI', label: 'Google Gemini Pro', desc: 'Online Generative Model' },
          { id: 'GROQ', label: 'Groq Cloud (Online)', desc: 'Ultra-fast Llama-3 API' },
          { id: 'NVIDIA', label: 'NVIDIA NIM', desc: 'Accelerated Llama 3.1' }
        ].map(backend => (
          <button key={backend.id} onClick={() => !backend.disabled && setLlmBackend(backend.id)} disabled={backend.disabled} className={`p-3 rounded-lg border text-left transition-all active:scale-95 flex flex-col justify-between h-18 ${llmBackend === backend.id ? 'bg-primary-fixed-dim/10 border-primary-fixed-dim/40 text-primary-fixed-dim' : backend.disabled ? 'opacity-40 cursor-not-allowed border-outline-variant/10 text-on-surface-variant/30' : 'hover:bg-surface-variant/40 border-outline-variant/20 text-on-surface-variant/70'}`}>
            <span className="font-bold text-[10px] truncate">{backend.label}</span>
            <span className="text-[7.5px] text-on-surface-variant/50 mt-1 uppercase truncate">{backend.desc}</span>
          </button>
        ))}
      </div>
      {llmBackend === 'ONDEVICE' && (
        <div className="mt-3 space-y-1.5">
          <div className="p-2.5 bg-[#00f2ff]/5 border border-[#00f2ff]/30 rounded text-[9px] text-[#00f2ff] uppercase leading-relaxed space-y-1">
            <p className="font-bold">GEMINI NANO ON-DEVICE INFERENCE</p>
            <p>Runs 100% locally on your device via Android AICore. No API key needed. No data leaves your phone.</p>
            <p className="text-on-surface-variant/50">Requires a compatible device (Pixel 9+, Samsung S24+) with Android AICore installed.</p>
            {genAIDeviceInfo && <p className="text-[8px] opacity-60">Device: {genAIDeviceInfo}</p>}
          </div>
        </div>
      )}
      {llmBackend === 'GEMINI' && (
        <div className="mt-3 space-y-1">
          <p className="text-[8px] text-on-surface-variant/40 uppercase font-mono-data">GEMINI MODEL VARIANT</p>
          <div className="grid grid-cols-1 gap-1.5">
            {GEMINI_MODELS.map(m => (
              <button key={m.id} onClick={() => setGeminiModel(m.id)} className={`px-3 py-2 rounded border text-left transition-all active:scale-95 flex justify-between items-center ${geminiModel === m.id ? 'bg-primary-fixed-dim/10 border-primary-fixed-dim/40 text-primary-fixed-dim' : 'hover:bg-surface-variant/40 border-outline-variant/20 text-on-surface-variant/70'}`}>
                <span className="font-mono-data text-[9px] font-bold">{m.label}</span>
                <span className="text-[7px] text-on-surface-variant/40 uppercase">{m.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </SettingsSection>
  )
}
