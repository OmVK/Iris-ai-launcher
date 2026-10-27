import React from 'react'

const CITY_PRESETS = ['Neo Tokyo', 'New York', 'London', 'Berlin', 'Singapore', 'Sydney']

export default function SetupNodeStep({
  city,
  setCity,
  locationGranted,
  onDetectLocation,
  detectingLocation,
  onNext,
}) {
  return (
    <div className="space-y-4 animate-fade-in text-center">
      <div className="border-b border-white/10 pb-3">
        <h2 className="text-base font-bold text-primary-fixed-dim uppercase tracking-widest">
          Meteorological Link
        </h2>
        <p className="text-[9px] text-on-surface-variant/70 uppercase tracking-wider mt-0.5">
          Satellite Telemetry & Orbital Sync
        </p>
      </div>

      <div className="w-14 h-14 mx-auto bg-primary-fixed-dim/10 rounded-full border border-primary-fixed-dim/30 flex items-center justify-center animate-pulse shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]">
        <span className="material-symbols-outlined text-2xl text-primary-fixed-dim">satellite_alt</span>
      </div>

      <p className="text-[10px] text-on-surface-variant/80 uppercase leading-relaxed font-sans">
        {locationGranted && city !== 'Neo Tokyo'
          ? 'Primary node auto-detected via device GPS telemetry.'
          : 'Acquire orbital coordinates or select your local telemetry station.'}
      </p>

      {locationGranted && city !== 'Neo Tokyo' ? (
        <div className="w-full bg-success/10 border border-success/40 rounded-xl px-4 py-3 text-xs text-success font-bold uppercase tracking-widest text-center shadow-[0_0_15px_rgba(0,255,100,0.1)] flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-sm">my_location</span>
          <span>{city}</span>
        </div>
      ) : (
        <div className="space-y-2.5">
          {onDetectLocation && (
            <button
              type="button"
              disabled={detectingLocation}
              onClick={onDetectLocation}
              className="w-full py-2.5 bg-primary-fixed-dim/15 border border-primary-fixed-dim/40 text-primary-fixed-dim font-bold rounded-xl hover:bg-primary-fixed-dim/25 transition-all active:scale-95 uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">
                {detectingLocation ? 'refresh' : 'near_me'}
              </span>
              <span>{detectingLocation ? 'ACQUIRING GPS FIX...' : 'DETECT CURRENT GPS LOCATION'}</span>
            </button>
          )}

          <div className="flex items-center gap-2 my-1">
            <div className="h-px bg-white/10 flex-1" />
            <span className="text-[8px] text-on-surface-variant/50 uppercase">OR CUSTOM NODE</span>
            <div className="h-px bg-white/10 flex-1" />
          </div>

          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="ENTER CITY NAME"
            className="w-full bg-black/60 border border-primary-fixed-dim/40 rounded-xl px-4 py-2 text-xs text-primary-fixed-dim focus:outline-none uppercase tracking-widest text-center focus:border-primary-fixed-dim"
          />

          <div className="flex flex-wrap gap-1.5 justify-center">
            {CITY_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setCity(p)}
                className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider border transition-all ${
                  city === p
                    ? 'bg-primary-fixed-dim/30 border-primary-fixed-dim text-primary-fixed-dim shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]'
                    : 'bg-black/40 border-white/10 text-on-surface-variant/70 hover:border-white/20'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onNext}
        className="w-full py-3 bg-primary-fixed-dim/20 border border-primary-fixed-dim/50 text-primary-fixed-dim font-bold rounded-xl hover:bg-primary-fixed-dim/30 transition-all active:scale-95 uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)] mt-1"
      >
        CONFIRM TELEMETRY NODE
      </button>
    </div>
  )
}
