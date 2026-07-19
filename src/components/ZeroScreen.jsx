import React, { useState, useEffect, useCallback } from 'react'
import { useAIStore } from '../stores/aiStore'
import useAppSuggestions, { trackAppLaunch } from '../hooks/useAppSuggestions'
import { fetchCurrentWeather } from '../utils/weather'

const FALLBACK_QUOTES = [
  '"The future is already here — it\'s just not evenly distributed." — William Gibson',
  '"Any sufficiently advanced technology is indistinguishable from magic." — Arthur C. Clarke',
  '"The best way to predict the future is to invent it." — Alan Kay',
  '"Innovation distinguishes between a leader and a follower." — Steve Jobs',
  '"The only way to do great work is to love what you do." — Steve Jobs',
  '"Stay hungry, stay foolish." — Stewart Brand',
]

export default function ZeroScreen({ onNavigate, isAppActive, installedApps, onTriggerChronoLock, onTriggerVault }) {
  const [quote, setQuote] = useState("Loading quote...")
  const [briefing, setBriefing] = useState("Generating daily briefing...")
  const [weather, setWeather] = useState("Loading weather...")
  const [refreshing, setRefreshing] = useState(false)

  const { suggestions, handleSuggestionClick } = useAppSuggestions(installedApps || [], onTriggerChronoLock, onTriggerVault, onNavigate)

  const refreshAll = useCallback(async () => {
    setRefreshing(true)
    try {
      const weatherData = await fetchCurrentWeather()
      if (weatherData) {
        setWeather(weatherData.displayString)
        localStorage.setItem('iris_cached_weather_string', weatherData.displayString)
      }

      const quotes = await fetch('https://dummyjson.com/quotes/random?limit=1')
        .then(r => r.json())
        .then(data => {
          if (data && data[0]) return `"${data[0].quote}" — ${data[0].author}`
          throw new Error()
        })
        .catch(() => FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)])
      setQuote(quotes)

      const apiKey = useAIStore.getState().geminiKey
      if (apiKey) {
        const time = new Date().toLocaleTimeString()
        const location = localStorage.getItem('iris_weather_city') || 'Unknown Location'
        const prompt = `You are Iris, a futuristic AI assistant. Write a short, highly personalized, and aesthetic daily briefing for the user. Current time: ${time}. Location: ${location}. Keep it under 50 words.`
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        })
        const data = await res.json()
        if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          setBriefing(data.candidates[0].content.parts[0].text)
        } else {
          setBriefing("Neural link degraded. Unable to fetch daily briefing.")
        }
      } else {
        setBriefing("AI Briefing unavailable. Please configure Gemini API key in Settings.")
      }
    } catch {
      setBriefing("Neural link degraded. Unable to fetch daily briefing.")
    }
    setRefreshing(false)
  }, [])

  useEffect(() => {
    if (!isAppActive) return
    const cached = localStorage.getItem('iris_cached_weather_string')
    if (cached) setWeather(cached)
    refreshAll()
  }, [isAppActive, refreshAll])

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
        <div className="glass-surface border border-[#00f2ff]/30 p-5 rounded-2xl shadow-[0_0_20px_rgba(0,242,255,0.1)]">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-[#00f2ff]">partly_cloudy_day</span>
            <h3 className="font-bold text-[10px] tracking-widest uppercase text-[#00f2ff]/80 font-mono-data">Meteorology Node</h3>
          </div>
          <p className="font-mono-data text-xs text-white uppercase">{weather}</p>
        </div>

        {suggestions.length > 0 && (
          <div className="glass-surface border border-[#39ff14]/30 p-5 rounded-2xl shadow-[0_0_20px_rgba(57,255,20,0.1)]">
            <div className="flex items-center gap-3 mb-3">
              <span className="material-symbols-outlined text-[#39ff14]">auto_awesome</span>
              <h3 className="font-bold text-[10px] tracking-widest uppercase text-[#39ff14]/80 font-mono-data">Predicted Apps</h3>
            </div>
            <div className="flex gap-3">
              {suggestions.map(app => (
                <button key={app.packageId} onClick={() => handleSuggestionClick(app)}
                  className="flex flex-col items-center gap-1.5 flex-1 p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-[#39ff14]/10 hover:border-[#39ff14]/30 transition-all active:scale-90 group">
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center bg-black/30">
                    {app.icon ? <img src={app.icon} alt="" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-sm text-white/40">apps</span>}
                  </div>
                  <span className="text-[8px] text-white/60 group-hover:text-[#39ff14] truncate w-full text-center">{app.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="glass-surface border border-[#ff007f]/30 p-5 rounded-2xl shadow-[0_0_20px_rgba(255,0,127,0.1)]">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-[#ff007f] animate-pulse">memory</span>
            <h3 className="font-bold text-[10px] tracking-widest uppercase text-[#ff007f]/80 font-mono-data">AI Daily Briefing</h3>
          </div>
          <p className="font-mono-data text-xs text-white/90 leading-relaxed tracking-wide uppercase">{briefing}</p>
        </div>

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
