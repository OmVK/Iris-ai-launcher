export default function ChronoClockDial({ statusState, onBiometricTap, onCaptureThreat }) {
  return (
    <div className="relative w-64 h-36 flex flex-col items-center justify-center my-4 overflow-hidden border border-primary-fixed-dim/20 bg-black/45 rounded-xl">
      <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(var(--primary-rgb),0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--primary-rgb),0.15)_1px,transparent_1px)] bg-[size:16px_16px]" />

      <svg className="absolute w-36 h-36 text-primary-fixed-dim opacity-20 pointer-events-none" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 4" className="animate-[spin_40s_linear_infinite]" />
        <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="0.75" strokeDasharray="20 10 5 10" className="animate-[spin_25s_linear_infinite_reverse]" />
        <circle cx="50" cy="50" r="32" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 3" className="animate-[spin_12s_linear_infinite]" />
      </svg>

      <div className="scan-line opacity-30 pointer-events-none" />

      <button
        onClick={onBiometricTap}
        className="relative flex flex-col items-center select-none z-10 space-y-2 hover:scale-110 active:scale-95 transition-transform"
      >
        <div className="relative flex items-center justify-center">
          <div className="absolute w-14 h-14 rounded-full border border-primary-fixed-dim/30 animate-ping opacity-75" />
          <span className="material-symbols-outlined text-4xl text-primary-fixed-dim drop-shadow-[0_0_12px_rgba(var(--primary-rgb),0.6)] animate-pulse">
            fingerprint
          </span>
        </div>
        <span className="text-[7.5px] font-label-caps tracking-widest text-primary-fixed-dim/70 bg-primary-fixed-dim/15 px-2.5 py-0.5 rounded-full border border-primary-fixed-dim/35 shadow-[0_0_8px_rgba(var(--primary-rgb),0.15)] uppercase">
          TAP FOR BIOMETRIC VERIFICATION
        </span>
      </button>

      {statusState === 'GRANTED' && (
        <div className="absolute inset-0 bg-[#39ff14]/15 backdrop-blur-sm flex flex-col items-center justify-center font-bold text-[#39ff14] font-label-caps text-xs tracking-widest gap-1 z-20 animate-in fade-in duration-200">
          <span className="material-symbols-outlined text-3xl animate-bounce">lock_open</span>
          <span>SECURE ACCESS GRANTED</span>
        </div>
      )}

      {statusState === 'DENIED' && (
        <div className="absolute inset-0 bg-error/15 backdrop-blur-sm flex flex-col items-center justify-center font-bold text-error font-label-caps text-xs tracking-widest gap-1 z-20 animate-in fade-in duration-100">
          <span className="material-symbols-outlined text-3xl animate-pulse">gpp_bad</span>
          <span>ACCESS DENIED</span>
        </div>
      )}
    </div>
  )
}
