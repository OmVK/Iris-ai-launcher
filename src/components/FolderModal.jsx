import React, { useState, useMemo } from 'react'
import { launchApp } from './LauncherPlugin'
import { IRIS_ICON_PACK } from '../utils/IrisIconPack'
import HudFallbackIcon from './HudFallbackIcon'

const HudIcon = React.memo(function HudIcon({ packageId, size }) {
  <div style={{
    width: `${size}px`,
    height: `${size}px`,
  }} className="flex items-center justify-center icon-circle-minimal-outline hud-icon-transition">
    {IRIS_ICON_PACK[packageId]}
  </div>
})

export default function FolderModal({ 
  folder, 
  onClose, 
  onUpdateFolder, 
  onDeleteFolder, 
  installedApps, 
  globalIconTheme,
  onTriggerChronoLock,
  onTriggerVault,
  activePage,
  setActivePage
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(folder.name || '')
  
  // Create a local set of selected apps for editing
  const [selectedApps, setSelectedApps] = useState(() => new Set(folder.apps || []))

  // Find actual app objects for the folder
  const folderApps = useMemo(() => {
    return (folder?.apps || [])
      .map(pkgId => (installedApps || []).find(a => a?.packageId === pkgId))
      .filter(Boolean)
  }, [folder?.apps, installedApps])

  const handleAppClick = (app) => {
    if (isEditing) {
      // Toggle selection
      const newSet = new Set(selectedApps)
      if (newSet.has(app.packageId)) {
        newSet.delete(app.packageId)
      } else {
        newSet.add(app.packageId)
      }
      setSelectedApps(newSet)
    } else {
      // Launch App
      if (app.path) setActivePage(app.path)
      else launchApp(app.packageId, app.label)
    }
  }

  const handleSave = () => {
    onUpdateFolder({
      ...folder,
      name: editName,
      apps: Array.from(selectedApps)
    })
    setIsEditing(false)
  }

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70" 
      onClick={onClose}
    >
      <div 
        className="glass-surface border border-primary-fixed-dim/40 rounded-[2rem] w-full max-w-sm m-6 p-6 shadow-[0_0_40px_rgba(var(--primary-rgb),0.2)] max-h-[70vh] flex flex-col"
        onClick={e => e.stopPropagation()}
        onTouchStart={e => e.stopPropagation()}
        onTouchEnd={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          {isEditing ? (
            <input 
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="bg-black/20 border border-primary-fixed-dim/30 rounded-lg px-3 py-1.5 text-white font-bold outline-none focus:border-primary-fixed-dim w-48"
              placeholder="Folder Name"
            />
          ) : (
            <h2 className="text-xl font-bold text-white tracking-wide">{folder.name}</h2>
          )}
          
          <div className="flex gap-2">
            {!folder.isIrisFolder && (
              <button 
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                className={`p-2 rounded-full flex items-center justify-center transition-colors ${
                  isEditing ? 'bg-primary-fixed-dim text-black' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isEditing ? 'check' : 'edit'}
                </span>
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Editing Grid (All Apps Checklist) */}
        {isEditing ? (
          <div className="overflow-y-auto pr-2 grid grid-cols-1 gap-2 custom-scrollbar flex-1 max-h-[50vh]">
            {(installedApps || []).map(app => (
              <div 
                key={app.packageId}
                onClick={() => handleAppClick(app)}
                className={`flex items-center justify-between p-3 rounded-xl border transition-colors cursor-pointer ${
                  selectedApps.has(app.packageId) 
                    ? 'border-primary-fixed-dim bg-primary-fixed-dim/10' 
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    selectedApps.has(app.packageId) ? '' : 'grayscale'
                  }`}>
                    {app.icon && (typeof app.icon === 'string') && (app.icon.startsWith('data:') || app.icon.startsWith('http') || app.icon.startsWith('/')) ? (
                      <img src={app.icon} className="w-6 h-6 object-contain rounded" alt="" />
                    ) : (
                      <span className="material-symbols-outlined text-primary-fixed-dim" style={{ fontSize: '18px' }}>{app.icon || 'rocket_launch'}</span>
                    )}
                  </div>
                  <span className="text-sm font-medium text-white">{app.label}</span>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  selectedApps.has(app.packageId) ? 'border-primary-fixed-dim bg-primary-fixed-dim' : 'border-white/30'
                }`}>
                  {selectedApps.has(app.packageId) && <span className="material-symbols-outlined text-black text-[14px]">check</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* View Grid (4-column dense grid) */
          <div className="grid grid-cols-4 gap-y-6 gap-x-2 min-h-[10rem] content-start overflow-y-auto scroll-container flex-1 max-h-[50vh] pr-1">
            {folderApps.length > 0 ? folderApps.map(app => (
              <div 
                key={app.packageId}
                onClick={() => handleAppClick(app)}
                className="flex flex-col items-center gap-1.5 cursor-pointer active:scale-90 transition-transform group"
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10 group-hover:bg-white/10 transition-colors icon-theme-${globalIconTheme.toLowerCase()}`}>
                  {app.icon && (typeof app.icon === 'string') && (app.icon.startsWith('data:') || app.icon.startsWith('http') || app.icon.startsWith('/')) ? (
                    <img src={app.icon} className="w-8 h-8 object-contain rounded-md drop-shadow-md" alt="" />
                  ) : (
                    <span className="material-symbols-outlined text-white/80" style={{ fontSize: '24px' }}>{app.icon || 'rocket_launch'}</span>
                  )}
                </div>
                <span className="text-[9px] text-white/70 font-medium truncate w-full text-center tracking-wide">{app.label}</span>
              </div>
            )) : (
              <div className="col-span-4 py-12 text-center text-white/40 text-sm font-medium">
                Empty Folder
              </div>
            )}
          </div>
        )}

        {isEditing && !folder.isIrisFolder && (
          <div className="mt-6 pt-4 border-t border-error/20 flex justify-center">
            <button 
              onClick={onDeleteFolder}
              className="text-error font-bold text-sm tracking-wide hover:underline px-4 py-2"
            >
              DELETE FOLDER
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
