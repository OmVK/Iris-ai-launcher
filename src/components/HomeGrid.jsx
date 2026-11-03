import { getIconContainerStyle } from '../utils/IconShapeMask'
import { IRIS_ICON_PACK } from '../utils/IrisIconPack'

export default function HomeGrid({
  installedApps,
  lockedApps,
  globalIconTheme = 'DEFAULT',
  showAppLabels,
  homeIconSize,
  homeTextSize,
  gridColumns,
  gridRows,
  handleAppClick,
  handleContextMenu,
}) {
  const homeApps = installedApps.filter(app => app.isHome && !(Array.isArray(lockedApps) && lockedApps.includes(app.packageId)))

  const iconPixel = 48 * (homeIconSize / 100)
  const fontPixel = 8 * (homeTextSize / 100)
  const activeTheme = (globalIconTheme || 'DEFAULT').toUpperCase()
  const shapeStyle = getIconContainerStyle(activeTheme, iconPixel)
  const useVectorGlyph = activeTheme === 'GLYPH_ONLY' || activeTheme === 'RETRO' || activeTheme === 'SOLID'

  const dynamicGridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${gridRows}, auto)`,
    gap: '20px 16px',
    alignItems: 'center',
    transform: 'perspective(1000px) rotateX(var(--home-tilt-y, 0deg)) rotateY(var(--home-tilt-x, 0deg))',
    transformStyle: 'preserve-3d',
    transition: 'transform 0.1s ease-out',
    willChange: 'transform'
  }

  return (
    <div
      style={dynamicGridStyle}
      className="max-w-sm mx-auto w-full px-2 pb-4 pointer-events-none"
    >
      {homeApps.map((app) => {
        const vectorGlyph = useVectorGlyph ? IRIS_ICON_PACK[app.packageId] : null
        const isImgIcon = app.icon && typeof app.icon === 'string' && (app.icon.startsWith('data:') || app.icon.startsWith('http') || app.icon.startsWith('/'))

        return (
          <div
            key={app.packageId}
            onContextMenu={(e) => handleContextMenu(e, app)}
            onClick={(e) => handleAppClick(e, app)}
            className="app-icon-item flex flex-col items-center gap-1.5 group cursor-pointer active:scale-90 transition-all select-none relative pointer-events-auto"
          >
            <div
              style={{
                ...shapeStyle,
                transform: 'translateZ(10px)',
              }}
              className={`flex items-center justify-center border transition-all duration-200 icon-theme-${activeTheme.toLowerCase()} glass-icon-container app-icon-hover-effect`}
            >
              {vectorGlyph ? (
                <div
                  style={{ width: `${iconPixel * 0.62}px`, height: `${iconPixel * 0.62}px` }}
                  className="flex items-center justify-center"
                >
                  {vectorGlyph}
                </div>
              ) : isImgIcon ? (
                <img
                  src={app.icon}
                  loading="lazy"
                  style={{ width: `${iconPixel * 0.58}px`, height: `${iconPixel * 0.58}px` }}
                  className="object-contain rounded-md"
                  alt=""
                />
              ) : (
                <span
                  style={{ fontSize: `${iconPixel * 0.45}px` }}
                  className="material-symbols-outlined transition-colors text-primary-fixed-dim/80 group-hover:text-primary-fixed-dim"
                >
                  {app.icon || 'apps'}
                </span>
              )}
            </div>
            {showAppLabels && (
              <span
                style={{
                  fontSize: `${fontPixel}px`,
                  color: activeTheme === 'RETRO' ? '#39ff14' : undefined,
                }}
                className="font-label-caps tracking-widest uppercase transition-colors text-center truncate w-full px-0.5 text-on-surface-variant/70 group-hover:text-primary-fixed-dim"
              >
                {app.label}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
