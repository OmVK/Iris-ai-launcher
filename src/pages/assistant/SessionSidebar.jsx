export default function SessionSidebar({ sessions, activeSessionId, isPrivateSession, voiceEnabled, onSetVoiceEnabled, onCreateNewSession, onLoadSession, onDeleteSession, children }) {
  return (
    <aside className="w-1/3 max-w-[200px] border-r border-outline-variant/20 bg-black/25 flex flex-col shrink-0">
      {children}

      <div className="p-3 border-b border-outline-variant/15">
        <h4 className="font-label-caps text-[9px] text-primary-fixed-dim/60 tracking-widest uppercase mb-2">VOICE OUTPUT</h4>
        <button onClick={() => { onSetVoiceEnabled(!voiceEnabled); localStorage.setItem('iris_voice_enabled', String(!voiceEnabled)) }}
          className={`w-full py-1.5 rounded flex items-center justify-center gap-1.5 border font-mono-data text-[9px] font-bold active:scale-95 transition-all ${voiceEnabled ? 'bg-primary-fixed-dim/15 border-primary-fixed-dim/40 text-primary-fixed-dim shadow-[0_0_8px_rgba(var(--primary-rgb),0.15)]' : 'border-outline-variant/20 text-on-surface-variant/50 hover:text-white'}`}>
          <span className="material-symbols-outlined text-[11px]">{voiceEnabled ? 'volume_up' : 'volume_off'}</span>
          {voiceEnabled ? 'VOICE ON' : 'VOICE OFF'}
        </button>
      </div>

      <div className="p-3 border-b border-outline-variant/15 flex flex-col gap-2">
        <h4 className="font-label-caps text-[9px] text-primary-fixed-dim/60 tracking-widest uppercase">HISTORY NODES</h4>
        <button onClick={() => { onCreateNewSession() }} disabled={isPrivateSession}
          className={`w-full py-1.5 rounded flex items-center justify-center gap-1.5 border font-mono-data text-[9px] font-bold active:scale-95 transition-all ${isPrivateSession ? 'opacity-30 border-white/5 text-on-surface-variant/40' : 'bg-primary-fixed-dim/15 border-primary-fixed-dim/30 hover:border-primary-fixed-dim/60 text-primary-fixed-dim'}`}>
          <span className="material-symbols-outlined text-[11px]">add</span>NEW_SESSION
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scroll-container p-2 space-y-1.5">
        {sessions.map(s => {
          const isActive = activeSessionId === s.id && !isPrivateSession
          return (
            <div key={s.id} onClick={() => onLoadSession(s.id)}
              className={`group flex items-center justify-between p-2 rounded border font-mono-data text-[9px] cursor-pointer transition-all ${isActive ? 'bg-primary-fixed-dim/10 border-primary-fixed-dim/40 text-primary-fixed-dim shadow-[0_0_8px_rgba(var(--primary-rgb),0.15)]' : 'bg-transparent border-transparent hover:bg-white/5 text-on-surface-variant/60 hover:text-white'}`}>
              <span className="truncate pr-1">{s.name}</span>
              {sessions.length > 1 && (
                <button onClick={(e) => onDeleteSession(s.id, e)} className="hover:text-error transition-colors text-on-surface-variant/60">
                  <span className="material-symbols-outlined text-[10px]">delete</span>
                </button>
              )}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
