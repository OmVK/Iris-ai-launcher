import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useSearchViewModel } from '../utils/SearchViewModel'
import { safeEvaluate } from '../utils/safeMath'
import { useThemeStore } from '../stores/themeStore'
import { useAppsStore } from '../stores/appsStore'
import { getIconContainerStyle } from '../utils/IconShapeMask'

function ArcAppIcon({ icon, label, size = 36, iconTheme = 'DEFAULT', iconShape = 'system' }) {
  const isImage = icon && typeof icon === 'string' && (icon.startsWith('data:') || icon.startsWith('http') || icon.startsWith('/'))
  const shapeStyle = getIconContainerStyle(iconShape, size)

  return (
    <div
      style={shapeStyle}
      className={`glass-icon-container flex items-center justify-center relative transition-[background-color,border-color] duration-200 icon-theme-${(iconTheme || 'default').toLowerCase()} overflow-hidden flex-shrink-0 border border-primary-fixed/20 shadow-sm`}
    >
      {isImage ? (
        <img
          src={icon}
          alt={label || ''}
          className="w-[72%] h-[72%] object-contain rounded-md drop-shadow-sm"
          loading="lazy"
        />
      ) : (
        <span
          className="material-symbols-outlined text-primary-fixed"
          style={{ fontSize: `${Math.round(size * 0.52)}px` }}
        >
          {icon || 'apps'}
        </span>
      )}
    </div>
  )
}

function InteractiveCalculator({ initialExpr = '', onClose }) {
  const [expr, setExpr] = useState(initialExpr)
  
  const handleBtn = (val) => setExpr(p => p + val)
  const calc = () => { 
    const result = safeEvaluate(expr)
    setExpr(Number.isFinite(result) ? String(result) : 'Error')
  }
  const copyAndClose = () => {
    if (expr && expr !== 'Error') {
      navigator.clipboard?.writeText(expr)
      onClose()
    }
  }

  return (
    <div className="glass-surface p-4 rounded-2xl border border-primary-fixed/20 shadow-lg flex flex-col animate-fade-in">
       <div className="text-right text-3xl font-mono-data mb-4 bg-black/30 p-4 rounded-xl text-primary-fixed break-words min-h-[72px] flex items-center justify-end overflow-x-auto shadow-inner border border-white/5">
         {expr || '0'}
       </div>
       <div className="grid grid-cols-4 gap-2">
         {['7','8','9','/','4','5','6','*','1','2','3','-','C','0','=','+'].map(btn => (
            <button 
              key={btn} 
              onClick={() => {
                if (btn === 'C') setExpr('')
                else if (btn === '=') calc()
                else handleBtn(btn)
              }} 
              className="bg-white/5 hover:bg-white/10 active:bg-primary-fixed/20 text-white p-4 rounded-xl font-mono-data text-2xl transition-colors active:scale-95 border border-white/5 hover:border-white/10"
            >
              {btn}
            </button>
         ))}
       </div>
       <div className="mt-4 flex gap-2">
         <button onClick={copyAndClose} className="flex-1 p-3 rounded-xl bg-primary-fixed/20 text-primary-fixed font-mono-data text-sm hover:bg-primary-fixed/30 transition-colors border border-primary-fixed/30">COPY RESULT</button>
       </div>
    </div>
  )
}

