import { useState, useEffect, useCallback, useRef } from 'react'
import PowerSaveManager from '../utils/PowerSaveManager'
import { fetchCurrentWeather } from '../utils/weather'
import { useAssistantStore } from '../stores/assistantStore'
import useBadgeStore from '../stores/badgeStore'
import { getSystemStats, launchApp, getUniversalDeviceProfile, getScreenContext, injectTextToActiveInput, makeCall } from './LauncherPlugin'
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

function KineticWords({ text }) {
  if (!text) return null
  const words = String(text).trim().split(/\s+/)
  return (
    <>
      {words.map((word, idx) => {
        const cleanToken = word.replace(/[.,!?;:'"()[\]]/g, '')
        const isEntity = /^(?:[+-]?\d+(?:\.\d+)?(?:%|°[CF]?|MB|GB|KB|km|mi|kg|lbs|m|ft|s|ms|h|am|pm)?|\d{1,2}:\d{2}(?:am|pm)?|\$\d+(?:\.\d+)?)$/i.test(cleanToken)
        return (
          <span
            key={`${idx}-${word}`}
            className={`iris-kinetic-word ${isEntity ? 'text-primary-fixed-dim font-semibold' : ''}`}
          >
            {word}{idx < words.length - 1 ? '\u00A0' : ''}
          </span>
        )
      })}
    </>
  )
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

  const [aiStepBadges, setAiStepBadges] = useState([])
  const [magicPortalPills, setMagicPortalPills] = useState([])
  const [nowBarTimer, setNowBarTimer] = useState(null)
  const [nowBarRemainingSec, setNowBarRemainingSec] = useState(0)
  const [measuredAiHeight, setMeasuredAiHeight] = useState(0)
  const [autoCutoutProfile, setAutoCutoutProfile] = useState(null)
  const aiBodyRef = useRef(null)
  const collapseTimer = useRef(null)
  const islandRef = useRef(null)

  useEffect(() => {
    getUniversalDeviceProfile().then((prof) => {
      if (prof && prof.recommendedWidthDp > 150) {
        setAutoCutoutProfile(prof)
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const onNowBarTimer = (e) => {
      const endsAt = e?.detail?.endsAt
      if (endsAt && endsAt > Date.now()) {
        setNowBarTimer({ label: e.detail.label || 'Timer', endsAt })
        setNowBarRemainingSec(Math.max(1, Math.ceil((endsAt - Date.now()) / 1000)))
      } else {
        setNowBarTimer(null)
        setNowBarRemainingSec(0)
      }
    }
    window.addEventListener('iris-now-bar-timer', onNowBarTimer)
    return () => window.removeEventListener('iris-now-bar-timer', onNowBarTimer)
  }, [])

  useEffect(() => {
    if (!nowBarTimer?.endsAt) return
    const tick = () => {
      const rem = Math.max(0, Math.ceil((nowBarTimer.endsAt - Date.now()) / 1000))
      setNowBarRemainingSec(rem)
      if (rem <= 0) setNowBarTimer(null)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [nowBarTimer])

  useEffect(() => {
    setExpanded(false)
  }, [activePage])

  const { isListening, isSpeaking, isGenerating, showVoiceOverlay, activeUserTranscript, activeAiResponse } = useAssistantStore()
  const { totalUnread } = useBadgeStore()
  const { islandProfile, islandWidthScale, islandHeightScale, islandTopMargin, notifPopupsEnabled } = useThemeStore()
  const { activeNotification, activeGlow, dismissActive, history } = useNotificationStore()

  useEffect(() => {
    const onSteps = (e) => {
      if (Array.isArray(e?.detail?.steps)) {
        setAiStepBadges(e.detail.steps)
        if (e.detail.steps.length > 0) {
          HapticFeedback.light()
        }
      }
    }
    window.addEventListener('iris-agent-steps', onSteps)
    return () => window.removeEventListener('iris-agent-steps', onSteps)
  }, [])

  const preset = (islandProfile === 'AUTO' && autoCutoutProfile)
    ? {
        baseWidth: autoCutoutProfile.recommendedWidthDp || 212,
        baseHeight: autoCutoutProfile.recommendedHeightDp || 35,
        topMargin: autoCutoutProfile.recommendedTopMarginDp ?? 6,
      }
    : (PROFILE_PRESETS[islandProfile] || PROFILE_PRESETS.AUTO)
  const cameraGapPx = (islandProfile === 'AUTO' && autoCutoutProfile?.cutoutGapWidthDp)
    ? autoCutoutProfile.cutoutGapWidthDp
    : 44
  const baseCollapsedWidth = Math.round(preset.baseWidth * (islandWidthScale / 100))
  const collapsedWidth = nowBarRemainingSec > 0 ? baseCollapsedWidth + 38 : baseCollapsedWidth
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

  const isAiActive = Boolean(showVoiceOverlay || isListening || isSpeaking || isGenerating)

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
    } else if (isAiActive) {
      if (dy < -20 && absDy > absDx) {
        HapticFeedback.light()
        window.dispatchEvent(new CustomEvent('iris-notch-close'))
      } else if (dy > 25 && absDy > absDx) {
        HapticFeedback.light()
        window.dispatchEvent(new CustomEvent('iris-notch-close'))
        if (typeof onNavigate === 'function') onNavigate('assistant')
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

  const isLowBattery = !battery.charging && battery.level < 20
  const isCharging = battery.charging

  let _glowColor = 'rgba(0, 0, 0, 0.4)'
  let borderColor = 'rgba(255, 255, 255, 0.08)'

  useEffect(() => {
    if (!isAiActive) {
      setMagicPortalPills([])
      return
    }
    let cancelled = false
    getScreenContext().then((ctx) => {
      if (cancelled || !ctx?.success || !Array.isArray(ctx.texts) || ctx.texts.length === 0) return
      const joined = ctx.texts.slice(0, 18).join(' ')
      const pills = []
      const otpM = joined.match(/(?:otp|code|pin|verification|passcode)[^0-9]{0,20}\b(\d{4,8})\b/i)
      if (otpM && otpM[1]) {
        pills.push({ type: 'otp', label: `📋 Copy OTP: ${otpM[1]}`, value: otpM[1] })
      }
      const urlM = joined.match(/https?:\/\/[^\s"'<>()]+/i)
      if (urlM && urlM[0] && pills.length < 2) {
        pills.push({ type: 'url', label: '🌐 Open Link', value: urlM[0] })
      }
      const phoneM = joined.match(/(?:\+\d{1,3}[\s-]?)?(?:\(\d{2,4}\)|\d{3,4})[\s.-]?\d{3}[\s.-]?\d{4}\b/)
      if (phoneM && phoneM[0] && pills.length < 2) {
        const cleanNum = phoneM[0].replace(/[^0-9+]/g, '')
        if (cleanNum.length >= 8) {
          pills.push({ type: 'phone', label: `📞 Call ${phoneM[0].trim()}`, value: cleanNum })
        }
      }
      const addrM = joined.match(/\b\d{1,5}\s+[A-Z][a-zA-Z0-9\s]{3,24}\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr)\b/)
      if (addrM && addrM[0] && pills.length < 2) {
        pills.push({ type: 'map', label: `📍 Map: ${addrM[0].slice(0, 18)}`, value: addrM[0] })
      }
      if (!cancelled) setMagicPortalPills(pills)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [isAiActive])

  const isPoppingNotif = !!activeNotification && !expanded && notifPopupsEnabled
  const hasAiBody = Boolean(isAiActive && !expanded && !isPoppingNotif && (activeUserTranscript || activeAiResponse || aiStepBadges.length > 0 || magicPortalPills.length > 0))
  const notifWidth = Math.min(typeof window !== 'undefined' ? window.innerWidth - 24 : 356, 356)
  // Height accounts for the top 30px camera punch-hole bridge + 62px unobstructed notification bay below the hole
  const notifHeight = 94

  useEffect(() => {
    const el = aiBodyRef.current
    if (!el) return
    const updateH = () => {
      if (el) setMeasuredAiHeight(el.scrollHeight)
    }
    updateH()
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(updateH)
      ro.observe(el)
      return () => ro.disconnect()
    }
  }, [hasAiBody, activeUserTranscript, activeAiResponse, aiStepBadges.length, magicPortalPills.length])

  const aiExpandedWidth = Math.min(typeof window !== 'undefined' ? window.innerWidth - 20 : 350, 350)
  const aiExpandedHeight = (() => {
    if (!hasAiBody) return collapsedHeight + 2
    if (measuredAiHeight > 10) {
      return Math.min(188, Math.max(78, measuredAiHeight + 42))
    }
    let h = 42
    if (activeUserTranscript) h += activeAiResponse ? 22 : 36
    if (aiStepBadges.length > 0 || magicPortalPills.length > 0) h += 28
    if (activeAiResponse) {
      const lines = Math.min(4, Math.max(1, Math.ceil(activeAiResponse.length / 38)))
      h += lines * 19 + 14
    }
    return Math.min(188, Math.max(82, h))
  })()

  if (isPoppingNotif && activeGlow) {
    _glowColor = activeGlow.glow
    borderColor = activeGlow.color
  } else if (activeGlow) {
    _glowColor = activeGlow.glow
    borderColor = activeGlow.color
  } else if (isListening) {
    _glowColor = 'rgba(0, 242, 255, 0.9)'
    borderColor = 'rgba(0, 242, 255, 0.95)'
  } else if (isSpeaking) {
    _glowColor = 'rgba(168, 85, 247, 0.85)'
    borderColor = 'rgba(168, 85, 247, 0.9)'
  } else if (isGenerating) {
    _glowColor = 'rgba(16, 185, 129, 0.85)'
    borderColor = 'rgba(16, 185, 129, 0.9)'
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

  const aiWakeWidth = Math.min(316, collapsedWidth + 82)
  const aiWakeHeight = collapsedHeight + 10

  const activeWidth = expanded ? expWidth : isPoppingNotif ? notifWidth : hasAiBody ? aiExpandedWidth : (isAiActive ? aiWakeWidth : collapsedWidth)
  const activeHeight = expanded ? expHeight : isPoppingNotif ? notifHeight : hasAiBody ? aiExpandedHeight : (isAiActive ? aiWakeHeight : collapsedHeight)
  const activeRadius = expanded ? 28 : (isPoppingNotif || hasAiBody) ? 26 : Math.round(activeHeight * 0.55)

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
    prevAiActive: false,
    prevHasAiBody: false,
    prevExpanded: false,
    rafId: null,
    lastTime: 0,
  })

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
      s.prevAiActive = isAiActive
      s.prevHasAiBody = hasAiBody
      s.prevExpanded = expanded
      return
    }

    if (isAiActive && !s.prevAiActive) {
      s.vw += 640
      s.vh += 280
      s.vsx += 1.55
      s.vsy += 1.85
      s.vty += 95
      HapticFeedback.light()
    } else if (!isAiActive && s.prevAiActive) {
      s.vw -= 340
      s.vh -= 300
      s.vsx -= 1.05
      s.vsy -= 1.25
      s.vty -= 65
      HapticFeedback.selection()
    }

    if (hasAiBody && !s.prevHasAiBody) {
      s.vw += 420
      s.vh += 480
      s.vsx += 0.95
      s.vsy += 1.55
      s.vty += 85
      HapticFeedback.light()
    } else if (hasAiBody && activeHeight > s.targetH + 6) {
      s.vh += 240
      s.vsy += 0.85
      s.vty += 45
    }

    if (expanded !== s.prevExpanded) {
      s.vw += expanded ? 380 : -280
      s.vh += expanded ? 420 : -320
      s.vsx += expanded ? 0.9 : -0.8
      s.vsy += expanded ? 1.2 : -0.9
    }

    s.prevAiActive = isAiActive
    s.prevHasAiBody = hasAiBody
    s.prevExpanded = expanded
    s.targetW = activeWidth
    s.targetH = activeHeight
    s.targetR = activeRadius

    const stepSpring = (now) => {
      const el = islandRef.current
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

      const clampedW = Math.max(120, s.w)
      const clampedH = Math.max(24, s.h)
      const clampedR = Math.max(10, s.r)
      const clampedSx = Math.max(0.82, Math.min(1.22, s.sx))
      const clampedSy = Math.max(0.82, Math.min(1.25, s.sy))

      el.style.width = `${clampedW.toFixed(2)}px`
      el.style.height = `${clampedH.toFixed(2)}px`
      el.style.borderRadius = `${clampedR.toFixed(2)}px`
      el.style.transform = `translate3d(0, ${s.ty.toFixed(2)}px, 0) scale3d(${clampedSx.toFixed(4)}, ${clampedSy.toFixed(4)}, 1)`

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
  }, [activeWidth, activeHeight, activeRadius, isAiActive, hasAiBody, expanded, isPoppingNotif])

  useEffect(() => {
    const s = springStateRef.current
    return () => {
      if (s.rafId) cancelAnimationFrame(s.rafId)
    }
  }, [])

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none" style={{ paddingTop: `${computedTopMargin}px` }}>
      <div
        ref={islandRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`pointer-events-auto relative flex items-center justify-center overflow-hidden island-morph ${
          !expanded && !isPoppingNotif && !isAiActive ? 'is-collapsed' : ''
        }`}
        style={{
          background: isAiActive ? 'rgba(6, 10, 20, 0.58)' : 'rgba(6, 9, 18, 0.96)',
          backdropFilter: isAiActive ? 'blur(14px)' : 'none',
          WebkitBackdropFilter: isAiActive ? 'blur(14px)' : 'none',
          border: isAiActive ? '1px solid rgba(var(--primary-rgb), 0.7)' : `1px solid ${borderColor}`,
          boxShadow: isAiActive
            ? '0 0 16px rgba(var(--primary-rgb), 0.35), 0 8px 24px rgba(0, 0, 0, 0.45)'
            : isPoppingNotif && activeGlow
              ? `0 10px 28px ${activeGlow.glow}`
              : expanded
                ? '0 12px 36px rgba(0, 0, 0, 0.65)'
                : '0 4px 14px rgba(0, 0, 0, 0.45)',
          width: `${springStateRef.current.w}px`,
          height: `${springStateRef.current.h}px`,
          borderRadius: `${springStateRef.current.r}px`,
          transform: `translate3d(0, ${springStateRef.current.ty}px, 0) scale3d(${springStateRef.current.sx}, ${springStateRef.current.sy}, 1)`,
        }}
      >

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
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10.5px] font-bold text-white/95 truncate leading-tight">
                      {activeNotification.title}
                    </span>
                    {activeNotification.scamRisk && (
                      <span
                        className="px-2 py-0.5 rounded-full bg-amber-500/25 border border-amber-400 text-amber-300 text-[8.5px] font-mono-data font-bold tracking-wider shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.35)]"
                        title={activeNotification.scamRisk}
                      >
                        ⚠ SCAM RISK
                      </span>
                    )}
                    {activeNotification.otpCode && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          HapticFeedback.light()
                          navigator.clipboard?.writeText?.(activeNotification.otpCode)
                          dismissActive()
                        }}
                        className="px-2 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400 text-emerald-300 text-[8.5px] font-mono-data font-bold tracking-wider shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.35)] active:scale-95"
                      >
                        COPY OTP: {activeNotification.otpCode}
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-white/80 line-clamp-2 font-sans mt-0.5 leading-snug">
                    {activeNotification.text}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* AI Expanded Words Layer — Persistent layer for zero-snap liquid spring cross-fade */}
        <div
          onClick={(e) => {
            if (isAiActive) {
              e.stopPropagation()
              HapticFeedback.light()
              window.dispatchEvent(new CustomEvent('iris-notch-followup'))
            }
          }}
          className={`absolute inset-0 flex flex-col justify-between px-3.5 pt-1.5 pb-2.5 overflow-hidden select-none cursor-pointer island-content-layer ${
            !expanded && !isPoppingNotif && hasAiBody
              ? 'opacity-100 scale-100 pointer-events-auto'
              : 'opacity-0 scale-95 pointer-events-none'
          }`}
        >
          {/* Top Row around the physical center camera punch-hole (Clean Time + Weather/Battery + Dismiss) */}
          <div className="flex items-center justify-between h-[24px] shrink-0">
            <div className="flex items-center gap-1.5 flex-1 min-w-0 pr-2">
              <span className="material-symbols-outlined text-primary-fixed-dim shrink-0" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>fingerprint</span>
              <span className="font-mono-data text-[10px] text-primary-fixed-dim font-bold tracking-wider truncate">{time}</span>
            </div>

            {/* Center Camera Cutout Clearance (Auto-Adapted to Device Cutout) */}
            <div className="h-full shrink-0 pointer-events-none" style={{ width: `${cameraGapPx + 4}px` }} />

            <div className="flex items-center justify-end gap-1.5 flex-1 min-w-0 pl-2">
              <span className="material-symbols-outlined text-on-surface-variant/50" style={{ fontSize: 11 }}>{weatherIcon}</span>
              <span className="font-mono-data text-[9px] text-on-surface-variant/50">{weatherTemp}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  HapticFeedback.selection()
                  window.dispatchEvent(new CustomEvent('iris-notch-close'))
                }}
                className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                title="Close"
              >
                <span className="material-symbols-outlined text-[11px]">close</span>
              </button>
            </div>
          </div>

          {/* Lower Bay Inside the Same Single Island (Words Only) */}
          <div ref={aiBodyRef} className="flex flex-col justify-center gap-1 pt-1 border-t border-white/[0.07] text-left">
            {activeUserTranscript && (
              <p
                className={`transition-all duration-200 ${
                  activeAiResponse
                    ? 'text-[11px] font-medium text-white/50 truncate'
                    : 'text-[14.5px] font-semibold text-white line-clamp-2 leading-snug'
                }`}
              >
                <KineticWords text={activeUserTranscript} />
              </p>
            )}

            {(aiStepBadges.length > 0 || magicPortalPills.length > 0) && (
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                {aiStepBadges.map((b, idx) => (
                  <span
                    key={`step-${idx}`}
                    onClick={
                      b.undo
                        ? (e) => {
                            e.stopPropagation()
                            HapticFeedback.medium()
                            window.dispatchEvent(new CustomEvent('iris-agent-undo', { detail: { undo: b.undo } }))
                          }
                        : undefined
                    }
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-medium shrink-0 bg-white/10 border border-white/15 text-white/90 ${
                      b.undo ? 'cursor-pointer active:scale-95 hover:bg-white/20 transition-transform' : ''
                    }`}
                    title={b.undo ? 'Tap to Undo' : undefined}
                  >
                    <span>{b.ok ? '✓' : '!'}</span>
                    <span>{b.label}</span>
                  </span>
                ))}
                {magicPortalPills.map((p, idx) => (
                  <button
                    key={`portal-${idx}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      HapticFeedback.medium()
                      if (p.type === 'otp') {
                        navigator.clipboard?.writeText?.(p.value)
                        injectTextToActiveInput(p.value).catch(() => {})
                        useAssistantStore.getState().setActiveAiResponse(`Copied OTP ${p.value} to clipboard.`)
                      } else if (p.type === 'url') {
                        window.open(p.value, '_system')
                      } else if (p.type === 'phone') {
                        makeCall(p.value, false).catch(() => {})
                      } else if (p.type === 'map') {
                        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.value)}`, '_system')
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-medium shrink-0 bg-primary-fixed-dim/20 border border-primary-fixed-dim/50 text-primary-fixed-dim active:scale-95 transition-transform"
                  >
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            )}

            {activeAiResponse && (
              <div className="overflow-y-auto no-scrollbar max-h-[82px]">
                <p className="text-[13px] font-medium text-white/95 leading-snug">
                  <KineticWords text={activeAiResponse} />
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Collapsed Pill State — Persistent layer that smoothly stretches on AI wake and cross-fades when words appear */}
        <div
          onClick={(e) => {
            if (isAiActive) {
              e.stopPropagation()
              HapticFeedback.light()
              window.dispatchEvent(new CustomEvent('iris-notch-followup'))
              return
            }
            handleToggle()
          }}
          className={`absolute inset-0 flex items-center justify-center cursor-pointer island-content-layer ${
            !expanded && !isPoppingNotif && !hasAiBody
              ? 'opacity-100 scale-100 pointer-events-auto'
              : 'opacity-0 scale-95 pointer-events-none'
          }`}
        >
          <div className="w-full h-full px-3 flex items-center justify-between shrink-0">
            <div
              className="flex items-center gap-1.5 flex-1 min-w-0"
              onClick={(e) => {
                if (isAiActive) return
                e.stopPropagation()
                setExpandedTab('telemetry')
                setExpanded(true)
                HapticFeedback.light()
              }}
            >
              <span className="material-symbols-outlined text-primary-fixed-dim shrink-0" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>fingerprint</span>
              <span className="font-mono-data text-[10px] text-primary-fixed-dim font-bold tracking-wider truncate">{time}</span>
            </div>

            {/* Center reserved gap for the physical punch-hole camera (Auto-Adapted to Device Cutout) */}
            <div className="shrink-0" style={{ width: `${cameraGapPx}px` }} />

            <div className="flex items-center justify-end gap-1.5 flex-1 min-w-0">
              {nowBarRemainingSec > 0 && (
                <button
                  type="button"
                  title={`${nowBarTimer?.label || 'Timer'} — Tap to Cancel`}
                  onClick={(e) => {
                    e.stopPropagation()
                    HapticFeedback.medium()
                    window.dispatchEvent(new CustomEvent('iris-now-bar-cancel'))
                    setNowBarTimer(null)
                    setNowBarRemainingSec(0)
                  }}
                  className="px-1.5 py-0.5 rounded-full bg-primary-fixed-dim/20 border border-primary-fixed-dim/50 text-primary-fixed-dim font-mono-data text-[8.5px] font-bold tracking-wider shrink-0 active:scale-95"
                >
                  {`${String(Math.floor(nowBarRemainingSec / 60)).padStart(2, '0')}:${String(nowBarRemainingSec % 60).padStart(2, '0')}`}
                </button>
              )}
              {history.length > 0 && (
                <div
                  className="flex items-center gap-0.5 text-amber-400/90 hover:text-amber-300 transition-colors cursor-pointer"
                  title={`${history.length} archived messages`}
                  onClick={(e) => {
                    if (isAiActive) return
                    e.stopPropagation()
                    setExpandedTab('notif_log')
                    setExpanded(true)
                    HapticFeedback.light()
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 11 }}>mark_email_unread</span>
                  <span className="font-mono-data text-[8.5px] font-bold">{history.length}</span>
                </div>
              )}
              <div
                className="flex items-center gap-0.5 cursor-pointer"
                onClick={(e) => {
                  if (isAiActive) return
                  e.stopPropagation()
                  setExpandedTab('zero_screen')
                  setExpanded(true)
                  HapticFeedback.light()
                }}
              >
                <span className="material-symbols-outlined text-on-surface-variant/50" style={{ fontSize: 11 }}>{weatherIcon}</span>
                <span className="font-mono-data text-[9px] text-on-surface-variant/50">{weatherTemp}</span>
              </div>
              <div
                className="flex items-center gap-0.5"
                onClick={(e) => {
                  if (isAiActive) return
                  e.stopPropagation()
                  setExpandedTab('telemetry')
                  setExpanded(true)
                  HapticFeedback.light()
                }}
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
