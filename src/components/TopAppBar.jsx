import { useState, useEffect, useCallback, useRef } from 'react'
import PowerSaveManager from '../utils/PowerSaveManager'
import { fetchCurrentWeather } from '../utils/weather'
import { useAssistantStore } from '../stores/assistantStore'
import useBadgeStore from '../stores/badgeStore'
import { getSystemStats } from './LauncherPlugin'

const CONDITION_ICONS = {
  CLEAR: 'clear_day',
  PARTLY_CLOUDY: 'partly_cloudy_day',
  OVERCAST: 'cloud',
  FOGGY: 'foggy',
  DRIZZLE: 'rainy_light',
  RAINY: 'rainy',
  HEAVY_RAIN: 'rainy',
  FREEZING_DRIZZLE: 'weather_snowy',
  SNOWY: 'weather_snowy',
  HEAVY_SNOW: 'weather_snowy',
  SNOW_GRAINS: 'weather_snowy',
  SHOWER_RAIN: 'rainy',
  HEAVY_SHOWER: 'rainy',
  SNOW_SHOWERS: 'weather_snowy',
  HEAVY_SNOW_SHOWERS: 'weather_snowy',
  THUNDERSTORM: 'thunderstorm',
  THUNDERSTORM_HAIL: 'thunderstorm',
  FREEZING_RAIN: 'weather_snowy',
}

import { useThemeStore } from '../stores/themeStore'
import { useNotificationStore } from '../stores/notificationStore'
import CondensedZeroScreen from './CondensedZeroScreen'
import CondensedTelemetry from './CondensedTelemetry'
import CondensedNotifLog from './CondensedNotifLog'
import { launchApp } from './LauncherPlugin'
import HapticFeedback from '../utils/HapticFeedback'

const PROFILE_PRESETS = {
  AUTO: { baseWidth: 210, baseHeight: 36, topMargin: 8 },
  PIXEL: { baseWidth: 215, baseHeight: 38, topMargin: 10 },
  GALAXY: { baseWidth: 190, baseHeight: 32, topMargin: 6 },
  PILL: { baseWidth: 235, baseHeight: 36, topMargin: 8 },
  NOTCH: { baseWidth: 220, baseHeight: 42, topMargin: 4 },
  CUSTOM: { baseWidth: 200, baseHeight: 32, topMargin: 8 }
}

