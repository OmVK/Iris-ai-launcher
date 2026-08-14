import React from 'react'
import { useAppStore } from '../../stores/appStore'

export default function IrisVaultHub({ glassBg, onNavigate, onTriggerChronoLock, onTriggerVault }) {
  const { isVaultUnlocked, lockedApps } = useAppStore()

  const vaultTiles = [
    {
      id: 'iris_vault',
      name: 'IRIS Vault',
      desc: 'Cognitive System Vault with Secure Files, Locked Apps & Threats',
      icon: 'inventory_2',
      color: '#eab308',
      badge: 'SYSTEM VAULT',
      locked: true,
      action: () => {
        if (onTriggerVault) onTriggerVault()
      }
    },
    {
      id: 'private_vault',
      name: 'Private Vault',
      desc: 'Covert Media, Silent Photos, Video Captures & Audio Logs',
      icon: 'visibility_off',
      color: '#ef4444',
      badge: 'COVERT MEDIA',
      locked: true,
      action: () => {
        if (!isVaultUnlocked) {
          if (onTriggerChronoLock) onTriggerChronoLock('private')
        } else {
          if (onNavigate) onNavigate('private')
        }
      }
    },
    {
      id: 'chrono_key',
      name: 'Chrono Key',
      desc: 'Dynamic Time-based PIN Keypad & Biometric Authenticator',
      icon: 'password',
      color: '#a855f7',
      badge: 'PIN / BIOMETRIC',
      locked: false,
      action: () => {
        if (onTriggerChronoLock) onTriggerChronoLock('chrono_key')
      }
    }
  ]

  return (
    <div className="space-y-4 font-mono-data text-xs">
      <div className="p-3 rounded-xl border border-yellow-500/20 bg-yellow-950/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-yellow-400 text-lg">admin_panel_settings</span>
          <div>
            <span className="text-[10px] text-yellow-300 font-bold uppercase tracking-wider">IRIS SECURITY REPOSITORY</span>
            <p className="text-[8px] text-white/50">{lockedApps?.length || 0} Apps Isolated • AES-256 Storage Active</p>
          </div>
        </div>
        <span className={`text-[8px] font-bold px-2 py-0.5 rounded border ${isVaultUnlocked ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-red-500/20 text-red-300 border-red-500/40'}`}>
          {isVaultUnlocked ? 'AUTHENTICATED' : 'LOCKED'}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {vaultTiles.map(tile => (
          <button
            key={tile.id}
            onClick={tile.action}
            className="p-4 rounded-xl border border-white/10 bg-slate-900/60 hover:bg-slate-800/80 hover:border-cyan-400/40 transition-all text-left flex items-center justify-between gap-3 group active:scale-98 shadow-lg"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center border group-hover:scale-110 transition-transform flex-shrink-0"
                style={{ backgroundColor: `${tile.color}15`, borderColor: `${tile.color}40` }}
              >
                <span className="material-symbols-outlined text-2xl" style={{ color: tile.color }}>
                  {tile.icon}
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-xs text-white uppercase tracking-wider group-hover:text-cyan-300 transition-colors truncate">
                    {tile.name}
                  </h4>
                  {tile.locked && !isVaultUnlocked && (
                    <span className="material-symbols-outlined text-[11px] text-cyan-400/70">lock</span>
                  )}
                </div>
                <p className="text-[9px] text-white/50 mt-0.5 leading-relaxed truncate">
                  {tile.desc}
                </p>
              </div>
            </div>

            <span
              className="text-[8px] font-bold px-2.5 py-1 rounded border tracking-wider flex-shrink-0"
              style={{ color: tile.color, borderColor: `${tile.color}40`, backgroundColor: `${tile.color}10` }}
            >
              {tile.badge}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
