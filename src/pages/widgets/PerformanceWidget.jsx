import React from 'react'

export default function PerformanceWidget({
  batteryLevel,
  isCharging,
  osVersion,
  usedMem,
  totalMem,
  cpuTemp,
  isDiagnosticRunning,
  onCpuClick,
}) {
  const memPct = Math.min(100, Math.max(0, (parseFloat(usedMem) / (parseFloat(totalMem) || 1)) * 100))

  return (
    <section
      onClick={onCpuClick}
      className="glass-surface border border-white/10 rounded-2xl p-4 relative overflow-hidden group cursor-pointer hover:border-primary-fixed-dim/40 active:scale-[0.99] transition-all w-full h-full flex flex-col justify-between bg-[#080d16]/85 backdrop-blur-xl"
    >
      <div className="scan-line opacity-20 pointer-events-none" />

      <div className="flex justify-between items-start mb-3">
        <div>
          <h2 className="font-label-caps text-[10px] text-primary-fixed-dim tracking-widest uppercase font-bold">
            {isDiagnosticRunning ? 'OPTIMIZING RAM & CORE SECTORS...' : 'System Telemetry'}
          </h2>
          <p className="font-mono-data text-on-surface-variant/70 text-[8.5px] uppercase mt-0.5 tracking-wider">
            {isDiagnosticRunning ? 'KILLING IDLE PROCESSES // REFRESHING' : 'TAP TO SWEEP & OPTIMIZE RAM'}
          </p>
        </div>
        <span
          className={`material-symbols-outlined text-primary-fixed-dim text-lg ${
            isDiagnosticRunning ? 'animate-spin' : 'animate-pulse'
          }`}
        >
          {isDiagnosticRunning ? 'settings_backup_restore' : 'memory'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
        <div className="flex flex-col items-center justify-center p-1">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
              <circle
                cx="48"
                cy="48"
                r="40"
                fill="none"
                stroke={isCharging ? '#22c55e' : batteryLevel < 20 ? '#ff5252' : 'var(--primary-color, #00dbe7)'}
                strokeWidth="5"
                strokeDasharray={2 * Math.PI * 40}
                strokeDashoffset={2 * Math.PI * 40 * (1 - batteryLevel / 100)}
                className="transition-all duration-700 drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]"
              />
            </svg>
            <div className="flex flex-col items-center">
              <span
                className={`text-xl font-bold font-mono-data ${
                  isCharging ? 'text-green-400' : batteryLevel < 20 ? 'text-error' : 'text-primary-fixed-dim'
                }`}
              >
                {batteryLevel}%
              </span>
              <span className="text-[8px] tracking-wider text-on-surface-variant/70 font-label-caps uppercase mt-0.5">
                {isCharging ? 'CHARGING' : 'BATTERY'}
              </span>
            </div>
          </div>
        </div>

        <div className="sm:col-span-2 font-mono-data space-y-2 bg-black/40 p-3 rounded-xl border border-white/5">
          <div className="flex justify-between text-[10px]">
            <span className="text-on-surface-variant/70">HOST ARCH:</span>
            <span className="text-primary-fixed-dim font-bold truncate max-w-[140px]">{osVersion}</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[9px]">
              <span className="text-on-surface-variant/70">SYS_RAM:</span>
              <span className="text-white font-bold">{usedMem}G / {totalMem}G</span>
            </div>
            <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-fixed-dim shadow-[0_0_6px_rgba(var(--primary-rgb),0.5)] transition-all duration-500"
                style={{ width: `${memPct}%` }}
              />
            </div>
          </div>

          <div className="flex justify-between items-center text-[10px] pt-1">
            <span className="text-on-surface-variant/70">CPU TEMP:</span>
            <span className="text-white font-bold">{parseFloat(cpuTemp).toFixed(1)}°C</span>
          </div>

          <div className="flex justify-between items-center text-[10px]">
            <span className="text-on-surface-variant/70">POWER LINE:</span>
            <span className={`font-bold ${isCharging ? 'text-green-400' : 'text-primary-fixed-dim'}`}>
              {isCharging ? 'AC CONNECTED' : 'BATTERY DISCHARGE'}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
