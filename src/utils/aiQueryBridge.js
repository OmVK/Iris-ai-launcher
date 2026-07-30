import { useAIStore } from '../stores/aiStore'
import { SecureStorage } from './secureStorage'

export async function queryIrisAI(prompt, onChunk) {
  const { geminiKey, groqKey, llmBackend } = useAIStore.getState()
  const activeBackend = llmBackend || (geminiKey ? 'GEMINI' : groqKey ? 'GROQ' : 'GEMINI')

  if (activeBackend === 'GEMINI' && geminiKey) {
    let model = (localStorage.getItem('gemini_model') || 'gemini-2.0-flash').trim().replace(/\s+/g, '-')
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: 'You are Iris AI, a smart Android voice assistant. Answer directly and concisely in 1 to 3 sentences so it reads cleanly via voice.' }] }
      })
    })

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson?.error?.message || `Gemini API error ${res.status}`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let fullText = ''

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
            if (onChunk) onChunk(fullText)
          }
        } catch {}
      }
    }
    return fullText
  } else if (activeBackend === 'GROQ' && groqKey) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are Iris AI, a smart Android voice assistant. Answer directly and concisely in 1 to 3 sentences.' },
          { role: 'user', content: prompt }
        ]
      })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error?.message || `Groq API error ${res.status}`)
    const text = data?.choices?.[0]?.message?.content || 'I could not process that query.'
    if (onChunk) onChunk(text)
    return text
  } else {
    throw new Error('Please configure your API key in Settings > AI Settings to ask Iris AI.')
  }
}
