import { create } from 'zustand'
import { getInstalledApps, isNative } from '../components/LauncherPlugin'
import { BUILTIN_APPS as DEFAULT_APPS } from '../utils/constants'

const IRIS_PACKAGE_IDS = new Set([
  'com.iris.settings', 'com.iris.optics',
  'com.stitch.iris.vault', 'com.iris.assistant', 'com.iris.widgets',
  'com.iris.media', 'com.iris.private'
])

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

  setInstalledApps: (updater) => set((s) => {
    const next = typeof updater === 'function' ? updater(s.installedApps) : updater
    localStorage.setItem('installed_apps', JSON.stringify(next))
    return { installedApps: next }
  }),

  mergeNativeApps: (nativeApps) => set((s) => {
    if (!nativeApps || nativeApps.length === 0) return s
    const filtered = nativeApps.filter(app => !IRIS_PACKAGE_IDS.has(app.packageId))
    const newApps = [...DEFAULT_APPS, ...filtered]
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
