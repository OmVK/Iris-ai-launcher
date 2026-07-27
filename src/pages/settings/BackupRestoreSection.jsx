import { useState, useCallback, useRef } from 'react'
import SettingsSection from './SettingsSection'
import { exportBackup, importBackup, resetToDefaults, getBackupInfo } from '../../utils/BackupManager'

export default function BackupRestoreSection({ expandedSections, toggleSection, onReset }) {
  const [status, setStatus] = useState(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetCountdown, setResetCountdown] = useState(0)
  const fileInputRef = useRef(null)

  const handleExport = useCallback(async () => {
    setStatus('EXPORTING...')
    try {
      const result = await exportBackup()
      if (result.success) {
        setStatus(`EXPORTED: ${result.path} (${(result.size / 1024).toFixed(1)}KB)`)
      } else {
        setStatus(`EXPORT FAILED: ${result.error}`)
      }
    } catch (e) {
      setStatus(`EXPORT FAILED: ${e.message}`)
    }
    setTimeout(() => setStatus(null), 5000)
  }, [])

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setStatus('IMPORTING...')
    try {
      const text = await file.text()
      const result = await importBackup(text)
      if (result.success) {
        setStatus('IMPORT COMPLETE — RESTARTING...')
        setTimeout(() => window.location.reload(), 1500)
      } else {
        setStatus(`IMPORT FAILED: ${result.error}`)
        setTimeout(() => setStatus(null), 5000)
      }
    } catch (err) {
      setStatus(`IMPORT FAILED: ${err.message}`)
      setTimeout(() => setStatus(null), 5000)
    }
    e.target.value = ''
  }, [])

  const handleReset = useCallback(async () => {
    if (!confirmReset) {
      setConfirmReset(true)
      let countdown = 5
      setResetCountdown(countdown)
      const timer = setInterval(() => {
        countdown--
        setResetCountdown(countdown)
        if (countdown <= 0) {
          clearInterval(timer)
          setConfirmReset(false)
        }
      }, 1000)
      return
    }

    setStatus('RESETTING TO DEFAULTS...')
    try {
      const result = await resetToDefaults()
      if (result.success) {
        setStatus('RESET COMPLETE — RESTARTING...')
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      }
    } catch (e) {
      setStatus(`RESET FAILED: ${e.message}`)
    }
  }, [confirmReset])

  return (
    <SettingsSection title="BACKUP & RESTORE" icon="backup" sectionKey="backupRestore" expandedSections={expandedSections} toggleSection={toggleSection}>
      <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-white/70 font-mono-data">EXPORT CONFIG</p>
          <p className="text-[10px] text-white/30 font-mono-data">Save all settings, positions, and preferences</p>
        </div>
        <button onClick={handleExport} className="px-3 py-1.5 rounded-lg bg-[rgba(var(--primary-rgb),0.15)] text-[var(--primary-color)] text-[10px] font-mono-data hover:bg-[rgba(var(--primary-rgb),0.25)]">
          EXPORT
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-white/70 font-mono-data">IMPORT CONFIG</p>
          <p className="text-[10px] text-white/30 font-mono-data">Restore from a backup file</p>
        </div>
        <button onClick={handleImportClick} className="px-3 py-1.5 rounded-lg bg-white/5 text-white/50 text-[10px] font-mono-data hover:bg-white/10">
          IMPORT
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept=".json" 
          onChange={handleFileChange} 
        />
      </div>

      <div className="h-px bg-white/5" />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-red-400 font-mono-data">FACTORY RESET</p>
          <p className="text-[10px] text-white/30 font-mono-data">Erase all configuration and settings</p>
        </div>
        <button
          onClick={handleReset}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-mono-data transition-all ${
            confirmReset
              ? 'bg-red-500/20 text-red-400 animate-pulse'
              : 'bg-white/5 text-white/40 hover:bg-red-500/10 hover:text-red-400'
          }`}
        >
          {confirmReset ? `CONFIRM (${resetCountdown}s)` : 'RESET'}
        </button>
      </div>

      {status && (
        <div className="text-[10px] text-white/40 font-mono-data p-2 rounded-lg bg-white/5 animate-in fade-in">
          {status}
        </div>
      )}
      </div>
    </SettingsSection>
  )
}
