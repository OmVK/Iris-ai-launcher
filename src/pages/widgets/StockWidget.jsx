import React, { memo } from 'react'
import StockChart from '../../components/StockChart'

const StockWidget = memo(function StockWidget() {
  return (
    <section className="iris-card border border-white/10 rounded-2xl p-4 relative flex flex-col justify-between w-full h-full overflow-hidden hover:border-primary-fixed-dim/40 transition-colors shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
      <StockChart />
    </section>
  )
})

export default StockWidget
