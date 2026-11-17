import { useState, useEffect, useCallback } from 'react'
import SettingsSection from './SettingsSection'
import { GenAI } from '../../components/GenAIPlugin'
import { useAIStore } from '../../stores/aiStore'
import {
  getCachedGeminiModels,
  getCachedGroqModels,
  fetchLiveGeminiModels,
  fetchLiveGroqModels,
} from '../../utils/modelResolver'

export default function LLMBackendSection({ expandedSections, toggleSection, llmBackend, setLlmBackend, geminiModel, setGeminiModel }) {
  const { geminiKey, groqKey, groqModel, setGroqModel } = useAIStore()
  const [genAIAvailable, setGenAIAvailable] = useState(null)
  const [genAIDeviceInfo, setGenAIDeviceInfo] = useState('')
  const [geminiModels, setGeminiModels] = useState(() => getCachedGeminiModels())
  const [groqModels, setGroqModels] = useState(() => getCachedGroqModels())
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  useEffect(() => {
    GenAI.checkAvailability().then(({ available, deviceInfo }) => {
      setGenAIAvailable(available)
      setGenAIDeviceInfo(deviceInfo || '')
    })
  }, [])

  const syncLiveModels = useCallback(async (showFeedback = false) => {
    setSyncing(true)
    try {
      if (geminiKey) {
        const list = await fetchLiveGeminiModels(geminiKey)
        setGeminiModels(list)
        if (list.length > 0 && !list.includes(geminiModel)) {
          setGeminiModel(list[0])
        }
      }
      if (groqKey) {
        const list = await fetchLiveGroqModels(groqKey)
        setGroqModels(list)
        if (list.length > 0 && !list.includes(groqModel)) {
          setGroqModel(list[0])
        }
      }
      if (showFeedback) {
        setSyncMsg('AUTO-SYNCED!')
        setTimeout(() => setSyncMsg(''), 2500)
      }
    } finally {
      setSyncing(false)
    }
  }, [geminiKey, groqKey, geminiModel, groqModel, setGeminiModel, setGroqModel])

  useEffect(() => {
    if (geminiKey || groqKey) {
      syncLiveModels(false)
    }
  }, [geminiKey, groqKey, syncLiveModels])

  return (
    <SettingsSection
      title="SYSTEM-WIDE LLM BACKEND"
      icon="neurology"
      sectionKey="llmBackend"
      expandedSections={expandedSections}
      toggleSection={toggleSection}
      badge={<span className="flex h-2 w-2 rounded-full bg-primary-fixed-dim animate-pulse-cyan" />}
    >
      <div className="grid grid-cols-2 gap-2">
        {[
          { id: 'OLLAMA', label: 'Ollama Engine (Local)', desc: 'Port 11434 LLM Services' },
          { id: 'ONDEVICE', label: 'Gemini Nano (On-Device)', desc: 'Zero-Cloud AI Inference', disabled: genAIAvailable === false },
          { id: 'GEMINI', label: 'Google Gemini', desc: 'Auto-Updated Live Models' },
          { id: 'GROQ', label: 'Groq Cloud (Online)', desc: 'Ultra-fast LPU Models' },
          { id: 'NVIDIA', label: 'NVIDIA NIM', desc: 'Accelerated Inference' },
        ].map((backend) => (
          <button
            key={backend.id}
            onClick={() => !backend.disabled && setLlmBackend(backend.id)}
            disabled={backend.disabled}
            className={`p-3 rounded-lg border text-left transition-all active:scale-95 flex flex-col justify-between h-18 ${
              llmBackend === backend.id
                ? 'bg-primary-fixed-dim/10 border-primary-fixed-dim/40 text-primary-fixed-dim'
                : backend.disabled
                  ? 'opacity-40 cursor-not-allowed border-outline-variant/10 text-on-surface-variant/30'
                  : 'hover:bg-surface-variant/40 border-outline-variant/20 text-on-surface-variant/70'
            }`}
          >
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

      {(llmBackend === 'GEMINI' || llmBackend === 'GROQ') && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[8px] text-on-surface-variant/50 uppercase font-mono-data">
              {llmBackend === 'GEMINI' ? `ACTIVE GEMINI MODEL (${geminiModel})` : `ACTIVE GROQ MODEL (${groqModel})`}
            </p>
            <button
              type="button"
              onClick={() => syncLiveModels(true)}
              disabled={syncing}
              className="px-2 py-0.5 rounded bg-primary-fixed-dim/15 border border-primary-fixed-dim/40 text-primary-fixed-dim font-mono-data text-[8px] font-bold active:scale-95"
            >
              {syncing ? 'SYNCING...' : syncMsg || '🔄 AUTO-SYNCED'}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-1.5 max-h-44 overflow-y-auto pr-1">
            {(llmBackend === 'GEMINI' ? geminiModels : groqModels).slice(0, 10).map((mId) => {
              const isSelected = llmBackend === 'GEMINI' ? geminiModel === mId : groqModel === mId
              return (
                <button
                  key={mId}
                  onClick={() => (llmBackend === 'GEMINI' ? setGeminiModel(mId) : setGroqModel(mId))}
                  className={`px-3 py-2 rounded border text-left transition-all active:scale-95 flex justify-between items-center ${
                    isSelected
                      ? 'bg-primary-fixed-dim/15 border-primary-fixed-dim/50 text-primary-fixed-dim'
                      : 'hover:bg-surface-variant/40 border-outline-variant/20 text-on-surface-variant/70'
                  }`}
                >
                  <span className="font-mono-data text-[9px] font-bold truncate">{mId}</span>
                  <span className="text-[7px] text-on-surface-variant/40 uppercase shrink-0">
                    {isSelected ? 'ACTIVE' : 'SELECT'}
                  </span>
                </button>
              )
            })}
          </div>

          <p className="text-[7px] text-on-surface-variant/40 font-mono-data">
            100% Automatic: Discontinued models are automatically removed and replaced with the latest available model system-wide.
          </p>
        </div>
      )}
    </SettingsSection>
  )
}
