import { useAIStore } from '../stores/aiStore'

const SEARCH_TRIGGER_PATTERNS = [
  /\b(?:who|what|where|when|why|how|latest|news|today|price|score|current|update|tell me about|explain|search|look up|president|minister|flavor|taste|science)\b/i
]

async function fetchWebSearch(query) {
  try {
    const cleanQ = query
      .replace(/^(?:who\s+is|what\s+is|where\s+is|why\s+is|why\s+do|why\s+does|why\s+sometime|why\s+sometimes|how\s+come|tell\s+me\s+about|search\s+for|look\s+up|explain)\s+/i, '')
      .replace(/[?.,!]/g, '')
      .trim()

    if (!cleanQ || cleanQ.length < 2) return ''

    const snippets = []

    // 1. Wikipedia Open Search API (No CORS, ultra-fast, rich facts)
    try {
      const wikiRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanQ)}&utf8=&format=json&origin=*`, {
        signal: AbortSignal.timeout(3500)
      })
      if (wikiRes.ok) {
        const wikiData = await wikiRes.json()
        const wikiItems = wikiData?.query?.search?.slice(0, 2) || []
        for (const item of wikiItems) {
          const cleanSnippet = item.snippet.replace(/<[^>]*>?/gm, '').trim()
          if (cleanSnippet) snippets.push(`${item.title}: ${cleanSnippet}`)
        }
      }
    } catch (_) {}

    // 2. DuckDuckGo HTML Fallback
    if (snippets.length === 0) {
      try {
        const ddgRes = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanQ)}`, {
          signal: AbortSignal.timeout(3500),
          headers: { 'Accept': 'text/html' }
        })
        if (ddgRes.ok) {
          const text = await ddgRes.text()
          const parser = new DOMParser()
          const doc = parser.parseFromString(text, 'text/html')
          const ddgSnippets = Array.from(doc.querySelectorAll('.result__snippet'))
            .slice(0, 2)
            .map(el => el.textContent.trim())
            .filter(Boolean)
          snippets.push(...ddgSnippets)
        }
      } catch (_) {}
    }

    return snippets.length > 0 ? `[Live Web Information: ${snippets.join(' ')}]` : ''
  } catch {
    return ''
  }
}

function sanitizeVoiceOutput(text) {
  if (!text) return ''
  return text
    .replace(/[*_~`#>[\]{}()]/g, '') // Remove markdown and brackets
    .replace(/\b(?:assistant|system|iris):\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function queryIrisAI(prompt, onChunk, history = []) {
  const { geminiKey, groqKey, llmBackend } = useAIStore.getState()
  const activeBackend = llmBackend || (geminiKey ? 'GEMINI' : groqKey ? 'GROQ' : 'GEMINI')

  // Real-time web retrieval
  let searchContext = ''
  if (SEARCH_TRIGGER_PATTERNS.some(p => p.test(prompt))) {
    searchContext = await fetchWebSearch(prompt)
  }

  const voiceSystemPrompt = `You are Iris, a sharp, ultra-intelligent, and witty AI assistant inside a cybernetic Android launcher.

VOICE PERSONALITY GUIDELINES:
1. Sarcastic & Witty Edge: If the user asks something weird, silly, or unusual (for example, why strawberries taste like blueberries), give a quick, delightfully sarcastic or dryly witty remark first, then immediately explain the actual scientific or factual truth.
2. Clear & Direct for Real Questions: For serious, political, historical, or knowledge questions (like "Who is Donald Trump", current events, science, or concepts), provide an accurate, sharp, and concise answer.
3. Natural Voice Output: Deliver your answer in 1 to 3 natural spoken sentences. Never use markdown formatting (no asterisks, hashtags, dashes, or bullet points) since your answer is spoken aloud through text-to-speech.
${searchContext ? `\n${searchContext}` : ''}`

  if (activeBackend === 'GEMINI' && geminiKey) {
    let model = (localStorage.getItem('gemini_model') || 'gemini-2.0-flash').trim().replace(/\s+/g, '-')
    
    // Build multi-turn contents from history
    const contents = []
    if (Array.isArray(history) && history.length > 0) {
      for (const turn of history.slice(-6)) {
        if (turn.role === 'user') {
          contents.push({ role: 'user', parts: [{ text: turn.text || turn.content || '' }] })
        } else if (turn.role === 'assistant') {
          contents.push({ role: 'model', parts: [{ text: turn.text || turn.content || '' }] })
        }
      }
    }
    contents.push({ role: 'user', parts: [{ text: prompt }] })

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: voiceSystemPrompt }] }
      })
    })

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson?.error?.message || `Gemini API error ${res.status}`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let fullText = ''

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue
        const dataStr = line.replace('data: ', '').trim()
        if (dataStr === '[DONE]') break
        try {
          const parsed = JSON.parse(dataStr)
          const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text
          if (text) {
            fullText += text
            if (onChunk) onChunk(sanitizeVoiceOutput(fullText))
          }
        } catch {}
      }
    }
    return sanitizeVoiceOutput(fullText)
  } else if (activeBackend === 'GROQ' && groqKey) {
    const messages = [
      { role: 'system', content: voiceSystemPrompt }
    ]
    if (Array.isArray(history) && history.length > 0) {
      for (const turn of history.slice(-6)) {
        if (turn.role === 'user' || turn.role === 'assistant') {
          messages.push({ role: turn.role, content: turn.text || turn.content || '' })
        }
      }
    }
    messages.push({ role: 'user', content: prompt })

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages
      })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error?.message || `Groq API error ${res.status}`)
    const text = data?.choices?.[0]?.message?.content || 'I could not process that query.'
    const sanitized = sanitizeVoiceOutput(text)
    if (onChunk) onChunk(sanitized)
    return sanitized
  } else {
    throw new Error('Please configure your Gemini or Groq API key in Settings to use Iris AI.')
  }
}
