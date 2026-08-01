import React, { useState, useEffect, useCallback } from 'react'
import { useAIStore } from '../stores/aiStore'
import { fetchCurrentWeather } from '../utils/weather'
import { queryIrisAI } from '../utils/aiQueryBridge'
import { getSystemStats } from './LauncherPlugin'

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
  '"Logic will get you from A to Z; imagination will get you everywhere." — Albert Einstein',
  '"Complexity is your enemy. Any fool can make something complicated. It is hard to keep things simple." — Richard Branson',
  '"The quietest thoughts are often the loudest in execution." — Cybernetic Proverb',
  '"First, solve the problem. Then, write the code." — John Johnson',
  '"Experience is the name everyone gives to their mistakes." — Oscar Wilde',
  '"In the middle of difficulty lies opportunity." — Albert Einstein',
  '"Turn your wounds into wisdom." — Oprah Winfrey',
  '"What we think, we become." — Buddha',
  '"Yesterday is history, tomorrow is a mystery, today is a gift." — Eleanor Roosevelt',
  '"Creativity is intelligence having fun." — Albert Einstein',
  '"Knowledge is power." — Francis Bacon'
]

const recentQuotesHistory = []

async function fetchQuoteFromMultiSources() {
  const apis = [
    async () => {
      // Pick random quote from dummyjson 100 quote pool
      const randomSkip = Math.floor(Math.random() * 90)
      const res = await fetch(`https://dummyjson.com/quotes?limit=10&skip=${randomSkip}`, { signal: AbortSignal.timeout(3500) })
      const data = await res.json()
      if (data?.quotes && data.quotes.length > 0) {
        const item = data.quotes[Math.floor(Math.random() * data.quotes.length)]
        return `"${item.quote}" — ${item.author}`
      }
      throw new Error('DummyJSON empty')
    },
    async () => {
      const res = await fetch('https://stoic-quotes.com/api/quote', { signal: AbortSignal.timeout(3500) })
      const data = await res.json()
      if (data?.text && data?.author) {
        return `"${data.text}" — ${data.author}`
      }
      throw new Error('Stoic quote invalid')
    },
    async () => {
      const res = await fetch('https://api.quotable.io/random', { signal: AbortSignal.timeout(3500) })
      const data = await res.json()
      if (data?.content && data?.author) {
        return `"${data.content}" — ${data.author}`
      }
      throw new Error('Quotable invalid')
    }
  ]

  // Shuffle APIs
  const shuffled = [...apis].sort(() => Math.random() - 0.5)

  for (const fetchFn of shuffled) {
    try {
      const q = await fetchFn()
      if (q && !recentQuotesHistory.includes(q)) {
        recentQuotesHistory.push(q)
        if (recentQuotesHistory.length > 15) recentQuotesHistory.shift()
        return q
      }
    } catch (_) {}
  }

  // Fallback to local array with duplicate filter
  let pool = EXPANDED_FALLBACK_QUOTES.filter(q => !recentQuotesHistory.includes(q))
  if (pool.length === 0) {
    recentQuotesHistory.length = 0
    pool = EXPANDED_FALLBACK_QUOTES
  }
  const picked = pool[Math.floor(Math.random() * pool.length)]
  recentQuotesHistory.push(picked)
  return picked
}

const BRIEFING_HEADERS = [
  "NEURAL LINK STABLE",
  "QUANTUM TELEMETRY SYNCHRONIZED",
  "CORE ENGINE OPERATIONAL",
  "CYBERNETIC NODES ONLINE",
  "TACTICAL METRICS ACTIVE",
  "ORBITAL SYSTEM MATRIX"
]

const BRIEFING_FOOTERS = [
  "ALL SUB-PROCESSES RUNNING AT OPTIMAL EFFICIENCY.",
  "ENCRYPTION PIPELINES SECURED. SYSTEM ENCLOSURE NORMAL.",
  "BACKGROUND HEURISTICS SYNCHRONIZING REAL-TIME METRICS.",
  "ATMOSPHERIC DATA INTEGRATED INTO PRIMARY DATABANKS.",
  "MEMORY CYCLES CLEARED. RUNTIME HEALTH AT MAXIMUM LEVEL."
]

async function generateProceduralBriefing(weatherStr) {
  const hour = new Date().getHours()
  const timeOfDay = hour < 5 ? 'NIGHT' : hour < 12 ? 'MORNING' : hour < 18 ? 'AFTERNOON' : 'EVENING'
  const location = localStorage.getItem('iris_weather_city') || 'LOCAL NODE'
  const cond = weatherStr && weatherStr !== 'Loading weather...' ? weatherStr : 'CLEAR METRICS'

  let statsStr = ''
  try {
    const stats = await getSystemStats()
    if (stats && stats.memUsed && stats.memTotal) {
      statsStr = ` // SYS_MEM: ${stats.memUsed}G/${stats.memTotal}G`
    }
  } catch (_) {}

  const header = BRIEFING_HEADERS[Math.floor(Math.random() * BRIEFING_HEADERS.length)]
  const footer = BRIEFING_FOOTERS[Math.floor(Math.random() * BRIEFING_FOOTERS.length)]

  return `${header} // GOOD ${timeOfDay}. LOCATION: ${location.toUpperCase()}. ATMOSPHERE: ${cond}${statsStr}. ${footer}`
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

    // 2. Fetch Multi-Source Unique Quote
    try {
      const fetchedQuote = await fetchQuoteFromMultiSources()
      setQuote(fetchedQuote)
    } catch (e) {
      const fallback = EXPANDED_FALLBACK_QUOTES[Math.floor(Math.random() * EXPANDED_FALLBACK_QUOTES.length)]
      setQuote(fallback)
    }

    // 3. Generate Dynamic AI / Procedural Daily Briefing
    try {
      await useAIStore.getState().loadKeys()
      const { geminiKey, groqKey } = useAIStore.getState()
      
      if (geminiKey || groqKey) {
        const timeStr = new Date().toLocaleTimeString()
        const location = localStorage.getItem('iris_weather_city') || 'Unknown Location'
        const randSeed = Math.floor(Math.random() * 1000)
        const prompt = `Write a fresh, futuristic 2-sentence daily briefing for an Android launcher zero screen. Current time: ${timeStr}. Weather: ${currentWx}. Location: ${location}. Random Seed: ${randSeed}. Keep it under 40 words.`
        
        try {
          const aiResponse = await queryIrisAI(prompt)
          if (aiResponse && aiResponse.trim().length > 0) {
            setBriefing(aiResponse.trim())
          } else {
            const proc = await generateProceduralBriefing(currentWx)
            setBriefing(proc)
          }
        } catch (err) {
          console.warn('[ZeroScreen] AI Briefing bridge error, fallback to procedural:', err)
          const proc = await generateProceduralBriefing(currentWx)
          setBriefing(proc)
        }
      } else {
        const proc = await generateProceduralBriefing(currentWx)
        setBriefing(proc)
      }
    } catch (e) {
      console.error('Briefing fetch failed:', e)
      const proc = await generateProceduralBriefing(currentWx)
      setBriefing(proc)
    }

    setRefreshing(false)
  }, [weather])

  useEffect(() => {
    if (!isAppActive) return
    const cached = localStorage.getItem('iris_cached_weather_string')
    if (cached) setWeather(cached)
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
