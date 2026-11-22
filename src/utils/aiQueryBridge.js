import { useAIStore } from '../stores/aiStore'
import { useAssistantStore } from '../stores/assistantStore'
import { SecureStorage } from './secureStorage'
import { GenAI } from '../components/GenAIPlugin'
import { getBackendPriorityChain, getSanitizedOllamaEndpoint } from './AIProviderManager'
import { resolveWorkingGeminiModel, resolveWorkingGroqModel } from './modelResolver'

const SEARCH_TRIGGER_PATTERNS = [
  /\b(?:who|what|where|when|why|how|latest|news|today|price|score|current|update|tell me about|explain|search|look up|president|minister|flavor|taste|science|weather|population|capital)\b/i
]

const PERSONA_VOICE_DIRECTIVES = {
  CHAT: 'Answer naturally, warmly, and conversationally.',
  CODER: 'Provide sharp technical & software engineering insight concisely.',
  TUTOR: 'Explain clearly step-by-step with a simple real-world analogy.',
  RESEARCH: 'Synthesize verified facts and real-time web context accurately.',
  COMMANDER: 'Respond with crisp executive precision focused on Android OS control.'
}

async function fetchWebSearch(query) {
  try {
    const cleanQ = query
      .replace(/^(?:who\s+is|what\s+is|where\s+is|why\s+is|why\s+do|why\s+does|how\s+come|tell\s+me\s+about|search\s+for|look\s+up|explain)\s+/i, '')
      .replace(/[?.,!]/g, '')
      .trim()

    if (!cleanQ || cleanQ.length < 2) return ''

    const snippets = []

    try {
      const wikiRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanQ)}&utf8=&format=json&origin=*`, {
        credentials: 'omit',
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
    } catch {}

    if (snippets.length === 0) {
      try {
        const ddgRes = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanQ)}`, {
          credentials: 'omit',
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
      } catch {}
    }

    return snippets.length > 0 ? `[Live Web Information: ${snippets.join(' ')}]` : ''
  } catch {
    return ''
  }
}

