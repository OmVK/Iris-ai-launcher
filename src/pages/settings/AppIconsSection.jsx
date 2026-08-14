import { useState, useEffect } from 'react'
import SettingsSection from './SettingsSection'
import { getInstalledIconPacks, loadIconPackFilter } from '../../components/LauncherPlugin'
import { useAppsStore } from '../../stores/appsStore'

const DEFAULT_APP_ICONS = {}

const ICON_GLYPHS = ['settings', 'chat', 'token', 'password', 'database', 'play_circle', 'rocket_launch', 'bolt', 'visibility', 'face', 'memory', 'vpn_key', 'shield', 'dns', 'radio', 'radar', 'monitoring', 'code', 'space_dashboard', 'explore', 'api', 'globe']

export default function AppIconsSection({ expandedSections, toggleSection, installedApps, setInstalledApps }) {
  const [selectedIconAppPkg, setSelectedIconAppPkg] = useState('')
  const [installedPacks, setInstalledPacks] = useState([])
  const [activePackPkg, setActivePackPkg] = useState(() => localStorage.getItem('iris_active_icon_pack') || 'DEFAULT')
  const [isLoadingPack, setIsLoadingPack] = useState(false)

  const selectedIconApp = Array.isArray(installedApps) ? installedApps.find(app => app.packageId === selectedIconAppPkg) : null

  useEffect(() => {
    let isMounted = true
    getInstalledIconPacks().then(packs => {
      if (isMounted && Array.isArray(packs)) {
        setInstalledPacks(packs)
      }
    })
    return () => { isMounted = false }
  }, [])

  const handleApplyPlayStorePack = async (packPkg) => {
    setActivePackPkg(packPkg)
    localStorage.setItem('iris_active_icon_pack', packPkg)

    if (packPkg === 'DEFAULT') {
      const { loadNativeApps } = useAppsStore.getState()
      await loadNativeApps()
      alert("Reset to default system app icons.")
      return
    }

    setIsLoadingPack(true)
    try {
      const iconMap = await loadIconPackFilter(packPkg)
      const currentApps = useAppsStore.getState().installedApps || []
      if (iconMap && Object.keys(iconMap).length > 0) {
        let matchCount = 0
        const updatedApps = currentApps.map(app => {
          if (iconMap[app.packageId]) {
            matchCount++
            return { ...app, icon: iconMap[app.packageId] }
          }
          return app
        })
        useAppsStore.getState().setInstalledApps(updatedApps)
        if (typeof setInstalledApps === 'function') {
          setInstalledApps(updatedApps)
        }
        alert(`Successfully applied ${matchCount} custom icons from Play Store icon pack!`)
      } else {
        alert("No matching app icons found in this icon pack.")
      }
    } catch {
      alert("Failed to extract icons from icon pack.")
    } finally {
      setIsLoadingPack(false)
    }
  }

  const handleUpdateAppIcon = (packageId, newIcon) => {
    const currentApps = useAppsStore.getState().installedApps || []
    const updated = currentApps.map(app => app.packageId === packageId ? { ...app, icon: newIcon } : app)
    useAppsStore.getState().setInstalledApps(updated)
    if (typeof setInstalledApps === 'function') setInstalledApps(updated)
  }

  const handleCustomIconUpload = (e) => {
    const file = e.target.files[0]; if (!file || !selectedIconAppPkg) return
    const reader = new FileReader(); reader.onload = (event) => handleUpdateAppIcon(selectedIconAppPkg, event.target.result); reader.readAsDataURL(file)
  }

  const handleIconPackUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    try {
      const { default: JSZip } = await import('jszip')
      const zip = new JSZip(), contents = await zip.loadAsync(file)
      let updatedApps = [...(installedApps || [])], matchCount = 0
      for (const [filename, fileData] of Object.entries(contents.files)) {
        if (fileData.dir || !filename.match(/\.(png|jpg|jpeg|webp|svg)$/i)) continue
        const baseName = filename.split('/').pop().replace(/\.(png|jpg|jpeg|webp|svg)$/i, '').replace(/_/g, '.')
        const idx = updatedApps.findIndex(app => app.packageId.toLowerCase() === baseName.toLowerCase() || app.label.toLowerCase() === baseName.toLowerCase())
        if (idx !== -1) { const blob = await fileData.async('blob'); const base64 = await new Promise(r => { const reader = new FileReader(); reader.onload = (e) => r(e.target.result); reader.readAsDataURL(blob) }); updatedApps[idx] = { ...updatedApps[idx], icon: base64 }; matchCount++ }
      }
      if (matchCount > 0) {
        useAppsStore.getState().setInstalledApps(updatedApps)
        if (typeof setInstalledApps === 'function') setInstalledApps(updatedApps)
        alert(`Successfully applied ${matchCount} icons!`)
      } else { alert("No matching icons found.") }
    } catch { alert("Failed to parse ZIP.") }
  }

  return (
    <SettingsSection title="APP ICON CUSTOMIZER & ICON PACKS" icon="settings_applications" sectionKey="appIcons" expandedSections={expandedSections} toggleSection={toggleSection}>
      <div className="space-y-4">
        {/* Installed Play Store Icon Packs Section */}
        <div className="space-y-2">
          <p className="text-[7.5px] text-on-surface-variant/40 uppercase tracking-wider font-mono-data">PLAY STORE ICON PACKS (DETECTED ON DEVICE)</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleApplyPlayStorePack('DEFAULT')}
              className={`p-2.5 rounded-lg border text-left transition-all active:scale-95 flex items-center gap-2.5 ${
                activePackPkg === 'DEFAULT' ? 'bg-primary-fixed-dim/15 border-primary-fixed-dim text-primary-fixed-dim shadow-[0_0_8px_rgba(var(--primary-rgb),0.15)]' : 'bg-black/20 border-outline-variant/30 text-on-surface-variant/70 hover:text-white'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-primary-fixed-dim/20 flex items-center justify-center text-primary-fixed-dim shrink-0">
                <span className="material-symbols-outlined text-base">apps</span>
              </div>
              <div className="truncate">
                <p className="font-bold text-[9px] truncate">System Icons</p>
                <p className="text-[6.5px] text-on-surface-variant/50 uppercase truncate">Default Android Pack</p>
              </div>
            </button>

            {installedPacks.map(pack => (
              <button
                key={pack.packageName}
                disabled={isLoadingPack}
                onClick={() => handleApplyPlayStorePack(pack.packageName)}
                className={`p-2.5 rounded-lg border text-left transition-all active:scale-95 flex items-center gap-2.5 ${
                  activePackPkg === pack.packageName ? 'bg-primary-fixed-dim/15 border-primary-fixed-dim text-primary-fixed-dim shadow-[0_0_8px_rgba(var(--primary-rgb),0.15)]' : 'bg-black/20 border-outline-variant/30 text-on-surface-variant/70 hover:text-white'
                }`}
              >
                {pack.icon ? (
                  <img src={pack.icon} className="w-8 h-8 object-contain rounded-lg shrink-0" alt="" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-primary-fixed-dim/20 flex items-center justify-center text-primary-fixed-dim shrink-0">
                    <span className="material-symbols-outlined text-base">extension</span>
                  </div>
                )}
                <div className="truncate">
                  <p className="font-bold text-[9px] truncate">{pack.label}</p>
                  <p className="text-[6.5px] text-on-surface-variant/50 uppercase truncate">Play Store Pack</p>
                </div>
              </button>
            ))}
          </div>
          {installedPacks.length === 0 && (
            <p className="text-[7.5px] text-on-surface-variant/40 italic">No third-party launcher icon packs detected on device. Download icon packs (Whicons, Delta, Lines, CandyCons) from Google Play Store to apply them here.</p>
          )}
        </div>

        {/* Per-App Icon Customizer & ZIP Ingestion */}
        <div className="flex flex-col gap-1.5 pt-2 border-t border-white/5">
          <label className="text-[9px] text-on-surface-variant font-mono-data uppercase">INDIVIDUAL APP GLYPH INGESTION</label>
          <select value={selectedIconAppPkg} onChange={e => setSelectedIconAppPkg(e.target.value)} className="w-full bg-black/45 border border-outline-variant/30 rounded px-2.5 py-1.5 text-xs text-[#00f2ff] focus:outline-none cursor-pointer font-mono-data">
            <option value="">-- Choose target app --</option>
            {Array.isArray(installedApps) && installedApps.map(app => <option key={app.packageId} value={app.packageId}>{app.label} ({app.packageId})</option>)}
          </select>
        </div>

        {selectedIconApp && (
          <div className="p-3 bg-black/25 rounded-lg border border-outline-variant/20 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl glass-icon-container border border-primary-fixed-dim/35 flex items-center justify-center shrink-0">
                {selectedIconApp.icon?.startsWith('data:') ? <img src={selectedIconApp.icon} className="w-6 h-6 object-contain rounded" alt="" /> : <span className="material-symbols-outlined text-lg text-primary-fixed-dim">{selectedIconApp.icon || 'rocket_launch'}</span>}
              </div>
              <div><h4 className="font-bold text-white text-xs">{selectedIconApp.label}</h4><p className="text-[7.5px] text-on-surface-variant/45">{selectedIconApp.packageId}</p></div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[7.5px] text-on-surface-variant/40 uppercase">CHOOSE CYBER SYSTEM GLYPH</p>
              <div className="grid grid-cols-6 gap-1.5">
                {ICON_GLYPHS.map(sym => (
                  <button key={sym} onClick={() => handleUpdateAppIcon(selectedIconAppPkg, sym)} className={`p-1.5 rounded border flex items-center justify-center transition-all active:scale-90 ${selectedIconApp.icon === sym ? 'bg-primary-fixed-dim/15 border-primary-fixed-dim text-primary-fixed-dim shadow-[0_0_6px_rgba(var(--primary-rgb),0.2)]' : 'bg-black/20 border-outline-variant/30 text-on-surface-variant/75 hover:text-white'}`} title={sym}>
                    <span className="material-symbols-outlined text-[13px]">{sym}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-1.5 border-t border-white/5">
              <p className="text-[7.5px] text-on-surface-variant/40 uppercase">OR INGEST CUSTOM GLYPH FILE</p>
              <div className="flex gap-2">
                <input type="file" accept="image/*" id="custom-app-icon-file-input" onChange={handleCustomIconUpload} className="hidden" />
                <label htmlFor="custom-app-icon-file-input" className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-primary-fixed-dim/30 bg-primary-fixed-dim/10 text-primary-fixed-dim hover:bg-primary-fixed-dim/20 cursor-pointer font-bold text-[8.5px] uppercase active:scale-95 transition-transform">
                  <span className="material-symbols-outlined text-[10px]">upload_file</span>Upload Image
                </label>
                <button onClick={() => { if (!selectedIconAppPkg) return; handleUpdateAppIcon(selectedIconAppPkg, DEFAULT_APP_ICONS[selectedIconAppPkg] || 'rocket_launch') }} className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-error/30 bg-error/10 text-error hover:bg-error/20 font-bold text-[8.5px] uppercase active:scale-95 transition-transform">
                  <span className="material-symbols-outlined text-xs">restart_alt</span>RESET
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                <p className="font-mono-data text-[9px] text-on-surface-variant uppercase tracking-wider">INGEST FULL ICON PACK (.ZIP)</p>
                <label htmlFor="zip-icon-pack-upload" className="flex items-center justify-center gap-1.5 px-3 py-2 w-full rounded border border-secondary-fixed-dim/30 bg-secondary-fixed-dim/10 text-secondary-fixed-dim hover:bg-secondary-fixed-dim/20 font-bold text-[8.5px] uppercase active:scale-95 transition-transform cursor-pointer text-center">
                  <span className="material-symbols-outlined text-xs">folder_zip</span>INGEST .ZIP ICON PACK
                </label>
                <input type="file" id="zip-icon-pack-upload" accept=".zip" className="hidden" onChange={handleIconPackUpload} />
                <p className="text-[7.5px] text-on-surface-variant/40 leading-relaxed">Icon pack zip files should contain image files named after package IDs (e.g. <code>com.whatsapp.png</code>).</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </SettingsSection>
  )
}
