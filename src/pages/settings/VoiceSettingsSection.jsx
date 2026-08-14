import React, { useState, useEffect } from 'react'
import SettingsSection from './SettingsSection'
import { SettingSlider, SettingToggle } from './SettingControls'
import { useAIStore } from '../../stores/aiStore'
import HapticFeedback from '../../utils/HapticFeedback'
import useVoiceEngine from '../../hooks/useVoiceEngine'
import { SecureStorage } from '../../utils/secureStorage'

export default function VoiceSettingsSection({ expandedSections, toggleSection, voicePitch, setVoicePitch, voiceRate, setVoiceRate }) {
  const [haptics, setHaptics] = useState(() => HapticFeedback.isEnabled())
  const [cartesiaKey, setCartesiaKey] = useState('')
  const { voiceTimbre, setVoiceTimbre } = useAIStore()
  const { speakText } = useVoiceEngine()

  useEffect(() => {
    SecureStorage.getItem('cartesia_api_key').then(k => {
      if (k) setCartesiaKey(k)
    }).catch(() => {})
  }, [])

  const handleHapticsChange = (val) => {
    HapticFeedback.setEnabled(val)
    setHaptics(val)
  }

  const handleCartesiaChange = async (e) => {
    const val = e.target.value
    setCartesiaKey(val)
    await SecureStorage.setItem('cartesia_api_key', val.trim())
  }

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
      <SettingToggle label="Haptic Vibration Feedback" sublabel="VIBRATE_ON_TOUCH_GESTURES" icon="vibration" value={haptics} onChange={handleHapticsChange} />
      
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

      <div className="space-y-1.5 mt-3 pt-2 border-t border-white/5">
        <div className="flex items-center justify-between">
          <p className="text-[8px] text-primary-fixed-dim uppercase font-mono-data">CARTESIA SONIC 3.5 NEURAL VOICE API (HUMAN TTS)</p>
          <span className="text-[7px] text-cyan-400/80 font-mono-data">{cartesiaKey ? 'ACTIVE (HUMAN)' : 'OFF (SYSTEM)'}</span>
        </div>
        <input
          type="password"
          placeholder="Paste Cartesia API key for 100% human speech..."
          value={cartesiaKey}
          onChange={handleCartesiaChange}
          className="w-full bg-black/40 border border-outline-variant/30 rounded p-2 text-[10px] text-cyan-300 placeholder:text-on-surface-variant/30 focus:border-cyan-400 outline-none font-mono"
        />
        <p className="text-[7px] text-on-surface-variant/40">Enter a free/paid Cartesia API Key for photorealistic human neural voice synthesis.</p>
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
