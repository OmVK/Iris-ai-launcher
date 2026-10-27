import React from 'react'
import { APP_VERSION } from '../../utils/constants'

export default function SetupReadyStep({ city, onComplete }) {
  return (
    <div className="space-y-5 animate-fade-in text-center">
      <div className="border-b border-white/10 pb-3">
        <h2 className="text-base font-bold text-success uppercase tracking-widest neon-glow">
          System Initialized
        </h2>
        <p className="text-[9px] text-on-surface-variant/70 uppercase tracking-wider mt-0.5">
          All Neural Bridges Operational
        </p>
      </div>

      <div className="w-16 h-16 mx-auto rounded-full border-2 border-success flex items-center justify-center bg-success/10 shadow-[0_0_25px_rgba(0,255,100,0.25)] animate-[pulse_3s_infinite]">
        <span className="material-symbols-outlined text-3xl text-success">check_circle</span>
      </div>

      <div className="bg-black/60 border border-success/30 rounded-xl p-3 text-left space-y-2 text-[10px] font-mono">
        <div className="flex justify-between items-center text-white/90">
          <span>NEURAL CORE</span>
          <span className="text-success font-bold">[ONLINE v{APP_VERSION}]</span>
        </div>
        <div className="flex justify-between items-center text-white/90">
          <span>TELEMETRY NODE</span>
          <span className="text-primary-fixed-dim font-bold">[{city.toUpperCase()}]</span>
        </div>
        <div className="flex justify-between items-center text-white/90">
          <span>CHRONO VAULT</span>
          <span className="text-success font-bold">[ARMED]</span>
        </div>
        <div className="flex justify-between items-center text-white/90">
          <span>GESTURE MATRIX</span>
          <span className="text-primary-fixed-dim font-bold">[CALIBRATED]</span>
        </div>
      </div>

      <div className="space-y-2 pt-1">
        <button
          type="button"
          onClick={() => onComplete({ startTour: true })}
          className="w-full py-3 bg-primary-fixed-dim/20 border border-primary-fixed-dim/60 text-primary-fixed-dim font-bold rounded-xl hover:bg-primary-fixed-dim/30 transition-all active:scale-95 uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-base">explore</span>
          30-SEC QUICK TOUR (RECOMMENDED)
        </button>

        <button
          type="button"
          onClick={() => onComplete({ startTour: false })}
          className="w-full py-2.5 bg-white/5 border border-white/10 text-white/80 font-semibold rounded-xl hover:bg-white/10 transition-all active:scale-95 uppercase tracking-widest text-[10px]"
        >
          ENTER COMMAND CENTER DIRECTLY
        </button>
      </div>
    </div>
  )
}
