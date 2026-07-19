import { useState } from 'react'
import SettingsSection from './SettingsSection'

export default function FactoryResetSection({ expandedSections, toggleSection, onResetApps }) {
  const [confirming, setConfirming] = useState(false)

  const handleReset = () => {
    if (!confirming) {
      setConfirming(true)
      setTimeout(() => setConfirming(false), 3000)
      return
    }
    onResetApps()
    setConfirming(false)
  }

  return (
    <SettingsSection title="SYSTEM PACKAGES CONTROLLER" icon="settings_backup_restore" sectionKey="factoryReset" expandedSections={expandedSections} toggleSection={toggleSection}>
      <div className="space-y-3">
        <div className="flex justify-between items-center gap-4">
          <div className="font-mono-data text-xs">
            <p className="text-[8px] text-on-surface-variant/40 uppercase">RESTORE ALL PREINSTALLED LAUNCHER CORE NODES</p>
            {confirming && (
              <p className="text-[8px] text-amber mt-1 uppercase animate-pulse">CONFIRM: TAP AGAIN TO RESET</p>
            )}
          </div>
          <button onClick={handleReset}
            className={`px-3 py-1.5 rounded font-bold active:scale-95 transition-transform text-[9px] shrink-0 ${
              confirming
                ? 'bg-error-container/20 border border-error/30 text-error animate-pulse'
                : 'bg-primary-fixed-dim/20 border border-primary-fixed-dim/40 text-primary-fixed-dim'
            }`}>
            {confirming ? 'CONFIRM RESET' : 'RESTORE FACTORY APPS'}
          </button>
        </div>
      </div>
    </SettingsSection>
  )
}
