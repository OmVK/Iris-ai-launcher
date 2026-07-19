import RemoveButton from './RemoveButton'

export default function CustomWidget({ widget, onRemove }) {
  return (
    <section
      style={{ order: 99 }}
      className="col-span-2 md:col-span-2 glass-surface rounded-lg p-4 relative flex flex-col justify-between group"
    >
      <RemoveButton onClick={onRemove} />
      <div className="flex flex-col gap-2 flex-1 justify-between min-h-[170px]">
        <div className="flex justify-between items-center pb-1.5 border-b border-white/5 pr-6">
          <span className="font-label-caps text-label-caps text-[#00f2ff] tracking-widest uppercase flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">{widget.icon}</span>
            {widget.label}
          </span>
          <span className="flex h-1.5 w-1.5 rounded-full bg-[#00f2ff] animate-pulse" />
        </div>
        <div className="bg-black/35 rounded border border-white/5 p-3 flex-1 flex flex-col justify-center my-2 h-20 overflow-y-auto scroll-container font-mono-data text-[9.5px] leading-relaxed text-[#dfe2ef]/90">
          <p>&gt; ESTABLISHING LINK...</p>
          <p className="mt-1 font-bold text-primary-container">&gt; {widget.content}</p>
        </div>
        <span className="text-[6.5px] text-on-surface-variant/30 uppercase text-center mt-auto font-mono-data leading-none">
          USER PROTOCOL INDEPENDENT SYNAPSE
        </span>
      </div>
    </section>
  )
}
