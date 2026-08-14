import { useState, useEffect, useCallback } from 'react'
import { uninstallApp, openAppSettings } from '../components/LauncherPlugin'
import { setContextMenuOpen } from './useAppGestures'
import HapticFeedback from '../utils/HapticFeedback'

export function useAppContextMenu({ setInstalledApps, onToggleAppLock }) {
  const [activeContextMenu, setActiveContextMenu] = useState(null)
  const [toastText, setToastText] = useState('')

  useEffect(() => {
    setContextMenuOpen(!!activeContextMenu)
  }, [activeContextMenu])

  useEffect(() => {
    if (toastText) {
      const t = setTimeout(() => setToastText(''), 2200)
      return () => clearTimeout(t)
    }
  }, [toastText])

  const handleContextMenu = useCallback((e, app) => {
    e.preventDefault?.()
    e.stopPropagation?.()

    let posX = 100
    let posY = 100

    const targetEl = e.currentTarget || e.target?.closest?.('.drawer-app-item') || e.target?.closest?.('.app-icon-item') || e.target

    if (targetEl && targetEl.getBoundingClientRect) {
      const rect = targetEl.getBoundingClientRect()
      const menuWidth = 180
      const menuHeight = 210

      // Calculate X: align beside the app icon if room, otherwise align to left/center
      if (rect.right + menuWidth <= window.innerWidth - 10) {
        posX = rect.right + 6
      } else if (rect.left - menuWidth >= 10) {
        posX = rect.left - menuWidth - 6
      } else {
        posX = Math.max(10, Math.min(rect.left, window.innerWidth - menuWidth - 10))
      }

      // Calculate Y: align vertically with the icon, keeping within viewport
      if (rect.top + menuHeight <= window.innerHeight - 20) {
        posY = Math.max(10, rect.top)
      } else {
        posY = Math.max(10, Math.min(rect.bottom - menuHeight, window.innerHeight - menuHeight - 10))
      }
    } else {
      const touch = e.touches?.[0] || e.changedTouches?.[0] || e
      const clientX = e.clientX ?? touch?.clientX ?? (window.innerWidth / 2 - 90)
      const clientY = e.clientY ?? touch?.clientY ?? (window.innerHeight / 2 - 105)
      posX = Math.max(10, Math.min(clientX, window.innerWidth - 190))
      posY = Math.max(10, Math.min(clientY, window.innerHeight - 220))
    }

    setActiveContextMenu({
      app,
      x: Math.round(posX),
      y: Math.round(posY)
    })
    HapticFeedback.medium()
  }, [])

  const handleLockApp = (app) => {
    if (onToggleAppLock) {
      onToggleAppLock(app.packageId)
      setToastText(`${app.label.toUpperCase()} SECURED IN VAULT`)
    }
    setTimeout(() => setActiveContextMenu(null), 250)
  }

  const handleTriggerUninstall = (app) => {
    uninstallApp(app.packageId)
    setTimeout(() => setActiveContextMenu(null), 250)
  }

  const handleOpenAppInfo = (app) => {
    openAppSettings(app.packageId)
    setTimeout(() => setActiveContextMenu(null), 250)
  }

  return {
    activeContextMenu, setActiveContextMenu,
    toastText, setToastText,
    handleContextMenu,
    handleLockApp,
    handleTriggerUninstall,
    handleOpenAppInfo
  }
}
