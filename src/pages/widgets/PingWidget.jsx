import RemoveButton from './RemoveButton'

export default function PingWidget({ pingResult, pingHistory, pingFailed = [], onTriggerPingTest, onRemove }) {
  return (
    <section style={{ order: 6 }} onClick={onTriggerPingTest} className="col-span-1 md:col-span-2 glass-surface rounded-lg p-4 relative flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary-fixed-dim/40 transition-all active:scale-95">
      <RemoveButton onClick={onRemove} />
      <div className="text-on-surface-variant/50 text-[9px] font-mono-data mb-2">NETWORK LATENCY</div>
      <div className="flex items-center justify-between font-mono-data w-full">
        <span className="text-on-surface-variant text-[9px]">TOKYO GATEWAY</span>
        <span className="text-primary-container text-lg font-bold drop-shadow-[0_0_8px_#00f2ff]">{pingResult} ms</span>
      </div>
      <div className="h-10 bg-black/20 border border-white/5 rounded flex items-end gap-1 p-1 justify-center relative overflow-hidden w-full">
        {pingHistory.map((val, i) => {
          const height = Math.min(100, (val / 30) * 100)
          return <div key={i} style={{ height: `${height}%` }} className="flex-1 bg-[#00f2ff] opacity-80 rounded-t transition-all duration-300" />
        })}
      </div>
      <span className="text-[7px] text-on-surface-variant/30 uppercase mt-2 block text-center font-mono-data leading-none">
        LOSS RATE: {pingHistory.length > 0 ? ((pingFailed.filter(Boolean).length / pingHistory.length) * 100).toFixed(1) : '0.0'}% // LINK NOMINAL
      </span>
    </section>
  )
}
