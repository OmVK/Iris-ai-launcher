import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { lookupContactMultiple, makeCall, sendSMS, checkAndRequestPermission } from '../components/LauncherPlugin'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { safeEvaluate } from './safeMath'

const SEARCH_SOURCES = {
  apps: { label: 'Apps', icon: 'apps', enabled: true },
  contacts: { label: 'Contacts', icon: 'contacts', enabled: false },
  settings: { label: 'Settings', icon: 'settings', enabled: true },
  web: { label: 'Web', icon: 'language', enabled: true },
  calculator: { label: 'Calculator', icon: 'calculate', enabled: true },
  unitConversion: { label: 'Units', icon: 'straighten', enabled: true },
}

const SETTINGS_DEEP_LINKS = [
  { id: 'wifi', label: 'Wi-Fi Settings', icon: 'wifi', action: 'android.settings.WIFI_SETTINGS' },
  { id: 'bluetooth', label: 'Bluetooth Settings', icon: 'bluetooth', action: 'android.settings.BLUETOOTH_SETTINGS' },
  { id: 'display', label: 'Display Settings', icon: 'brightness_6', action: 'android.settings.DISPLAY_SETTINGS' },
  { id: 'sound', label: 'Sound Settings', icon: 'volume_up', action: 'android.settings.SOUND_SETTINGS' },
  { id: 'battery', label: 'Battery Settings', icon: 'battery_std', action: 'android.settings.BATTERY_USAGE_SETTINGS' },
  { id: 'storage', label: 'Storage Settings', icon: 'sd_storage', action: 'android.settings.INTERNAL_STORAGE_SETTINGS' },
  { id: 'apps', label: 'App Settings', icon: 'apps', action: 'android.settings.APPLICATION_SETTINGS' },
  { id: 'location', label: 'Location Settings', icon: 'location_on', action: 'android.settings.LOCATION_SOURCE_SETTINGS' },
  { id: 'security', label: 'Security Settings', icon: 'security', action: 'android.settings.SECURITY_SETTINGS' },
  { id: 'developer', label: 'Developer Options', icon: 'code', action: 'android.settings.APPLICATION_DEVELOPMENT_SETTINGS' },
  { id: 'accessibility', label: 'Accessibility', icon: 'accessibility_new', action: 'android.settings.ACCESSIBILITY_SETTINGS' },
  { id: 'notifications', label: 'Notifications', icon: 'notifications', action: 'android.settings.NOTIFICATION_SETTINGS' },
]

const UNIT_CONVERSIONS = {
  length: {
    m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254,
  },
  weight: {
    kg: 1, g: 0.001, mg: 0.000001, lb: 0.453592, oz: 0.0283495, t: 1000,
  },
  temperature: {
    C: 'celsius', F: 'fahrenheit', K: 'kelvin',
  },
  volume: {
    L: 1, mL: 0.001, gal: 3.78541, qt: 0.946353, pt: 0.473176, cup: 0.236588, floz: 0.0295735,
  },
}

function tryEvaluateCalculator(expr) {
  try {
    const trimmed = expr.trim()
    if (!trimmed || !/[+\-*/%^()]/.test(trimmed) || /[a-zA-Z]/.test(trimmed)) return null
    const sanitized = trimmed.replace(/[^0-9+\-*/().%\s^]/g, '')
    if (!sanitized || !/\d/.test(sanitized)) return null
    const result = safeEvaluate(sanitized)
    if (typeof result === 'number' && Number.isFinite(result)) {
      const display = Number.isInteger(result) ? result.toString() : result.toFixed(6).replace(/\.?0+$/, '')
      return { expression: sanitized, result: display, value: result, display }
    }
    return null
  } catch {
    return null
  }
}

