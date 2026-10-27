import React from 'react'
import HapticFeedback from '../utils/HapticFeedback'

export default function PermissionsStep({
  permissionsGranted,
  permissionRows,
  requestPermission,
  onGrantAll,
  onNext,
  onBatteryOptimization,
}) {
  const grantedCount = permissionRows.filter((p) => permissionsGranted[p.id]).length
  const totalCount = permissionRows.length
  const allGranted = grantedCount === totalCount

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="border-b border-white/10 pb-3 text-center">
        <h2 className="text-base font-bold text-primary-fixed-dim uppercase tracking-widest">
          Hardware Bridging
        </h2>
        <div className="flex items-center justify-center gap-2 mt-1">
          <span className="text-[9px] text-on-surface-variant/70 uppercase">
            SECURED: {grantedCount} / {totalCount}
          </span>
          <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-fixed-dim transition-all duration-300"
              style={{ width: `${(grantedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto scroll-container pr-1">
        {permissionRows.map((perm) => {
          const isGranted = !!permissionsGranted[perm.id]
          return (
            <div
              key={perm.id}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                isGranted
                  ? 'bg-success/5 border-success/30'
                  : 'bg-black/40 border-white/10 hover:border-primary-fixed-dim/30'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isGranted
                      ? 'bg-success/15 text-success'
                      : 'bg-primary-fixed-dim/10 text-primary-fixed-dim'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">
                    {isGranted ? 'check_circle' : perm.icon}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase truncate text-white/90">
                    {perm.label}
                  </p>
                  <p className="text-[8px] text-on-surface-variant/60 uppercase truncate">
                    {perm.desc}
                  </p>
                </div>
              </div>

              {!isGranted ? (
                <button
                  type="button"
                  onClick={() => {
                    HapticFeedback.light()
                    requestPermission(perm.id)
                  }}
                  className="px-3 py-1 bg-primary-fixed-dim/15 border border-primary-fixed-dim/40 text-primary-fixed-dim text-[9px] rounded-lg active:scale-95 uppercase font-bold tracking-wider shrink-0 hover:bg-primary-fixed-dim/25 transition-all"
                >
                  GRANT
                </button>
              ) : (
                <span className="text-[9px] text-success font-bold uppercase tracking-widest shrink-0 pr-1 flex items-center gap-1">
                  SECURED
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div className="space-y-2 pt-1">
        {!allGranted && onGrantAll && (
          <button
            type="button"
            onClick={() => {
              HapticFeedback.light()
              onGrantAll()
            }}
            className="w-full py-2 bg-primary-fixed-dim/10 border border-primary-fixed-dim/30 text-primary-fixed-dim font-bold rounded-xl hover:bg-primary-fixed-dim/20 transition-all active:scale-95 uppercase tracking-widest text-[10px]"
          >
            GRANT ALL HARDWARE BRIDGES
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            HapticFeedback.light()
            if (onBatteryOptimization) onBatteryOptimization()
            onNext()
          }}
          className="w-full py-3 bg-primary-fixed-dim/20 border border-primary-fixed-dim/50 text-primary-fixed-dim font-bold rounded-xl hover:bg-primary-fixed-dim/30 transition-all active:scale-95 uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]"
        >
          {allGranted ? 'ALL AUTHORIZATIONS SECURED — PROCEED' : 'CONTINUE SETUP'}
        </button>
      </div>
    </div>
  )
}
