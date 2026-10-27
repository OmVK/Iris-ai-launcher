import React from 'react'
import { APP_VERSION } from '../../utils/constants'
import { useThemeStore } from '../../stores/themeStore'

const THEME_OPTIONS = [
  { id: 'cyan', label: 'Cyan', color: '#00dbe7' },
  { id: 'amber', label: 'Amber', color: '#ffaa00' },
  { id: 'green', label: 'Acid', color: '#39ff14' },
  { id: 'pink', label: 'Pink', color: '#ff007f' },
  { id: 'purple', label: 'Purple', color: '#9d4edf' },
  { id: 'red', label: 'Rage', color: '#ff1744' },
]

export default function SetupWelcomeStep({ oemInfo, onNext }) {
  const { themeColor, setThemeColor } = useThemeStore()

  const hostDisplay = (oemInfo?.manufacturer && oemInfo.manufacturer !== 'unknown')
    ? `${oemInfo.manufacturer.toUpperCase()} ${oemInfo.model || ''}`.trim()
    : 'SYSTEM HARDWARE'

  return (
    <div className="text-center space-y-5 animate-fade-in">
      <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-primary-fixed-dim/40 animate-ping opacity-30" />
        <div className="w-full h-full rounded-full border-2 border-primary-fixed-dim flex items-center justify-center shadow-[0_0_25px_rgba(var(--primary-rgb),0.35)] bg-black/50">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-primary-fixed-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-black tracking-[0.25em] text-primary-fixed-dim neon-glow uppercase">
          IRIS OS
        </h1>
        <p className="text-[10px] tracking-widest text-primary-fixed-dim/70 uppercase mt-1">
          Cybernetic Neural Launcher v{APP_VERSION}
        </p>
      </div>

      <div className="p-3 bg-black/60 border border-primary-fixed-dim/20 rounded-xl text-left space-y-1.5 text-[10px] font-mono">
        <div className="flex justify-between text-on-surface-variant/60">
          <span>HOST TERMINAL</span>
          <span className="text-primary-fixed-dim font-bold">{hostDisplay}</span>
        </div>
        <div className="flex justify-between text-on-surface-variant/60">
          <span>ARCHITECTURE</span>
          <span className="text-white/80">{oemInfo?.sdkVersion ? `Android SDK ${oemInfo.sdkVersion}` : 'Linux Kernel'}</span>
        </div>
        <div className="flex justify-between text-on-surface-variant/60">
          <span>STATUS</span>
          <span className="text-success font-bold">READY FOR INITIALIZATION</span>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[9px] uppercase tracking-widest text-on-surface-variant/70 font-bold">
          Select Cybernetic Hue
        </p>
        <div className="flex items-center justify-center gap-2">
          {THEME_OPTIONS.map(t => {
            const isSelected = themeColor === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setThemeColor(t.id)}
                className={`w-7 h-7 rounded-full transition-transform active:scale-95 flex items-center justify-center border-2 ${
                  isSelected ? 'border-white scale-110 shadow-[0_0_12px_rgba(255,255,255,0.6)]' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
                style={{ backgroundColor: t.color }}
                title={t.label}
              >
                {isSelected && <span className="material-symbols-outlined text-[13px] text-black font-bold">check</span>}
              </button>
            )
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={onNext}
        className="w-full py-3 bg-primary-fixed-dim/20 border border-primary-fixed-dim/50 text-primary-fixed-dim font-bold rounded-xl hover:bg-primary-fixed-dim/30 transition-all active:scale-95 uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)] mt-2"
      >
        INITIALIZE BOOT
      </button>
    </div>
  )
}
