import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import FolderModal from '../components/FolderModal'
import { useAppContextMenu } from '../hooks/useAppContextMenu'
import AppContextMenu from '../components/AppContextMenu'
import DrawerGrid from '../components/drawer/DrawerGrid'
import DrawerList from '../components/drawer/DrawerList'
import DrawerCategories from '../components/drawer/DrawerCategories'
import DrawerMesh from '../components/drawer/DrawerMesh'
import { launchApp } from '../components/LauncherPlugin'
import { routeAppClick } from '../utils/appClickRouter'
import { useThemeStore } from '../stores/themeStore'
import { useAppsStore } from '../stores/appsStore'

const CATEGORY_PATTERNS = {
  COMMUNICATION: ['whatsapp', 'telegram', 'discord', 'signal', 'messaging', 'message', 'mail', 'slack', 'teams', 'zoom', 'skype', 'snapchat', 'instagram', 'facebook', 'twitter', 'reddit'],
  MEDIA: ['spotify', 'youtube', 'music', 'netflix', 'video', 'tiktok', 'camera', 'gallery', 'photo', 'media', 'player', 'podcast', 'radio'],
  GAMES: ['game', 'play', 'games', 'gaming', 'esports'],
  SYSTEM: ['settings', 'android', 'google', 'system', 'phone', 'dialer', 'contacts', 'calendar', 'clock', 'calculator', 'files', 'file', 'manager'],
  PRODUCTIVITY: ['docs', 'sheets', 'slides', 'drive', 'office', 'notion', 'todo', 'task', 'note', 'evernote', 'trello', 'asana'],
  FINANCE: ['bank', 'pay', 'wallet', 'finance', 'stock', 'crypto', 'coin', 'trade'],
  HEALTH: ['health', 'fitness', 'workout', 'run', 'meditat', 'sleep', 'step'],
  TRAVEL: ['maps', 'map', 'navigation', 'uber', 'lyft', 'travel', 'flight', 'hotel'],
  SHOPPING: ['shop', 'store', 'amazon', 'ebay', 'market', 'buy'],
}

const categoryCache = new Map()

