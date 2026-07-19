import React, { useState, useEffect } from 'react'
import PowerSaveManager from '../utils/PowerSaveManager'

export default function TopAppBar({ title = "IRIS-SYSTEM-OS", use24HourClock = true, isAppActive = true, powerSaveMode }) {
  const [time, setTime] = useState("")
  const [battery, setBattery] = useState({ level: 100, charging: false })
  const [networkType, setNetworkType] = useState('ONLINE')

  useEffect(() => {
    // Battery setup runs once
    let batteryRef = null
    const batListeners = []
    if (navigator.getBattery) {
      navigator.getBattery().then(bat => {
        batteryRef = bat
        const updateBat = () => {
          setBattery({
            level: Math.round(bat.level * 100),
            charging: bat.charging
          })
        }
        updateBat()
        bat.addEventListener('levelchange', updateBat)
        bat.addEventListener('chargingchange', updateBat)
        batListeners.push({ target: bat, type: 'levelchange', fn: updateBat })
        batListeners.push({ target: bat, type: 'chargingchange', fn: updateBat })
      })
    }

    // Network setup runs once
    const updateNetwork = () => {
      if (navigator.connection && navigator.connection.effectiveType) {
        setNetworkType(navigator.connection.effectiveType.toUpperCase())
      } else {
        setNetworkType(navigator.onLine ? 'ONLINE' : 'OFFLINE')
      }
    }
    updateNetwork()
    window.addEventListener('online', updateNetwork)
    window.addEventListener('offline', updateNetwork)
    if (navigator.connection) {
      navigator.connection.addEventListener('change', updateNetwork)
    }

    return () => {
      // Clean up battery listeners
      batListeners.forEach(({ target, type, fn }) => {
        target.removeEventListener(type, fn)
      })
      // Clean up network listeners
      window.removeEventListener('online', updateNetwork)
      window.removeEventListener('offline', updateNetwork)
      if (navigator.connection) {
        navigator.connection.removeEventListener('change', updateNetwork)
      }
    }
  }, [])

  useEffect(() => {
    // Clock setup
    const updateTime = () => {
      const now = new Date()
      const formatted = now.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: !use24HourClock
      }).toUpperCase()
      setTime(formatted)
    }
    updateTime()
    let clockInterval
    
    if (isAppActive) {
      clockInterval = setInterval(updateTime, PowerSaveManager.getPollingInterval('clockPollMs'))
    }

    return () => {
      if (clockInterval) clearInterval(clockInterval)
    }
  }, [use24HourClock, isAppActive, powerSaveMode])

  return (
    <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-margin h-12 bg-surface-container/30 backdrop-blur-3xl border-b border-outline-variant/30 shadow-[0_1px_15px_-3px_rgba(var(--primary-rgb),0.2)]">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary-fixed-dim" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>fingerprint</span>
        <span className="font-label-caps text-label-caps tracking-[0.2em] text-primary-fixed-dim drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]">
          {title}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Network Tag */}
        <div className="flex items-center gap-1 font-mono-data text-mono-data text-on-surface-variant/70">
          <span className="material-symbols-outlined text-[14px]">{networkType === 'OFFLINE' ? 'wifi_off' : 'wifi'}</span>
          <span>{networkType}</span>
        </div>

        {/* Battery Info */}
        <div className="flex items-center gap-1 font-mono-data text-mono-data text-on-surface-variant/70">
          <span className="material-symbols-outlined text-[14px]">
            {battery.charging ? 'battery_charging_full' : 'battery_full'}
          </span>
          <span>{battery.level}%</span>
        </div>

        {/* Clock */}
        <div className="font-mono-data text-mono-data text-primary-fixed-dim font-bold tracking-wider">
          {time}
        </div>
      </div>
    </header>
  )
}
