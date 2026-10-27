import React from 'react'

export default function CustomWidget({ widget }) {
  return (
    <section className="glass-surface border border-white/10 rounded-2xl p-4 relative flex flex-col justify-between w-full h-full min-h-[170px] overflow-hidden hover:border-primary-fixed-dim/40 transition-all">
      <div className="flex flex-col gap-2 flex-1 justify-between">
        <div className="flex justify-between items-center pb-2 border-b border-white/10">
          <span className="font-label-caps text-[10px] text-primary-fixed-dim tracking-widest uppercase flex items-center gap-1.5 font-bold">
            <span className="material-symbols-outlined text-sm">{widget.icon || 'widgets'}</span>
            {widget.label}
          </span>
          <span className="flex h-2 w-2 rounded-full bg-primary-fixed-dim animate-pulse shadow-[0_0_8px_rgba(var(--primary-rgb),0.6)]" />
        </div>

        <div className="bg-black/40 rounded-xl border border-white/5 p-3 flex-1 flex flex-col justify-center my-2 max-h-24 overflow-y-auto scroll-container font-mono-data text-[9.5px] leading-relaxed text-white/90">
          <p className="text-on-surface-variant/70">&gt; NODE OPERATIONAL</p>
          <p className="mt-1 font-bold text-primary-fixed-dim">&gt; {widget.content}</p>
        </div>

        <span className="text-[7px] text-on-surface-variant/40 uppercase text-center mt-auto font-mono-data">
          CUSTOM PROTOCOL SYNAPSE
        </span>
      </div>
    </section>
  )
}
