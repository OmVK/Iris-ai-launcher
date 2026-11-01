import React, { memo } from 'react'

const CustomWidget = memo(function CustomWidget({ widget }) {
  return (
    <section className="iris-card border border-white/10 rounded-2xl p-4 relative flex flex-col justify-between w-full h-full min-h-[170px] overflow-hidden hover:border-primary-fixed-dim/40 transition-colors shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
      <div className="flex flex-col gap-2 flex-1 justify-between">
        <div className="flex justify-between items-center pb-2 border-b border-white/10">
          <span className="font-label-caps text-[10px] text-primary-fixed-dim tracking-widest uppercase flex items-center gap-1.5 font-bold">
            <span className="material-symbols-outlined text-sm">{widget.icon || 'widgets'}</span>
            {widget.label}
          </span>
          <span className="flex h-2 w-2 rounded-full bg-primary-fixed-dim" />
        </div>

        <div className="bg-black/45 rounded-xl border border-white/5 p-3 flex-1 flex flex-col justify-center my-2 max-h-24 overflow-y-auto scroll-container font-mono-data text-[9.5px] leading-relaxed text-white/90">
          <p className="text-on-surface-variant/70">&gt; NODE OPERATIONAL</p>
          <p className="mt-1 font-bold text-primary-fixed-dim">&gt; {widget.content}</p>
        </div>

        <span className="text-[7px] text-on-surface-variant/40 uppercase text-center mt-auto font-mono-data">
          CUSTOM PROTOCOL SYNAPSE
        </span>
      </div>
    </section>
  )
})

export default CustomWidget
