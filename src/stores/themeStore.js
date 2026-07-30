import { create } from 'zustand'
import { getLS, getLSNum, getLSBool } from '../utils/storage'

const shouldSyncWallpaper = (getLS('wallpaper', 'SYSTEM') === 'VOID' || getLS('wallpaper', 'SYSTEM') === 'SYSTEM') && !localStorage.getItem('custom_wallpaper')

export const useThemeStore = create((set, get) => ({
  themeColor: getLS('theme_color', 'cyan'),
  glassOpacity: getLSNum('glass_opacity', 75),
  wallpaper: getLS('wallpaper', 'SYSTEM'),
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
  drawerLayout: getLS('drawer_layout', 'GRID'),
  showAppLabels: getLSBool('show_app_labels', true),
  showDrawerSearch: getLSBool('show_drawer_search', true),
  use24HourClock: getLSBool('use_24_hour_clock', true),
  fullscreenActive: getLSBool('fullscreen_active', false),
  pageTransitionEffect: getLS('page_transition_effect', 'SLIDE_UP'),
  pageTransitionSpeed: getLSNum('iris_page_transition_speed', 300),
  pageTransitionEasing: getLS('page_transition_easing', 'SMOOTH'),
  globalIconTheme: getLS('global_icon_theme', 'DEFAULT'),
  activeLiveWallpaper: getLS('active_live_wallpaper', 'NONE'),
  darkGlassTheme: getLSBool('dark_glass_theme', true),
  homePages: (() => {
    try {
      const raw = localStorage.getItem('home_pages')
      return raw ? JSON.parse(raw) : [{ id: 1, pinnedApps: [], pinnedFolders: [] }]
    } catch { return [{ id: 1, pinnedApps: [], pinnedFolders: [] }] }
  })(),
  activeHomePage: 1,
  iconShape: getLS('icon_shape', 'HEXAGON'),
  dockColumns: getLSNum('dock_columns', 5),
  dockBackground: getLS('dock_background', 'glass'),
  homeScreenFolders: (() => {
    try {
      const raw = localStorage.getItem('home_screen_folders')
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })(),
  wallpaperBlur: getLSNum('wallpaper_blur', 0),
  wallpaperVignette: getLSNum('wallpaper_vignette', 0),
  islandProfile: getLS('iris_island_profile', 'BALANCED'),
  islandWidthScale: getLSNum('iris_island_width_scale', 100),
  islandHeightScale: getLSNum('iris_island_height_scale', 100),
  islandTopMargin: getLSNum('iris_island_top_margin', 0),

  setThemeColor: (v) => { try { localStorage.setItem('theme_color', v) } catch {} set({ themeColor: v }) },
  setGlassOpacity: (v) => { try { localStorage.setItem('glass_opacity', v) } catch {} set({ glassOpacity: v }) },
  setWallpaper: (v) => {
    try { localStorage.setItem('wallpaper', v) } catch {}
    set({ wallpaper: v })
    if (v === 'SYSTEM') {
      get().syncSystemWallpaper()
    }
  },
  setHasCustomWallpaper: (v) => set({ hasCustomWallpaper: v }),
  setDpiScale: (v) => { try { localStorage.setItem('dpi_scale', v) } catch {} set({ dpiScale: v }) },
  setGridColumns: (v) => { try { localStorage.setItem('grid_columns', v) } catch {} set({ gridColumns: v }) },
  setGridRows: (v) => { try { localStorage.setItem('grid_rows', v) } catch {} set({ gridRows: v }) },
  setHomeIconSize: (v) => { try { localStorage.setItem('home_icon_size', v) } catch {} set({ homeIconSize: v }) },
  setHomeTextSize: (v) => { try { localStorage.setItem('home_text_size', v) } catch {} set({ homeTextSize: v }) },
  setDrawerIconSize: (v) => { try { localStorage.setItem('drawer_icon_size', v) } catch {} set({ drawerIconSize: v }) },
  setDrawerTextSize: (v) => { try { localStorage.setItem('drawer_text_size', v) } catch {} set({ drawerTextSize: v }) },
  setLayoutStyle: (v) => { try { localStorage.setItem('layout_style', v) } catch {} set({ layoutStyle: v }) },
  setDrawerLayout: (v) => { try { localStorage.setItem('drawer_layout', v) } catch {} set({ drawerLayout: v }) },
  setShowAppLabels: (v) => { try { localStorage.setItem('show_app_labels', v) } catch {} set({ showAppLabels: v }) },
  setShowDrawerSearch: (v) => { try { localStorage.setItem('show_drawer_search', v) } catch {} set({ showDrawerSearch: v }) },
  setUse24HourClock: (v) => { try { localStorage.setItem('use_24_hour_clock', v) } catch {} set({ use24HourClock: v }) },
  setFullscreenActive: (v) => { try { localStorage.setItem('fullscreen_active', v) } catch {} set({ fullscreenActive: v }) },
  setGlobalIconTheme: (v) => { try { localStorage.setItem('global_icon_theme', v) } catch {} set({ globalIconTheme: v }) },
  setActiveLiveWallpaper: (v) => { try { localStorage.setItem('active_live_wallpaper', v) } catch {} set({ activeLiveWallpaper: v }) },
  setPageTransitionEffect: (v) => { try { localStorage.setItem('page_transition_effect', v) } catch {} set({ pageTransitionEffect: v }) },
  setPageTransitionSpeed: (v) => { try { localStorage.setItem('iris_page_transition_speed', v) } catch {} set({ pageTransitionSpeed: v }) },
  setPageTransitionEasing: (v) => { try { localStorage.setItem('page_transition_easing', v) } catch {} set({ pageTransitionEasing: v }) },
  setDarkGlassTheme: (v) => { try { localStorage.setItem('dark_glass_theme', v) } catch {} set({ darkGlassTheme: v }) },
  setHomePages: (v) => { try { localStorage.setItem('home_pages', v) } catch {} set({ homePages: v }) },
  setActiveHomePage: (v) => set({ activeHomePage: v }),
  setIconShape: (v) => { try { localStorage.setItem('icon_shape', v) } catch {} set({ iconShape: v }) },
  setDockColumns: (v) => { try { localStorage.setItem('dock_columns', v) } catch {} set({ dockColumns: v }) },
  setDockBackground: (v) => { try { localStorage.setItem('dock_background', v) } catch {} set({ dockBackground: v }) },
  setHomeScreenFolders: (v) => { try { localStorage.setItem('home_screen_folders', JSON.stringify(v)) } catch {} set({ homeScreenFolders: v }) },
  setWallpaperBlur: (v) => { try { localStorage.setItem('wallpaper_blur', v) } catch {} set({ wallpaperBlur: v }) },
  setWallpaperVignette: (v) => { try { localStorage.setItem('wallpaper_vignette', v) } catch {} set({ wallpaperVignette: v }) },
  setIslandProfile: (v) => { try { localStorage.setItem('iris_island_profile', v) } catch {} set({ islandProfile: v }) },
  setIslandWidthScale: (v) => { try { localStorage.setItem('iris_island_width_scale', v) } catch {} set({ islandWidthScale: v }) },
  setIslandHeightScale: (v) => { try { localStorage.setItem('iris_island_height_scale', v) } catch {} set({ islandHeightScale: v }) },
  setIslandTopMargin: (v) => { try { localStorage.setItem('iris_island_top_margin', v) } catch {} set({ islandTopMargin: v }) },

  syncSystemWallpaper: async () => {
    try {
      const { getSystemWallpaper, isNative } = await import('../components/LauncherPlugin')
      if (!isNative) return
      const result = await getSystemWallpaper()
      if (result?.wallpaper) {
        try {
          localStorage.setItem('custom_wallpaper', result.wallpaper)
          localStorage.setItem('wallpaper', 'SYSTEM')
        } catch {}
        set({ wallpaper: 'SYSTEM', hasCustomWallpaper: true })
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