function detectCategory(app) {
  if (!app?.packageId) return app?.cat || 'OTHER'
  const cached = categoryCache.get(app.packageId)
  if (cached) return cached

  const pkg = (app.packageId || '').toLowerCase()
  const label = (app.label || '').toLowerCase()
  const combined = `${pkg} ${label}`
  for (const [cat, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    if (patterns.some(p => combined.includes(p))) {
      categoryCache.set(app.packageId, cat)
      return cat
    }
  }
  const fallback = app.cat || 'OTHER'
  categoryCache.set(app.packageId, fallback)
  return fallback
}

export default function Drawer({
  onNavigate,
  onTriggerChronoLock,
  onTriggerVault,
  isVaultUnlocked,
  installedApps = [],
  setInstalledApps,
  lockedApps = [],
  onToggleAppLock,
  drawerSheetRef,
}) {
  const { gridColumns, gridRows, showAppLabels, showDrawerSearch, globalIconTheme, drawerIconSize, drawerTextSize, drawerLayout, setDrawerLayout, iconShape } = useThemeStore()
  const { hiddenApps, appFrequency, recordAppLaunch } = useAppsStore()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('ALL')
  const [sortBy, setSortBy] = useState('A-Z')
  const [activeLetter, setActiveLetter] = useState(null)
  const [showHidden, setShowHidden] = useState(false)

  const categorizedApps = useMemo(() => {
    return installedApps.map(app => ({
      ...app,
      detectedCat: detectCategory(app)
    }))
  }, [installedApps])

  const filteredApps = useMemo(() => {
    return categorizedApps.filter(app => {
      const isLocked = Array.isArray(lockedApps) && lockedApps.includes(app.packageId)
      if (isLocked) return false
      const isHidden = hiddenApps.includes(app.packageId)
      if (isHidden && !showHidden) return false
      if (!isHidden && showHidden) return false

      const q = searchQuery.toLowerCase()
      const matchesSearch = !q || 
        app.label.toLowerCase().includes(q) ||
        app.packageId.toLowerCase().includes(q)
      const matchesCat = activeCategory === 'ALL' || app.detectedCat === activeCategory
      const matchesLetter = !activeLetter || app.label.charAt(0).toUpperCase() === activeLetter
      return matchesSearch && matchesCat && matchesLetter
    }).sort((a, b) => {
      if (sortBy === 'A-Z') return a.label.localeCompare(b.label)
      if (sortBy === 'Z-A') return b.label.localeCompare(a.label)
      if (sortBy === 'SIZE') {
        const parseSize = (s) => parseFloat(s) || 0
        return parseSize(b.storageSize) - parseSize(a.storageSize)
      }
      if (sortBy === 'FREQUENCY') {
        return (appFrequency[b.packageId] || 0) - (appFrequency[a.packageId] || 0)
      }
      return 0
    })
  }, [categorizedApps, lockedApps, hiddenApps, showHidden, searchQuery, activeCategory, sortBy, activeLetter, appFrequency])

  const [activeFolder, setActiveFolder] = useState(null)
  const [customFolders, setCustomFolders] = useState(() => {
    try {
      const cached = localStorage.getItem('iris_custom_folders')
      return cached ? JSON.parse(cached) : []
    } catch (e) { return [] }
  })

  const {
    activeContextMenu, setActiveContextMenu,
    toastText, setToastText,
    handleContextMenu,
    handleLockApp,
    handleTriggerUninstall,
    handleOpenAppInfo
  } = useAppContextMenu({ setInstalledApps, onToggleAppLock })

  useEffect(() => { activeContextMenuRef.current = activeContextMenu }, [activeContextMenu])

  const swipeStartPos = useRef({ x: 0, y: 0, scrollTop: 0 })
  const activeContextMenuRef = useRef(null)
  const scrollRef = useRef(null)
  const scrollTimerRef = useRef(null)

  useEffect(() => { localStorage.setItem('iris_custom_folders', JSON.stringify(customFolders)) }, [customFolders])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      el.classList.add('scrolling')
      clearTimeout(scrollTimerRef.current)
      scrollTimerRef.current = setTimeout(() => el.classList.remove('scrolling'), 150)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => { el.removeEventListener('scroll', onScroll); clearTimeout(scrollTimerRef.current) }
  }, [])

  const categoriesItems = useMemo(() => customFolders.filter(f => f && f.apps && f.apps.length > 0), [customFolders])

  const autoCategoriesItems = useMemo(() => {
    if (drawerLayout !== 'CATEGORIES') return categoriesItems
    const byCat = {}
    for (const app of categorizedApps) {
      const cat = app.detectedCat
      if (!byCat[cat]) byCat[cat] = []
      byCat[cat].push(app.packageId)
    }
    const autoFolders = Object.entries(byCat).map(([cat, apps]) => ({
      id: `auto_${cat.toLowerCase()}`,
      name: cat.charAt(0) + cat.slice(1).toLowerCase(),
      isAuto: true,
      isFolder: true,
      apps: [...new Set(apps)]
    }))
    return [
      ...categoriesItems,
      ...autoFolders
    ].filter(f => f.apps && f.apps.length > 0)
  }, [categorizedApps, categoriesItems, drawerLayout])

  const handleDrawerTouchStart = (e) => {
    const touch = e.touches ? e.touches[0] : e
    swipeStartPos.current = {
      x: touch.clientX,
      y: touch.clientY,
      scrollTop: e.currentTarget.scrollTop,
      time: Date.now()
    }
  }

  const handleDrawerTouchMove = (e) => {
    if (!swipeStartPos.current || !drawerSheetRef?.current) return
    const touch = e.touches ? e.touches[0] : e
    if (!touch) return
    const dx = Math.abs(touch.clientX - swipeStartPos.current.x)
    const dy = touch.clientY - swipeStartPos.current.y
    if (dy > 12 && dx < dy * 1.5 && swipeStartPos.current.scrollTop <= 5) {
      drawerSheetRef.current.style.transition = 'none'
      drawerSheetRef.current.style.transform = `translate3d(0, ${Math.max(0, dy)}px, 0)`
      const mainEl = document.querySelector('main')
      if (mainEl) {
        const vh = window.innerHeight || 800
        const progress = Math.min(1, Math.max(0, dy / (vh * 0.4)))
        mainEl.style.opacity = `${progress.toFixed(2)}`
      }
    }
  }

  const handleDrawerTouchEnd = (e) => {
    if (!swipeStartPos.current) return
    const touch = e.changedTouches ? e.changedTouches[0] : (e.touches ? e.touches[0] : e)
    if (!touch || !touch.clientX) return
    const dx = Math.abs(touch.clientX - swipeStartPos.current.x)
    const dy = touch.clientY - swipeStartPos.current.y
    const duration = Date.now() - (swipeStartPos.current.time || Date.now())
    const velocity = Math.abs(dy) / Math.max(1, duration)

    if (dy > 12 && dx < dy * 1.5 && swipeStartPos.current.scrollTop <= 5) {
      if (dy > 80 || (velocity > 0.35 && dy > 30)) {
        if (drawerSheetRef?.current) {
          drawerSheetRef.current.style.transition = 'transform 240ms cubic-bezier(0.16, 1, 0.3, 1)'
          drawerSheetRef.current.style.transform = 'translate3d(0, 100%, 0)'
          drawerSheetRef.current.style.pointerEvents = 'none'
        }
        const mainEl = document.querySelector('main')
        if (mainEl) {
          mainEl.style.transition = 'opacity 240ms cubic-bezier(0.16, 1, 0.3, 1)'
          mainEl.style.opacity = '1'
          mainEl.style.pointerEvents = 'auto'
        }
        onNavigate('home')
      } else {
        if (drawerSheetRef?.current) {
          drawerSheetRef.current.style.transition = 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)'
          drawerSheetRef.current.style.transform = 'translate3d(0, 0, 0)'
        }
        const mainEl = document.querySelector('main')
        if (mainEl) {
          mainEl.style.transition = 'opacity 200ms cubic-bezier(0.16, 1, 0.3, 1)'
          mainEl.style.opacity = '0'
          mainEl.style.pointerEvents = 'none'
        }
      }
    }
    swipeStartPos.current = null
  }

  const handleCreateFolder = () => {
    setActiveFolder({ id: Date.now().toString(), name: 'New Folder', apps: [], isFolder: true })
  }

  const handleUpdateFolder = (updatedFolder) => {
    setCustomFolders(prev => {
      const exists = prev.find(f => f.id === updatedFolder.id)
      if (exists) return prev.map(f => f.id === updatedFolder.id ? updatedFolder : f)
      return [...prev, updatedFolder]
    })
    setActiveFolder(null)
  }

  const handleDeleteFolder = (folderId) => {
    setCustomFolders(prev => prev.filter(f => f.id !== folderId))
    setActiveFolder(null)
  }

  const handleAppClick = useCallback((e, app) => {
    if (app.isFolder || app.isIrisFolder) {
      setActiveFolder(app)
      return
    }
    if (activeContextMenuRef.current) {
      setActiveContextMenu(null)
      e.preventDefault()
      e.stopPropagation()
      return
    }
    const isLocked = Array.isArray(lockedApps) && lockedApps.includes(app.packageId)
    if (!isLocked) {
      recordAppLaunch(app.packageId)
    }
    routeAppClick(app, { onNavigate, launchApp, onTriggerChronoLock, lockedApps, isVaultUnlocked })
  }, [onNavigate, recordAppLaunch, onTriggerChronoLock, lockedApps, isVaultUnlocked, setActiveContextMenu])

  const handleToggleHomePlacement = useCallback((app) => {
    setInstalledApps(prev => prev.map(a =>
      a.packageId === app.packageId ? { ...a, isHome: !a.isHome } : a
    ))
    setToastText(`${app.label.toUpperCase()} ${app.isHome ? 'REMOVED FROM' : 'ADDED TO'} HOME`)
    setTimeout(() => setActiveContextMenu(null), 250)
  }, [setInstalledApps, setToastText, setActiveContextMenu])

  const handleClearAllHome = useCallback(() => {
    setInstalledApps(prev => prev.map(a => a.isHome ? { ...a, isHome: false } : a))
    setToastText('ALL HOME APPS CLEARED')
  }, [setInstalledApps, setToastText])

  return (
    <div className="relative flex-1 flex flex-col h-[100lvh] min-h-0 overflow-hidden bg-transparent">

      <div
        ref={scrollRef}
        data-no-arc
        onTouchStart={handleDrawerTouchStart}
        onTouchMove={handleDrawerTouchMove}
        onTouchEnd={handleDrawerTouchEnd}
        className="flex-grow pt-12 px-margin overflow-y-auto pb-20 scroll-container select-none"
      >
      {toastText && (
        <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className="glass-surface border border-primary-fixed-dim/40 px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] animate-bounce bg-[#020617]/95">
            <span className="material-symbols-outlined text-primary-fixed-dim text-xs animate-spin animate-iris-rotate">settings_backup_restore</span>
            <span className="font-mono-data text-[10px] font-bold text-primary-fixed-dim tracking-widest uppercase">{toastText}</span>
          </div>
        </div>
      )}

      <div className="sticky top-0 z-40 bg-background/0 pb-4">
        <div className="max-w-xl mx-auto space-y-4">
          {showDrawerSearch && (
            <div className="glass-chip glass-border rounded-xl px-4 py-2.5 flex items-center gap-3 shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)]">
              <span className="material-symbols-outlined text-primary-fixed-dim">search</span>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search apps..."
                className="bg-transparent border-none focus:outline-none focus:ring-0 w-full text-xs font-mono-data text-on-surface placeholder:text-on-surface-variant/40"
                type="text"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="material-symbols-outlined text-on-surface-variant hover:text-white transition-colors text-sm">close</button>
              )}
            </div>
          )}

          <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-[8px] font-label-caps tracking-wider">
            {['ALL', 'COMMUNICATION', 'MEDIA', 'GAMES', 'SYSTEM', 'PRODUCTIVITY', 'FINANCE'].map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2 py-0.5 rounded-full border transition-all shrink-0 ${
                  activeCategory === cat
                    ? 'bg-primary-fixed-dim/20 text-primary-fixed-dim border-primary-fixed-dim/50 shadow-[0_0_8px_rgba(var(--primary-rgb),0.2)] font-bold'
                    : 'border-outline-variant/20 text-on-surface-variant/40 hover:text-white hover:border-white/20'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>


          <div className="flex gap-2 justify-center pt-1 flex-wrap items-center">
            {[
              { id: 'GRID', label: 'Grid', icon: 'grid_view' },
              { id: 'MESH', label: 'Mesh', icon: 'hub' },
              { id: 'LIST', label: 'List', icon: 'view_list' },
              { id: 'CATEGORIES', label: 'Folders', icon: 'folder_open' }
            ].map(layout => (
              <button
                key={layout.id}
                onClick={() => setDrawerLayout(layout.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg glass-chip border text-[8px] font-bold font-label-caps tracking-widest active:scale-95 transition-all ${
                  drawerLayout === layout.id
                    ? 'bg-primary-fixed-dim/20 text-primary-fixed-dim border-primary-fixed-dim/40 shadow-[0_0_8px_rgba(var(--primary-rgb),0.2)]'
                    : 'border-outline-variant/30 text-on-surface-variant/50 hover:text-white hover:border-white/10'
                }`}
                title={layout.label}
              >
                <span className="material-symbols-outlined text-[11px]">{layout.icon}</span>
                <span>{layout.label}</span>
              </button>
            ))}

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-primary-fixed-dim/10 border border-primary-fixed-dim/40 text-primary-fixed-dim text-[8px] font-bold tracking-widest rounded-lg px-2 py-1 outline-none font-label-caps cursor-pointer"
            >
              <option value="A-Z" className="bg-[#020617]">SORT: A-Z</option>
              <option value="Z-A" className="bg-[#020617]">SORT: Z-A</option>
              <option value="SIZE" className="bg-[#020617]">SORT: SIZE</option>
              <option value="FREQUENCY" className="bg-[#020617]">SORT: FREQUENCY</option>
            </select>

            <button
              onClick={() => setShowHidden(!showHidden)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg glass-chip border text-[8px] font-bold font-label-caps tracking-widest active:scale-95 transition-all ${
                showHidden
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'border-outline-variant/30 text-on-surface-variant/50 hover:text-white hover:border-white/10'
              }`}
            >
              <span className="material-symbols-outlined text-[11px]">{showHidden ? 'visibility' : 'visibility_off'}</span>
              <span>HIDDEN</span>
            </button>

            {installedApps.some(a => a.isHome) && (
              <button
                onClick={handleClearAllHome}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg glass-chip border border-error/30 text-error/70 text-[8px] font-bold font-label-caps tracking-widest active:scale-95 transition-all hover:bg-error/10"
              >
                <span className="material-symbols-outlined text-[11px]">remove_circle</span>
                <span>CLEAR HOME</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {drawerLayout === 'GRID' && (
        <DrawerGrid
          filteredApps={filteredApps} gridColumns={gridColumns} gridRows={gridRows}
          drawerIconSize={drawerIconSize} drawerTextSize={drawerTextSize}
          showAppLabels={showAppLabels}
          globalIconTheme={globalIconTheme} onContextMenu={handleContextMenu} onAppClick={handleAppClick}
          iconShape={iconShape}
        />
      )}

      {drawerLayout === 'LIST' && (
        <DrawerList
          filteredApps={filteredApps} drawerIconSize={drawerIconSize} drawerTextSize={drawerTextSize}
          globalIconTheme={globalIconTheme}
          onContextMenu={handleContextMenu} onAppClick={handleAppClick}
          iconShape={iconShape}
        />
      )}

      {drawerLayout === 'CATEGORIES' && (
        <DrawerCategories
          autoCategoriesItems={autoCategoriesItems} installedApps={categorizedApps}
          drawerIconSize={drawerIconSize} drawerTextSize={drawerTextSize}
          onAppClick={handleAppClick} onContextMenu={handleContextMenu} onCreateFolder={handleCreateFolder}
          iconShape={iconShape}
        />
      )}

      {drawerLayout === 'MESH' && (
        <DrawerMesh
          filteredApps={filteredApps}
          showAppLabels={showAppLabels} drawerIconSize={drawerIconSize}
          drawerTextSize={drawerTextSize}
          activeLetter={activeLetter} setActiveLetter={setActiveLetter}
          onAppClick={handleAppClick} onContextMenu={handleContextMenu}
        />
      )}
      </div>

      <AppContextMenu
        activeContextMenu={activeContextMenu}
        onToggleHomePlacement={handleToggleHomePlacement}
        onLockApp={handleLockApp}
        onTriggerUninstall={handleTriggerUninstall}
        onOpenAppInfo={handleOpenAppInfo}
        onClose={() => setActiveContextMenu(null)}
      />

      {activeFolder && (
        <FolderModal
          folder={activeFolder}
          onClose={() => setActiveFolder(null)}
          onUpdateFolder={handleUpdateFolder}
          onDeleteFolder={() => handleDeleteFolder(activeFolder.id)}
          installedApps={installedApps}
          globalIconTheme={globalIconTheme}
          onTriggerChronoLock={onTriggerChronoLock}
          onTriggerVault={onTriggerVault}
          activePage={null}
          setActivePage={onNavigate}
        />
      )}
    </div>
  )
}
