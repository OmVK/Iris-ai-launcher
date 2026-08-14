import React, { useState, useEffect } from 'react'
import { getDeviceSecurityPosture } from '../LauncherPlugin'

export default function DeviceSecurityScanner({ glassBg }) {
  const [data, setData] = useState(null)
  const [scanning, setScanning] = useState(true)

  const runScan = async () => {
    setScanning(true)
    try {
      const posture = await getDeviceSecurityPosture()
      setData(posture)
    } catch (e) {
      console.warn('Security scan error:', e)
    } finally {
      setTimeout(() => setScanning(false), 600)
    }
  }

  useEffect(() => {
    runScan()
  }, [])

  // Calculate score based on posture
  let score = 100
  if (data) {
    if (!data.isScreenLockSecure) score -= 30
    if (!data.isStorageEncrypted) score -= 25
    if (data.isRootDetected) score -= 35
    if (data.isAdbEnabled) score -= 10
    if (data.isDevOptionsEnabled) score -= 5
  }
  score = Math.max(10, Math.min(100, score))

  const scoreColor = score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div className="space-y-4 font-mono-data text-xs">
      {/* Header & Overall Score */}
      <div className="p-4 rounded-xl border border-cyan-500/20 flex items-center justify-between" style={{ backgroundColor: glassBg }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-cyan-400/40 bg-cyan-500/10">
            <span className="material-symbols-outlined text-cyan-400 text-2xl animate-pulse">security</span>
          </div>
          <div>
            <h3 className="font-bold text-sm text-white tracking-widest uppercase">DEVICE INTEGRITY SCAN</h3>
            <p className="text-[10px] text-white/40">{data?.deviceModel || 'System Hardware'} • Android {data?.androidVersion || '14'}</p>
          </div>
        </div>

        <div className="text-right flex flex-col items-end">
          <div className="text-2xl font-bold font-mono tracking-tighter" style={{ color: scoreColor }}>
            {scanning ? '--' : `${score}%`}
          </div>
          <span className="text-[9px] tracking-widest uppercase font-bold" style={{ color: scoreColor }}>
            {scanning ? 'SCANNING...' : score >= 80 ? 'SECURE' : score >= 50 ? 'WARNING' : 'CRITICAL'}
          </span>
        </div>
      </div>

      {/* Security Parameter Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Screen Lock */}
        <div className="p-3 rounded-lg border border-white/5 bg-black/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-white/50">fingerprint</span>
            <span className="text-[10px] text-white/80">Screen Lock Security</span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
            data?.isScreenLockSecure ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'
          }`}>
            {data?.isScreenLockSecure ? 'ENFORCED' : 'NO LOCK'}
          </span>
        </div>

        {/* Hardware Encryption */}
        <div className="p-3 rounded-lg border border-white/5 bg-black/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-white/50">lock</span>
            <span className="text-[10px] text-white/80">Storage Encryption</span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
            data?.isStorageEncrypted ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          }`}>
            {data?.isStorageEncrypted ? 'AES-256 ACTIVE' : 'UNENCRYPTED'}
          </span>
        </div>

        {/* Root / SU Binary */}
        <div className="p-3 rounded-lg border border-white/5 bg-black/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-white/50">admin_panel_settings</span>
            <span className="text-[10px] text-white/80">Root & SU Binary</span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
            !data?.isRootDetected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'
          }`}>
            {data?.isRootDetected ? 'ROOT DETECTED' : 'CLEAN / LOCKED'}
          </span>
        </div>

        {/* USB Debugging (ADB) */}
        <div className="p-3 rounded-lg border border-white/5 bg-black/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-white/50">usb</span>
            <span className="text-[10px] text-white/80">USB Debugging (ADB)</span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
            !data?.isAdbEnabled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          }`}>
            {data?.isAdbEnabled ? 'PORT OPEN' : 'DISABLED'}
          </span>
        </div>

        {/* Developer Options */}
        <div className="p-3 rounded-lg border border-white/5 bg-black/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-white/50">code</span>
            <span className="text-[10px] text-white/80">Developer Mode</span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
            !data?.isDevOptionsEnabled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
          }`}>
            {data?.isDevOptionsEnabled ? 'ACTIVE' : 'OFF'}
          </span>
        </div>

        {/* Security Patch Level */}
        <div className="p-3 rounded-lg border border-white/5 bg-black/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-white/50">verified_user</span>
            <span className="text-[10px] text-white/80">Security Patch</span>
          </div>
          <span className="text-[10px] font-mono text-cyan-300 font-bold">
            {data?.securityPatch || 'Latest'}
          </span>
        </div>
      </div>

      {/* Scan Button */}
      <button
        onClick={runScan}
        disabled={scanning}
        className="w-full py-2.5 rounded-lg border border-cyan-400/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
      >
        <span className={`material-symbols-outlined text-sm ${scanning ? 'animate-spin' : ''}`}>sync</span>
        {scanning ? 'RUNNING INTEGRITY SCAN...' : 'RE-SCAN DEVICE SECURITY'}
      </button>
    </div>
  )
}
