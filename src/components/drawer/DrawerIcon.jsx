import React from 'react'
import { IRIS_ICON_PACK } from '../../utils/IrisIconPack'
import HudIcon from '../HudIcon'
import HudFallbackIcon from '../HudFallbackIcon'
import { getIconContainerStyle } from '../../utils/IconShapeMask'

function DrawerIcon({ app, isLocked, size, iconTheme, iconShape = 'system' }) {
  const iconMaxPx = Math.round(size)
  const shapeStyle = getIconContainerStyle(iconShape, iconMaxPx)

  return (
    <div
      style={shapeStyle}
      className={`glass-icon-container flex items-center justify-center relative transition-[background-color,border-color] duration-200 icon-theme-${iconTheme?.toLowerCase() || 'default'} overflow-hidden mx-auto ${
        isLocked ? 'border-error/30' : ''
      }`}
    >
      {isLocked ? (
        <span className="material-symbols-outlined text-error animate-pulse" style={{ fontSize: '1em' }}>lock</span>
      ) : app.icon && app.icon.startsWith('data:') ? (
        (window.useGlobalHudIcons) ? (
          IRIS_ICON_PACK[app.packageId] ? (
            <HudIcon packageId={app.packageId} size={28} />
          ) : (
            <HudFallbackIcon src={app.icon} size={28} />
          )
        ) : (
          <img src={app.icon} decoding="async" className="w-[60%] h-[60%] object-contain rounded-lg drop-shadow-md" alt="" />
        )
      ) : (
        <span className="material-symbols-outlined text-primary-fixed-dim" style={{ fontSize: '1em' }}>{app.icon}</span>
      )}
    </div>
  )
}

export default React.memo(DrawerIcon)
