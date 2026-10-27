import React, { useState, useEffect } from 'react'
import { Device } from '@capacitor/device'
import { getSystemStats } from '../../components/LauncherPlugin'
import PowerSaveManager from '../../utils/PowerSaveManager'
import { usePowerStore } from '../../stores/powerStore'

export default function SignalWidget() {
  const powerSaveMode = usePowerStore((s) => s.powerSaveMode)
  const [battery, setBattery] = useState(100)
  const [isCharging, setIsCharging] = useState(false)
  const [netType, setNetType] = useState('LTE')
  const [activeSignalBars, setActiveSignalBars] = useState(4)
  const [ram, setRam] = useState({ used: 0, total: 0 })

  useEffect(() => {
    let cancelled = false

    const fetchBattery = async () => {
      try {
        const info = await Device.getBatteryInfo()
        if (!cancelled && info.batteryLevel !== undefined) {
          setBattery(Math.round(info.batteryLevel * 100))
          if (info.isCharging !== undefined) setIsCharging(info.isCharging)
          return
        }
      } catch {}

      try {
        if (navigator.getBattery) {
          const bat = await navigator.getBattery()
          if (!cancelled) {
            setBattery(Math.round(bat.level * 100))
            setIsCharging(bat.charging || false)
          }
        }
      } catch {}
    }

    const updateNetwork = () => {
      const conn = navigator.connection || {}
      const isOnline = navigator.onLine
      const downlink = typeof conn.downlink === 'number' ? conn.downlink : 10
      const rtt = typeof conn.rtt === 'number' ? conn.rtt : 25
      const type = conn.effectiveType?.toUpperCase() || (isOnline ? 'LTE' : 'OFFLINE')

      if (!cancelled) {
        setNetType(type)
        if (!isOnline) {
          setActiveSignalBars(0)
        } else if (rtt > 250 || downlink < 1) {
          setActiveSignalBars(1)
        } else if (rtt > 120 || downlink < 3) {
          setActiveSignalBars(2)
        } else if (rtt > 60 || downlink < 7) {
          setActiveSignalBars(3)
        } else {
          setActiveSignalBars(4)
        }
      }
    }

    updateNetwork()
    fetchBattery()

    window.addEventListener('online', updateNetwork)
    window.addEventListener('offline', updateNetwork)
    if (navigator.connection) {
      navigator.connection.addEventListener('change', updateNetwork)
    }

    const pollMs = PowerSaveManager.getPollingInterval('batteryPollMs') || 10000
    const timer = setInterval(fetchBattery, pollMs)

    return () => {
      cancelled = true
      clearInterval(timer)
      window.removeEventListener('online', updateNetwork)
      window.removeEventListener('offline', updateNetwork)
      if (navigator.connection) {
        navigator.connection.removeEventListener('change', updateNetwork)
      }
    }
  }, [powerSaveMode])

  useEffect(() => {
    let cancelled = false
    const fetchRam = async () => {
      try {
        const stats = await getSystemStats()
        if (!cancelled && stats?.memTotal) setRam({ used: stats.memUsed, total: stats.memTotal })
      } catch {}
    }
    fetchRam()
    return () => {
      cancelled = true
    }
  }, [])

  const batteryColor = isCharging ? '#22c55e' : battery > 50 ? '#00dbe7' : battery > 20 ? '#facc15' : '#f43f5e'
  const ramPercent = ram.total > 0 ? Math.round((ram.used / ram.total) * 100) : 0

  return (
    <section className="glass-surface border border-white/10 rounded-2xl p-3.5 flex justify-between items-center group relative w-full h-full hover:border-primary-fixed-dim/40 transition-all bg-[#080d16]/85 backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1">
            <span className="text-[8px] font-label-caps text-primary-fixed-dim tracking-wider uppercase font-bold">
              Battery Line
            </span>
            {isCharging && (
              <span className="material-symbols-outlined text-green-400 text-[10px] leading-none animate-pulse">
                bolt
              </span>
            )}
          </div>
          <div className="w-24 bg-white/10 h-1.5 rounded-full overflow-hidden mt-0.5 border border-white/5">
            <div
              className="h-full rounded-full transition-all duration-500 shadow-[0_0_6px_rgba(0,219,231,0.4)]"
              style={{ width: `${battery}%`, backgroundColor: batteryColor }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-[8px] font-label-caps text-primary-fixed-dim tracking-wider uppercase font-bold">
            Signal Grid
          </span>
          <div className="flex gap-1 mt-0.5 h-3.5 items-end">
            {[1, 2, 3, 4].map((barNum) => {
              const isActive = barNum <= activeSignalBars
              const barHeight = 3.5 + barNum * 2.5
              return (
                <div
                  key={barNum}
                  className={`w-1.5 rounded-t transition-all duration-300 ${
                    isActive
                      ? 'bg-primary-fixed-dim shadow-[0_0_6px_rgba(var(--primary-rgb),0.5)]'
                      : 'bg-white/15'
                  }`}
                  style={{ height: `${barHeight}px` }}
                />
              )
            })}
          </div>
        </div>
      </div>

      <div className="text-right">
        <p className="font-mono-data text-[10px] text-primary-fixed-dim font-bold leading-none">
          {battery}% // {netType}
        </p>
        <p className="font-mono-data text-[8px] text-on-surface-variant/70 mt-1 uppercase">
          {ramPercent > 0 ? `SYS RAM ${ramPercent}%` : 'SYS RAM OPTIMAL'}
        </p>
      </div>
    </section>
  )
}
