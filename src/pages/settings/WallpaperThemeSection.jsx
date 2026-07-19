import SettingsSection from './SettingsSection'
import { SettingOptionGrid } from './SettingControls'
import { Capacitor } from '@capacitor/core'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'

const CORE_THEMES = [
  { id: 'cyan', label: 'Neon Cyan', color: '#00dbe7' },
  { id: 'pink', label: 'Cyber Pink', color: '#ff007f' },
  { id: 'green', label: 'Acid Green', color: '#39ff14' },
  { id: 'amber', label: 'Hyper Amber', color: '#ffaa00' },
  { id: 'purple', label: 'Synth Purple', color: '#9d4edf' },
  { id: 'red', label: 'Rage Red', color: '#ff1744' }
]

const WALLPAPERS = [
  { id: 'VOID', label: 'Void Space', desc: 'Dark void gradient' },
  { id: 'GRID', label: 'Cyber Grid', desc: 'Vector grid matrix' },
  { id: 'NEBULA', label: 'Nebula Dust', desc: 'Nebula cloud gas' },
  { id: 'FIBER', label: 'Carbon Tech', desc: 'Carbon tactical weave' },
  { id: 'AURORA', label: 'Aurora sweep', desc: 'Northern glowing sky' }
]

const LIVE_WALLPAPERS = [
  { id: 'NONE', label: 'Static Mode', desc: 'No live animations', icon: 'wallpaper' },
  { id: 'MATRIX', label: 'Matrix Rain', desc: 'Neon cyan falling code', icon: 'terminal' },
  { id: 'CYBER_GRID', label: 'Synth Grid', desc: 'Perspective tilting grid', icon: 'grid_on' },
  { id: 'NEON_PARTICLES', label: 'Constellations', desc: 'Pointer gravity networks', icon: 'star' }
]

export default function WallpaperThemeSection({ expandedSections, toggleSection, themeColor, setThemeColor, wallpaper, setWallpaper, hasCustomWallpaper, setCustomWallpaper, activeLiveWallpaper, setActiveLiveWallpaper }) {
  const handleCustomWallpaperUpload = async (e) => {
    try {
      if (Capacitor.isNativePlatform()) {
        const image = await Camera.getPhoto({
          quality: 85, allowEditing: false, resultType: CameraResultType.DataUrl, source: CameraSource.Photos
        })
        if (image.dataUrl) { setCustomWallpaper(image.dataUrl); setWallpaper('CUSTOM') }
      } else {
        const file = e.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (event) => {
          const img = new Image()
          img.onload = () => {
            const canvas = document.createElement('canvas')
            let width = img.width, height = img.height
            const MAX = 1920
            if (width > MAX || height > MAX) { if (width > height) { height *= MAX / width; width = MAX } else { width *= MAX / height; height = MAX } }
            canvas.width = width; canvas.height = height
            canvas.getContext('2d').drawImage(img, 0, 0, width, height)
            setCustomWallpaper(canvas.toDataURL('image/jpeg', 0.85))
            setWallpaper('CUSTOM')
          }
          img.src = event.target.result
        }
        reader.readAsDataURL(file)
      }
    } catch (err) { console.error("Gallery picker error:", err) }
  }

  return (
    <SettingsSection title="APP WALLPAPER & SYSTEM COLOR SKIN" icon="palette" sectionKey="wallpaperTheme" expandedSections={expandedSections} toggleSection={toggleSection}>
      <div className="space-y-2">
        <p className="text-[7.5px] text-on-surface-variant/40 uppercase">CHOOSE PRIMARY THEME COLOR HUE</p>
        <SettingOptionGrid options={CORE_THEMES} value={themeColor} onChange={setThemeColor} columns={3} />
      </div>

      <div className="space-y-2">
        <p className="text-[7.5px] text-on-surface-variant/40 uppercase">SELECT LAUNCHER WALLPAPER BACKDROP</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {WALLPAPERS.map(wp => (
            <button key={wp.id} onClick={() => setWallpaper(wp.id)} className={`p-2 rounded border text-left transition-all active:scale-95 flex flex-col justify-between h-14 ${wallpaper === wp.id ? 'bg-primary-fixed-dim/15 border-primary-fixed-dim text-primary-fixed-dim shadow-[0_0_8px_rgba(var(--primary-rgb),0.15)]' : 'bg-black/20 border-outline-variant/30 text-on-surface-variant/70 hover:text-white'}`}>
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
              <button onClick={() => setWallpaper('CUSTOM')} className={`p-2 rounded border text-left transition-all active:scale-95 flex items-center justify-between h-9 flex-1 ${wallpaper === 'CUSTOM' ? 'bg-primary-fixed-dim/15 border-primary-fixed-dim text-primary-fixed-dim' : 'bg-black/20 border-outline-variant/30 text-on-surface-variant/70 hover:text-white'}`}>
                <span className="font-bold text-[8.5px] truncate">Use Custom Wallpaper</span>
                <span className="text-[6.5px] text-primary-fixed-dim/60 font-mono uppercase bg-primary-fixed-dim/10 px-1 py-0.5 rounded ml-2 shrink-0">ACTIVE</span>
              </button>
            )}
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
      </div>
    </SettingsSection>
  )
}
