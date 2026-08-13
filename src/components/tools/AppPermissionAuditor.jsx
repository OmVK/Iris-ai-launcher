import React, { useState, useMemo } from 'react'
import { useAppsStore } from '../../stores/appsStore'
import { openAppSettings } from '../LauncherPlugin'
import HudFallbackIcon from '../HudFallbackIcon'

const SENSITIVE_PERMISSIONS = [
  { key: 'camera', label: 'CAM', icon: 'photo_camera', risk: 25 },
  { key: 'microphone', label: 'MIC', icon: 'mic', risk: 25 },
  { key: 'location', label: 'GPS', icon: 'location_on', risk: 20 },
  { key: 'contacts', label: 'CONTACTS', icon: 'contacts', risk: 15 },
  { key: 'storage', label: 'STORAGE', icon: 'folder', risk: 10 },
  { key: 'sms', label: 'SMS', icon: 'sms', risk: 20 },
]

export default function AppPermissionAuditor({ glassBg }) {
  const installedApps = useAppsStore(s => s.installedApps) || []
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  const auditedApps = useMemo(() => {
    return installedApps.map(app => {
      const nameLower = (app.name || '').toLowerCase()
      const pkgLower = (app.packageId || '').toLowerCase()

      // Infer sensitive permissions based on package keywords or flags
      const inferredPerms = []
      if (pkgLower.includes('camera') || pkgLower.includes('gallery') || pkgLower.includes('snap') || pkgLower.includes('photo') || pkgLower.includes('instagram') || pkgLower.includes('whatsapp') || pkgLower.includes('zoom')) {
        inferredPerms.push('camera')
      }
      if (pkgLower.includes('mic') || pkgLower.includes('audio') || pkgLower.includes('voice') || pkgLower.includes('whatsapp') || pkgLower.includes('recorder') || pkgLower.includes('meet') || pkgLower.includes('zoom')) {
        inferredPerms.push('microphone')
      }
      if (pkgLower.includes('map') || pkgLower.includes('uber') || pkgLower.includes('cab') || pkgLower.includes('weather') || pkgLower.includes('location') || pkgLower.includes('deliver') || pkgLower.includes('find')) {
        inferredPerms.push('location')
      }
      if (pkgLower.includes('contact') || pkgLower.includes('dialer') || pkgLower.includes('phone') || pkgLower.includes('whatsapp') || pkgLower.includes('messenger') || pkgLower.includes('social')) {
        inferredPerms.push('contacts')
      }
      if (pkgLower.includes('sms') || pkgLower.includes('msg') || pkgLower.includes('text') || pkgLower.includes('chat')) {
        inferredPerms.push('sms')
      }
      if (pkgLower.includes('file') || pkgLower.includes('media') || pkgLower.includes('download') || pkgLower.includes('drive')) {
        inferredPerms.push('storage')
      }

      // Default baseline for common social/comm apps
      if (pkgLower.includes('facebook') || pkgLower.includes('tiktok') || pkgLower.includes('telegram')) {
        if (!inferredPerms.includes('camera')) inferredPerms.push('camera')
        if (!inferredPerms.includes('microphone')) inferredPerms.push('microphone')
        if (!inferredPerms.includes('location')) inferredPerms.push('location')
      }

      let riskScore = inferredPerms.reduce((acc, permKey) => {
        const item = SENSITIVE_PERMISSIONS.find(p => p.key === permKey)
        return acc + (item ? item.risk : 0)
      }, 10)

      let riskLevel = 'LOW'
      if (riskScore >= 60) riskLevel = 'CRITICAL'
      else if (riskScore >= 40) riskLevel = 'HIGH'
      else if (riskScore >= 20) riskLevel = 'MEDIUM'

      return {
        ...app,
        permissions: inferredPerms,
        riskScore: Math.min(riskScore, 100),
        riskLevel
      }
    }).sort((a, b) => b.riskScore - a.riskScore)
  }, [installedApps])

  const stats = useMemo(() => {
    const critical = auditedApps.filter(a => a.riskLevel === 'CRITICAL').length
    const high = auditedApps.filter(a => a.riskLevel === 'HIGH').length
    const medium = auditedApps.filter(a => a.riskLevel === 'MEDIUM').length
    const low = auditedApps.filter(a => a.riskLevel === 'LOW').length
    return { total: auditedApps.length, critical, high, medium, low }
  }, [auditedApps])

  const filteredApps = useMemo(() => {
    return auditedApps.filter(app => {
      const matchSearch = search.trim() === '' || 
        app.name.toLowerCase().includes(search.toLowerCase()) || 
        app.packageId.toLowerCase().includes(search.toLowerCase())
      
      if (!matchSearch) return false

      if (filter === 'CRITICAL') return app.riskLevel === 'CRITICAL'
      if (filter === 'HIGH') return app.riskLevel === 'HIGH' || app.riskLevel === 'CRITICAL'
      if (filter === 'SAFE') return app.riskLevel === 'LOW'
      return true
    })
  }, [auditedApps, search, filter])

  const handleOpenInfo = async (pkg) => {
    try {
      await openAppSettings(pkg)
    } catch (e) {
      console.warn("Could not open app info for:", pkg, e)
    }
  }

  return (
    <div className="flex flex-col gap-4 font-mono-data">
      {/* Header Metrics */}
      <div className="grid grid-cols-4 gap-2 text-center p-3 rounded-xl border border-sky-500/20 bg-sky-950/10 backdrop-blur-md">
        <div>
          <span className="text-[8px] text-on-surface-variant/40 uppercase block">Total Apps</span>
          <span className="text-sm font-bold text-sky-400">{stats.total}</span>
        </div>
        <div>
          <span className="text-[8px] text-red-400/60 uppercase block">Critical</span>
          <span className="text-sm font-bold text-red-400">{stats.critical}</span>
        </div>
        <div>
          <span className="text-[8px] text-amber-400/60 uppercase block">High Risk</span>
          <span className="text-sm font-bold text-amber-400">{stats.high}</span>
        </div>
        <div>
          <span className="text-[8px] text-emerald-400/60 uppercase block">Low Risk</span>
          <span className="text-sm font-bold text-emerald-400">{stats.low}</span>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col gap-2">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter package or app name..."
          className="w-full bg-black/40 border border-outline-variant/30 rounded-lg px-3 py-2 text-xs text-on-surface-variant focus:outline-none focus:border-sky-500/50"
        />

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {['ALL', 'CRITICAL', 'HIGH', 'SAFE'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-md text-[9px] font-bold tracking-wider transition-all ${
                filter === f 
                  ? 'bg-sky-500/20 border border-sky-400 text-sky-300' 
                  : 'bg-black/20 border border-white/10 text-on-surface-variant/50 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* App List */}
      <div className="space-y-2 max-h-[380px] overflow-y-auto no-scrollbar pr-1">
        {filteredApps.length === 0 ? (
          <div className="text-center py-8 text-on-surface-variant/40 text-xs">
            No matching applications found.
          </div>
        ) : (
          filteredApps.map(app => (
            <div
              key={app.packageId}
              className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-black/30 hover:border-sky-500/30 transition-all group"
            >
              <div className="flex items-center gap-3 min-w-0">
                {app.icon ? (
                  <img src={app.icon} alt={app.name} className="w-8 h-8 rounded-lg object-cover" />
                ) : (
                  <HudFallbackIcon name={app.name} className="w-8 h-8 rounded-lg text-sky-400" />
                )}

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white truncate max-w-[140px]">{app.name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold tracking-widest uppercase ${
                      app.riskLevel === 'CRITICAL' ? 'bg-red-500/20 border border-red-500/40 text-red-400' :
                      app.riskLevel === 'HIGH' ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300' :
                      app.riskLevel === 'MEDIUM' ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-300' :
                      'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    }`}>
                      {app.riskLevel}
                    </span>
                  </div>

                  <span className="text-[8.5px] text-on-surface-variant/40 truncate max-w-[180px]">{app.packageId}</span>

                  {/* Permission Tags */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {app.permissions.length === 0 ? (
                      <span className="text-[7.5px] text-emerald-400/60 uppercase">NO DANGEROUS PERMS</span>
                    ) : (
                      app.permissions.map(permKey => {
                        const meta = SENSITIVE_PERMISSIONS.find(p => p.key === permKey)
                        return (
                          <span key={permKey} className="flex items-center gap-0.5 px-1 rounded bg-white/5 border border-white/10 text-[7.5px] text-on-surface-variant/60">
                            <span className="material-symbols-outlined text-[9px] text-sky-400">{meta?.icon}</span>
                            <span>{meta?.label || permKey}</span>
                          </span>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleOpenInfo(app.packageId)}
                className="px-2.5 py-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-300 text-[9px] font-bold uppercase tracking-wider hover:bg-sky-500/20 active:scale-95 transition-all ml-2 shrink-0"
              >
                Inspect
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
