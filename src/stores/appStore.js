import { create } from 'zustand'
import { getLS, getLSNum, getLSBool } from '../utils/storage'

export const useAppStore = create((set, get) => ({
  activePage: 'home',
  setActivePage: (page) => set({ activePage: page }),

  isAppActive: true,
  setIsAppActive: (v) => set({ isAppActive: v }),

  setupComplete: getLS('iris_setup_complete', '') !== '',
  setSetupComplete: (v) => { localStorage.setItem('iris_setup_complete', v ? 'true' : ''); set({ setupComplete: !!v }) },

  // Vault / Lock
  showChronoLock: false,
  chronoTarget: null,
  isVaultUnlocked: false,
  showVaultExplorer: false,
  vaultTab: 'FILES',
  lockedApps: (() => {
    try {
      const cached = localStorage.getItem('iris_locked_apps')
      const parsed = cached ? JSON.parse(cached) : []
      return Array.isArray(parsed) ? parsed : []
    } catch { return [] }
  })(),

  setShowChronoLock: (v) => set({ showChronoLock: v }),
  setChronoTarget: (v) => set({ chronoTarget: v }),
  setIsVaultUnlocked: (v) => set({ isVaultUnlocked: v }),
  setShowVaultExplorer: (v) => set({ showVaultExplorer: v }),
  setVaultTab: (v) => set({ vaultTab: v }),
  setLockedApps: (updater) => set((s) => {
    const next = typeof updater === 'function' ? updater(s.lockedApps) : updater
    try { 
      localStorage.setItem('iris_locked_apps', JSON.stringify(next))
      import('../components/LauncherPlugin').then(m => m.setVaultPackages(next)).catch(() => {})
    } catch {}
    return { lockedApps: next }
  }),
  toggleAppLock: (packageId) => set((s) => {
    const next = s.lockedApps.includes(packageId)
      ? s.lockedApps.filter(p => p !== packageId)
      : [...s.lockedApps, packageId]
    try { 
      localStorage.setItem('iris_locked_apps', JSON.stringify(next))
      import('../components/LauncherPlugin').then(m => m.setVaultPackages(next)).catch(() => {})
    } catch {}
    return { lockedApps: next }
  }),

  // Arc Search
  showArcSearch: false,
  setShowArcSearch: (v) => set({ showArcSearch: v }),
}))
