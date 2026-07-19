import StockChart from '../../components/StockChart'
import RemoveButton from './RemoveButton'

export default function StockWidget({ onRemove }) {
  return (
    <section style={{ order: 2 }} className="col-span-2 glass-surface rounded-lg p-4 relative flex flex-col justify-between">
      <RemoveButton onClick={onRemove} />
      <StockChart />
    </section>
  )
}
