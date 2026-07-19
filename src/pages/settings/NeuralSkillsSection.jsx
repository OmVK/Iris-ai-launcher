import { useState } from 'react'
import SettingsSection from './SettingsSection'
import { SettingToggle } from './SettingControls'

export default function NeuralSkillsSection({ expandedSections, toggleSection, showDrawerSearch, setShowDrawerSearch }) {
  const [useSpeech, setUseSpeech] = useState(() => localStorage.getItem('assistant_tts_enabled') !== 'false')

  return (
    <SettingsSection title="NEURAL SKILLS ARCHITECTURE" icon="settings_input_component" sectionKey="neuralSkills" expandedSections={expandedSections} toggleSection={toggleSection}>
      <div className="space-y-3 font-mono-data text-xs">
        <SettingToggle label="WebSpeech Voice Feedback" sublabel="AUDIO_STREAM_CONTROL" icon="music_note" value={useSpeech} onChange={(v) => { setUseSpeech(v); localStorage.setItem('assistant_tts_enabled', v.toString()) }} />
        <SettingToggle label="Show Drawer Search Bar" sublabel="SHOW_SEARCH_IN_DRAWER" icon="search_off" value={showDrawerSearch} onChange={setShowDrawerSearch} />
      </div>
    </SettingsSection>
  )
}
