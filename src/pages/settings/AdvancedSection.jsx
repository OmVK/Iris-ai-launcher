import { useState, useEffect } from 'react'
import { SettingToggle, SettingSlider } from './SettingControls'
import SettingsSection from './SettingsSection'
import { isAccessibilityServiceEnabled, isUsageStatsEnabled, openPermissionSettings } from '../../components/LauncherPlugin'
import HapticFeedback from '../../utils/HapticFeedback'

export default function AdvancedSection({ expandedSections, toggleSection }) {
  const [settings, setSettings] = useState({
    debugMode: false,
    accessibilityEnabled: false,
    overlayEnabled: false,
    usageStatsEnabled: false,
    hapticsEnabled: true,
  })

  useEffect(() => {
    const savedDebug = localStorage.getItem('iris_debug_mode') === 'true'
    const savedOverlay = localStorage.getItem('iris_overlay_enabled') === 'true'
    const savedHaptics = HapticFeedback.isEnabled()
    setSettings(s => ({ ...s, debugMode: savedDebug, overlayEnabled: savedOverlay, hapticsEnabled: savedHaptics }))

    const checkPerms = async () => {
      const a11y = await isAccessibilityServiceEnabled()
      const usage = await isUsageStatsEnabled()
      setSettings(s => ({ ...s, accessibilityEnabled: a11y, usageStatsEnabled: usage }))
    }
    checkPerms()
    
    const onFocus = () => checkPerms()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const handleToggle = (key, value) => {
    setSettings(s => ({ ...s, [key]: value }))
    if (key === 'debugMode') localStorage.setItem('iris_debug_mode', value ? 'true' : 'false')
    if (key === 'overlayEnabled') localStorage.setItem('iris_overlay_enabled', value ? 'true' : 'false')
    if (key === 'hapticsEnabled') HapticFeedback.setEnabled(value)
  }

  return (
    <SettingsSection title="ADVANCED & SYSTEM HAPTICS" icon="tune" sectionKey="advanced" expandedSections={expandedSections} toggleSection={toggleSection}>
      <div className="space-y-3">
      <SettingToggle
        icon="vibration"
        label="Haptic Vibration Feedback"
        sublabel="Enable touch gesture rumble feedback"
        enabled={settings.hapticsEnabled}
        onChange={(v) => handleToggle('hapticsEnabled', v)}
      />

      <SettingToggle
        icon="bug_report"
        label="Debug Mode"
        sublabel="Enable detailed logging"
        enabled={settings.debugMode}
        onChange={(v) => handleToggle('debugMode', v)}
      />

      <SettingToggle
        icon="accessibility_new"
        label="Accessibility Service"
        sublabel="Gesture navigation and screen capture"
        enabled={settings.accessibilityEnabled}
        onChange={() => openPermissionSettings('BIND_ACCESSIBILITY_SERVICE')}
      />

      <SettingToggle
        icon="picture_in_picture"
        label="Overlay Permission"
        sublabel="Floating recents panel"
        enabled={settings.overlayEnabled}
        onChange={(v) => {
          handleToggle('overlayEnabled', v)
          openPermissionSettings('SYSTEM_ALERT_WINDOW')
        }}
      />

      <SettingToggle
        icon="analytics"
        label="Usage Statistics"
        sublabel="Frequency-based app sorting"
        enabled={settings.usageStatsEnabled}
        onChange={() => openPermissionSettings('PACKAGE_USAGE_STATS')}
      />

      <div className="h-px bg-white/5" />

      <div>
        <p className="text-[10px] text-white/30 font-mono-data mb-2">LOG EXPORT</p>
        <button
          onClick={() => {
            const logs = localStorage.getItem('iris_system_notifications') || '[]'
            const blob = new Blob([logs], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `iris-debug-log-${Date.now()}.json`
            a.click()
            URL.revokeObjectURL(url)
          }}
          className="w-full py-2 rounded-xl bg-white/5 text-white/40 text-[10px] font-mono-data hover:bg-white/10 transition-all"
        >
          EXPORT DEBUG LOG
        </button>
      </div>
      </div>
    </SettingsSection>
  )
}
