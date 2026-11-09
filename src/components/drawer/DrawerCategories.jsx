import React, { useMemo } from 'react'
import { IRIS_ICON_PACK } from '../../utils/IrisIconPack'

function DrawerCategories({ autoCategoriesItems, installedApps, drawerIconSize, drawerTextSize, globalIconTheme = 'DEFAULT', onAppClick, onContextMenu, onCreateFolder }) {
  const appLookup = useMemo(() => {
    const map = new Map()
    for (const app of installedApps) map.set(app.packageId, app)
    return map
  }, [installedApps])
  const resolveApp = (id) => appLookup.get(id)

  const _scale = drawerIconSize / 100
  const _catTextPx = Math.round(11 * (drawerTextSize / 100))
  const catNamePx = Math.round(13 * (drawerTextSize / 100))
  const activeTheme = (globalIconTheme || 'DEFAULT').toUpperCase()
  const themeClass = `icon-theme-${activeTheme.toLowerCase()}`
  const useVectorGlyph = activeTheme === 'GLYPH_ONLY' || activeTheme === 'RETRO' || activeTheme === 'SOLID'

  const renderAppThumb = (pApp, sizeClass = 'w-full h-full') => {
    const vectorGlyph = useVectorGlyph && pApp?.packageId ? IRIS_ICON_PACK[pApp.packageId] : null
    if (vectorGlyph) {
      return <div className="w-[75%] h-[75%] flex items-center justify-center">{vectorGlyph}</div>
    }
    if (pApp?.icon && typeof pApp.icon === 'string' && (pApp.icon.startsWith('data:') || pApp.icon.startsWith('http') || pApp.icon.startsWith('/'))) {
      return <img src={pApp.icon} decoding="async" className={`${sizeClass} object-contain`} alt="" />
    }
    return <span className="material-symbols-outlined text-primary-fixed-dim text-xl">{pApp?.icon || 'apps'}</span>
  }

  return (
    <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto mt-4 px-3 pb-20">
      {autoCategoriesItems.map((app) => {
        const safeApps = Array.isArray(app.apps) ? app.apps : []
        const resolvedApps = safeApps.map(id => typeof id === 'string' ? resolveApp(id) : id).filter(Boolean)
        const appCount = resolvedApps.length

        return (
          <div
            key={app.id}
            onClick={(e) => onAppClick(e, app)}
            onContextMenu={(e) => onContextMenu(e, app)}
            className="app-icon-item iris-card border border-white/10 rounded-2xl p-3.5 flex flex-col gap-3 cursor-pointer group hover:border-primary-fixed-dim/40 shadow-xl transition-all select-none"
          >
            {/* App Preview Area */}
            <div className="w-full aspect-square rounded-xl bg-white/[0.03] border border-white/5 p-2 flex items-center justify-center overflow-hidden">
              {appCount === 0 ? (
                <div className="flex flex-col items-center justify-center text-white/20">
                  <span className="material-symbols-outlined text-3xl mb-1">folder_open</span>
                  <span className="text-[9px] font-mono uppercase tracking-wider">Empty</span>
                </div>
              ) : appCount === 1 ? (
                /* Single App: Large Prominent Icon */
                <div className={`w-16 h-16 flex items-center justify-center p-2 group-hover:scale-105 transition-transform glass-icon-container ${themeClass}`}>
                  {renderAppThumb(resolvedApps[0], 'w-[75%] h-[75%]')}
                </div>
              ) : (
                /* Multi App: 2x2 Grid with Large, Clear Icons */
                <div className="grid grid-cols-2 gap-1.5 w-full h-full">
                  {resolvedApps.slice(0, 4).map(pApp => (
                    <div 
                      key={pApp.packageId} 
                      className={`aspect-square flex items-center justify-center p-1.5 transition-colors glass-icon-container ${themeClass}`}
                    >
                      {renderAppThumb(pApp, 'w-[75%] h-[75%]')}
                    </div>
                  ))}
                  {Array.from({ length: Math.max(0, 4 - Math.min(4, resolvedApps.length)) }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-center">
                      <span className="material-symbols-outlined text-white/10 text-xs">remove</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Folder Label and Badge */}
            <div className="mt-auto flex items-center justify-between gap-1">
              <span className="font-bold text-white tracking-wider uppercase truncate" style={{ fontSize: `${catNamePx}px` }}>
                {app.name}
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-primary-fixed-dim/15 text-primary-fixed-dim border border-primary-fixed-dim/20 whitespace-nowrap">
                {appCount} {appCount === 1 ? 'APP' : 'APPS'}
              </span>
            </div>
          </div>
        )
      })}

      {/* Create Folder Card */}
      <div
        onClick={onCreateFolder}
        className="bg-primary-fixed-dim/5 border border-primary-fixed-dim/20 border-dashed rounded-2xl p-3.5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-transform duration-200 active:scale-95 hover:bg-primary-fixed-dim/10 group min-h-[180px]"
      >
        <div className="w-14 h-14 rounded-full bg-primary-fixed-dim/10 flex items-center justify-center text-primary-fixed-dim group-hover:scale-110 transition-transform">
          <span className="material-symbols-outlined text-3xl">create_new_folder</span>
        </div>
        <span className="text-xs font-bold text-primary-fixed-dim tracking-wider uppercase mt-2">Create Folder</span>
        <span className="text-[9px] text-primary-fixed-dim/60 text-center px-4 font-mono-data">Organize your apps</span>
      </div>
    </div>
  )
}

export default React.memo(DrawerCategories)
