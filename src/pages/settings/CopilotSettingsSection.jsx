import { useState, useEffect } from 'react'
import SettingsSection from './SettingsSection'
import { SettingToggle, SettingSlider, SettingOptionGrid } from './SettingControls'
import { getCopilotSettings, updateCopilotSettings, openSystemSettings } from '../../components/LauncherPlugin'

const PERSONA_MODE_OPTIONS = [
  { id: 'AUTO', label: '⚡ AUTO SMART' },
  { id: 'INTERVIEW', label: '🎯 INTERVIEW' },
  { id: 'STUDENT', label: '🎓 STUDENT' },
]

const TIMEOUT_OPTIONS = [
  { id: 0, label: 'NEVER' },
  { id: 3, label: '3 SEC' },
  { id: 5, label: '5 SEC' },
  { id: 10, label: '10 SEC' },
]

const PILL_SIZE_OPTIONS = [
  { id: 'COMPACT', label: 'COMPACT' },
  { id: 'NORMAL', label: 'NORMAL' },
  { id: 'LARGE', label: 'LARGE' },
]

const EDGE_SIDE_OPTIONS = [
  { id: 'RIGHT', label: 'RIGHT EDGE' },
  { id: 'LEFT', label: 'LEFT EDGE' },
  { id: 'FREE', label: 'FREE DRAG' },
]

const USER_STYLE_OPTIONS = [
  { id: 'NATURAL', label: 'NATURAL' },
  { id: 'CASUAL_LOWER', label: 'CASUAL LOWER' },
  { id: 'EXECUTIVE_PRO', label: 'EXECUTIVE PRO' },
  { id: 'DIRECT', label: 'DIRECT PUNCHY' },
]

