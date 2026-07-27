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

export default function TopAppBar({ title = "IRIS-SYSTEM-OS", use24HourClock = true, isAppActive = true, powerSaveMode }) {
  const [time, setTime] = useState("")
  const [battery, setBattery] = useState({ level: 100, charging: false })
  const [networkType, setNetworkType] = useState('ONLINE')
  const [expanded, setExpanded] = useState(false)
  const [weather, setWeather] = useState(null)
  const [sysStats, setSysStats] = useState({ memUsed: '0', memTotal: '0', cpuTemp: 0 })
  
  const collapseTimer = useRef(null)
  const islandRef = useRef(null)

  const { isListening, isSpeaking } = useAssistantStore()
  const { totalUnread } = useBadgeStore()
  
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
    collapseTimer.current = setTimeout(() => setExpanded(false), 5000)
  }, [autoExpand])

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

  const weatherIcon = weather ? (CONDITION_ICONS[weather.condition] || 'cloud') : 'cloud'
  const weatherTemp = weather ? `${weather.temp}°` : '--'

  // Dynamic state calculations
  const isAiActive = isListening || isSpeaking
  const isLowBattery = !battery.charging && battery.level < 20
  const isCharging = battery.charging

  let glowColor = 'rgba(0, 0, 0, 0.4)'
  let borderColor = 'rgba(255, 255, 255, 0.08)'
  if (isAiActive) {
    glowColor = 'rgba(0, 242, 255, 0.4)'
    borderColor = 'rgba(0, 242, 255, 0.4)'
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
  const expHeight = 160

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-2 pointer-events-none">
      <div
        ref={islandRef}
        onClick={handleToggle}
        className="pointer-events-auto relative flex items-center justify-center overflow-hidden cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]"
        style={{
          background: 'rgba(12, 16, 28, 0.82)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          border: `1px solid ${borderColor}`,
          boxShadow: expanded
            ? `0 10px 40px ${glowColor}, inset 0 1px 0 rgba(255, 255, 255, 0.08)`
            : `0 4px 12px ${glowColor}`,
          width: expanded ? expWidth : 200,
          height: expanded ? expHeight : 32,
          borderRadius: expanded ? 28 : 20,
        }}
      >
        {/* Collapsed State */}
        <div 
          className={`absolute inset-0 flex items-center justify-center transition-all ${
            expanded ? 'opacity-0 scale-95 duration-200' : 'opacity-100 scale-100 duration-300 delay-200'
          }`}
          style={{ pointerEvents: expanded ? 'none' : 'auto' }}
        >
          <div className="w-[200px] h-[32px] px-3 flex items-center justify-between">
            {isListening ? (
              <div className="flex items-center gap-2 w-full justify-center">
                <span className="material-symbols-outlined text-primary-fixed-dim animate-pulse" style={{ fontSize: 13 }}>mic</span>
                <span className="font-mono-data text-[10px] text-primary-fixed-dim font-bold tracking-widest animate-pulse">LISTENING...</span>
              </div>
            ) : isSpeaking ? (
              <div className="flex items-center gap-2 w-full justify-center">
                <span className="material-symbols-outlined text-primary-fixed-dim animate-spin" style={{ fontSize: 13 }}>graphic_eq</span>
                <span className="font-mono-data text-[10px] text-primary-fixed-dim font-bold tracking-widest animate-pulse">PROCESSING</span>
              </div>
            ) : autoExpand ? (
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
          className={`absolute inset-0 flex items-center justify-center transition-all ${
            expanded ? 'opacity-100 scale-100 duration-300 delay-150' : 'opacity-0 scale-95 duration-150 pointer-events-none'
          }`}
        >
          <div className="w-[360px] h-full p-4 flex flex-col justify-between">
            {/* Top Row: Title & Close */}
            <div className="flex items-center justify-between mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className={`material-symbols-outlined ${isAiActive ? 'text-primary animate-pulse' : 'text-primary-fixed-dim'}`} style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>fingerprint</span>
                <span className="font-label-caps text-[10px] tracking-[0.15em] text-primary-fixed-dim truncate">
                  {isListening ? 'AURAL RECEPTOR ACTIVE' : isSpeaking ? 'SYNTHESIZING RESPONSE' : autoExpand ? 'NEW TRANSMISSION' : title}
                </span>
              </div>
              <span className="font-mono-data text-[12px] text-primary-fixed-dim font-bold tracking-wider">{time}</span>
            </div>

            {/* Middle Row: Metrics */}
            <div className="flex-1 grid grid-cols-3 gap-2">
              <div className="glass-surface border border-white/5 rounded-lg p-2 flex flex-col justify-center items-center">
                <span className="material-symbols-outlined text-on-surface-variant/70 mb-1" style={{ fontSize: 16 }}>{weatherIcon}</span>
                <span className="font-mono-data text-[10px] text-primary-fixed-dim/90 font-bold">{weatherTemp}</span>
                <span className="font-label-caps text-[7px] tracking-wider text-on-surface-variant/50 mt-0.5">{weather ? weather.condition.replace(/_/g, ' ') : 'UNKNOWN'}</span>
              </div>

              <div className="glass-surface border border-white/5 rounded-lg p-2 flex flex-col justify-center items-center">
                <span className={`material-symbols-outlined ${isLowBattery ? 'text-error animate-pulse' : isCharging ? 'text-green-400' : 'text-on-surface-variant/70'} mb-1`} style={{ fontSize: 16 }}>
                  {battery.charging ? 'battery_charging_full' : 'battery_full'}
                </span>
                <span className={`font-mono-data text-[10px] font-bold ${isLowBattery ? 'text-error' : isCharging ? 'text-green-400' : 'text-primary-fixed-dim/90'}`}>{battery.level}%</span>
                <span className={`font-label-caps text-[7px] tracking-wider mt-0.5 ${isLowBattery ? 'text-error' : isCharging ? 'text-green-400' : 'text-on-surface-variant/50'}`}>
                  {battery.charging ? 'AC POWER' : isLowBattery ? 'CRITICAL' : 'BATTERY'}
                </span>
              </div>

              <div className="glass-surface border border-white/5 rounded-lg p-2 flex flex-col justify-center items-center">
                <span className="material-symbols-outlined text-on-surface-variant/70 mb-1" style={{ fontSize: 16 }}>
                  {networkType === 'OFFLINE' ? 'wifi_off' : 'wifi'}
                </span>
                <span className="font-mono-data text-[10px] text-primary-fixed-dim/90 font-bold">{networkType}</span>
                <span className="font-label-caps text-[7px] tracking-wider text-on-surface-variant/50 mt-0.5">NETWORK</span>
              </div>
            </div>

            {/* Bottom Row: System Stats */}
            <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between shrink-0">
               <div className="flex items-center gap-3">
                 <div className="flex flex-col">
                   <span className="font-label-caps text-[7px] text-on-surface-variant/50 leading-none mb-0.5">SYS_MEM</span>
                   <span className="font-mono-data text-[9px] text-primary-fixed-dim/80">{sysStats.memUsed}G / {sysStats.memTotal}G</span>
                 </div>
                 <div className="flex flex-col">
                   <span className="font-label-caps text-[7px] text-on-surface-variant/50 leading-none mb-0.5">CPU_TEMP</span>
                   <span className="font-mono-data text-[9px] text-primary-fixed-dim/80">{sysStats.cpuTemp ? parseFloat(sysStats.cpuTemp).toFixed(1) : '--'}°C</span>
                 </div>
               </div>
               {totalUnread > 0 && (
                 <div className="flex flex-col items-end">
                   <span className="font-label-caps text-[7px] text-error leading-none mb-0.5 animate-pulse">ALERTS</span>
                   <span className="font-mono-data text-[9px] text-error font-bold">{totalUnread} PENDING</span>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
