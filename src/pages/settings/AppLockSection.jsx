import { useState, useCallback, useEffect } from 'react'
import SettingsSection from './SettingsSection'
import useAppListStore from '../../stores/appListRepository'
import { openPermissionSettings } from '../../components/LauncherPlugin'
import { useAppStore } from '../../stores/appStore'

export default function AppLockSection({ expandedSections, toggleSection }) {
  const { allApps } = useAppListStore()
  const { lockedApps, toggleAppLock } = useAppStore()
  const [showEnrolled, setShowEnrolled] = useState(false)
  const [timeoutSetting, setTimeoutSetting] = useState('Immediate')

  useEffect(() => {
    const saved = localStorage.getItem('iris_app_lock_timeout')
    if (saved) setTimeoutSetting(saved)
  }, [])

  const handleSetTimeout = (option) => {
    setTimeoutSetting(option)
    localStorage.setItem('iris_app_lock_timeout', option)
  }

  const lockedAppList = allApps.filter(app => lockedApps?.includes(app.packageId))

  return (
    <SettingsSection title="APP LOCK" icon="lock" sectionKey="appLock" expandedSections={expandedSections} toggleSection={toggleSection} badge={`${lockedAppList.length} LOCKED`}>
      <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-white/70 font-mono-data">ENROLLED APPS</p>
          <p className="text-[10px] text-white/30 font-mono-data">{lockedAppList.length} app{lockedAppList.length !== 1 ? 's' : ''} locked</p>
        </div>
        <button
          onClick={() => setShowEnrolled(!showEnrolled)}
          className="text-[10px] text-white/40 font-mono-data hover:text-white/60"
        >
          {showEnrolled ? 'HIDE' : 'VIEW'}
        </button>
      </div>

      {showEnrolled && (
        <div className="max-h-40 overflow-y-auto space-y-1 no-scrollbar">
          {lockedAppList.length === 0 ? (
            <p className="text-[10px] text-white/20 font-mono-data text-center py-4">No apps enrolled in lock</p>
          ) : (
            lockedAppList.map(app => (
              <div key={app.packageId} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-white/5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-rounded text-white/40 text-xs">lock</span>
                  <span className="text-[10px] text-white/60 font-mono-data">{app.label}</span>
                </div>
                <button
                  onClick={() => toggleAppLock(app.packageId)}
                  className="text-[9px] text-red-400/60 font-mono-data hover:text-red-400"
                >
                  UNLOCK
                </button>
              </div>
            ))
          )}
        </div>
      )}

      <div className="h-px bg-white/5" />

      <div>
        <p className="text-[10px] text-white/30 font-mono-data mb-2">LOCK TIMEOUT</p>
        <div className="grid grid-cols-2 gap-1.5">
          {['Immediate', '30 seconds', '1 minute', '5 minutes', 'Screen off'].map(option => (
            <button
              key={option}
              onClick={() => handleSetTimeout(option)}
              className={`py-2 px-3 rounded-lg text-[10px] font-mono-data transition-all ${
                timeoutSetting === option
                  ? 'bg-[rgba(var(--primary-rgb),0.2)] text-[var(--primary-color)] border border-[var(--primary-color)]/30'
                  : 'bg-white/5 text-white/40 hover:bg-white/10 border border-transparent'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      </div>
    </SettingsSection>
  )
}