function InteractiveUnitConverter({ initialValue = '', onClose }) {
  const [val, setVal] = useState(initialValue)
  const [fromUnit, setFromUnit] = useState('m')
  const [toUnit, setToUnit] = useState('km')
  const [res, setRes] = useState('')
  
  const units = ['m', 'km', 'cm', 'mm', 'mi', 'yd', 'ft', 'in', 'kg', 'g', 'lb', 'oz', 'c', 'f', 'k']
  
  useEffect(() => {
    if (!val || isNaN(val)) {
      setRes('')
      return
    }
    const conversionRates = {
      m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254,
      kg: 1, g: 0.001, lb: 0.453592, oz: 0.0283495
    }
    
    if (conversionRates[fromUnit] && conversionRates[toUnit]) {
      const inBase = parseFloat(val) * conversionRates[fromUnit]
      const out = inBase / conversionRates[toUnit]
      setRes(out.toPrecision(6).replace(/\.0+$/, ''))
    } else if (['c', 'f', 'k'].includes(fromUnit) && ['c', 'f', 'k'].includes(toUnit)) {
      let c = 0
      const v = parseFloat(val)
      if (fromUnit === 'c') c = v
      else if (fromUnit === 'f') c = (v - 32) * 5/9
      else if (fromUnit === 'k') c = v - 273.15
      
      let out = c
      if (toUnit === 'f') out = c * 9/5 + 32
      else if (toUnit === 'k') out = c + 273.15
      setRes(out.toPrecision(6).replace(/\.0+$/, ''))
    } else {
      setRes('N/A')
    }
  }, [val, fromUnit, toUnit])

  const copyAndClose = () => {
    if (res && res !== 'N/A') {
      navigator.clipboard?.writeText(`${res} ${toUnit}`)
      onClose()
    }
  }

  return (
    <div className="glass-surface p-6 rounded-2xl border border-primary-fixed/20 shadow-lg flex flex-col animate-fade-in gap-4">
       <div className="flex gap-4 items-center">
         <input 
           type="number" 
           value={val} 
           onChange={e => setVal(e.target.value)} 
           placeholder="Value" 
           className="flex-1 bg-black/20 border border-white/10 rounded-xl p-4 text-white text-xl font-mono-data focus:border-primary-fixed/50 focus:outline-none placeholder:text-white/30"
         />
         <select value={fromUnit} onChange={e => setFromUnit(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl p-4 text-primary-fixed font-mono-data text-lg outline-none appearance-none min-w-[80px] text-center cursor-pointer">
           {units.map(u => <option key={u} value={u} className="bg-[#0a0e17]">{u}</option>)}
         </select>
       </div>
       
       <div className="flex justify-center text-primary-fixed/50">
         <span className="material-symbols-outlined">swap_vert</span>
       </div>
       
       <div className="flex gap-4 items-center">
         <div className="flex-1 bg-black/20 border border-white/10 rounded-xl p-4 text-primary-fixed text-2xl font-mono-data overflow-x-auto min-h-[64px] flex items-center shadow-inner">
           {res || '0'}
         </div>
         <select value={toUnit} onChange={e => setToUnit(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl p-4 text-primary-fixed font-mono-data text-lg outline-none appearance-none min-w-[80px] text-center cursor-pointer">
           {units.map(u => <option key={u} value={u} className="bg-[#0a0e17]">{u}</option>)}
         </select>
       </div>

       <div className="mt-2 flex gap-2">
         <button onClick={copyAndClose} className="flex-1 p-3 rounded-xl bg-primary-fixed/20 text-primary-fixed font-mono-data text-sm hover:bg-primary-fixed/30 transition-colors border border-primary-fixed/30">COPY RESULT</button>
       </div>
    </div>
  )
}

function ArcFavoriteFolder({ installedApps = [], onLaunchApp, onClose, globalIconTheme = 'DEFAULT', iconShape = 'system' }) {
  const [favoriteAppIds, setFavoriteAppIds] = useState(() => {
    try {
      const cached = localStorage.getItem('iris_arc_favorite_apps')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
      return (installedApps || []).slice(0, 6).map(a => a.packageId || a.id).filter(Boolean)
    } catch {
      return []
    }
  })

  const [folderName, setFolderName] = useState(() => {
    return localStorage.getItem('iris_arc_folder_name') || 'FAVORITE APPS'
  })

  const [isEditingName, setIsEditingName] = useState(false)
  const [tempName, setTempName] = useState(folderName)
  const [isFolderOpen, setIsFolderOpen] = useState(() => {
    try {
      return localStorage.getItem('iris_arc_folder_open') === 'true'
    } catch {
      return false
    }
  })
  const [isManaging, setIsManaging] = useState(false)
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem('iris_arc_folder_open', String(isFolderOpen))
    } catch {}
  }, [isFolderOpen])

  useEffect(() => {
    if (favoriteAppIds && favoriteAppIds.length > 0) {
      localStorage.setItem('iris_arc_favorite_apps', JSON.stringify(favoriteAppIds))
    }
  }, [favoriteAppIds])

  useEffect(() => {
    localStorage.setItem('iris_arc_folder_name', folderName)
  }, [folderName])

  // Derive favorite apps with guaranteed fallback from installedApps
  const favoriteApps = useMemo(() => {
    const list = Array.isArray(installedApps) && installedApps.length > 0 ? installedApps : []
    if (list.length === 0) return []

    // If user has chosen favorite IDs, match them
    if (favoriteAppIds && favoriteAppIds.length > 0) {
      const matched = favoriteAppIds
        .map(id => list.find(a => (a.packageId === id || a.id === id)))
        .filter(Boolean)
      if (matched.length > 0) return matched
    }

    // Default fallback: pick pinned home apps first, then other apps
    const homeApps = list.filter(a => a.isHome)
    const otherApps = list.filter(a => !a.isHome)
    return [...homeApps, ...otherApps].slice(0, 8)
  }, [favoriteAppIds, installedApps])

  // Sync back defaults to state if state was empty but favoriteApps found apps
  useEffect(() => {
    if ((!favoriteAppIds || favoriteAppIds.length === 0) && favoriteApps.length > 0) {
      setFavoriteAppIds(favoriteApps.map(a => a.packageId || a.id).filter(Boolean))
    }
  }, [favoriteApps, favoriteAppIds])

  const handleToggleFavorite = (packageId) => {
    setFavoriteAppIds(prev => {
      if (prev.includes(packageId)) {
        return prev.filter(id => id !== packageId)
      } else {
        return [...prev, packageId]
      }
    })
  }

  const handleRemoveFavorite = (e, packageId) => {
    e.stopPropagation()
    setFavoriteAppIds(prev => prev.filter(id => id !== packageId))
  }

  const filteredInstalledApps = useMemo(() => {
    if (!pickerSearch.trim()) return installedApps
    const q = pickerSearch.toLowerCase()
    return installedApps.filter(a => (a.label || a.name || a.packageId || '').toLowerCase().includes(q))
  }, [installedApps, pickerSearch])

  const saveFolderName = () => {
    if (tempName.trim()) {
      setFolderName(tempName.trim())
    }
    setIsEditingName(false)
  }

  return (
    <div className="glass-surface rounded-2xl border border-primary-fixed/25 overflow-hidden transition-all shadow-xl bg-black/60 backdrop-blur-md">
      {/* Folder Header - Tapping anywhere toggles expand / collapse */}
      <div 
        onClick={() => setIsFolderOpen(!isFolderOpen)}
        className="flex items-center justify-between px-3.5 py-2.5 bg-white/[0.03] hover:bg-white/[0.06] cursor-pointer transition-colors select-none"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="material-symbols-outlined text-primary-fixed text-base flex-shrink-0">folder_special</span>
          
          {isEditingName ? (
            <div className="flex items-center gap-1.5 flex-1 max-w-[200px]" onClick={e => e.stopPropagation()}>
              <input
                type="text"
                value={tempName}
                onChange={e => setTempName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveFolderName() }}
                onBlur={saveFolderName}
                autoFocus
                className="bg-black/60 border border-primary-fixed/40 rounded px-2 py-0.5 text-xs text-primary-fixed font-mono-data focus:outline-none w-full"
              />
              <button onClick={saveFolderName} className="text-primary-fixed hover:text-white p-0.5">
                <span className="material-symbols-outlined text-xs">check</span>
              </button>
            </div>
          ) : (
            <div 
              onClick={(e) => { e.stopPropagation(); setTempName(folderName); setIsEditingName(true) }}
              className="flex items-center gap-1.5 cursor-pointer group truncate"
              title="Tap to rename folder"
            >
              <span className="text-xs font-bold font-mono-data text-white/90 uppercase tracking-wider truncate group-hover:text-primary-fixed transition-colors">
                {folderName}
              </span>
              <span className="material-symbols-outlined text-[10px] text-white/30 group-hover:text-primary-fixed/70 opacity-0 group-hover:opacity-100 transition-opacity">
                edit
              </span>
            </div>
          )}

          <span className="text-[9px] font-mono text-primary-fixed/60 bg-primary-fixed/10 px-1.5 py-0.5 rounded border border-primary-fixed/20 flex-shrink-0">
            {favoriteApps.length}
          </span>

          {/* Mini preview when collapsed */}
          {!isFolderOpen && favoriteApps.length > 0 && (
            <div className="flex items-center -space-x-1.5 overflow-hidden pl-1 flex-shrink-0">
              {favoriteApps.slice(0, 4).map(app => (
                <div key={app.packageId || app.id} className="w-4 h-4 rounded-full border border-black/60 overflow-hidden bg-black/40 flex-shrink-0">
                  {app.icon && typeof app.icon === 'string' && (app.icon.startsWith('data:') || app.icon.startsWith('http') || app.icon.startsWith('/')) ? (
                    <img src={app.icon} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <span className="material-symbols-outlined text-[10px] text-primary-fixed">apps</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {!isFolderOpen && (
            <span className="text-[8.5px] font-mono text-white/35 hidden sm:inline tracking-wider truncate">
              (PULL DOWN TO EXPAND)
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setIsPickerOpen(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-mono text-primary-fixed bg-primary-fixed/10 hover:bg-primary-fixed/20 border border-primary-fixed/30 transition-all active:scale-95"
            title="Add Apps to Folder"
          >
            <span className="material-symbols-outlined text-xs">add</span>
            <span>ADD</span>
          </button>

          <button
            onClick={() => setIsManaging(!isManaging)}
            className={`p-1 rounded-lg text-xs transition-all ${
              isManaging
                ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
            title={isManaging ? 'Done Organizing' : 'Manage / Remove Apps'}
          >
            <span className="material-symbols-outlined text-sm">{isManaging ? 'done' : 'tune'}</span>
          </button>

          <button
            onClick={() => setIsFolderOpen(!isFolderOpen)}
            className="p-1.5 text-primary-fixed/80 hover:text-primary-fixed rounded-lg hover:bg-white/10 transition-all flex items-center justify-center active:scale-95"
            title={isFolderOpen ? 'Collapse Folder' : 'Pull Down Favorite Apps'}
          >
            <span 
              className="material-symbols-outlined text-lg transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" 
              style={{ transform: isFolderOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              expand_more
            </span>
          </button>
        </div>
      </div>

      {/* Folder Apps Grid - Animated Pull Down Drawer with Slow Smooth Effect */}
      <div 
        className="overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ 
          maxHeight: isFolderOpen ? '600px' : '0px',
          opacity: isFolderOpen ? 1 : 0,
          transform: isFolderOpen ? 'translateY(0)' : 'translateY(-8px)',
          pointerEvents: isFolderOpen ? 'auto' : 'none'
        }}
      >
        <div className="p-3.5 border-t border-white/10 bg-black/50">
            {favoriteApps.length === 0 ? (
              <div 
                onClick={() => setIsPickerOpen(true)}
                className="border-2 border-dashed border-white/10 hover:border-primary-fixed/40 rounded-xl p-4 flex flex-col items-center justify-center gap-1 cursor-pointer group transition-all"
              >
                <span className="material-symbols-outlined text-primary-fixed/50 text-2xl group-hover:scale-110 transition-transform">add_circle</span>
                <span className="text-[10px] font-mono text-white/50 group-hover:text-primary-fixed tracking-wider uppercase">Tap to add your favorite apps</span>
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2.5">
                {favoriteApps.map(app => {
                  const appId = app.packageId || app.id
                  return (
                    <div
                      key={appId}
                      onClick={() => {
                        if (isManaging) {
                          handleToggleFavorite(appId)
                        } else {
                          onLaunchApp(app)
                          onClose()
                        }
                      }}
                      className="relative flex flex-col items-center gap-1.5 p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.08] active:bg-primary-fixed/20 border border-white/5 hover:border-primary-fixed/30 cursor-pointer transition-all active:scale-95 group select-none"
                    >
                      {/* Delete Badge in Manage Mode */}
                      {isManaging && (
                        <button
                          onClick={(e) => handleRemoveFavorite(e, appId)}
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg border border-white/20 z-10 animate-in zoom-in-50 duration-150"
                          title="Remove from favorites"
                        >
                          <span className="material-symbols-outlined text-[11px] font-bold">close</span>
                        </button>
                      )}

                      {/* App Icon */}
                      <div className="w-10 h-10 flex items-center justify-center">
                        <ArcAppIcon
                          icon={app.icon}
                          label={app.label || app.name}
                          size={38}
                          iconTheme={globalIconTheme}
                          iconShape={iconShape}
                        />
                      </div>

                      {/* App Label */}
                      <span className="text-[9.5px] font-mono-data text-white/80 group-hover:text-primary-fixed truncate max-w-full text-center tracking-tight">
                        {app.label || app.name || 'App'}
                      </span>
                    </div>
                  )
                })}

                {/* Add Button Tile */}
                <button
                  onClick={() => setIsPickerOpen(true)}
                  className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border border-dashed border-white/10 hover:border-primary-fixed/40 bg-white/[0.01] hover:bg-white/[0.05] text-white/40 hover:text-primary-fixed transition-all cursor-pointer min-h-[64px]"
                  title="Add more apps"
                >
                  <span className="material-symbols-outlined text-base">add</span>
                  <span className="text-[8px] font-mono uppercase tracking-wider">ADD</span>
                </button>
              </div>
            )}
          </div>
        </div>

      {/* App Picker Modal */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md animate-in fade-in duration-150" onClick={() => setIsPickerOpen(false)} />
          <div className="relative glass-surface border border-primary-fixed/40 rounded-2xl p-4 w-full max-w-md max-h-[75vh] flex flex-col gap-3 z-10 bg-black/90 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-fixed text-base">apps</span>
                <span className="text-xs font-mono-data font-bold text-white uppercase tracking-wider">SELECT FAVORITE APPS</span>
              </div>
              <button onClick={() => setIsPickerOpen(false)} className="text-white/40 hover:text-white p-1">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {/* Search Filter in Picker */}
            <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-xl px-3 py-1.5">
              <span className="material-symbols-outlined text-white/40 text-sm">search</span>
              <input
                type="text"
                value={pickerSearch}
                onChange={e => setPickerSearch(e.target.value)}
                placeholder="Search installed apps..."
                className="bg-transparent border-none text-xs text-white placeholder:text-white/30 focus:outline-none w-full font-mono-data"
              />
              {pickerSearch && (
                <button onClick={() => setPickerSearch('')} className="text-white/40 hover:text-white">
                  <span className="material-symbols-outlined text-xs">close</span>
                </button>
              )}
            </div>

            {/* Apps List */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 max-h-[45vh] scroll-container">
              {filteredInstalledApps.map(app => {
                const appId = app.packageId || app.id
                const isSelected = favoriteAppIds.includes(appId)
                return (
                  <div
                    key={appId}
                    onClick={() => handleToggleFavorite(appId)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary-fixed/15 border-primary-fixed/40 text-primary-fixed'
                        : 'bg-white/[0.02] border-white/5 text-white/70 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ArcAppIcon
                        icon={app.icon}
                        label={app.label || app.name}
                        size={28}
                        iconTheme={globalIconTheme}
                        iconShape={iconShape}
                      />
                      <div className="truncate">
                        <p className="text-xs font-mono-data font-semibold truncate">{app.label || app.name || appId}</p>
                        <p className="text-[8.5px] font-mono text-white/30 truncate">{appId}</p>
                      </div>
                    </div>

                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all flex-shrink-0 ${
                      isSelected ? 'bg-primary-fixed border-primary-fixed text-black' : 'border-white/20 bg-black/40'
                    }`}>
                      {isSelected && <span className="material-symbols-outlined text-xs font-bold">check</span>}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Picker Footer */}
            <div className="pt-2 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setIsPickerOpen(false)}
                className="px-4 py-2 rounded-xl bg-primary-fixed text-black font-mono-data text-xs font-bold hover:bg-primary-fixed/90 transition-all active:scale-95"
              >
                DONE ({favoriteAppIds.length} SELECTED)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ArcSearch({ isOpen, onClose, installedApps, launchApp, activePage: _activePage, setActivePage, globalIconTheme: propGlobalIconTheme }) {
  const inputRef = useRef(null)
  const mountTime = useRef(Date.now())

  const themeStore = useThemeStore()
  const globalIconTheme = propGlobalIconTheme || themeStore.globalIconTheme || 'DEFAULT'
  const iconShape = themeStore.iconShape || 'system'

  const storeInstalledApps = useAppsStore(state => state.installedApps)
  const effectiveInstalledApps = (installedApps && installedApps.length > 0) ? installedApps : storeInstalledApps

  const handleLaunch = React.useCallback((app) => launchApp(app), [launchApp])
  const handleNavigate = React.useCallback((page) => setActivePage(page), [setActivePage])

  const { 
    query, 
    results, 
    isSearching, 
    calculatorResult, 
    unitResult, 
    handleQueryChange, 
    clearSearch, 
    executeResult, 
    isExpandedSearch, 
    toggleExpandedSearch, 
    activeSource, 
    setActiveSource 
  } = useSearchViewModel({
    installedApps: effectiveInstalledApps,
    onLaunchApp: handleLaunch,
    onNavigate: handleNavigate
  })

  useEffect(() => {
    if (isOpen) {
      mountTime.current = Date.now()
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      clearSearch()
    }
  }, [isOpen, clearSearch])

  const safeClose = () => {
    if (Date.now() - mountTime.current > 300) onClose()
  }

  const handleResultClick = (result) => {
    if (result.type === 'command') {
      handleQueryChange(result.label + ' ')
      inputRef.current?.focus()
      return
    }
    executeResult(result)
    onClose()
  }

  const handleModeClick = (mode) => {
    if (mode === 'all') {
      setActiveSource('all')
      const stripped = query.replace(/^\/[a-zA-Z]+\s*/, '').trim()
      if (stripped) {
        handleQueryChange(stripped)
      } else {
        clearSearch()
      }
      inputRef.current?.focus()
      return
    }

    const isActive = activeSource === mode || query.trim().startsWith(`/${mode}`)
    if (isActive) {
      setActiveSource('all')
      const stripped = query.replace(new RegExp(`^\\/${mode}\\s*`, 'i'), '').trim()
      if (stripped) {
        handleQueryChange(stripped)
      } else {
        clearSearch()
      }
      inputRef.current?.focus()
    } else {
      setActiveSource(mode)
      const rawText = query.replace(/^\/[a-zA-Z]+\s*/, '').trim()
      const newQuery = `/${mode}${rawText ? ' ' + rawText : ' '}`
      handleQueryChange(newQuery)
      if (mode !== 'calculator' && mode !== 'unit') {
        inputRef.current?.focus()
      }
    }
  }

  const searchPlaceholder = useMemo(() => {
    if (activeSource === 'calculator' || query.startsWith('/calculator')) return 'Enter calculation (e.g. 24 * 7)...'
    if (activeSource === 'unit' || query.startsWith('/unit')) return 'Enter unit (e.g. 50 km to mi)...'
    if (activeSource === 'contact' || query.startsWith('/contact')) return 'Search contacts by name or phone...'
    if (activeSource === 'files' || query.startsWith('/files')) return 'Search files and documents...'
    if (activeSource === 'search' || query.startsWith('/search')) return 'Search the web with Google...'
    return 'Search apps, settings, contacts, or units...'
  }, [activeSource, query])

  if (!isOpen) return null

  return (
    <div 
      data-arc-modal="true"
      onTouchStart={e => e.stopPropagation()}
      onTouchMove={e => e.stopPropagation()}
      onTouchEnd={e => e.stopPropagation()}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in select-none"
    >
      <div className="absolute inset-0" onClick={safeClose} />

      <div 
        onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl relative z-10 flex flex-col gap-3 animate-slide-up max-h-[90vh] overflow-y-auto scroll-container"
      >
        {/* Search Header Bar */}
        <div className="flex flex-col gap-2">
          <div className="glass-surface rounded-2xl p-2 flex items-center shadow-lg border border-primary-fixed/20">
            <span className="material-symbols-outlined text-primary-fixed px-3">search</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => handleQueryChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 bg-transparent border-none text-primary-fixed text-lg sm:text-xl focus:outline-none focus:ring-0 focus:border-transparent placeholder:text-primary-fixed/30 px-2 font-mono-data"
              onKeyDown={e => {
                if (e.key === 'Enter' && results.length > 0) handleResultClick(results[0])
                else if (e.key === 'Escape') safeClose()
              }}
            />
            {query && (
              <button onClick={() => clearSearch()} className="p-3 text-primary-fixed/50 hover:text-primary-fixed transition-colors" title="Clear Search">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>
          
          {/* Quick Action Chips Bar (One-click direct access to / commands & deep search) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5 select-none">
            {/* ALL APPS Chip */}
            <button
              onClick={() => handleModeClick('all')}
              className={`flex items-center gap-1 text-[10px] font-mono-data px-2.5 py-1 rounded-full transition-all flex-shrink-0 active:scale-95 border ${
                activeSource === 'all' && !query.startsWith('/')
                  ? 'bg-primary-fixed/20 text-primary-fixed border-primary-fixed/40 shadow-[0_0_8px_rgba(var(--primary-rgb),0.2)] font-semibold'
                  : 'bg-white/[0.03] text-white/50 border-white/10 hover:bg-white/[0.08] hover:text-white'
              }`}
              title="All Apps & System Search"
            >
              <span className="material-symbols-outlined text-xs">grid_view</span>
              <span>ALL</span>
            </button>

            {/* CALCULATOR Chip */}
            <button
              onClick={() => handleModeClick('calculator')}
              className={`flex items-center gap-1 text-[10px] font-mono-data px-2.5 py-1 rounded-full transition-all flex-shrink-0 active:scale-95 border ${
                activeSource === 'calculator' || query.trim().startsWith('/calculator')
                  ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400/50 shadow-[0_0_10px_rgba(16,185,129,0.3)] font-semibold'
                  : 'bg-white/[0.03] text-white/50 border-white/10 hover:bg-white/[0.08] hover:text-white'
              }`}
              title="Open Interactive Calculator"
            >
              <span className="material-symbols-outlined text-xs">calculate</span>
              <span>CALC</span>
            </button>

            {/* UNIT CONVERTER Chip */}
            <button
              onClick={() => handleModeClick('unit')}
              className={`flex items-center gap-1 text-[10px] font-mono-data px-2.5 py-1 rounded-full transition-all flex-shrink-0 active:scale-95 border ${
                activeSource === 'unit' || query.trim().startsWith('/unit')
                  ? 'bg-purple-500/25 text-purple-300 border-purple-400/50 shadow-[0_0_10px_rgba(168,85,247,0.3)] font-semibold'
                  : 'bg-white/[0.03] text-white/50 border-white/10 hover:bg-white/[0.08] hover:text-white'
              }`}
              title="Open Interactive Unit Converter"
            >
              <span className="material-symbols-outlined text-xs">straighten</span>
              <span>UNITS</span>
            </button>

            {/* CONTACTS Chip */}
            <button
              onClick={() => handleModeClick('contact')}
              className={`flex items-center gap-1 text-[10px] font-mono-data px-2.5 py-1 rounded-full transition-all flex-shrink-0 active:scale-95 border ${
                activeSource === 'contact' || query.trim().startsWith('/contact')
                  ? 'bg-sky-500/25 text-sky-300 border-sky-400/50 shadow-[0_0_10px_rgba(56,189,248,0.3)] font-semibold'
                  : 'bg-white/[0.03] text-white/50 border-white/10 hover:bg-white/[0.08] hover:text-white'
              }`}
              title="Search Contacts Directly"
            >
              <span className="material-symbols-outlined text-xs">person_search</span>
              <span>CONTACTS</span>
            </button>

            {/* FILES Chip */}
            <button
              onClick={() => handleModeClick('files')}
              className={`flex items-center gap-1 text-[10px] font-mono-data px-2.5 py-1 rounded-full transition-all flex-shrink-0 active:scale-95 border ${
                activeSource === 'files' || query.trim().startsWith('/files')
                  ? 'bg-amber-500/25 text-amber-300 border-amber-400/50 shadow-[0_0_10px_rgba(245,158,11,0.3)] font-semibold'
                  : 'bg-white/[0.03] text-white/50 border-white/10 hover:bg-white/[0.08] hover:text-white'
              }`}
              title="Search Device Documents & Files"
            >
              <span className="material-symbols-outlined text-xs">folder_open</span>
              <span>FILES</span>
            </button>

            {/* WEB SEARCH Chip */}
            <button
              onClick={() => handleModeClick('search')}
              className={`flex items-center gap-1 text-[10px] font-mono-data px-2.5 py-1 rounded-full transition-all flex-shrink-0 active:scale-95 border ${
                activeSource === 'search' || query.trim().startsWith('/search')
                  ? 'bg-primary-fixed/25 text-primary-fixed border-primary-fixed/50 shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)] font-semibold'
                  : 'bg-white/[0.03] text-white/50 border-white/10 hover:bg-white/[0.08] hover:text-white'
              }`}
              title="Search the Web"
            >
              <span className="material-symbols-outlined text-xs">travel_explore</span>
              <span>WEB</span>
            </button>

            <div className="h-4 w-px bg-white/10 mx-0.5 flex-shrink-0" />

            {/* DEEP SEARCH Toggle Chip */}
            <button
              onClick={toggleExpandedSearch}
              className={`flex items-center gap-1 text-[10px] font-mono-data px-2.5 py-1 rounded-full transition-all flex-shrink-0 active:scale-95 border ${
                isExpandedSearch
                  ? 'bg-primary-fixed-dim/20 text-primary-fixed border border-primary-fixed/30 shadow-[0_0_10px_rgba(var(--primary-rgb),0.2)] font-semibold'
                  : 'bg-surface-container/50 text-white/50 border border-white/10 hover:bg-white/5'
              }`}
              title="Toggle Deep Web & Background Contacts Search"
            >
              <span className="material-symbols-outlined text-[12px]">
                {isExpandedSearch ? 'public' : 'public_off'}
              </span>
              <span>{isExpandedSearch ? 'DEEP ON' : 'DEEP OFF'}</span>
            </button>
          </div>
        </div>

        {/* Favorite Apps Quick Access Folder (Below Quick Action Chips) - Only shown when search query is empty */}
        {!query.trim() && (
          <ArcFavoriteFolder
            installedApps={effectiveInstalledApps}
            onLaunchApp={launchApp}
            onClose={onClose}
            globalIconTheme={globalIconTheme}
            iconShape={iconShape}
          />
        )}

        {isSearching && (
          <div className="glass-surface border border-primary-fixed/20 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center gap-2 text-[10px] text-primary-fixed/50 font-mono-data">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-fixed animate-pulse" />
              Processing...
            </div>
          </div>
        )}

        {(activeSource === 'calculator' || query.trim().startsWith('/calculator')) ? (
          <InteractiveCalculator 
            initialExpr={query.replace('/calculator', '').trim()} 
            onClose={() => handleModeClick('all')} 
          />
        ) : (activeSource === 'unit' || query.trim().startsWith('/unit')) ? (
          <InteractiveUnitConverter 
            initialValue={query.replace('/unit', '').trim().split(' ')[0] || ''} 
            onClose={() => handleModeClick('all')} 
          />
        ) : (
          <>
            {calculatorResult && (
              <button
                onClick={() => { navigator.clipboard?.writeText(String(calculatorResult.result)); onClose() }}
                className="bg-[#0a0e17]/80 backdrop-blur-xl border border-green-400/30 rounded-2xl p-4 shadow-[0_0_20px_rgba(0,255,0,0.1)] text-left hover:bg-green-400/10 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-green-400 text-sm">calculate</span>
                  <span className="text-[9px] text-green-400/60 uppercase font-mono-data tracking-widest">CALCULATOR</span>
                </div>
                <p className="text-sm text-white/90 font-mono-data">{calculatorResult.expression} = <span className="text-green-400 font-bold">{calculatorResult.result}</span></p>
                <p className="text-[9px] text-green-400/40 mt-1">Tap to copy</p>
              </button>
            )}

            {unitResult && (
              <button
                onClick={() => { navigator.clipboard?.writeText(`${unitResult.result} ${unitResult.toUnit}`); onClose() }}
                className="bg-[#0a0e17]/80 backdrop-blur-xl border border-purple-400/30 rounded-2xl p-4 shadow-[0_0_20px_rgba(128,0,255,0.1)] text-left hover:bg-purple-400/10 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-purple-400 text-sm">straighten</span>
                  <span className="text-[9px] text-purple-400/60 uppercase font-mono-data tracking-widest">UNIT CONVERSION</span>
                </div>
                <p className="text-sm text-white/90 font-mono-data">{unitResult.value} {unitResult.fromUnit} = <span className="text-purple-400 font-bold">{unitResult.result} {unitResult.toUnit}</span></p>
                <p className="text-[9px] text-purple-400/40 mt-1">Tap to copy</p>
              </button>
            )}
          </>
        )}

        {results.length > 0 && (
          <div className="glass-surface border border-primary-fixed/20 rounded-2xl overflow-hidden flex flex-col shadow-lg max-h-[50vh] overflow-y-auto">
            {results.map((res, i) => (
              res.type === 'contact' ? (
                <div key={res.id || i} className="flex items-center justify-between p-4 transition-colors border-b border-white/5 last:border-b-0 hover:bg-white/5 group">
                  <div className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer" onClick={() => handleResultClick(res)}>
                    <div className="w-10 h-10 rounded-full bg-sky-500/15 flex items-center justify-center flex-shrink-0 border border-sky-400/30 group-hover:border-sky-400/60 transition-colors">
                      <span className="material-symbols-outlined text-sky-400 text-[20px]">person</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate flex font-mono-data tracking-wider text-white/90">{res.label}</span>
                      <span className="text-[10px] text-white/40 font-mono-data block truncate">{res.sublabel}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pr-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); res.messageAction?.(); onClose(); }} 
                      className="w-10 h-10 rounded-full bg-[#4facfe]/20 text-[#4facfe] flex items-center justify-center hover:bg-[#4facfe]/40 transition-colors shadow-sm"
                      title="Send SMS"
                    >
                      <span className="material-symbols-outlined text-[18px]">chat</span>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); res.callAction?.(); onClose(); }} 
                      className="w-10 h-10 rounded-full bg-[#00f260]/20 text-[#00f260] flex items-center justify-center hover:bg-[#00f260]/40 transition-colors shadow-sm"
                      title="Call"
                    >
                      <span className="material-symbols-outlined text-[18px]">call</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  key={res.id || i}
                  onClick={() => handleResultClick(res)}
                  className={`flex items-center gap-4 p-4 text-left transition-colors border-b border-white/5 last:border-b-0 ${i === 0 ? 'bg-primary-fixed/10' : 'hover:bg-white/5 active:bg-white/10'}`}
                >
                  {res.type === 'app' ? (
                    <ArcAppIcon
                      icon={res.icon}
                      label={res.label}
                      size={36}
                      iconTheme={globalIconTheme}
                      iconShape={iconShape}
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-primary-fixed/10 border border-primary-fixed/25 text-primary-fixed shadow-sm">
                      <span className={`material-symbols-outlined text-xl ${
                        res.type === 'web' ? 'text-primary-fixed' :
                        res.type === 'setting' ? 'text-yellow-400' :
                        res.type === 'contact' ? 'text-sky-400' :
                        res.type === 'file' ? 'text-amber-400' :
                        res.type === 'command' ? 'text-emerald-400' : 'text-primary-fixed'
                      }`}>{res.icon || 'search'}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-medium truncate flex font-mono-data tracking-wider block ${i === 0 ? 'text-primary-fixed' : 'text-white/80'}`}>{res.label}</span>
                    {res.sublabel && <span className="text-[9px] text-white/30 font-mono-data block truncate">{res.sublabel}</span>}
                  </div>
                  {i === 0 && <span className="text-[9px] font-bold text-[#0a0e17] bg-primary-fixed uppercase tracking-widest px-2 py-0.5 rounded shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]">ENTER</span>}
                </button>
              )
            ))}
          </div>
        )}

        {query && results.length === 0 && !isSearching && !calculatorResult && !unitResult && activeSource !== 'calculator' && activeSource !== 'unit' && (
          <div className="glass-surface border border-primary-fixed/10 rounded-2xl p-6 text-center">
            <span className="material-symbols-outlined text-primary-fixed/30 text-4xl block mb-2">search_off</span>
            <p className="text-[10px] text-primary-fixed/40 font-mono-data uppercase">No results found for &quot;{query}&quot;</p>
          </div>
        )}
      </div>
    </div>
  )
}
