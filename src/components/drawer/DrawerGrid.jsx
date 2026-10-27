import React, { memo } from 'react'
import DrawerIcon from '../drawer/DrawerIcon'

const DrawerGridItem = memo(function DrawerGridItem({
  app,
  widthPercent,
  iconMaxPx,
  globalIconTheme,
  iconShape,
  showAppLabels,
  drawerTextSize,
  onContextMenu,
  onAppClick
}) {
  return (
    <div
      style={{ width: widthPercent }}
      className="p-1 box-border shrink-0"
    >
      <div
        onContextMenu={(e) => onContextMenu(e, app)}
        onClick={(e) => onAppClick(e, app)}
        className="drawer-app-item flex flex-col items-center gap-1.5 p-1.5 rounded-xl cursor-pointer select-none hover:bg-white/5 border border-transparent hover:border-white/10"
      >
        <DrawerIcon app={app} size={iconMaxPx} iconTheme={globalIconTheme} iconShape={iconShape} />
        {showAppLabels && (
          <span
            className="font-label-caps text-center leading-tight truncate w-full text-on-surface-variant block px-0.5"
            style={{ fontSize: `${9 * (drawerTextSize / 100)}px` }}
          >
            {app.label}
          </span>
        )}
      </div>
    </div>
  )
})

function DrawerGrid({
  filteredApps,
  gridColumns = 5,
  _gridRows,
  drawerIconSize = 100,
  drawerTextSize = 100,
  showAppLabels = true,
  globalIconTheme = 'DEFAULT',
  onContextMenu,
  onAppClick,
  iconShape = 'system'
}) {
  const iconMaxPx = Math.round(48 * (drawerIconSize / 100))
  const widthPercent = `${100 / Math.max(1, gridColumns)}%`

  return (
    <div className="mt-4 px-1 flex flex-wrap w-full">
      {filteredApps.map((app) => (
        <DrawerGridItem
          key={app.packageId}
          app={app}
          widthPercent={widthPercent}
          iconMaxPx={iconMaxPx}
          globalIconTheme={globalIconTheme}
          iconShape={iconShape}
          showAppLabels={showAppLabels}
          drawerTextSize={drawerTextSize}
          onContextMenu={onContextMenu}
          onAppClick={onAppClick}
        />
      ))}
      {filteredApps.length === 0 && (
        <div className="w-full py-20 text-center text-xs text-on-surface-variant/40 italic">
          NO SYSTEM NODES INDEXED.
        </div>
      )}
    </div>
  )
}

export default React.memo(DrawerGrid)
