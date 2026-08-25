import { useState, useCallback, useRef, useEffect } from 'react'
import { lookupContactMultiple, makeCall, sendSMS, checkAndRequestPermission } from '../components/LauncherPlugin'
import { Filesystem, Directory } from '@capacitor/filesystem'

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
    const sanitized = expr.replace(/[^0-9+\-*/().%\s^]/g, '')
    if (!sanitized || /[a-zA-Z]/.test(sanitized)) return null
    const replaced = sanitized.replace(/\^/g, '**')
    const result = Function(`"use strict"; return (${replaced})`)()
    if (typeof result === 'number' && isFinite(result)) {
      return { value: result, display: Number.isInteger(result) ? result.toString() : result.toFixed(6).replace(/\.?0+$/, '') }
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

  for (const [, units] of Object.entries(UNIT_CONVERSIONS)) {
    if (from in units && to in units) {
      if (from === 'C' || from === 'F' || from === 'K') {
        let celsius
        if (from === 'C') celsius = value
        else if (from === 'F') celsius = (value - 32) * 5 / 9
        else celsius = value - 273.15

        let result
        if (to === 'C') result = celsius
        else if (to === 'F') result = celsius * 9 / 5 + 32
        else result = celsius + 273.15

        return { value: result, from: fromUnit, to: toUnit, display: `${value} ${fromUnit} = ${result.toFixed(2)} ${toUnit}` }
      }

      const baseValue = value * units[from]
      const result = baseValue / units[to]
      return { value: result, from: fromUnit, to: toUnit, display: `${value} ${fromUnit} = ${result.toFixed(4)} ${toUnit}` }
    }
  }
  return null
}

function fuzzyMatch(query, text) {
  if (!query || !text) return 0
  const q = query.toLowerCase()
  const t = text.toLowerCase()
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

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort()
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [])

  const searchApps = useCallback((q) => {
    if (!q) return []
    const scored = installedApps
      .map(app => ({
        id: app.packageId,
        type: 'app',
        label: app.label,
        sublabel: app.packageId,
        icon: app.icon,
        score: Math.max(
          fuzzyMatch(q, app.label),
          fuzzyMatch(q, app.packageId) * 0.8,
          app.label.toLowerCase().startsWith(q.toLowerCase()) ? 200 : 0
        ),
        action: () => onLaunchApp?.(app),
      }))
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
    return scored.slice(0, 6)
  }, [installedApps, onLaunchApp])

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
        action: () => onNavigate?.('settings'),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
  }, [onNavigate])

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

  const searchContacts = useCallback(async (q) => {
    if (!q || !isExpandedSearch) return []
    
    // Auto-request permission if expanded search is used
    const perm = await checkAndRequestPermission('READ_CONTACTS')
    if (!perm.granted) return []

    const contacts = await lookupContactMultiple(q)
    return contacts.map(c => ({
      id: `contact_${c.number}`,
      type: 'contact',
      label: c.name,
      sublabel: c.number,
      icon: 'contacts',
      score: fuzzyMatch(q, c.name) + 50, // boost contacts slightly
      action: () => {}, // Handled specially in UI
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

      // This is a shallow search of root documents and external storage for simplicity and speed.
      // A deep recursive search would require more native code or recursive calls.
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
          action: () => {} // File opener could be added here
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
    } catch (e) {
      console.error('[SearchViewModel] File search error', e)
      return []
    }
  }, [])

  const performSearch = useCallback(async (q) => {
    if (!q || q.trim().length === 0) {
      setResults([])
      setCalculatorResult(null)
      setUnitResult(null)
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    setCalculatorResult(null)
    setUnitResult(null)

    try {
      if (abortRef.current) abortRef.current.abort()
      abortRef.current = new AbortController()

      let command = null
      let actualQuery = q
      if (q.startsWith('/')) {
        const parts = q.split(' ')
        const potentialCommand = parts[0].toLowerCase()
        const availableCommands = ['/contact', '/calculator', '/unit', '/files', '/search']
        
        if (availableCommands.includes(potentialCommand) && (parts.length > 1 || q.endsWith(' '))) {
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
              action: () => {} // Handled specially in UI
            }))
          setResults(suggestions)
          setIsSearching(false)
          return
        }
      } else {
        setActiveSource('all')
      }

      if (command === 'calculator') {
        // Handled entirely by UI
        return
      }

      if (command === 'unit') {
        // Handled entirely by UI
        return
      }

      const calcResult = tryEvaluateCalculator(actualQuery)
      if (calcResult && (!command || command === 'all')) {
        setCalculatorResult(calcResult)
      }

      const unitRes = tryUnitConversion(actualQuery)
      if (unitRes && (!command || command === 'all')) {
        setUnitResult(unitRes)
      }

      const allResults = []

      if (!command || command === 'all' || command === 'search') {
        const appResults = searchApps(actualQuery)
        allResults.push(...appResults)

        const settingResults = searchSettings(actualQuery)
        allResults.push(...settingResults)

        if (command === 'search' || isExpandedSearch) {
          const webResults = searchWeb(actualQuery)
          allResults.push(...webResults)
        }
      }

      if (!command || command === 'all' || command === 'contact') {
        // If /contact, force search Contacts even if isExpandedSearch is false
        if (command === 'contact' || isExpandedSearch) {
          const contactResults = await searchContacts(actualQuery)
          allResults.push(...contactResults)
        }
      }

      if (command === 'files') {
        const fileResults = await searchFiles(actualQuery)
        allResults.push(...fileResults)
      }

      allResults.sort((a, b) => b.score - a.score)

      setResults(allResults.slice(0, 8))
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error('[SearchViewModel] Search error:', e)
        setResults([])
      }
    } finally {
      setIsSearching(false)
    }
  }, [searchApps, searchSettings, searchWeb, searchContacts, isExpandedSearch, searchFiles])

  const handleQueryChange = useCallback((newQuery) => {
    setQuery(newQuery)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(newQuery)
    }, 150)
  }, [performSearch])

  const clearSearch = useCallback(() => {
    setQuery('')
    setResults([])
    setCalculatorResult(null)
    setUnitResult(null)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
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
