import { useState } from 'react'
import SettingsSection from './SettingsSection'

const DEFAULT_APP_ICONS = {}

const ICON_GLYPHS = ['settings', 'chat', 'token', 'password', 'database', 'play_circle', 'rocket_launch', 'bolt', 'visibility', 'face', 'memory', 'vpn_key', 'shield', 'dns', 'radio', 'radar', 'monitoring', 'code', 'space_dashboard', 'explore', 'api', 'globe']

export default function AppIconsSection({ expandedSections, toggleSection, installedApps, setInstalledApps }) {
  const [selectedIconAppPkg, setSelectedIconAppPkg] = useState('')
  const [useGlobalHudIcons, setUseGlobalHudIcons] = useState(window.useGlobalHudIcons !== false)
  const selectedIconApp = Array.isArray(installedApps) ? installedApps.find(app => app.packageId === selectedIconAppPkg) : null

  const handleUpdateAppIcon = (packageId, newIcon) => {
    if (typeof setInstalledApps === 'function') setInstalledApps(prev => prev.map(app => app.packageId === packageId ? { ...app, icon: newIcon } : app))
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
      if (matchCount > 0 && typeof setInstalledApps === 'function') { setInstalledApps(updatedApps); alert(`Successfully applied ${matchCount} icons!`) } else { alert("No matching icons found.") }
    } catch (err) { alert("Failed to parse ZIP.") }
  }

  return (
    <SettingsSection title="APP ICON CUSTOMIZER" icon="settings_applications" sectionKey="appIcons" expandedSections={expandedSections} toggleSection={toggleSection}>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-lg bg-primary-fixed-dim/10 border border-primary-fixed-dim/20">
          <div>
            <h4 className="font-bold text-[10px] text-primary-fixed-dim">Enable Iris HUD Icons Globally</h4>
            <p className="text-[7.5px] text-on-surface-variant/60">Automatically use dynamic vector graphics for all supported apps</p>
          </div>
          <button onClick={() => { const v = !useGlobalHudIcons; setUseGlobalHudIcons(v); window.useGlobalHudIcons = v; localStorage.setItem('use_global_hud_icons', v.toString()) }}
            className={`w-10 h-5 rounded-full relative transition-colors ${useGlobalHudIcons ? 'bg-primary-fixed-dim' : 'bg-white/10'}`}>
            <div className={`absolute top-0.5 bottom-0.5 w-4 rounded-full bg-black transition-transform ${useGlobalHudIcons ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] text-on-surface-variant">SELECT TARGET SYSTEM APP</label>
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
                <p className="font-mono-data text-[9px] text-on-surface-variant uppercase tracking-wider">APPLY FULL ICON PACK (.ZIP)</p>
                <label htmlFor="zip-icon-pack-upload" className="flex items-center justify-center gap-1.5 px-3 py-2 w-full rounded border border-secondary-fixed-dim/30 bg-secondary-fixed-dim/10 text-secondary-fixed-dim hover:bg-secondary-fixed-dim/20 font-bold text-[8.5px] uppercase active:scale-95 transition-transform cursor-pointer text-center">
                  <span className="material-symbols-outlined text-xs">folder_zip</span>UPLOAD .ZIP ICON PACK
                </label>
                <input type="file" id="zip-icon-pack-upload" accept=".zip" className="hidden" onChange={handleIconPackUpload} />
                <p className="text-[7.5px] text-on-surface-variant/40 leading-relaxed">Icon packs should contain image files named after the app&apos;s package name (e.g. <code>com.whatsapp.png</code>).</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </SettingsSection>
  )
}
