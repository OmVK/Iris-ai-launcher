import { useState, useCallback, useMemo } from 'react'
import { launchApp } from '../components/LauncherPlugin'
import { useAppStore } from '../stores/appStore'
import { routeAppClick } from '../utils/appClickRouter'

export default function HomeScreenFolder({ folder, installedApps = [], onOpen, onRemove }) {
  const [isOpen, setIsOpen] = useState(false)
  const [folderName, setFolderName] = useState(folder?.name || 'Folder')
  const [isEditing, setIsEditing] = useState(false)

  const folderApps = useMemo(() => {
    if (!folder?.apps) return []
    return folder.apps
      .map(appId => installedApps.find(a => a.packageId === appId))
      .filter(Boolean)
      .slice(0, 4)
  }, [folder, installedApps])

  const allFolderApps = useMemo(() => {
    if (!folder?.apps) return []
    return folder.apps
      .map(appId => installedApps.find(a => a.packageId === appId))
      .filter(Boolean)
  }, [folder, installedApps])

  const handleAppClick = useCallback((app) => {
    const { lockedApps, isVaultUnlocked, setShowChronoLock, setChronoTarget, setActivePage } = useAppStore.getState()
    routeAppClick(app, {
      onNavigate: setActivePage,
      launchApp,
      onTriggerChronoLock: (target) => {
        setChronoTarget(target)
        setShowChronoLock(true)
        setIsOpen(false)
      },
      lockedApps,
      isVaultUnlocked
    })
  }, [])

  const handleFolderClick = useCallback(() => {
    setIsOpen(true)
    onOpen?.(folder)
  }, [folder, onOpen])

  const handleNameSubmit = useCallback(() => {
    setIsEditing(false)
  }, [])

  if (!folder) return null

  return (
    <>
      <div
        onClick={handleFolderClick}
        className="home-folder-preview glass-surface rounded-2xl p-2.5 border border-white/10 cursor-pointer hover:bg-white/10 transition-all group flex flex-col items-center justify-between aspect-square"
      >
        <div className="grid grid-cols-2 gap-1 w-full flex-1 p-0.5">
          {folderApps.map(app => (
            <div key={app.packageId} className="aspect-square rounded-lg overflow-hidden bg-white/5 flex items-center justify-center p-0.5 border border-white/5">
              {app.icon && typeof app.icon === 'string' && (app.icon.startsWith('data:') || app.icon.startsWith('http') || app.icon.startsWith('/')) ? (
                <img src={app.icon} alt="" className="w-full h-full object-contain" />
              ) : (
                <span className="material-symbols-outlined text-primary-fixed-dim/90 text-sm">{app.icon || 'apps'}</span>
              )}
            </div>
          ))}
          {folderApps.length < 4 && Array.from({ length: 4 - folderApps.length }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square rounded-lg bg-white/[0.02] border border-white/5" />
          ))}
        </div>
        <span className="text-[9px] font-bold text-white/80 font-mono-data truncate block text-center mt-1 w-full">
          {folderName}
        </span>
      </div>

      {isOpen && (
        <FolderExpandedView
          folder={folder}
          apps={allFolderApps}
          folderName={folderName}
          setFolderName={setFolderName}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          onNameSubmit={handleNameSubmit}
          onAppClick={handleAppClick}
          onClose={() => setIsOpen(false)}
          onRemove={onRemove}
        />
      )}
    </>
  )
}

function FolderExpandedView({ folder, apps, folderName, setFolderName, isEditing, setIsEditing, onNameSubmit, onAppClick, onClose, onRemove }) {
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-surface rounded-2xl p-5 max-w-sm w-full animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between mb-4">
          {isEditing ? (
            <input
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onBlur={onNameSubmit}
              onKeyDown={(e) => e.key === 'Enter' && onNameSubmit()}
              className="text-sm text-white/80 font-mono-data bg-transparent border-b border-white/20 focus:outline-none focus:border-[var(--primary-color)] flex-1 mr-2"
              autoFocus
            />
          ) : (
            <h3
              onClick={() => setIsEditing(true)}
              className="text-sm font-semibold text-white/80 font-mono-data cursor-pointer hover:text-white/90"
            >
              {folderName}
            </h3>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onRemove?.(folder.id)}
              className="text-[9px] text-red-400/50 font-mono-data hover:text-red-400"
            >
              DELETE
            </button>
            <button onClick={onClose} className="text-white/30 hover:text-white/60">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {apps.map(app => (
            <button
              key={app.packageId}
              onClick={() => onAppClick(app)}
              className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-white/5 transition-all"
            >
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/5 flex items-center justify-center p-1">
                {app.icon && typeof app.icon === 'string' && (app.icon.startsWith('data:') || app.icon.startsWith('http') || app.icon.startsWith('/')) ? (
                  <img src={app.icon} alt="" className="w-full h-full object-contain drop-shadow-md" />
                ) : (
                  <span className="material-symbols-outlined text-primary-fixed-dim text-lg">{app.icon || 'apps'}</span>
                )}
              </div>
              <span className="text-[8px] text-white/40 font-mono-data truncate max-w-[60px] text-center">
                {app.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
