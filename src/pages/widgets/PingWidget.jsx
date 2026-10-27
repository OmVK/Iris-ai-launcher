import React from 'react'
import HapticFeedback from '../../utils/HapticFeedback'

export default function PingWidget({ pingResult, pingHistory = [], pingFailed = [], isPingTesting, onTriggerPingTest }) {
  const maxLat = Math.max(50, ...pingHistory)
  const failedCount = pingFailed.filter(Boolean).length
  const lossRate = pingHistory.length > 0 ? ((failedCount / pingHistory.length) * 100).toFixed(1) : '0.0'

  const getLatencyColor = (val, failed) => {
    if (failed) return '#f43f5e'
    if (val < 35) return '#00dbe7'
    if (val < 75) return '#22c55e'
    if (val < 150) return '#facc15'
    return '#f43f5e'
  }

  return (
    <section
      onClick={() => {
        HapticFeedback.light()
        onTriggerPingTest()
      }}
      className="glass-surface border border-white/10 rounded-2xl p-4 relative flex flex-col items-center justify-between text-center cursor-pointer hover:border-primary-fixed-dim/40 transition-all active:scale-[0.98] w-full h-full overflow-hidden bg-[#080d16]/85 backdrop-blur-xl group"
    >
      <div className="flex items-center justify-between w-full pb-1 border-b border-white/5">
        <span className="text-on-surface-variant/70 text-[8.5px] font-mono-data uppercase tracking-wider font-bold">
          NETWORK LATENCY PING
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isPingTesting ? 'bg-primary-fixed-dim animate-ping' : 'bg-green-400'
            }`}
          />
          <span className="text-[7.5px] font-mono text-white/50 uppercase">
            {isPingTesting ? 'PROBING...' : 'LIVE'}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between font-mono-data w-full my-2">
        <span className="text-on-surface-variant/80 text-[9px] uppercase tracking-wide">GATEWAY RELAY</span>
        <span className="text-primary-fixed-dim text-xl font-bold drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]">
          {pingResult} <span className="text-xs font-normal text-white/70">ms</span>
        </span>
      </div>

      <div className="h-10 bg-black/50 border border-white/5 rounded-lg flex items-end gap-1 p-1.5 justify-center relative overflow-hidden w-full">
        {pingHistory.map((val, i) => {
          const isFailed = pingFailed[i]
          const height = Math.min(100, Math.max(12, (val / maxLat) * 100))
          const barColor = getLatencyColor(val, isFailed)
          return (
            <div
              key={i}
              style={{ height: `${height}%`, backgroundColor: barColor }}
              className="flex-1 rounded-t transition-all duration-300 shadow-[0_0_6px_rgba(var(--primary-rgb),0.25)]"
              title={`${val} ms`}
            />
          )
        })}
      </div>

      <span className="text-[7.5px] text-on-surface-variant/50 uppercase mt-2 block text-center font-mono-data leading-none">
        LOSS: {lossRate}% // TAP TO RAPID PING
      </span>
    </section>
  )
}
