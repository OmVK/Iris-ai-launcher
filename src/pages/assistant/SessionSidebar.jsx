export default function SessionSidebar({ sessions, activeSessionId, isPrivateSession, voiceEnabled, onSetVoiceEnabled, onCreateNewSession, onLoadSession, onDeleteSession, children }) {
  return (
    <aside className="w-[220px] bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl flex flex-col shrink-0 shadow-2xl overflow-hidden relative">
      {/* Decorative gradient orb behind the sidebar */}
      <div className="absolute -top-20 -left-20 w-40 h-40 bg-[var(--primary-color)] opacity-20 blur-3xl rounded-full pointer-events-none"></div>

      {children}

      <div className="p-4 border-b border-white/5 z-10 relative">
        <h4 className="font-sans text-[10px] text-white/50 font-semibold tracking-widest uppercase mb-3">Settings</h4>
        <button onClick={() => { onSetVoiceEnabled(!voiceEnabled); localStorage.setItem('iris_voice_enabled', String(!voiceEnabled)) }}
          className={`w-full py-2 rounded-xl flex items-center justify-center gap-2 text-[11px] font-bold active:scale-95 transition-all duration-300 ${voiceEnabled ? 'bg-[rgba(var(--primary-rgb),0.15)] border border-[rgba(var(--primary-rgb),0.3)] text-[var(--primary-color)] shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]' : 'bg-white/5 border border-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'}`}>
          <span className="material-symbols-outlined text-[16px]">{voiceEnabled ? 'volume_up' : 'volume_off'}</span>
          {voiceEnabled ? 'VOICE ON' : 'VOICE OFF'}
        </button>
      </div>

      <div className="p-4 border-b border-white/5 z-10 relative flex flex-col gap-3">
        <h4 className="font-sans text-[10px] text-white/50 font-semibold tracking-widest uppercase">Chat History</h4>
        <button onClick={() => { onCreateNewSession() }} disabled={isPrivateSession}
          className={`w-full py-2 rounded-xl flex items-center justify-center gap-2 text-[11px] font-bold active:scale-95 transition-all duration-300 ${isPrivateSession ? 'opacity-30 bg-white/5 border border-white/5 text-white/20' : 'bg-[var(--primary-color)] text-[#020617] hover:bg-[rgba(var(--primary-rgb),0.9)] shadow-[0_4px_15px_rgba(var(--primary-rgb),0.3)]'}`}>
          <span className="material-symbols-outlined text-[16px]">add</span>NEW CHAT
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scroll-container p-2 space-y-1 z-10 relative">
        {sessions.map(s => {
          const isActive = activeSessionId === s.id && !isPrivateSession
          return (
            <div key={s.id} onClick={() => onLoadSession(s.id)}
              className={`group flex items-center justify-between p-3 rounded-xl text-[12px] font-medium cursor-pointer transition-all duration-300 ${isActive ? 'bg-[rgba(var(--primary-rgb),0.15)] border border-[rgba(var(--primary-rgb),0.2)] text-[var(--primary-color)] shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]' : 'bg-transparent border border-transparent hover:bg-white/5 text-white/60 hover:text-white/90'}`}>
              <span className="truncate pr-2 font-sans">{s.name}</span>
              {sessions.length > 1 && (
                <button onClick={(e) => { e.stopPropagation(); onDeleteSession(s.id) }} className={`hover:bg-red-500/20 p-1.5 rounded-lg transition-colors ${isActive ? 'text-[rgba(var(--primary-rgb),0.6)] hover:text-red-400' : 'text-transparent group-hover:text-white/30 hover:!text-red-400'}`}>
                  <span className="material-symbols-outlined text-[14px]">delete</span>
                </button>
              )}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
