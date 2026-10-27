import React, { useState, useEffect, useCallback } from 'react'
import { fetchZeroScreenFeed } from '../utils/zeroScreenData'

export default function ZeroScreen({ onNavigate, isAppActive }) {
  const [quote, setQuote] = useState("Loading quote...")
  const [briefing, setBriefing] = useState("Generating daily briefing...")
  const [newsStories, setNewsStories] = useState([])
  const [refreshing, setRefreshing] = useState(false)

  const refreshAll = useCallback(async () => {
    setRefreshing(true)
    try {
      const data = await fetchZeroScreenFeed()
      if (data.quote) setQuote(data.quote)
      if (data.briefing) setBriefing(data.briefing)
      if (data.news) setNewsStories(data.news)
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (!isAppActive) return
    refreshAll()
  }, [isAppActive])

  const handleTouchStart = useCallback((e) => {
    e.currentTarget._startY = e.touches[0].clientY
  }, [])

  const handleTouchEnd = useCallback((e) => {
    const dy = e.changedTouches[0].clientY - (e.currentTarget._startY || 0)
    if (dy > 100 && !refreshing) refreshAll()
  }, [refreshing, refreshAll])

  return (
    <div
      className="flex-1 flex flex-col pt-14 pb-28 px-6 bg-black/40 overflow-y-auto z-10 animate-in slide-in-from-left duration-300"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex items-center justify-between mb-8 mt-4">
        <h1 className="text-2xl font-bold tracking-widest text-[#00f2ff] uppercase font-headline-lg drop-shadow-[0_0_15px_rgba(0,242,255,0.5)]">ZERO SCREEN</h1>
        <div className="flex items-center gap-2">
          <button onClick={refreshAll} disabled={refreshing} className="material-symbols-outlined text-white/50 hover:text-white transition-colors disabled:animate-spin">refresh</button>
          <button onClick={() => onNavigate('home')} className="material-symbols-outlined text-white/50 hover:text-white transition-colors">close</button>
        </div>
      </div>

      <div className="space-y-6 max-w-lg mx-auto w-full">
        {/* AI Daily Briefing + Hot News Topics */}
        <div className="glass-surface border border-[#ff007f]/30 p-5 rounded-2xl shadow-[0_0_20px_rgba(255,0,127,0.1)]">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-[#ff007f] animate-pulse">memory</span>
            <h3 className="font-bold text-[10px] tracking-widest uppercase text-[#ff007f]/80 font-mono-data">AI Daily Briefing</h3>
          </div>
          <p className="font-mono-data text-xs text-white/90 leading-relaxed tracking-wide uppercase mb-4">{briefing}</p>

          {/* 5 Hot Daily News Radar */}
          <div className="pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[#00f2ff] text-sm">trending_up</span>
              <h4 className="font-bold text-[9px] tracking-widest uppercase text-[#00f2ff] font-mono-data">5 POPULAR HOT NEWS TOPICS</h4>
            </div>
            <div className="space-y-2.5">
              {newsStories.map((story, idx) => (
                <a
                  key={story.id || idx}
                  href={story.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-2.5 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
                >
                  <span className="font-mono-data text-[10px] font-bold text-[#00f2ff] bg-[#00f2ff]/10 w-5 h-5 rounded-md flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono-data text-[10px] text-white/90 group-hover:text-[#00f2ff] transition-colors leading-tight line-clamp-2 uppercase">
                      {story.title}
                    </p>
                    {story.score > 0 && (
                      <span className="font-mono-data text-[8px] text-white/40 mt-0.5 block">
                        ▲ {story.score} POINTS
                      </span>
                    )}
                  </div>
                  <span className="material-symbols-outlined text-[12px] text-white/30 group-hover:text-white transition-colors shrink-0 mt-0.5">open_in_new</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Quote of the Day */}
        <div className="glass-surface border border-white/10 p-5 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-white/50">format_quote</span>
            <h3 className="font-bold text-[10px] tracking-widest uppercase text-white/50 font-mono-data">Quote of the Day</h3>
          </div>
          <p className="font-mono-data text-[11px] text-white/80 italic leading-relaxed uppercase">{quote}</p>
        </div>

        <p className="text-center text-[8px] text-white/20 font-mono-data tracking-widest">PULL DOWN TO REFRESH // SWIPE RIGHT TO RETURN</p>
      </div>
    </div>
  )
}
