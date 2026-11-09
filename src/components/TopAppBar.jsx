import { useState, useEffect, useCallback, useRef } from 'react'
import PowerSaveManager from '../utils/PowerSaveManager'
import { fetchCurrentWeather } from '../utils/weather'
import { useAssistantStore } from '../stores/assistantStore'
import useBadgeStore from '../stores/badgeStore'
import { getSystemStats, launchApp } from './LauncherPlugin'
import { useThemeStore } from '../stores/themeStore'
import { useNotificationStore } from '../stores/notificationStore'
import CondensedZeroScreen from './CondensedZeroScreen'
import CondensedTelemetry from './CondensedTelemetry'
import CondensedNotifLog from './CondensedNotifLog'
import HapticFeedback from '../utils/HapticFeedback'

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

const PROFILE_PRESETS = {
  AUTO: { baseWidth: 220, baseHeight: 36, topMargin: 8 },
  PIXEL: { baseWidth: 224, baseHeight: 38, topMargin: 8 },
  GALAXY: { baseWidth: 204, baseHeight: 34, topMargin: 6 },
  PILL: { baseWidth: 240, baseHeight: 36, topMargin: 8 },
  NOTCH: { baseWidth: 228, baseHeight: 42, topMargin: 4 },
  CUSTOM: { baseWidth: 215, baseHeight: 36, topMargin: 8 }
}