export default function TopAppBar({ title = "IRIS-SYSTEM-OS", use24HourClock = true, isAppActive = true, powerSaveMode, onNavigate }) {
  const [time, setTime] = useState("")
  const [battery, setBattery] = useState({ level: 100, charging: false })
  const [networkType, setNetworkType] = useState('ONLINE')
  const [expanded, setExpanded] = useState(false)
  const [expandedTab, setExpandedTab] = useState('telemetry')
  const [weather, setWeather] = useState(null)
  const [sysStats, setSysStats] = useState({ memUsed: '0', memTotal: '0', cpuTemp: 0 })
  
  const collapseTimer = useRef(null)
  const islandRef = useRef(null)

  const { isListening, isSpeaking } = useAssistantStore()
  const { totalUnread } = useBadgeStore()
  const { islandProfile, islandWidthScale, islandHeightScale, islandTopMargin } = useThemeStore()
  const { activeNotification, activeGlow, dismissActive, history } = useNotificationStore()

  const preset = PROFILE_PRESETS[islandProfile] || PROFILE_PRESETS.AUTO
  const collapsedWidth = Math.round(preset.baseWidth * (islandWidthScale / 100))
  const collapsedHeight = Math.round(preset.baseHeight * (islandHeightScale / 100))
  const computedTopMargin = islandProfile === 'CUSTOM' ? islandTopMargin : Math.max(0, preset.topMargin + (islandTopMargin - 8))
  
  const [autoExpand, setAutoExpand] = useState(false)
  const previousUnread = useRef(totalUnread)

  // Trigger auto-expand on new notifications
  useEffect(() => {
    if (totalUnread > previousUnread.current) {
      setAutoExpand(true)
      setExpanded(true)
      if (collapseTimer.current) clearTimeout(collapseTimer.current)
      collapseTimer.current = setTimeout(() => {
        setExpanded(false)
        setAutoExpand(false)
      }, 3000)
    }
    previousUnread.current = totalUnread
  }, [totalUnread])

  useEffect(() => {
    const fetchWeather = async () => {
      const data = await fetchCurrentWeather()
      if (data) setWeather(data)
    }
    fetchWeather()
    const interval = setInterval(fetchWeather, PowerSaveManager.getPollingInterval('weatherPollMs'))
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    let batteryRef = null
    const batListeners = []
    if (navigator.getBattery) {
      navigator.getBattery().then(bat => {
        batteryRef = bat
        const updateBat = () => {
          setBattery({
            level: Math.round(bat.level * 100),
            charging: bat.charging
          })
        }
        updateBat()
        bat.addEventListener('levelchange', updateBat)
        bat.addEventListener('chargingchange', updateBat)
        batListeners.push({ target: bat, type: 'levelchange', fn: updateBat })
        batListeners.push({ target: bat, type: 'chargingchange', fn: updateBat })
      })
    }

    const updateNetwork = () => {
      if (navigator.connection && navigator.connection.effectiveType) {
        setNetworkType(navigator.connection.effectiveType.toUpperCase())
      } else {
        setNetworkType(navigator.onLine ? 'ONLINE' : 'OFFLINE')
      }
    }
    updateNetwork()
    window.addEventListener('online', updateNetwork)
    window.addEventListener('offline', updateNetwork)
    if (navigator.connection) {
      navigator.connection.addEventListener('change', updateNetwork)
    }

    return () => {
      batListeners.forEach(({ target, type, fn }) => target.removeEventListener(type, fn))
      window.removeEventListener('online', updateNetwork)
      window.removeEventListener('offline', updateNetwork)
      if (navigator.connection) navigator.connection.removeEventListener('change', updateNetwork)
    }
  }, [])

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const formatted = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: !use24HourClock
      }).toUpperCase()
      setTime(formatted)
    }
    updateTime()
    let clockInterval
    if (isAppActive) {
      clockInterval = setInterval(updateTime, PowerSaveManager.getPollingInterval('clockPollMs'))
    }
    return () => { if (clockInterval) clearInterval(clockInterval) }
  }, [use24HourClock, isAppActive])

  useEffect(() => {
    if (expanded) {
      getSystemStats().then(stats => {
        if (stats) setSysStats(stats)
      }).catch(() => {})
    }
  }, [expanded])

  const startCollapseTimer = useCallback(() => {
    if (autoExpand) return // Handled by auto-expand effect
    if (collapseTimer.current) clearTimeout(collapseTimer.current)
    const timeout = (expandedTab === 'zero_screen' || expandedTab === 'notif_log') ? 25000 : 8000
    collapseTimer.current = setTimeout(() => setExpanded(false), timeout)
  }, [autoExpand, expandedTab])

  useEffect(() => {
    if (!expanded) return
    startCollapseTimer()
    return () => { if (collapseTimer.current) clearTimeout(collapseTimer.current) }
  }, [expanded, startCollapseTimer])

  useEffect(() => {
    if (!expanded) return
    const handleClickOutside = (e) => {
      if (islandRef.current && !islandRef.current.contains(e.target)) {
        setExpanded(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [expanded])

  const handleToggle = useCallback(() => {
    setExpanded(prev => !prev)
    setAutoExpand(false)
  }, [])

  const touchStartRef = useRef({ x: 0, y: 0, time: 0 })

  const handleTouchStart = (e) => {
    if (!expanded) return
    e.stopPropagation()
    const t = e.touches[0]
    touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() }
  }

  const handleTouchMove = (e) => {
    if (!expanded) return
    e.stopPropagation()
  }

  const handleTouchEnd = (e) => {
    if (!expanded) return
    e.stopPropagation()
    const t = e.changedTouches[0]
    const dx = t.clientX - touchStartRef.current.x
    const dy = t.clientY - touchStartRef.current.y
    startCollapseTimer()

    const tabList = ['telemetry', 'zero_screen', 'notif_log']
    if (Math.abs(dx) > 25 && Math.abs(dx) > Math.abs(dy)) {
      const idx = tabList.indexOf(expandedTab)
      if (dx < 0 && idx < tabList.length - 1) {
        setExpandedTab(tabList[idx + 1])
        HapticFeedback.light()
      } else if (dx > 0 && idx > 0) {
        setExpandedTab(tabList[idx - 1])
        HapticFeedback.light()
      }
    } else if (dy < -35 && Math.abs(dy) > Math.abs(dx)) {
      setExpanded(false)
      HapticFeedback.light()
    }
  }

  const weatherIcon = weather ? (CONDITION_ICONS[weather.condition] || 'cloud') : 'cloud'
  const weatherTemp = weather ? `${weather.temp}°` : '--'

  // Dynamic state calculations
  const isAiActive = isListening || isSpeaking
  const isLowBattery = !battery.charging && battery.level < 20
  const isCharging = battery.charging

  let glowColor = 'rgba(0, 0, 0, 0.4)'
  let borderColor = 'rgba(255, 255, 255, 0.08)'

  const isPoppingNotif = !!activeNotification && !expanded
  const notifWidth = Math.min(typeof window !== 'undefined' ? window.innerWidth - 24 : 360, 360)
  const notifHeight = 72

  if (isPoppingNotif && activeGlow) {
    glowColor = activeGlow.glow
    borderColor = activeGlow.color
  } else if (activeGlow) {
    glowColor = activeGlow.glow
    borderColor = activeGlow.color
  } else if (isListening) {
    glowColor = 'rgba(168, 85, 247, 0.85)'
    borderColor = 'rgba(168, 85, 247, 0.9)'
  } else if (isSpeaking) {
    glowColor = 'rgba(168, 85, 247, 0.75)'
    borderColor = 'rgba(168, 85, 247, 0.8)'
  } else if (isLowBattery) {
    glowColor = 'rgba(255, 50, 50, 0.4)'
    borderColor = 'rgba(255, 50, 50, 0.3)'
  } else if (isCharging) {
    glowColor = 'rgba(50, 255, 100, 0.3)'
    borderColor = 'rgba(50, 255, 100, 0.2)'
  } else if (expanded) {
    glowColor = 'rgba(0, 229, 255, 0.15)'
  }

  // Expanded dimensions
  const expWidth = 360
  const expHeight = expandedTab === 'zero_screen' ? 310 : expandedTab === 'notif_log' ? 290 : 215

  const activeWidth = expanded ? expWidth : isPoppingNotif ? notifWidth : (isAiActive ? Math.max(collapsedWidth, 240) : collapsedWidth)
  const activeHeight = expanded ? expHeight : isPoppingNotif ? notifHeight : (isAiActive ? Math.max(collapsedHeight, 40) : collapsedHeight)

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none" style={{ paddingTop: `${computedTopMargin}px` }}>
        <div
          ref={islandRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`pointer-events-auto relative flex items-center justify-center overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${isAiActive ? 'animate-aurora-breathe' : ''}`}
        style={{
          background: isAiActive ? 'rgba(8, 12, 24, 0.94)' : 'rgba(12, 16, 28, 0.82)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          border: isAiActive ? undefined : `1px solid ${borderColor}`,
          boxShadow: isAiActive
            ? undefined
            : (isPoppingNotif && activeGlow
              ? `0 10px 40px ${activeGlow.glow}, 0 0 16px ${activeGlow.color}, inset 0 1px 0 rgba(255, 255, 255, 0.18)`
              : (expanded ? `0 10px 40px ${glowColor}, inset 0 1px 0 rgba(255, 255, 255, 0.08)` : `0 4px 12px ${glowColor}`)),
          width: activeWidth,
          height: activeHeight,
          borderRadius: expanded ? 28 : isPoppingNotif ? 24 : Math.round(activeHeight * 0.55),
        }}
      >
        {isAiActive && (
          <>
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 via-emerald-400 to-purple-500 shadow-[0_0_14px_#34d399] animate-pulse" />
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-400 via-purple-500 to-emerald-400 shadow-[0_0_14px_#a855f7] animate-pulse" />
          </>
        )}

        {/* Active Notification Banner State (Pops when notification arrives) */}
        {isPoppingNotif && (
          <div 
            onClick={() => {
              HapticFeedback.light()
              if (activeNotification.packageId) {
                launchApp(activeNotification.packageId)
              }
              dismissActive()
            }}
            className="absolute inset-0 flex items-center justify-between px-3 py-2 cursor-pointer z-20 animate-in fade-in zoom-in-95 duration-200 select-none"
          >
            {/* Top accent glow line in app color */}
            <div 
              className="absolute top-0 left-0 right-0 h-[2px] animate-pulse" 
              style={{ backgroundColor: activeNotification.color, boxShadow: `0 0 14px ${activeNotification.color}` }}
            />

            <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-1.5">
              {/* App Icon / Badge */}
              <div 
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-md transition-transform active:scale-95"
                style={{
                  backgroundColor: `${activeNotification.color}22`,
                  borderColor: `${activeNotification.color}66`,
                  color: activeNotification.color
                }}
              >
                <span className="material-symbols-outlined text-lg">{activeNotification.icon || 'notifications'}</span>
              </div>

              {/* Sender & Text */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-1.5 leading-tight">
                  <span 
                    className="text-[9.5px] font-bold uppercase tracking-wider truncate"
                    style={{ color: activeNotification.color }}
                  >
                    {activeNotification.appName}
                  </span>
                  <span className="text-[7.5px] text-white/40">•</span>
                  <span className="text-[10px] font-semibold text-white/95 truncate">
                    {activeNotification.title}
                  </span>
                </div>
                <p className="text-[10px] text-white/80 truncate font-sans mt-0.5 leading-normal">
                  {activeNotification.text}
                </p>
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[8px] font-mono text-white/40 pr-0.5">{activeNotification.time}</span>
              <button 
                onClick={(e) => { e.stopPropagation(); HapticFeedback.selection(); dismissActive() }}
                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                title="Dismiss"
              >
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
            </div>
          </div>
        )}

        {/* Collapsed State */}
        <div 
          onClick={handleToggle}
          className={`absolute inset-0 flex items-center justify-center cursor-pointer transition-all ${
            expanded || isPoppingNotif ? 'opacity-0 scale-95 duration-200 pointer-events-none' : 'opacity-100 scale-100 duration-300 delay-200'
          }`}
          style={{ pointerEvents: expanded || isPoppingNotif ? 'none' : 'auto' }}
        >
          <div className="px-3 flex items-center justify-between" style={{ width: `${activeWidth}px`, height: `${activeHeight}px` }}>
            {autoExpand ? (
              <div className="flex items-center gap-2 w-full justify-center">
                <span className="material-symbols-outlined text-primary-fixed-dim animate-bounce" style={{ fontSize: 13 }}>notifications</span>
                <span className="font-mono-data text-[10px] text-primary-fixed-dim font-bold tracking-widest">{totalUnread} NEW</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary-fixed-dim" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>fingerprint</span>
                  <span className="font-mono-data text-[10px] text-primary-fixed-dim font-bold tracking-wider">{time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-on-surface-variant/50" style={{ fontSize: 11 }}>{weatherIcon}</span>
                    <span className="font-mono-data text-[9px] text-on-surface-variant/50">{weatherTemp}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <span className={`material-symbols-outlined ${isLowBattery ? 'text-error animate-pulse' : isCharging ? 'text-green-400' : 'text-on-surface-variant/50'}`} style={{ fontSize: 11 }}>
                      {battery.charging ? 'battery_charging_full' : 'battery_full'}
                    </span>
                    <span className={`font-mono-data text-[9px] ${isLowBattery ? 'text-error' : isCharging ? 'text-green-400' : 'text-on-surface-variant/50'}`}>{battery.level}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Expanded State */}
        <div 
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`absolute inset-0 flex items-center justify-center transition-all ${
            expanded ? 'opacity-100 scale-100 duration-300 delay-150' : 'opacity-0 scale-95 duration-150 pointer-events-none'
          }`}
        >
          <div className="w-[360px] h-full p-3.5 flex flex-col justify-between overflow-hidden">
            {/* Top Row: Mode Switcher & Time */}
            <div className="flex items-center justify-between mb-2 shrink-0">
              <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/10">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setExpandedTab('telemetry'); HapticFeedback.light() }}
                  className={`px-2 py-0.5 rounded font-mono-data text-[8.5px] font-bold tracking-wider transition-colors ${
                    expandedTab === 'telemetry'
                      ? 'bg-primary-fixed-dim/30 text-primary-fixed-dim border border-primary-fixed-dim/40 shadow-[0_0_8px_rgba(0,242,255,0.3)]'
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  SYS TELEMETRY
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setExpandedTab('zero_screen'); HapticFeedback.light() }}
                  className={`px-2 py-0.5 rounded font-mono-data text-[8.5px] font-bold tracking-wider transition-colors flex items-center gap-1 ${
                    expandedTab === 'zero_screen'
                      ? 'bg-[#ff007f]/30 text-[#ff007f] border border-[#ff007f]/40 shadow-[0_0_10px_rgba(255,0,127,0.3)]'
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff007f] animate-pulse" />
                  ZERO SCREEN
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setExpandedTab('notif_log'); HapticFeedback.light() }}
                  className={`px-2 py-0.5 rounded font-mono-data text-[8.5px] font-bold tracking-wider transition-colors flex items-center gap-1 ${
                    expandedTab === 'notif_log'
                      ? 'bg-amber-500/30 text-amber-300 border border-amber-400/50 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  <span className="material-symbols-outlined text-[10px]">mark_email_unread</span>
                  ARCHIVE ({history.length})
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setExpanded(false); HapticFeedback.light() }}
                  className="p-0.5 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-[13px]">expand_less</span>
                </button>
                <span className="font-mono-data text-[11px] text-primary-fixed-dim font-bold tracking-wider">{time}</span>
              </div>
            </div>

            {/* Sliding Carousel of Tabs */}
            <div className="flex-1 w-full overflow-hidden relative min-h-0" onClick={(e) => e.stopPropagation()}>
              <div 
                className="flex w-[300%] h-full transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{ 
                  transform: expandedTab === 'zero_screen' 
                    ? 'translateX(-33.333%)' 
                    : expandedTab === 'notif_log' 
                      ? 'translateX(-66.666%)' 
                      : 'translateX(0%)' 
                }}
              >
                <div className="w-1/3 h-full pr-2 flex flex-col justify-between">
                  <CondensedTelemetry
                    weather={weather}
                    weatherIcon={weatherIcon}
                    weatherTemp={weatherTemp}
                    battery={battery}
                    isLowBattery={isLowBattery}
                    isCharging={isCharging}
                    networkType={networkType}
                    sysStats={sysStats}
                    totalUnread={totalUnread}
                  />
                </div>
                <div className="w-1/3 h-full px-2">
                  <CondensedZeroScreen onNavigate={onNavigate} onClose={() => setExpanded(false)} />
                </div>
                <div className="w-1/3 h-full pl-2">
                  <CondensedNotifLog onClose={() => setExpanded(false)} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
