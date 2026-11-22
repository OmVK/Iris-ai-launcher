import { useState, useEffect } from 'react'
import SettingsSection from './SettingsSection'
import { SecureStorage } from '../../utils/secureStorage'

export default function ApiKeysSection({ expandedSections, toggleSection, geminiKey, setGeminiKey, groqKey, setGroqKey, embedded = false }) {
  const [nvidiaKey, setNvidiaKey] = useState('')
  const [saveStatus, setSaveStatus] = useState('')

  useEffect(() => {
    (async () => {
      setNvidiaKey(await SecureStorage.getItem('nvidia_api_key') || '')
    })()
  }, [])

  const handleSaveKeys = async () => {
    const results = await Promise.allSettled([
      SecureStorage.setItem('gemini_api_key', geminiKey),
      SecureStorage.setItem('groq_api_key', groqKey),
      SecureStorage.setItem('nvidia_api_key', nvidiaKey.trim()),
    ])
    const failures = results.filter(r => r.status === 'rejected')
    if (failures.length > 0) {
      setSaveStatus(`SAVED (${3 - failures.length}/3) — ${failures.length} FAILED`)
    } else {
      setSaveStatus('CREDENTIALS ENCRYPTED & SAVED SECURELY')
    }
    setTimeout(() => setSaveStatus(''), 3000)
  }

  const handleResetKeys = () => {
    setGeminiKey(''); setGroqKey(''); setNvidiaKey('')
    ;['gemini_api_key', 'groq_api_key', 'nvidia_api_key'].forEach(k => SecureStorage.removeItem(k))
    setSaveStatus('API CREDENTIALS ERASED')
    setTimeout(() => setSaveStatus(''), 3000)
  }

  const badge = saveStatus ? <span className="font-label-caps text-[8px] text-primary-fixed-dim bg-primary-fixed-dim/15 px-2 py-0.5 rounded animate-pulse">{saveStatus}</span> : null

  const body = (
    <div className="space-y-3">
      {saveStatus && embedded && (
        <div className="p-2 rounded bg-primary-fixed-dim/15 border border-primary-fixed-dim/30 text-[9px] text-primary-fixed-dim font-mono-data">
          {saveStatus}
        </div>
      )}
      {[
        { label: 'GEMINI_API_KEY', value: geminiKey, onChange: setGeminiKey, placeholder: 'AIzaSy... (Click Save Below)', test: async () => { const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', { headers: { 'x-goog-api-key': geminiKey } }); if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(`${res.status} - ${err?.error?.message || 'Unknown'}`); } const data = await res.json(); return data.models?.filter(m => m.supportedGenerationMethods?.includes('generateContent')).map(m => m.name.replace('models/', '')).join('\n') } },
        { label: 'GROQ_API_KEY', value: groqKey, onChange: setGroqKey, placeholder: 'gsk_... (Click Save Below)', test: async () => { const res = await fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${groqKey}` } }); if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(`${res.status} - ${err?.error?.message || 'Unknown'}`); } const data = await res.json(); return data.data?.map(m => m.id).join('\n') } },
        { label: 'NVIDIA_NIM_API_KEY', value: nvidiaKey, onChange: setNvidiaKey, placeholder: 'nvapi-... (Click Save Below)', test: async () => { const res = await fetch('https://integrate.api.nvidia.com/v1/models', { headers: { Authorization: `Bearer ${nvidiaKey}` } }); if (!res.ok) throw new Error(`${res.status}`); const data = await res.json(); return data.data?.map(m => m.id).filter(id => id.includes('instruct') || id.includes('chat')).slice(0, 20).join('\n') } },
      ].map(k => (
        <div key={k.label} className="flex flex-col gap-1.5">
          <label className="text-[9px] text-on-surface-variant flex justify-between">
            <span>{k.label}</span>
            <button onClick={async () => { try { const result = await k.test(); alert(`SUCCESS!\n\n${result}`) } catch (e) { alert(`Error: ${e.message}`) } }} className="text-[#ff007f] hover:underline">Test Key</button>
          </label>
          <input type="password" value={k.value} onChange={e => k.onChange(e.target.value)} placeholder={k.placeholder} className="bg-black/40 border border-outline-variant/30 rounded px-2.5 py-1.5 text-xs text-primary-fixed-dim focus:outline-none focus:border-primary-fixed-dim" />
        </div>
      ))}

      <div className="flex gap-2 justify-end pt-1">
        <button onClick={handleResetKeys} className="px-3 py-1.5 rounded hover:bg-white/10 text-on-surface-variant text-[10px]">WIPE_KEYS</button>
        <button onClick={handleSaveKeys} className="px-4 py-1.5 rounded bg-primary-fixed-dim/20 border border-primary-fixed-dim/40 text-primary-fixed-dim text-[10px] font-bold active:scale-95 transition-transform">SAVE ALL SECURE KEYS</button>
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
