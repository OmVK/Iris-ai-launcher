import SettingsSection from './SettingsSection'
import { SettingToggle } from './SettingControls'
import { useAIStore } from '../../stores/aiStore'

export default function NeuralSkillsSection({ expandedSections, toggleSection, showDrawerSearch, setShowDrawerSearch }) {
  const voiceEnabled = useAIStore(s => s.voiceEnabled)
  const setVoiceEnabled = useAIStore(s => s.setVoiceEnabled)

  const handleToggleVoice = (v) => {
    setVoiceEnabled(v)
    try { localStorage.setItem('assistant_tts_enabled', v.toString()) } catch {}
  }

  return (
    <SettingsSection title="NEURAL SKILLS ARCHITECTURE" icon="settings_input_component" sectionKey="neuralSkills" expandedSections={expandedSections} toggleSection={toggleSection}>
      <div className="space-y-3 font-mono-data text-xs">
        <SettingToggle label="WebSpeech Voice Feedback" sublabel="AUDIO_STREAM_CONTROL" icon="music_note" value={voiceEnabled} onChange={handleToggleVoice} />
        <SettingToggle label="Show Drawer Search Bar" sublabel="SHOW_SEARCH_IN_DRAWER" icon="search_off" value={showDrawerSearch} onChange={setShowDrawerSearch} />
      </div>
    </SettingsSection>
  )
}
