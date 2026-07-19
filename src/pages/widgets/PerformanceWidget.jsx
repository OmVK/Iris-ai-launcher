import RemoveButton from './RemoveButton'

export default function PerformanceWidget({ batteryLevel, isCharging, osVersion, usedMem, totalMem, cpuTemp, isDiagnosticRunning, onCpuClick, onRemove }) {
  return (
    <section
      style={{ order: 0 }}
      onClick={onCpuClick}
      className="col-span-2 md:col-span-5 glass-surface rounded-lg p-4 relative overflow-hidden group cursor-pointer hover:border-primary-fixed-dim/40 active:scale-[0.99] transition-all"
    >
      <RemoveButton onClick={onRemove} />
      <div className="scan-line opacity-20" />
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="font-label-caps text-label-caps text-primary tracking-widest uppercase">
            {isDiagnosticRunning ? "STABILIZING SECTORS..." : "Kernel Performance Metrics"}
          </h2>
          <p className="text-mono-data font-mono-data text-on-surface-variant text-[9px] uppercase mt-0.5">
            {isDiagnosticRunning ? "SWEEPING CPU CORES // DUMPING CACHE" : "TH_CORE_V1.4 // CLICK TO SWEEP CORES"}
          </p>
        </div>
        <span className={`material-symbols-outlined text-primary text-sm pr-6 ${isDiagnosticRunning ? 'animate-spin' : 'animate-pulse'}`}>
          {isDiagnosticRunning ? 'settings_backup_restore' : 'memory'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex flex-col items-center justify-center p-2">
          <div className="relative w-28 h-28 flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle cx="56" cy="56" r="48" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
              <circle
                cx="56" cy="56" r="48" fill="none"
                stroke={isCharging ? '#22c55e' : (batteryLevel < 20 ? '#ffb4ab' : '#00f2ff')}
                strokeWidth="6"
                strokeDasharray={2 * Math.PI * 48}
                strokeDashoffset={2 * Math.PI * 48 * (1 - batteryLevel / 100)}
                className="transition-all duration-1000 drop-shadow-[0_0_6px_rgba(0,242,255,0.6)]"
              />
            </svg>
            <div className="flex flex-col items-center">
              <span className={`text-2xl font-bold font-mono-data ${isCharging ? 'text-green-400' : (batteryLevel < 20 ? 'text-error' : 'text-primary-container')}`}>{batteryLevel}%</span>
              <span className="text-[8px] tracking-wider text-on-surface-variant/70 font-label-caps">
                {isCharging ? 'CHARGING' : 'BATTERY'}
              </span>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 font-mono-data text-mono-data space-y-1.5 bg-black/35 p-3 rounded border border-white/5 leading-relaxed">
          <div className="flex justify-between text-[10px]">
            <span className="text-on-surface-variant">OS_VERSION:</span>
            <span className="text-primary-container font-bold">{osVersion}</span>
          </div>
          <div className="h-10 glass-surface rounded-xl flex items-center px-3 gap-3 overflow-hidden relative border border-white/5 bg-black/50 my-1">
            <div className="flex flex-col shrink-0">
              <span className="font-label-caps text-[8px] text-primary-fixed-dim leading-none">SYS_MEM</span>
              <span className="font-mono-data text-[9px] text-on-surface-variant mt-0.5">{usedMem}GB / {totalMem}GB</span>
            </div>
            <div className="flex-1 h-[2px] bg-outline-variant/30 rounded-full relative overflow-hidden">
              <div className="absolute left-0 top-0 h-full bg-primary-fixed-dim shadow-[0_0_6px_rgba(var(--primary-rgb),0.5)]" style={{ width: `${Math.min(100, Math.max(0, (parseFloat(usedMem) / (parseFloat(totalMem) || 1)) * 100))}%` }} />
            </div>
            <div className="flex flex-col shrink-0 items-end">
              <span className="font-label-caps text-[8px] text-primary-fixed-dim leading-none">CPU_TEMP</span>
              <span className="font-mono-data text-[9px] text-on-surface-variant mt-0.5">{parseFloat(cpuTemp).toFixed(1)}°C</span>
            </div>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-on-surface-variant">POWER_SOURCE:</span>
            <span className="text-primary-container font-bold">{isCharging ? "AC LINE" : "BATTERY"}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-on-surface-variant">HARDWARE_SYNC:</span>
            <span className="text-primary-container font-bold">{isDiagnosticRunning ? "REFRESHING..." : "NOMINAL"}</span>
          </div>
          <div className="w-full bg-white/5 h-1 mt-4 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 shadow-[0_0_8px_#00f2ff] ${isCharging ? 'bg-green-400' : (batteryLevel < 20 ? 'bg-error' : 'bg-primary-container')}`}
              style={{ width: `${batteryLevel}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
