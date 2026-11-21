import ProviderBadge from '../../components/ProviderBadge'

const PERSONAS = [
  { id: 'CHAT', label: '💬 Chat', desc: 'Natural everyday chat' },
  { id: 'RESEARCH', label: '🌐 Search', desc: 'Live Web Search' },
  { id: 'CODER', label: '💻 Coder', desc: 'Code & Architecture' },
  { id: 'TUTOR', label: '🎓 Tutor', desc: 'Study & ELI5' },
  { id: 'COMMANDER', label: '⚡ OS Ctrl', desc: 'Device Automation' },
]

export default function EngineModelBar({
  activeBackend,
  onSetBackend,
  selectedOllamaModel,
  onSetOllamaModel,
  ollamaModels,
  ollamaStatus,
  activeGeminiModel,
  activeGroqModel,
  activeNvidiaModel,
  onFetchOllamaModels,
  onNewChat,
  assistantPersona = 'CHAT',
  onSetPersona,
  isPrivateSession = false,
  onToggleIncognito,
}) {
  const activeModelBadge = activeBackend === 'GEMINI'
    ? (activeGeminiModel || 'gemini-2.5-flash')
    : activeBackend === 'GROQ'
      ? (activeGroqModel || 'llama-3.3-70b')
      : activeBackend === 'NVIDIA'
        ? (activeNvidiaModel || 'llama-3.1-70b')
        : activeBackend === 'ONDEVICE'
          ? 'gemini-nano'
          : (selectedOllamaModel || 'local')

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-black/30 backdrop-blur-xl border border-white/10 rounded-full shadow-lg max-w-full overflow-x-auto no-scrollbar">
      {/* Engine Selector */}
      <div className="flex items-center bg-white/5 rounded-full px-2 py-0.5 border border-white/5 shrink-0">
        <ProviderBadge backend={activeBackend} showLabel={false} />
        <select
          value={activeBackend}
          onChange={e => { onSetBackend(e.target.value); if (e.target.value === 'OLLAMA') onFetchOllamaModels() }}
          className="appearance-none bg-transparent text-white/90 text-[10.5px] font-semibold px-1.5 py-0.5 focus:outline-none cursor-pointer"
        >
          <option value="GEMINI" className="bg-[#0f172a]">Gemini Auto</option>
          <option value="GROQ" className="bg-[#0f172a]">Groq LPU Auto</option>
          <option value="OLLAMA" className="bg-[#0f172a]">Local Ollama</option>
          <option value="ONDEVICE" className="bg-[#0f172a]">Gemini Nano</option>
          <option value="NVIDIA" className="bg-[#0f172a]">NVIDIA NIM</option>
        </select>
        <span className="material-symbols-outlined text-[13px] text-white/50 pointer-events-none -ml-1">expand_more</span>
      </div>

      {/* Ollama model selector only when Ollama is active; Cloud engines use Auto-Sync badge */}
      {activeBackend === 'OLLAMA' ? (
        <div className="relative flex items-center text-[10px] font-mono text-[var(--primary-color)] shrink-0">
          <select
            value={selectedOllamaModel}
            onChange={e => { onSetOllamaModel(e.target.value); localStorage.setItem('ollama_model', e.target.value) }}
            className="appearance-none bg-transparent pr-4 focus:outline-none cursor-pointer"
            disabled={ollamaStatus !== 'online' || ollamaModels.length === 0}
          >
            {ollamaModels.length === 0 ? (
              <option value="" className="bg-[#0f172a]">(No models)</option>
            ) : (
              ollamaModels.map(m => <option key={m.name} value={m.name} className="bg-[#0f172a]">{m.name}</option>)
            )}
          </select>
          <span className="material-symbols-outlined absolute right-0 text-[13px] pointer-events-none">expand_more</span>
        </div>
      ) : (
        <div
          className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-[rgba(var(--primary-rgb),0.1)] border border-[rgba(var(--primary-rgb),0.25)] text-[9.5px] font-mono text-[var(--primary-color)] shrink-0"
          title={`Auto-Synced Model: ${activeModelBadge}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="truncate max-w-[100px]">{activeModelBadge}</span>
        </div>
      )}

      {/* Persona Selector (Defaults to 💬 Chat) */}
      <div className="relative flex items-center bg-white/5 rounded-full px-2 py-0.5 border border-white/5 shrink-0">
        <select
          value={assistantPersona}
          onChange={e => onSetPersona && onSetPersona(e.target.value)}
          className="appearance-none bg-transparent text-[var(--primary-color)] text-[10.5px] font-semibold pr-3.5 py-0.5 focus:outline-none cursor-pointer"
          title="Chat Mode"
        >
          {PERSONAS.map(p => (
            <option key={p.id} value={p.id} className="bg-[#0f172a] text-white">
              {p.label}
            </option>
          ))}
        </select>
        <span className="material-symbols-outlined absolute right-1 text-[13px] text-[var(--primary-color)]/70 pointer-events-none">expand_more</span>
      </div>

      {/* 1-Tap Incognito Toggle Pill */}
      {onToggleIncognito && (
        <button
          type="button"
          onClick={onToggleIncognito}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold transition-all active:scale-95 shrink-0 border ${
            isPrivateSession
              ? 'bg-purple-500/25 border-purple-400/60 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.4)]'
              : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
          }`}
          title="Toggle Incognito Mode (Chats & Searches Are Not Saved)"
        >
          <span className="material-symbols-outlined text-[13px]">{isPrivateSession ? 'visibility_off' : 'shield_person'}</span>
          <span>{isPrivateSession ? 'INCOGNITO ON' : 'INCOGNITO'}</span>
        </button>
      )}

      {/* New Chat Button */}
      <button
        type="button"
        onClick={onNewChat}
        className="w-7 h-7 rounded-full bg-[rgba(var(--primary-rgb),0.12)] border border-[rgba(var(--primary-rgb),0.25)] text-[var(--primary-color)] hover:bg-[rgba(var(--primary-rgb),0.22)] active:scale-90 transition-all flex items-center justify-center shrink-0"
        title="Start New Chat"
      >
        <span className="material-symbols-outlined text-[15px]">edit_square</span>
      </button>
    </div>
  )
}
