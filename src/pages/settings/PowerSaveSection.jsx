import SettingsSection from './SettingsSection'
import PowerSaveManager, { MODES, detectDeviceTier } from '../../utils/PowerSaveManager'

export default function PowerSaveSection({ expandedSections, toggleSection, powerSaveMode, setPowerSaveMode }) {
  const deviceTier = detectDeviceTier()
  return (
    <SettingsSection title="POWER SAVE MODE" icon="battery_saver" sectionKey="powerSave" expandedSections={expandedSections} toggleSection={toggleSection}>
      <div className="text-[8px] text-on-surface-variant/40 uppercase">REDUCE CPU/GPU LOAD TO EXTEND BATTERY LIFE</div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] text-on-surface-variant/60 uppercase">DEVICE TIER (AUTO)</p>
          <p className="text-[8px] text-primary-fixed-dim mt-0.5">{deviceTier === 'LOW' ? 'LOW-END' : deviceTier === 'MEDIUM' ? 'MID-RANGE' : 'HIGH-END'}</p>
        </div>
        <span className="material-symbols-outlined text-sm text-primary-fixed-dim/40">auto_awesome</span>
      </div>

      <div>
        <p className="text-[9px] text-on-surface-variant/60 uppercase mb-2">MANUAL MODE SELECTION</p>
        <div className="grid grid-cols-4 gap-1.5">
          {Object.entries(MODES).map(([key, value]) => (
            <button key={key} onClick={() => setPowerSaveMode(value)}
              className={`py-1.5 px-2 rounded text-[8px] font-bold border transition-all ${powerSaveMode === value ? 'bg-primary-fixed-dim/30 border-primary-fixed-dim/60 text-primary-fixed-dim' : 'bg-white/5 border-white/10 text-on-surface-variant/50 hover:text-white/80'}`}>
              {key}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white/5 rounded-lg p-3 space-y-2" key={powerSaveMode}>
        <p className="text-[9px] text-on-surface-variant/60 uppercase">ACTIVE PRESET</p>
        <div className="grid grid-cols-2 gap-2 text-[8px]">
          {[
            ['3D Orb', 'orb'], ['Wallpaper', 'wallpaper'], ['Particles', 'particles'], ['Blur/Effects', 'blur'],
            ['Polling', null, () => `${PowerSaveManager.getPollingMultiplier()}x`],
            ['Icon Size', null, () => `${PowerSaveManager.getIconSizeMultiplier()}x`],
            ['Transitions', 'transitions']
          ].map(([label, feature, getter]) => (
            <div key={label} className="flex justify-between">
              <span className="text-on-surface-variant/40">{label}:</span>
              <span className={getter ? '' : (PowerSaveManager.shouldDisable(feature) ? 'text-error' : 'text-green-400')}>
                {getter ? getter() : (PowerSaveManager.shouldDisable(feature) ? 'OFF' : 'ON')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </SettingsSection>
  )
}
