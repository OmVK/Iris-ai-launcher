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

    const merged = filtered.map(app => {
      const existing = existingMap.get(app.packageId)
      if (existing && existing.icon && existing.icon !== app.icon) {
        return { ...app, icon: existing.icon }
      }
      return app
    })

    const newApps = [...(s.installedApps || []), ...merged]
    const unique = newApps.reduce((acc, current) => {
      const x = acc.find(item => item.packageId === current.packageId)
      return x ? acc : acc.concat([current])
    }, [])

    localStorage.setItem('installed_apps', JSON.stringify(unique))
    return { installedApps: unique }
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
