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
    e.preventDefault()
    e.stopPropagation()
    const touch = e.touches ? e.touches[0] : e
    const clientX = e.clientX || (touch ? touch.clientX : 100)
    const clientY = e.clientY || (touch ? touch.clientY : 100)
    setActiveContextMenu({
      app,
      x: Math.min(clientX, window.innerWidth - 200),
      y: Math.min(clientY, window.innerHeight - 150)
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
