import React, { useState } from 'react'

export default function DnsProber({ glassBg }) {
  const [domain, setDomain] = useState('google.com')
  const [recordType, setRecordType] = useState('A')
  const [loading, setLoading] = useState(false)
  const [dnsResults, setDnsResults] = useState(null)
  const [pingLatency, setPingLatency] = useState(null)
  const [pinging, setPinging] = useState(false)
  const [pingHistory, setPingHistory] = useState([])

  const resolveDns = async () => {
    if (!domain) return
    setLoading(true)
    setDnsResults(null)
    try {
      const cleanDomain = domain.trim().replace(/^https?:\/\//i, '').split('/')[0]
      const url = `https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=${recordType}`
      const res = await fetch(url)
      const data = await res.json()
      setDnsResults(data)
    } catch (e) {
      setDnsResults({ error: 'DNS resolution failed: ' + e.message })
    } finally {
      setLoading(false)
    }
  }

  const runPing = async () => {
    if (!domain) return
    setPinging(true)
    const cleanDomain = domain.trim().replace(/^https?:\/\//i, '').split('/')[0]
    const pings = []

    for (let i = 0; i < 4; i++) {
      const start = performance.now()
      try {
        await fetch(`https://${cleanDomain}/favicon.ico?_r=${Date.now()}_${i}`, { mode: 'no-cors', cache: 'no-store' })
        const duration = Math.round(performance.now() - start)
        pings.push(duration)
      } catch (_) {
        const duration = Math.round(performance.now() - start)
        pings.push(duration)
      }
      setPingHistory([...pings])
      await new Promise(r => setTimeout(r, 200))
    }

    const avg = Math.round(pings.reduce((a, b) => a + b, 0) / pings.length)
    setPingLatency(avg)
    setPinging(false)
  }

  return (
    <div className="space-y-4 font-mono-data text-xs">
      {/* Target Domain Input */}
      <div className="p-4 rounded-xl border border-white/10 space-y-3" style={{ backgroundColor: glassBg }}>
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] text-white/50 tracking-widest uppercase font-bold">TARGET HOST / DOMAIN</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={domain}
              onChange={e => setDomain(e.target.value)}
              placeholder="e.g. google.com or 1.1.1.1"
              className="flex-1 bg-black/50 border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
            />
            <button
              onClick={runPing}
              disabled={pinging || !domain}
              className="px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-[10px] uppercase tracking-wider font-bold transition-all disabled:opacity-50 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-xs">network_ping</span>
              {pinging ? 'PINGING' : 'PING'}
            </button>
          </div>
        </div>

        {/* Record Type Selectors */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {['A', 'AAAA', 'MX', 'TXT', 'CNAME', 'NS'].map(t => (
            <button
              key={t}
              onClick={() => setRecordType(t)}
              className={`px-3 py-1 rounded text-[10px] font-mono tracking-wider transition-all border ${
                recordType === t
                  ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 font-bold'
                  : 'bg-black/30 border-white/5 text-white/50 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
          <button
            onClick={resolveDns}
            disabled={loading || !domain}
            className="ml-auto px-4 py-1 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded text-[10px] tracking-widest uppercase transition-all disabled:opacity-50"
          >
            {loading ? 'QUERYING...' : 'RESOLVE DNS'}
          </button>
        </div>
      </div>

      {/* Ping Results Banner */}
      {pingHistory.length > 0 && (
        <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400 text-base">speed</span>
            <div>
              <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">Round-Trip Latency:</span>
              <p className="text-[9px] text-white/60">Packets: {pingHistory.map(p => `${p}ms`).join(', ')}</p>
            </div>
          </div>
          {pingLatency !== null && (
            <div className="text-right">
              <span className="text-lg font-bold font-mono text-emerald-400">{pingLatency}ms</span>
              <span className="block text-[8px] text-white/40 uppercase">Average</span>
            </div>
          )}
        </div>
      )}

      {/* DNS Results Display */}
      {dnsResults && (
        <div className="p-4 rounded-xl border border-white/10 bg-black/40 space-y-2">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-[10px] text-cyan-400 font-bold tracking-widest uppercase">DNS ANSWERS ({recordType})</span>
            <span className="text-[9px] text-white/40">Status: {dnsResults.Status === 0 ? 'NOERROR (0)' : `CODE ${dnsResults.Status}`}</span>
          </div>

          {dnsResults.error ? (
            <p className="text-red-400 text-xs py-2">{dnsResults.error}</p>
          ) : !dnsResults.Answer || dnsResults.Answer.length === 0 ? (
            <p className="text-white/40 text-xs py-2">No {recordType} records found for {domain}.</p>
          ) : (
            <div className="space-y-1.5 pt-1">
              {dnsResults.Answer.map((ans, idx) => (
                <div key={idx} className="p-2 rounded bg-white/5 border border-white/5 flex items-center justify-between text-xs">
                  <span className="font-mono text-white/90 truncate max-w-[240px]">{ans.data}</span>
                  <span className="text-[9px] font-mono text-white/40">TTL {ans.TTL}s</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
