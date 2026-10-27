import { useRef, useCallback, useEffect } from 'react'
import { expandNotificationPanel } from '../components/LauncherPlugin'
import HapticFeedback from '../utils/HapticFeedback'
import { useAppStore } from '../stores/appStore'

let contextMenuOpen = false
let doubleTapTimerRef = null
let tapCountRef = 0
let longPressTimerRef = null

export function setContextMenuOpen(v) {
  contextMenuOpen = v
}

function isOverlayActive() {
  try {
    const s = useAppStore.getState()
    return !!(s.showArcSearch || s.showChronoLock || s.showVaultExplorer || contextMenuOpen)
  } catch {
    return contextMenuOpen
  }
}

const DEFAULT_GESTURE_MAP = {
  swipe_up: { action: 'open_drawer' },
  swipe_down: { action: 'notifications' },
  double_tap: { action: 'open_search' },
  swipe_left: { action: 'do_nothing' },
  swipe_right: { action: 'do_nothing' },
  long_press_empty: { action: 'do_nothing' },
  pinch_in: { action: 'do_nothing' },
  two_finger_swipe_up: { action: 'do_nothing' },
  two_finger_swipe_down: { action: 'do_nothing' },
}

function getGestureMap() {
  try {
    const raw = localStorage.getItem('iris_gesture_map')
    if (raw) return { ...DEFAULT_GESTURE_MAP, ...JSON.parse(raw) }
  } catch {}
  return DEFAULT_GESTURE_MAP
}

function getGestureAction(gestureId) {
  const map = getGestureMap()
  const entry = map[gestureId]
  if (!entry || entry.action === 'do_nothing') return null
  return entry
}

export default function useAppGestures({ activePage, setActivePage, setShowArcSearch, launchApp, drawerSheetRef }) {
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
      if (doubleTapTimerRef) {
        clearTimeout(doubleTapTimerRef)
        doubleTapTimerRef = null
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
    const isFlick = duration > 0 && duration < 320
    const dynamicMinSwipe = isFlick ? 40 : 55

    if (absDeltaX < 10 && absDeltaY < 10) {
      if (duration > 500) return 'long_press_empty'
      return null
    }

    if (absDeltaX < dynamicMinSwipe && absDeltaY < dynamicMinSwipe) return null

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
          doubleTapTimerRef = setTimeout(() => { tapCountRef = 0 }, 350)
          longPressTimerRef = setTimeout(() => {
            if (tapCountRef === 1) {
              const gesture = getGestureAction('long_press_empty')
              if (gesture) executeAction(gesture.action, gesture.packageId || gesture.actionData || gesture.app)
              tapCountRef = 0
            }
          }, 600)
        } else if (tapCountRef === 2) {
          if (longPressTimerRef) { clearTimeout(longPressTimerRef); longPressTimerRef = null }
          if (doubleTapTimerRef) { clearTimeout(doubleTapTimerRef); doubleTapTimerRef = null }
          const gesture = getGestureAction('double_tap')
          if (gesture) {
            executeAction(gesture.action, gesture.packageId || gesture.actionData || gesture.app)
          }
          tapCountRef = 0
        }
      }
    }
  }, [activePage, executeAction])

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

      // Interactive 1:1 finger tracking when swiping up on Home (only if swipe_up is assigned to open_drawer)
      if (activePage === 'home' && drawerSheetRef?.current) {
        const swipeUpGesture = getGestureAction('swipe_up')
        if (swipeUpGesture?.action === 'open_drawer') {
          const deltaY = touchEndY.current - touchStartY.current
          if (deltaY < -10 && dx < Math.abs(deltaY) * 1.5) {
            const vh = window.innerHeight || 800
            const currentTranslate = Math.max(0, vh + deltaY)
            drawerSheetRef.current.style.transition = 'none'
            drawerSheetRef.current.style.transform = `translate3d(0, ${currentTranslate}px, 0)`
            drawerSheetRef.current.style.pointerEvents = 'auto'
            const mainEl = document.querySelector('main')
            if (mainEl) {
              const progress = Math.min(1, Math.max(0, -deltaY / (vh * 0.4)))
              mainEl.style.opacity = `${(1 - progress).toFixed(2)}`
            }
          }
        }
      }
    }

    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      currentPinchDistRef.current = Math.hypot(dx, dy)
    }
  }, [activePage, drawerSheetRef])

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

    // Interactive release on Home: snap open or closed with spring physics (only if swipe_up is assigned to open_drawer)
    if (activePage === 'home' && drawerSheetRef?.current && touchStartY.current !== null && touchEndY.current !== null) {
      const swipeUpGesture = getGestureAction('swipe_up')
      if (swipeUpGesture?.action === 'open_drawer') {
        if (deltaY < -15 && absDeltaX < Math.abs(deltaY) * 1.5) {
          const velocity = Math.abs(deltaY) / Math.max(1, duration)
          if (deltaY < -80 || (velocity > 0.35 && deltaY < -30)) {
            HapticFeedback.light()
            drawerSheetRef.current.style.transition = 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1)'
            drawerSheetRef.current.style.transform = 'translate3d(0, 0, 0)'
            const mainEl = document.querySelector('main')
            if (mainEl) {
              mainEl.style.transition = 'opacity 260ms cubic-bezier(0.16, 1, 0.3, 1)'
              mainEl.style.opacity = '0'
              mainEl.style.pointerEvents = 'none'
            }
            setActivePage('drawer')
            touchStartX.current = null; touchEndX.current = null; touchStartY.current = null; touchEndY.current = null
            initialPinchDistRef.current = 0; currentPinchDistRef.current = 0
            return
          } else {
            drawerSheetRef.current.style.transition = 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)'
            drawerSheetRef.current.style.transform = 'translate3d(0, 100%, 0)'
            drawerSheetRef.current.style.pointerEvents = 'none'
            const mainEl = document.querySelector('main')
            if (mainEl) {
              mainEl.style.transition = 'opacity 200ms cubic-bezier(0.16, 1, 0.3, 1)'
              mainEl.style.opacity = '1'
              mainEl.style.pointerEvents = 'auto'
            }
          }
        }
      }
    }

    // Sub-Pages & Drawer handling: Home gestures must not run outside 'home'
    if (activePage !== 'home') {
      if (activePage !== 'drawer') {
        const edgeThreshold = Math.min(100, (typeof window !== 'undefined' ? window.innerWidth : 400) * 0.3)
        if (deltaX > 70 && absDeltaY < 65 && startX < edgeThreshold) {
          HapticFeedback.light()
          setActivePage('home')
        }
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

    touchStartX.current = null; touchEndX.current = null; touchStartY.current = null; touchEndY.current = null
    initialPinchDistRef.current = 0; currentPinchDistRef.current = 0
  }, [activePage, setActivePage, detectGesture, executeAction, drawerSheetRef])

  return { handleTouchStart, handleTouchMove, handleTouchEnd }
}
