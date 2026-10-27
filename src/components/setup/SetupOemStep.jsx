import React from 'react'

export default function SetupOemStep({ oemData, oemBatteryDone, onOpenOemSettings, onBatteryOptimization, onNext }) {
  return (
    <div className="space-y-5 animate-fade-in text-center">
      <div className="border-b border-white/10 pb-3">
        <h2 className="text-base font-bold text-[#ff9800] uppercase tracking-widest">
          Background Protection
        </h2>
        <p className="text-[9px] text-[#ff9800]/80 uppercase tracking-wider mt-0.5">
          {oemData?.brand || 'OEM'} Device Profile Detected
        </p>
      </div>

      <div className="w-14 h-14 mx-auto bg-[#ff9800]/10 rounded-full border border-[#ff9800]/30 flex items-center justify-center shadow-[0_0_20px_rgba(255,152,0,0.2)]">
        <span className="material-symbols-outlined text-2xl text-[#ff9800]">battery_alert</span>
      </div>

      <div className="text-left bg-black/50 border border-[#ff9800]/25 rounded-xl p-3.5 space-y-2.5">
        <p className="text-[10px] text-white/90 leading-relaxed font-sans">
          Your manufacturer aggressively terminates background launcher services to save power. To ensure continuous voice recognition, real-time widgets, and alarm reminders function correctly, exempt IRIS from battery killers:
        </p>

        {oemData?.steps && (
          <div className="bg-[#ff9800]/10 border border-[#ff9800]/20 rounded-lg p-2.5">
            <p className="text-[10px] text-[#ff9800] font-semibold leading-relaxed font-mono">
              {oemData.steps}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={onOpenOemSettings}
          className="w-full py-2.5 bg-[#ff9800]/20 border border-[#ff9800]/50 text-[#ff9800] font-bold rounded-lg hover:bg-[#ff9800]/30 transition-all active:scale-95 uppercase tracking-widest text-[11px] flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-base">settings</span>
          OPEN {oemData?.brand?.toUpperCase() || 'OEM'} SETTINGS
        </button>

        <button
          type="button"
          onClick={onBatteryOptimization}
          className="w-full py-2 bg-white/5 border border-white/10 text-white/70 font-semibold rounded-lg hover:bg-white/10 transition-all active:scale-95 uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">battery_charging_full</span>
          REQUEST SYSTEM EXEMPTION
        </button>
      </div>

      {oemBatteryDone && (
        <p className="text-[9px] text-success uppercase tracking-widest animate-fade-in font-bold">
          [✓] System settings opened — confirm exemption and proceed
        </p>
      )}

      <button
        type="button"
        onClick={onNext}
        className="w-full py-2.5 bg-primary-fixed-dim/20 border border-primary-fixed-dim/40 text-primary-fixed-dim font-bold rounded-lg hover:bg-primary-fixed-dim/30 transition-all active:scale-95 uppercase tracking-widest text-[10px]"
      >
        {oemBatteryDone ? 'CONTINUE TO NEXT NODE' : 'SKIP FOR NOW'}
      </button>
    </div>
  )
}
