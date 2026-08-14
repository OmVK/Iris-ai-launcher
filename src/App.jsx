import { useState, useEffect, useMemo, lazy, Suspense } from 'react'
import TopAppBar from './components/TopAppBar'
import BottomNavBar from './components/BottomNavBar'
import ChronoPinLock from './components/ChronoPinLock'
import InteractiveWallpaper from './components/InteractiveWallpaper'
import SetupWizard from './components/SetupWizard'
import ArcSearch from './components/ArcSearch'
import TaskAlarmOverlay from './components/TaskAlarmOverlay'
import VaultExplorer from './components/VaultExplorer'
import LiveVoiceFAB from './components/LiveVoiceFAB'
import LiveConfigModal from './components/LiveConfigModal'
import FeatureTour from './components/FeatureTour'
import RecentsOverlay from './components/RecentsOverlay'
import GracefulDegradation from './components/GracefulDegradation'
import PowerSaveManager from './utils/PowerSaveManager'
import WallpaperManager from './utils/WallpaperManager'

const Home = lazy(() => import('./pages/Home'))
const Widgets = lazy(() => import('./pages/Widgets'))
const Assistant = lazy(() => import('./pages/Assistant'))
const Drawer = lazy(() => import('./pages/Drawer'))
const Settings = lazy(() => import('./pages/Settings'))
const IrisTools = lazy(() => import('./pages/IrisTools'))

const PrivateVault = lazy(() => import('./pages/PrivateVault'))
const ZeroScreen = lazy(() => import('./components/ZeroScreen'))
const VpnBrowser = lazy(() => import('./pages/VpnBrowser'))

import { useAppStore } from './stores/appStore'
import { useThemeStore } from './stores/themeStore'
import { useAIStore } from './stores/aiStore'
import { useAssistantStore } from './stores/assistantStore'
import { useAppsStore } from './stores/appsStore'
import { usePowerStore } from './stores/powerStore'

import useVoiceEngine from './hooks/useVoiceEngine'
import useAIBackend from './hooks/useAIBackend'
import useAppGestures from './hooks/useAppGestures'
import useAppEffects from './hooks/useAppEffects'
import useThemeVars from './hooks/useThemeVars'
import usePageRouter from './hooks/usePageRouter'

