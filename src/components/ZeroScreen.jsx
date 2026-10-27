import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { fetchZeroScreenFeed } from '../utils/zeroScreenData'
import { useNotificationStore } from '../stores/notificationStore'
import { launchApp } from './LauncherPlugin'
import HapticFeedback from '../utils/HapticFeedback'

export default function ZeroScreen({ onNavigate, isAppActive }) {
  const [activeTab, setActiveTab] = useState('briefing')
  const [searchQuery, setSearchQuery] = useState('')
  const [quote, setQuote] = useState("Loading quote...")
  const [briefing, setBriefing] = useState("Generating daily briefing...")
  const [newsStories, setNewsStories] = useState([])
  const [refreshing, setRefreshing] = useState(false)

  const { history, clearHistory, deleteHistoryItem } = useNotificationStore()

  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return history
    const q = searchQuery.toLowerCase()
    return history.filter(item => 
      (item.title || '').toLowerCase().includes(q) ||
      (item.text || '').toLowerCase().includes(q) ||
      (item.appName || '').toLowerCase().includes(q)
    )
  }, [history, searchQuery])

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
    if (dy > 100 && !refreshing && activeTab === 'briefing') refreshAll()
  }, [refreshing, refreshAll, activeTab])

  return (
    <div
      className="flex-1 flex flex-col pt-14 pb-28 px-6 bg-black/40 overflow-y-auto z-10 animate-in slide-in-from-left duration-300"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex items-center justify-between mb-4 mt-4">
        <h1 className="text-2xl font-bold tracking-widest text-[#00f2ff] uppercase font-headline-lg drop-shadow-[0_0_15px_rgba(0,242,255,0.5)]">ZERO SCREEN</h1>
        <div className="flex items-center gap-2">
          {activeTab === 'briefing' && (
            <button onClick={refreshAll} disabled={refreshing} className="material-symbols-outlined text-white/50 hover:text-white transition-colors disabled:animate-spin">refresh</button>
          )}
          <button onClick={() => onNavigate('home')} className="material-symbols-outlined text-white/50 hover:text-white transition-colors">close</button>
        </div>
      </div>

      {/* Mode Tabs: Daily Radar vs Message Archive (Even if deleted) */}
      <div className="flex items-center gap-2 max-w-lg mx-auto w-full mb-6 select-none">
        <button
          onClick={() => { setActiveTab('briefing'); HapticFeedback.light() }}
          className={`flex-1 py-2 px-3 rounded-xl font-mono-data text-xs font-bold tracking-wider transition-all border flex items-center justify-center gap-1.5 ${
            activeTab === 'briefing'
              ? 'bg-[#00f2ff]/20 text-[#00f2ff] border-[#00f2ff]/40 shadow-[0_0_12px_rgba(0,242,255,0.2)]'
              : 'bg-white/[0.03] text-white/50 border-white/10 hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-sm">radar</span>
          <span>BRIEFING & RADAR</span>
        </button>
        <button
          onClick={() => { setActiveTab('history'); HapticFeedback.light() }}
          className={`flex-1 py-2 px-3 rounded-xl font-mono-data text-xs font-bold tracking-wider transition-all border flex items-center justify-center gap-1.5 ${
            activeTab === 'history'
              ? 'bg-[#ff007f]/20 text-[#ff007f] border-[#ff007f]/40 shadow-[0_0_12px_rgba(255,0,127,0.2)]'
              : 'bg-white/[0.03] text-white/50 border-white/10 hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-sm">history_edu</span>
          <span>MESSAGE ARCHIVE ({history.length})</span>
        </button>
      </div>

      <div className="space-y-6 max-w-lg mx-auto w-full">
        {activeTab === 'briefing' ? (
          <>
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
          </>
        ) : (
          /* Persistent Notification History Section (Even If Deleted) */
          <div className="space-y-4">
            {/* Search and Clear bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-white/30 text-base">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search historical messages..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-white font-mono-data placeholder:text-white/30 focus:outline-none focus:border-primary-fixed/50"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2.5 text-white/40 hover:text-white">
                    <span className="material-symbols-outlined text-xs">close</span>
                  </button>
                )}
              </div>

              {history.length > 0 && (
                <button
                  onClick={() => { HapticFeedback.double(); clearHistory() }}
                  className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-[10px] font-mono-data font-bold transition-colors shrink-0"
                >
                  CLEAR ALL
                </button>
              )}
            </div>

            {/* History List */}
            {filteredHistory.length === 0 ? (
              <div className="glass-surface border border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-2">
                <span className="material-symbols-outlined text-white/20 text-4xl">mark_email_read</span>
                <h4 className="text-xs font-bold text-white/60 tracking-wider uppercase font-mono-data">
                  {searchQuery ? 'NO MATCHING MESSAGES' : 'ARCHIVE IS EMPTY'}
                </h4>
                <p className="text-[10px] text-white/30 max-w-xs font-mono-data leading-relaxed">
                  {searchQuery 
                    ? 'No intercepted messages match your search filter.' 
                    : 'All notifications received on your device will automatically be saved here permanently — even after you dismiss or delete them from the Android status bar.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredHistory.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (item.packageId) {
                        HapticFeedback.light()
                        launchApp(item.packageId)
                      }
                    }}
                    className="glass-surface border border-white/10 hover:border-white/20 rounded-2xl p-4 transition-all cursor-pointer relative overflow-hidden group select-none active:scale-[0.99]"
                    style={{
                      boxShadow: `inset 3px 0 0 ${item.color || '#00f2ff'}`
                    }}
                  >
                    <div className="flex items-start gap-3">
                      {/* App Avatar */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-md"
                        style={{
                          backgroundColor: `${item.color}22`,
                          borderColor: `${item.color}55`,
                          color: item.color
                        }}
                      >
                        <span className="material-symbols-outlined text-xl">{item.icon || 'notifications'}</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span 
                              className="text-[10px] font-bold uppercase tracking-wider truncate"
                              style={{ color: item.color }}
                            >
                              {item.appName}
                            </span>
                            <span className="text-[8px] text-white/40">•</span>
                            <span className="text-xs font-semibold text-white/95 truncate">
                              {item.title}
                            </span>
                          </div>
                          <span className="text-[9px] text-white/40 shrink-0 font-mono-data">
                            {item.time}
                          </span>
                        </div>

                        <p className="text-xs text-white/80 leading-relaxed font-sans break-words mb-2">
                          {item.text}
                        </p>

                        <div className="flex items-center justify-between pt-2 border-t border-white/5 font-mono-data text-[8.5px]">
                          <span className="text-[#00f2ff]/70 tracking-wider">
                            PRESERVED • {item.date}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                HapticFeedback.selection()
                                deleteHistoryItem(item.id)
                              }}
                              className="text-white/30 hover:text-red-400 p-1 transition-colors"
                              title="Delete from archive"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                            <span className="material-symbols-outlined text-xs text-white/30 group-hover:text-primary-fixed transition-colors">
                              open_in_new
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