function sanitizeVoiceOutput(text) {
  if (!text) return ''
  return text
    .replace(/[*_~`#>[\]{}()]/g, '')
    .replace(/\b(?:assistant|system|iris):\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function syncVoiceTurnToAssistantStore(userPrompt, aiReply, backendUsed) {
  try {
    const store = useAssistantStore.getState()
    if (store.isPrivateSession || !userPrompt || !aiReply) return
    const CleanPrompt = userPrompt.split('\n[REAL-TIME DEVICE OS ACTIONS')[0].trim()
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    store.setChatLog(prev => [
      ...prev,
      { id: `home_u_${Date.now()}`, time: nowTime, sender: 'USER', text: CleanPrompt, type: 'user' },
      { id: `home_a_${Date.now() + 1}`, time: nowTime, sender: 'IRIS', text: aiReply, type: 'ai', provider: backendUsed }
    ])
    store.autoTitleSession(CleanPrompt)
    store.persistSessions()
  } catch {}
}

export async function queryIrisAI(prompt, onChunk, history = []) {
  const { geminiKey: storeGemini, groqKey: storeGroq, llmBackend } = useAIStore.getState()
  const { assistantPersona = 'CHAT', webSearchEnabled = false, isPrivateSession = false } = useAssistantStore.getState()

  const geminiKey = storeGemini || await SecureStorage.getItem('gemini_api_key') || ''
  const groqKey = storeGroq || await SecureStorage.getItem('groq_api_key') || ''
  const nvidiaKey = await SecureStorage.getItem('nvidia_api_key') || ''

  let searchContext = ''
  if (webSearchEnabled || SEARCH_TRIGGER_PATTERNS.some(p => p.test(prompt))) {
    searchContext = await fetchWebSearch(prompt)
  }

  const personaDirective = PERSONA_VOICE_DIRECTIVES[assistantPersona] || PERSONA_VOICE_DIRECTIVES.CHAT
  const voiceSystemPrompt = `You are Iris, an intelligent AI assistant powering both the IRIS Home Launcher and IRIS AI.
PERSONA (${assistantPersona}): ${personaDirective}
${isPrivateSession ? 'PRIVACY: Incognito Zero-Trace mode is active.' : ''}
VOICE OUTPUT RULES:
- Deliver your answer in 1 to 3 clear, natural spoken sentences.
- Never use markdown formatting (no asterisks, hashtags, or bullet symbols) since your answer is spoken aloud via TTS.
- Current date/time: ${new Date().toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
${searchContext ? `\n${searchContext}` : ''}`

  const preferred = llmBackend || 'GEMINI'
  const chain = getBackendPriorityChain(preferred)

  for (const backend of chain) {
    try {
      if (backend === 'GEMINI' && geminiKey) {
        let model = (useAIStore.getState().geminiModel || localStorage.getItem('gemini_model') || 'gemini-2.5-flash').trim().replace(/\s+/g, '-')
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

        const doGeminiFetch = (mId) =>
          fetch(`https://generativelanguage.googleapis.com/v1beta/models/${mId}:streamGenerateContent?alt=sse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
            body: JSON.stringify({
              contents,
              systemInstruction: { parts: [{ text: voiceSystemPrompt }] }
            })
          })

        let res = await doGeminiFetch(model)
        if (!res.ok && (res.status === 404 || res.status === 400)) {
          const fallback = await resolveWorkingGeminiModel(geminiKey, model)
          if (fallback && fallback !== model) {
            model = fallback
            res = await doGeminiFetch(model)
          }
        }
        if (!res.ok) continue

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
        const finalOut = sanitizeVoiceOutput(fullText)
        if (finalOut) {
          syncVoiceTurnToAssistantStore(prompt, finalOut, 'GEMINI')
          return finalOut
        }
      }

      if (backend === 'GROQ' && groqKey) {
        const messages = [{ role: 'system', content: voiceSystemPrompt }]
        if (Array.isArray(history) && history.length > 0) {
          for (const turn of history.slice(-6)) {
            if (turn.role === 'user' || turn.role === 'assistant') {
              messages.push({ role: turn.role, content: turn.text || turn.content || '' })
            }
          }
        }
        messages.push({ role: 'user', content: prompt })

        let groqModel = (useAIStore.getState().groqModel || localStorage.getItem('groq_model') || 'llama-3.3-70b-versatile').trim().replace(/\s+/g, '-')
        const doGroqFetch = (mId) =>
          fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${groqKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ model: mId, messages })
          })

        let res = await doGroqFetch(groqModel)
        if (!res.ok && (res.status === 400 || res.status === 404)) {
          const fallback = await resolveWorkingGroqModel(groqKey, groqModel)
          if (fallback && fallback !== groqModel) {
            groqModel = fallback
            res = await doGroqFetch(groqModel)
          }
        }
        if (!res.ok) continue
        const data = await res.json()
        const text = sanitizeVoiceOutput(data?.choices?.[0]?.message?.content || '')
        if (text) {
          if (onChunk) onChunk(text)
          syncVoiceTurnToAssistantStore(prompt, text, 'GROQ')
          return text
        }
      }

      if (backend === 'NVIDIA' && nvidiaKey) {
        const messages = [
          { role: 'system', content: voiceSystemPrompt },
          { role: 'user', content: prompt }
        ]
        const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${nvidiaKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'meta/llama-3.1-70b-instruct',
            messages,
            max_tokens: 300
          })
        })
        if (!res.ok) continue
        const data = await res.json()
        const text = sanitizeVoiceOutput(data?.choices?.[0]?.message?.content || '')
        if (text) {
          if (onChunk) onChunk(text)
          syncVoiceTurnToAssistantStore(prompt, text, 'NVIDIA')
          return text
        }
      }

      if (backend === 'OLLAMA') {
        const endpoint = getSanitizedOllamaEndpoint()
        const ollamaModel = localStorage.getItem('ollama_active_model') || 'llama3'
        const res = await fetch(`${endpoint}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(6000),
          body: JSON.stringify({
            model: ollamaModel,
            prompt: `${voiceSystemPrompt}\n\nUser: ${prompt}\nIris:`,
            stream: false
          })
        })
        if (!res.ok) continue
        const data = await res.json()
        const text = sanitizeVoiceOutput(data?.response || '')
        if (text) {
          if (onChunk) onChunk(text)
          syncVoiceTurnToAssistantStore(prompt, text, 'OLLAMA')
          return text
        }
      }

      if (backend === 'ONDEVICE') {
        const nanoRes = await GenAI.generateResponse(`${voiceSystemPrompt}\n\nUser: ${prompt}`)
        const text = sanitizeVoiceOutput(nanoRes?.response || '')
        if (text) {
          if (onChunk) onChunk(text)
          syncVoiceTurnToAssistantStore(prompt, text, 'ONDEVICE')
          return text
        }
      }
    } catch {}
  }

  throw new Error('Please configure your Gemini, Groq, or NVIDIA API key in Settings > IRIS Home & AI Assistant.')
}
