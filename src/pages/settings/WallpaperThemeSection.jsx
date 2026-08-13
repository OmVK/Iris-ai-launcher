import { useState } from 'react'
import SettingsSection from './SettingsSection'
import { SettingOptionGrid, SettingSlider } from './SettingControls'
import { Capacitor } from '@capacitor/core'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import WallpaperManager from '../../utils/WallpaperManager'
import MaterialYou from '../../utils/MaterialYou'
import ThemePresets from '../../utils/ThemePresets'
import { useThemeStore } from '../../stores/themeStore'

const CORE_THEMES = [
  { id: 'cyan', label: 'Neon Cyan', color: '#00dbe7' },
  { id: 'pink', label: 'Cyber Pink', color: '#ff007f' },
  { id: 'green', label: 'Acid Green', color: '#39ff14' },
  { id: 'amber', label: 'Hyper Amber', color: '#ffaa00' },
  { id: 'purple', label: 'Synth Purple', color: '#9d4edf' },
  { id: 'red', label: 'Rage Red', color: '#ff1744' }
]

const LIVE_WALLPAPERS = [
  { id: 'NONE', label: 'Static Mode', desc: 'No live animations', icon: 'wallpaper' },
  { id: 'MATRIX', label: 'Matrix Rain', desc: 'Neon cyan falling code', icon: 'terminal' },
  { id: 'CYBER_GRID', label: 'Synth Grid', desc: 'Perspective tilting grid', icon: 'grid_on' },
  { id: 'NEON_PARTICLES', label: 'Constellations', desc: 'Pointer gravity networks', icon: 'star' }
]

