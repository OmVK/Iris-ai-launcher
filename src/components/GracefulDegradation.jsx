import { useState, useEffect, useCallback } from 'react'
import { getDegradedFeatures, getPermissionSummary, isCorePermission, requestCorePermissions, requestOptionalPermissions, requestPermission } from '../utils/PermissionManager'

export default function GracefulDegradation() {
  const [summary, setSummary] = useState(null)
  const [deniedFeatures, setDeniedFeatures] = useState([])
  const [showPanel, setShowPanel] = useState(false)
  const [requesting, setRequesting] = useState(false)

  const loadSummary = useCallback(async () => {
    try {
      const result = await getPermissionSummary()
      setSummary(result)
      const deniedPerms = Object.entries(result.permissions || {})
        .filter(([, granted]) => !granted)
        .map(([perm]) => perm)
      const degraded = getDegradedFeatures(deniedPerms)
      setDeniedFeatures(degraded)
      window.__irisDegradedCount = degraded.length
      window.dispatchEvent(new CustomEvent('iris:permission-summary', {
        detail: { summary: result, deniedCount: degraded.length }
      }))
    } catch (e) {
      // Silently fail
    }
  }, [])

  useEffect(() => {
    loadSummary()
    const interval = setInterval(loadSummary, 60000)
    const handleOpen = () => {
      loadSummary()
      setShowPanel(true)
    }
    const handleResume = () => {
      if (document.visibilityState === 'visible') {
        setTimeout(loadSummary, 300)
      }
    }
    window.addEventListener('iris:open-permission-modal', handleOpen)
    window.addEventListener('focus', handleResume)
    document.addEventListener('visibilitychange', handleResume)
    return () => {
      clearInterval(interval)
      window.removeEventListener('iris:open-permission-modal', handleOpen)
      window.removeEventListener('focus', handleResume)
      document.removeEventListener('visibilitychange', handleResume)
    }
  }, [loadSummary])

  const scheduleRefresh = useCallback(() => {
    setTimeout(loadSummary, 800)
    setTimeout(loadSummary, 2200)
  }, [loadSummary])

  const handleRequestSingle = useCallback(async (permission) => {
    setRequesting(true)
    try {
      await requestPermission(permission)
      await loadSummary()
      scheduleRefresh()
    } finally {
      setRequesting(false)
    }
  }, [loadSummary, scheduleRefresh])

  const handleRequestCore = useCallback(async () => {
    setRequesting(true)
    try {
      await requestCorePermissions()
      await loadSummary()
      scheduleRefresh()
    } finally {
      setRequesting(false)
    }
  }, [loadSummary, scheduleRefresh])

  const handleRequestOptional = useCallback(async () => {
    setRequesting(true)
    try {
      await requestOptionalPermissions()
      await loadSummary()
      scheduleRefresh()
    } finally {
      setRequesting(false)
    }
  }, [loadSummary, scheduleRefresh])

  if (!summary || !showPanel) return null

  const percentage = Math.round((summary.granted / summary.total) * 100)
  const coreDeniedCount = deniedFeatures.filter(d => isCorePermission(d.permission)).length

  return (
    <div className="fixed inset-0 z-[9998] flex items-end justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPanel(false)} />
      <div className="relative glass-surface rounded-2xl p-5 w-full max-w-md mb-4 animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-rounded text-amber-400 text-lg">shield</span>
            <h3 className="text-xs font-semibold text-white/90 font-mono-data">PERMISSION STATUS</h3>
          </div>
          <button onClick={() => setShowPanel(false)} className="text-white/30 hover:text-white/60">
            <span className="material-symbols-rounded text-lg">close</span>
          </button>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-white/40 font-mono-data">GRANTED</span>
            <span className="text-[10px] text-white/60 font-mono-data">{summary.granted}/{summary.total} ({percentage}%)</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${percentage}%`,
                backgroundColor: percentage > 70 ? 'var(--primary-color)' : percentage > 40 ? '#f59e0b' : '#ef4444',
              }}
            />
          </div>
        </div>

        {deniedFeatures.length > 0 ? (
          <div className="space-y-1.5 mb-4 max-h-44 overflow-y-auto">
            {deniedFeatures.map(({ permission, feature }) => (
              <button
                key={permission}
                type="button"
                onClick={() => handleRequestSingle(permission)}
                disabled={requesting}
                className="w-full flex items-center justify-between py-2 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 active:scale-[0.99] transition-all text-left"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span className="material-symbols-rounded text-amber-400 text-xs shrink-0">warning</span>
                  <div className="min-w-0">
                    <div className="text-[10px] text-white/80 font-mono-data truncate">{feature}</div>
                    <div className="text-[8.5px] text-white/35 font-mono-data truncate">{permission}</div>
                  </div>
                </div>
                <span className="text-[9px] text-amber-400/90 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded font-mono-data shrink-0">
                  GRANT
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-3 px-3 mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono-data text-center">
            ALL PERMISSIONS GRANTED
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={coreDeniedCount > 0 ? handleRequestCore : handleRequestOptional}
            disabled={requesting || deniedFeatures.length === 0}
            className="flex-1 py-2 rounded-xl bg-[rgba(var(--primary-rgb),0.15)] text-[var(--primary-color)] text-[10px] font-semibold font-mono-data hover:bg-[rgba(var(--primary-rgb),0.25)] transition-all disabled:opacity-50"
          >
            {requesting ? '...' : coreDeniedCount > 0 ? `GRANT CORE (${coreDeniedCount})` : 'CORE GRANTED ✓'}
          </button>
          <button
            onClick={handleRequestOptional}
            disabled={requesting || deniedFeatures.length === 0}
            className="flex-1 py-2 rounded-xl bg-white/5 text-white/70 text-[10px] font-mono-data hover:bg-white/10 transition-all disabled:opacity-50"
          >
            {requesting ? '...' : `GRANT NEXT (${deniedFeatures.length})`}
          </button>
        </div>
      </div>
    </div>
  )
}
