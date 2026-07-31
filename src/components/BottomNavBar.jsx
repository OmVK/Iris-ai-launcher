import { useState, useCallback, useRef, useEffect } from 'react'
import { useThemeStore } from '../stores/themeStore'
import { useAssistantStore } from '../stores/assistantStore'

export default function BottomNavBar({ activePage, setActivePage, showAppLabels = true }) {
  const { dockColumns, dockBackground } = useThemeStore()
  const { isListening, isSpeaking } = useAssistantStore()
  const [collapsed, setCollapsed] = useState(false)
  const collapseTimer = useRef(null)
  const navRef = useRef(null)
  const holdTimerRef = useRef(null)

  const isAiActive = isListening || isSpeaking

  const tabs = [
    { id: 'home', label: 'Home', icon: 'home_app_logo', filled: true },
    { id: 'widgets', label: 'Widgets', icon: 'widgets', filled: false },
    { id: 'assistant', label: 'Iris AI', icon: 'smart_toy', filled: true, center: true },
    { id: 'iris_tools', label: 'IRIS', icon: 'deployed_code', filled: false },
    { id: 'settings', label: 'Settings', icon: 'settings', filled: true }
  ]

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

  const handleNavClick = useCallback((id) => {
    setActivePage(id)
    setCollapsed(true)
  }, [setActivePage])

  const handleExpand = useCallback(() => {
    setCollapsed(false)
    startCollapseTimer()
  }, [startCollapseTimer])

  const tabsToRender = tabs.slice(0, dockColumns)
  
  const expWidth = 360
  const expHeight = 68
  const colWidth = tabsToRender.length * 36
  const colHeight = 32

  const getDockBgStyle = () => {
    if (isAiActive) {
      return {
        background: 'rgba(12, 16, 28, 0.95)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)'
      }
    }
    switch(dockBackground) {
      case 'none': return { background: 'transparent', backdropFilter: 'none', WebkitBackdropFilter: 'none' }
      case 'solid': return { background: 'rgba(12, 16, 28, 1)', backdropFilter: 'none', WebkitBackdropFilter: 'none' }
      case 'gradient': return { background: 'linear-gradient(135deg, rgba(0, 242, 255, 0.15), rgba(12, 16, 28, 0.95))', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)' }
      case 'blur':
      default: return { background: 'rgba(12, 16, 28, 0.82)', backdropFilter: 'blur(40px) saturate(180%)', WebkitBackdropFilter: 'blur(40px) saturate(180%)' }
    }
  }

  const touchStartX = useRef(null)
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
    isSwiping.current = false
    holdTriggeredRef.current = false
    clearHoldTimer()
    holdTimerRef.current = setTimeout(() => {
      holdTriggeredRef.current = true
      try { if (navigator.vibrate) navigator.vibrate([20, 30]) } catch (_) {}
      window.dispatchEvent(new CustomEvent('iris-trigger-assistant'))
    }, 350)
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
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-2 pointer-events-none">
        <div
          ref={navRef}
          className={`pointer-events-auto relative flex items-center justify-center overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${isAiActive ? 'animate-aurora-dock-breathe' : ''}`}
        style={{
          ...getDockBgStyle(),
          border: isAiActive ? undefined : (dockBackground === 'none' ? 'none' : '1px solid rgba(255, 255, 255, 0.08)'),
          boxShadow: isAiActive
            ? undefined
            : (dockBackground === 'none' ? 'none' : (collapsed
              ? '0 -2px 12px rgba(0, 229, 255, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.04)'
              : '0 -4px 24px rgba(0, 229, 255, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.08)')),
          width: collapsed ? colWidth : expWidth,
          height: collapsed ? colHeight : expHeight,
          borderRadius: collapsed ? 20 : 34,
        }}
      >
        {isAiActive && (
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 via-emerald-400 to-purple-500 shadow-[0_0_14px_#34d399] animate-pulse" />
        )}
        {/* Collapsed State */}
        <div 
          className={`absolute inset-0 flex items-center justify-center transition-all ${
            collapsed ? 'opacity-100 scale-100 duration-300 delay-200' : 'opacity-0 scale-95 duration-200 pointer-events-none'
          }`}
        >
          <div 
            onClick={handleDockClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="h-[32px] px-3 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
            style={{ width: colWidth }}
          >
            {tabsToRender.map((tab) => (
              <span
                key={tab.id}
                className="material-symbols-outlined transition-all duration-200"
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
          className={`absolute inset-0 flex items-center justify-center transition-all ${
            collapsed ? 'opacity-0 scale-95 duration-150 pointer-events-none' : 'opacity-100 scale-100 duration-300 delay-150'
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
