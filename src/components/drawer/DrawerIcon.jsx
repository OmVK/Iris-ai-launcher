import React from 'react'
import { getIconContainerStyle } from '../../utils/IconShapeMask'

function DrawerIcon({ app, isLocked, size, iconTheme, iconShape = 'system' }) {
  const iconMaxPx = Math.round(size)
  const shapeStyle = getIconContainerStyle(iconShape, iconMaxPx)
  const symbolSizePx = Math.round(iconMaxPx * 0.55)

  return (
    <div
      style={shapeStyle}
      className={`glass-icon-container flex items-center justify-center relative transition-[background-color,border-color] duration-200 icon-theme-${iconTheme?.toLowerCase() || 'default'} overflow-hidden mx-auto ${
        isLocked ? 'border-error/30' : ''
      }`}
    >
      {isLocked ? (
        <span className="material-symbols-outlined text-error animate-pulse" style={{ fontSize: `${symbolSizePx}px` }}>lock</span>
      ) : app?.icon && (typeof app.icon === 'string') && (app.icon.startsWith('data:') || app.icon.startsWith('http') || app.icon.startsWith('/')) ? (
        <img src={app.icon} decoding="async" className="w-[65%] h-[65%] object-contain rounded-lg drop-shadow-md" alt="" />
      ) : (
        <span className="material-symbols-outlined text-primary-fixed-dim" style={{ fontSize: `${symbolSizePx}px` }}>{app?.icon || 'rocket_launch'}</span>
      )}
    </div>
  )
}

export default React.memo(DrawerIcon)

