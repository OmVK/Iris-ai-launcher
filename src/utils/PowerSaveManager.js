const STORAGE_KEY = 'iris_power_save_mode'
const OVERRIDES_KEY = 'iris_power_save_overrides'

const MODES = {
  AUTO: 'AUTO',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
}

const FEATURE_PRESETS = {
  HIGH: {
    use3DOrb: true,
    useWallpaper: true,
    particleCanvas: true,
    backdropBlur: true,
    pageTransitions: true,
    liveWidgetUpdates: true,
    backgroundNotifications: true,
    animatedIcons: true,
    gridAnimations: true,
    interactiveGlow: true,
    batteryPollMs: 60000,
    weatherPollMs: 600000,
    widgetMetricsPollMs: 30000,
    clockPollMs: 1000,
    networkPollMs: 5000,
    keepAlivePollMs: 300000,
    taskCheckPollMs: 120000,
    wallpaperFps: 120,
    iconDecodeSize: 64,
    deferredPiperInit: false,
    maxRenderItems: Infinity
  },
  MEDIUM: {
    use3DOrb: true,
    useWallpaper: false,
    particleCanvas: false,
    backdropBlur: true,
    pageTransitions: true,
    liveWidgetUpdates: true,
    backgroundNotifications: true,
    animatedIcons: true,
    gridAnimations: true,
    interactiveGlow: false,
    batteryPollMs: 120000,
    weatherPollMs: 1800000,
    widgetMetricsPollMs: 60000,
    clockPollMs: 2000,
    networkPollMs: 15000,
    keepAlivePollMs: 300000,
    taskCheckPollMs: 120000,
    wallpaperFps: 0,
    iconDecodeSize: 48,
    deferredPiperInit: true,
    maxRenderItems: 50
  },
  LOW: {
    use3DOrb: false,
    useWallpaper: false,
    particleCanvas: false,
    backdropBlur: false,
    pageTransitions: false,
    liveWidgetUpdates: false,
    backgroundNotifications: true,
    animatedIcons: false,
    gridAnimations: false,
    interactiveGlow: false,
    batteryPollMs: 300000,
    weatherPollMs: 3600000,
    widgetMetricsPollMs: 120000,
    clockPollMs: 5000,
    networkPollMs: 30000,
    keepAlivePollMs: 120000,
    taskCheckPollMs: 120000,
    wallpaperFps: 0,
    iconDecodeSize: 32,
    deferredPiperInit: true,
    maxRenderItems: 20
  }
}

function detectDeviceTier() {
  try {
    const ram = navigator.deviceMemory || 4
    const cores = navigator.hardwareConcurrency || 4
    if (ram >= 6 && cores >= 8) return 'HIGH'
    if (ram >= 4 && cores >= 6) return 'MEDIUM'
    return 'LOW'
  } catch {
    return 'MEDIUM'
  }
}

class PowerSaveManager {
  constructor() {
    this._mode = null
    this._overrides = {}
    this._listeners = new Set()
    this._init()
  }

  _init() {
    try {
      this._mode = localStorage.getItem(STORAGE_KEY) || MODES.AUTO
      const raw = localStorage.getItem(OVERRIDES_KEY)
      this._overrides = raw ? JSON.parse(raw) : {}
    } catch {
      this._mode = MODES.AUTO
      this._overrides = {}
    }
  }

  getMode() {
    return this._mode
  }

  setMode(mode) {
    if (!Object.values(MODES).includes(mode)) return
    this._mode = mode
    try { localStorage.setItem(STORAGE_KEY, mode) } catch {}
    this._notify()
  }

  getEffectiveTier() {
    if (this._mode === MODES.AUTO) return detectDeviceTier()
    return this._mode
  }

  getFeature(feature) {
    if (feature in this._overrides) return this._overrides[feature]
    const tier = this.getEffectiveTier()
    const preset = FEATURE_PRESETS[tier]
    return preset ? preset[feature] : false
  }

  setOverride(feature, value) {
    this._overrides[feature] = value
    try { localStorage.setItem(OVERRIDES_KEY, JSON.stringify(this._overrides)) } catch {}
    this._notify()
  }

  clearOverride(feature) {
    delete this._overrides[feature]
    try { localStorage.setItem(OVERRIDES_KEY, JSON.stringify(this._overrides)) } catch {}
    this._notify()
  }

  hasOverride(feature) {
    return feature in this._overrides
  }

  getPollingInterval(key) {
    return this.getFeature(key)
  }

  getEffectiveTierDisplay() {
    const tier = this.getEffectiveTier()
    return { tier, label: tier.charAt(0) + tier.slice(1).toLowerCase() }
  }

  getAllFeatures() {
    const tier = this.getEffectiveTier()
    const preset = FEATURE_PRESETS[tier] || FEATURE_PRESETS.MEDIUM
    const result = {}
    for (const [key, defaultVal] of Object.entries(preset)) {
      result[key] = this._overrides[key] !== undefined ? this._overrides[key] : defaultVal
    }
    return result
  }

  isEnabled() {
    return this.getEffectiveTier() !== 'HIGH'
  }

  shouldDisable(feature) {
    if (feature === 'piper') {
      return this.getFeature('deferredPiperInit') === true;
    }
    const map = {
      orb: 'use3DOrb',
      wallpaper: 'useWallpaper',
      particles: 'particleCanvas',
      blur: 'backdropBlur',
      transitions: 'pageTransitions',
      glow: 'interactiveGlow',
      animatedIcons: 'animatedIcons'
    }
    const key = map[feature] || feature
    const val = this.getFeature(key)
    if (typeof val === 'boolean') return !val
    return false
  }

  getPollingMultiplier() {
    const tier = this.getEffectiveTier()
    if (tier === 'LOW') return 3
    if (tier === 'MEDIUM') return 2
    return 1
  }

  getIconSizeMultiplier() {
    const tier = this.getEffectiveTier()
    if (tier === 'LOW') return 0.5
    if (tier === 'MEDIUM') return 0.75
    return 1
  }

  subscribe(listener) {
    this._listeners.add(listener)
    return () => this._listeners.delete(listener)
  }

  _notify() {
    for (const fn of this._listeners) {
      try { fn() } catch {}
    }
  }

}

const instance = new PowerSaveManager()
export { MODES, detectDeviceTier }
export default instance
