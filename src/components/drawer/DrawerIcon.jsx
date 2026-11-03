import React from 'react'
import { getIconContainerStyle } from '../../utils/IconShapeMask'
import { IRIS_ICON_PACK } from '../../utils/IrisIconPack'

function DrawerIcon({ app, isLocked, size, iconTheme = 'DEFAULT' }) {
  const iconMaxPx = Math.round(size)
  const activeTheme = (iconTheme || 'DEFAULT').toUpperCase()
  const shapeStyle = getIconContainerStyle(activeTheme, iconMaxPx)
  const symbolSizePx = Math.round(iconMaxPx * 0.55)
  const useVectorGlyph = activeTheme === 'GLYPH_ONLY' || activeTheme === 'RETRO' || activeTheme === 'SOLID'
  const vectorGlyph = !isLocked && useVectorGlyph && app?.packageId ? IRIS_ICON_PACK[app.packageId] : null
  const isImgIcon = app?.icon && typeof app.icon === 'string' && (app.icon.startsWith('data:') || app.icon.startsWith('http') || app.icon.startsWith('/'))

  return (
    <div
      style={shapeStyle}
      className={`glass-icon-container flex items-center justify-center relative transition-all duration-200 icon-theme-${activeTheme.toLowerCase()} overflow-hidden mx-auto ${
        isLocked ? 'border-error/30' : ''
      }`}
    >
      {isLocked ? (
        <span className="material-symbols-outlined text-error animate-pulse" style={{ fontSize: `${symbolSizePx}px` }}>lock</span>
      ) : vectorGlyph ? (
        <div className="w-[65%] h-[65%] flex items-center justify-center">
          {vectorGlyph}
        </div>
      ) : isImgIcon ? (
        <img src={app.icon} decoding="async" className="w-[65%] h-[65%] object-contain rounded-lg" alt="" />
      ) : (
        <span className="material-symbols-outlined text-primary-fixed-dim" style={{ fontSize: `${symbolSizePx}px` }}>{app?.icon || 'rocket_launch'}</span>
      )}
    </div>
  )
}

export default React.memo(DrawerIcon)