function tryUnitConversion(query) {
  const match = query.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)\s+(?:to|in|into)\s+([a-zA-Z]+)$/i)
  if (!match) return null

  const [, valueStr, fromUnit, toUnit] = match
  const value = parseFloat(valueStr)
  if (isNaN(value)) return null

  const from = fromUnit.toLowerCase()
  const to = toUnit.toLowerCase()
  const fromTemp = fromUnit.toUpperCase()
  const toTemp = toUnit.toUpperCase()

  for (const [, units] of Object.entries(UNIT_CONVERSIONS)) {
    if (fromTemp in units && toTemp in units && (fromTemp === 'C' || fromTemp === 'F' || fromTemp === 'K')) {
      let celsius
      if (fromTemp === 'C') celsius = value
      else if (fromTemp === 'F') celsius = (value - 32) * 5 / 9
      else celsius = value - 273.15

      let result
      if (toTemp === 'C') result = celsius
      else if (toTemp === 'F') result = celsius * 9 / 5 + 32
      else result = celsius + 273.15

      const formatted = result.toFixed(2).replace(/\.?0+$/, '')
      return { value, fromUnit, toUnit, result: formatted, from: fromUnit, to: toUnit, display: `${value} ${fromUnit} = ${formatted} ${toUnit}` }
    }
    if (from in units && to in units) {
      const baseValue = value * units[from]
      const result = baseValue / units[to]
      const formatted = result.toFixed(4).replace(/\.?0+$/, '')
      return { value, fromUnit, toUnit, result: formatted, from: fromUnit, to: toUnit, display: `${value} ${fromUnit} = ${formatted} ${toUnit}` }
    }
  }
  return null
}

function fuzzyMatchLower(q, t) {
  if (!q || !t) return 0
  if (t.includes(q)) return 100
  let qi = 0
  let score = 0
  let consecutive = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      qi++
      consecutive++
      score += consecutive * 10
    } else {
      consecutive = 0
    }
  }
  return qi === q.length ? score : 0
}

function fuzzyMatch(query, text) {
  if (!query || !text) return 0
  return fuzzyMatchLower(query.toLowerCase(), text.toLowerCase())
}