export default function App() {
  const { activePage, setActivePage, showChronoLock, setShowChronoLock, chronoTarget, setChronoTarget, isVaultUnlocked, setIsVaultUnlocked, showVaultExplorer, setShowVaultExplorer, vaultTab, setVaultTab, lockedApps, toggleAppLock, showArcSearch, setShowArcSearch, isAppActive, setIsAppActive, setupComplete, setSetupComplete, showVpnBrowser, setShowVpnBrowser, vpnBrowserUrl, setVpnBrowserUrl } = useAppStore()
  const { themeColor, glassOpacity, wallpaper, hasCustomWallpaper, dpiScale, showAppLabels, use24HourClock, globalIconTheme, activeLiveWallpaper, pageTransitionEffect, pageTransitionSpeed, pageTransitionEasing, fullscreenActive, darkGlassTheme, wallpaperBlur, wallpaperVignette, setThemeColor, setGlassOpacity } = useThemeStore()
  const { llmBackend, setLlmBackend, geminiKey, geminiModel, groqKey, voicePitch, voiceRate } = useAIStore()
  const { isLiveVoice, isListening, showLiveConfigModal, setShowLiveConfigModal, liveSetupEngine, setLiveSetupEngine, liveSetupKey, setLiveSetupKey } = useAssistantStore()
  const { installedApps, setInstalledApps, loadNativeApps, resetToDefaults } = useAppsStore()
  const { powerSaveMode, setPowerSaveMode } = usePowerStore()
  const [showFeatureTour, setShowFeatureTour] = useState(false)
  const [showRecents, setShowRecents] = useState(false)

  const voiceEngine = useVoiceEngine()
  const aiBackend = useAIBackend(voiceEngine.speakText)
  voiceEngine.setSubmitPrompt(aiBackend.submitPrompt, aiBackend.isGeneratingRef, aiBackend.abortControllerRef)

  useThemeVars({ themeColor, glassOpacity })
  useAppEffects({ isAppActive, setIsAppActive, setShowChronoLock, setShowVaultExplorer, setIsVaultUnlocked, setShowLiveConfigModal, setActivePage, loadNativeApps, lockedApps, fullscreenActive, isVaultUnlocked, powerSaveMode })
  const { handleLaunchApp, handleTriggerVault, handleTriggerChronoLock } = usePageRouter({ setActivePage, setChronoTarget, setShowChronoLock, isVaultUnlocked, setShowVaultExplorer })

  const { handleTouchStart, handleTouchMove, handleTouchEnd } = useAppGestures({ activePage, setActivePage, setShowArcSearch, launchApp: handleLaunchApp })

  useEffect(() => { loadNativeApps() }, [])

  useEffect(() => {
    WallpaperManager.checkDailyRotation()
  }, [])

  const handleUnlockSuccess = () => {
    setIsVaultUnlocked(true); setShowChronoLock(false)
    if (chronoTarget === 'private') {
      setActivePage('private')
    } else if (chronoTarget && typeof chronoTarget === 'object' && chronoTarget.packageId) {
      handleLaunchApp(chronoTarget)
    } else {
      setShowVaultExplorer(true)
    }
    setChronoTarget(null)
  }

  const getGradient = (type) => {
    const hasBg = hasCustomWallpaper
    const o = (bg, fg) => hasBg ? fg : bg
    const g = {
      VOID: '#020617',
      CYBER: `radial-gradient(circle at center, rgba(15, 23, 42, ${o('1', '0.4')}) 0%, rgba(2, 6, 23, ${o('1', '0.85')}) 100%)`,
      GRID: `linear-gradient(to bottom, rgba(2, 6, 23, ${o('1', '0.4')}), rgba(15, 23, 42, ${o('1', '0.85')}))`,
      NEBULA: `radial-gradient(ellipse at top, rgba(30, 27, 75, ${o('1', '0.5')}) 0%, rgba(2, 6, 23, ${o('1', '0.85')}) 100%)`,
      AURORA: `linear-gradient(135deg, rgba(2, 6, 23, ${o('1', '0.8')}) 0%, rgba(6, 78, 59, ${o('1', '0.45')}) 50%, rgba(2, 6, 23, ${o('1', '0.8')}) 100%)`,
      FIBER: `linear-gradient(180deg, rgba(10, 14, 23, ${o('1', '0.6')}) 0%, rgba(20, 25, 35, ${o('1', '0.4')}) 50%, rgba(10, 14, 23, ${o('1', '0.7')}) 100%)`,
      OCEAN: `linear-gradient(180deg, rgba(0, 20, 40, ${o('1', '0.8')}) 0%, rgba(0, 10, 20, ${o('1', '0.9')}) 100%)`,
      SUNSET: `linear-gradient(180deg, rgba(40, 10, 20, ${o('1', '0.8')}) 0%, rgba(20, 5, 10, ${o('1', '0.9')}) 100%)`,
      FOREST: `linear-gradient(180deg, rgba(5, 20, 10, ${o('1', '0.8')}) 0%, rgba(2, 10, 5, ${o('1', '0.9')}) 100%)`,
      CUSTOM: 'transparent',
    }
    return g[type] || '#020617'
  }

  const renderActivePage = () => {
    switch (activePage) {
      case 'home':
        return <Home onNavigate={setActivePage} onTriggerVault={handleTriggerVault}
          onTriggerChronoLock={handleTriggerChronoLock} isVaultUnlocked={isVaultUnlocked}
          installedApps={installedApps} setInstalledApps={setInstalledApps} lockedApps={lockedApps} onToggleAppLock={toggleAppLock}
          use24HourClock={use24HourClock} showAppLabels={showAppLabels} globalIconTheme={globalIconTheme} isAppActive={isAppActive} powerSaveMode={powerSaveMode} />
      case 'widgets':
        return <Widgets isAppActive={isAppActive} activePage={activePage} powerSaveMode={powerSaveMode} />
      case 'assistant':
        return <Assistant
          autoTriggerLive={useAppStore.getState().showArcSearch} setAutoTriggerLive={() => {}}
          onNavigate={setActivePage}
          startVoiceInput={voiceEngine.startVoiceInput} stopVoiceInput={voiceEngine.stopVoiceInput}
          speakText={voiceEngine.speakText} stopSpeaking={voiceEngine.stopSpeaking}
          submitPrompt={aiBackend.submitPrompt}
          handleSaveLiveConfig={voiceEngine.handleSaveLiveConfig} handleOpenLiveMode={voiceEngine.handleOpenLiveMode}
          handleExitLiveModeOnly={voiceEngine.handleExitLiveModeOnly} handleStopLiveModeCompletely={voiceEngine.handleStopLiveModeCompletely}
          isAppActive={isAppActive} />
      case 'drawer':
        return <Drawer onNavigate={setActivePage} onTriggerChronoLock={handleTriggerChronoLock}
          onTriggerVault={handleTriggerVault}
          isVaultUnlocked={isVaultUnlocked} installedApps={installedApps} setInstalledApps={setInstalledApps}
          setActivePage={setActivePage} showAppLabels={showAppLabels}
          onToggleAppLock={toggleAppLock} lockedApps={lockedApps} globalIconTheme={globalIconTheme} />
      case 'settings':
        return <Settings geminiKey={geminiKey} setGeminiKey={useAIStore.getState().setGeminiKey} geminiModel={geminiModel} setGeminiModel={useAIStore.getState().setGeminiModel}
          groqKey={groqKey} setGroqKey={useAIStore.getState().setGroqKey} isVaultUnlocked={isVaultUnlocked} onResetVault={() => { setIsVaultUnlocked(false); setShowVaultExplorer(false) }}
          glassOpacity={glassOpacity} setGlassOpacity={setGlassOpacity} themeColor={themeColor} setThemeColor={setThemeColor}
          wallpaper={wallpaper} hasCustomWallpaper={hasCustomWallpaper}
          showAppLabels={showAppLabels}
          activeLiveWallpaper={activeLiveWallpaper}
          fullscreenActive={fullscreenActive}
          onResetApps={resetToDefaults} llmBackend={llmBackend} setLlmBackend={setLlmBackend}
          installedApps={installedApps} setInstalledApps={setInstalledApps} globalIconTheme={globalIconTheme}
          pageTransitionEffect={pageTransitionEffect}
          pageTransitionSpeed={pageTransitionSpeed}
          pageTransitionEasing={pageTransitionEasing}
          use24HourClock={use24HourClock}
          voicePitch={voicePitch} setVoicePitch={useAIStore.getState().setVoicePitch}
          voiceRate={voiceRate} setVoiceRate={useAIStore.getState().setVoiceRate}
          powerSaveMode={powerSaveMode} setPowerSaveMode={setPowerSaveMode}
          onTriggerFeatureTour={() => setShowFeatureTour(true)} />
      case 'iris_tools':
        return <IrisTools onNavigate={setActivePage} onTriggerChronoLock={handleTriggerChronoLock} onTriggerVault={handleTriggerVault} />

      case 'private':
        if (!isVaultUnlocked) {
          return (
            <div className="flex-1 flex flex-col h-[100lvh] items-center justify-center bg-black/95 z-50">
              <ChronoPinLock
                onUnlockSuccess={() => setIsVaultUnlocked(true)}
                onClose={() => setActivePage('iris_tools')}
                source="private"
              />
            </div>
          )
        }
        return <PrivateVault onNavigate={setActivePage} />
      case 'zero_screen':
        return <ZeroScreen onNavigate={setActivePage} isAppActive={isAppActive} />
      default:
        return <Home onNavigate={setActivePage} isAppActive={isAppActive}
          onTriggerChronoLock={handleTriggerChronoLock}
          onTriggerVault={handleTriggerVault}
          isVaultUnlocked={isVaultUnlocked}
          installedApps={installedApps} setInstalledApps={setInstalledApps} lockedApps={lockedApps} onToggleAppLock={toggleAppLock}
          use24HourClock={use24HourClock} showAppLabels={showAppLabels} globalIconTheme={globalIconTheme} powerSaveMode={powerSaveMode} />
    }
  }

  useEffect(() => {
    const body = document.body
    if (!body) return
    body.style.background = wallpaper === 'SYSTEM' ? 'transparent' : '#020617'
    body.style.margin = '0'
  }, [wallpaper])

  const scale = (dpiScale || 100) / 100

  const customWallpaperData = useMemo(() => {
    try {
      let raw = localStorage.getItem('custom_wallpaper') || ''
      if (!raw) return null
      if (!raw.startsWith('data:') && !raw.startsWith('blob:') && !raw.startsWith('http')) {
        raw = 'data:image/jpeg;base64,' + raw
      }
      return raw
    } catch { return null }
  }, [wallpaper, hasCustomWallpaper])

  const rootBgStyle = useMemo(() => {
    const bg = {}
    if ((wallpaper === 'CUSTOM' || wallpaper === 'SYSTEM') && customWallpaperData) {
      bg.backgroundImage = `url("${customWallpaperData}")`
      bg.backgroundSize = 'cover'
      bg.backgroundPosition = 'center'
      bg.backgroundRepeat = 'no-repeat'
    } else if (wallpaper === 'SYSTEM') {
      bg.background = 'transparent'
    } else if (wallpaper !== 'VOID') {
      bg.background = getGradient(wallpaper)
    } else {
      bg.background = getGradient('VOID')
    }
    return bg
  }, [wallpaper, hasCustomWallpaper, customWallpaperData])

  const wallpaperOverlayStyle = useMemo(() => {
    const s = { ...rootBgStyle, position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }
    if (wallpaperBlur > 0) s.filter = `blur(${wallpaperBlur}px)`
    if (wallpaperVignette > 0) s.boxShadow = `inset 0 0 ${wallpaperVignette * 3}px rgba(0,0,0,${wallpaperVignette / 100})`
    return s
  }, [rootBgStyle, wallpaperBlur, wallpaperVignette])

  return (
    <div
      style={scale === 1 ? { width: '100vw', height: '100lvh', background: wallpaper === 'SYSTEM' ? 'transparent' : '#020617' } : { zoom: scale, width: `${100 / scale}vw`, height: `${100 / scale}lvh`, background: wallpaper === 'SYSTEM' ? 'transparent' : '#020617' }}
      className={`relative flex flex-col overflow-hidden transition-all duration-300 interactive-glass h-full w-full text-on-surface font-mono selection:bg-primary-fixed-dim/30 ${PowerSaveManager.isEnabled() ? 'power-save-mode' : ''} ${darkGlassTheme ? 'dark-glass-theme' : ''}`}
      onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
    >
      <div style={wallpaperOverlayStyle} />
      {!PowerSaveManager.shouldDisable('wallpaper') && (
        <InteractiveWallpaper mode={activeLiveWallpaper} activePage={activePage} isAppActive={isAppActive} />
      )}
      <ArcSearch isOpen={showArcSearch} onClose={() => setShowArcSearch(false)} installedApps={installedApps} launchApp={handleLaunchApp} activePage={activePage} setActivePage={setActivePage} globalIconTheme={globalIconTheme} />
      <TaskAlarmOverlay setActivePage={setActivePage} />
      <TopAppBar title={activePage === 'home' ? 'IRIS-SYSTEM-OS' : `IRIS // ${activePage.toUpperCase()}`} use24HourClock={use24HourClock} isAppActive={isAppActive} powerSaveMode={powerSaveMode} />
      <main className="flex-1 flex flex-col overflow-hidden min-h-0 relative z-10">
        <div key={activePage} className={`page-transition-container effect-${pageTransitionEffect.toLowerCase()}`} style={{ '--page-transition-duration': `${pageTransitionSpeed}ms`, '--page-transition-easing': pageTransitionEasing === 'SMOOTH' ? 'cubic-bezier(0.16, 1, 0.3, 1)' : pageTransitionEasing === 'CRISP' ? 'cubic-bezier(0, 0, 0.2, 1)' : pageTransitionEasing === 'SPRING' ? 'cubic-bezier(0.34, 1.56, 0.64, 1)' : 'cubic-bezier(0.16, 1, 0.3, 1)' }}>
          <Suspense fallback={<div className="flex items-center justify-center h-full"><span className="material-symbols-outlined text-primary-fixed-dim animate-pulse text-3xl">hourglass_empty</span></div>}>
            {renderActivePage()}
          </Suspense>
        </div>
      </main>
      <BottomNavBar activePage={activePage} setActivePage={setActivePage} showAppLabels={showAppLabels} />
      {showChronoLock && <ChronoPinLock onUnlockSuccess={handleUnlockSuccess} onClose={() => setShowChronoLock(false)} source={chronoTarget} />}
      {showVaultExplorer && (
        <VaultExplorer
          vaultTab={vaultTab} setVaultTab={setVaultTab} lockedApps={lockedApps} installedApps={installedApps}
          isVaultUnlocked={isVaultUnlocked} onToggleAppLock={toggleAppLock}
          onTriggerUnlock={(t) => { setChronoTarget(t); setShowChronoLock(true) }}
          onClose={() => setShowVaultExplorer(false)} onUnlock={setIsVaultUnlocked} onLaunchApp={handleLaunchApp}
        />
      )}
      {isLiveVoice && activePage !== 'assistant' && (
        <LiveVoiceFAB isListening={isListening} onClick={() => setActivePage('assistant')} />
      )}
      {showLiveConfigModal && (
        <LiveConfigModal
          liveSetupEngine={liveSetupEngine} setLiveSetupEngine={setLiveSetupEngine}
          liveSetupKey={liveSetupKey} setLiveSetupKey={setLiveSetupKey}
          onSave={voiceEngine.handleSaveLiveConfig} onClose={() => setShowLiveConfigModal(false)}
        />
      )}
      {!setupComplete && <SetupWizard onComplete={() => setSetupComplete(true)} />}
      {showVpnBrowser && <Suspense fallback={null}><VpnBrowser url={vpnBrowserUrl} onClose={() => { setShowVpnBrowser(false); setVpnBrowserUrl('') }} /></Suspense>}
      {showFeatureTour && <FeatureTour onClose={() => setShowFeatureTour(false)} />}
      {showRecents && <RecentsOverlay isOpen={showRecents} onClose={() => setShowRecents(false)} />}
      <GracefulDegradation />
      <video id="hidden-capture-video" style={{ display: 'none' }} playsInline muted></video>
      <canvas id="hidden-capture-canvas" style={{ display: 'none' }}></canvas>
    </div>
  )
}
