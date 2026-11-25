import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useThemeStore } from '../stores/themeStore'
import { useAssistantStore } from '../stores/assistantStore'
import { useNotificationStore } from '../stores/notificationStore'
import HapticFeedback from '../utils/HapticFeedback'

export default function BottomNavBar({ activePage, setActivePage, showAppLabels = true }) {
  const { dockColumns, dockBackground, dockHoldAssistant } = useThemeStore()
  const { isListening, isSpeaking, isGenerating } = useAssistantStore()
  const { activeGlow } = useNotificationStore()
  const [collapsed, setCollapsed] = useState(false)
  const collapseTimer = useRef(null)
  const navRef = useRef(null)
  const collapsedLayerRef = useRef(null)
  const expandedLayerRef = useRef(null)
  const holdTimerRef = useRef(null)

  const isAiActive = isListening || isSpeaking || isGenerating

  const tabs = useMemo(() => [
    { id: 'home', label: 'Home', icon: 'home_app_logo', filled: true },
    { id: 'widgets', label: 'Widgets', icon: 'widgets', filled: false },
    { id: 'assistant', label: 'Iris AI', icon: 'smart_toy', filled: true, center: true },
    { id: 'iris_tools', label: 'IRIS', icon: 'deployed_code', filled: false },
    { id: 'settings', label: 'Settings', icon: 'settings', filled: true }
  ], [])

  const startCollapseTimer = useCallback(() => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current)
    collapseTimer.current = setTimeout(() => setCollapsed(true), 4000)
  }, [])

  useEffect(() => {
    startCollapseTimer()
    return () => { if (collapseTimer.current) clearTimeout(collapseTimer.current) }
  }, [activePage, startCollapseTimer])

  useEffect(() => {
    if (collapsed) return
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setCollapsed(true)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [collapsed])

  const handleExpand = useCallback(() => {
    HapticFeedback.light()
    setCollapsed(false)
    startCollapseTimer()
  }, [startCollapseTimer])

  const tabsToRender = tabs.slice(0, dockColumns)
  
  const expWidth = 360
  const expHeight = 68
  const colWidth = tabsToRender.length * 36
  const colHeight = 32

  const activeWidth = collapsed ? colWidth : expWidth
  const activeHeight = collapsed ? colHeight : expHeight
  const activeRadius = collapsed ? 20 : 34

  const springStateRef = useRef({
    initialized: false,
    w: activeWidth,
    h: activeHeight,
    r: activeRadius,
    sx: 1,
    sy: 1,
    ty: 0,
    vw: 0,
    vh: 0,
    vr: 0,
    vsx: 0,
    vsy: 0,
    vty: 0,
    targetW: activeWidth,
    targetH: activeHeight,
    targetR: activeRadius,
    prevCollapsed: collapsed,
    prevAiActive: isAiActive,
    prevActivePage: activePage,
    rafId: null,
    lastTime: 0,
  })

  const runSpringLoop = useCallback(() => {
    const s = springStateRef.current
    const stepSpring = (now) => {
      const el = navRef.current
      if (!el) {
        s.rafId = null
        return
      }
      const dt = s.lastTime ? Math.min(0.032, Math.max(0.001, (now - s.lastTime) / 1000)) : 1 / 120
      s.lastTime = now

      const STEP = 1 / 240
      let rem = dt
      const kDim = 215
      const cDim = 13.2
      const kScale = 240
      const cScale = 13.8

      while (rem > 0) {
        const hStep = Math.min(STEP, rem)
        rem -= hStep

        const aw = -kDim * (s.w - s.targetW) - cDim * s.vw
        s.vw += aw * hStep
        s.w += s.vw * hStep

        const ah = -kDim * (s.h - s.targetH) - cDim * s.vh
        s.vh += ah * hStep
        s.h += s.vh * hStep

        const ar = -kDim * (s.r - s.targetR) - cDim * s.vr
        s.vr += ar * hStep
        s.r += s.vr * hStep

        const asx = -kScale * (s.sx - 1) - cScale * s.vsx
        s.vsx += asx * hStep
        s.sx += s.vsx * hStep

        const asy = -kScale * (s.sy - 1) - cScale * s.vsy
        s.vsy += asy * hStep
        s.sy += s.vsy * hStep

        const aty = -kScale * (s.ty - 0) - cScale * s.vty
        s.vty += aty * hStep
        s.ty += s.vty * hStep
      }

      const clampedW = Math.max(96, s.w)
      const clampedH = Math.max(24, s.h)
      const clampedR = Math.max(12, s.r)
      const clampedSx = Math.max(0.82, Math.min(1.22, s.sx))
      const clampedSy = Math.max(0.82, Math.min(1.25, s.sy))

      el.style.width = `${clampedW.toFixed(2)}px`
      el.style.height = `${clampedH.toFixed(2)}px`
      el.style.borderRadius = `${clampedR.toFixed(2)}px`
      el.style.transform = `translate3d(0, ${s.ty.toFixed(2)}px, 0) scale3d(${clampedSx.toFixed(4)}, ${clampedSy.toFixed(4)}, 1)`

      const spanH = Math.max(1, expHeight - colHeight)
      const progress = Math.max(0, Math.min(1, (clampedH - colHeight) / spanH))
      if (collapsedLayerRef.current) {
        const colOp = Math.max(0, Math.min(1, 1 - progress * 1.45))
        const colSc = 0.92 + (1 - progress) * 0.08
        collapsedLayerRef.current.style.opacity = colOp.toFixed(3)
        collapsedLayerRef.current.style.transform = `scale3d(${colSc.toFixed(3)}, ${colSc.toFixed(3)}, 1)`
      }
      if (expandedLayerRef.current) {
        const expOp = Math.max(0, Math.min(1, (progress - 0.15) / 0.85))
        const expSc = 0.92 + progress * 0.08
        expandedLayerRef.current.style.opacity = expOp.toFixed(3)
        expandedLayerRef.current.style.transform = `scale3d(${expSc.toFixed(3)}, ${expSc.toFixed(3)}, 1)`
      }

      const settled =
        Math.abs(s.w - s.targetW) < 0.2 &&
        Math.abs(s.h - s.targetH) < 0.2 &&
        Math.abs(s.r - s.targetR) < 0.2 &&
        Math.abs(s.sx - 1) < 0.002 &&
        Math.abs(s.sy - 1) < 0.002 &&
        Math.abs(s.ty) < 0.15 &&
        Math.abs(s.vw) < 0.8 &&
        Math.abs(s.vh) < 0.8 &&
        Math.abs(s.vsx) < 0.01 &&
        Math.abs(s.vsy) < 0.01 &&
        Math.abs(s.vty) < 0.5

      if (settled) {
        s.w = s.targetW
        s.h = s.targetH
        s.r = s.targetR
        s.sx = 1
        s.sy = 1
        s.ty = 0
        s.vw = 0
        s.vh = 0
        s.vr = 0
        s.vsx = 0
        s.vsy = 0
        s.vty = 0
        el.style.width = `${s.targetW}px`
        el.style.height = `${s.targetH}px`
        el.style.borderRadius = `${s.targetR}px`
        el.style.transform = 'translate3d(0, 0px, 0) scale3d(1, 1, 1)'
        s.rafId = null
        s.lastTime = 0
      } else {
        s.rafId = requestAnimationFrame(stepSpring)
      }
    }

    if (!s.rafId) {
      s.lastTime = 0
      s.rafId = requestAnimationFrame(stepSpring)
    }
  }, [colHeight, expHeight])

  useEffect(() => {
    const s = springStateRef.current
    if (!s.initialized) {
      s.initialized = true
      s.w = activeWidth
      s.h = activeHeight
      s.r = activeRadius
      s.targetW = activeWidth
      s.targetH = activeHeight
      s.targetR = activeRadius
      s.prevCollapsed = collapsed
      s.prevAiActive = isAiActive
      s.prevActivePage = activePage
      return
    }

    if (collapsed !== s.prevCollapsed) {
      if (!collapsed) {
        // Expanding from compact pill -> full dock: upward & outward liquid spring burst
        s.vw += 540
        s.vh += 360
        s.vsx += 1.35
        s.vsy += 1.55
        s.vty -= 85
      } else {
        // Collapsing from full dock -> compact pill: crisp inward cushion
        s.vw -= 380
        s.vh -= 280
        s.vsx -= 0.95
        s.vsy -= 1.15
        s.vty += 60
      }
    }

    if (isAiActive !== s.prevAiActive) {
      s.vsx += isAiActive ? 1.15 : -0.75
      s.vsy += isAiActive ? 1.25 : -0.85
      s.vty += isAiActive ? -65 : 45
    }

    if (activePage !== s.prevActivePage && !collapsed) {
      // Tactile micro-spring bounce when switching tabs
      s.vsx += 0.92
      s.vsy -= 0.78
      s.vty -= 48
    }

    s.prevCollapsed = collapsed
    s.prevAiActive = isAiActive
    s.prevActivePage = activePage
    s.targetW = activeWidth
    s.targetH = activeHeight
    s.targetR = activeRadius

    runSpringLoop()
  }, [activeWidth, activeHeight, activeRadius, collapsed, isAiActive, activePage, runSpringLoop])

  useEffect(() => {
    const s = springStateRef.current
    return () => {
      if (s.rafId) cancelAnimationFrame(s.rafId)
    }
  }, [])

  const handleNavClick = useCallback((id) => {
    HapticFeedback.light()
    const s = springStateRef.current
    if (s.initialized && id === activePage) {
      s.vsx += 0.92
      s.vsy -= 0.78
      s.vty -= 48
      runSpringLoop()
    }
    setActivePage(id)
    startCollapseTimer()
  }, [activePage, setActivePage, startCollapseTimer, runSpringLoop])

  const getDockBgStyle = () => {
    if (isAiActive) {
      return {
        background: 'rgba(6, 10, 20, 0.58)',
        backdropFilter: 'blur(14px) saturate(165%)',
        WebkitBackdropFilter: 'blur(14px) saturate(165%)',
      }
    }
    switch(dockBackground) {
      case 'none': return { background: 'transparent' }
      case 'solid': return { background: 'rgba(12, 16, 28, 1)' }
      case 'gradient': return {
        background: 'linear-gradient(135deg, rgba(0, 242, 255, 0.14), rgba(6, 10, 20, 0.68))',
        backdropFilter: 'blur(14px) saturate(165%)',
        WebkitBackdropFilter: 'blur(14px) saturate(165%)',
      }
      case 'blur':
      default: return {
        background: collapsed ? 'rgba(8, 12, 22, 0.72)' : 'rgba(6, 10, 20, 0.62)',
        backdropFilter: 'blur(14px) saturate(165%)',
        WebkitBackdropFilter: 'blur(14px) saturate(165%)',
      }
    }
  }

  const touchStartX = useRef(null)
  const touchStartY = useRef(null)
  const isSwiping = useRef(false)
  const holdTriggeredRef = useRef(false)

  const clearHoldTimer = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
  }

  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    isSwiping.current = false
    holdTriggeredRef.current = false
    clearHoldTimer()

    // 1. If dock hold assistant is disabled in settings, do not start hold timer
    if (!dockHoldAssistant) return

    // 2. Bottom safe area exclusion: ignore hold gesture if touch originates within 32px of screen bottom
    // to preserve Android system navigation / Recent Apps gesture swipe on devices like S24 Ultra
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 800
    if (touchStartY.current > screenH - 32) return

    holdTimerRef.current = setTimeout(() => {
      holdTriggeredRef.current = true
      HapticFeedback.double()
      window.dispatchEvent(new CustomEvent('iris-activate-assistant'))
    }, 1000)
  }, [dockHoldAssistant])

  const handleTouchMove = useCallback((e) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const currentX = e.touches[0].clientX
    const currentY = e.touches[0].clientY
    const dx = Math.abs(currentX - touchStartX.current)
    const dy = Math.abs(currentY - touchStartY.current)
    if (dx > 10 || dy > 10) {
      clearHoldTimer()
      isSwiping.current = true
    }
  }, [])

  const handleTouchEnd = useCallback((e) => {
    clearHoldTimer()
    if (touchStartX.current === null) return
    const touchEndX = e.changedTouches[0].clientX
    const diff = touchStartX.current - touchEndX

    if (Math.abs(diff) > 30) {
      isSwiping.current = true
      e.stopPropagation() // Prevent global app gestures
      const currentIndex = tabs.findIndex(t => t.id === activePage)
      if (diff > 0 && currentIndex < tabs.length - 1) {
        setActivePage(tabs[currentIndex + 1].id)
      } else if (diff < 0 && currentIndex > 0) {
        setActivePage(tabs[currentIndex - 1].id)
      }
      startCollapseTimer()
    }
    touchStartX.current = null
    touchStartY.current = null
  }, [activePage, setActivePage, startCollapseTimer, tabs])

  const handleDockClick = useCallback(() => {
    if (holdTriggeredRef.current) {
      holdTriggeredRef.current = false
      return
    }
    if (isSwiping.current) {
      isSwiping.current = false
      return
    }
    handleExpand()
  }, [handleExpand])

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
      style={{ paddingBottom: 'max(14px, env(safe-area-inset-bottom, 14px))' }}
    >
        <div
          ref={navRef}
          onTouchStart={e => e.stopPropagation()}
          onTouchMove={e => e.stopPropagation()}
          onTouchEnd={e => e.stopPropagation()}
          className={`pointer-events-auto relative flex items-center justify-center overflow-hidden island-morph ${
            collapsed ? 'is-collapsed' : ''
          }`}
          style={{
          ...getDockBgStyle(),
          transformOrigin: 'bottom center',
          border: isAiActive
            ? '1px solid rgba(var(--primary-rgb), 0.7)'
            : (activeGlow
              ? `1px solid ${activeGlow.color}`
              : (dockBackground === 'none' ? 'none' : '1px solid rgba(255, 255, 255, 0.1)')),
          boxShadow: isAiActive
            ? '0 0 16px rgba(var(--primary-rgb), 0.35), 0 -6px 24px rgba(0, 0, 0, 0.45)'
            : (activeGlow
              ? `0 -4px 30px ${activeGlow.glow}, 0 0 16px ${activeGlow.color}`
              : (dockBackground === 'none' ? 'none' : (collapsed
                ? '0 -2px 10px rgba(0, 0, 0, 0.4)'
                : '0 -6px 24px rgba(0, 0, 0, 0.6)'))),
          width: `${springStateRef.current.w}px`,
          height: `${springStateRef.current.h}px`,
          borderRadius: `${springStateRef.current.r}px`,
          transform: `translate3d(0, ${springStateRef.current.ty}px, 0) scale3d(${springStateRef.current.sx}, ${springStateRef.current.sy}, 1)`,
        }}
      >
        {activeGlow && (
          <div 
            className="absolute top-0 left-0 right-0 h-[2px] animate-pulse z-10" 
            style={{ 
              backgroundColor: activeGlow.color, 
              boxShadow: `0 0 16px ${activeGlow.color}` 
            }} 
          />
        )}
        {/* Collapsed State */}
        <div
          ref={collapsedLayerRef}
          className={`absolute inset-0 flex items-center justify-center island-content-layer ${
            collapsed ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
          }`}
        >
          <div 
            onClick={handleDockClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="h-[32px] px-3 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
            style={{ width: colWidth }}
          >
            {tabsToRender.map((tab) => (
              <span
                key={tab.id}
                className="material-symbols-outlined transition-[color,font-size] duration-200"
                style={{
                  fontSize: activePage === tab.id ? 16 : 13,
                  fontVariationSettings: (activePage === tab.id && tab.filled) ? "'FILL' 1" : "'FILL' 0",
                  color: activePage === tab.id
                    ? 'rgba(0, 242, 255, 0.9)'
                    : 'rgba(255, 255, 255, 0.3)',
                  textShadow: activePage === tab.id ? '0 0 8px rgba(0, 242, 255, 0.5)' : 'none'
                }}
              >
                {tab.icon}
              </span>
            ))}
            <div className="w-px h-3 bg-white/10 mx-0.5" />
            <span className="material-symbols-outlined text-white/25 animate-pulse" style={{ fontSize: 13 }}>expand_less</span>
          </div>
        </div>

        {/* Expanded State */}
        <div
          ref={expandedLayerRef}
          className={`absolute inset-0 flex items-center justify-center island-content-layer ${
            collapsed ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100 pointer-events-auto'
          }`}
        >
          <div className="w-[360px] h-[68px] px-3 flex justify-around items-center">
            {tabsToRender.map((tab) => {
              const isActive = activePage === tab.id

              if (tab.center) {
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleNavClick(tab.id)}
                    className={`flex items-center justify-center p-3.5 rounded-full transition-all duration-300 scale-100 active:scale-90 relative ${
                      isActive
                        ? 'bg-primary-fixed-dim/30 text-primary-fixed-dim shadow-[0_0_24px_rgba(0,242,255,0.6)] border border-primary-fixed-dim/40'
                        : 'bg-surface-container-high/40 text-on-surface-variant/70 border border-outline-variant/30 hover:text-primary-fixed hover:border-primary-fixed-dim/30 hover:shadow-[0_0_12px_rgba(0,242,255,0.3)]'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-primary-fixed-dim" />
                    )}
                    <span
                      className="material-symbols-outlined text-[26px]"
                      style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      {tab.icon}
                    </span>
                  </button>
                )
              }

              return (
                <button
                  key={tab.id}
                  onClick={() => handleNavClick(tab.id)}
                  className={`flex flex-col items-center justify-center py-1 w-14 transition-all duration-200 active:scale-90 ${
                    isActive
                      ? 'text-primary-fixed-dim scale-110'
                      : 'text-on-surface-variant/50 hover:text-primary-fixed/80'
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-2xl"
                    style={{ 
                      fontVariationSettings: (isActive && tab.filled) ? "'FILL' 1" : "'FILL' 0",
                      textShadow: isActive ? '0 0 10px rgba(0, 242, 255, 0.4)' : 'none'
                    }}
                  >
                    {tab.icon}
                  </span>
                  <span className={`font-label-caps text-[9px] mt-1 tracking-wider transition-all ${isActive ? 'text-primary-fixed-dim drop-shadow-[0_0_4px_rgba(0,242,255,0.8)] font-bold' : 'text-on-surface-variant/40'}`}>
                    {showAppLabels ? tab.label : <div className="h-1.5 w-1.5 rounded-full bg-current opacity-30 mt-1" />}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
