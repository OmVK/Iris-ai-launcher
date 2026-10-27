import { useAIStore } from '../stores/aiStore'
import { queryIrisAI } from './aiQueryBridge'
import { getSystemStats } from '../components/LauncherPlugin'

export const EXPANDED_FALLBACK_QUOTES = [
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

export async function fetchQuoteFromMultiSources() {
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

export async function fetchTopNewsHeadlines() {
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
    console.warn('[ZeroScreenData] News fetch error:', e)
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

export async function generateProceduralBriefing() {
  const hour = new Date().getHours()
  const timeOfDay = hour < 5 ? 'NIGHT' : hour < 12 ? 'MORNING' : hour < 18 ? 'AFTERNOON' : 'EVENING'
  const location = localStorage.getItem('iris_weather_city') || 'LOCAL NODE'

  let statsStr = ''
  try {
    const stats = await getSystemStats()
    if (stats && stats.memUsed && stats.memTotal) {
      const u = stats.memUsed > 1073741824 ? (stats.memUsed / 1073741824).toFixed(1) : stats.memUsed
      const t = stats.memTotal > 1073741824 ? (stats.memTotal / 1073741824).toFixed(1) : stats.memTotal
      statsStr = ` // MEM: ${u}G/${t}G`
    }
  } catch (_) {}

  const header = BRIEFING_HEADERS[Math.floor(Math.random() * BRIEFING_HEADERS.length)]
  return `${header} // GOOD ${timeOfDay}. LOCATION: ${location.toUpperCase()}${statsStr}. INTELLIGENCE FEED SYNCHRONIZED.`
}

export async function fetchZeroScreenFeed() {
  const [news, quote] = await Promise.all([
    fetchTopNewsHeadlines(),
    fetchQuoteFromMultiSources().catch(() => EXPANDED_FALLBACK_QUOTES[0])
  ])

  let briefingText = ''
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
          briefingText = aiResponse.trim()
        } else {
          briefingText = await generateProceduralBriefing()
        }
      } catch {
        briefingText = await generateProceduralBriefing()
      }
    } else {
      briefingText = await generateProceduralBriefing()
    }
  } catch {
    briefingText = await generateProceduralBriefing()
  }

  return { news, quote, briefing: briefingText }
}
