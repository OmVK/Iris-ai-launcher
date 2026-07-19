export default function AppContextMenu({ activeContextMenu, onRemoveFromHome, onToggleHomePlacement, onLockApp, onTriggerUninstall, onOpenAppInfo, onClose }) {
  if (!activeContextMenu) return null
  const { app, x, y } = activeContextMenu

  const hasRemoveFromHome = typeof onRemoveFromHome === 'function'
  const hasToggleHomePlacement = typeof onToggleHomePlacement === 'function'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-transparent"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose() }}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onClose() }}
      />

      {/* Context Menu */}
      <div
        style={{ position: 'fixed', left: `${x}px`, top: `${y}px` }}
        className="bg-[#020617]/95 border border-primary-fixed-dim/40 rounded-xl p-1.5 z-50 shadow-[0_0_25px_rgba(var(--primary-rgb),0.35)] w-44 font-mono-data text-[10px] animate-in fade-in zoom-in-95 duration-100"
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* App Header Tag */}
        <div className="px-2 py-1.5 border-b border-white/5 flex items-center gap-2 text-on-surface-variant mb-1">
          {app.icon && app.icon.startsWith('data:') ? (
            <img src={app.icon} className="w-4 h-4 object-contain rounded" alt="" />
          ) : (
            <span className="material-symbols-outlined text-[12px] text-primary-fixed-dim">{app.icon}</span>
          )}
          <span className="font-bold truncate uppercase text-primary-fixed-dim">{app.label}</span>
        </div>

        {/* Add/Remove from Home Option */}
        {hasToggleHomePlacement && (
          <button
            onClick={() => onToggleHomePlacement(app)}
            className="w-full px-2.5 py-1.5 rounded flex items-center gap-2 hover:bg-white/5 text-left text-on-surface-variant hover:text-white"
          >
            <span className="material-symbols-outlined text-xs text-secondary-fixed-dim">
              {app.isHome ? 'close' : 'add'}
            </span>
            <span>{app.isHome ? 'Remove from Home' : 'Add to Home'}</span>
          </button>
        )}

        {/* Remove from Home (Home.jsx only) */}
        {hasRemoveFromHome && (
          <button
            onClick={() => onRemoveFromHome(app)}
            className="w-full px-2.5 py-1.5 rounded flex items-center gap-2 hover:bg-white/5 text-left text-on-surface-variant hover:text-white"
          >
            <span className="material-symbols-outlined text-xs text-secondary-fixed-dim">close</span>
            <span>Remove from Home</span>
          </button>
        )}

        {/* Lock App Option */}
        <button
            onClick={() => onLockApp(app)}
            className="w-full px-2.5 py-1.5 rounded flex items-center gap-2 hover:bg-primary-fixed-dim/15 text-left text-on-surface-variant hover:text-primary-fixed-dim"
          >
            <span className="material-symbols-outlined text-xs text-primary-fixed-dim">lock</span>
            <span>Secure Lock</span>
          </button>

        {/* Uninstall Option */}
        <button
          onClick={() => onTriggerUninstall(app)}
          className="w-full px-2.5 py-1.5 rounded flex items-center gap-2 hover:bg-error-container/10 text-left text-on-surface-variant hover:text-error"
        >
          <span className="material-symbols-outlined text-xs text-error">delete</span>
          <span>Uninstall app</span>
        </button>

        {/* Info Option */}
        <button
          onClick={() => onOpenAppInfo(app)}
          className="w-full px-2.5 py-1.5 rounded flex items-center gap-2 hover:bg-white/5 text-left text-on-surface-variant hover:text-white border-t border-white/5 mt-1 pt-1.5"
        >
          <span className="material-symbols-outlined text-xs text-primary-fixed-dim">info</span>
          <span>App Info</span>
        </button>
      </div>
    </>
  )
}
