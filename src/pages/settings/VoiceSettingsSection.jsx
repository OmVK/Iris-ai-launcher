import React, { useState, useEffect } from 'react'
import SettingsSection from './SettingsSection'
import { SettingSlider, SettingToggle } from './SettingControls'
import { useAIStore } from '../../stores/aiStore'
import HapticFeedback from '../../utils/HapticFeedback'
import useVoiceEngine from '../../hooks/useVoiceEngine'
import { testCartesiaKey } from '../../utils/cartesiaTTS'

export default function VoiceSettingsSection({ expandedSections, toggleSection, voicePitch, setVoicePitch, voiceRate, setVoiceRate }) {
  const [haptics, setHaptics] = useState(() => HapticFeedback.isEnabled())
  const { 
    voiceTimbre, 
    setVoiceTimbre, 
    cartesiaKey, 
    setCartesiaKey, 
    voiceEngineProvider, 
    setVoiceEngineProvider, 
    loadKeys 
  } = useAIStore()
  
  const [keyInput, setKeyInput] = useState('')
  const [testStatus, setTestStatus] = useState(null) // null | { loading: boolean, success: boolean, msg: string }
  const [isSaved, setIsSaved] = useState(false)
  const { speakText } = useVoiceEngine()

  useEffect(() => {
    loadKeys()
  }, [loadKeys])

  useEffect(() => {
    setKeyInput(cartesiaKey || '')
  }, [cartesiaKey])

  const handleHapticsChange = (val) => {
    HapticFeedback.setEnabled(val)
    setHaptics(val)
  }

  const handleSaveKey = () => {
    setCartesiaKey(keyInput.trim())
    setIsSaved(true)
    HapticFeedback.trigger()
    setTimeout(() => setIsSaved(false), 2500)
  }

  const handleTestConnection = async () => {
    const keyToTest = keyInput.trim() || cartesiaKey.trim()
    if (!keyToTest) {
      setTestStatus({ loading: false, success: false, msg: 'Please paste a Cartesia API Key first' })
      return
    }
    setTestStatus({ loading: true, success: false, msg: 'Testing connection to Cartesia API...' })
    const res = await testCartesiaKey(keyToTest)
    if (res.success) {
      setTestStatus({ loading: false, success: true, msg: '🟢 API Key Validated! Cartesia Sonic 3.5 Ready.' })
      // Auto save if test passes
      setCartesiaKey(keyToTest)
      speakText('Cartesia Ultra-Realistic Human Voice engine is online and connected!')
    } else {
      setTestStatus({ loading: false, success: false, msg: `🔴 Verification Failed: ${res.error}` })
    }
  }

  const ENGINE_PROVIDERS = [
    { id: 'CARTESIA', label: 'Cartesia Neural API', desc: '100% Studio Human Voice', icon: 'graphic_eq' },
    { id: 'PIPER', label: 'Piper Neural TTS', desc: 'On-Device Local Model', icon: 'record_voice_over' },
    { id: 'NATIVE', label: 'Android Google TTS', desc: 'On-Device Engine', icon: 'android' },
    { id: 'WEB', label: 'Browser Web Speech', desc: 'System Web Standard', icon: 'language' }
  ]

  const VOICE_OPTIONS = [
    { id: 'natural_female', label: 'Natural Female (US)', desc: 'Warm & Fluent' },
    { id: 'natural_male', label: 'Natural Male (US)', desc: 'Crisp & Deep' },
    { id: 'british_female', label: 'Emma (British F)', desc: 'Articulate UK' },
    { id: 'british_male', label: 'George (British M)', desc: 'Commanding UK' },
    { id: 'narrator', label: 'Narrator (Deep)', desc: 'Resonant Tone' }
  ]

  const handleSelectVoice = (vId, label) => {
    setVoiceTimbre(vId)
    speakText(`Voice engine updated to ${label}. All systems nominal.`)
  }

  const handlePreview = () => {
    const activeLabel = VOICE_OPTIONS.find(v => v.id === voiceTimbre)?.label || 'Natural Female'
    speakText(`Speech synthesis active with ${activeLabel} profile.`)
  }

  return (
    <SettingsSection title="VOICE ENGINE & HAPTIC SETTINGS" icon="record_voice_over" sectionKey="voiceSettings" expandedSections={expandedSections} toggleSection={toggleSection}>
      
      {/* Active Engine Provider Selector */}
      <div className="space-y-1.5 mb-3">
        <p className="text-[8px] text-cyan-400 font-bold uppercase font-mono-data tracking-wider">ACTIVE SPEECH ENGINE PROVIDER</p>
        <div className="grid grid-cols-2 gap-1.5 font-mono">
          {ENGINE_PROVIDERS.map(p => (
            <button
              key={p.id}
              onClick={() => {
                setVoiceEngineProvider(p.id)
                HapticFeedback.trigger()
              }}
              className={`p-2 rounded border text-left transition-all active:scale-95 flex flex-col justify-between ${
                voiceEngineProvider === p.id 
                  ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300 font-bold shadow' 
                  : 'bg-black/30 border-white/10 text-on-surface-variant/60 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="material-symbols-outlined text-xs text-cyan-400">{p.icon}</span>
                {voiceEngineProvider === p.id && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>}
              </div>
              <span className="font-mono text-[8px] mt-1 font-bold truncate">{p.label}</span>
              <span className="text-[6px] text-on-surface-variant/40 uppercase truncate">{p.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Cartesia API Key Section */}
      <div className="p-3 rounded-lg bg-black/40 border border-cyan-500/20 space-y-2 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-xs text-cyan-400">key</span>
            <span className="text-[9px] font-bold text-cyan-200 font-mono">CARTESIA SONIC 3.5 API KEY</span>
          </div>
          <span className={`text-[7px] font-mono px-2 py-0.5 rounded border ${
            cartesiaKey ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
          }`}>
            {cartesiaKey ? 'KEY CONFIGURED' : 'NO API KEY'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <input
            type="password"
            placeholder="Paste Cartesia API key..."
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            className="flex-1 bg-black/60 border border-outline-variant/30 rounded px-2.5 py-1.5 text-[10px] text-cyan-300 placeholder:text-on-surface-variant/30 focus:border-cyan-400 outline-none font-mono"
          />
          <button
            onClick={handleSaveKey}
            className={`px-3 py-1.5 rounded text-[8px] font-bold font-mono transition-all active:scale-95 shrink-0 border ${
              isSaved
                ? 'bg-emerald-500/30 border-emerald-400 text-emerald-300'
                : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30'
            }`}
          >
            {isSaved ? 'SAVED!' : 'SAVE KEY'}
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <p className="text-[7px] text-on-surface-variant/50 leading-relaxed font-mono">
            Powers ultra-realistic studio human speech using Sonic 3.5.
          </p>
          <button
            onClick={handleTestConnection}
            disabled={testStatus?.loading}
            className="px-2.5 py-1 rounded bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 font-mono text-[8px] font-bold hover:bg-indigo-500/30 active:scale-95 disabled:opacity-50 shrink-0 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[10px]">sensors</span>
            {testStatus?.loading ? 'TESTING...' : 'TEST KEY'}
          </button>
        </div>

        {testStatus && (
          <div className={`p-1.5 rounded text-[8px] font-mono leading-tight border ${
            testStatus.loading 
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' 
              : testStatus.success 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
            {testStatus.msg}
          </div>
        )}
      </div>

      <SettingToggle label="Haptic Vibration Feedback" sublabel="VIBRATE_ON_TOUCH_GESTURES" icon="vibration" value={haptics} onChange={handleHapticsChange} />
      
      {/* Voice Profiles Grid */}
      <div className="space-y-1.5 mt-2">
        <p className="text-[8px] text-on-surface-variant/40 uppercase font-mono-data">VOICE ENGINE TIMBRE & PROFILE</p>
        <div className="grid grid-cols-2 gap-1.5">
          {VOICE_OPTIONS.map(v => (
            <button
              key={v.id}
              onClick={() => handleSelectVoice(v.id, v.label)}
              className={`p-2 rounded border text-left transition-all active:scale-95 flex flex-col justify-between ${
                voiceTimbre === v.id ? 'bg-primary-fixed-dim/15 border-primary-fixed-dim text-primary-fixed-dim font-bold shadow' : 'bg-black/20 border-outline-variant/20 text-on-surface-variant/70 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-mono-data text-[9px] truncate">{v.label}</span>
                {voiceTimbre === v.id && <span className="material-symbols-outlined text-xs text-cyan-400">volume_up</span>}
              </div>
              <span className="text-[7px] text-on-surface-variant/40 uppercase truncate">{v.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <SettingSlider label="VOICE PITCH" value={voicePitch} onChange={setVoicePitch} min="0.1" max="2.0" step="0.1" unit="x" />
      <SettingSlider label="SPEECH RATE (SPEED)" value={voiceRate} onChange={setVoiceRate} min="0.5" max="2.5" step="0.1" unit="x" />
      
      <div className="flex items-center justify-between gap-4 mt-3 pt-2 border-t border-white/5">
        <p className="text-[9px] text-on-surface-variant/50 uppercase leading-relaxed border-l-2 border-primary-fixed-dim/30 pl-2">
          Multi-profile voice synthesis engine active.
        </p>
        <button onClick={handlePreview}
          className="px-3 py-1.5 rounded bg-primary-fixed-dim/20 border border-primary-fixed-dim/40 text-primary-fixed-dim font-bold active:scale-95 transition-transform text-[9px] shrink-0 flex items-center gap-1">
          <span className="material-symbols-outlined text-[12px]">play_arrow</span>
          TEST VOICE
        </button>
      </div>
    </SettingsSection>
  )
}
