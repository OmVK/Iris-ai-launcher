import { create } from 'zustand'
import { getInstalledApps, addPackageChangeListener } from '../components/LauncherPlugin'
import { useAppsStore } from './appsStore'

const useAppListStore = create((set, get) => ({
  allApps: [],
  homeApps: [],
  isLoading: false,
  lastUpdated: 0,

  async loadApps() {
    set({ isLoading: true })
    try {
      const apps = await getInstalledApps()
      const hidden = useAppsStore.getState().hiddenApps
      const hiddenSet = new Set(hidden)

      const filtered = apps.filter(app => !hiddenSet.has(app.packageId))
      const home = filtered.filter(app => app.isHome)

      set({
        allApps: filtered,
        homeApps: home,
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
    useAppsStore.getState().setHiddenApp(packageId, true)
    await get().loadApps()
  },

  async unhideApp(packageId) {
    useAppsStore.getState().setHiddenApp(packageId, false)
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
