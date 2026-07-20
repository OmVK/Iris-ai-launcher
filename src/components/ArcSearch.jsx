import React, { useState, useEffect, useRef, useCallback } from 'react'
import { searchRAG } from './RagEngine'
import { IRIS_ICON_PACK } from '../utils/IrisIconPack'
import HudFallbackIcon from './HudFallbackIcon'
import { useAIStore } from '../stores/aiStore'
import { GenAI } from './GenAIPlugin'
import { fetchCurrentWeather } from '../utils/weather'
import { SecureStorage } from '../utils/secureStorage'

const QUESTION_KEYWORDS = [
  'who', 'what', 'where', 'when', 'why', 'how', 'is', 'are', 'was', 'were',
  'can', 'could', 'would', 'should', 'do', 'does', 'did', 'will', 'shall',
  'tell me', 'explain', 'describe', 'define', 'meaning of', 'difference between',
  'weather', 'temperature', 'forecast', 'news', 'score', 'price', 'stock'
]

function isQuestion(q) {
  const lower = q.toLowerCase().trim()
  if (lower.endsWith('?')) return true
  return QUESTION_KEYWORDS.some(kw => lower.startsWith(kw + ' ') || lower === kw)
}

export default function ArcSearch({ isOpen, onClose, installedApps, launchApp, activePage, setActivePage, globalIconTheme }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [aiAnswer, setAiAnswer] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const inputRef = useRef(null)
  const mountTime = useRef(Date.now())
  const abortRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      mountTime.current = Date.now()
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setQuery('')
      setResults([])
      setAiAnswer('')
      setAiError('')
      if (abortRef.current) abortRef.current.abort()
    }
  }, [isOpen])

  const safeClose = () => {
    if (Date.now() - mountTime.current > 300) onClose()
  }

  const fetchInlineAnswer = useCallback(async (question) => {
    setAiLoading(true)
    setAiAnswer('')
    setAiError('')

    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    try {
      const { llmBackend: backend } = useAIStore.getState()
      let answer = ''

      if (backend === 'ONDEVICE') {
        const result = await GenAI.generateText(question, {
          systemInstruction: 'You are Iris, a concise AI assistant. Answer in 1-3 sentences. Be direct and helpful.',
          maxTokens: 256
        })
        answer = result.text
      } else {
        let apiKey = ''
        if (backend === 'GEMINI') apiKey = useAIStore.getState().geminiKey
        else if (backend === 'GROQ') apiKey = await SecureStorage.getItem('groq_api_key')
        else if (backend === 'NVIDIA') apiKey = await SecureStorage.getItem('nvidia_api_key')

        if (!apiKey && backend !== 'OLLAMA') {
          setAiError(`No API key configured for ${backend}`)
          setAiLoading(false)
          return
        }

        if (backend === 'GEMINI') {
          const model = (localStorage.getItem('gemini_model') || 'gemini-2.5-flash').trim()
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `You are Iris, a concise AI assistant. Answer in 1-3 sentences. Be direct and helpful.\n\nUser: ${question}` }] }]
            }),
            signal: abortRef.current.signal
          })
          const data = await res.json()
          answer = data?.candidates?.[0]?.content?.parts?.[0]?.text
        } else if (backend === 'GROQ') {
          const model = localStorage.getItem('groq_model') || 'llama-3.3-70b-versatile'
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: 'You are Iris, a concise AI assistant. Answer in 1-3 sentences. Be direct and helpful.' },
                { role: 'user', content: question }
              ],
              max_tokens: 256
            }),
            signal: abortRef.current.signal
          })
          const data = await res.json()
          answer = data?.choices?.[0]?.message?.content
        } else if (backend === 'OLLAMA') {
          const endpoint = localStorage.getItem('ollama_endpoint') || 'http://localhost:11434'
          const model = localStorage.getItem('ollama_model') || 'gemma2:2b'
          const res = await fetch(`${endpoint}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: 'You are Iris, a concise AI assistant. Answer in 1-3 sentences. Be direct and helpful.' },
                { role: 'user', content: question }
              ],
              stream: false
            }),
            signal: abortRef.current.signal
          })
          const data = await res.json()
          answer = data?.message?.content
        }
      }

      setAiAnswer(answer || 'No response generated.')
    } catch (e) {
      if (e.name !== 'AbortError') {
        setAiError(`AI query failed: ${e.message}`)
      }
    }
    setAiLoading(false)
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setAiAnswer('')
      setAiError('')
      return
    }

    const q = query.toLowerCase()
    const appMatches = installedApps
      .filter(app => app.label.toLowerCase().includes(q) || app.packageId.toLowerCase().includes(q))
      .map(app => ({ type: 'app', label: `App: ${app.label}`, data: app, icon: app.icon || 'apps' }))

    const staticSettings = [
      { type: 'setting', label: 'Display Settings', data: 'Settings', icon: 'settings_display' },
      { type: 'setting', label: 'Wallpaper Control', data: 'Settings', icon: 'wallpaper' },
      { type: 'setting', label: 'Wi-Fi & Network', data: 'Settings', icon: 'wifi' }
    ].filter(s => s.label.toLowerCase().includes(q))

    const ragMatches = searchRAG(query).map(r => ({
      type: 'rag', label: `Local File: ${r.name}`, data: r.snippet, icon: 'folder'
    }))

    const webMatch = [{ type: 'web', label: `Search Web for "${query}"`, data: query, icon: 'public' }]

    setResults([...appMatches, ...staticSettings, ...ragMatches, ...webMatch].slice(0, 8))

    if (isQuestion(query)) {
      const timer = setTimeout(() => fetchInlineAnswer(query), 600)
      return () => clearTimeout(timer)
    } else {
      setAiAnswer('')
      setAiError('')
    }
  }, [query, installedApps, fetchInlineAnswer])

  const handleAction = (res) => {
    if (res.type === 'app') {
      launchApp(res.data.packageId, res.data.label)
      onClose()
    } else if (res.type === 'setting') {
      setActivePage('settings')
      onClose()
    } else if (res.type === 'web') {
      launchApp('com.android.chrome', res.data)
      onClose()
    } else if (res.type === 'rag') {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in select-none">
      <div className="absolute inset-0" onClick={safeClose} />

      <div className="w-full max-w-2xl relative z-10 flex flex-col gap-4 animate-slide-up">
        <div className="bg-[#0a0e17]/80 backdrop-blur-xl border border-[#00f2ff]/30 rounded-2xl p-2 flex items-center shadow-[0_0_30px_rgba(0,242,255,0.15)]">
          <span className="material-symbols-outlined text-[#00f2ff] px-3">search</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search apps, files, or ask Iris..."
            className="flex-1 bg-transparent border-none text-[#00f2ff] text-xl focus:outline-none placeholder:text-[#00f2ff]/30 px-2 font-mono-data"
            onKeyDown={e => {
              if (e.key === 'Enter' && results.length > 0) handleAction(results[0])
              else if (e.key === 'Escape') safeClose()
            }}
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-3 text-[#00f2ff]/50 hover:text-[#00f2ff] transition-colors">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
        </div>

        {/* Inline AI Answer */}
        {(aiLoading || aiAnswer || aiError) && (
          <div className="bg-[#0a0e17]/80 backdrop-blur-xl border border-[#00f2ff]/20 rounded-2xl p-4 shadow-[0_0_20px_rgba(0,242,255,0.1)]">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-[#00f2ff] text-sm animate-pulse">smart_toy</span>
              <span className="text-[9px] text-[#00f2ff]/60 uppercase font-mono-data tracking-widest">IRIS AI ANSWER</span>
            </div>
            {aiLoading && (
              <div className="flex items-center gap-2 text-[10px] text-[#00f2ff]/50 font-mono-data">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00f2ff] animate-pulse" />
                Querying neural pathways...
              </div>
            )}
            {aiAnswer && (
              <p className="text-xs text-white/90 font-mono-data leading-relaxed uppercase">{aiAnswer}</p>
            )}
            {aiError && (
              <p className="text-xs text-red-400/80 font-mono-data">{aiError}</p>
            )}
          </div>
        )}

        {results.length > 0 && (
          <div className="bg-[#0a0e17]/80 backdrop-blur-xl border border-[#00f2ff]/20 rounded-2xl overflow-hidden flex flex-col shadow-[0_0_20px_rgba(0,242,255,0.1)]">
            {results.map((res, i) => (
              <button
                key={i}
                onClick={() => handleAction(res)}
                className={`flex items-center gap-4 p-4 text-left transition-colors border-b border-[#00f2ff]/10 last:border-b-0 ${i === 0 ? 'bg-[#00f2ff]/10' : 'hover:bg-[#00f2ff]/5 active:bg-[#00f2ff]/20'}`}
              >
                {res.icon && res.icon.startsWith('data:image') ? (
                  (window.useGlobalHudIcons) ? (
                    IRIS_ICON_PACK[res.data.packageId] ? (
                      <div className="w-8 h-8 flex items-center justify-center icon-circle-minimal-outline">
                        {IRIS_ICON_PACK[res.data.packageId]}
                      </div>
                    ) : (
                      <HudFallbackIcon src={res.icon} size={32} />
                    )
                  ) : (
                    <img src={res.icon} alt={res.label} className="w-6 h-6 rounded" />
                  )
                ) : (
                  <span className={`material-symbols-outlined text-xl ${
                    res.type === 'web' ? 'text-[#00f2ff]' :
                    res.type === 'app' ? 'text-[#00f2ff]' : 'text-[#00f2ff]/70'
                  }`}>{res.icon}</span>
                )}
                <span className={`text-sm font-medium truncate flex-1 font-mono-data tracking-wider ${i === 0 ? 'text-[#00f2ff]' : 'text-white/80'}`}>{res.label}</span>
                {i === 0 && <span className="text-[9px] font-bold text-[#0a0e17] bg-[#00f2ff] uppercase tracking-widest px-2 py-0.5 rounded shadow-[0_0_8px_rgba(0,242,255,0.5)]">ENTER</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
