import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { launchApp } from '../components/LauncherPlugin'
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
import { routeAppClick } from '../utils/appClickRouter'
import { useThemeStore } from '../stores/themeStore'
import PowerSaveManager from '../utils/PowerSaveManager'

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
  powerSaveMode: _powerSaveMode
}) {
  const { gridColumns, gridRows, homeIconSize, homeTextSize, layoutStyle, homePages, activeHomePage, setActiveHomePage, homeScreenFolders, setHomeScreenFolders, iconShape } = useThemeStore()

  const [showOfflineAssistant, setShowOfflineAssistant] = useState(false)
  const [, setAssistantState] = useState({ isListening: false, isProcessing: false })

  const {
    activeContextMenu, setActiveContextMenu,
    toastText, setToastText,
    handleContextMenu,
    handleLockApp,
    handleTriggerUninstall,
    handleOpenAppInfo
  } = useAppContextMenu({ setInstalledApps, onToggleAppLock })

  useEffect(() => {
    const handler = () => {
      setShowOfflineAssistant(true)
    }
    window.addEventListener('iris-trigger-assistant', handler)
    return () => window.removeEventListener('iris-trigger-assistant', handler)
  }, [])


  useEffect(() => {
    if (!isAppActive || PowerSaveManager.shouldDisable('gridAnimations')) {
      document.documentElement.style.setProperty('--home-tilt-x', '0deg')
      document.documentElement.style.setProperty('--home-tilt-y', '0deg')
      return
    }

    let rafId = null
    let lastTime = 0
    let lastX = 0
    let lastY = 0

    const handleOrientation = (event) => {
      if (document.hidden) return
      const now = performance.now()
      if (now - lastTime < 50) return

      let x = event.gamma || 0
      let y = (event.beta || 45) - 45
      if (x > 25) x = 25
      if (x < -25) x = -25
      if (y > 25) y = 25
      if (y < -25) y = -25

      if (Math.abs(x - lastX) < 0.8 && Math.abs(y - lastY) < 0.8) return
      lastTime = now
      lastX = x
      lastY = y

      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        document.documentElement.style.setProperty('--home-tilt-x', `${(x / 1.5).toFixed(1)}deg`)
        document.documentElement.style.setProperty('--home-tilt-y', `${(-y / 1.5).toFixed(1)}deg`)
      })
    }

    const onVisChange = () => {
      if (document.hidden) {
        window.removeEventListener('deviceorientation', handleOrientation)
      } else if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', handleOrientation, { passive: true })
      }
    }

    if (window.DeviceOrientationEvent && !document.hidden) {
      window.addEventListener('deviceorientation', handleOrientation, { passive: true })
    }
    document.addEventListener('visibilitychange', onVisChange)

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      window.removeEventListener('deviceorientation', handleOrientation)
      document.removeEventListener('visibilitychange', onVisChange)
      document.documentElement.style.setProperty('--home-tilt-x', '0deg')
      document.documentElement.style.setProperty('--home-tilt-y', '0deg')
    }
  }, [isAppActive, _powerSaveMode])

  const handleAppClick = useCallback((e, app) => {
    if (activeContextMenu) {
      setActiveContextMenu(null)
      e.preventDefault()
      e.stopPropagation()
      return
    }

    routeAppClick(app, { onTriggerChronoLock, onTriggerVault, onNavigate, launchApp, lockedApps, isVaultUnlocked })
  }, [activeContextMenu, onTriggerChronoLock, onTriggerVault, onNavigate, lockedApps, isVaultUnlocked, setActiveContextMenu])

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
    iconShape,
    handleAppClick,
    handleContextMenu,
    IRIS_ICON_PACK,
    HudIcon,
    HudFallbackIcon
  }), [installedApps, lockedApps, isVaultUnlocked, globalIconTheme, showAppLabels, homeIconSize, homeTextSize, gridColumns, gridRows, iconShape, handleAppClick, handleContextMenu])

  const pageCount = Array.isArray(homePages) ? Math.max(1, homePages.length) : Math.max(1, Number(homePages) || 1)
  const glassOpacity = useThemeStore(s => s.glassOpacity)

  const homeApps = useMemo(() => {
    return installedApps.filter(app => app.isHome !== false).slice(0, gridColumns * gridRows * pageCount)
  }, [installedApps, gridColumns, gridRows, pageCount])

  return (
    <div
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

      {pageCount > 1 ? (
        <HomePager
          pages={Array.from({ length: pageCount })}
          activePage={activeHomePage}
          onPageChange={setActiveHomePage}
        >
          {Array.from({ length: pageCount }).map((_, pageIndex) => {
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
        <div className={layoutStyle === 'CORE_BOTTOM' ? 'mt-auto' : 'my-auto'}>
          <HomeGrid {...homeGridProps} installedApps={homeApps} />
        </div>
      )}

      <PinnedContacts
        onLaunchApp={(app) => launchApp(app.packageId, app.label)}
        glassOpacity={glassOpacity}
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
