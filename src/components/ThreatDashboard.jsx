import { useState, useEffect, useCallback } from 'react'
import { launchApp } from './LauncherPlugin'
import { useAppStore } from '../stores/appStore'

const STORAGE_KEY = 'iris_security_log'

function getSecurityLog() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : { lastScan: null, threats: [], score: 100 }
  } catch {
    return { lastScan: null, threats: [], score: 100 }
  }
}

function saveSecurityLog(log) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(log))
}

function calculateScore(threats) {
  let score = 100
  for (const t of threats) {
    if (t.severity === 'critical') score -= 25
    else if (t.severity === 'high') score -= 15
    else if (t.severity === 'medium') score -= 8
    else if (t.severity === 'low') score -= 3
  }
  return Math.max(0, score)
}

export default function ThreatDashboard({ glassBg }) {
  const [scanning, setScanning] = useState(false)
  const [scanResults, setScanResults] = useState(null)
  const [securityLog, setSecurityLog] = useState(getSecurityLog)
  const { lockedApps } = useAppStore()

  const runSecurityScan = useCallback(async () => {
    setScanning(true)
    const threats = []
    const info = {}

    try {
      // Check vault lock status
      if (lockedApps.length === 0) {
        threats.push({ id: 'no_locks', title: 'No Apps Locked', desc: 'No apps are currently protected by the vault.', severity: 'medium', icon: 'lock_open' })
      }

      // Check API key exposure in localStorage
      const lsKeys = Object.keys(localStorage)
      const exposedKeys = lsKeys.filter(k => k.includes('key') && !k.startsWith('ks_') && !k.startsWith('iris_has_'))
      if (exposedKeys.length > 0) {
        threats.push({ id: 'exposed_keys', title: 'Plaintext API Keys', desc: `${exposedKeys.length} API key(s) stored in plaintext localStorage.`, severity: 'high', icon: 'key' })
      }

      // Check if backup is enabled
      const manifestBackup = document.querySelector('meta[name="allowBackup"]')
      if (manifestBackup?.content === 'true') {
        threats.push({ id: 'backup_enabled', title: 'Backup Enabled', desc: 'App data may be extractable via adb backup.', severity: 'medium', icon: 'backup' })
      }

      // Check device info
      info.device = `${navigator.userAgent.includes('Android') ? 'Android' : 'Web'} | ${navigator.platform}`
      info.secureContext = window.isSecureContext ? 'YES' : 'NO'
      info.cookiesEnabled = navigator.cookieEnabled ? 'YES' : 'NO'

      // Check for mixed content
      if (window.location.protocol === 'https:') {
        info.https = 'YES'
      } else {
        threats.push({ id: 'no_https', title: 'Not Over HTTPS', desc: 'Traffic is not encrypted.', severity: 'critical', icon: 'gpp_bad' })
      }

      // Check storage encryption
      const ksKeys = lsKeys.filter(k => k.startsWith('ks_'))
      info.encryptedKeys = ksKeys.length
      info.totalKeys = lsKeys.length

      // Check network connections
      info.connection = navigator.connection?.effectiveType || 'unknown'

      // Check Do Not Track
      info.doNotTrack = navigator.doNotTrack || 'unset'

      // Score calculation
      const score = calculateScore(threats)

      const results = { threats, info, score, timestamp: new Date().toISOString() }
      setScanResults(results)

      const log = getSecurityLog()
      log.lastScan = results.timestamp
      log.threats = threats
      log.score = score
      saveSecurityLog(log)
      setSecurityLog(log)
    } catch (e) {
      console.error('Security scan failed:', e)
    }
    setScanning(false)
  }, [lockedApps])

  const scoreColor = (scanResults?.score || securityLog.score) >= 80 ? '#39ff14'
    : (scanResults?.score || securityLog.score) >= 50 ? '#facc15'
    : '#ef4444'

  const severityColor = { critical: '#ef4444', high: '#f97316', medium: '#facc15', low: '#6b7280' }

  return (
    <div className="space-y-4">
      {/* Score Card */}
      <div className="flex items-center gap-4 p-4 rounded-xl border border-white/10" style={{ backgroundColor: glassBg }}>
        <div className="relative w-16 h-16">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2.5" />
            <circle cx="18" cy="18" r="16" fill="none" stroke={scoreColor} strokeWidth="2.5"
              strokeDasharray={`${(scanResults?.score || securityLog.score) * 1.005} 100`}
              strokeLinecap="round" className="transition-all duration-1000" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-mono-data text-sm font-bold" style={{ color: scoreColor }}>
            {scanResults?.score || securityLog.score}
          </span>
        </div>
        <div className="flex-1">
          <p className="font-mono-data text-[10px] text-white/60 uppercase tracking-widest">Security Score</p>
          <p className="font-mono-data text-xs text-white/90 mt-0.5">
            {scanResults ? `${scanResults.threats.length} issue(s) detected` : securityLog.lastScan ? `Last scan: ${new Date(securityLog.lastScan).toLocaleDateString()}` : 'No scans yet'}
          </p>
        </div>
        <button onClick={runSecurityScan} disabled={scanning}
          className="px-3 py-1.5 rounded-lg border border-[#00f2ff]/30 text-[#00f2ff] font-mono-data text-[9px] uppercase tracking-wider hover:bg-[#00f2ff]/10 active:scale-95 transition-all disabled:opacity-40">
          {scanning ? 'SCANNING...' : 'RUN SCAN'}
        </button>
      </div>

      {/* Scan Results */}
      {scanResults && (
        <>
          {/* Device Info */}
          <div className="p-3 rounded-xl border border-white/10" style={{ backgroundColor: glassBg }}>
            <p className="font-mono-data text-[9px] text-white/40 uppercase tracking-widest mb-2">Device Posture</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(scanResults.info).map(([key, val]) => (
                <div key={key} className="flex justify-between text-[9px] font-mono-data">
                  <span className="text-white/40 uppercase">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <span className={`font-bold ${val === 'YES' ? 'text-[#39ff14]' : val === 'NO' ? 'text-red-400' : 'text-white/70'}`}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Threats */}
          {scanResults.threats.length > 0 && (
            <div className="space-y-2">
              <p className="font-mono-data text-[9px] text-white/40 uppercase tracking-widest">Detected Issues</p>
              {scanResults.threats.map(threat => (
                <div key={threat.id} className="flex items-start gap-3 p-3 rounded-xl border border-white/10" style={{ backgroundColor: glassBg }}>
                  <span className="material-symbols-outlined text-sm mt-0.5" style={{ color: severityColor[threat.severity] }}>{threat.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-data text-[10px] text-white/90 font-bold">{threat.title}</span>
                      <span className="font-mono-data text-[7px] uppercase px-1.5 py-0.5 rounded" style={{ backgroundColor: severityColor[threat.severity] + '20', color: severityColor[threat.severity] }}>{threat.severity}</span>
                    </div>
                    <p className="font-mono-data text-[9px] text-white/50 mt-0.5">{threat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {scanResults.threats.length === 0 && (
            <div className="p-4 rounded-xl border border-[#39ff14]/20 text-center" style={{ backgroundColor: glassBg }}>
              <span className="material-symbols-outlined text-[#39ff14] text-2xl">verified_user</span>
              <p className="font-mono-data text-[10px] text-[#39ff14] mt-2 uppercase tracking-widest">All Clear — No Threats Detected</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
