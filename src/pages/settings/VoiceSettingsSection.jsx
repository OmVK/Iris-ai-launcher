import React, { useState } from 'react'
import SettingsSection from './SettingsSection'
import { SettingSlider, SettingToggle } from './SettingControls'
import { useAIStore } from '../../stores/aiStore'
import HapticFeedback from '../../utils/HapticFeedback'
import useVoiceEngine from '../../hooks/useVoiceEngine'

export default function VoiceSettingsSection({ expandedSections, toggleSection, voicePitch, setVoicePitch, voiceRate, setVoiceRate }) {
  const [haptics, setHaptics] = useState(() => HapticFeedback.isEnabled())
  const { kokoroVoice, setKokoroVoice } = useAIStore()
  const { speakText } = useVoiceEngine()

  const handleHapticsChange = (val) => {
    HapticFeedback.setEnabled(val)
    setHaptics(val)
  }

  const KOKORO_VOICES = [
    { id: 'af_heart', label: 'Heart (Female)', desc: 'Warm & Natural' },
    { id: 'am_adam', label: 'Adam (Male)', desc: 'Deep & Crisp' },
    { id: 'bf_emma', label: 'Emma (British F)', desc: 'Articulate' },
    { id: 'bm_george', label: 'George (British M)', desc: 'Commanding' },
    { id: 'af_nicole', label: 'Nicole (Soft F)', desc: 'Gentle Tone' },
    { id: 'am_michael', label: 'Michael (Narrator)', desc: 'Clear Voice' }
  ]

  const handleSelectVoice = (vId, label) => {
    setKokoroVoice(vId)
    speakText(`Kokoro ${label} voice online.`)
  }

  const handlePreview = () => {
    const activeLabel = KOKORO_VOICES.find(v => v.id === kokoroVoice)?.label || 'Heart'
    speakText(`Kokoro 82M neural voice engine set to ${activeLabel}. All systems nominal.`)
  }

  return (
    <SettingsSection title="VOICE ENGINE & HAPTIC SETTINGS" icon="record_voice_over" sectionKey="voiceSettings" expandedSections={expandedSections} toggleSection={toggleSection}>
      <SettingToggle label="Haptic Vibration Feedback" sublabel="VIBRATE_ON_TOUCH_GESTURES" icon="vibration" value={haptics} onChange={handleHapticsChange} />
      
      <div className="space-y-1.5 mt-2">
        <p className="text-[8px] text-on-surface-variant/40 uppercase font-mono-data">KOKORO-82M NEURAL VOICE TIMBRE</p>
        <div className="grid grid-cols-2 gap-1.5">
          {KOKORO_VOICES.map(v => (
            <button
              key={v.id}
              onClick={() => handleSelectVoice(v.id, v.label)}
              className={`p-2 rounded border text-left transition-all active:scale-95 flex flex-col justify-between ${
                kokoroVoice === v.id ? 'bg-primary-fixed-dim/15 border-primary-fixed-dim text-primary-fixed-dim font-bold shadow' : 'bg-black/20 border-outline-variant/20 text-on-surface-variant/70 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-mono-data text-[9px] truncate">{v.label}</span>
                {kokoroVoice === v.id && <span className="material-symbols-outlined text-xs text-cyan-400">volume_up</span>}
              </div>
              <span className="text-[7px] text-on-surface-variant/40 uppercase truncate">{v.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <SettingSlider label="VOICE PITCH" value={voicePitch} onChange={setVoicePitch} min="0.1" max="2.0" step="0.1" unit="x" />
      <SettingSlider label="SPEECH RATE (SPEED)" value={voiceRate} onChange={setVoiceRate} min="0.5" max="2.5" step="0.1" unit="x" />
      
      <div className="flex items-center justify-between gap-4 mt-2">
        <p className="text-[9px] text-on-surface-variant/50 uppercase leading-relaxed border-l-2 border-primary-fixed-dim/30 pl-2">
          Kokoro-82M 100% offline neural voice synthesis.
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
