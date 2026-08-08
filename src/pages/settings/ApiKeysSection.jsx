import { useState, useEffect } from 'react'
import SettingsSection from './SettingsSection'
import { SecureStorage } from '../../utils/secureStorage'

export default function ApiKeysSection({ expandedSections, toggleSection, geminiKey, setGeminiKey, groqKey, setGroqKey }) {
  const [cartesiaKey, setCartesiaKey] = useState('')
  const [cartesiaVoiceId, setCartesiaVoiceId] = useState('694f9389-aac1-45b6-b726-9d9369183238')
  const [nvidiaKey, setNvidiaKey] = useState('')
  const [saveStatus, setSaveStatus] = useState('')

  useEffect(() => {
    (async () => {
      setCartesiaKey(await SecureStorage.getItem('cartesia_api_key') || '')
      setCartesiaVoiceId(localStorage.getItem('cartesia_voice_id') || '694f9389-aac1-45b6-b726-9d9369183238')
      setNvidiaKey(await SecureStorage.getItem('nvidia_api_key') || '')
    })()
  }, [])

  const handleSaveKeys = async () => {
    const results = await Promise.allSettled([
      SecureStorage.setItem('gemini_api_key', geminiKey),
      SecureStorage.setItem('groq_api_key', groqKey),
      SecureStorage.setItem('cartesia_api_key', cartesiaKey.trim()),
      SecureStorage.setItem('nvidia_api_key', nvidiaKey.trim()),
    ])
    const failures = results.filter(r => r.status === 'rejected')
    if (failures.length > 0) {
      setSaveStatus(`SAVED (${4 - failures.length}/4) — ${failures.length} FAILED`)
    } else {
      localStorage.setItem('cartesia_voice_id', cartesiaVoiceId.trim())
      setSaveStatus('CREDENTIALS ENCRYPTED & SAVED SECURELY')
    }
    setTimeout(() => setSaveStatus(''), 3000)
  }

  const handleResetKeys = () => {
    setGeminiKey(''); setGroqKey(''); setCartesiaKey(''); setCartesiaVoiceId('694f9389-aac1-45b6-b726-9d9369183238'); setNvidiaKey('')
    ;['gemini_api_key', 'groq_api_key', 'cartesia_api_key', 'nvidia_api_key'].forEach(k => SecureStorage.removeItem(k))
    localStorage.removeItem('cartesia_voice_id')
    setSaveStatus('API CREDENTIALS ERASED')
    setTimeout(() => setSaveStatus(''), 3000)
  }

  const badge = saveStatus ? <span className="font-label-caps text-[8px] text-primary-fixed-dim bg-primary-fixed-dim/15 px-2 py-0.5 rounded animate-pulse">{saveStatus}</span> : null

  return (
    <SettingsSection title="SECURE API CREDENTIALS" icon="lock" sectionKey="apiKeys" expandedSections={expandedSections} toggleSection={toggleSection} badge={badge}>
      <div className="space-y-3">
        {[
          { label: 'GEMINI_API_KEY', value: geminiKey, onChange: setGeminiKey, placeholder: 'AIzaSy... (Click Save Below)', test: async () => { const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', { headers: { 'x-goog-api-key': geminiKey } }); if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(`${res.status} - ${err?.error?.message || 'Unknown'}`); } const data = await res.json(); return data.models?.filter(m => m.supportedGenerationMethods?.includes('generateContent')).map(m => m.name.replace('models/', '')).join('\n') } },
          { label: 'GROQ_API_KEY', value: groqKey, onChange: setGroqKey, placeholder: 'gsk_... (Click Save Below)', test: async () => { const res = await fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${groqKey}` } }); if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(`${res.status} - ${err?.error?.message || 'Unknown'}`); } const data = await res.json(); return data.data?.map(m => m.id).join('\n') } },
          { label: 'NVIDIA_NIM_API_KEY', value: nvidiaKey, onChange: setNvidiaKey, placeholder: 'nvapi-... (Click Save Below)', test: async () => { const res = await fetch('https://integrate.api.nvidia.com/v1/models', { headers: { Authorization: `Bearer ${nvidiaKey}` } }); if (!res.ok) throw new Error(`${res.status}`); const data = await res.json(); return data.data?.map(m => m.id).filter(id => id.includes('instruct') || id.includes('chat')).slice(0, 20).join('\n') } },
          { label: 'CARTESIA_API_KEY (Sonic Real-Time TTS)', value: cartesiaKey, onChange: setCartesiaKey, placeholder: 'sk_... (Click Save Below)', test: async () => { const res = await fetch('https://api.cartesia.ai/voices', { headers: { 'X-API-Key': cartesiaKey.trim(), 'Cartesia-Version': '2024-06-10' } }); if (!res.ok) throw new Error(`${res.status}`); return 'Key is valid.' } }
        ].map(k => (
          <div key={k.label} className="flex flex-col gap-1.5">
            <label className="text-[9px] text-on-surface-variant flex justify-between">
              <span>{k.label}</span>
              <button onClick={async () => { try { const result = await k.test(); alert(`SUCCESS!\n\n${result}`) } catch (e) { alert(`Error: ${e.message}`) } }} className="text-[#ff007f] hover:underline">Test Key</button>
            </label>
            <input type="password" value={k.value} onChange={e => k.onChange(e.target.value)} placeholder={k.placeholder} className="bg-black/40 border border-outline-variant/30 rounded px-2.5 py-1.5 text-xs text-primary-fixed-dim focus:outline-none focus:border-primary-fixed-dim" />
          </div>
        ))}

        <div className="flex flex-col gap-1.5 mt-2">
          <label className="text-[9px] text-on-surface-variant">CARTESIA VOICE SELECTION</label>
          <select value={cartesiaVoiceId} onChange={e => setCartesiaVoiceId(e.target.value)} className="bg-black/40 border border-outline-variant/30 rounded px-2.5 py-1.5 text-xs text-primary-fixed-dim focus:outline-none focus:border-primary-fixed-dim">
            <option value="694f9389-aac1-45b6-b726-9d9369183238">Sarah (Default Female)</option>
            <option value="71a7ad14-091c-4e8e-a314-022ece01c121">British Reading Lady</option>
            <option value="4d2fd738-3b3d-4368-957a-bb4805275bd9">British Narration Lady</option>
            <option value="a01c369f-6d2d-4185-bc20-b32c225eab70">British Customer Support</option>
            <option value="a0e99841-438c-4a64-b679-ae501e7d6091">Helpful Man</option>
            <option value="b7d50908-b17c-442d-ad8d-810c63997ed9">California Girl</option>
          </select>
          <input type="text" value={cartesiaVoiceId} onChange={e => setCartesiaVoiceId(e.target.value)} placeholder="Or paste a Custom Voice ID here..." className="bg-black/40 border border-outline-variant/30 rounded px-2.5 py-1.5 text-[10px] text-primary-fixed-dim focus:outline-none focus:border-primary-fixed-dim mt-1" />
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <button onClick={handleResetKeys} className="px-3 py-1.5 rounded hover:bg-white/10 text-on-surface-variant text-[10px]">WIPE_KEYS</button>
          <button onClick={handleSaveKeys} className="px-4 py-1.5 rounded bg-primary-fixed-dim/20 border border-primary-fixed-dim/40 text-primary-fixed-dim text-[10px] font-bold active:scale-95 transition-transform">SAVE ALL SECURE KEYS</button>
        </div>
      </div>
    </SettingsSection>
  )
}
