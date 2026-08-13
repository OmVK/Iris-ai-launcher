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
import BackupRestoreSection from './settings/BackupRestoreSection'
import GestureSettingsSection from './settings/GestureSettingsSection'
import AppLockSection from './settings/AppLockSection'
import AdvancedSection from './settings/AdvancedSection'
import { useThemeStore } from '../stores/themeStore'

export default function Settings({
  geminiKey, setGeminiKey,
  geminiModel, setGeminiModel,
  groqKey, setGroqKey,
  isVaultUnlocked, onResetVault, onResetApps,
  llmBackend, setLlmBackend,
  installedApps = [], setInstalledApps,
  voicePitch, setVoicePitch,
  voiceRate, setVoiceRate,
  powerSaveMode, setPowerSaveMode,
  onTriggerFeatureTour
}) {
  const { 
    dpiScale, setDpiScale, gridColumns, setGridColumns, gridRows, setGridRows,
    homeIconSize, setHomeIconSize, drawerIconSize, setDrawerIconSize, drawerTextSize, setDrawerTextSize,
    homeTextSize, setHomeTextSize, layoutStyle, setLayoutStyle, glassOpacity, setGlassOpacity,
    themeColor, setThemeColor, wallpaper, setWallpaper, hasCustomWallpaper, setHasCustomWallpaper,
    showAppLabels, setShowAppLabels, showDrawerSearch, setShowDrawerSearch, activeLiveWallpaper, setActiveLiveWallpaper,
    fullscreenActive, setFullscreenActive, globalIconTheme, setGlobalIconTheme, use24HourClock, setUse24HourClock,
    pageTransitionEffect, setPageTransitionEffect, pageTransitionSpeed, setPageTransitionSpeed,
    pageTransitionEasing, setPageTransitionEasing, drawerLayout, setDrawerLayout,
    darkGlassTheme, setDarkGlassTheme, homePages, setHomePages,
    iconShape, setIconShape, dockColumns, setDockColumns, dockBackground, setDockBackground, homeScreenFolders, setHomeScreenFolders
  } = useThemeStore()
  const [expandedSections, setExpandedSections] = useState({
    wallpaperTheme: false, apiKeys: false, layoutConfig: false,
    appIcons: false, transitions: false, llmBackend: false,
    neuralSkills: false, tweaks: false, launcherEngine: false,
    powerSave: false, factoryReset: false, vaultLock: true,
    voiceSettings: false, about: false,
    gestures: false, appLock: false, backupRestore: false, advanced: false,
  })

  const toggleSection = (key) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="relative flex-1 flex flex-col pt-4 pb-28 px-margin z-10 select-none overflow-y-auto no-scrollbar space-y-4">
      <div className="mb-2">
        <h1 className="font-headline-lg text-headline-lg text-primary-fixed-dim neon-glow leading-none">CORE-SETTINGS</h1>
        <p className="font-mono-data text-[9px] text-on-surface-variant/40 mt-1 uppercase">UNAUTHORIZED MODIFICATION MAY CAUSE SYSTEM INSTABILITY</p>
      </div>

      <WallpaperThemeSection expandedSections={expandedSections} toggleSection={toggleSection} themeColor={themeColor} setThemeColor={setThemeColor} wallpaper={wallpaper} setWallpaper={setWallpaper} hasCustomWallpaper={hasCustomWallpaper} setHasCustomWallpaper={setHasCustomWallpaper} activeLiveWallpaper={activeLiveWallpaper} setActiveLiveWallpaper={setActiveLiveWallpaper} glassOpacity={glassOpacity} setGlassOpacity={setGlassOpacity} iconShape={iconShape} setIconShape={setIconShape} />
      <ApiKeysSection expandedSections={expandedSections} toggleSection={toggleSection} geminiKey={geminiKey} setGeminiKey={setGeminiKey} groqKey={groqKey} setGroqKey={setGroqKey} />
      <LayoutConfigSection expandedSections={expandedSections} toggleSection={toggleSection} dpiScale={dpiScale} setDpiScale={setDpiScale} gridColumns={gridColumns} setGridColumns={setGridColumns} gridRows={gridRows} setGridRows={setGridRows} layoutStyle={layoutStyle} setLayoutStyle={setLayoutStyle} homeIconSize={homeIconSize} setHomeIconSize={setHomeIconSize} drawerIconSize={drawerIconSize} setDrawerIconSize={setDrawerIconSize} drawerTextSize={drawerTextSize} setDrawerTextSize={setDrawerTextSize} homeTextSize={homeTextSize} setHomeTextSize={setHomeTextSize} drawerLayout={drawerLayout} setDrawerLayout={setDrawerLayout} iconShape={iconShape} setIconShape={setIconShape} dockColumns={dockColumns} setDockColumns={setDockColumns} dockBackground={dockBackground} setDockBackground={setDockBackground} homePages={homePages} setHomePages={setHomePages} />
      <AppIconsSection expandedSections={expandedSections} toggleSection={toggleSection} installedApps={installedApps} setInstalledApps={setInstalledApps} />
      <TransitionsSection expandedSections={expandedSections} toggleSection={toggleSection} globalIconTheme={globalIconTheme} setGlobalIconTheme={setGlobalIconTheme} pageTransitionEffect={pageTransitionEffect} setPageTransitionEffect={setPageTransitionEffect} pageTransitionSpeed={pageTransitionSpeed} setPageTransitionSpeed={setPageTransitionSpeed} pageTransitionEasing={pageTransitionEasing} setPageTransitionEasing={setPageTransitionEasing} />
      <LLMBackendSection expandedSections={expandedSections} toggleSection={toggleSection} llmBackend={llmBackend} setLlmBackend={setLlmBackend} geminiModel={geminiModel} setGeminiModel={setGeminiModel} />
      <VoiceSettingsSection expandedSections={expandedSections} toggleSection={toggleSection} voicePitch={voicePitch} setVoicePitch={setVoicePitch} voiceRate={voiceRate} setVoiceRate={setVoiceRate} />
      <NeuralSkillsSection expandedSections={expandedSections} toggleSection={toggleSection} showDrawerSearch={showDrawerSearch} setShowDrawerSearch={setShowDrawerSearch} />
      <TweaksSection expandedSections={expandedSections} toggleSection={toggleSection} glassOpacity={glassOpacity} setGlassOpacity={setGlassOpacity} showAppLabels={showAppLabels} setShowAppLabels={setShowAppLabels} use24HourClock={use24HourClock} setUse24HourClock={setUse24HourClock} fullscreenActive={fullscreenActive} setFullscreenActive={setFullscreenActive} darkGlassTheme={darkGlassTheme} setDarkGlassTheme={setDarkGlassTheme} />

      <div className="border-t border-white/5 pt-4">
        <p className="text-[9px] text-white/20 font-mono-data mb-3 uppercase">System Configuration</p>
      </div>

      <GestureSettingsSection expandedSections={expandedSections} toggleSection={toggleSection} installedApps={installedApps} />
      <AppLockSection expandedSections={expandedSections} toggleSection={toggleSection} />
      <BackupRestoreSection expandedSections={expandedSections} toggleSection={toggleSection} />
      <AdvancedSection expandedSections={expandedSections} toggleSection={toggleSection} />

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
