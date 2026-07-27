import SettingsSection from './SettingsSection'
import { SettingSlider, SettingToggle } from './SettingControls'

export default function TweaksSection({ expandedSections, toggleSection, glassOpacity, setGlassOpacity, showAppLabels, setShowAppLabels, use24HourClock, setUse24HourClock, fullscreenActive, setFullscreenActive, showHomeOrb, setShowHomeOrb, darkGlassTheme, setDarkGlassTheme }) {
  return (
    <SettingsSection title="OPTICAL INTERFACE TWEAKS" icon="tune" sectionKey="tweaks" expandedSections={expandedSections} toggleSection={toggleSection}>
      <SettingSlider label="Card Glass Opacity" value={glassOpacity} onChange={setGlassOpacity} min="0" max="100" unit="%" />
      <SettingToggle label="Dark Glass Theme (High Contrast Transparency)" sublabel="DARK_MODE_TRANSPARENCY" icon="contrast" value={darkGlassTheme} onChange={setDarkGlassTheme} />
      <SettingToggle label="Show Application Labels" sublabel="SHOW_LABELS_ON_SCREENS" icon="label" value={showAppLabels} onChange={setShowAppLabels} />
      <SettingToggle label="Use 24-Hour Clock" sublabel="SYSTEM_TIME_FORMAT_OVERRIDE" icon="schedule" value={use24HourClock} onChange={setUse24HourClock} />
      <SettingToggle label="Hide Notification Panel (Fullscreen)" sublabel="IMMERSIVE_FULLSCREEN_MODE" icon="fullscreen" value={fullscreenActive} onChange={setFullscreenActive} />
      <SettingToggle label="Show Home Orb" sublabel="ORB_VISIBILITY_TOGGLE" icon="visibility" value={showHomeOrb} onChange={setShowHomeOrb} />
    </SettingsSection>
  )
}
