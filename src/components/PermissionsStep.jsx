import React from 'react'

export default function PermissionsStep({ permissionsGranted, permissionRows, requestPermission, onNext, onBatteryOptimization }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-lg font-bold text-primary-fixed-dim uppercase tracking-widest text-center border-b border-white/10 pb-3">
        Core Authorizations
      </h2>
      <p className="text-[10px] text-on-surface-variant/70 text-center uppercase">
        IRIS requires direct hardware bridging to function optimally.
      </p>
      <div className="space-y-3 max-h-[340px] overflow-y-auto scroll-container">
        {permissionRows.map(perm => (
          <div key={perm.id} className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-lg">
            <div className="flex items-center gap-3">
              <span className={`material-symbols-outlined ${permissionsGranted[perm.id] ? 'text-success' : 'text-primary-fixed-dim'}`}>
                {permissionsGranted[perm.id] ? 'check_circle' : perm.icon}
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase">{perm.label}</p>
                <p className="text-[8px] text-on-surface-variant/50 uppercase">{perm.desc}</p>
              </div>
            </div>
            {!permissionsGranted[perm.id] ? (
              <button
                onClick={() => requestPermission(perm.id)}
                className="px-3 py-1 bg-primary-fixed-dim/10 border border-primary-fixed-dim/30 text-primary-fixed-dim text-[9px] rounded active:scale-95 uppercase font-bold"
              >
                GRANT
              </button>
            ) : (
              <span className="text-[9px] text-success font-bold uppercase tracking-widest pr-2">SECURED</span>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={() => { onBatteryOptimization(); onNext(); }}
        className="w-full py-3 bg-primary-fixed-dim/20 border border-primary-fixed-dim/50 text-primary-fixed-dim font-bold rounded-lg hover:bg-primary-fixed-dim/30 transition-all active:scale-95 uppercase tracking-widest mt-4"
      >
        PROCEED
      </button>
    </div>
  )
}
