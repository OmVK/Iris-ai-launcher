export default function SessionSidebar({
  sessions,
  activeSessionId,
  isPrivateSession,
  voiceEnabled,
  onSetVoiceEnabled,
  onCreateNewSession,
  onLoadSession,
  onDeleteSession,
  onClose,
  children
}) {
  return (
    <div className="absolute inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      />

      {/* Slide-Over Panel */}
      <aside className="relative z-10 w-[260px] max-w-[82%] h-full bg-[#060b19]/95 backdrop-blur-2xl border-r border-white/10 flex flex-col shrink-0 shadow-2xl overflow-hidden animate-in slide-in-from-left duration-200">
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-[var(--primary-color)] opacity-20 blur-3xl rounded-full pointer-events-none" />

        {/* Drawer Header */}
        <div className="p-3.5 border-b border-white/10 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--primary-color)] text-base">history</span>
            <span className="font-mono text-[11px] font-bold tracking-widest uppercase text-white/90">NEURAL SESSIONS</span>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
        </div>

        {children}

        <div className="p-3.5 border-b border-white/5 z-10 relative flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              onSetVoiceEnabled(!voiceEnabled)
              localStorage.setItem('iris_voice_enabled', String(!voiceEnabled))
            }}
            className={`w-full py-2 rounded-xl flex items-center justify-center gap-2 text-[11px] font-bold active:scale-95 transition-all ${
              voiceEnabled
                ? 'bg-[rgba(var(--primary-rgb),0.15)] border border-[rgba(var(--primary-rgb),0.3)] text-[var(--primary-color)] shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]'
                : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white/80'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{voiceEnabled ? 'volume_up' : 'volume_off'}</span>
            <span>{voiceEnabled ? 'AUTO-SPEAK ON' : 'AUTO-SPEAK OFF'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onCreateNewSession()
              if (onClose) onClose()
            }}
            disabled={isPrivateSession}
            className={`w-full py-2 rounded-xl flex items-center justify-center gap-2 text-[11px] font-bold active:scale-95 transition-all ${
              isPrivateSession
                ? 'opacity-30 bg-white/5 border border-white/5 text-white/20'
                : 'bg-[var(--primary-color)] text-[#020617] hover:bg-[rgba(var(--primary-rgb),0.9)] shadow-[0_4px_15px_rgba(var(--primary-rgb),0.3)]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>NEW CHAT SESSION</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scroll-container p-2.5 space-y-1.5 z-10 relative">
          {sessions.map(s => {
            const isActive = activeSessionId === s.id && !isPrivateSession
            const msgCount = Array.isArray(s.log) ? s.log.length : 0
            return (
              <div
                key={s.id}
                onClick={() => {
                  onLoadSession(s.id)
                  if (onClose) onClose()
                }}
                className={`group flex items-center justify-between p-2.5 rounded-xl text-[12px] font-medium cursor-pointer transition-all ${
                  isActive
                    ? 'bg-[rgba(var(--primary-rgb),0.16)] border border-[rgba(var(--primary-rgb),0.3)] text-[var(--primary-color)] shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]'
                    : 'bg-white/[0.02] border border-white/5 hover:bg-white/10 text-white/70 hover:text-white'
                }`}
              >
                <div className="flex flex-col min-w-0 flex-1 pr-2">
                  <span className="truncate font-sans text-[12px] font-semibold">{s.name}</span>
                  <span className="text-[9.5px] font-mono text-white/35">{msgCount} messages</span>
                </div>
                {sessions.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDeleteSession(s.id) }}
                    className="hover:bg-red-500/20 p-1.5 rounded-lg text-white/35 hover:text-red-400 transition-colors"
                    title="Delete session"
                  >
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </aside>
    </div>
  )
}
