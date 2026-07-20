import { useRef, useCallback, useEffect } from 'react'
import { expandNotificationPanel } from '../components/LauncherPlugin'

let contextMenuOpen = false
let tripleTapTimerRef = null
let tapCountRef = 0

export function setContextMenuOpen(v) {
  contextMenuOpen = v
}

export default function useAppGestures({ activePage, setActivePage, setShowArcSearch }) {
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)
  const touchEndX = useRef(null)
  const touchEndY = useRef(null)

  useEffect(() => {
    return () => {
      if (tripleTapTimerRef) {
        clearTimeout(tripleTapTimerRef)
        tripleTapTimerRef = null
      }
      tapCountRef = 0
    }
  }, [])

  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    if (contextMenuOpen) return

    if (!e.target.closest('button') && !e.target.closest('input') && !e.target.closest('.app-icon-item') && !e.target.closest('[data-no-arc]')) {
      tapCountRef++
      if (tapCountRef === 1) {
        tripleTapTimerRef = setTimeout(() => { tapCountRef = 0 }, 500)
      } else if (tapCountRef >= 3) {
        clearTimeout(tripleTapTimerRef)
        tripleTapTimerRef = null
        tapCountRef = 0
        setShowArcSearch(true)
        return
      }
    }
  }, [setShowArcSearch])

  const handleTouchMove = useCallback((e) => {
    touchEndX.current = e.touches[0].clientX
    touchEndY.current = e.touches[0].clientY
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (touchStartX.current === null || touchEndX.current === null) return
    const deltaX = touchEndX.current - touchStartX.current
    const deltaY = touchEndY.current - touchStartY.current
    const absDeltaY = Math.abs(deltaY)
    const absDeltaX = Math.abs(deltaX)
    if (deltaX > 80 && absDeltaY < 50 && touchStartX.current < window.innerWidth / 2) {
      if (activePage !== 'home') setActivePage('home')
    } else if (activePage === 'home') {
      if (deltaY > 80 && absDeltaX < 50) expandNotificationPanel()
      else if (deltaX < -80 && absDeltaY < 50) setActivePage('iris_news')
    }
    touchStartX.current = null; touchEndX.current = null; touchStartY.current = null; touchEndY.current = null
  }, [activePage, setActivePage])

  return { handleTouchStart, handleTouchMove, handleTouchEnd }
}
