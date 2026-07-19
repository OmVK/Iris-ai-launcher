import { create } from 'zustand'
import PowerSaveManager from '../utils/PowerSaveManager'

export const usePowerStore = create((set) => ({
  powerSaveMode: PowerSaveManager.getMode(),

  setPowerSaveMode: (mode) => {
    PowerSaveManager.setMode(mode)
    window.__powerSaveMode = mode
    set({ powerSaveMode: mode })
  },
}))
