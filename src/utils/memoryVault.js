import { registerPlugin } from '@capacitor/core'
import { useAssistantStore } from '../stores/assistantStore'

const LauncherPlugin = registerPlugin('LauncherPlugin')

const MEMORY_FACTS_KEY = 'iris_long_term_memory_v1'
const ROLLING_HISTORY_KEY = 'iris_rolling_conversation_v1'
const MAX_FACTS = 40
const MAX_ROLLING_TURNS = 20

export function getLongTermMemories() {
  try {
    const raw = localStorage.getItem(MEMORY_FACTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(Boolean) : []
  } catch {
    return []
  }
}

export function saveLongTermMemoryFact(fact) {
  if (!fact || typeof fact !== 'string') return
  const cleaned = fact.replace(/\s+/g, ' ').trim()
  if (cleaned.length < 4 || cleaned.length > 260) return
  try {
    const existing = getLongTermMemories()
    const lowerCleaned = cleaned.toLowerCase()
    const filtered = existing.filter(f => f.toLowerCase() !== lowerCleaned)
    const updated = [...filtered, cleaned].slice(-MAX_FACTS)
    localStorage.setItem(MEMORY_FACTS_KEY, JSON.stringify(updated))
    syncMemoryToNative(updated, null)
  } catch {}
}

export function extractAndStoreMemoriesFromTurn(userText, aiResponse = '') {
  if (!userText || typeof userText !== 'string') return []
  const extracted = []
  const cleanUser = userText.trim()

  // 1. Explicit "remember that..." / "don't forget..." / "keep in mind..."
  const explicitMatch = cleanUser.match(/(?:remember\s+(?:that\s+)?|don'?t\s+forget\s+(?:that\s+)?|keep\s+in\s+mind\s+(?:that\s+)?|note\s+that\s+)(.{5,200})/i)
  if (explicitMatch?.[1]) {
    extracted.push(`User asked to remember: ${explicitMatch[1].trim()}`)
  }

  // 2. Identity & personal facts ("my name is...", "call me...", "I work as...", "I live in...", "my girlfriend/wife/friend/brother/boss is...")
  const identityPatterns = [
    /\bmy\s+name\s+is\s+([A-Za-z][A-Za-z\s]{1,35})/i,
    /\bcall\s+me\s+([A-Za-z][A-Za-z\s]{1,25})/i,
    /\bi\s+(?:am\s+a|work\s+as\s+(?:a|an)?|study)\s+([A-Za-z0-9\s,&-]{3,60})/i,
    /\bi\s+live\s+in\s+([A-Za-z\s,]{2,45})/i,
    /\bmy\s+(girlfriend|boyfriend|wife|husband|partner|best\s+friend|brother|sister|mom|mother|dad|father|boss|manager|dog|cat)(?:'s\s+name)?\s+is\s+([A-Za-z][A-Za-z\s]{1,35})/i,
    /\bmy\s+(?:favorite|preferred)\s+([a-z\s]{2,25})\s+is\s+([^.!?,]{2,50})/i,
    /\bi\s+(?:always\s+)?prefer\s+([^.!?]{4,80})/i,
  ]

  for (const regex of identityPatterns) {
    const m = cleanUser.match(regex)
    if (m) {
      extracted.push(`User fact: "${m[0].trim()}"`)
    }
  }

  // 3. Parse [[MEMORY: ...]] tags emitted by the LLM response
  if (aiResponse && typeof aiResponse === 'string') {
    const tagRegex = /\[\[MEMORY:\s*([^\]]+)\]\]/gi
    let match
    while ((match = tagRegex.exec(aiResponse)) !== null) {
      if (match[1]?.trim()) {
        extracted.push(match[1].trim())
      }
    }
  }

  for (const fact of extracted) {
    saveLongTermMemoryFact(fact)
  }
  return extracted
}

export function stripMemoryTags(text) {
  if (!text || typeof text !== 'string') return text
  return text.replace(/\[\[MEMORY:\s*[^\]]+\]\]/gi, '').trim()
}

export function getRollingConversationHistory() {
  const turns = []
  try {
    const raw = localStorage.getItem(ROLLING_HISTORY_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        for (const t of parsed) {
          if (t && (t.role === 'user' || t.role === 'assistant') && t.text) {
            turns.push({ role: t.role, text: t.text })
          }
        }
      }
    }
  } catch {}

  if (turns.length === 0) {
    try {
      const chatLog = useAssistantStore.getState().chatLog || []
      for (const msg of chatLog.slice(-14)) {
        if (msg?.text && !msg.loading && (msg.type === 'user' || msg.type === 'assistant')) {
          turns.push({
            role: msg.type === 'user' || msg.sender === 'USER' ? 'user' : 'assistant',
            text: msg.text
          })
        }
      }
    } catch {}
  }

  return turns.slice(-MAX_ROLLING_TURNS)
}

export function appendConversationTurn(userText, assistantText) {
  if (!userText && !assistantText) return
  try {
    const current = getRollingConversationHistory()
    if (userText) {
      const last = current[current.length - 1]
      if (!last || last.role !== 'user' || last.text !== userText) {
        current.push({ role: 'user', text: userText })
      }
    }
    if (assistantText) {
      const cleanReply = stripMemoryTags(assistantText)
      const last = current[current.length - 1]
      if (!last || last.role !== 'assistant' || last.text !== cleanReply) {
        current.push({ role: 'assistant', text: cleanReply })
      }
    }
    const trimmed = current.slice(-MAX_ROLLING_TURNS)
    localStorage.setItem(ROLLING_HISTORY_KEY, JSON.stringify(trimmed))
    extractAndStoreMemoriesFromTurn(userText, assistantText)
    syncMemoryToNative(null, trimmed)
  } catch {}
}

export function buildMemoryPromptBlock() {
  const facts = getLongTermMemories()
  if (!facts.length) return ''
  return `\n[PERSISTENT LONG-TERM USER MEMORY VAULT — FACTS YOU REMEMBER ABOUT THE USER]:\n${facts.map((f, i) => `${i + 1}. ${f}`).join('\n')}\nUse these remembered facts naturally for continuity without repeating them unless relevant.`
}

export function syncMemoryToNative(factsList = null, historyList = null) {
  try {
    const facts = factsList || getLongTermMemories()
    const history = historyList || getRollingConversationHistory()
    if (typeof LauncherPlugin?.syncMemoryVault === 'function') {
      LauncherPlugin.syncMemoryVault({
        memoriesJson: JSON.stringify(facts),
        historyJson: JSON.stringify(history.slice(-16))
      }).catch(() => {})
    }
  } catch {}
}
