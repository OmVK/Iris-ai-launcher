import { useState, useEffect } from 'react'
import { useAIStore } from '../../stores/aiStore'
import { SecureStorage } from '../../utils/secureStorage'
import { GenAI } from '../../components/GenAIPlugin'
import { checkAllBackends, getBackendStatus, getBackendError } from '../../utils/AIProviderManager'

const BACKEND_NAMES = { ONDEVICE: 'Gemini Nano', GEMINI: 'Google Gemini', GROQ: 'Groq LPU', NVIDIA: 'NVIDIA NIM', OLLAMA: 'Ollama Local' }

export default function DiagnosticsTerminal({ onClose }) {
  const [diagRunning, setDiagRunning] = useState(false)
  const [diagLogs, setDiagLogs] = useState([])
  const [diagMetrics, setDiagMetrics] = useState({ ttft: 0, speed: 0, status: 'AWAITING_TRIGGER' })
  const [backendHealth, setBackendHealth] = useState(null)

  useEffect(() => {
    const load = async () => {
      const results = await checkAllBackends()
      setBackendHealth(results)
    }
    load()
  }, [])

  const runSelfDiagnostics = async () => {
    setDiagRunning(true); setDiagLogs([]); setDiagMetrics({ ttft: 0, speed: 0, status: 'RUNNING' })
    const addLog = (msg) => setDiagLogs(prev => [...prev, msg])

    addLog('[SYSTEM_CHECK] Initiating IRIS cognitive health diagnostic...')
    await new Promise(r => setTimeout(r, 300))
    addLog('[SYSTEM_CHECK] Checking all backend connectivity...')

    const results = await checkAllBackends(true)
    setBackendHealth(results)

    for (const [backend, info] of Object.entries(results)) {
      const icon = info.available ? '●' : '○'
      const status = info.available ? 'ONLINE' : 'OFFLINE'
      addLog(`[${icon}] ${BACKEND_NAMES[backend]}: ${status}${info.error ? ` (${info.error})` : ''}`)
    }
    await new Promise(r => setTimeout(r, 200))

    const { llmBackend: backend } = useAIStore.getState()
    addLog(`\n[ACTIVE] Primary backend: ${backend}`)
    const status = getBackendStatus(backend)
    if (status !== 'online') {
      const chain = ['ONDEVICE', 'GEMINI', 'GROQ', 'NVIDIA', 'OLLAMA']
        .filter(b => getBackendStatus(b) === 'online')
      if (chain.length > 0) {
        addLog(`[FALLBACK] Recommended chain: ${chain.join(' → ')}`)
      }
    }

    const keyMap = { GEMINI: 'gemini_api_key', GROQ: 'groq_api_key', NVIDIA: 'nvidia_api_key' }
    const apiKey = await SecureStorage.getItem(keyMap[backend] || '')
    if (!apiKey && backend !== 'OLLAMA' && backend !== 'ONDEVICE') { addLog('[ERROR] No API key found for active backend: ' + backend); setDiagMetrics({ ttft: 0, speed: 0, status: 'FAILED' }); setDiagRunning(false); return }

    addLog(`[SYSTEM_CHECK] Active backend: ${backend} | Key: ${apiKey ? 'FOUND' : 'MISSING'}`)
    await new Promise(r => setTimeout(r, 200))

    const startTime = Date.now()
    addLog('[METRIC] Sending probe prompt...')
    try {
      let testRes
      if (backend === 'GEMINI') {
        testRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': (apiKey || '') }, body: JSON.stringify({ contents: [{ parts: [{ text: 'Say "pong"' }] }] })
        })
      } else if (backend === 'GROQ') {
        testRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: 'Say "pong"' }], max_tokens: 10 })
        })
      } else if (backend === 'NVIDIA') {
        testRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
          method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'meta/llama-3.1-70b-instruct', messages: [{ role: 'user', content: 'Say "pong"' }], max_tokens: 10 })
        })
      } else if (backend === 'ONDEVICE') {
        addLog('[SYSTEM_CHECK] Testing on-device Gemini Nano inference...')
        try {
          const result = await GenAI.generateText('Say "pong"', { maxTokens: 10 })
          const ttft = Date.now() - startTime
          if (result.text) { addLog(`[METRIC] TTFT: ${ttft}ms | Response: ${result.text.substring(0, 50)} | Status: HEALTHY`); setDiagMetrics({ ttft, speed: Math.round(1000 / ttft * 100) / 100, status: 'HEALTHY' }) }
          else { addLog('[ERROR] On-device inference returned empty'); setDiagMetrics({ ttft, speed: 0, status: 'DEGRADED' }) }
        } catch (e) { addLog(`[ERROR] On-device inference failed: ${e.message}`); setDiagMetrics({ ttft: 0, speed: 0, status: 'OFFLINE' }) }
        setDiagRunning(false); return
      } else { addLog(`[SYSTEM_CHECK] Backend ${backend} not testable via probe.`); setDiagMetrics({ ttft: 0, speed: 0, status: 'UNKNOWN' }); setDiagRunning(false); return }

      const ttft = Date.now() - startTime
      if (testRes.ok) { addLog(`[METRIC] TTFT: ${ttft}ms | Status: HEALTHY`); setDiagMetrics({ ttft, speed: Math.round(1000 / ttft * 100) / 100, status: 'HEALTHY' }) }
      else { addLog(`[ERROR] Backend returned HTTP ${testRes.status}`); setDiagMetrics({ ttft, speed: 0, status: 'DEGRADED' }) }
    } catch (e) { addLog(`[ERROR] Connectivity check failed: ${e.message}`); setDiagMetrics({ ttft: 0, speed: 0, status: 'OFFLINE' }) }

    addLog('[SYSTEM_CHECK] Checking voice subsystem...')
    addLog(`[SYSTEM_CHECK] SpeechSynthesis: ${window.speechSynthesis ? 'AVAILABLE' : 'UNAVAILABLE'}`)
    addLog('[SYSTEM_CHECK] Diagnostic complete.')
    setDiagRunning(false)
  }

  return (
    <div className="pb-3 shrink-0 animate-in slide-in-from-top duration-300">
      <div className="glass-surface border border-[#00f2ff]/40 rounded-xl p-4 font-mono-data text-[10px] space-y-3 shadow-[0_0_20px_rgba(0,242,255,0.15)] bg-[#020617]/95 relative overflow-hidden">
        <div className="scan-line opacity-15" />
        <div className="flex justify-between items-center pb-1.5 border-b border-white/5">
          <span className="text-[#00f2ff] font-bold tracking-widest uppercase flex items-center gap-1.5">
            <span className="material-symbols-outlined text-xs animate-spin">monitoring</span>NEURAL DIAGNOSTICS DECK // SYSTEM SELF-TEST
          </span>
          <button onClick={onClose} className="text-on-surface-variant/40 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-xs">close</span>
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2.5 text-center text-[9px] py-1 border-b border-white/5">
          <div className="bg-black/30 p-2 rounded border border-white/5"><span className="text-on-surface-variant/40 block">GENERATION_THROUGHPUT</span><strong className="text-white text-xs block mt-0.5">{diagMetrics.speed} t/s</strong></div>
          <div className="bg-black/30 p-2 rounded border border-white/5"><span className="text-on-surface-variant/40 block">FIRST_TOKEN_LATENCY</span><strong className="text-white text-xs block mt-0.5">{diagMetrics.ttft} ms</strong></div>
          <div className="bg-black/30 p-2 rounded border border-white/5"><span className="text-on-surface-variant/40 block">SYS_STATUS_READOUT</span><strong className={`text-xs block mt-0.5 ${diagMetrics.status.includes('COMPROMISED') ? 'text-error' : 'text-[#00f2ff]'}`}>{diagMetrics.status.split(' / ')[0]}</strong></div>
        </div>
        {backendHealth && (
          <div className="grid grid-cols-5 gap-1.5 text-center text-[8px] py-1 border-b border-white/5">
            {Object.entries(backendHealth).map(([backend, info]) => (
              <div key={backend} className={`p-1.5 rounded border ${info.available ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                <div className={`w-2 h-2 rounded-full mx-auto mb-1 ${info.available ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span className="text-on-surface-variant/60 block">{BACKEND_NAMES[backend]}</span>
                <strong className={`block mt-0.5 ${info.available ? 'text-emerald-400' : 'text-red-400'}`}>{info.available ? 'ON' : 'OFF'}</strong>
              </div>
            ))}
          </div>
        )}
        <div className="bg-black/50 border border-white/5 rounded p-2.5 h-28 overflow-y-auto scroll-container font-mono text-[8px] text-[#dfe2ef]/80 space-y-1">
          {diagLogs.map((log, i) => (
            <div key={i} className={log.includes('[ERROR]') ? 'text-error font-bold' : log.includes('[METRIC]') ? 'text-[#00f2ff] font-bold' : log.includes('[SYSTEM_CHECK]') ? 'text-green-400 font-bold' : ''}>{log}</div>
          ))}
          {diagRunning && <div className="text-[#00f2ff] animate-pulse">&gt; GENERATING TELEMETRY SAMPLES...</div>}
        </div>
        <div className="flex gap-2">
          <button onClick={runSelfDiagnostics} disabled={diagRunning} className="flex-grow py-1.5 bg-[#00f2ff]/10 border border-[#00f2ff]/30 text-[#00f2ff] font-bold rounded hover:bg-[#00f2ff]/20 active:scale-[0.98] transition-all">RE-RUN HEALTH DIAGNOSTIC</button>
          <button onClick={onClose} className="px-3.5 py-1.5 bg-[#00f2ff]/5 border border-[#00f2ff]/15 text-[#00f2ff]/60 hover:text-[#00f2ff] rounded text-[9px] font-bold">CLOSE</button>
        </div>
      </div>
    </div>
  )
}
