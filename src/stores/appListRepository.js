import { create } from 'zustand'
import { getInstalledApps, addPackageChangeListener } from '../components/LauncherPlugin'
import { HiddenAppsStore } from '../utils/DataStore'

const useAppListStore = create((set, get) => ({
  allApps: [],
  homeApps: [],
  hiddenApps: [],
  isLoading: false,
  lastUpdated: 0,

  async loadApps() {
    set({ isLoading: true })
    try {
      const apps = await getInstalledApps()
      const hidden = await HiddenAppsStore.get('hidden', [])
      const hiddenSet = new Set(hidden)

      const filtered = apps.filter(app => !hiddenSet.has(app.packageId))
      const home = filtered.filter(app => app.isHome)

      set({
        allApps: filtered,
        homeApps: home,
        hiddenApps: hidden,
        isLoading: false,
        lastUpdated: Date.now(),
      })
    } catch (e) {
      console.error('Failed to load apps:', e)
      set({ isLoading: false })
    }
  },

  async refreshApps() {
    await get().loadApps()
  },

  async hideApp(packageId) {
    const hidden = [...get().hiddenApps, packageId]
    const hiddenSet = new Set(hidden)
    const filtered = get().allApps.filter(app => !hiddenSet.has(app.packageId))

    set({
      hiddenApps: hidden,
      allApps: filtered,
      homeApps: filtered.filter(app => app.isHome),
    })
    await HiddenAppsStore.set('hidden', hidden)
  },

  async unhideApp(packageId) {
    const hidden = get().hiddenApps.filter(p => p !== packageId)
    set({ hiddenApps: hidden })
    await HiddenAppsStore.set('hidden', hidden)
    await get().loadApps()
  },

  setHomeApp(packageId, isHome) {
    const allApps = get().allApps.map(app =>
      app.packageId === packageId ? { ...app, isHome } : app
    )
    set({
      allApps,
      homeApps: allApps.filter(app => app.isHome),
    })
  },

  initPackageListener() {
    return addPackageChangeListener((data) => {
      const { eventType } = data
      if (eventType === 'ADDED' || eventType === 'REMOVED' || eventType === 'REPLACED') {
        get().refreshApps()
      }
    })
  },
}))

export default useAppListStore
