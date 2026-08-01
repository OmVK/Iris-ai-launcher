import React, { useState, useEffect, useCallback } from 'react'
import { useAIStore } from '../stores/aiStore'
import { fetchCurrentWeather } from '../utils/weather'
import { queryIrisAI } from '../utils/aiQueryBridge'

const EXPANDED_FALLBACK_QUOTES = [
  '"The future is already here — it\'s just not evenly distributed." — William Gibson',
  '"Any sufficiently advanced technology is indistinguishable from magic." — Arthur C. Clarke',
  '"The best way to predict the future is to invent it." — Alan Kay',
  '"Innovation distinguishes between a leader and a follower." — Steve Jobs',
  '"The measure of intelligence is the ability to change." — Albert Einstein',
  '"Technology is best when it brings people together." — Matt Mullenweg',
  '"It has become appallingly obvious that our technology has exceeded our humanity." — Albert Einstein',
  '"Simplicity is the ultimate sophistication." — Leonardo da Vinci',
  '"The web as I envisaged it, we have not seen it yet. The future is still so much bigger." — Tim Berners-Lee',
  '"Do not dwell in the past, do not dream of the future, concentrate the mind on the present moment." — Buddha',
  '"Science and technology revolutionize our lives, but memory, tradition and myth frame our response." — Arthur M. Schlesinger',
  '"We shape our tools and thereafter our tools shape us." — Marshall McLuhan',
  '"Code is like humor. When you have to explain it, it\'s bad." — Cory House',
  '"Technology is a useful servant but a dangerous master." — Christian Lous Lange',
  '"Software is a great combination between artistry and engineering." — Bill Gates',
  '"An investment in knowledge pays the best interest." — Benjamin Franklin',
  '"The advance of technology is based on making it fit in so that you don\'t really even notice it." — Mark Weiser',
  '"Machines take me by surprise with great frequency." — Alan Turing',
  '"The computer was born to solve problems that did not exist before." — Bill Gates',
  '"Logic will get you from A to Z; imagination will get you everywhere." — Albert Einstein'
]

const recentQuoteIndexSet = new Set()

async function fetchQuoteFromMultiSources() {
  const sources = [
    async () => {
      const res = await fetch('https://dummyjson.com/quotes/random', { signal: AbortSignal.timeout(3000) })
      const data = await res.json()
      if (data?.quote && data?.author) return `"${data.quote}" — ${data.author}`
      throw new Error('Invalid dummyjson quote')
    },
    async () => {
      const res = await fetch('https://api.quotable.io/random', { signal: AbortSignal.timeout(3000) })
      const data = await res.json()
      if (data?.content && data?.author) return `"${data.content}" — ${data.author}`
      throw new Error('Invalid quotable quote')
    },
    async () => {
      const res = await fetch('https://type.fit/api/quotes', { signal: AbortSignal.timeout(3000) })
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        const item = data[Math.floor(Math.random() * data.length)]
        if (item?.text) {
          const author = item.author ? item.author.replace(', type.fit', '').replace('type.fit', '').trim() : 'Unknown'
          return `"${item.text}" — ${author}`
        }
      }
      throw new Error('Invalid type.fit quote')
    }
  ]

  // Shuffle source order randomly
  const shuffledSources = [...sources].sort(() => Math.random() - 0.5)

  for (const fetchFn of shuffledSources) {
    try {
      const result = await fetchFn()
      if (result) return result
    } catch (_) {}
  }

  // Fallback to local curated quote library with duplicate avoidance
  let candidateIndex = Math.floor(Math.random() * EXPANDED_FALLBACK_QUOTES.length)
  if (recentQuoteIndexSet.size >= EXPANDED_FALLBACK_QUOTES.length - 1) {
    recentQuoteIndexSet.clear()
  }
  let attempts = 0
  while (recentQuoteIndexSet.has(candidateIndex) && attempts < 20) {
    candidateIndex = Math.floor(Math.random() * EXPANDED_FALLBACK_QUOTES.length)
    attempts++
  }
  recentQuoteIndexSet.add(candidateIndex)
  return EXPANDED_FALLBACK_QUOTES[candidateIndex]
}

function generateProceduralBriefing(weatherStr) {
  const hour = new Date().getHours()
  const timeOfDay = hour < 12 ? 'MORNING' : hour < 18 ? 'AFTERNOON' : 'EVENING'
  const location = localStorage.getItem('iris_weather_city') || 'LOCAL NODE'
  const cond = weatherStr && weatherStr !== 'Loading weather...' ? weatherStr : 'STABLE'

  return `SYSTEM TELEMETRY SYNCHRONIZED // GOOD ${timeOfDay}. LOCATION: ${location.toUpperCase()}. CURRENT WEATHER METRICS: ${cond}. ALL SUB-PROCESSES ACTIVE & ENCRYPTED.`
}

export default function ZeroScreen({ onNavigate, isAppActive }) {
  const [quote, setQuote] = useState("Loading quote...")
  const [briefing, setBriefing] = useState("Generating daily briefing...")
  const [weather, setWeather] = useState("Loading weather...")
  const [refreshing, setRefreshing] = useState(false)

  const refreshAll = useCallback(async () => {
    setRefreshing(true)
    let currentWx = weather

    // 1. Fetch Weather
    try {
      const weatherData = await fetchCurrentWeather()
      if (weatherData) {
        currentWx = weatherData.displayString
        setWeather(currentWx)
        localStorage.setItem('iris_cached_weather_string', currentWx)
      }
    } catch (e) {
      console.error('Weather fetch failed:', e)
    }

    // 2. Fetch Multi-Source Quote
    try {
      const fetchedQuote = await fetchQuoteFromMultiSources()
      setQuote(fetchedQuote)
    } catch (e) {
      setQuote(EXPANDED_FALLBACK_QUOTES[Math.floor(Math.random() * EXPANDED_FALLBACK_QUOTES.length)])
    }

    // 3. Generate AI Daily Briefing
    try {
      await useAIStore.getState().loadKeys()
      const { geminiKey, groqKey } = useAIStore.getState()
      
      if (geminiKey || groqKey) {
        const timeStr = new Date().toLocaleTimeString()
        const location = localStorage.getItem('iris_weather_city') || 'Unknown Location'
        const prompt = `Write a short, aesthetic 2-sentence daily briefing for an Android launcher zero screen. Current time: ${timeStr}. Weather: ${currentWx}. Location: ${location}. Keep it under 40 words.`
        
        try {
          const aiResponse = await queryIrisAI(prompt)
          if (aiResponse && aiResponse.trim().length > 0) {
            setBriefing(aiResponse.trim())
          } else {
            setBriefing(generateProceduralBriefing(currentWx))
          }
        } catch (err) {
          console.warn('[ZeroScreen] AI Briefing bridge error, fallback to procedural:', err)
          setBriefing(generateProceduralBriefing(currentWx))
        }
      } else {
        setBriefing(generateProceduralBriefing(currentWx))
      }
    } catch (e) {
      console.error('Briefing fetch failed:', e)
      setBriefing(generateProceduralBriefing(currentWx))
    }

    setRefreshing(false)
  }, [weather])

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
