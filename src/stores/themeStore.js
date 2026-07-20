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
  darkGlassTheme: getLSBool('dark_glass_theme', false),

  setThemeColor: (v) => { try { localStorage.setItem('theme_color', v) } catch {} set({ themeColor: v }) },
  setGlassOpacity: (v) => { try { localStorage.setItem('glass_opacity', v) } catch {} set({ glassOpacity: v }) },
  setWallpaper: (v) => { try { localStorage.setItem('wallpaper', v) } catch {} set({ wallpaper: v }) },
  setCustomWallpaper: (v) => {
    if (v) {
      if (v.length > 5000000) return
      try { localStorage.setItem('custom_wallpaper', v) } catch {} set({ hasCustomWallpaper: true })
    } else {
      try { localStorage.removeItem('custom_wallpaper') } catch {} set({ hasCustomWallpaper: false })
    }
  },
  setDpiScale: (v) => { try { localStorage.setItem('dpi_scale', v) } catch {} set({ dpiScale: v }) },
  setGridColumns: (v) => { try { localStorage.setItem('grid_columns', v) } catch {} set({ gridColumns: v }) },
  setGridRows: (v) => { try { localStorage.setItem('grid_rows', v) } catch {} set({ gridRows: v }) },
  setHomeIconSize: (v) => { try { localStorage.setItem('home_icon_size', v) } catch {} set({ homeIconSize: v }) },
  setHomeTextSize: (v) => { try { localStorage.setItem('home_text_size', v) } catch {} set({ homeTextSize: v }) },
  setDrawerIconSize: (v) => { try { localStorage.setItem('drawer_icon_size', v) } catch {} set({ drawerIconSize: v }) },
  setDrawerTextSize: (v) => { try { localStorage.setItem('drawer_text_size', v) } catch {} set({ drawerTextSize: v }) },
  setLayoutStyle: (v) => { try { localStorage.setItem('layout_style', v) } catch {} set({ layoutStyle: v }) },
  setShowAppLabels: (v) => { try { localStorage.setItem('show_app_labels', v) } catch {} set({ showAppLabels: v }) },
  setShowDrawerSearch: (v) => { try { localStorage.setItem('show_drawer_search', v) } catch {} set({ showDrawerSearch: v }) },
  setShowHomeOrb: (v) => { try { localStorage.setItem('show_home_orb', v) } catch {} set({ showHomeOrb: v }) },
  setUse24HourClock: (v) => { try { localStorage.setItem('iris_use_24h_clock', v) } catch {} set({ use24HourClock: v }) },
  setGlobalIconTheme: (v) => { try { localStorage.setItem('global_icon_theme', v) } catch {} set({ globalIconTheme: v }) },
  setActiveLiveWallpaper: (v) => { try { localStorage.setItem('active_live_wallpaper', v) } catch {} set({ activeLiveWallpaper: v }) },
  setFullscreenActive: (v) => { try { localStorage.setItem('fullscreen_active', v) } catch {} set({ fullscreenActive: v }) },
  setDrawerLayout: (v) => { try { localStorage.setItem('drawer_layout', v) } catch {} set({ drawerLayout: v }) },
  setPageTransitionEffect: (v) => { try { localStorage.setItem('page_transition_effect', v) } catch {} set({ pageTransitionEffect: v }) },
  setPageTransitionSpeed: (v) => { try { localStorage.setItem('iris_page_transition_speed', v) } catch {} set({ pageTransitionSpeed: v }) },
  setPageTransitionEasing: (v) => { try { localStorage.setItem('page_transition_easing', v) } catch {} set({ pageTransitionEasing: v }) },
  setDarkGlassTheme: (v) => { try { localStorage.setItem('dark_glass_theme', v) } catch {} set({ darkGlassTheme: v }) },

  syncSystemWallpaper: async () => {
    try {
      const { getSystemWallpaper, isNative } = await import('../components/LauncherPlugin')
      if (!isNative) return
      const result = await getSystemWallpaper()
      if (result?.wallpaper) {
        try {
          localStorage.setItem('custom_wallpaper', result.wallpaper)
          localStorage.setItem('wallpaper', 'CUSTOM')
        } catch {}
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
