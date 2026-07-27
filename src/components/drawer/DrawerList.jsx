import React from 'react'
import { IRIS_ICON_PACK } from '../../utils/IrisIconPack'
import HudIcon from '../HudIcon'
import HudFallbackIcon from '../HudFallbackIcon'
import { getIconContainerStyle } from '../../utils/IconShapeMask'

function DrawerList({ filteredApps, drawerIconSize, drawerTextSize, globalIconTheme, onContextMenu, onAppClick, iconShape = 'system' }) {
  return (
    <div className="max-w-xl mx-auto mt-6 flex flex-col gap-2 bg-black/10 rounded-xl border border-outline-variant/15 p-2 font-mono-data">
      {filteredApps.map((app) => {
        const iconSize = 40 * (drawerIconSize / 100)
        const shapeStyle = getIconContainerStyle(iconShape, iconSize)
        return (
          <div
            key={app.packageId}
            onContextMenu={(e) => onContextMenu(e, app)}
            onClick={(e) => onAppClick(e, app)}
            className="drawer-app-item app-icon-item flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer border-transparent hover:border-primary-fixed-dim/20 hover:bg-primary-fixed-dim/5"
          >
            <div className="flex items-center gap-3">
              <div
                style={shapeStyle}
                className={`glass-icon-container flex items-center justify-center relative transition-[background-color,border-color] duration-200 icon-theme-${globalIconTheme?.toLowerCase() || 'default'}`}
              >
                {app.icon && app.icon.startsWith('data:') ? (
                  (window.useGlobalHudIcons) ? (
                    IRIS_ICON_PACK[app.packageId] ? (
                      <HudIcon packageId={app.packageId} size={28 * (drawerIconSize / 100)} iconShape={iconShape} />
                    ) : (
                      <HudFallbackIcon src={app.icon} size={28 * (drawerIconSize / 100)} />
                    )
                  ) : (
                    <img src={app.icon} decoding="async" style={{ width: `${24 * (drawerIconSize / 100)}px`, height: `${24 * (drawerIconSize / 100)}px` }} className="object-contain rounded-md" alt="" />
                  )
                ) : (
                  <span className="material-symbols-outlined text-primary-fixed-dim" style={{ fontSize: `${18 * (drawerIconSize / 100)}px` }}>{app.icon}</span>
                )}
              </div>
              <div className="flex flex-col">
                <span
                  className="font-bold text-white"
                  style={{ fontSize: `${12 * (drawerTextSize / 100)}px` }}
                >
                  {app.label}
                </span>
                <span className="text-[7.5px] text-on-surface-variant/40 mt-0.5">{app.packageId}</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-[8px] text-on-surface-variant/65">
              <span>{app.storageSize}</span>
              <span className="bg-primary-fixed-dim/10 border border-primary-fixed-dim/20 text-primary-fixed-dim px-2 py-0.5 rounded text-[7px] font-bold tracking-wider">{app.cat}</span>
            </div>
          </div>
        )
      })}
      {filteredApps.length === 0 && (
        <div className="py-20 text-center text-xs text-on-surface-variant/40 italic">NO CORRESPONDING SYSTEM NODES INDEXED.</div>
      )}
    </div>
  )
}

export default React.memo(DrawerList)
