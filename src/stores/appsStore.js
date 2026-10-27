import { create } from 'zustand'
import { getInstalledApps, isNative } from '../components/LauncherPlugin'
import { BUILTIN_APPS as DEFAULT_APPS } from '../utils/constants'

const IRIS_PACKAGE_IDS = new Set([
  'com.iris.settings', 'com.iris.optics',
  'com.stitch.iris.vault', 'com.iris.assistant', 'com.iris.widgets',
  'com.iris.media', 'com.iris.private'
])

const HIDDEN_APPS_KEY = 'iris_hidden_apps'
const APP_FREQUENCY_KEY = 'iris_app_frequency'

const loadApps = () => {
  try {
    const cached = localStorage.getItem('installed_apps')
    if (cached) {
      const parsed = JSON.parse(cached)
      const filtered = parsed.filter(app => !IRIS_PACKAGE_IDS.has(app.packageId))
      if (filtered.length !== parsed.length) {
        localStorage.setItem('installed_apps', JSON.stringify(filtered))
      }
      return filtered
    }
    return DEFAULT_APPS
  } catch {
    return DEFAULT_APPS
  }
}

const loadHiddenApps = () => {
  try {
    const raw = localStorage.getItem(HIDDEN_APPS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

const loadAppFrequency = () => {
  try {
    const raw = localStorage.getItem(APP_FREQUENCY_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

try {
  const cf = localStorage.getItem('iris_custom_folders')
  if (cf) {
    const parsed = JSON.parse(cf)
    const filtered = parsed.filter(f => !f.isIrisFolder)
    if (filtered.length !== parsed.length) {
      localStorage.setItem('iris_custom_folders', JSON.stringify(filtered))
    }
  }
} catch {}

function autoPinDefaults(apps) {
  const isEssential = (app) => {
    const pkg = (app.packageId || '').toLowerCase()
    const lbl = (app.label || '').toLowerCase()
    const cat = (app.cat || '').toUpperCase()
    if (pkg.includes('dialer') || pkg.includes('phone') || lbl === 'phone' || cat === 'COMMUNICATION') return 1
    if (pkg.includes('messaging') || pkg.includes('message') || pkg.includes('.mms') || lbl.includes('message')) return 2
    if (pkg.includes('chrome') || pkg.includes('browser') || pkg.includes('firefox') || lbl.includes('browser') || lbl.includes('chrome')) return 3
    if (pkg.includes('camera') || lbl.includes('camera')) return 4
    if (pkg.includes('gallery') || pkg.includes('photos') || lbl.includes('photos') || lbl.includes('gallery')) return 5
    if (pkg.includes('settings') || lbl === 'settings') return 6
    return 0
  }

  const matches = apps
    .map(app => ({ app, score: isEssential(app) }))
    .filter(x => x.score > 0)
    .sort((a, b) => a.score - b.score)

  const pinned = new Set()
  matches.slice(0, 6).forEach(m => pinned.add(m.app.packageId))

  if (pinned.size < 4 && apps.length > 0) {
    apps.slice(0, 4).forEach(a => pinned.add(a.packageId))
  }

  return apps.map(app => ({
    ...app,
    isHome: pinned.has(app.packageId)
  }))
}

export const useAppsStore = create((set, get) => ({
  installedApps: loadApps(),
  hiddenApps: loadHiddenApps(),
  appFrequency: loadAppFrequency(),

  setInstalledApps: (updater) => set((s) => {
    const next = typeof updater === 'function' ? updater(s.installedApps) : updater
    localStorage.setItem('installed_apps', JSON.stringify(next))
    return { installedApps: next }
  }),

  toggleHiddenApp: (packageId) => set((s) => {
    const hidden = s.hiddenApps.includes(packageId)
      ? s.hiddenApps.filter(id => id !== packageId)
      : [...s.hiddenApps, packageId]
    localStorage.setItem(HIDDEN_APPS_KEY, JSON.stringify(hidden))
    return { hiddenApps: hidden }
  }),

  setHiddenApp: (packageId, hidden) => set((s) => {
    const alreadyHidden = s.hiddenApps.includes(packageId)
    const next = hidden
      ? (alreadyHidden ? s.hiddenApps : [...s.hiddenApps, packageId])
      : (alreadyHidden ? s.hiddenApps.filter(id => id !== packageId) : s.hiddenApps)
    localStorage.setItem(HIDDEN_APPS_KEY, JSON.stringify(next))
    return { hiddenApps: next }
  }),

  isAppHidden: (packageId) => get().hiddenApps.includes(packageId),

  recordAppLaunch: (packageId) => set((s) => {
    const freq = { ...s.appFrequency }
    freq[packageId] = (freq[packageId] || 0) + 1
    localStorage.setItem(APP_FREQUENCY_KEY, JSON.stringify(freq))
    return { appFrequency: freq }
  }),

  getAppFrequency: (packageId) => get().appFrequency[packageId] || 0,

  mergeNativeApps: (nativeApps) => set((s) => {
    if (!nativeApps || nativeApps.length === 0) return s
    const filtered = nativeApps.filter(app => !IRIS_PACKAGE_IDS.has(app.packageId))
    const existingMap = new Map((s.installedApps || []).map(a => [a.packageId, a]))
    const hasAnyHome = (s.installedApps || []).some(a => a.isHome)

    let updated = filtered.map(app => {
      const existing = existingMap.get(app.packageId)
      if (existing) {
        return {
          ...app,
          isHome: existing.isHome ?? false,
          customIcon: existing.customIcon,
          customLabel: existing.customLabel,
          icon: existing.icon || app.icon
        }
      }
      return app
    })

    if (!hasAnyHome && existingMap.size === 0 && updated.length > 0) {
      updated = autoPinDefaults(updated)
    }

    const nonNativeApps = (s.installedApps || []).filter(a => a.path && !a.packageId)
    const finalApps = [...nonNativeApps, ...updated]

    localStorage.setItem('installed_apps', JSON.stringify(finalApps))
    return { installedApps: finalApps }
  }),

  resetToDefaults: () => {
    localStorage.setItem('installed_apps', JSON.stringify(DEFAULT_APPS))
    set({ installedApps: DEFAULT_APPS })
  },

  loadNativeApps: async () => {
    if (!isNative) return
    try {
      const apps = await getInstalledApps()
      if (apps && apps.length > 0) {
        get().mergeNativeApps(apps)
      }
    } catch (e) {
      console.error("Failed to load apps:", e)
    }
  },
}))
