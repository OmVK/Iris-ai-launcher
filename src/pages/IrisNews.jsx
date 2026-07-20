import { useState, useEffect, useRef } from 'react'
import PowerSaveManager from '../utils/PowerSaveManager'
import { usePowerStore } from '../stores/powerStore'

const NEWS_SOURCES = [
  { id: 'hackernews', name: 'Hacker News', fetch: fetchHackerNews },
  { id: 'worldnews', name: 'World News', fetch: fetchWorldNews },
  { id: 'technews', name: 'Tech', fetch: fetchTechNews },
]

async function fetchHackerNews() {
  const res = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json')
  const ids = await res.json()
  const top = ids.slice(0, 15)
  const stories = await Promise.all(
    top.map(id => fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r => r.json()).catch(() => null))
  )
  return stories.filter(s => s && s.title).map(s => ({
    title: s.title,
    url: s.url || `https://news.ycombinator.com/item?id=${s.id}`,
    source: 'Hacker News',
    time: s.time ? timeAgo(s.time * 1000) : '—',
    score: s.score,
  }))
}

function parseRSS(xml) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, 'text/xml')
  const items = doc.querySelectorAll('item')
  return Array.from(items).slice(0, 15).map(item => {
    const title = item.querySelector('title')?.textContent || ''
    const link = item.querySelector('link')?.textContent || ''
    const pubDate = item.querySelector('pubDate')?.textContent || ''
    const description = item.querySelector('description')?.textContent || ''
    return {
      title: title.replace(/<!\[CDATA\[|\]\]>/g, ''),
      url: link.replace(/<!\[CDATA\[|\]\]>/g, ''),
      source: '',
      time: pubDate ? timeAgo(new Date(pubDate).getTime()) : '—',
      description: description.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').substring(0, 120),
    }
  }).filter(a => a.title)
}

async function fetchWorldNews() {
  try {
    const res = await fetch('https://feeds.bbci.co.uk/news/world/rss.xml')
    const xml = await res.text()
    const articles = parseRSS(xml)
    return articles.map(a => ({ ...a, source: 'BBC World' }))
  } catch (e) { return [] }
}

async function fetchTechNews() {
  try {
    const res = await fetch('https://feeds.bbci.co.uk/news/technology/rss.xml')
    const xml = await res.text()
    const articles = parseRSS(xml)
    return articles.map(a => ({ ...a, source: 'BBC Tech' }))
  } catch (e) { return [] }
}

function timeAgo(ts) {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function IrisNews({ onNavigate }) {
  const powerSaveMode = usePowerStore(s => s.powerSaveMode)
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeSource, setActiveSource] = useState('hackernews')
  const [error, setError] = useState(null)
  const swipeStart = useRef({ x: 0, y: 0 })

  useEffect(() => {
    loadNews(activeSource)
    // Auto-refresh scales with power save mode
    const refreshInterval = Math.max(PowerSaveManager.getPollingInterval('weatherPollMs'), 300000)
    const timer = setInterval(() => loadNews(activeSource), refreshInterval)
    return () => clearInterval(timer)
  }, [activeSource, powerSaveMode])

  const loadNews = async (sourceId) => {
    setLoading(true)
    setError(null)
    try {
      const source = NEWS_SOURCES.find(s => s.id === sourceId)
      if (!source) { setError('Unknown news source.'); setLoading(false); return }
      const data = await source.fetch()
      if (!data || data.length === 0) {
        setError('No articles found. Try again later.')
      }
      setArticles(data || [])
    } catch (e) {
      setError(`Failed to load news. ${e.message || 'Check your connection.'}`)
      setArticles([])
    } finally {
      setLoading(false)
    }
  }

  const handleTouchStart = (e) => {
    const t = e.touches ? e.touches[0] : e
    swipeStart.current = { x: t.clientX, y: t.clientY }
  }

  const handleTouchEnd = (e) => {
    const t = e.changedTouches ? e.changedTouches[0] : e
    if (!t) return
    const dx = t.clientX - swipeStart.current.x
    const dy = t.clientY - swipeStart.current.y
    if (dx > 100 && Math.abs(dy) < 80) onNavigate('home')
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      className="flex-1 mt-12 mb-20 overflow-y-auto px-4 py-6 scroll-container select-none max-w-lg mx-auto"
    >
      {/* Header */}
      <div className="flex justify-between items-end border-b border-white/5 pb-3 mb-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary-fixed-dim neon-glow leading-none">IRIS NEWS</h1>
          <p className="font-mono-data text-[8.5px] text-on-surface-variant/40 mt-1 uppercase">TECH // WORLD // CYBERSECURITY FEEDS</p>
        </div>
        <button
          onClick={() => onNavigate('home')}
          className="px-3 py-1 bg-white/5 border border-white/10 text-on-surface-variant/70 hover:text-white rounded font-mono-data text-[9px] uppercase active:scale-95 transition-transform"
        >
          Return Home
        </button>
      </div>

      {/* Source Tabs */}
      <div className="flex gap-2 mb-4">
        {NEWS_SOURCES.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSource(s.id)}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-mono-data font-bold uppercase tracking-wider transition-all ${
              activeSource === s.id
                ? 'bg-primary-fixed-dim/20 border border-primary-fixed-dim/40 text-primary-fixed-dim'
                : 'bg-black/20 border border-outline-variant/20 text-on-surface-variant/40 hover:text-white'
            }`}
          >
            {s.name}
          </button>
        ))}
        <button
          onClick={() => loadNews(activeSource)}
          className="ml-auto px-2 py-1.5 rounded-lg bg-black/20 border border-outline-variant/20 text-on-surface-variant/40 hover:text-white transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-[14px]">refresh</span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-5 h-5 border-2 border-primary-fixed-dim border-t-transparent rounded-full animate-spin" />
          <span className="font-mono-data text-[9px] text-on-surface-variant/40 uppercase tracking-wider">FETCHING INTEL...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <span className="material-symbols-outlined text-2xl text-on-surface-variant/30">cloud_off</span>
          <span className="font-mono-data text-[9px] text-on-surface-variant/40 uppercase">{error}</span>
        </div>
      ) : (
        <div className="space-y-2.5">
          {articles.map((article, i) => (
            <a
              key={i}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 rounded-xl border border-outline-variant/10 bg-[#0a0e17]/60 hover:border-outline-variant/25 transition-all active:scale-[0.98]"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <h3 className="font-mono-data text-[11px] text-on-surface-variant leading-snug flex-1">{article.title}</h3>
                {article.score && (
                  <span className="shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded bg-primary-fixed-dim/10 text-primary-fixed-dim">
                    {article.score}pts
                  </span>
                )}
              </div>
              {article.description && (
                <p className="font-mono-data text-[9px] text-on-surface-variant/40 leading-relaxed mb-1.5 line-clamp-2">{article.description}</p>
              )}
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-mono-data text-primary-fixed-dim/50 uppercase">{article.source}</span>
                <span className="text-on-surface-variant/20">•</span>
                <span className="text-[8px] font-mono-data text-on-surface-variant/30 uppercase">{article.time}</span>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Swipe hint */}
      <div className="text-center font-mono-data text-[7.5px] text-on-surface-variant/30 uppercase flex justify-center items-center gap-1 leading-none select-none py-4 mt-4">
        <span className="material-symbols-outlined text-[10px]">swipe_right</span>
        <span>Swipe Right to Return Home</span>
      </div>
    </div>
  )
}
