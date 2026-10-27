import React from 'react'
import StockChart from '../../components/StockChart'

export default function StockWidget() {
  return (
    <section className="glass-surface border border-white/10 rounded-2xl p-4 relative flex flex-col justify-between w-full h-full overflow-hidden hover:border-primary-fixed-dim/40 transition-all">
      <StockChart />
    </section>
  )
}
