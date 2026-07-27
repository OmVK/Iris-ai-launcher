import { useRef, useCallback, useEffect } from 'react'
import { expandNotificationPanel } from '../components/LauncherPlugin'
import HapticFeedback from '../utils/HapticFeedback'

let contextMenuOpen = false
let tripleTapTimerRef = null
let tapCountRef = 0
let longPressTimerRef = null

export function setContextMenuOpen(v) {
  contextMenuOpen = v
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
      case 'open_terminal': setActivePage('terminal'); break
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

  const detectGesture = useCallback((deltaX, deltaY, startX, startY, duration) => {
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
      if (absDeltaY < absDeltaX * 0.4) return `swipe_${dir}`
      return `swipe_${dir}`
    } else {
      const dir = deltaY > 0 ? 'down' : 'up'
      if (absDeltaX < absDeltaY * 0.4) return `swipe_${dir}`
      return `swipe_${dir}`
    }
  }, [])

  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    touchStartTime.current = Date.now()
    if (contextMenuOpen) return

    if (!e.target.closest('button') && !e.target.closest('input') && !e.target.closest('.app-icon-item') && !e.target.closest('[data-no-arc]')) {
      tapCountRef++
      if (tapCountRef === 1) {
        tripleTapTimerRef = setTimeout(() => { tapCountRef = 0 }, 500)
        longPressTimerRef = setTimeout(() => {
          if (tapCountRef === 1) {
            const gesture = getGestureAction('long_press_empty')
            if (gesture) executeAction(gesture.action, gesture.actionData)
            tapCountRef = 0
          }
        }, 600)
      } else if (tapCountRef === 2) {
        if (longPressTimerRef) { clearTimeout(longPressTimerRef); longPressTimerRef = null }
        tripleTapTimerRef = setTimeout(() => {
          const gesture = getGestureAction('double_tap')
          if (gesture) executeAction(gesture.action, gesture.actionData)
          tapCountRef = 0
        }, 300)
      } else if (tapCountRef >= 3) {
        clearTimeout(tripleTapTimerRef)
        tripleTapTimerRef = null
        tapCountRef = 0
        HapticFeedback.double()
        setShowArcSearch(true)
        return
      }
    }
  }, [setShowArcSearch, executeAction])

  const handleTouchMove = useCallback((e) => {
    touchEndX.current = e.touches[0].clientX
    touchEndY.current = e.touches[0].clientY
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef) { clearTimeout(longPressTimerRef); longPressTimerRef = null }

    if (touchStartX.current === null || touchEndX.current === null) return
    const deltaX = touchEndX.current - touchStartX.current
    const deltaY = touchEndY.current - touchStartY.current
    const duration = Date.now() - (touchStartTime.current || 0)

    const gestureName = detectGesture(deltaX, deltaY, touchStartX.current, touchStartY.current, duration)
    if (gestureName) {
      const gesture = getGestureAction(gestureName)
      if (gesture) {
        executeAction(gesture.action, gesture.actionData)
        touchStartX.current = null; touchEndX.current = null; touchStartY.current = null; touchEndY.current = null
        return
      }
    }

    const absDeltaY = Math.abs(deltaY)
    const absDeltaX = Math.abs(deltaX)
    if (deltaX > 80 && absDeltaY < 50 && touchStartX.current < window.innerWidth / 2) {
      if (activePage !== 'home') setActivePage('home')
    } else if (activePage === 'home') {
      if (deltaY > 80 && absDeltaX < 50) expandNotificationPanel()
    }

    touchStartX.current = null; touchEndX.current = null; touchStartY.current = null; touchEndY.current = null
  }, [activePage, setActivePage, detectGesture, executeAction])

  return { handleTouchStart, handleTouchMove, handleTouchEnd }
}