export function useSearchViewModel({ installedApps = [], onLaunchApp, onNavigate }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [activeSource, setActiveSource] = useState('all')
  const [calculatorResult, setCalculatorResult] = useState(null)
  const [unitResult, setUnitResult] = useState(null)
  const [isExpandedSearch, setIsExpandedSearch] = useState(() => {
    return localStorage.getItem('iris_expanded_search') === 'true'
  })
  
  const toggleExpandedSearch = useCallback(() => {
    setIsExpandedSearch(prev => {
      const next = !prev
      localStorage.setItem('iris_expanded_search', String(next))
      return next
    })
  }, [])

  const abortRef = useRef(null)
  const searchTimeoutRef = useRef(null)
  const onLaunchAppRef = useRef(onLaunchApp)
  const onNavigateRef = useRef(onNavigate)
  const queryRef = useRef(query)
  queryRef.current = query
  const performSearchRef = useRef(null)

  useEffect(() => {
    onLaunchAppRef.current = onLaunchApp
    onNavigateRef.current = onNavigate
  }, [onLaunchApp, onNavigate])

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort()
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [])

  const indexedApps = useMemo(() => {
    return (installedApps || []).map(app => ({
      app,
      labelLower: (app.label || '').toLowerCase(),
      pkgLower: (app.packageId || '').toLowerCase(),
    }))
  }, [installedApps])

  const searchApps = useCallback((q) => {
    if (!q) return []
    const qLower = q.toLowerCase()
    const scored = []
    for (let i = 0; i < indexedApps.length; i++) {
      const { app, labelLower, pkgLower } = indexedApps[i]
      const score = Math.max(
        fuzzyMatchLower(qLower, labelLower),
        fuzzyMatchLower(qLower, pkgLower) * 0.8,
        labelLower.startsWith(qLower) ? 200 : 0
      )
      if (score > 0) {
        scored.push({
          id: app.packageId,
          type: 'app',
          label: app.label,
          sublabel: app.packageId,
          icon: app.icon,
          score,
          action: () => onLaunchAppRef.current?.(app),
        })
      }
    }
    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, 6)
  }, [indexedApps])

  const searchSettings = useCallback((q) => {
    if (!q) return []
    return SETTINGS_DEEP_LINKS
      .filter(s => fuzzyMatch(q, s.label) > 0)
      .map(s => ({
        id: `setting_${s.id}`,
        type: 'setting',
        label: s.label,
        sublabel: 'System Setting',
        icon: s.icon,
        score: fuzzyMatch(q, s.label),
        action: () => onNavigateRef.current?.('settings'),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
  }, [])

  const searchWeb = useCallback((q) => {
    if (!q) return []
    return [{
      id: 'web_search',
      type: 'web',
      label: `Search "${q}"`,
      sublabel: 'Web Search',
      icon: 'language',
      score: 1,
      action: () => window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, '_blank'),
    }]
  }, [])

  const searchContacts = useCallback(async (q, force = false) => {
    if (!q || (!isExpandedSearch && !force)) return []
    
    const perm = await checkAndRequestPermission('READ_CONTACTS')
    if (!perm.granted) return []

    const contacts = await lookupContactMultiple(q)
    return contacts.map(c => ({
      id: `contact_${c.number}`,
      type: 'contact',
      label: c.name,
      sublabel: c.number,
      icon: 'contacts',
      score: fuzzyMatch(q, c.name) + 50,
      action: () => {},
      callAction: () => makeCall(c.number),
      messageAction: () => sendSMS(c.number)
    }))
  }, [isExpandedSearch])

  const searchFiles = useCallback(async (q) => {
    if (!q) return []
    try {
      const perm = await checkAndRequestPermission('READ_EXTERNAL_STORAGE')
      if (!perm.granted && !(await checkAndRequestPermission('MANAGE_EXTERNAL_STORAGE')).granted) return []

      const result = await Filesystem.readdir({
        path: '',
        directory: Directory.Documents
      }).catch(() => ({ files: [] }))
      
      const downloads = await Filesystem.readdir({
        path: '',
        directory: Directory.ExternalStorage
      }).catch(() => ({ files: [] }))

      const allFiles = [...(result.files || []), ...(downloads.files || [])]
      
      return allFiles
        .filter(f => fuzzyMatch(q, f.name) > 0)
        .map(f => ({
          id: `file_${f.uri}`,
          type: 'file',
          label: f.name,
          sublabel: f.uri,
          icon: 'description',
          score: fuzzyMatch(q, f.name),
          action: () => {}
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
    } catch (e) {
      console.error('[SearchViewModel] File search error', e)
      return []
    }
  }, [])

  const performSearch = useCallback((q) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
      searchTimeoutRef.current = null
    }
    if (abortRef.current) abortRef.current.abort()

    if (!q || q.trim().length === 0) {
      setResults([])
      setCalculatorResult(null)
      setUnitResult(null)
      setIsSearching(false)
      setActiveSource('all')
      return
    }

    let command = null
    let actualQuery = q
    if (q.startsWith('/')) {
      const parts = q.split(' ')
      const potentialCommand = parts[0].toLowerCase()
      const availableCommands = ['/contact', '/calculator', '/unit', '/files', '/search']
      
      const isDirectCommand = availableCommands.includes(potentialCommand) && (
        parts.length > 1 || 
        q.endsWith(' ') || 
        potentialCommand === '/calculator' || 
        potentialCommand === '/unit'
      )

      if (isDirectCommand) {
        command = potentialCommand.substring(1)
        actualQuery = parts.slice(1).join(' ')
        setActiveSource(command)
      } else if (!availableCommands.includes(potentialCommand) || parts.length === 1) {
        setActiveSource('all')
        const suggestions = availableCommands
          .filter(cmd => cmd.startsWith(potentialCommand))
          .map(cmd => ({
            id: `cmd_${cmd}`,
            type: 'command',
            label: cmd,
            sublabel: 'ArcSearch Command',
            icon: cmd === '/contact' ? 'contacts' : cmd === '/calculator' ? 'calculate' : cmd === '/unit' ? 'straighten' : cmd === '/files' ? 'folder' : 'search',
            score: 1000,
            action: () => {}
          }))
        setResults(suggestions)
        setCalculatorResult(null)
        setUnitResult(null)
        setIsSearching(false)
        return
      }
    } else {
      setActiveSource('all')
    }

    if (command === 'calculator' || command === 'unit') {
      setResults([])
      setCalculatorResult(null)
      setUnitResult(null)
      setIsSearching(false)
      return
    }

    const calcResult = (!command || command === 'all') ? tryEvaluateCalculator(actualQuery) : null
    setCalculatorResult(calcResult)

    const unitRes = (!command || command === 'all') ? tryUnitConversion(actualQuery) : null
    setUnitResult(unitRes)

    const syncResults = []
    if (!command || command === 'all' || command === 'search') {
      syncResults.push(...searchApps(actualQuery))
      syncResults.push(...searchSettings(actualQuery))
      if (command === 'search' || isExpandedSearch) {
        syncResults.push(...searchWeb(actualQuery))
      }
    }
    syncResults.sort((a, b) => b.score - a.score)
    setResults(syncResults.slice(0, 8))

    const needsContacts = (command === 'contact' || ((!command || command === 'all') && isExpandedSearch)) && actualQuery.trim().length > 0
    const needsFiles = command === 'files' && actualQuery.trim().length > 0

    if (!needsContacts && !needsFiles) {
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    const controller = new AbortController()
    abortRef.current = controller

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const asyncItems = []
        if (needsContacts) {
          const contactResults = await searchContacts(actualQuery, command === 'contact')
          if (controller.signal.aborted) return
          asyncItems.push(...contactResults)
        }
        if (needsFiles) {
          const fileResults = await searchFiles(actualQuery)
          if (controller.signal.aborted) return
          asyncItems.push(...fileResults)
        }
        if (controller.signal.aborted) return
        const combined = [...syncResults, ...asyncItems].sort((a, b) => b.score - a.score)
        setResults(combined.slice(0, 8))
      } catch (e) {
        if (e.name !== 'AbortError') {
          console.error('[SearchViewModel] Search error:', e)
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false)
        }
      }
    }, 100)
  }, [searchApps, searchSettings, searchWeb, searchContacts, isExpandedSearch, searchFiles])

  performSearchRef.current = performSearch

  const prevAppsRef = useRef(installedApps)
  useEffect(() => {
    if (prevAppsRef.current !== installedApps) {
      prevAppsRef.current = installedApps
      if (queryRef.current && performSearchRef.current) {
        performSearchRef.current(queryRef.current)
      }
    }
  }, [installedApps])

  const handleQueryChange = useCallback((newQuery) => {
    setQuery(newQuery)
    performSearch(newQuery)
  }, [performSearch])

  const clearSearch = useCallback(() => {
    setQuery('')
    setResults([])
    setCalculatorResult(null)
    setUnitResult(null)
    setIsSearching(false)
    setActiveSource('all')
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    if (abortRef.current) abortRef.current.abort()
  }, [])

  const executeResult = useCallback((result) => {
    try {
      result.action?.()
    } catch (e) {
      console.error('[SearchViewModel] Failed to execute result:', e)
    }
  }, [])

  return {
    query,
    results,
    isSearching,
    calculatorResult,
    unitResult,
    activeSource,
    setActiveSource,
    isExpandedSearch,
    toggleExpandedSearch,
    handleQueryChange,
    clearSearch,
    executeResult,
    searchSources: SEARCH_SOURCES,
  }
}
