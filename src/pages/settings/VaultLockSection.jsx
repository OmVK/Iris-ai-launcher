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

  const [pinOffset, setPinOffset] = useState(() => {
    return parseInt(localStorage.getItem('iris_chrono_pin_offset') || '0', 10)
  })

  const handlePinOffset = (mins) => {
    setPinOffset(mins)
    localStorage.setItem('iris_chrono_pin_offset', mins.toString())
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
          <p className="text-[9px] text-on-surface-variant/40 uppercase mb-2">DYNAMIC CHRONO PIN SECURITY OFFSET</p>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: 'EXACT (0M)', value: 0 },
              { label: '+5 MIN', value: 5 },
              { label: '+10 MIN', value: 10 },
              { label: '+15 MIN', value: 15 }
            ].map(o => (
              <button key={o.value} onClick={() => handlePinOffset(o.value)}
                className={`py-1.5 rounded text-[8px] font-mono-data font-bold uppercase tracking-wider transition-all ${
                  pinOffset === o.value
                    ? 'bg-primary-fixed-dim/20 border border-primary-fixed-dim/40 text-primary-fixed-dim'
                    : 'bg-black/20 border border-outline-variant/20 text-on-surface-variant/40 hover:text-white'
                }`}>
                {o.label}
              </button>
            ))}
          </div>
          <p className="text-[7.5px] text-on-surface-variant/30 mt-1 uppercase">Prevents strangers from guessing the vault clock PIN</p>
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
