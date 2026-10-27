import React, { useState, useCallback } from 'react'
import { toggleFlashlight, optimizeMemory, setAudioVolume } from './LauncherPlugin'
import HapticFeedback from '../utils/HapticFeedback'

function formatMemory(val) {
  if (!val) return '0G'
  const num = Number(val)
  if (isNaN(num) || num === 0) return `${val}G`
  if (num > 1073741824) {
    return `${(num / 1073741824).toFixed(1)}G`
  }
  if (num > 1048576) {
    return `${(num / 1048576).toFixed(0)}M`
  }
  return `${num}G`
}

export default function CondensedTelemetry({
  weather,
  weatherIcon,
  weatherTemp,
  battery,
  isLowBattery,
  isCharging,
  networkType,
  sysStats,
  totalUnread
}) {
  const [torchActive, setTorchActive] = useState(false)
  const [purging, setPurging] = useState(false)
  const [purged, setPurged] = useState(false)
  const [isMuted, setIsMuted] = useState(false)

  const handleToggleTorch = useCallback(async (e) => {
    e.stopPropagation()
    HapticFeedback.light()
    try {
      const res = await toggleFlashlight()
      if (res && typeof res.status === 'boolean') {
        setTorchActive(res.status)
      } else {
        setTorchActive(prev => !prev)
      }
    } catch {
      setTorchActive(prev => !prev)
    }
  }, [])

  const handleOptimizeRam = useCallback(async (e) => {
    e.stopPropagation()
    if (purging) return
    HapticFeedback.light()
    setPurging(true)
    try {
      await optimizeMemory()
    } finally {
      setTimeout(() => {
        setPurging(false)
        setPurged(true)
        HapticFeedback.light()
        setTimeout(() => setPurged(false), 2500)
      }, 500)
    }
  }, [purging])

  const handleToggleAudio = useCallback(async (e) => {
    e.stopPropagation()
    HapticFeedback.light()
    const nextMuted = !isMuted
    setIsMuted(nextMuted)
    try {
      await setAudioVolume(nextMuted ? 'mute' : 'unmute')
    } catch {}
  }, [isMuted])

  return (
    <div className="flex-1 flex flex-col justify-between h-full select-none">
      <div className="flex-1 grid grid-cols-3 gap-2">
        <div className="glass-surface border border-white/5 rounded-lg p-2 flex flex-col justify-center items-center">
          <span className="material-symbols-outlined text-on-surface-variant/70 mb-1" style={{ fontSize: 16 }}>{weatherIcon}</span>
          <span className="font-mono-data text-[10px] text-primary-fixed-dim/90 font-bold">{weatherTemp}</span>
          <span className="font-label-caps text-[7px] tracking-wider text-on-surface-variant/50 mt-0.5">{weather ? weather.condition.replace(/_/g, ' ') : 'UNKNOWN'}</span>
        </div>

        <div className="glass-surface border border-white/5 rounded-lg p-2 flex flex-col justify-center items-center">
          <span className={`material-symbols-outlined ${isLowBattery ? 'text-error animate-pulse' : isCharging ? 'text-green-400' : 'text-on-surface-variant/70'} mb-1`} style={{ fontSize: 16 }}>
            {battery.charging ? 'battery_charging_full' : 'battery_full'}
          </span>
          <span className={`font-mono-data text-[10px] font-bold ${isLowBattery ? 'text-error' : isCharging ? 'text-green-400' : 'text-primary-fixed-dim/90'}`}>{battery.level}%</span>
          <span className={`font-label-caps text-[7px] tracking-wider mt-0.5 ${isLowBattery ? 'text-error' : isCharging ? 'text-green-400' : 'text-on-surface-variant/50'}`}>
            {battery.charging ? 'AC POWER' : isLowBattery ? 'CRITICAL' : 'BATTERY'}
          </span>
        </div>

        <div className="glass-surface border border-white/5 rounded-lg p-2 flex flex-col justify-center items-center">
          <span className="material-symbols-outlined text-on-surface-variant/70 mb-1" style={{ fontSize: 16 }}>
            {networkType === 'OFFLINE' ? 'wifi_off' : 'wifi'}
          </span>
          <span className="font-mono-data text-[10px] text-primary-fixed-dim/90 font-bold">{networkType}</span>
          <span className="font-label-caps text-[7px] tracking-wider text-on-surface-variant/50 mt-0.5">NETWORK</span>
        </div>
      </div>

      {/* Quick HUD Utility Actions */}
      <div className="grid grid-cols-3 gap-2 my-1.5 shrink-0">
        <button
          type="button"
          onClick={handleToggleTorch}
          className={`py-1 px-1.5 rounded-lg flex items-center justify-center gap-1 border transition-all text-left ${
            torchActive
              ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
              : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-[13px]">{torchActive ? 'flashlight_on' : 'flashlight_off'}</span>
          <span className="font-mono-data text-[8px] font-bold tracking-wider">{torchActive ? 'TORCH ON' : 'TORCH'}</span>
        </button>

        <button
          type="button"
          onClick={handleOptimizeRam}
          disabled={purging}
          className={`py-1 px-1.5 rounded-lg flex items-center justify-center gap-1 border transition-all ${
            purged
              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
              : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
          }`}
        >
          <span className={`material-symbols-outlined text-[13px] ${purging ? 'animate-spin' : ''}`}>
            {purging ? 'sync' : purged ? 'check_circle' : 'memory'}
          </span>
          <span className="font-mono-data text-[8px] font-bold tracking-wider">
            {purging ? 'CLEANING' : purged ? 'OPTIMIZED' : 'PURGE RAM'}
          </span>
        </button>

        <button
          type="button"
          onClick={handleToggleAudio}
          className={`py-1 px-1.5 rounded-lg flex items-center justify-center gap-1 border transition-all ${
            isMuted
              ? 'bg-red-500/20 border-red-400 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
              : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-[13px]">{isMuted ? 'volume_off' : 'volume_up'}</span>
          <span className="font-mono-data text-[8px] font-bold tracking-wider">{isMuted ? 'MUTED' : 'MUTE'}</span>
        </button>
      </div>

      <div className="pt-1.5 border-t border-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="font-label-caps text-[7px] text-on-surface-variant/50 leading-none mb-0.5">SYS_MEM</span>
            <span className="font-mono-data text-[9px] text-primary-fixed-dim/80">{formatMemory(sysStats.memUsed)} / {formatMemory(sysStats.memTotal)}</span>
          </div>
          <div className="flex flex-col">
            <span className="font-label-caps text-[7px] text-on-surface-variant/50 leading-none mb-0.5">CPU_TEMP</span>
            <span className="font-mono-data text-[9px] text-primary-fixed-dim/80">{sysStats.cpuTemp ? parseFloat(sysStats.cpuTemp).toFixed(1) : '--'}°C</span>
          </div>
        </div>
        {totalUnread > 0 && (
          <div className="flex flex-col items-end">
            <span className="font-label-caps text-[7px] text-error leading-none mb-0.5 animate-pulse">ALERTS</span>
            <span className="font-mono-data text-[9px] text-error font-bold">{totalUnread} PENDING</span>
          </div>
        )}
      </div>
    </div>
  )
}
