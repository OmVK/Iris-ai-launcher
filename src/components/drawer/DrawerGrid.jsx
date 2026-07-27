import React from 'react'
import DrawerIcon from '../drawer/DrawerIcon'

function DrawerGrid({ filteredApps, gridColumns, gridRows, drawerIconSize, drawerTextSize, showAppLabels, globalIconTheme, onContextMenu, onAppClick, iconShape = 'system' }) {
  const iconMaxPx = Math.round(48 * (drawerIconSize / 100))
  return (
    <div
      className="mt-4 px-1 grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${gridRows}, auto)` }}
    >
      {filteredApps.map((app) => {
        return (
          <div
            key={app.packageId}
            onContextMenu={(e) => onContextMenu(e, app)}
            onClick={(e) => onAppClick(e, app)}
            className="drawer-app-item flex flex-col items-center gap-1.5 p-1.5 rounded-xl cursor-pointer select-none hover:bg-white/5 border border-transparent hover:border-white/10"
          >
            <DrawerIcon app={app} size={iconMaxPx} iconTheme={globalIconTheme} iconShape={iconShape} />
            {showAppLabels && (
              <span
                className="font-label-caps text-center leading-tight line-clamp-2 text-on-surface-variant"
                style={{ fontSize: `${9 * (drawerTextSize / 100)}px` }}
              >
                {app.label}
              </span>
            )}
          </div>
        )
      })}
      {filteredApps.length === 0 && (
        <div className="col-span-full py-20 text-center text-xs text-on-surface-variant/40 italic">NO SYSTEM NODES INDEXED.</div>
      )}
    </div>
  )
}

export default React.memo(DrawerGrid)
