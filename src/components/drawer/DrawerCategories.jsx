import React, { useMemo } from 'react'

function DrawerCategories({ autoCategoriesItems, installedApps, drawerIconSize, drawerTextSize, onAppClick, onContextMenu, onCreateFolder }) {
  const appLookup = useMemo(() => {
    const map = new Map()
    for (const app of installedApps) map.set(app.packageId, app)
    return map
  }, [installedApps])
  const resolveApp = (id) => appLookup.get(id)

  return (
    <div className="grid grid-cols-2 gap-3 max-w-2xl mx-auto mt-4 px-3 pb-24">
      {autoCategoriesItems.map((app) => {
        const safeApps = Array.isArray(app.apps) ? app.apps : []
        const resolvedApps = safeApps.map(id => typeof id === 'string' ? resolveApp(id) : id).filter(Boolean)
        const catIconPx = Math.round(20 * (drawerIconSize / 100))
        const catSmallIconPx = Math.round(16 * (drawerIconSize / 100))
        const catTextPx = Math.round(10 * (drawerTextSize / 100))
        const catNamePx = Math.round(11 * (drawerTextSize / 100))
        return (
          <div
            key={app.id}
            onClick={(e) => onAppClick(e, app)}
            onContextMenu={(e) => onContextMenu(e, app)}
            className="app-icon-item bg-black/20 border border-white/5 rounded-2xl p-3 flex flex-col gap-2 cursor-pointer group hover:bg-white/5 hover:border-white/10 select-none"
          >
            <div className="grid grid-cols-2 gap-2 mb-1">
              {resolvedApps.slice(0, 4).map(pApp => (
                <div key={pApp.packageId} className="aspect-square rounded-xl bg-white/5 flex items-center justify-center p-2 shadow-inner border border-white/5 group-hover:border-white/10 transition-colors">
                  {pApp.icon && typeof pApp.icon === 'string' && pApp.icon.startsWith('data:') ? (
                    <img src={pApp.icon} loading="lazy" className="w-full h-full object-contain drop-shadow-md" alt="" />
                  ) : (
                    <span className="material-symbols-outlined text-primary-fixed-dim/80" style={{ fontSize: `${catIconPx}px` }}>{pApp.icon}</span>
                  )}
                </div>
              ))}
              {Array.from({ length: Math.max(0, 4 - resolvedApps.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square rounded-xl bg-white/5 flex items-center justify-center p-2 shadow-inner border border-white/5">
                  <span className="material-symbols-outlined text-white/5 text-xs">remove</span>
                </div>
              ))}
            </div>
            <div className="mt-auto pt-2 flex items-center justify-between">
              <span className="font-bold text-white tracking-wider uppercase opacity-90" style={{ fontSize: `${catNamePx}px` }}>{app.name}</span>
              {!app.isAuto && <span className="material-symbols-outlined text-primary-fixed-dim" style={{ fontSize: `${catTextPx}px` }}>folder_special</span>}
            </div>
          </div>
        )
      })}
      <div
        onClick={onCreateFolder}
        className="bg-primary-fixed-dim/5 border border-primary-fixed-dim/20 border-dashed rounded-2xl p-3 flex flex-col items-center justify-center gap-2 cursor-pointer transition-transform duration-200 active:scale-95 hover:bg-primary-fixed-dim/10 group min-h-[160px]"
      >
        <div className="w-12 h-12 rounded-full bg-primary-fixed-dim/10 flex items-center justify-center text-primary-fixed-dim group-hover:scale-110 transition-transform">
          <span className="material-symbols-outlined text-2xl">create_new_folder</span>
        </div>
        <span className="text-xs font-bold text-primary-fixed-dim tracking-wider uppercase mt-2">Create Folder</span>
        <span className="text-[9px] text-primary-fixed-dim/60 text-center px-4 font-mono-data">Organize your apps</span>
      </div>
    </div>
  )
}

export default React.memo(DrawerCategories)
