import { useState, useEffect } from 'react'
import SettingsSection from './SettingsSection'
import { SettingToggle } from './SettingControls'
import { useAIStore } from '../../stores/aiStore'
import { isFloatingCopilotEnabled, toggleFloatingCopilot, openSystemSettings } from '../../components/LauncherPlugin'

export default function NeuralSkillsSection({ expandedSections, toggleSection, showDrawerSearch, setShowDrawerSearch }) {
  const voiceEnabled = useAIStore(s => s.voiceEnabled)
  const setVoiceEnabled = useAIStore(s => s.setVoiceEnabled)
  const [copilotActive, setCopilotActive] = useState(true)
  const [needsAccessibility, setNeedsAccessibility] = useState(false)

  useEffect(() => {
    isFloatingCopilotEnabled().then((res) => {
      if (typeof res?.enabled === 'boolean') {
        setCopilotActive(res.enabled)
      }
      if (res?.serviceRunning === false) {
        setNeedsAccessibility(true)
      }
    })
  }, [])

  const handleToggleVoice = (v) => {
    setVoiceEnabled(v)
    try { localStorage.setItem('assistant_tts_enabled', v.toString()) } catch {}
  }

  const handleToggleCopilot = async (v) => {
    setCopilotActive(v)
    const res = await toggleFloatingCopilot(v)
    if (res?.needsAccessibility) {
      setNeedsAccessibility(true)
    }
  }

  return (
    <SettingsSection title="NEURAL SKILLS ARCHITECTURE" icon="settings_input_component" sectionKey="neuralSkills" expandedSections={expandedSections} toggleSection={toggleSection}>
      <div className="space-y-3 font-mono-data text-xs">
        <SettingToggle
          label="Floating Screen Copilot"
          sublabel="CROSS_APP_AI_OVERLAY"
          icon="smart_toy"
          value={copilotActive}
          onChange={handleToggleCopilot}
        />
        {needsAccessibility && copilotActive && (
          <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-400/30 flex items-center justify-between gap-2">
            <span className="text-[8px] text-amber-200">Requires IRIS Accessibility Service to read active screens & insert text</span>
            <button
              type="button"
              onClick={() => openSystemSettings('accessibility')}
              className="px-2 py-1 rounded bg-amber-400 text-black font-bold text-[8px] uppercase tracking-wider shrink-0"
            >
              ENABLE
            </button>
          </div>
        )}
        <SettingToggle label="WebSpeech Voice Feedback" sublabel="AUDIO_STREAM_CONTROL" icon="music_note" value={voiceEnabled} onChange={handleToggleVoice} />
        <SettingToggle label="Show Drawer Search Bar" sublabel="SHOW_SEARCH_IN_DRAWER" icon="search_off" value={showDrawerSearch} onChange={setShowDrawerSearch} />
      </div>
    </SettingsSection>
  )
}
