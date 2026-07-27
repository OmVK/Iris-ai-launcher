import { useState, useEffect, useCallback } from 'react'
import { getDegradedFeatures, getPermissionSummary, requestCorePermissions, requestOptionalPermissions } from '../utils/PermissionManager'

export default function GracefulDegradation() {
  const [summary, setSummary] = useState(null)
  const [deniedFeatures, setDeniedFeatures] = useState([])
  const [showPanel, setShowPanel] = useState(false)
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    loadSummary()
    const interval = setInterval(loadSummary, 60000)
    return () => clearInterval(interval)
  }, [])

  async function loadSummary() {
    try {
      const result = await getPermissionSummary()
      setSummary(result)
      const deniedPerms = Object.entries(result.permissions || {})
        .filter(([, granted]) => !granted)
        .map(([perm]) => perm)
      setDeniedFeatures(getDegradedFeatures(deniedPerms))
    } catch (e) {
      // Silently fail
    }
  }

  const handleRequestCore = useCallback(async () => {
    setRequesting(true)
    try {
      await requestCorePermissions()
      await loadSummary()
    } finally {
      setRequesting(false)
    }
  }, [])

  const handleRequestOptional = useCallback(async () => {
    setRequesting(true)
    try {
      await requestOptionalPermissions()
      await loadSummary()
    } finally {
      setRequesting(false)
    }
  }, [])

  if (!summary || deniedFeatures.length === 0) return null

  const percentage = Math.round((summary.granted / summary.total) * 100)

  return (
    <>
      {!showPanel && (
        <button
          onClick={() => setShowPanel(true)}
          className="fixed bottom-20 left-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-mono-data hover:bg-amber-500/20 transition-all"
        >
          <span className="material-symbols-rounded text-xs">warning</span>
          {deniedFeatures.length} FEATURE{deniedFeatures.length > 1 ? 'S' : ''} DEGRADED
        </button>
      )}

      {showPanel && (
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

            <div className="space-y-1.5 mb-4 max-h-40 overflow-y-auto">
              {deniedFeatures.map(({ permission, feature }) => (
                <div key={permission} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-white/5">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-rounded text-amber-400 text-xs">warning</span>
                    <span className="text-[10px] text-white/70 font-mono-data">{feature}</span>
                  </div>
                  <span className="text-[9px] text-white/30 font-mono-data">{permission}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleRequestCore}
                disabled={requesting}
                className="flex-1 py-2 rounded-xl bg-[rgba(var(--primary-rgb),0.15)] text-[var(--primary-color)] text-[10px] font-semibold font-mono-data hover:bg-[rgba(var(--primary-rgb),0.25)] transition-all disabled:opacity-50"
              >
                {requesting ? '...' : 'GRANT CORE'}
              </button>
              <button
                onClick={handleRequestOptional}
                disabled={requesting}
                className="flex-1 py-2 rounded-xl bg-white/5 text-white/50 text-[10px] font-mono-data hover:bg-white/10 transition-all disabled:opacity-50"
              >
                {requesting ? '...' : 'GRANT ALL'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
