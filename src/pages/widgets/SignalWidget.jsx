import { useState, useEffect } from 'react'
import RemoveButton from './RemoveButton'
import { getSystemStats } from '../../components/LauncherPlugin'
import PowerSaveManager from '../../utils/PowerSaveManager'
import { usePowerStore } from '../../stores/powerStore'

export default function SignalWidget({ onRemove }) {
  const powerSaveMode = usePowerStore(s => s.powerSaveMode)
  const [battery, setBattery] = useState(0)
  const [netType, setNetType] = useState('—')
  const [ram, setRam] = useState({ used: 0, total: 0 })

  useEffect(() => {
    let cancelled = false
    const fetchBattery = async () => {
      try {
        if (navigator.getBattery) {
          const bat = await navigator.getBattery()
          if (!cancelled) setBattery(Math.round(bat.level * 100))
        }
      } catch (e) {}
    }
    const conn = navigator.connection
    const updateNet = conn ? () => setNetType(conn.effectiveType?.toUpperCase() || '—') : null
    if (conn) {
      setNetType(conn.effectiveType?.toUpperCase() || '—')
      conn.addEventListener('change', updateNet)
    }
    fetchBattery()
    const timer = setInterval(fetchBattery, PowerSaveManager.getPollingInterval('batteryPollMs'))
    return () => {
      cancelled = true
      clearInterval(timer)
      if (conn && updateNet) conn.removeEventListener('change', updateNet)
    }
  }, [powerSaveMode])

  useEffect(() => {
    let cancelled = false
    const fetchRam = async () => {
      try {
        const stats = await getSystemStats()
        if (!cancelled && stats?.memTotal) setRam({ used: stats.memUsed, total: stats.memTotal })
      } catch (e) {}
    }
    fetchRam()
    return () => { cancelled = true }
  }, [])

  const batteryColor = battery > 50 ? '#22c55e' : battery > 20 ? '#facc15' : '#f43f5e'
  const ramPercent = ram.total > 0 ? Math.round((ram.used / ram.total) * 100) : 0
  const ramColor = ramPercent > 80 ? '#f43f5e' : ramPercent > 60 ? '#facc15' : '#00f2ff'

  const signalBars = [
    Math.min(100, battery + 20),
    Math.min(100, battery + 10),
    Math.min(100, battery),
    Math.min(100, battery - 10),
  ]

  return (
    <section style={{ order: 7 }} className="col-span-2 md:col-span-5 glass-surface rounded-lg p-3 flex justify-between items-center group relative">
      <RemoveButton onClick={onRemove} />
      <div className="flex items-center gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-[8px] font-label-caps text-primary-container tracking-wider uppercase">Battery</span>
          <div className="w-24 bg-white/5 h-1 rounded-full overflow-hidden mt-0.5 border border-white/5">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${battery}%`, backgroundColor: batteryColor }} />
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[8px] font-label-caps text-primary-container tracking-wider uppercase">Signal</span>
          <div className="flex gap-0.5 mt-0.5 h-2 items-end">
            {signalBars.map((h, i) => (
              <div key={i} className="w-1 rounded-t transition-all duration-500" style={{ height: `${Math.max(4, h * 0.1)}px`, backgroundColor: batteryColor, opacity: 0.5 + (i * 0.2) }} />
            ))}
          </div>
        </div>
      </div>
      <div className="text-right pr-5">
        <p className="font-mono-data text-[9px] text-primary-container font-bold leading-none">{battery}% // {netType}</p>
        <p className="font-mono-data text-[8px] text-on-surface-variant/40 mt-1 uppercase">
          {ramPercent > 0 ? `RAM ${ramPercent}%` : 'RAM —'}
        </p>
      </div>
    </section>
  )
}