export default function WallpaperThemeSection({ expandedSections, toggleSection, themeColor, setThemeColor, wallpaper, setWallpaper, hasCustomWallpaper, setHasCustomWallpaper, activeLiveWallpaper, setActiveLiveWallpaper, glassOpacity, setGlassOpacity, iconShape, setIconShape }) {
  const [dailyRotation, setDailyRotation] = useState(WallpaperManager.shouldRotateDaily())
  const [dynamicColor, setDynamicColor] = useState(MaterialYou.isDynamicColorEnabled())
  const [showPresets, setShowPresets] = useState(false)
  const presets = ThemePresets.getAllPresets()
  const { wallpaperBlur, wallpaperVignette, setWallpaperBlur, setWallpaperVignette } = useThemeStore()

  const handleCustomWallpaperUpload = async (e) => {
    try {
      if (Capacitor.isNativePlatform()) {
        const image = await Camera.getPhoto({
          quality: 95, allowEditing: false, resultType: CameraResultType.DataUrl, source: CameraSource.Photos
        })
        if (image.dataUrl) {
          const resized = await WallpaperManager.resizeForWallpaper(image.dataUrl)
          WallpaperManager.setCustomWallpaper(resized)
          if (setHasCustomWallpaper) setHasCustomWallpaper(true)
          setWallpaper('CUSTOM')
          if (dynamicColor) {
            MaterialYou.extractAndApplyFromWallpaper(resized)
          }
        }
      } else {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = async (event) => {
          const resized = await WallpaperManager.resizeForWallpaper(event.target.result)
          WallpaperManager.setCustomWallpaper(resized)
          if (setHasCustomWallpaper) setHasCustomWallpaper(true)
          setWallpaper('CUSTOM')
          if (dynamicColor) {
            MaterialYou.extractAndApplyFromWallpaper(resized)
          }
        }
        reader.readAsDataURL(file)
      }
    } catch (err) { console.error("Gallery picker error:", err) }
  }

  const handleWallpaperChange = (id) => {
    setWallpaper(id)
    if (id !== 'CUSTOM') {
      if (setHasCustomWallpaper) setHasCustomWallpaper(false)
    }
    if (dynamicColor && id !== 'CUSTOM') {
      const wp = WallpaperManager.WALLPAPERS.find(w => w.id === id)
      if (wp) {
        const colors = {
          primary: themeColor === 'cyan' ? '#00dbe7' : themeColor === 'pink' ? '#ff007f' : '#39ff14',
          secondary: '#0088aa',
          tertiary: '#66f0ff',
          surface: '#0a0e17',
        }
        MaterialYou.cacheColors(colors)
        MaterialYou.applyDynamicColors(colors)
      }
    }
  }

  const handleDynamicColorToggle = (enabled) => {
    setDynamicColor(enabled)
    MaterialYou.setDynamicColorEnabled(enabled)
    if (enabled) {
      const cached = MaterialYou.getCachedColors()
      if (cached) MaterialYou.applyDynamicColors(cached)
    }
  }

  const handleBlurChange = (value) => {
    setWallpaperBlur(value)
  }

  const handleVignetteChange = (value) => {
    setWallpaperVignette(value)
  }

  const handleDailyRotation = (enabled) => {
    setDailyRotation(enabled)
    WallpaperManager.setDailyRotation(enabled)
  }

  const handleApplyPreset = (preset) => {
    ThemePresets.applyPreset(preset, {
      setThemeColor, setGlassOpacity, setWallpaper, setActiveLiveWallpaper,
      setIconShape, setGlobalIconTheme: () => {}, setShowAppLabels: () => {},
      setUse24HourClock: () => {}, setPageTransitionEffect: () => {},
      setPageTransitionSpeed: () => {}, setPageTransitionEasing: () => {},
    })
    setShowPresets(false)
  }

  return (
    <SettingsSection title="APP WALLPAPER & SYSTEM COLOR SKIN" icon="palette" sectionKey="wallpaperTheme" expandedSections={expandedSections} toggleSection={toggleSection}>
      <div className="space-y-2">
        <p className="text-[7.5px] text-on-surface-variant/40 uppercase">CHOOSE PRIMARY THEME COLOR HUE</p>
        <SettingOptionGrid options={CORE_THEMES} value={themeColor} onChange={setThemeColor} columns={3} />
      </div>

      <div className="space-y-2">
        <p className="text-[7.5px] text-on-surface-variant/40 uppercase">THEME PRESETS</p>
        <div className="grid grid-cols-2 gap-2">
          {Object.values(presets).map(preset => (
            <button key={preset.id} onClick={() => handleApplyPreset(preset)}
              className="p-2 rounded border border-white/10 bg-black/20 text-left hover:bg-white/5 transition-all active:scale-95">
              <span className="text-[9px] text-white/80 font-bold block">{preset.name}</span>
              <span className="text-[7px] text-white/40">{preset.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[7.5px] text-on-surface-variant/40 uppercase">MATERIAL YOU DYNAMIC COLOR</p>
          <button onClick={() => handleDynamicColorToggle(!dynamicColor)}
            className={`w-8 h-4 rounded-full transition-colors ${dynamicColor ? 'bg-primary-fixed-dim' : 'bg-white/10'}`}>
            <div className={`w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${dynamicColor ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
        </div>
        {dynamicColor && (
          <p className="text-[8px] text-primary-fixed-dim/60 font-mono-data">Colors extracted from wallpaper</p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-[7.5px] text-on-surface-variant/40 uppercase">SELECT LAUNCHER WALLPAPER BACKDROP</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {WallpaperManager.WALLPAPERS.map(wp => (
            <button key={wp.id} onClick={() => handleWallpaperChange(wp.id)}
              className={`p-2 rounded border text-left transition-all active:scale-95 flex flex-col justify-between h-14 ${wallpaper === wp.id ? 'bg-primary-fixed-dim/15 border-primary-fixed-dim text-primary-fixed-dim shadow-[0_0_8px_rgba(var(--primary-rgb),0.15)]' : 'bg-black/20 border-outline-variant/30 text-on-surface-variant/70 hover:text-white'}`}>
              <span className="font-bold text-[8.5px] truncate">{wp.label}</span>
              <span className="text-[6.5px] text-on-surface-variant/45 truncate uppercase">{wp.desc}</span>
            </button>
          ))}
        </div>

        <div className="pt-3 border-t border-white/5 flex flex-col gap-2">
          <p className="text-[7.5px] text-on-surface-variant/40 uppercase">OR INGEST SECURE CUSTOM PHOTO BACKDROP</p>
          <div className="flex gap-2 items-center">
            <input type="file" accept="image/*" id="wallpaper-file-input" onChange={handleCustomWallpaperUpload} className="hidden" />
            <button onClick={(e) => { Capacitor.isNativePlatform() ? handleCustomWallpaperUpload(e) : document.getElementById('wallpaper-file-input').click() }}
              className="flex items-center gap-2 px-3 py-2 rounded border border-primary-fixed-dim/30 bg-primary-fixed-dim/10 text-primary-fixed-dim hover:bg-primary-fixed-dim/20 cursor-pointer font-bold text-[9px] uppercase active:scale-95 transition-transform shrink-0">
              <span className="material-symbols-outlined text-xs">photo_camera</span>Ingest Custom
            </button>
            {hasCustomWallpaper && (
              <button onClick={() => handleWallpaperChange('CUSTOM')} className={`p-2 rounded border text-left transition-all active:scale-95 flex items-center justify-between h-9 flex-1 ${wallpaper === 'CUSTOM' ? 'bg-primary-fixed-dim/15 border-primary-fixed-dim text-primary-fixed-dim' : 'bg-black/20 border-outline-variant/30 text-on-surface-variant/70 hover:text-white'}`}>
                <span className="font-bold text-[8.5px] truncate">Use Custom Wallpaper</span>
                <span className="text-[6.5px] text-primary-fixed-dim/60 font-mono uppercase bg-primary-fixed-dim/10 px-1 py-0.5 rounded ml-2 shrink-0">ACTIVE</span>
              </button>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-white/5 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-[7.5px] text-on-surface-variant/40 uppercase">WALLPAPER EFFECTS</p>
          </div>
          <SettingSlider label="Wallpaper Blur" value={wallpaperBlur} onChange={handleBlurChange} min="0" max="20" unit="px" />
          <SettingSlider label="Vignette Overlay" value={wallpaperVignette} onChange={handleVignetteChange} min="0" max="100" unit="%" />
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-white/60 font-mono-data">Daily Rotation</span>
            <button onClick={() => handleDailyRotation(!dailyRotation)}
              className={`w-8 h-4 rounded-full transition-colors ${dailyRotation ? 'bg-primary-fixed-dim' : 'bg-white/10'}`}>
              <div className={`w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${dailyRotation ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-white/5 flex flex-col gap-2">
          <p className="text-[7.5px] text-on-surface-variant/40 uppercase">OR ENGAGE INTERACTIVE LIVE WALLPAPERS (HTML5)</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {LIVE_WALLPAPERS.map(liveWp => (
              <button key={liveWp.id} onClick={() => setActiveLiveWallpaper(liveWp.id)} className={`p-2 rounded border text-left transition-all active:scale-95 flex flex-col justify-between h-14 ${activeLiveWallpaper === liveWp.id ? 'bg-primary-fixed-dim/15 border-primary-fixed-dim text-primary-fixed-dim shadow-[0_0_8px_rgba(var(--primary-rgb),0.15)]' : 'bg-black/20 border-outline-variant/30 text-on-surface-variant/70 hover:text-white'}`}>
                <span className="font-bold text-[8.5px] truncate flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[10px] text-primary-fixed-dim">{liveWp.icon}</span>{liveWp.label}
                </span>
                <span className="text-[6.5px] text-on-surface-variant/45 truncate uppercase">{liveWp.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-white/5 flex flex-col gap-2">
          <p className="text-[7.5px] text-on-surface-variant/40 uppercase">ICON SHAPE MASK</p>
          <div className="grid grid-cols-5 gap-2">
            {[{ id: 'system', label: 'System' }, { id: 'circle', label: 'Circle' }, { id: 'squircle', label: 'Squircle' }, { id: 'rounded_rect', label: 'Rounded' }, { id: 'teardrop', label: 'Teardrop' }].map(shape => (
              <button key={shape.id} onClick={() => setIconShape(shape.id)} className={`py-1.5 px-1 rounded border text-[8px] truncate transition-all active:scale-95 ${iconShape === shape.id ? 'bg-primary-fixed-dim/15 border-primary-fixed-dim text-primary-fixed-dim' : 'bg-black/20 border-outline-variant/30 text-on-surface-variant/70 hover:text-white'}`}>
                {shape.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </SettingsSection>
  )
}
