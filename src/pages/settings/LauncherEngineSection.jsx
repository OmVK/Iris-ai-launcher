import { useState } from 'react'
import SettingsSection from './SettingsSection'
import { requestDefaultLauncher, isNative } from '../../components/LauncherPlugin'

export default function LauncherEngineSection({ expandedSections, toggleSection }) {
  const [isDefault, setIsDefault] = useState(null)

  return (
    <SettingsSection title="SYSTEM LAUNCHER ENGINE" icon="home" sectionKey="launcherEngine" expandedSections={expandedSections} toggleSection={toggleSection}>
      <div className="space-y-3">
        <div className="flex justify-between items-center gap-4">
          <div className="font-mono-data text-xs">
            <p className="text-[8px] text-on-surface-variant/40 uppercase">CONFIGURE IRIS AS THE DEFAULT OPERATIONAL SHELL</p>
            {isDefault !== null && (
              <p className={`text-[8px] mt-1 uppercase ${isDefault ? 'text-green-400' : 'text-on-surface-variant/40'}`}>
                STATUS: {isDefault ? 'DEFAULT LAUNCHER ACTIVE' : 'NOT SET AS DEFAULT'}
              </p>
            )}
          </div>
          <button onClick={async () => {
              const res = await requestDefaultLauncher()
              if (res?.alreadyDefault) setIsDefault(true)
              else setIsDefault(false)
            }}
            className="px-3 py-1.5 rounded bg-primary-fixed-dim/20 border border-primary-fixed-dim/40 text-primary-fixed-dim font-bold active:scale-95 transition-transform text-[9px] flex items-center gap-1 shrink-0">
            SET AS DEFAULT HOME
          </button>
        </div>
      </div>
    </SettingsSection>
  )
}
