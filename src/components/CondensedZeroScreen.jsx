import React, { useState, useEffect, useCallback } from 'react'
import { fetchZeroScreenFeed } from '../utils/zeroScreenData'

export default function CondensedZeroScreen({ onNavigate, onClose }) {
  const [data, setData] = useState({ briefing: 'Loading telemetry briefing...', news: [], quote: '' })
  const [loading, setLoading] = useState(true)

  const loadFeed = useCallback(async () => {
    setLoading(true)
    try {
      const feed = await fetchZeroScreenFeed()
      setData(feed)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFeed()
  }, [loadFeed])

  const handleOpenFull = () => {
    if (typeof onClose === 'function') onClose()
    if (typeof onNavigate === 'function') onNavigate('zero_screen')
  }

  return (
    <div className="w-full flex flex-col h-full overflow-y-auto no-scrollbar space-y-2.5 pt-1 text-left select-none">
      <div className="flex items-center justify-between pb-1.5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[#ff007f] animate-pulse text-[14px]">memory</span>
          <span className="font-mono-data text-[9px] font-bold text-[#ff007f] tracking-widest uppercase">
            ZERO // DAILY RADAR
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={loadFeed}
            disabled={loading}
            className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <span className={`material-symbols-outlined text-[13px] ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
          </button>
          <button
            onClick={handleOpenFull}
            className="px-2 py-0.5 rounded bg-primary-fixed-dim/20 hover:bg-primary-fixed-dim/30 border border-primary-fixed-dim/40 text-primary-fixed-dim font-mono-data text-[8px] font-bold tracking-wider flex items-center gap-1 transition-colors"
          >
            <span>FULL</span>
            <span className="material-symbols-outlined text-[10px]">open_in_new</span>
          </button>
        </div>
      </div>

      <div className="glass-surface border border-white/5 rounded-lg p-2 bg-black/40">
        <p className="font-mono-data text-[9px] text-white/90 leading-relaxed uppercase">
          {data.briefing}
        </p>
      </div>

      {data.news && data.news.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[#00f2ff] text-[11px]">trending_up</span>
            <span className="font-mono-data text-[8px] font-bold text-[#00f2ff] tracking-wider uppercase">
              TOP HEADLINES
            </span>
          </div>
          <div className="space-y-1">
            {data.news.slice(0, 3).map((item, idx) => (
              <a
                key={item.id || idx}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2 p-1.5 rounded bg-white/5 hover:bg-white/10 transition-colors border border-white/5 text-left"
              >
                <span className="font-mono-data text-[8px] font-bold text-[#00f2ff] bg-[#00f2ff]/10 w-4 h-4 rounded flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span className="font-mono-data text-[8.5px] text-white/80 line-clamp-1 flex-1 uppercase">
                  {item.title}
                </span>
                <span className="material-symbols-outlined text-[10px] text-white/30 shrink-0">
                  north_east
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {data.quote && (
        <div className="border-t border-white/5 pt-1.5">
          <p className="font-mono-data text-[8px] text-white/50 italic uppercase leading-tight line-clamp-2">
            {data.quote}
          </p>
        </div>
      )}
    </div>
  )
}
