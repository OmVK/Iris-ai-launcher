import { useState, useEffect, useCallback, useRef } from 'react'
import { launchApp } from '../components/LauncherPlugin'
import { routeAppClick } from '../utils/appClickRouter'

const STORAGE_KEY = 'iris_app_usage_log'
const MAX_LOG_ENTRIES = 500
const SUGGESTION_COUNT = 4

function getTimeSlot(date = new Date()) {
  const hour = date.getHours()
  if (hour >= 5 && hour < 9) return 'early_morning'
  if (hour >= 9 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 14) return 'midday'
  if (hour >= 14 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 20) return 'evening'
  if (hour >= 20 && hour < 23) return 'night'
  return 'late_night'
}

function getDayType(date = new Date()) {
  const day = date.getDay()
  return (day === 0 || day === 6) ? 'weekend' : 'weekday'
}

function getUsageLog() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveUsageLog(log) {
  const trimmed = log.slice(-MAX_LOG_ENTRIES)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
}

export function trackAppLaunch(packageId) {
  const log = getUsageLog()
  const now = new Date()
  log.push({
    packageId,
    timestamp: now.getTime(),
    timeSlot: getTimeSlot(now),
    dayType: getDayType(now),
    hour: now.getHours(),
    dayOfWeek: now.getDay()
  })
  saveUsageLog(log)
}

function analyzePatterns(log, installedApps) {
  if (log.length < 3) return []

  const now = new Date()
  const currentTimeSlot = getTimeSlot(now)
  const currentDayType = getDayType(now)
  const currentHour = now.getHours()

  const scores = {}
  const recentCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
  const recentLog = log.filter(e => e.timestamp > recentCutoff)

  for (const entry of recentLog) {
    const pkg = entry.packageId
    if (!scores[pkg]) scores[pkg] = { timeScore: 0, recencyScore: 0, frequencyScore: 0, total: 0 }

    scores[pkg].frequencyScore += 1

    if (entry.timeSlot === currentTimeSlot) {
      scores[pkg].timeScore += 3
    }

    if (entry.dayType === currentDayType) {
      scores[pkg].timeScore += 1
    }

    const hourDiff = Math.abs(entry.hour - currentHour)
    if (hourDiff <= 1) {
      scores[pkg].timeScore += 2
    } else if (hourDiff <= 2) {
      scores[pkg].timeScore += 1
    }

    const hoursSinceUse = (Date.now() - entry.timestamp) / (1000 * 60 * 60)
    if (hoursSinceUse < 1) scores[pkg].recencyScore += 4
    else if (hoursSinceUse < 3) scores[pkg].recencyScore += 3
    else if (hoursSinceUse < 6) scores[pkg].recencyScore += 2
    else if (hoursSinceUse < 24) scores[pkg].recencyScore += 1
  }

  const appMap = {}
  for (const app of installedApps) {
    appMap[app.packageId] = app
  }

  const ranked = Object.entries(scores)
    .filter(([pkg]) => appMap[pkg])
    .map(([pkg, s]) => ({
      ...appMap[pkg],
      score: (s.timeScore * 0.4) + (s.recencyScore * 0.3) + (s.frequencyScore * 0.3)
    }))
    .sort((a, b) => b.score - a.score)

  return ranked.slice(0, SUGGESTION_COUNT)
}

export default function useAppSuggestions(installedApps, onTriggerChronoLock, onTriggerVault, onNavigate) {
  const [suggestions, setSuggestions] = useState([])
  const lastUpdateRef = useRef(0)

  const refresh = useCallback(() => {
    const now = Date.now()
    if (now - lastUpdateRef.current < 60000) return
    lastUpdateRef.current = now

    const log = getUsageLog()
    const result = analyzePatterns(log, installedApps)
    setSuggestions(result)
  }, [installedApps])

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, 120000)
    return () => clearInterval(timer)
  }, [refresh])

  const handleSuggestionClick = useCallback((app) => {
    trackAppLaunch(app.packageId)
    routeAppClick(app, { onTriggerChronoLock, onTriggerVault, onNavigate, launchApp })
  }, [onTriggerChronoLock, onTriggerVault, onNavigate])

  return { suggestions, handleSuggestionClick, trackAppLaunch }
}