export default function CopilotSettingsSection({ expandedSections, toggleSection }) {
  const [settings, setSettings] = useState({
    enabled: true,
    opacity: 55,
    timeoutSec: 3,
    showOnHome: true,
    pillSize: 'NORMAL',
    edgeSide: 'RIGHT',
    autoKeyboard: true,
    onlyWhenTyping: false,
    userStyle: 'NATURAL',
    personaMode: 'AUTO',
    userBio: '',
    clipboardTrigger: true,
    serviceRunning: true,
  })
  const [bioSaved, setBioSaved] = useState(false)

  useEffect(() => {
    getCopilotSettings().then((res) => {
      if (res) {
        setSettings((prev) => ({ ...prev, ...res }))
      }
    })
  }, [])

  const applySetting = async (patch) => {
    setSettings((prev) => ({ ...prev, ...patch }))
    const res = await updateCopilotSettings(patch)
    if (res && typeof res.serviceRunning === 'boolean') {
      setSettings((prev) => ({ ...prev, serviceRunning: res.serviceRunning }))
    }
  }

  const handleSaveBio = () => {
    applySetting({ userBio: settings.userBio })
    setBioSaved(true)
    setTimeout(() => setBioSaved(false), 2000)
  }

  return (
    <SettingsSection
      title="IRIS COPILOT"
      icon="smart_toy"
      sectionKey="irisCopilot"
      expandedSections={expandedSections}
      toggleSection={toggleSection}
    >
      <div className="space-y-4 font-mono-data text-xs">
        <SettingToggle
          label="Enable Floating Copilot"
          sublabel="CROSS_APP_AI_PILL_OVERLAY"
          icon="smart_toy"
          value={settings.enabled}
          onChange={(v) => applySetting({ enabled: v })}
        />

        {!settings.serviceRunning && settings.enabled && (
          <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-400/30 flex items-center justify-between gap-2">
            <span className="text-[8px] text-amber-200">
              Requires IRIS Accessibility Service to display pill &amp; read active screens
            </span>
            <button
              type="button"
              onClick={() => openSystemSettings('accessibility')}
              className="px-2 py-1 rounded bg-amber-400 text-black font-bold text-[8px] uppercase tracking-wider shrink-0"
            >
              ENABLE
            </button>
          </div>
        )}

        <div className="space-y-1.5">
          <p className="text-[10px]">Copilot Operating Mode</p>
          <SettingOptionGrid
            options={PERSONA_MODE_OPTIONS}
            value={settings.personaMode}
            onChange={(v) => applySetting({ personaMode: v })}
            columns={3}
          />
          <p className="text-[7px] text-on-surface-variant/45">
            🎯 INTERVIEW docks near top camera with Teleprompter &amp; STAR answers; 🎓 STUDENT enables MCQ Solver, Flashcards &amp; Vision Scan. (Tap the mode badge in the Copilot header to switch live!)
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px]">Resume / Study Profile Context</p>
            <button
              type="button"
              onClick={handleSaveBio}
              className="px-2 py-0.5 rounded bg-primary-fixed-dim/20 border border-primary-fixed-dim/40 text-primary-fixed-dim text-[8px] font-bold active:scale-95"
            >
              {bioSaved ? 'SAVED!' : 'SAVE PROFILE'}
            </button>
          </div>
          <textarea
            rows={2}
            value={settings.userBio || ''}
            onChange={(e) => setSettings((prev) => ({ ...prev, userBio: e.target.value }))}
            placeholder="e.g. Full-Stack React & Android Dev, 3 yrs exp, built custom OS launcher (Used by Interview & Student modes)"
            className="w-full bg-black/40 border border-outline-variant/30 rounded px-2.5 py-1.5 text-[9.5px] text-primary-fixed-dim focus:outline-none focus:border-primary-fixed-dim font-mono-data"
          />
        </div>

        <SettingSlider
          label="Pill & Card Opacity"
          value={settings.opacity}
          onChange={(v) => applySetting({ opacity: v })}
          min={15}
          max={95}
          step={5}
          unit="%"
          description="Lower values make the floating pill more transparent"
        />

        <div className="space-y-1.5">
          <p className="text-[10px]">Default Personal Writing Style</p>
          <SettingOptionGrid
            options={USER_STYLE_OPTIONS}
            value={settings.userStyle}
            onChange={(v) => applySetting({ userStyle: v })}
            columns={2}
          />
        </div>

        <div className="space-y-1.5">
          <p className="text-[10px]">Auto-Hide Timeout</p>
          <SettingOptionGrid
            options={TIMEOUT_OPTIONS}
            value={settings.timeoutSec}
            onChange={(v) => applySetting({ timeoutSec: v })}
            columns={4}
          />
        </div>

        <div className="space-y-1.5">
          <p className="text-[10px]">Pill Size</p>
          <SettingOptionGrid
            options={PILL_SIZE_OPTIONS}
            value={settings.pillSize}
            onChange={(v) => applySetting({ pillSize: v })}
            columns={3}
          />
        </div>

        <div className="space-y-1.5">
          <p className="text-[10px]">Edge Dock Side</p>
          <SettingOptionGrid
            options={EDGE_SIDE_OPTIONS}
            value={settings.edgeSide}
            onChange={(v) => applySetting({ edgeSide: v })}
            columns={3}
          />
        </div>

        <SettingToggle
          label="Clipboard Smart Trigger"
          sublabel="DETECT_COPIED_TEXT_FOR_AI_ACTIONS"
          icon="content_paste"
          value={settings.clipboardTrigger}
          onChange={(v) => applySetting({ clipboardTrigger: v })}
        />

        <SettingToggle
          label="Show on IRIS Home"
          sublabel="FADES_AFTER_TIMEOUT_ON_HOME"
          icon="home"
          value={settings.showOnHome}
          onChange={(v) => applySetting({ showOnHome: v })}
        />

        <SettingToggle
          label="Show Only When Typing"
          sublabel="WAKE_ONLY_ON_TEXT_INPUT_FOCUS"
          icon="keyboard"
          value={settings.onlyWhenTyping}
          onChange={(v) => applySetting({ onlyWhenTyping: v })}
        />

        <SettingToggle
          label="Auto-Open Keyboard on Ask"
          sublabel="POP_KEYBOARD_FOR_CUSTOM_QUERY"
          icon="keyboard_arrow_up"
          value={settings.autoKeyboard}
          onChange={(v) => applySetting({ autoKeyboard: v })}
        />
      </div>
    </SettingsSection>
  )
}
