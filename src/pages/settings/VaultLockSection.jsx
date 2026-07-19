import { useState } from 'react'
import SettingsSection from './SettingsSection'

const TIMEOUTS = [
  { label: '1 MIN', value: 60000 },
  { label: '5 MIN', value: 300000 },
  { label: '15 MIN', value: 900000 },
  { label: 'SESSION', value: 0 },
]

export default function VaultLockSection({ expandedSections, toggleSection, onResetVault }) {
  const [autoLock, setAutoLock] = useState(() => {
    return parseInt(localStorage.getItem('vault_auto_lock') || '0')
  })

  const handleAutoLock = (ms) => {
    setAutoLock(ms)
    localStorage.setItem('vault_auto_lock', ms.toString())
  }

  return (
    <SettingsSection title="SECURE PRIVATE VAULT ACTIVE" icon="lock_open" sectionKey="vaultLock" expandedSections={expandedSections} toggleSection={toggleSection}>
      <div className="space-y-3">
        <div className="flex justify-between items-center gap-4">
          <div className="font-mono-data text-xs">
            <p className="text-[8px] text-on-surface-variant/40 mt-0.5">VAULT REMAINS UNLOCKED DURING THIS SESSION</p>
          </div>
          <button onClick={onResetVault} className="px-3 py-1.5 rounded bg-error-container/20 border border-error/30 text-error font-mono-data text-[9px] font-bold active:scale-95 transition-transform shrink-0">
            LOCK PRIVATE VAULT
          </button>
        </div>

        <div className="border-t border-white/5 pt-3">
          <p className="text-[9px] text-on-surface-variant/40 uppercase mb-2">AUTO-LOCK TIMEOUT</p>
          <div className="grid grid-cols-4 gap-1.5">
            {TIMEOUTS.map(t => (
              <button key={t.value} onClick={() => handleAutoLock(t.value)}
                className={`py-1.5 rounded text-[8px] font-mono-data font-bold uppercase tracking-wider transition-all ${
                  autoLock === t.value
                    ? 'bg-primary-fixed-dim/20 border border-primary-fixed-dim/40 text-primary-fixed-dim'
                    : 'bg-black/20 border border-outline-variant/20 text-on-surface-variant/40 hover:text-white'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </SettingsSection>
  )
}
