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
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center font-mono-data text-xs space-y-5 bg-[#0a0e17]/80 backdrop-blur-md overflow-y-auto scroll-container">
      <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
        <div className="absolute inset-0 border border-dashed border-[#00f2ff]/40 rounded-full animate-spin duration-10000" />
        <div className="absolute inset-2 border border-[#00f2ff]/60 rounded-full animate-iris-rotate" />
        <div className="absolute inset-4 border border-dashed border-primary-fixed-dim/30 rounded-full animate-spin duration-3000" />
        <span className="material-symbols-outlined text-3xl text-[#00f2ff] animate-pulse">downloading</span>
      </div>

      <div className="space-y-2 max-w-sm shrink-0">
        <h3 className="font-headline-lg text-sm text-[#00f2ff] tracking-wider uppercase">OLLAMA NEURAL MATRIX</h3>
        <p className="text-[9px] text-on-surface-variant/70 uppercase">
          {pullStatus === 'pulling' ? `Downloading weights for model "${pullModelName}" to Ollama local server.` : "Model manager and diagnostic deck. Select a recommended model below to download."}
        </p>
      </div>

      {pullStatus === 'pulling' && (
        <div className="w-full max-w-xs glass-surface border border-outline-variant/30 rounded-xl p-3.5 space-y-2.5 text-[8.5px] text-left shrink-0">
          <div className="flex justify-between"><span className="text-on-surface-variant/50">MODEL_TAG:</span><span className="text-[#00f2ff] font-bold select-all truncate pr-1" style={{ maxWidth: '170px' }}>{pullModelName}</span></div>
          <div className="flex justify-between"><span className="text-on-surface-variant/50">STATUS:</span><span className="text-[#00f2ff] uppercase animate-pulse">{pullMessage || 'downloading...'}</span></div>
          <div className="space-y-1">
            <div className="flex justify-between font-bold"><span className="text-on-surface-variant/50">INGESTION_SPEED:</span><span className="text-[#00f2ff]">{pullProgress}%</span></div>
            <div className="w-full h-1.5 bg-outline-variant/30 rounded-full overflow-hidden">
              <div className="h-full bg-[#00f2ff] shadow-[0_0_8px_rgba(0,242,255,0.5)] transition-all duration-300" style={{ width: `${pullProgress}%` }} />
            </div>
          </div>
        </div>
      )}

      {pullStatus !== 'pulling' && (
        <div className="w-full max-w-lg space-y-3 shrink-0">
          <div className="text-[9px] text-[#00f2ff] font-bold tracking-widest uppercase flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[12px]">memory</span>HARDWARE-AWARE RECOMMENDATION DECK (DETECTED TIER: {tier.toUpperCase()})
          </div>
          <div className="grid grid-cols-2 gap-2 text-left">
            {OLLAMA_RECOMMENDED_MODELS.map(m => {
              const isRec = m.tier === tier
              return (
                <div key={m.id} onClick={() => { setPullModelName(m.id); pullModel(m.id) }}
                  className={`p-2.5 rounded-lg border cursor-pointer active:scale-[0.98] transition-all flex flex-col justify-between h-20 ${isRec ? 'bg-[#00f2ff]/5 border-[#00f2ff]/40 hover:bg-[#00f2ff]/10' : 'bg-black/35 border-outline-variant/20 hover:bg-black/50 text-on-surface-variant/70'}`}>
                  <div>
                    <div className="flex justify-between items-center">
                      <span className={`font-bold text-[9px] truncate ${isRec ? 'text-[#00f2ff]' : 'text-white'}`}>{m.id}</span>
                      {isRec && <span className="bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 px-1 py-0.2 rounded text-[6px] font-bold font-label-caps shrink-0">REC</span>}
                    </div>
                    <p className="text-[7.5px] text-white/50 line-clamp-2 mt-1">{m.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="glass-surface border border-outline-variant/20 rounded-xl p-3 max-w-sm mx-auto space-y-2">
            <span className="text-[8px] text-on-surface-variant/60 block uppercase">PULL CUSTOM OLLAMA TAG (e.g. deepseek-r1:1.5b)</span>
            <div className="flex gap-1.5">
              <input type="text" value={pullModelName} onChange={e => setPullModelName(e.target.value)} placeholder="model_name:tag"
                className="flex-1 bg-black/45 border border-outline-variant/30 rounded px-2 py-1 text-[9px] text-[#00f2ff] focus:outline-none focus:border-[#00f2ff]" />
              <button onClick={() => pullModel(pullModelName)}
                className="px-3 bg-[#00f2ff]/15 border border-[#00f2ff]/35 text-[#00f2ff] hover:bg-[#00f2ff]/25 rounded text-[8px] font-bold font-mono-data active:scale-95 transition-transform">PULL</button>
            </div>
          </div>
        </div>
      )}

      {pullStatus === 'error' && <div className="text-error font-mono text-[9px] uppercase border border-error/30 bg-error/5 p-2 rounded max-w-xs shrink-0 select-text animate-pulse">{pullMessage}</div>}
      {pullStatus === 'success' && <div className="text-green-400 font-mono text-[9px] uppercase border border-green-400/30 bg-green-400/5 p-2 rounded max-w-xs shrink-0 select-text">{pullMessage}</div>}

      <div className="flex gap-2 shrink-0">
        <button onClick={fetchOllamaModels} className="px-3 py-1.5 rounded border border-[#00f2ff]/40 text-[#00f2ff] text-[8px] font-bold active:scale-95 transition-transform uppercase">Scan Local Models / Refresh</button>
        {ollamaModels.length > 0 && <button onClick={onClose} className="px-3 py-1.5 rounded border border-white/20 text-white text-[8px] font-bold active:scale-95 transition-transform uppercase">Close Manager / Back to Chat</button>}
      </div>
    </div>
  )
}
