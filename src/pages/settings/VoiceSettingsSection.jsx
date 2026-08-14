import React, { useState } from 'react'
import SettingsSection from './SettingsSection'
import { SettingSlider, SettingToggle } from './SettingControls'
import HapticFeedback from '../../utils/HapticFeedback'
import useVoiceEngine from '../../hooks/useVoiceEngine'

export default function VoiceSettingsSection({ expandedSections, toggleSection, voicePitch, setVoicePitch, voiceRate, setVoiceRate }) {
  const [haptics, setHaptics] = useState(() => HapticFeedback.isEnabled())
  const { speakText } = useVoiceEngine()

  const handleHapticsChange = (val) => {
    HapticFeedback.setEnabled(val)
    setHaptics(val)
  }

  const handlePreview = () => {
    speakText('Piper ONNX neural voice engine initialized. All systems nominal.')
  }

  return (
    <SettingsSection title="VOICE ENGINE & HAPTIC SETTINGS" icon="record_voice_over" sectionKey="voiceSettings" expandedSections={expandedSections} toggleSection={toggleSection}>
      <SettingToggle label="Haptic Vibration Feedback" sublabel="VIBRATE_ON_TOUCH_GESTURES" icon="vibration" value={haptics} onChange={handleHapticsChange} />
      
      <SettingSlider label="VOICE PITCH" value={voicePitch} onChange={setVoicePitch} min="0.1" max="2.0" step="0.1" unit="x" />
      <SettingSlider label="SPEECH RATE (SPEED)" value={voiceRate} onChange={setVoiceRate} min="0.5" max="2.5" step="0.1" unit="x" />
      
      <div className="flex items-center justify-between gap-4 mt-3 pt-2 border-t border-white/5">
        <p className="text-[9px] text-on-surface-variant/50 uppercase leading-relaxed border-l-2 border-primary-fixed-dim/30 pl-2">
          Piper ONNX 100% offline neural voice synthesis active.
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
