import { useRef, useCallback, useEffect } from 'react'
import { expandNotificationPanel } from '../components/LauncherPlugin'
import HapticFeedback from '../utils/HapticFeedback'
import { useAppStore } from '../stores/appStore'

let contextMenuOpen = false
let tripleTapTimerRef = null
let tapCountRef = 0
let longPressTimerRef = null

export function setContextMenuOpen(v) {
  contextMenuOpen = v
}

function isOverlayActive() {
  try {
    const s = useAppStore.getState()
    return !!(s.showArcSearch || s.showChronoLock || s.showVaultExplorer || s.showVpnBrowser || contextMenuOpen)
  } catch {
    return contextMenuOpen
  }
}

function getGestureMap() {
  try {
    const raw = localStorage.getItem('iris_gesture_map')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function getGestureAction(gestureId) {
  const map = getGestureMap()
  const entry = map[gestureId]
  if (!entry || entry.action === 'do_nothing') return null
  return entry
}

export default function useAppGestures({ activePage, setActivePage, setShowArcSearch, launchApp }) {
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)
  const touchEndX = useRef(null)
  const touchEndY = useRef(null)
  const touchStartTime = useRef(null)
  const touchCountRef = useRef(1)
  const initialPinchDistRef = useRef(0)
  const currentPinchDistRef = useRef(0)

  useEffect(() => {
    return () => {
      if (tripleTapTimerRef) {
        clearTimeout(tripleTapTimerRef)
        tripleTapTimerRef = null
      }
      if (longPressTimerRef) {
        clearTimeout(longPressTimerRef)
        longPressTimerRef = null
      }
      tapCountRef = 0
    }
  }, [])

  const executeAction = useCallback((actionType, actionData) => {
    if (!actionType || actionType === 'do_nothing') return
    HapticFeedback.light()
    switch (actionType) {
      case 'open_home': setActivePage('home'); break
      case 'open_drawer': setActivePage('drawer'); break
      case 'open_settings': setActivePage('settings'); break
      case 'assistant': setActivePage('assistant'); break
      case 'open_widgets': setActivePage('widgets'); break
      case 'open_folder': break
      case 'notifications': expandNotificationPanel(); break
      case 'open_search': setShowArcSearch(true); break
      case 'recents': setActivePage('recents'); break
      case 'launch_app': if (actionData && launchApp) launchApp(actionData); break
      case 'quick_settings': setActivePage('settings'); break
      case 'screen_lock': break
      case 'last_app': break
      default: break
    }
  }, [setActivePage, setShowArcSearch, launchApp])

  const detectGesture = useCallback((deltaX, deltaY, _startX, _startY, duration, touchCount, pinchRatio) => {
    if (touchCount === 2) {
      if (pinchRatio > 0 && pinchRatio < 0.75) return 'pinch_in'
      if (Math.abs(deltaY) > 60) return deltaY < 0 ? 'two_finger_swipe_up' : 'two_finger_swipe_down'
    }

    const absDeltaX = Math.abs(deltaX)
    const absDeltaY = Math.abs(deltaY)
    const minSwipe = 80

    if (absDeltaX < 10 && absDeltaY < 10) {
      if (duration > 500) return 'long_press_empty'
      return null
    }

    if (absDeltaX < minSwipe && absDeltaY < minSwipe) return null

    if (absDeltaX > absDeltaY) {
      const dir = deltaX > 0 ? 'right' : 'left'
      return `swipe_${dir}`
    } else {
      const dir = deltaY > 0 ? 'down' : 'up'
      return `swipe_${dir}`
    }
  }, [])

  const handleTouchStart = useCallback((e) => {
    if (isOverlayActive()) return

    touchCountRef.current = e.touches.length
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    touchStartTime.current = Date.now()

    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      initialPinchDistRef.current = Math.hypot(dx, dy)
      currentPinchDistRef.current = initialPinchDistRef.current
    }

    // Only run tap / long-press timers on the Home screen to avoid interfering with scrolling in sub-pages
    if (activePage === 'home') {
      if (!e.target.closest('button') && !e.target.closest('input') && !e.target.closest('.app-icon-item') && !e.target.closest('[data-no-arc]')) {
        tapCountRef++
        if (tapCountRef === 1) {
          tripleTapTimerRef = setTimeout(() => { tapCountRef = 0 }, 500)
          longPressTimerRef = setTimeout(() => {
            if (tapCountRef === 1) {
              const gesture = getGestureAction('long_press_empty')
              if (gesture) executeAction(gesture.action, gesture.packageId || gesture.actionData || gesture.app)
              tapCountRef = 0
            }
          }, 600)
        } else if (tapCountRef === 2) {
          if (longPressTimerRef) { clearTimeout(longPressTimerRef); longPressTimerRef = null }
          if (tripleTapTimerRef) { clearTimeout(tripleTapTimerRef); tripleTapTimerRef = null }
          const gesture = getGestureAction('double_tap')
          if (gesture) {
            executeAction(gesture.action, gesture.packageId || gesture.actionData || gesture.app)
          }
          tapCountRef = 0
        } else if (tapCountRef >= 3) {
          clearTimeout(tripleTapTimerRef)
          tripleTapTimerRef = null
          tapCountRef = 0
          HapticFeedback.double()
          setShowArcSearch(true)
          return
        }
      }
    }
  }, [activePage, setShowArcSearch, executeAction])

  const handleTouchMove = useCallback((e) => {
    if (isOverlayActive()) return

    touchEndX.current = e.touches[0].clientX
    touchEndY.current = e.touches[0].clientY

    if (touchStartX.current !== null && touchStartY.current !== null) {
      const dx = Math.abs(touchEndX.current - touchStartX.current)
      const dy = Math.abs(touchEndY.current - touchStartY.current)
      if (dx > 15 || dy > 15) {
        if (longPressTimerRef) {
          clearTimeout(longPressTimerRef)
          longPressTimerRef = null
        }
      }
    }

    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      currentPinchDistRef.current = Math.hypot(dx, dy)
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef) { clearTimeout(longPressTimerRef); longPressTimerRef = null }

    if (isOverlayActive()) {
      touchStartX.current = null; touchEndX.current = null; touchStartY.current = null; touchEndY.current = null
      return
    }

    if (touchStartX.current === null || touchEndX.current === null) return
    const deltaX = touchEndX.current - touchStartX.current
    const deltaY = touchEndY.current - touchStartY.current
    const startX = touchStartX.current
    const duration = Date.now() - (touchStartTime.current || 0)
    const absDeltaY = Math.abs(deltaY)
    const absDeltaX = Math.abs(deltaX)

    // iOS-Style Edge Swipe Right on Sub-Pages -> Smoothly Navigate Back to Home
    if (activePage !== 'home') {
      const edgeThreshold = Math.min(100, (typeof window !== 'undefined' ? window.innerWidth : 400) * 0.3)
      if (deltaX > 70 && absDeltaY < 65 && startX < edgeThreshold) {
        HapticFeedback.light()
        setActivePage('home')
      }
      touchStartX.current = null; touchEndX.current = null; touchStartY.current = null; touchEndY.current = null
      initialPinchDistRef.current = 0; currentPinchDistRef.current = 0
      return
    }

    // Home Screen Gestures
    const pinchRatio = initialPinchDistRef.current > 0 ? currentPinchDistRef.current / initialPinchDistRef.current : 0
    const gestureName = detectGesture(deltaX, deltaY, startX, touchStartY.current, duration, touchCountRef.current, pinchRatio)
    
    if (gestureName) {
      const gesture = getGestureAction(gestureName)
      if (gesture) {
        executeAction(gesture.action, gesture.actionData || gesture.packageId || gesture.app)
        touchStartX.current = null; touchEndX.current = null; touchStartY.current = null; touchEndY.current = null
        initialPinchDistRef.current = 0; currentPinchDistRef.current = 0
        return
      }
    }

    if (deltaY > 80 && absDeltaX < 50) {
      expandNotificationPanel()
    }

    touchStartX.current = null; touchEndX.current = null; touchStartY.current = null; touchEndY.current = null
    initialPinchDistRef.current = 0; currentPinchDistRef.current = 0
  }, [activePage, setActivePage, detectGesture, executeAction])

  return { handleTouchStart, handleTouchMove, handleTouchEnd }
}
