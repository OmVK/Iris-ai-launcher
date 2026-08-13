export default function HomeGrid({
  installedApps,
  lockedApps,
  globalIconTheme,
  showAppLabels,
  homeIconSize,
  homeTextSize,
  gridColumns,
  gridRows,
  tilt,
  handleAppClick,
  handleContextMenu,
  IRIS_ICON_PACK,
  HudIcon,
  HudFallbackIcon
}) {
  const homeApps = installedApps.filter(app => app.isHome && !(Array.isArray(lockedApps) && lockedApps.includes(app.packageId)))

  const iconPixel = 48 * (homeIconSize / 100)
  const fontPixel = 8 * (homeTextSize / 100)

  const dynamicGridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${gridRows}, auto)`,
    gap: '20px 16px',
    alignItems: 'center',
    transform: `perspective(1000px) rotateX(${-tilt.y / 1.5}deg) rotateY(${tilt.x / 1.5}deg)`,
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
        return (
          <div
            key={app.packageId}
            onContextMenu={(e) => handleContextMenu(e, app)}
            onClick={(e) => handleAppClick(e, app)}
            className="app-icon-item flex flex-col items-center gap-1.5 group cursor-pointer active:scale-90 transition-all select-none relative pointer-events-auto"
          >

            <div
              style={{
                width: `${iconPixel}px`,
                height: `${iconPixel}px`,
                transform: `translateZ(10px)`,
                boxShadow: '0 4px 16px rgba(var(--primary-rgb), 0.22), 0 0 8px rgba(var(--primary-rgb), 0.08)'
              }}
              className="flex items-center justify-center rounded-xl border transition-[background-color,border-color] duration-200 icon-theme-${globalIconTheme.toLowerCase()} border-primary-fixed-dim/20 glass-icon-container app-icon-hover-effect"
            >
              {app.icon && typeof app.icon === 'string' && app.icon.startsWith('data:') ? (
                (globalIconTheme === 'HUD' || globalIconTheme === 'CYBER' || window.useGlobalHudIcons) ? (
                  IRIS_ICON_PACK[app.packageId] ? (
                    <HudIcon packageId={app.packageId} size={iconPixel * 0.65} />
                  ) : (
                    <HudFallbackIcon src={app.icon} size={iconPixel * 0.65} />
                  )
                ) : (
                  <img
                    src={app.icon}
                    loading="lazy"
                    style={{ width: `${iconPixel * 0.55}px`, height: `${iconPixel * 0.55}px` }}
                    className="object-contain rounded-md"
                    alt=""
                  />
                )
              ) : (
                <span
                  style={{ fontSize: `${iconPixel * 0.45}px` }}
                  className={`material-symbols-outlined transition-colors text-primary-fixed-dim/60 group-hover:text-primary-fixed-dim`}
                >
                  {app.icon}
                </span>
              )}
            </div>
            {showAppLabels && (
              <span
                style={{ fontSize: `${fontPixel}px` }}
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
