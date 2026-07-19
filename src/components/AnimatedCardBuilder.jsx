import React, { useState, useEffect } from 'react'

export default function AnimatedCardBuilder({ codePayload }) {
  const [activeTab, setActiveTab] = useState('preview')
  const [iframeSrc, setIframeSrc] = useState('')

  const DEFAULT_PAYLOAD = `<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
  <style>
    body { background: transparent; margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; overflow: hidden; }
    .card { background: rgba(28, 31, 41, 0.85); backdrop-filter: blur(20px); border: 1px solid rgba(0, 242, 255, 0.4); box-shadow: 0 0 25px rgba(0,242,255,0.2); }
  </style>
</head>
<body>
  <div class="card p-6 rounded-2xl w-72 text-center text-white font-mono flex flex-col items-center">
    <div class="glow-orb w-16 h-16 rounded-full bg-cyan-400 opacity-80 flex items-center justify-center shadow-lg shadow-cyan-500/50 mb-4">
      <span style="font-size: 24px;">✦</span>
    </div>
    <h3 class="text-md font-bold tracking-widest text-cyan-400">GSAP AGENTIC NODE</h3>
    <p class="text-[10px] text-gray-400 mt-2">AUTONOMOUS VECTOR GRAPH COMPILED ON THE FLY</p>
    <div class="mt-4 flex gap-1.5">
      <span class="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded text-[8px] border border-cyan-400/20">TAILWIND</span>
      <span class="px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded text-[8px] border border-purple-400/20">GSAP</span>
    </div>
  </div>

  <script>
    gsap.from(".glow-orb", { scale: 0.5, opacity: 0.3, duration: 1.5, repeat: -1, yoyo: true, ease: "power1.inOut" });
    gsap.from(".card", { y: 100, opacity: 0, duration: 1, ease: "back.out(1.7)" });
  </script>
</body>
</html>`

  const payload = codePayload || DEFAULT_PAYLOAD

  useEffect(() => {
    // Generate sandboxed iframe source URL
    const blob = new Blob([payload], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    setIframeSrc(url)

    return () => URL.revokeObjectURL(url)
  }, [payload])

  return (
    <div className="glass-surface glass-border rounded-xl p-4 flex flex-col h-full font-mono-data text-xs text-[#dfe2ef] min-h-[300px]">
      {/* Code Editor Header */}
      <div className="flex justify-between items-center pb-2 border-b border-white/5 mb-3">
        <h3 className="font-label-caps text-label-caps text-primary-fixed-dim">GSAP / TAILWIND AGENTIC RENDERER</h3>
        <div className="flex gap-1.5">
          <button 
            onClick={() => setActiveTab('preview')}
            className={`px-2 py-0.5 rounded text-[8px] font-bold border transition-all ${
              activeTab === 'preview' 
                ? 'bg-primary-fixed-dim/20 text-primary-fixed-dim border-primary-fixed-dim/30 shadow-[0_0_8px_rgba(var(--primary-rgb),0.2)]' 
                : 'bg-black/30 border-outline-variant/30 text-on-surface-variant/40 hover:text-white'
            }`}
          >
            LIVE_VIEW
          </button>
          <button 
            onClick={() => setActiveTab('source')}
            className={`px-2 py-0.5 rounded text-[8px] font-bold border transition-all ${
              activeTab === 'source' 
                ? 'bg-primary-fixed-dim/20 text-primary-fixed-dim border-primary-fixed-dim/30 shadow-[0_0_8px_rgba(var(--primary-rgb),0.2)]' 
                : 'bg-black/30 border-outline-variant/30 text-on-surface-variant/40 hover:text-white'
            }`}
          >
            CODE_SOURCE
          </button>
        </div>
      </div>

      {/* Dynamic Content Frame */}
      <div className="flex-1 min-h-0 bg-black/45 border border-white/5 rounded-lg overflow-hidden relative flex">
        {activeTab === 'preview' ? (
          iframeSrc ? (
            <iframe 
              src={iframeSrc} 
              className="w-full h-full border-none bg-transparent"
              title="Agentic GSAP Card Preview"
              sandbox="allow-scripts"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-on-surface-variant/40 italic">
              COMPILING VECTOR SCHEMATIC...
            </div>
          )
        ) : (
          <textarea
            readOnly
            value={payload}
            className="w-full h-full p-3 bg-black/30 border-none resize-none font-mono-data text-[9px] text-[#00f2ff]/80 select-all focus:outline-none focus:ring-0 leading-relaxed scroll-container"
          />
        )}
      </div>

      {/* Diagnostic Ticker Footer */}
      <div className="mt-3 pt-2 border-t border-white/5 flex justify-between items-center text-[8px] text-on-surface-variant/50">
        <span>GSAP_CORE: 3.12.5 LOADED</span>
        <span>STATUS: ACTIVE RENDER</span>
        <span>SIZE: {payload.length} BYTES</span>
      </div>
    </div>
  )
}