export default function TopAppBar({ title: _title = "IRIS-SYSTEM-OS", activePage, use24HourClock = true, isAppActive = true, powerSaveMode: _powerSaveMode, onNavigate }) {
  const [time, setTime] = useState("")
  const [battery, setBattery] = useState({ level: 100, charging: false })
  const [networkType, setNetworkType] = useState('ONLINE')
  const [expanded, setExpanded] = useState(false)
  const [expandedTab, setExpandedTab] = useState('telemetry')
  const [weather, setWeather] = useState(null)
  const [sysStats, setSysStats] = useState({ memUsed: '0', memTotal: '0', cpuTemp: 0 })
  const [degradedCount, setDegradedCount] = useState(() => window.__irisDegradedCount || 0)

  const collapseTimer = useRef(null)
  const islandRef = useRef(null)

  useEffect(() => {
    setExpanded(false)
  }, [activePage])

  const { isListening, isSpeaking } = useAssistantStore()
  const { totalUnread } = useBadgeStore()
  const { islandProfile, islandWidthScale, islandHeightScale, islandTopMargin, notifPopupsEnabled } = useThemeStore()
  const { activeNotification, activeGlow, dismissActive, history } = useNotificationStore()

  const preset = PROFILE_PRESETS[islandProfile] || PROFILE_PRESETS.AUTO
  const collapsedWidth = Math.round(preset.baseWidth * (islandWidthScale / 100))
  const collapsedHeight = Math.round(preset.baseHeight * (islandHeightScale / 100))
  const computedTopMargin = islandProfile === 'CUSTOM' ? islandTopMargin : Math.max(0, preset.topMargin + (islandTopMargin - 8))

  useEffect(() => {
    const handlePermSummary = (e) => {
      if (e.detail && typeof e.detail.deniedCount === 'number') {
        setDegradedCount(e.detail.deniedCount)
      }
    }
    window.addEventListener('iris:permission-summary', handlePermSummary)
    return () => window.removeEventListener('iris:permission-summary', handlePermSummary)
  }, [])

  useEffect(() => {
    if (!isAppActive) return
    let lastFetch = 0
    const pollMs = PowerSaveManager.getPollingInterval('weatherPollMs')
    const fetchWeather = async () => {
      if (document.hidden) return
      lastFetch = Date.now()
      const data = await fetchCurrentWeather()
      if (data) setWeather(data)
    }
    fetchWeather()
    const interval = setInterval(fetchWeather, pollMs)
    const onVisChange = () => {
      if (!document.hidden && Date.now() - lastFetch >= pollMs) {
        fetchWeather()
      }
    }
    document.addEventListener('visibilitychange', onVisChange)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisChange)
    }
  }, [isAppActive])

  useEffect(() => {
    const batListeners = []
    if (navigator.getBattery) {
      navigator.getBattery().then(bat => {
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
      if (document.hidden) return
      const now = new Date()
      const formatted = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: !use24HourClock
      }).toUpperCase()
      setTime(formatted)
    }
    updateTime()
    if (!isAppActive) return
    let clockInterval
    const msUntilNextMinute = 60000 - (Date.now() % 60000)
    const alignTimeout = setTimeout(() => {
      updateTime()
      clockInterval = setInterval(updateTime, 60000)
    }, msUntilNextMinute)
    const onVisChange = () => {
      if (!document.hidden) updateTime()
    }
    document.addEventListener('visibilitychange', onVisChange)
    return () => {
      clearTimeout(alignTimeout)
      if (clockInterval) clearInterval(clockInterval)
      document.removeEventListener('visibilitychange', onVisChange)
    }
  }, [use24HourClock, isAppActive])

  const refreshSystemStats = useCallback(() => {
    getSystemStats().then(stats => {
      if (stats) setSysStats(stats)
    }).catch(() => { })
  }, [])

  useEffect(() => {
    refreshSystemStats()
  }, [refreshSystemStats])

  useEffect(() => {
    if (!expanded) return
    const timer = setTimeout(refreshSystemStats, 240)
    return () => clearTimeout(timer)
  }, [expanded, refreshSystemStats])

  const startCollapseTimer = useCallback(() => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current)
    const timeout = (expandedTab === 'zero_screen' || expandedTab === 'notif_log') ? 30000 : 10000
    collapseTimer.current = setTimeout(() => setExpanded(false), timeout)
  }, [expandedTab])

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
  }, [])

  const touchStartRef = useRef({ x: 0, y: 0, time: 0 })

  const handleTouchStart = (e) => {
    e.stopPropagation()
    const t = e.touches[0]
    touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() }
  }

  const handleTouchMove = (e) => {
    e.stopPropagation()
  }

  const handleTouchEnd = (e) => {
    e.stopPropagation()
    const t = e.changedTouches ? e.changedTouches[0] : (e.touches ? e.touches[0] : null)
    if (!t) return

    const dx = t.clientX - touchStartRef.current.x
    const dy = t.clientY - touchStartRef.current.y
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)
    const tabList = ['telemetry', 'zero_screen', 'notif_log']

    if (expanded) {
      startCollapseTimer()
      // Horizontal swipe to navigate tabs vice-versa in both directions with circular wrap-around
      if (absDx > 28 && absDx > absDy * 1.2) {
        const idx = tabList.indexOf(expandedTab)
        if (dx < 0) {
          // Swipe left -> advance forward: telemetry -> zero_screen -> notif_log -> telemetry
          const nextIdx = (idx + 1) % tabList.length
          setExpandedTab(tabList[nextIdx])
          HapticFeedback.light()
        } else {
          // Swipe right -> advance backward: notif_log -> zero_screen -> telemetry -> notif_log
          const prevIdx = (idx - 1 + tabList.length) % tabList.length
          setExpandedTab(tabList[prevIdx])
          HapticFeedback.light()
        }
      } else if (dy < -42 && absDy > absDx * 1.3 && !e.target?.closest?.('[data-notif-scroll]')) {
        setExpanded(false)
        HapticFeedback.light()
      }
    } else {
      // Collapsed notch: swipe gestures
      if (absDx > 25 && absDx > absDy * 1.2) {
        if (dx < 0) {
          setExpandedTab(history.length > 0 ? 'notif_log' : 'zero_screen')
        } else {
          setExpandedTab('telemetry')
        }
        setExpanded(true)
        HapticFeedback.light()
      } else if (dy > 25 && absDy > absDx * 1.2) {
        setExpanded(true)
        HapticFeedback.light()
      }
    }
  }

  const weatherIcon = weather ? (CONDITION_ICONS[weather.condition] || 'cloud') : 'cloud'
  const weatherTemp = weather ? `${weather.temp}°` : '--'

  const isAiActive = isListening || isSpeaking
  const isLowBattery = !battery.charging && battery.level < 20
  const isCharging = battery.charging

  let _glowColor = 'rgba(0, 0, 0, 0.4)'
  let borderColor = 'rgba(255, 255, 255, 0.08)'

  const isPoppingNotif = !!activeNotification && !expanded && notifPopupsEnabled
  const notifWidth = Math.min(typeof window !== 'undefined' ? window.innerWidth - 24 : 356, 356)
  // Height accounts for the top 30px camera punch-hole bridge + 62px unobstructed notification bay below the hole
  const notifHeight = 94

  if (isPoppingNotif && activeGlow) {
    _glowColor = activeGlow.glow
    borderColor = activeGlow.color
  } else if (activeGlow) {
    _glowColor = activeGlow.glow
    borderColor = activeGlow.color
  } else if (isListening) {
    _glowColor = 'rgba(168, 85, 247, 0.85)'
    borderColor = 'rgba(168, 85, 247, 0.9)'
  } else if (isSpeaking) {
    _glowColor = 'rgba(168, 85, 247, 0.75)'
    borderColor = 'rgba(168, 85, 247, 0.8)'
  } else if (isLowBattery) {
    _glowColor = 'rgba(255, 50, 50, 0.4)'
    borderColor = 'rgba(255, 50, 50, 0.3)'
  } else if (isCharging) {
    _glowColor = 'rgba(50, 255, 100, 0.3)'
    borderColor = 'rgba(50, 255, 100, 0.2)'
  } else if (expanded) {
    _glowColor = 'rgba(0, 229, 255, 0.15)'
  }

  const expWidth = 360
  const expHeight = expandedTab === 'zero_screen' ? 330 : expandedTab === 'notif_log' ? 315 : 240

  const activeWidth = expanded ? expWidth : isPoppingNotif ? notifWidth : (isAiActive ? Math.max(collapsedWidth, 240) : collapsedWidth)
  const activeHeight = expanded ? expHeight : isPoppingNotif ? notifHeight : (isAiActive ? Math.max(collapsedHeight, 40) : collapsedHeight)

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none" style={{ paddingTop: `${computedTopMargin}px` }}>
      <div
        ref={islandRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`pointer-events-auto relative flex items-center justify-center overflow-hidden island-morph ${
          !expanded && !isPoppingNotif ? 'is-collapsed' : ''
        } ${isAiActive ? 'animate-aurora-breathe' : ''}`}
        style={{
          background: isAiActive ? 'rgba(8, 12, 24, 0.98)' : 'rgba(6, 9, 18, 0.97)',
          border: isAiActive ? undefined : `1px solid ${borderColor}`,
          boxShadow: isAiActive
            ? undefined
            : isPoppingNotif && activeGlow
              ? `0 10px 28px ${activeGlow.glow}`
              : expanded
                ? '0 12px 36px rgba(0, 0, 0, 0.65)'
                : '0 4px 14px rgba(0, 0, 0, 0.45)',
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

        {/* Active Notification Banner State — Split around top-center camera punch-hole */}
        <div
          onClick={() => {
            HapticFeedback.light()
            if (activeNotification?.packageId) {
              launchApp(activeNotification.packageId)
            }
            dismissActive()
          }}
          className={`absolute inset-0 flex flex-col justify-between px-3.5 pt-1.5 pb-2.5 cursor-pointer z-20 select-none island-content-layer ${
            isPoppingNotif
              ? 'opacity-100 scale-100 pointer-events-auto'
              : 'opacity-0 scale-95 pointer-events-none'
          }`}
        >
          {activeNotification && (
            <>
              {/* Top Sensor Bridge: Left & Right wings hug the center 48px camera punch-hole */}
              <div className="flex items-center justify-between h-[26px] shrink-0">
                {/* Left of Punch-Hole: App Badge & Name */}
                <div className="flex items-center gap-1.5 flex-1 min-w-0 pr-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0 animate-pulse"
                    style={{ backgroundColor: activeNotification.color, boxShadow: `0 0 8px ${activeNotification.color}` }}
                  />
                  <span
                    className="text-[9px] font-bold uppercase tracking-widest truncate font-mono-data"
                    style={{ color: activeNotification.color }}
                  >
                    {activeNotification.appName}
                  </span>
                </div>

                {/* Center 48px Camera Cutout Cradle (Keeps text clear of physical punch-hole lens) */}
                <div className="w-12 h-full shrink-0 flex items-end justify-center pb-0.5 pointer-events-none">
                  <div
                    className="w-6 h-[2px] rounded-full opacity-60"
                    style={{ backgroundColor: activeNotification.color, boxShadow: `0 0 6px ${activeNotification.color}` }}
                  />
                </div>

                {/* Right of Punch-Hole: Time + Quick Archive & Close Controls */}
                <div className="flex items-center justify-end gap-1.5 flex-1 min-w-0 pl-2">
                  <span className="text-[8.5px] font-mono-data text-white/45">{activeNotification.time}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      HapticFeedback.light()
                      dismissActive()
                      setExpandedTab('notif_log')
                      setExpanded(true)
                    }}
                    className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-amber-300 transition-colors"
                    title="Open Archive"
                  >
                    <span className="material-symbols-outlined text-[11px]">history_edu</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); HapticFeedback.selection(); dismissActive() }}
                    className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                    title="Dismiss"
                  >
                    <span className="material-symbols-outlined text-[11px]">close</span>
                  </button>
                </div>
              </div>

              {/* Bottom Unobstructed Message Bay (Below the physical camera hole) */}
              <div className="flex items-center gap-2.5 pt-1 border-t border-white/[0.06] flex-1 min-h-0">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
                  style={{
                    backgroundColor: `${activeNotification.color}22`,
                    borderColor: `${activeNotification.color}66`,
                    color: activeNotification.color
                  }}
                >
                  <span className="material-symbols-outlined text-lg">{activeNotification.icon || 'notifications'}</span>
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <span className="text-[10.5px] font-bold text-white/95 truncate leading-tight">
                    {activeNotification.title}
                  </span>
                  <p className="text-[10px] text-white/80 line-clamp-2 font-sans mt-0.5 leading-snug">
                    {activeNotification.text}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Collapsed State — Left & Right wings flank the center camera punch-hole */}
        <div
          onClick={handleToggle}
          className={`absolute inset-0 flex items-center justify-center cursor-pointer island-content-layer ${
            !expanded && !isPoppingNotif
              ? 'opacity-100 scale-100 pointer-events-auto'
              : 'opacity-0 scale-95 pointer-events-none'
          }`}
        >
            <div className="px-3 flex items-center justify-between shrink-0" style={{ width: `${collapsedWidth}px`, height: `${collapsedHeight}px` }}>
              <div
                className="flex items-center gap-1.5 flex-1 min-w-0"
                onClick={(e) => { e.stopPropagation(); setExpandedTab('telemetry'); setExpanded(true); HapticFeedback.light() }}
              >
                <span className="material-symbols-outlined text-primary-fixed-dim shrink-0" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>fingerprint</span>
                <span className="font-mono-data text-[10px] text-primary-fixed-dim font-bold tracking-wider truncate">{time}</span>
              </div>

              {/* Center 44px reserved gap for the physical punch-hole camera */}
              <div className="w-11 shrink-0" />

              <div className="flex items-center justify-end gap-1.5 flex-1 min-w-0">
                {history.length > 0 && (
                  <div
                    className="flex items-center gap-0.5 text-amber-400/90 hover:text-amber-300 transition-colors cursor-pointer"
                    title={`${history.length} archived messages`}
                    onClick={(e) => { e.stopPropagation(); setExpandedTab('notif_log'); setExpanded(true); HapticFeedback.light() }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 11 }}>mark_email_unread</span>
                    <span className="font-mono-data text-[8.5px] font-bold">{history.length}</span>
                  </div>
                )}
                <div
                  className="flex items-center gap-0.5 cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); setExpandedTab('zero_screen'); setExpanded(true); HapticFeedback.light() }}
                >
                  <span className="material-symbols-outlined text-on-surface-variant/50" style={{ fontSize: 11 }}>{weatherIcon}</span>
                  <span className="font-mono-data text-[9px] text-on-surface-variant/50">{weatherTemp}</span>
                </div>
                <div
                  className="flex items-center gap-0.5"
                  onClick={(e) => { e.stopPropagation(); setExpandedTab('telemetry'); setExpanded(true); HapticFeedback.light() }}
                >
                  <span className={`material-symbols-outlined ${isLowBattery ? 'text-error animate-pulse' : isCharging ? 'text-green-400' : 'text-on-surface-variant/50'}`} style={{ fontSize: 11 }}>
                    {battery.charging ? 'battery_charging_full' : 'battery_full'}
                  </span>
                  <span className={`font-mono-data text-[9px] ${isLowBattery ? 'text-error' : isCharging ? 'text-green-400' : 'text-on-surface-variant/50'}`}>{battery.level}</span>
                </div>
              </div>
            </div>
          </div>

        {/* Expanded State — Top status bridge flanks camera hole; tabs & content sit cleanly below */}
        {expanded && (
          <div className="absolute inset-0 flex items-center justify-center island-content-layer opacity-100 scale-100">
            <div className="w-[360px] shrink-0 px-3.5 pt-1.5 pb-3.5 flex flex-col justify-between overflow-hidden" style={{ height: `${expHeight}px` }}>
              {/* Row 1: Camera-Safe Top Bridge (Left & Right of center punch-hole) */}
              <div className="flex items-center justify-between h-[26px] shrink-0">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span className="material-symbols-outlined text-primary-fixed-dim text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>fingerprint</span>
                  <span className="font-mono-data text-[10px] text-primary-fixed-dim font-bold tracking-wider">{time}</span>
                  {degradedCount > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpanded(false)
                        HapticFeedback.light()
                        window.dispatchEvent(new CustomEvent('iris:open-permission-modal'))
                      }}
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30 transition-colors"
                      title="View permission status"
                    >
                      <span className="material-symbols-outlined text-[10px]">warning</span>
                      <span className="font-mono-data text-[8px] font-bold">{degradedCount}</span>
                    </button>
                  )}
                </div>

                {/* Center 48px Camera Cutout Cradle */}
                <div className="w-12 h-full shrink-0" />

                <div className="flex items-center justify-end gap-2 flex-1 min-w-0">
                  <div className="flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-on-surface-variant/60 text-xs">{weatherIcon}</span>
                    <span className="font-mono-data text-[9px] text-on-surface-variant/60">{weatherTemp}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <span className={`material-symbols-outlined text-xs ${isLowBattery ? 'text-error' : isCharging ? 'text-green-400' : 'text-on-surface-variant/60'}`}>
                      {battery.charging ? 'battery_charging_full' : 'battery_full'}
                    </span>
                    <span className="font-mono-data text-[9px] text-on-surface-variant/60">{battery.level}%</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setExpanded(false); HapticFeedback.light() }}
                    className="p-0.5 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">expand_less</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Mode Switcher Tabs (Positioned below the camera punch-hole so nothing is blocked) */}
              <div className="grid grid-cols-3 gap-1 bg-black/50 p-1 rounded-xl border border-white/10 my-1.5 shrink-0">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setExpandedTab('telemetry'); HapticFeedback.light() }}
                  className={`py-1 px-1.5 rounded-lg font-mono-data text-[8.5px] font-bold tracking-wider transition-colors truncate ${expandedTab === 'telemetry'
                    ? 'bg-primary-fixed-dim/30 text-primary-fixed-dim border border-primary-fixed-dim/40 shadow-[0_0_8px_rgba(0,242,255,0.25)]'
                    : 'text-white/45 hover:text-white/75'
                    }`}
                >
                  SYS TELEMETRY
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setExpandedTab('zero_screen'); HapticFeedback.light() }}
                  className={`py-1 px-1.5 rounded-lg font-mono-data text-[8.5px] font-bold tracking-wider transition-colors flex items-center justify-center gap-1 truncate ${expandedTab === 'zero_screen'
                    ? 'bg-[#ff007f]/30 text-[#ff007f] border border-[#ff007f]/40 shadow-[0_0_10px_rgba(255,0,127,0.25)]'
                    : 'text-white/45 hover:text-white/75'
                    }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff007f] animate-pulse shrink-0" />
                  ZERO SCREEN
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setExpandedTab('notif_log'); HapticFeedback.light() }}
                  className={`py-1 px-1.5 rounded-lg font-mono-data text-[8.5px] font-bold tracking-wider transition-colors flex items-center justify-center gap-1 truncate ${expandedTab === 'notif_log'
                    ? 'bg-amber-500/30 text-amber-300 border border-amber-400/50 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                    : 'text-white/45 hover:text-white/75'
                    }`}
                >
                  <span className="material-symbols-outlined text-[10px] shrink-0">mark_email_unread</span>
                  ARCHIVE ({history.length})
                </button>
              </div>

              {/* Active Tab View */}
              <div className="flex-1 w-full overflow-hidden relative min-h-0" onClick={(e) => e.stopPropagation()}>
                {expandedTab === 'telemetry' && (
                  <div className="w-full h-full flex flex-col justify-between">
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
                      onRefreshStats={refreshSystemStats}
                    />
                  </div>
                )}
                {expandedTab === 'zero_screen' && (
                  <div className="w-full h-full">
                    <CondensedZeroScreen onNavigate={onNavigate} onClose={() => setExpanded(false)} />
                  </div>
                )}
                {expandedTab === 'notif_log' && (
                  <div className="w-full h-full">
                    <CondensedNotifLog onClose={() => setExpanded(false)} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
