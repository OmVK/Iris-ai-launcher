import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react'
import { launchApp, expandNotificationPanel, getSystemStats } from '../components/LauncherPlugin'
import { IRIS_ICON_PACK } from '../utils/IrisIconPack'
import OfflineAssistantOverlay from '../components/OfflineAssistantOverlay'
import HudIcon from '../components/HudIcon'
import HudFallbackIcon from '../components/HudFallbackIcon'
import HomeGrid from '../components/HomeGrid'
import HomePager from '../components/HomePager'

import PinnedContacts from '../components/PinnedContacts'
import HomeScreenFolder from '../components/HomeScreenFolder'
import { useAppContextMenu } from '../hooks/useAppContextMenu'
import AppContextMenu from '../components/AppContextMenu'
import PowerSaveManager from '../utils/PowerSaveManager'
import { routeAppClick } from '../utils/appClickRouter'
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
  const { gridColumns, gridRows, homeIconSize, homeTextSize, layoutStyle, homePages, activeHomePage, setActiveHomePage, homeScreenFolders, setHomeScreenFolders, iconShape } = useThemeStore()
  
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

  const swipeStartPos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const handler = () => {
      setShowOfflineAssistant(true)
    }
    window.addEventListener('iris-trigger-assistant', handler)
    return () => window.removeEventListener('iris-trigger-assistant', handler)
  }, [])

  useEffect(() => {
    if (!isAppActive) return

    const fetchStats = async () => {
      try {
        const stats = await getSystemStats()
        if (stats) setSysStats(stats)
      } catch (e) {}
    }

    fetchStats()
    const statsTimer = setInterval(fetchStats, PowerSaveManager.getPollingInterval('batteryPollMs'))

    return () => {
      clearInterval(statsTimer)
    }
  }, [isAppActive, powerSaveMode])

  useEffect(() => {
    if (!isAppActive) return

    let lastUpdate = 0
    const handleOrientation = (event) => {
      const now = Date.now()
      if (now - lastUpdate < 16) return
      lastUpdate = now
      let x = event.gamma || 0;
      let y = (event.beta || 45) - 45;
      
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

  const handleSwipeStart = (e) => {
    const touch = e.touches ? e.touches[0] : e
    swipeStartPos.current = { x: touch.clientX, y: touch.clientY }
  }

  const handleSwipeEnd = (e) => {
    if (!e || !swipeStartPos.current) return
    const touch = e.changedTouches ? e.changedTouches[0] : (e.touches ? e.touches[0] : e)
    if (!touch || !touch.clientX) return

    const dx = touch.clientX - swipeStartPos.current.x
    const dy = touch.clientY - swipeStartPos.current.y

    if (Math.abs(dx) > 100 && Math.abs(dy) < 100) {
      if (dx > 100 && swipeStartPos.current.x < 100) {
        onNavigate('zero_screen')
      }
    }
    else if (dy < -60 && Math.abs(dx) < 120) {
      onNavigate('drawer')
    }
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

    routeAppClick(app, { onTriggerChronoLock, onTriggerVault, onNavigate, launchApp, lockedApps, isVaultUnlocked })
  }, [activeContextMenu, onTriggerChronoLock, onTriggerVault, onNavigate, lockedApps, isVaultUnlocked])

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

  const homeApps = useMemo(() => {
    return installedApps.filter(app => app.isHome !== false).slice(0, gridColumns * gridRows * homePages)
  }, [installedApps, gridColumns, gridRows, homePages])

  return (
    <div 
      onMouseDown={handleSwipeStart}
      onMouseUp={handleSwipeEnd}
      onTouchStart={handleSwipeStart}
      onTouchEnd={handleSwipeEnd}
      onTouchCancel={handleSwipeEnd}
      className="relative flex-1 flex flex-col pt-4 pb-28 px-margin z-10 select-none overflow-y-auto no-scrollbar"
    >
      
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

      {homePages > 1 ? (
        <HomePager
          pages={Array.from({ length: homePages })}
          activePage={activeHomePage}
          onPageChange={setActiveHomePage}
        >
          {Array.from({ length: homePages }).map((_, pageIndex) => {
            const pageApps = homeApps.slice(
              pageIndex * gridColumns * gridRows,
              (pageIndex + 1) * gridColumns * gridRows
            )
            return (
              <HomeGrid
                key={pageIndex}
                {...homeGridProps}
                installedApps={pageApps}
              />
            )
          })}
        </HomePager>
      ) : (
        <>
          {layoutStyle === 'CENTERED' && (
            <>
              <HomeGrid {...homeGridProps} />
            </>
          )}
          {layoutStyle === 'CORE_BOTTOM' && (
            <>
              <HomeGrid {...homeGridProps} />
            </>
          )}
        </>
      )}

      <PinnedContacts
        onLaunchApp={(app) => launchApp(app.packageId, app.label)}
        glassOpacity={75}
      />

      {homeScreenFolders.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mt-4">
          {homeScreenFolders.map((folder) => (
            <HomeScreenFolder
              key={folder.id}
              folder={folder}
              installedApps={installedApps}
              onAppClick={(app) => launchApp(app.packageId, app.label)}
              onEditFolder={(updatedFolder) => {
                setHomeScreenFolders(prev => prev.map(f => f.id === updatedFolder.id ? updatedFolder : f))
              }}
            />
          ))}
        </div>
      )}

      <AppContextMenu
        activeContextMenu={activeContextMenu}
        onRemoveFromHome={handleRemoveFromHome}
        onLockApp={handleLockApp}
        onTriggerUninstall={handleTriggerUninstall}
        onOpenAppInfo={handleOpenAppInfo}
        onClose={() => setActiveContextMenu(null)}
      />

      <Suspense fallback={null}>
        <OfflineAssistantOverlay 
          isVisible={showOfflineAssistant} 
          onClose={() => setShowOfflineAssistant(false)} 
          onOpen={() => setShowOfflineAssistant(true)}
          appsList={installedApps}
          onStateChange={setAssistantState}
          isAppActive={isAppActive}
        />
      </Suspense>


    </div>
  )
}
