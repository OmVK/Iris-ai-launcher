import { useState, useEffect } from 'react'
import SettingsSection from './SettingsSection'
import { SecureStorage } from '../../utils/secureStorage'
import { useAIStore } from '../../stores/aiStore'

export default function ApiKeysSection({ expandedSections, toggleSection, geminiKey, setGeminiKey, groqKey, setGroqKey, embedded = false }) {
  const [nvidiaKey, setNvidiaKey] = useState('')
  const [saveStatus, setSaveStatus] = useState('')
  const [testResult, setTestResult] = useState(null)

  useEffect(() => {
    (async () => {
      setNvidiaKey(await SecureStorage.getItem('nvidia_api_key') || '')
    })()
  }, [])

  const handleSaveKeys = async () => {
    const cleanGemini = (geminiKey || '').trim()
    const cleanGroq = (groqKey || '').trim()
    const cleanNvidia = (nvidiaKey || '').trim()
    setGeminiKey(cleanGemini)
    setGroqKey(cleanGroq)
    const results = await Promise.allSettled([
      SecureStorage.setItem('gemini_api_key', cleanGemini),
      SecureStorage.setItem('groq_api_key', cleanGroq),
      SecureStorage.setItem('nvidia_api_key', cleanNvidia),
    ])
    await useAIStore.getState().loadKeys().catch(() => {})
    const failures = results.filter(r => r.status === 'rejected')
    if (failures.length > 0) {
      setSaveStatus(`SAVED (${3 - failures.length}/3) — ${failures.length} FAILED`)
    } else {
      setSaveStatus('CREDENTIALS ENCRYPTED & SYNCED TO HOME + IRIS AI')
    }
    setTimeout(() => setSaveStatus(''), 3500)
  }

  const handleResetKeys = () => {
    setGeminiKey('')
    setGroqKey('')
    setNvidiaKey('')
    ;['gemini_api_key', 'groq_api_key', 'nvidia_api_key'].forEach(k => SecureStorage.removeItem(k))
    setSaveStatus('API CREDENTIALS ERASED')
    setTestResult(null)
    setTimeout(() => setSaveStatus(''), 3000)
  }

  const runKeyTest = async (item) => {
    const val = (item.value || '').trim()
    if (!val) {
      setTestResult({ ok: false, label: item.label, text: 'Please paste an API key first.' })
      return
    }
    setTestResult({ loading: true, label: item.label, text: `Verifying ${item.label}...` })
    try {
      const models = await item.test(val)
      setTestResult({
        ok: true,
        label: item.label,
        text: `VERIFIED (${models.length} live models ready): ${models.slice(0, 4).join(', ')}`
      })
    } catch (e) {
      setTestResult({ ok: false, label: item.label, text: `Verification failed: ${e.message}` })
    }
  }

  const keyEntries = [
    {
      label: 'GEMINI_API_KEY',
      value: geminiKey,
      onChange: setGeminiKey,
      placeholder: 'AIzaSy... (Google AI Studio Key)',
      test: async (val) => {
        const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', { headers: { 'x-goog-api-key': val } })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(`${res.status} - ${err?.error?.message || 'Unauthorized'}`)
        }
        const data = await res.json()
        return (data.models || [])
          .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
          .map(m => m.name.replace('models/', ''))
      }
    },
    {
      label: 'GROQ_API_KEY',
      value: groqKey,
      onChange: setGroqKey,
      placeholder: 'gsk_... (Groq Cloud LPU Key)',
      test: async (val) => {
        const res = await fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${val}` } })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(`${res.status} - ${err?.error?.message || 'Unauthorized'}`)
        }
        const data = await res.json()
        return (data.data || []).map(m => m.id)
      }
    },
    {
      label: 'NVIDIA_NIM_API_KEY',
      value: nvidiaKey,
      onChange: setNvidiaKey,
      placeholder: 'nvapi-... (NVIDIA NIM Key)',
      test: async (val) => {
        const res = await fetch('https://integrate.api.nvidia.com/v1/models', { headers: { Authorization: `Bearer ${val}` } })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        return (data.data || []).map(m => m.id).filter(id => id.includes('instruct') || id.includes('chat'))
      }
    },
  ]

  const badge = saveStatus ? <span className="font-label-caps text-[8px] text-primary-fixed-dim bg-primary-fixed-dim/15 px-2 py-0.5 rounded animate-pulse">{saveStatus}</span> : null

  const body = (
    <div className="space-y-3">
      {saveStatus && (
        <div className="p-2 rounded bg-emerald-500/15 border border-emerald-400/30 text-[9px] text-emerald-300 font-mono-data font-bold">
          {saveStatus}
        </div>
      )}

      {testResult && (
        <div className={`p-2 rounded border text-[8.5px] font-mono-data leading-relaxed ${
          testResult.loading
            ? 'bg-amber-500/10 border-amber-400/30 text-amber-300'
            : testResult.ok
              ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-400/30 text-rose-300'
        }`}>
          <span className="font-bold">{testResult.label}: </span>
          <span>{testResult.text}</span>
        </div>
      )}

      {keyEntries.map(k => (
        <div key={k.label} className="flex flex-col gap-1.5">
          <div className="text-[9px] text-on-surface-variant flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="font-mono-data font-bold">{k.label}</span>
              <span className={`text-[7px] font-mono px-1.5 py-0.2 rounded border ${
                k.value?.trim()
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  : 'bg-white/5 border-white/15 text-white/40'
              }`}>
                {k.value?.trim() ? 'CONFIGURED' : 'EMPTY'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => runKeyTest(k)}
              className="px-2 py-0.5 rounded bg-primary-fixed-dim/15 border border-primary-fixed-dim/35 text-primary-fixed-dim font-mono text-[8px] font-bold active:scale-95"
            >
              VERIFY KEY
            </button>
          </div>
          <input
            type="password"
            value={k.value}
            onChange={e => k.onChange(e.target.value)}
            placeholder={k.placeholder}
            className="bg-black/40 border border-outline-variant/30 rounded px-2.5 py-1.5 text-xs text-primary-fixed-dim focus:outline-none focus:border-primary-fixed-dim font-mono"
          />
        </div>
      ))}

      <div className="flex gap-2 justify-end pt-1">
        <button type="button" onClick={handleResetKeys} className="px-3 py-1.5 rounded hover:bg-white/10 text-on-surface-variant text-[10px] font-mono">WIPE KEYS</button>
        <button type="button" onClick={handleSaveKeys} className="px-4 py-1.5 rounded bg-primary-fixed-dim/20 border border-primary-fixed-dim/40 text-primary-fixed-dim text-[10px] font-bold font-mono active:scale-95 transition-transform">SAVE ALL SECURE KEYS</button>
      </div>
    </div>
  )

  if (embedded) return body

  return (
    <SettingsSection title="SECURE API CREDENTIALS" icon="lock" sectionKey="apiKeys" expandedSections={expandedSections} toggleSection={toggleSection} badge={badge}>
      {body}
    </SettingsSection>
  )
}
