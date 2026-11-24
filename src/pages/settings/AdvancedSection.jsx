import { useState, useEffect } from 'react'
import { SettingToggle } from './SettingControls'
import SettingsSection from './SettingsSection'
import {
  isAccessibilityServiceEnabled,
  isUsageStatsEnabled,
  isNotificationAccessGranted,
  openPermissionSettings,
  authenticateBiometric,
  setDeveloperDebugMode,
  getDeveloperDebugStatus,
} from '../../components/LauncherPlugin'
import HapticFeedback from '../../utils/HapticFeedback'
import { useThemeStore } from '../../stores/themeStore'
import { useNotificationStore } from '../../stores/notificationStore'

export default function AdvancedSection({ expandedSections, toggleSection }) {
  const { notifPopupsEnabled, setNotifPopupsEnabled } = useThemeStore()
  const [settings, setSettings] = useState({
    debugMode: false,
    debugRemainingMin: 0,
    accessibilityEnabled: false,
    notificationAccessEnabled: false,
    overlayEnabled: false,
    usageStatsEnabled: false,
    hapticsEnabled: true,
  })

  useEffect(() => {
    const savedOverlay = localStorage.getItem('iris_overlay_enabled') === 'true'
    const savedHaptics = HapticFeedback.isEnabled()
    setSettings(s => ({ ...s, overlayEnabled: savedOverlay, hapticsEnabled: savedHaptics }))

    const checkPerms = async () => {
      const a11y = await isAccessibilityServiceEnabled()
      const usage = await isUsageStatsEnabled()
      const notif = await isNotificationAccessGranted()
      const dbg = await getDeveloperDebugStatus()
      setSettings(s => ({
        ...s,
        accessibilityEnabled: a11y,
        usageStatsEnabled: usage,
        notificationAccessEnabled: notif,
        debugMode: Boolean(dbg?.active),
        debugRemainingMin: Math.ceil((dbg?.remainingSec || 0) / 60),
      }))
    }
    checkPerms()

    const onFocus = () => checkPerms()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const handleToggle = async (key, value) => {
    if (key === 'debugMode') {
      if (value) {
        const auth = await authenticateBiometric()
        if (!auth?.success) return
        const res = await setDeveloperDebugMode(true, 15)
        localStorage.setItem('iris_debug_mode', 'true')
        setSettings(s => ({
          ...s,
          debugMode: Boolean(res?.active),
          debugRemainingMin: Math.ceil((res?.remainingSec || 900) / 60),
        }))
      } else {
        await setDeveloperDebugMode(false, 15)
        localStorage.setItem('iris_debug_mode', 'false')
        setSettings(s => ({ ...s, debugMode: false, debugRemainingMin: 0 }))
      }
      return
    }
    setSettings(s => ({ ...s, [key]: value }))
    if (key === 'overlayEnabled') localStorage.setItem('iris_overlay_enabled', value ? 'true' : 'false')
    if (key === 'hapticsEnabled') HapticFeedback.setEnabled(value)
  }

  return (
    <SettingsSection title="ADVANCED & SYSTEM HAPTICS" icon="tune" sectionKey="advanced" expandedSections={expandedSections} toggleSection={toggleSection}>
      <div className="space-y-3">
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5">
          <span className="material-symbols-outlined text-emerald-400 text-base">shield_lock</span>
          <div className="flex-1 min-w-0">
            <p className="text-[10.5px] font-bold text-emerald-300 tracking-wide">ZERO-TRUST KNOX AES-256-GCM SHIELD ACTIVE</p>
            <p className="text-[9.5px] text-white/60 leading-snug">
              API keys, AI searches, chats, voice notes &amp; notifications are hardware-encrypted at rest. ADB logcat &amp; WebView inspector are locked by default.
            </p>
          </div>
        </div>

        <SettingToggle
          icon="vibration"
          label="Haptic Vibration Feedback"
          sublabel="Enable touch gesture rumble feedback"
          value={settings.hapticsEnabled}
          onChange={(v) => handleToggle('hapticsEnabled', v)}
        />

        <SettingToggle
          icon="bug_report"
          label="Biometric Developer Debug (15m Auto-Off)"
          sublabel={
            settings.debugMode
              ? `Active (${settings.debugRemainingMin || 15}m left) — Verbose ADB logs & WebView inspector unlocked`
              : 'Requires fingerprint — Unlocks verbose ADB logs for 15 minutes'
          }
          value={settings.debugMode}
          onChange={(v) => handleToggle('debugMode', v)}
        />

        <SettingToggle
          icon="accessibility_new"
          label="Accessibility Service"
          sublabel="Gesture navigation and screen capture"
          value={settings.accessibilityEnabled}
          onChange={() => openPermissionSettings('BIND_ACCESSIBILITY_SERVICE')}
        />

        <SettingToggle
          icon="notifications_active"
          label="Notification Archive & Media Listener"
          sublabel="Capture deleted WhatsApp/social messages & media sessions"
          value={settings.notificationAccessEnabled}
          onChange={() => openPermissionSettings('BIND_NOTIFICATION_LISTENER_SERVICE')}
        />

        <SettingToggle
          icon="notifications_paused"
          label="Notch Notification Popups"
          sublabel="Show live banner in top notch (disable to archive silently)"
          value={notifPopupsEnabled}
          onChange={(v) => {
            setNotifPopupsEnabled(v)
            if (!v) useNotificationStore.getState().dismissActive()
          }}
        />

        <SettingToggle
          icon="picture_in_picture"
          label="Overlay Permission"
          sublabel="Floating recents panel"
          value={settings.overlayEnabled}
          onChange={(v) => {
            handleToggle('overlayEnabled', v)
            openPermissionSettings('SYSTEM_ALERT_WINDOW')
          }}
        />

        <SettingToggle
          icon="analytics"
          label="Usage Statistics"
          sublabel="Frequency-based app sorting"
          value={settings.usageStatsEnabled}
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
