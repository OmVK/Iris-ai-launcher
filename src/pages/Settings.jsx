import { useState } from 'react'
import WallpaperThemeSection from './settings/WallpaperThemeSection'
import ApiKeysSection from './settings/ApiKeysSection'
import LayoutConfigSection from './settings/LayoutConfigSection'
import AppIconsSection from './settings/AppIconsSection'
import TransitionsSection from './settings/TransitionsSection'
import LLMBackendSection from './settings/LLMBackendSection'
import VoiceSettingsSection from './settings/VoiceSettingsSection'
import NeuralSkillsSection from './settings/NeuralSkillsSection'
import TweaksSection from './settings/TweaksSection'
import LauncherEngineSection from './settings/LauncherEngineSection'
import PowerSaveSection from './settings/PowerSaveSection'
import FactoryResetSection from './settings/FactoryResetSection'
import VaultLockSection from './settings/VaultLockSection'
import AboutSection from './settings/AboutSection'

export default function Settings({
  geminiKey, setGeminiKey,
  geminiModel, setGeminiModel,
  groqKey, setGroqKey,
  isVaultUnlocked, onResetVault, onResetApps,
  dpiScale, setDpiScale,
  gridColumns, setGridColumns,
  gridRows, setGridRows,
  homeIconSize, setHomeIconSize,
  drawerIconSize, setDrawerIconSize,
  drawerTextSize, setDrawerTextSize,
  homeTextSize, setHomeTextSize,
  layoutStyle, setLayoutStyle,
  glassOpacity, setGlassOpacity,
  themeColor, setThemeColor,
  wallpaper, setWallpaper,
  hasCustomWallpaper, setCustomWallpaper,
  showAppLabels, setShowAppLabels,
  showDrawerSearch, setShowDrawerSearch,
  activeLiveWallpaper, setActiveLiveWallpaper,
  fullscreenActive, setFullscreenActive,
  llmBackend, setLlmBackend,
  installedApps = [], setInstalledApps,
  globalIconTheme, setGlobalIconTheme,
  use24HourClock, setUse24HourClock,
  pageTransitionEffect, setPageTransitionEffect,
  pageTransitionSpeed, setPageTransitionSpeed,
  pageTransitionEasing, setPageTransitionEasing,
  voicePitch, setVoicePitch,
  voiceRate, setVoiceRate,
  powerSaveMode, setPowerSaveMode,
  showHomeOrb, setShowHomeOrb,
  drawerLayout, setDrawerLayout,
  onTriggerFeatureTour
}) {
  const [expandedSections, setExpandedSections] = useState({
    wallpaperTheme: false, apiKeys: false, layoutConfig: false,
    appIcons: false, transitions: false, llmBackend: false,
    neuralSkills: false, tweaks: false, launcherEngine: false,
    powerSave: false, factoryReset: false, vaultLock: true,
    voiceSettings: false, about: false
  })

  const toggleSection = (key) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="flex-1 mt-12 mb-20 overflow-y-auto px-4 py-6 scroll-container select-none max-w-lg mx-auto space-y-4">
      <div className="mb-2">
        <h1 className="font-headline-lg text-headline-lg text-primary-fixed-dim neon-glow leading-none">CORE-SETTINGS</h1>
        <p className="font-mono-data text-[9px] text-on-surface-variant/40 mt-1 uppercase">UNAUTHORIZED MODIFICATION MAY CAUSE SYSTEM INSTABILITY</p>
      </div>

      <WallpaperThemeSection expandedSections={expandedSections} toggleSection={toggleSection} themeColor={themeColor} setThemeColor={setThemeColor} wallpaper={wallpaper} setWallpaper={setWallpaper} hasCustomWallpaper={hasCustomWallpaper} setCustomWallpaper={setCustomWallpaper} activeLiveWallpaper={activeLiveWallpaper} setActiveLiveWallpaper={setActiveLiveWallpaper} />
      <ApiKeysSection expandedSections={expandedSections} toggleSection={toggleSection} geminiKey={geminiKey} setGeminiKey={setGeminiKey} groqKey={groqKey} setGroqKey={setGroqKey} />
      <LayoutConfigSection expandedSections={expandedSections} toggleSection={toggleSection} dpiScale={dpiScale} setDpiScale={setDpiScale} gridColumns={gridColumns} setGridColumns={setGridColumns} gridRows={gridRows} setGridRows={setGridRows} layoutStyle={layoutStyle} setLayoutStyle={setLayoutStyle} homeIconSize={homeIconSize} setHomeIconSize={setHomeIconSize} drawerIconSize={drawerIconSize} setDrawerIconSize={setDrawerIconSize} drawerTextSize={drawerTextSize} setDrawerTextSize={setDrawerTextSize} homeTextSize={homeTextSize} setHomeTextSize={setHomeTextSize} drawerLayout={drawerLayout} setDrawerLayout={setDrawerLayout} />
      <AppIconsSection expandedSections={expandedSections} toggleSection={toggleSection} installedApps={installedApps} setInstalledApps={setInstalledApps} />
      <TransitionsSection expandedSections={expandedSections} toggleSection={toggleSection} globalIconTheme={globalIconTheme} setGlobalIconTheme={setGlobalIconTheme} pageTransitionEffect={pageTransitionEffect} setPageTransitionEffect={setPageTransitionEffect} pageTransitionSpeed={pageTransitionSpeed} setPageTransitionSpeed={setPageTransitionSpeed} pageTransitionEasing={pageTransitionEasing} setPageTransitionEasing={setPageTransitionEasing} />
      <LLMBackendSection expandedSections={expandedSections} toggleSection={toggleSection} llmBackend={llmBackend} setLlmBackend={setLlmBackend} geminiModel={geminiModel} setGeminiModel={setGeminiModel} />
      <VoiceSettingsSection expandedSections={expandedSections} toggleSection={toggleSection} voicePitch={voicePitch} setVoicePitch={setVoicePitch} voiceRate={voiceRate} setVoiceRate={setVoiceRate} />
      <NeuralSkillsSection expandedSections={expandedSections} toggleSection={toggleSection} showDrawerSearch={showDrawerSearch} setShowDrawerSearch={setShowDrawerSearch} />
      <TweaksSection expandedSections={expandedSections} toggleSection={toggleSection} glassOpacity={glassOpacity} setGlassOpacity={setGlassOpacity} showAppLabels={showAppLabels} setShowAppLabels={setShowAppLabels} use24HourClock={use24HourClock} setUse24HourClock={setUse24HourClock} fullscreenActive={fullscreenActive} setFullscreenActive={setFullscreenActive} showHomeOrb={showHomeOrb} setShowHomeOrb={setShowHomeOrb} />
      <LauncherEngineSection expandedSections={expandedSections} toggleSection={toggleSection} />
      <PowerSaveSection expandedSections={expandedSections} toggleSection={toggleSection} powerSaveMode={powerSaveMode} setPowerSaveMode={setPowerSaveMode} />
      <FactoryResetSection expandedSections={expandedSections} toggleSection={toggleSection} onResetApps={onResetApps} />
      {isVaultUnlocked && <VaultLockSection expandedSections={expandedSections} toggleSection={toggleSection} onResetVault={onResetVault} />}
      <AboutSection expandedSections={expandedSections} toggleSection={toggleSection} onTriggerFeatureTour={onTriggerFeatureTour} />

      <div className="py-2 border-t border-outline-variant/20 space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-fixed-dim" />
          <span className="font-label-caps text-[8px] text-primary-fixed-dim/60 font-bold">KERNEL_SECURE_BOOT_VERIFIED</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-fixed-dim" />
          <span className="font-label-caps text-[8px] text-primary-fixed-dim/60 font-bold">NEURAL_SYNC_ESTABLISHED</span>
        </div>
      </div>
    </div>
  )
}
