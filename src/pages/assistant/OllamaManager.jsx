import { useState } from 'react'

const OLLAMA_RECOMMENDED_MODELS = [
  { id: 'deepseek-r1:1.5b', tier: 'LOW', desc: '1.5B reasoning model for low-end devices' },
  { id: 'deepseek-r1:7b', tier: 'MEDIUM', desc: '7B reasoning model for mid-range devices' },
  { id: 'deepseek-r1:14b', tier: 'HIGH', desc: '14B reasoning model for high-end devices' },
  { id: 'qwen3:8b', tier: 'MEDIUM', desc: '8B general-purpose model' },
  { id: 'llama3.2:3b', tier: 'LOW', desc: '3B fast model for quick responses' },
  { id: 'gemma3:4b', tier: 'MEDIUM', desc: '4B Google model for balanced performance' }
]

function getDeviceTier() {
  const cores = navigator.hardwareConcurrency || 4
  const mem = navigator.deviceMemory || 4
  if (cores >= 8 && mem >= 8) return 'HIGH'
  if (cores >= 4 && mem >= 4) return 'MEDIUM'
  return 'LOW'
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export default function OllamaManager({ ollamaModels, onSelectModel, onClose }) {
  const [pullModelName, setPullModelName] = useState('')
  const [pullStatus, setPullStatus] = useState('idle')
  const [pullProgress, setPullProgress] = useState(0)
  const [pullMessage, setPullMessage] = useState('')

  const fetchOllamaModels = async () => {
    try {
      const endpoint = localStorage.getItem('ollama_endpoint') || 'http://localhost:11434'
      const res = await fetch(`${endpoint}/api/tags`)
      if (!res.ok) throw new Error("Offline")
      const data = await res.json()
      if (data?.models?.length > 0) {
        const current = localStorage.getItem('ollama_model') || ''
        if (!data.models.some(m => m.name === current)) {
          onSelectModel(data.models[0].name)
        }
      }
    } catch (e) { console.error("Failed to fetch Ollama models:", e) }
  }

  const pullModel = async (modelName = pullModelName) => {
    if (!modelName.trim()) return
    setPullStatus('pulling'); setPullProgress(0); setPullMessage('Connecting...')
    try {
      const endpoint = localStorage.getItem('ollama_endpoint') || 'http://localhost:11434'
      const res = await fetch(`${endpoint}/api/pull`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: modelName })
      })
      if (!res.ok || !res.body) throw new Error("Pull failed")
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let text = ''
      let reading = true
      while (reading) {
        const { done, value } = await reader.read()
        if (done) { reading = false; break }
        text += decoder.decode(value, { stream: true })
        const lines = text.split('\n'); text = lines.pop()
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const update = JSON.parse(line)
            if (update.status) setPullMessage(update.status)
            if (update.completed && update.total) {
              const pct = Math.round((update.completed / update.total) * 100)
              setPullProgress(pct)
              setPullMessage(`${update.status} (${pct}%) - ${formatBytes(update.total - update.completed)} left`)
            }
          } catch (_e) { /* skip unparseable lines */ }
        }
      }
      setPullStatus('success'); setPullMessage(`Model ${modelName} downloaded!`)
      fetchOllamaModels()
    } catch (e) { setPullStatus('error'); setPullMessage(`Failed: ${e.message}`) }
  }

  const tier = getDeviceTier()

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center font-mono-data text-xs space-y-5 bg-[#020617]/80 backdrop-blur-md overflow-y-auto scroll-container">
      <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
        <div className="absolute inset-0 border border-dashed border-[rgba(var(--primary-rgb),0.4)] rounded-full animate-spin duration-10000" />
        <div className="absolute inset-2 border border-[rgba(var(--primary-rgb),0.6)] rounded-full animate-iris-rotate" />
        <div className="absolute inset-4 border border-dashed border-primary-fixed-dim/30 rounded-full animate-spin duration-3000" />
        <span className="material-symbols-outlined text-3xl text-[var(--primary-color)] animate-pulse">downloading</span>
      </div>

      <div className="space-y-2 max-w-sm shrink-0">
        <h3 className="font-headline-lg text-sm text-[var(--primary-color)] tracking-wider uppercase">OLLAMA NEURAL MATRIX</h3>
        <p className="text-[9px] text-white/40 uppercase">
          {pullStatus === 'pulling' ? `Downloading weights for model "${pullModelName}" to Ollama local server.` : "Model manager and diagnostic deck. Select a recommended model below to download."}
        </p>
      </div>

      {pullStatus === 'pulling' && (
        <div className="w-full max-w-xs bg-[#020617]/60 border border-[rgba(var(--primary-rgb),0.15)] rounded-xl p-3.5 space-y-2.5 text-[8.5px] text-left shrink-0">
          <div className="flex justify-between"><span className="text-white/30">MODEL_TAG:</span><span className="text-[var(--primary-color)] font-bold select-all truncate pr-1" style={{ maxWidth: '170px' }}>{pullModelName}</span></div>
          <div className="flex justify-between"><span className="text-white/30">STATUS:</span><span className="text-[var(--primary-color)] uppercase animate-pulse">{pullMessage || 'downloading...'}</span></div>
          <div className="space-y-1">
            <div className="flex justify-between font-bold"><span className="text-white/30">INGESTION_SPEED:</span><span className="text-[var(--primary-color)]">{pullProgress}%</span></div>
            <div className="w-full h-1.5 bg-[rgba(var(--primary-rgb),0.1)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--primary-color)] shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)] transition-all duration-300" style={{ width: `${pullProgress}%` }} />
            </div>
          </div>
        </div>
      )}

      {pullStatus !== 'pulling' && (
        <div className="w-full max-w-lg space-y-3 shrink-0">
          <div className="text-[9px] text-[var(--primary-color)] font-bold tracking-widest uppercase flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[12px]">memory</span>HARDWARE-AWARE RECOMMENDATION DECK (DETECTED TIER: {tier.toUpperCase()})
          </div>
          <div className="grid grid-cols-2 gap-2 text-left">
            {OLLAMA_RECOMMENDED_MODELS.map(m => {
              const isRec = m.tier === tier
              return (
                <div key={m.id} onClick={() => { setPullModelName(m.id); pullModel(m.id) }}
                  className={`p-2.5 rounded-lg border cursor-pointer active:scale-[0.98] transition-all flex flex-col justify-between h-20 ${isRec ? 'bg-[rgba(var(--primary-rgb),0.05)] border-[rgba(var(--primary-rgb),0.4)] hover:bg-[rgba(var(--primary-rgb),0.1)]' : 'bg-black/35 border-outline-variant/20 hover:bg-black/50 text-on-surface-variant/70'}`}>
                  <div>
                    <div className="flex justify-between items-center">
                      <span className={`font-bold text-[9px] truncate ${isRec ? 'text-[var(--primary-color)]' : 'text-white'}`}>{m.id}</span>
                      {isRec && <span className="bg-[rgba(var(--primary-rgb),0.1)] text-[var(--primary-color)] border border-[rgba(var(--primary-rgb),0.3)] px-1 py-0.2 rounded text-[6px] font-bold font-label-caps shrink-0">REC</span>}
                    </div>
                    <p className="text-[7.5px] text-white/50 line-clamp-2 mt-1">{m.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="bg-[#020617]/60 border border-[rgba(var(--primary-rgb),0.15)] rounded-xl p-3 max-w-sm mx-auto space-y-2">
            <span className="text-[8px] text-white/40 block uppercase">PULL CUSTOM OLLAMA TAG (e.g. deepseek-r1:1.5b)</span>
            <div className="flex gap-1.5">
              <input type="text" value={pullModelName} onChange={e => setPullModelName(e.target.value)} placeholder="model_name:tag"
                className="flex-1 bg-[#020617]/50 border border-[rgba(var(--primary-rgb),0.2)] rounded px-2 py-1 text-[9px] text-[var(--primary-color)] focus:outline-none focus:border-[rgba(var(--primary-rgb),0.5)]" />
              <button onClick={() => pullModel(pullModelName)}
                className="px-3 bg-[rgba(var(--primary-rgb),0.15)] border border-[rgba(var(--primary-rgb),0.35)] text-[var(--primary-color)] hover:bg-[rgba(var(--primary-rgb),0.25)] rounded text-[8px] font-bold font-mono-data active:scale-95 transition-transform">PULL</button>
            </div>
          </div>
        </div>
      )}

      {pullStatus === 'error' && <div className="text-error font-mono text-[9px] uppercase border border-error/30 bg-error/5 p-2 rounded max-w-xs shrink-0 select-text animate-pulse">{pullMessage}</div>}
      {pullStatus === 'success' && <div className="text-green-400 font-mono text-[9px] uppercase border border-green-400/30 bg-green-400/5 p-2 rounded max-w-xs shrink-0 select-text">{pullMessage}</div>}

      <div className="flex gap-2 shrink-0">
        <button onClick={fetchOllamaModels} className="px-3 py-1.5 rounded border border-[rgba(var(--primary-rgb),0.4)] text-[var(--primary-color)] text-[8px] font-bold active:scale-95 transition-transform uppercase">Scan Local Models / Refresh</button>
        {ollamaModels.length > 0 && <button onClick={onClose} className="px-3 py-1.5 rounded border border-[rgba(var(--primary-rgb),0.2)] text-[rgba(var(--primary-rgb),0.7)] text-[8px] font-bold active:scale-95 transition-transform uppercase hover:bg-[rgba(var(--primary-rgb),0.1)]">Close Manager / Back to Chat</button>}
      </div>
    </div>
  )
}
