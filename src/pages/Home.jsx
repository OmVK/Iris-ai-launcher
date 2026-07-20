import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react'
import { Device } from '@capacitor/device'
import IrisVisualizer from '../components/IrisVisualizer'
import { launchApp, expandNotificationPanel, getSystemStats } from '../components/LauncherPlugin'
import { IRIS_ICON_PACK } from '../utils/IrisIconPack'
import { fetchCurrentWeather } from '../utils/weather'
const OfflineAssistantOverlay = React.lazy(() => import('../components/OfflineAssistantOverlay'))
import HudIcon from '../components/HudIcon'
import HomeClockBanner from '../components/HomeClockBanner'
import HudFallbackIcon from '../components/HudFallbackIcon'
import HomeGrid from '../components/HomeGrid'
import { useAppContextMenu } from '../hooks/useAppContextMenu'
import AppContextMenu from '../components/AppContextMenu'
import PowerSaveManager from '../utils/PowerSaveManager'
import { routeAppClick } from '../utils/appClickRouter'
import useAppSuggestions, { trackAppLaunch } from '../hooks/useAppSuggestions'
import { useThemeStore } from '../stores/themeStore'

export default function Home({ 
  onNavigate, 
  onTriggerChronoLock, 
  onTriggerVault,
  isVaultUnlocked,
  
  // Elevated apps state from App.jsx
  installedApps = [],
  setInstalledApps,

  // App locking
  lockedApps = [],
  onToggleAppLock,

  // App label minimal toggle
  showAppLabels = true,

  // Global Icon Theme
  globalIconTheme = 'DEFAULT',

  // Battery Optimization
  isAppActive = true,

  // Power Save Mode (reactive)
  powerSaveMode
}) {
  const { gridColumns, gridRows, homeIconSize, homeTextSize, layoutStyle, showHomeOrb } = useThemeStore()
  
  const [weather, setWeather] = useState(() => {
    return localStorage.getItem('iris_cached_weather_string') || 'SYNCHRONIZING_METEO...'
  })
  const [batteryLevel, setBatteryLevel] = useState(100)
  const [showOfflineAssistant, setShowOfflineAssistant] = useState(false)
  const [assistantState, setAssistantState] = useState({ isListening: false, isProcessing: false })
  const [sysStats, setSysStats] = useState({ memTotal: 0, memUsed: 0, memAvailable: 0, cpuTemp: 35.0 })
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  const {
    activeContextMenu, setActiveContextMenu,
    toastText, setToastText,
    handleContextMenu,
    handleLockApp,
    handleTriggerUninstall,
    handleOpenAppInfo
  } = useAppContextMenu({ setInstalledApps, onToggleAppLock })

  const { suggestions, handleSuggestionClick } = useAppSuggestions(installedApps, onTriggerChronoLock, onTriggerVault, onNavigate)

  const swipeStartPos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!isAppActive) return

    const fetchBattery = async () => {
      try {
        const info = await Device.getBatteryInfo()
        if (info.batteryLevel !== undefined) {
          setBatteryLevel(Math.round(info.batteryLevel * 100))
        }
      } catch (e) {
        // Fallback for web or if unsupported
        setBatteryLevel(100)
      }
      try {
        const stats = await getSystemStats()
        if (stats) setSysStats(stats)
      } catch (e) {}
    }

    fetchBattery()
    // Polling interval scales with power save mode
    const batteryTimer = setInterval(fetchBattery, PowerSaveManager.getPollingInterval('batteryPollMs'))

    // Fetch real weather using Open-Meteo based on global setting
    const fetchWeather = async () => {
      try {
        const data = await fetchCurrentWeather()
        if (data) {
          setWeather(data.displayString)
          localStorage.setItem('iris_cached_weather_string', data.displayString)
        }
      } catch (e) {}
    }

    fetchWeather()
    // Refresh weather periodically
    const weatherTimer = setInterval(fetchWeather, PowerSaveManager.getPollingInterval('weatherPollMs'))

    return () => {
      clearInterval(batteryTimer)
      clearInterval(weatherTimer)
    }
  }, [isAppActive, powerSaveMode])

  // Holographic Parallax Device Orientation Effect
  useEffect(() => {
    if (!isAppActive) return

    let lastUpdate = 0
    const handleOrientation = (event) => {
      const now = Date.now()
      if (now - lastUpdate < 16) return
      lastUpdate = now
      // gamma is the left-to-right tilt in degrees, where right is positive
      // beta is the front-to-back tilt in degrees, where front is positive
      let x = event.gamma || 0;
      let y = (event.beta || 45) - 45; // Offset by 45 deg typical holding angle
      
      // Limit extreme tilting
      if (x > 25) x = 25;
      if (x < -25) x = -25;
      if (y > 25) y = 25;
      if (y < -25) y = -25;
      
      setTilt({ x, y });
    };

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation);
    }
    
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [isAppActive]);



  // Swipe event helpers for page swiping and navigation
  const handleSwipeStart = (e) => {
    // Swipe start coordinates tracking
    const touch = e.touches ? e.touches[0] : e
    swipeStartPos.current = { x: touch.clientX, y: touch.clientY }
  }

  const handleSwipeEnd = (e) => {

    // Swipe end detection logic
    if (!e || !swipeStartPos.current) return
    const touch = e.changedTouches ? e.changedTouches[0] : (e.touches ? e.touches[0] : e)
    if (!touch || !touch.clientX) return

    const dx = touch.clientX - swipeStartPos.current.x
    const dy = touch.clientY - swipeStartPos.current.y

    // Swipe left or right
    if (Math.abs(dx) > 100 && Math.abs(dy) < 100) {
      if (dx > 100 && swipeStartPos.current.x < 100) {
        // Swipe right from the left edge: Zero Screen
        onNavigate('zero_screen')
      } else if (dx < -100) {
        // Swipe left: Iris News
        onNavigate('iris_news')
      }
    }
    // Swipe up: open App Drawer
    else if (dy < -60 && Math.abs(dx) < 120) {
      onNavigate('drawer')
    }
    // Swipe down: expand Notification Panel
    else if (dy > 80 && Math.abs(dx) < 120) {
      expandNotificationPanel()
    }
  }

  const handleAppClick = useCallback((e, app) => {
    if (activeContextMenu) {
      setActiveContextMenu(null)
      e.preventDefault()
      e.stopPropagation()
      return
    }

    trackAppLaunch(app.packageId)
    routeAppClick(app, { onTriggerChronoLock, onTriggerVault, onNavigate, launchApp })
  }, [activeContextMenu, onTriggerChronoLock, onTriggerVault, onNavigate])

  // --- Context Menu Actions ---
  const handleRemoveFromHome = (app) => {
    setInstalledApps(prev => prev.map(a => a.packageId === app.packageId ? { ...a, isHome: false } : a))
    setToastText(`${app.label.toUpperCase()} REMOVED FROM HOME`)
    setTimeout(() => setActiveContextMenu(null), 250)
  }

  const homeGridProps = useMemo(() => ({
    installedApps,
    lockedApps,
    isVaultUnlocked,
    globalIconTheme,
    showAppLabels,
    homeIconSize,
    homeTextSize,
    gridColumns,
    gridRows,
    tilt,
    handleAppClick,
    handleContextMenu,
    IRIS_ICON_PACK,
    HudIcon,
    HudFallbackIcon
  }), [installedApps, lockedApps, isVaultUnlocked, globalIconTheme, showAppLabels, homeIconSize, homeTextSize, gridColumns, gridRows, tilt, handleAppClick, handleContextMenu])

  return (
    <div 
      onMouseDown={handleSwipeStart}
      onMouseUp={handleSwipeEnd}
      onTouchStart={handleSwipeStart}
      onTouchEnd={handleSwipeEnd}
      onTouchCancel={handleSwipeEnd}
      className="relative flex-1 flex flex-col pt-4 pb-28 px-margin z-10 select-none overflow-y-auto no-scrollbar"
    >
      
      {/* Interactive alert toast overlays */}
      {toastText && (
        <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className="glass-surface border border-primary-fixed-dim/40 px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] animate-bounce bg-[#020617]/95">
            <span className="material-symbols-outlined text-primary-fixed-dim text-xs animate-spin animate-iris-rotate">settings_backup_restore</span>
            <span className="font-mono-data text-[10px] font-bold text-primary-fixed-dim tracking-widest uppercase">
              {toastText}
            </span>
          </div>
        </div>
      )}

      {/* Dynamic layout placement template grid */}
      {layoutStyle === 'CENTERED' && (
        <>
          <HomeClockBanner weather={weather} batteryLevel={batteryLevel} />
          {suggestions.length > 0 && (
            <div className="flex gap-3 justify-center mb-3 mt-1">
              {suggestions.map(app => (
                <button key={app.packageId} onClick={() => handleSuggestionClick(app)}
                  className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10 hover:bg-[#00f2ff]/10 hover:border-[#00f2ff]/30 transition-all active:scale-90 group">
                  <div className="w-7 h-7 rounded-md overflow-hidden flex items-center justify-center bg-black/30">
                    {app.icon ? <img src={app.icon} alt="" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-[10px] text-white/40">apps</span>}
                  </div>
                  <span className="text-[7px] text-white/50 group-hover:text-[#00f2ff] truncate max-w-[50px]">{app.label}</span>
                </button>
              ))}
            </div>
          )}
          <HomeGrid {...homeGridProps} />
        </>
      )}

      {layoutStyle === 'CORE_BOTTOM' && (
        <>
          <HomeGrid {...homeGridProps} />
          {suggestions.length > 0 && (
            <div className="flex gap-3 justify-center mt-3 mb-1">
              {suggestions.map(app => (
                <button key={app.packageId} onClick={() => handleSuggestionClick(app)}
                  className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10 hover:bg-[#00f2ff]/10 hover:border-[#00f2ff]/30 transition-all active:scale-90 group">
                  <div className="w-7 h-7 rounded-md overflow-hidden flex items-center justify-center bg-black/30">
                    {app.icon ? <img src={app.icon} alt="" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-[10px] text-white/40">apps</span>}
                  </div>
                  <span className="text-[7px] text-white/50 group-hover:text-[#00f2ff] truncate max-w-[50px]">{app.label}</span>
                </button>
              ))}
            </div>
          )}
          <HomeClockBanner weather={weather} batteryLevel={batteryLevel} />
        </>
      )}


      {/* ======================================================== */}
      {/* 4. ANDROID FLOATING LONG-PRESS CONTEXT MENU OVERLAY      */}
      {/* ======================================================== */}
      <AppContextMenu
        activeContextMenu={activeContextMenu}
        onRemoveFromHome={handleRemoveFromHome}
        onLockApp={handleLockApp}
        onTriggerUninstall={handleTriggerUninstall}
        onOpenAppInfo={handleOpenAppInfo}
        onClose={() => setActiveContextMenu(null)}
      />

      {/* ======================================================== */}
      {/* 7. OFFLINE ASSISTANT CORE                                */}
      {/* ======================================================== */}
      <Suspense fallback={null}>
        <OfflineAssistantOverlay 
          isVisible={showOfflineAssistant} 
          onClose={() => setShowOfflineAssistant(false)} 
          onOpen={() => setShowOfflineAssistant(true)}
          showHomeOrb={showHomeOrb}
          appsList={installedApps}
          onStateChange={setAssistantState}
          isAppActive={isAppActive}
        />
      </Suspense>

    </div>
  )
}
