import FileExplorer from './FileExplorer'
import ThreatLogs from './ThreatLogs'
import { launchApp } from './LauncherPlugin'

export default function VaultExplorer({
  vaultTab, setVaultTab, lockedApps, installedApps, isVaultUnlocked,
  onToggleAppLock, onTriggerUnlock, onClose, onUnlock, onLaunchApp
}) {
  return (
    <div className="fixed inset-0 bg-[#020617]/90 backdrop-blur-xl z-40 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl h-[450px] glass-surface rounded-xl p-5 flex flex-col relative overflow-hidden">
        <div className="flex justify-between items-center pb-2 border-b border-white/5 mb-4">
          <div className="flex items-center gap-2 text-primary-fixed-dim">
            <span className="material-symbols-outlined text-sm">lock_open</span>
            <span className="font-label-caps text-label-caps tracking-widest text-xs uppercase">COGNITIVE SYSTEM VAULT</span>
          </div>
          <div className="flex gap-2 bg-black/40 border border-primary-fixed-dim/20 rounded px-1.5 py-0.5">
            {[['FILES', 'SECURE FILES'], ['APPS', 'LOCKED APPS'], ['THREATS', 'THREATS']].map(([key, label]) => (
              <button key={key} onClick={() => setVaultTab(key)} className={`px-3 py-1 font-label-caps text-[9px] tracking-wider rounded transition-all ${vaultTab === key ? (key === 'THREATS' ? 'bg-error/20 text-error border border-error/40' : 'bg-primary-fixed-dim/20 text-primary-fixed-dim border border-primary-fixed-dim/40') : (key === 'THREATS' ? 'text-error/60 hover:text-error border border-transparent' : 'text-on-surface-variant/60 hover:text-white border border-transparent')}`}>{label}</button>
            ))}
          </div>
          <button onClick={() => { onClose(); onUnlock(false) }} className="text-on-surface-variant/50 hover:text-white"><span className="material-symbols-outlined text-sm">close</span></button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {vaultTab === 'FILES' ? <FileExplorer isVaultUnlocked={isVaultUnlocked} onTriggerUnlock={onTriggerUnlock} /> : vaultTab === 'THREATS' ? <ThreatLogs /> : (
            <div className="flex flex-col h-full">
              {!(Array.isArray(lockedApps) && lockedApps.length > 0) ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-outline-variant/30 rounded-lg bg-black/20">
                  <span className="material-symbols-outlined text-3xl text-on-surface-variant/30 mb-2">lock_open</span>
                  <p className="font-mono-data text-[10px] text-on-surface-variant/60 uppercase tracking-wider max-w-[320px]">NO SECURED COGNITIVE INTERFACES MOUNTED.</p>
                  <p className="font-mono-data text-[8px] text-on-surface-variant/40 mt-1 uppercase max-w-[280px]">LONG-PRESS ANY APPLICATION IN HOME OR DRAWER AND SELECT "SECURE LOCK" TO ISOLATE.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 overflow-y-auto pr-1">
                  {installedApps.filter(app => Array.isArray(lockedApps) && lockedApps.includes(app.packageId)).map(app => (
                    <div key={app.packageId} className="flex items-center justify-between p-2.5 rounded border border-outline-variant/20 bg-surface-container/10 hover:bg-surface-container/20 hover:border-primary-fixed-dim/30 transition-all group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded bg-primary-fixed-dim/10 border border-primary-fixed-dim/20 flex items-center justify-center flex-shrink-0">
                          {app.icon?.startsWith('data:image') ? <img src={app.icon} alt={app.label} className="w-6 h-6 object-contain" /> : <span className="material-symbols-outlined text-sm text-primary-fixed-dim">{app.icon || 'rocket_launch'}</span>}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-white truncate leading-tight">{app.label}</h4>
                          <p className="font-mono-data text-[7.5px] text-on-surface-variant/50 truncate tracking-wide">{app.packageId}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => onLaunchApp(app)} className="px-2.5 py-1 bg-primary-fixed-dim/15 border border-primary-fixed-dim/30 rounded text-primary-fixed-dim hover:bg-primary-fixed-dim hover:text-black font-label-caps text-[9px] tracking-widest transition-all">LAUNCH</button>
                        <button onClick={() => onToggleAppLock(app.packageId)} className="px-2.5 py-1 bg-error/15 border border-error/30 rounded text-error hover:bg-error hover:text-white font-label-caps text-[9px] tracking-widest transition-all">DE-CRYPT</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="mt-3 text-[9px] text-on-surface-variant/40 font-mono-data uppercase flex justify-between">
          <span>LANCEDB_VECTOR_SYNC: VERIFIED</span><span>AES_256_ACTIVE: ENCRYPTED</span>
        </div>
      </div>
    </div>
  )
}
