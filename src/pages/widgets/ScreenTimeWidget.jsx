import React, { useState, useEffect, useCallback } from 'react'
import { getScreenTimeStats, openPermissionSettings, launchApp } from '../../components/LauncherPlugin'
import HapticFeedback from '../../utils/HapticFeedback'

function formatDuration(ms) {
  if (!ms || ms <= 0) return '0m'
  const totalMins = Math.max(1, Math.round(ms / 60000))
  const hrs = Math.floor(totalMins / 60)
  const mins = totalMins % 60
  if (hrs > 0) return `${hrs}h ${mins}m`
  return `${mins}m`
}

export default function ScreenTimeWidget({ isAppActive = true }) {
  const [stats, setStats] = useState({ granted: true, totalScreenTimeMs: 0, apps: [] })
  const [loading, setLoading] = useState(true)

  const refreshStats = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getScreenTimeStats()
      if (data) setStats(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAppActive) return
    refreshStats()
    const timer = setInterval(refreshStats, 60000)
    return () => clearInterval(timer)
  }, [isAppActive, refreshStats])

  const totalHours = (stats.totalScreenTimeMs || 0) / 3600000
  const loadBadge =
    totalHours > 6
      ? { label: 'HIGH LOAD', cls: 'bg-error/20 border-error/40 text-error' }
      : totalHours > 3
        ? { label: 'MODERATE', cls: 'bg-amber-500/20 border-amber-400/40 text-amber-300' }
        : { label: 'OPTIMAL', cls: 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300' }

  return (
    <div className="iris-card border border-white/10 rounded-2xl p-4 relative h-full flex flex-col justify-between shadow-[0_8px_24px_rgba(0,0,0,0.45)] select-none">
      <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary-fixed-dim text-base">timelapse</span>
          <div>
            <span className="font-label-caps text-[10px] font-bold text-primary-fixed-dim tracking-wider block">
              DIGITAL WELLBEING // SCREEN TIME
            </span>
            <span className="font-mono-data text-[8px] text-white/40 uppercase">
              DAILY FOREGROUND TELEMETRY
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`px-2 py-0.5 rounded text-[7.5px] font-mono-data font-bold border ${loadBadge.cls}`}>
            {loadBadge.label}
          </span>
          <button
            type="button"
            onClick={() => {
              HapticFeedback.light()
              refreshStats()
            }}
            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            title="Refresh Screen Time"
          >
            <span className={`material-symbols-outlined text-xs ${loading ? 'animate-spin' : ''}`}>refresh</span>
          </button>
        </div>
      </div>

      {!stats.granted ? (
        <div className="flex-1 flex flex-col items-center justify-center py-4 text-center gap-2">
          <span className="material-symbols-outlined text-amber-400 text-2xl">lock_clock</span>
          <p className="text-[9.5px] font-mono-data text-white/80 font-bold uppercase tracking-wider">
            USAGE TELEMETRY ACCESS REQUIRED
          </p>
          <p className="text-[8px] font-mono text-white/45 max-w-[230px]">
            Grant Usage Access so IRIS can compute real-time screen time and app activity breakdown.
          </p>
          <button
            type="button"
            onClick={() => {
              HapticFeedback.light()
              openPermissionSettings('PACKAGE_USAGE_STATS')
            }}
            className="mt-1 px-3 py-1.5 rounded-lg bg-primary-fixed-dim/20 border border-primary-fixed-dim/50 text-primary-fixed-dim text-[8.5px] font-mono-data font-bold uppercase tracking-wider active:scale-95 transition-transform"
          >
            ENABLE USAGE ACCESS
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-between pt-3 gap-3">
          <div className="flex items-baseline justify-between bg-black/30 border border-white/5 rounded-xl px-3 py-2">
            <span className="text-[8.5px] font-mono-data text-white/50 uppercase tracking-wider">TODAY TOTAL ACTIVE</span>
            <span className="text-lg font-mono-data font-bold text-primary-fixed-dim neon-glow">
              {formatDuration(stats.totalScreenTimeMs)}
            </span>
          </div>

          <div className="space-y-2 flex-1 flex flex-col justify-center">
            {(stats.apps || []).slice(0, 4).map((app) => {
              const isImg = app.icon && typeof app.icon === 'string' && (app.icon.startsWith('http') || app.icon.startsWith('data:'))
              return (
                <div
                  key={app.packageId}
                  onClick={() => {
                    HapticFeedback.light()
                    launchApp(app.packageId)
                  }}
                  className="group flex items-center gap-2.5 p-1.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 cursor-pointer transition-colors"
                >
                  <div className="w-6 h-6 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {isImg ? (
                      <img src={app.icon} alt="" className="w-4 h-4 object-contain" decoding="async" />
                    ) : (
                      <span className="material-symbols-outlined text-xs text-primary-fixed-dim">{app.icon || 'apps'}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-[9px] font-mono-data mb-1">
                      <span className="text-white/90 font-semibold truncate">{app.label}</span>
                      <span className="text-primary-fixed-dim/80 shrink-0 ml-2">
                        {formatDuration(app.usageMs)} ({app.percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-fixed-dim to-emerald-400 rounded-full"
                        style={{ width: `${Math.max(4, Math.min(100, app.percentage || 5))}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
            {(!stats.apps || stats.apps.length === 0) && (
              <div className="text-center py-4 text-[9px] font-mono-data text-white/35 uppercase">
                NO FOREGROUND APP ACTIVITY LOGGED YET TODAY
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

