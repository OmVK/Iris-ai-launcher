import React, { useState, useEffect, useCallback } from 'react'
import { useAIStore } from '../stores/aiStore'
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
  '"Logic will get you from A to Z; imagination will get you everywhere." — Albert Einstein'
]

const recentQuotesHistory = []

async function fetchQuoteFromMultiSources() {
  const apis = [
    async () => {
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
    }
  ]

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

  let pool = EXPANDED_FALLBACK_QUOTES.filter(q => !recentQuotesHistory.includes(q))
  if (pool.length === 0) {
    recentQuotesHistory.length = 0
    pool = EXPANDED_FALLBACK_QUOTES
  }
  const picked = pool[Math.floor(Math.random() * pool.length)]
  recentQuotesHistory.push(picked)
  return picked
}

async function fetchTopNewsHeadlines() {
  try {
    const topRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json?print=pretty', { signal: AbortSignal.timeout(4000) })
    const topIds = await topRes.json()
    if (!Array.isArray(topIds) || topIds.length === 0) throw new Error('No top stories')

    const first5 = topIds.slice(0, 5)
    const storyPromises = first5.map(id => 
      fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { signal: AbortSignal.timeout(3000) })
        .then(r => r.json())
        .catch(() => null)
    )
    const stories = await Promise.all(storyPromises)
    const validStories = stories.filter(s => s && s.title)
    if (validStories.length > 0) {
      return validStories.map(s => ({
        id: s.id,
        title: s.title,
        url: s.url || `https://news.ycombinator.com/item?id=${s.id}`,
        score: s.score || 0
      }))
    }
  } catch (e) {
    console.warn('[ZeroScreen] News fetch error:', e)
  }

  return [
    { id: 1, title: 'AI models achieve human-level multimodal reasoning across benchmarks', url: 'https://news.google.com', score: 420 },
    { id: 2, title: 'Quantum processors demonstrate real-time fault-tolerant error correction', url: 'https://news.google.com', score: 380 },
    { id: 3, title: 'Next-generation solid-state battery technology enters mass production', url: 'https://news.google.com', score: 290 },
    { id: 4, title: 'Global open-source web frameworks release major performance architecture updates', url: 'https://news.google.com', score: 215 },
    { id: 5, title: 'Autonomous neural network agents optimize clean energy grid distribution', url: 'https://news.google.com', score: 195 }
  ]
}

const BRIEFING_HEADERS = [
  "NEURAL LINK STABLE",
  "QUANTUM TELEMETRY SYNCHRONIZED",
  "CORE ENGINE OPERATIONAL",
  "CYBERNETIC NODES ONLINE",
  "TACTICAL METRICS ACTIVE",
  "ORBITAL SYSTEM MATRIX"
]

async function generateProceduralBriefing() {
  const hour = new Date().getHours()
  const timeOfDay = hour < 5 ? 'NIGHT' : hour < 12 ? 'MORNING' : hour < 18 ? 'AFTERNOON' : 'EVENING'
  const location = localStorage.getItem('iris_weather_city') || 'LOCAL NODE'

  let statsStr = ''
  try {
    const stats = await getSystemStats()
    if (stats && stats.memUsed && stats.memTotal) {
      statsStr = ` // MEM: ${stats.memUsed}G/${stats.memTotal}G`
    }
  } catch (_) {}

  const header = BRIEFING_HEADERS[Math.floor(Math.random() * BRIEFING_HEADERS.length)]
  return `${header} // GOOD ${timeOfDay}. LOCATION: ${location.toUpperCase()}${statsStr}. INTELLIGENCE FEED SYNCHRONIZED.`
}

export default function ZeroScreen({ onNavigate, isAppActive }) {
  const [quote, setQuote] = useState("Loading quote...")
  const [briefing, setBriefing] = useState("Generating daily briefing...")
  const [newsStories, setNewsStories] = useState([])
  const [refreshing, setRefreshing] = useState(false)

  const refreshAll = useCallback(async () => {
    setRefreshing(true)

    // 1. Fetch Top 5 Hot News Topics
    fetchTopNewsHeadlines().then(stories => setNewsStories(stories))

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
        const randSeed = Math.floor(Math.random() * 1000)
        const prompt = `Write a futuristic 2-sentence daily briefing for an Android launcher zero screen. Current time: ${timeStr}. Random Seed: ${randSeed}. Keep it under 35 words.`
        
        try {
          const aiResponse = await queryIrisAI(prompt)
          if (aiResponse && aiResponse.trim().length > 0) {
            setBriefing(aiResponse.trim())
          } else {
            const proc = await generateProceduralBriefing()
            setBriefing(proc)
          }
        } catch (err) {
          const proc = await generateProceduralBriefing()
          setBriefing(proc)
        }
      } else {
        const proc = await generateProceduralBriefing()
        setBriefing(proc)
      }
    } catch (e) {
      const proc = await generateProceduralBriefing()
      setBriefing(proc)
    }

    setRefreshing(false)
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
