import { create } from 'zustand'
import { getLS, getLSNum, getLSBool } from '../utils/storage'

const shouldSyncWallpaper = getLS('wallpaper', 'VOID') === 'VOID' && !localStorage.getItem('custom_wallpaper')

export const useThemeStore = create((set, get) => ({
  themeColor: getLS('theme_color', 'cyan'),
  glassOpacity: getLSNum('glass_opacity', 75),
  wallpaper: getLS('wallpaper', 'VOID'),
  hasCustomWallpaper: (() => {
    try {
      const cw = getLS('custom_wallpaper', '')
      if (cw.length > 10000000) {
        localStorage.removeItem('custom_wallpaper')
        return false
      }
      return !!cw
    } catch { return false }
  })(),
  dpiScale: getLSNum('dpi_scale', 100),
  gridColumns: getLSNum('grid_columns', 5),
  gridRows: getLSNum('grid_rows', 5),
  homeIconSize: getLSNum('home_icon_size', 100),
  homeTextSize: getLSNum('home_text_size', 100),
  drawerIconSize: getLSNum('drawer_icon_size', 100),
  drawerTextSize: getLSNum('drawer_text_size', 100),
  layoutStyle: getLS('layout_style', 'CENTERED'),
  showAppLabels: getLSBool('show_app_labels', true),
  showDrawerSearch: getLSBool('show_drawer_search', true),
  showHomeOrb: getLSBool('show_home_orb', true),
  use24HourClock: getLSBool('iris_use_24h_clock', true),
  globalIconTheme: getLS('global_icon_theme', 'DEFAULT'),
  activeLiveWallpaper: getLS('active_live_wallpaper', 'NONE'),
  fullscreenActive: getLS('fullscreen_active', 'false') === 'true',
  drawerLayout: getLS('drawer_layout', 'GRID'),
  pageTransitionEffect: getLS('page_transition_effect', 'SLIDE_UP'),
  pageTransitionSpeed: getLSNum('iris_page_transition_speed', 300),
  pageTransitionEasing: getLS('page_transition_easing', 'SMOOTH'),

  setThemeColor: (v) => { localStorage.setItem('theme_color', v); set({ themeColor: v }) },
  setGlassOpacity: (v) => { localStorage.setItem('glass_opacity', v); set({ glassOpacity: v }) },
  setWallpaper: (v) => { localStorage.setItem('wallpaper', v); set({ wallpaper: v }) },
  setCustomWallpaper: (v) => { if (v) { localStorage.setItem('custom_wallpaper', v); set({ hasCustomWallpaper: true }) } else { localStorage.removeItem('custom_wallpaper'); set({ hasCustomWallpaper: false }) } },
  setDpiScale: (v) => { localStorage.setItem('dpi_scale', v); set({ dpiScale: v }) },
  setGridColumns: (v) => { localStorage.setItem('grid_columns', v); set({ gridColumns: v }) },
  setGridRows: (v) => { localStorage.setItem('grid_rows', v); set({ gridRows: v }) },
  setHomeIconSize: (v) => { localStorage.setItem('home_icon_size', v); set({ homeIconSize: v }) },
  setHomeTextSize: (v) => { localStorage.setItem('home_text_size', v); set({ homeTextSize: v }) },
  setDrawerIconSize: (v) => { localStorage.setItem('drawer_icon_size', v); set({ drawerIconSize: v }) },
  setDrawerTextSize: (v) => { localStorage.setItem('drawer_text_size', v); set({ drawerTextSize: v }) },
  setLayoutStyle: (v) => { localStorage.setItem('layout_style', v); set({ layoutStyle: v }) },
  setShowAppLabels: (v) => { localStorage.setItem('show_app_labels', v); set({ showAppLabels: v }) },
  setShowDrawerSearch: (v) => { localStorage.setItem('show_drawer_search', v); set({ showDrawerSearch: v }) },
  setShowHomeOrb: (v) => { localStorage.setItem('show_home_orb', v); set({ showHomeOrb: v }) },
  setUse24HourClock: (v) => { localStorage.setItem('iris_use_24h_clock', v); set({ use24HourClock: v }) },
  setGlobalIconTheme: (v) => { localStorage.setItem('global_icon_theme', v); set({ globalIconTheme: v }) },
  setActiveLiveWallpaper: (v) => { localStorage.setItem('active_live_wallpaper', v); set({ activeLiveWallpaper: v }) },
  setFullscreenActive: (v) => { localStorage.setItem('fullscreen_active', v); set({ fullscreenActive: v }) },
  setDrawerLayout: (v) => { localStorage.setItem('drawer_layout', v); set({ drawerLayout: v }) },
  setPageTransitionEffect: (v) => { localStorage.setItem('page_transition_effect', v); set({ pageTransitionEffect: v }) },
  setPageTransitionSpeed: (v) => { localStorage.setItem('iris_page_transition_speed', v); set({ pageTransitionSpeed: v }) },
  setPageTransitionEasing: (v) => { localStorage.setItem('page_transition_easing', v); set({ pageTransitionEasing: v }) },

  syncSystemWallpaper: async () => {
    try {
      const { getSystemWallpaper, isNative } = await import('../components/LauncherPlugin')
      if (!isNative) return
      const result = await getSystemWallpaper()
      if (result?.wallpaper) {
        localStorage.setItem('custom_wallpaper', result.wallpaper)
        localStorage.setItem('wallpaper', 'CUSTOM')
        set({ wallpaper: 'CUSTOM', hasCustomWallpaper: true })
      }
    } catch (e) {
      console.warn('System wallpaper sync failed:', e)
    }
  },
}))

if (shouldSyncWallpaper) {
  const { syncSystemWallpaper } = useThemeStore.getState()
  syncSystemWallpaper()
}
