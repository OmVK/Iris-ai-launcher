import { create } from 'zustand'
import PowerSaveManager from '../utils/PowerSaveManager'

const ALLOWED_MODES = ['OFF', 'LOW', 'MEDIUM', 'HIGH']

export const usePowerStore = create((set) => ({
  powerSaveMode: PowerSaveManager.getMode(),

  setPowerSaveMode: (mode) => {
    if (!ALLOWED_MODES.includes(mode)) return
    try { PowerSaveManager.setMode(mode) } catch {}
    window.__powerSaveMode = mode
    set({ powerSaveMode: mode })
  },
}))
