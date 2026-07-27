const THEME_PRESETS_KEY = 'theme_presets'

const BUILT_IN_PRESETS = {
  NEON: {
    id: 'NEON',
    name: 'Neon',
    description: 'High-contrast cyberpunk neon',
    themeColor: 'cyan',
    glassOpacity: 75,
    wallpaper: 'VOID',
    activeLiveWallpaper: 'MATRIX',
    iconShape: 'squircle',
    globalIconTheme: 'DEFAULT',
    showAppLabels: true,
    use24HourClock: true,
    pageTransitionEffect: 'SLIDE_UP',
    pageTransitionSpeed: 250,
    pageTransitionEasing: 'SMOOTH',
  },
  MINIMAL: {
    id: 'MINIMAL',
    name: 'Minimal',
    description: 'Clean, simple, distraction-free',
    themeColor: 'white',
    glassOpacity: 0,
    wallpaper: 'VOID',
    activeLiveWallpaper: 'NONE',
    iconShape: 'circle',
    globalIconTheme: 'DEFAULT',
    showAppLabels: false,
    use24HourClock: true,
    pageTransitionEffect: 'FADE',
    pageTransitionSpeed: 200,
    pageTransitionEasing: 'SMOOTH',
  },
  CYBER: {
    id: 'CYBER',
    name: 'Cyber',
    description: 'Tactical military interface',
    themeColor: 'green',
    glassOpacity: 60,
    wallpaper: 'FIBER',
    activeLiveWallpaper: 'NONE',
    iconShape: 'rounded_rect',
    globalIconTheme: 'DEFAULT',
    showAppLabels: true,
    use24HourClock: true,
    pageTransitionEffect: 'SLIDE_UP',
    pageTransitionSpeed: 300,
    pageTransitionEasing: 'LINEAR',
  },
  GLASS: {
    id: 'GLASS',
    name: 'Glass',
    description: 'Frosted glass aesthetic',
    themeColor: 'purple',
    glassOpacity: 90,
    wallpaper: 'NEBULA',
    activeLiveWallpaper: 'NONE',
    iconShape: 'circle',
    globalIconTheme: 'DEFAULT',
    showAppLabels: true,
    use24HourClock: true,
    pageTransitionEffect: 'SLIDE_UP',
    pageTransitionSpeed: 350,
    pageTransitionEasing: 'BOUNCY',
  },
  DRACULA: {
    id: 'DRACULA',
    name: 'Dracula',
    description: 'Dark purple gothic theme',
    themeColor: 'purple',
    glassOpacity: 70,
    wallpaper: 'VOID',
    activeLiveWallpaper: 'NONE',
    iconShape: 'squircle',
    globalIconTheme: 'DEFAULT',
    showAppLabels: true,
    use24HourClock: true,
    pageTransitionEffect: 'FADE',
    pageTransitionSpeed: 300,
    pageTransitionEasing: 'SMOOTH',
  },
}

function loadCustomPresets() {
  try {
    const raw = localStorage.getItem(THEME_PRESETS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveCustomPresets(presets) {
  try { localStorage.setItem(THEME_PRESETS_KEY, JSON.stringify(presets)) } catch {}
}

function getAllPresets() {
  const custom = loadCustomPresets()
  return { ...BUILT_IN_PRESETS, ...custom }
}

function getPreset(id) {
  return getAllPresets()[id] || null
}

function saveCustomPreset(id, preset) {
  const custom = loadCustomPresets()
  custom[id] = { ...preset, id, isCustom: true }
  saveCustomPresets(custom)
}

function deleteCustomPreset(id) {
  const custom = loadCustomPresets()
  delete custom[id]
  saveCustomPresets(custom)
}

function applyPreset(preset, themeStore) {
  if (!preset || !themeStore) return
  const { setThemeColor, setGlassOpacity, setWallpaper, setActiveLiveWallpaper, setIconShape, setGlobalIconTheme, setShowAppLabels, setUse24HourClock, setPageTransitionEffect, setPageTransitionSpeed, setPageTransitionEasing } = themeStore
  if (preset.themeColor) setThemeColor(preset.themeColor)
  if (preset.glassOpacity !== undefined) setGlassOpacity(preset.glassOpacity)
  if (preset.wallpaper) setWallpaper(preset.wallpaper)
  if (preset.activeLiveWallpaper) setActiveLiveWallpaper(preset.activeLiveWallpaper)
  if (preset.iconShape) setIconShape(preset.iconShape)
  if (preset.globalIconTheme) setGlobalIconTheme(preset.globalIconTheme)
  if (preset.showAppLabels !== undefined) setShowAppLabels(preset.showAppLabels)
  if (preset.use24HourClock !== undefined) setUse24HourClock(preset.use24HourClock)
  if (preset.pageTransitionEffect) setPageTransitionEffect(preset.pageTransitionEffect)
  if (preset.pageTransitionSpeed !== undefined) setPageTransitionSpeed(preset.pageTransitionSpeed)
  if (preset.pageTransitionEasing) setPageTransitionEasing(preset.pageTransitionEasing)
}

function exportPreset(preset) {
  return JSON.stringify(preset, null, 2)
}

function importPreset(jsonString) {
  try {
    const preset = JSON.parse(jsonString)
    if (!preset.id || !preset.name) return null
    return preset
  } catch { return null }
}

export default {
  BUILT_IN_PRESETS,
  loadCustomPresets,
  getAllPresets,
  getPreset,
  saveCustomPreset,
  deleteCustomPreset,
  applyPreset,
  exportPreset,
  importPreset,
}
