import ProviderBadge from '../../components/ProviderBadge'

export default function EngineModelBar({ activeBackend, onSetBackend, selectedOllamaModel, onSetOllamaModel, ollamaModels, ollamaStatus, activeGeminiModel, onSetGeminiModel, dynamicGeminiModels, activeGroqModel, onSetGroqModel, dynamicGroqModels, activeNvidiaModel, onSetNvidiaModel, dynamicNvidiaModels, onFetchOllamaModels, onNewChat, backendStatus }) {
  return (
    <div className="w-full max-w-lg px-4 py-1.5 glass-surface border border-outline-variant/20 rounded-xl flex items-center justify-between gap-4 font-mono-data text-[9px] mx-auto">
      <div className="flex items-center gap-1.5 flex-1">
        <span className="text-on-surface-variant/50 uppercase text-[8px] shrink-0">ENGINE:</span>
        <div className="relative w-full">
          <select value={activeBackend} onChange={e => { onSetBackend(e.target.value); if (e.target.value === 'OLLAMA') onFetchOllamaModels() }}
            className="w-full appearance-none bg-black/40 border border-outline-variant/30 rounded pl-1.5 pr-5 py-0.5 text-[#00f2ff] focus:outline-none focus:border-[#00f2ff] cursor-pointer font-mono-data">
            <option value="OLLAMA">Local Ollama Server</option>
            <option value="ONDEVICE">Gemini Nano (On-Device)</option>
            <option value="GEMINI">Google Gemini API</option>
            <option value="GROQ">Groq LPU (Cloud)</option>
            <option value="NVIDIA">NVIDIA NIM Engine</option>
          </select>
          <span className="material-symbols-outlined absolute right-1 top-1/2 -translate-y-1/2 text-[12px] pointer-events-none text-[#00f2ff]/60">expand_more</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <ProviderBadge backend={activeBackend} showLabel={false} />
      </div>

      <div className="flex items-center gap-1.5 flex-1">
        <span className="text-on-surface-variant/50 uppercase text-[8px] shrink-0">MODEL:</span>
        {activeBackend === 'OLLAMA' && (
          <div className="relative w-full">
            <select value={selectedOllamaModel} onChange={e => { onSetOllamaModel(e.target.value); localStorage.setItem('ollama_model', e.target.value) }}
              className="w-full appearance-none bg-black/40 border border-outline-variant/30 rounded pl-1.5 pr-5 py-0.5 text-[#00f2ff] focus:outline-none focus:border-[#00f2ff] cursor-pointer" disabled={ollamaStatus !== 'online' || ollamaModels.length === 0}>
              {ollamaModels.length === 0 ? <option value="">(No models found)</option> : ollamaModels.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
            </select>
            <span className="material-symbols-outlined absolute right-1 top-1/2 -translate-y-1/2 text-[12px] pointer-events-none text-[#00f2ff]/60">expand_more</span>
          </div>
        )}
        {activeBackend === 'GEMINI' && (
          <div className="relative w-full">
            <select value={activeGeminiModel} onChange={e => { onSetGeminiModel(e.target.value); alert(`Model Saved!\n\nSelected: ${e.target.value}`) }}
              className="w-full appearance-none bg-black/40 border border-outline-variant/30 rounded pl-1.5 pr-5 py-0.5 text-[#ff007f] focus:outline-none focus:border-[#ff007f] cursor-pointer">
              {dynamicGeminiModels.length > 0 ? dynamicGeminiModels.map(m => <option key={m} value={m}>{m}</option>) : (<>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Standard)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Advanced)</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Next-Gen)</option>
                <option value="gemini-pro">Gemini Pro (Legacy)</option>
              </>)}
            </select>
            <span className="material-symbols-outlined absolute right-1 top-1/2 -translate-y-1/2 text-[12px] pointer-events-none text-[#ff007f]/60">expand_more</span>
          </div>
        )}
        {activeBackend === 'GROQ' && (
          <div className="relative w-full">
            <select value={activeGroqModel} onChange={e => { onSetGroqModel(e.target.value); localStorage.setItem('groq_model', e.target.value) }}
              className="w-full appearance-none bg-black/40 border border-outline-variant/30 rounded pl-1.5 pr-5 py-0.5 text-[#39ff14] focus:outline-none focus:border-[#39ff14] cursor-pointer font-mono-data">
              {dynamicGroqModels.length > 0 ? dynamicGroqModels.map(m => <option key={m} value={m}>{m}</option>) : (<>
                <option value="llama-3.3-70b-versatile">Llama 3.3 70B (High-End)</option>
                <option value="llama-3.2-3b-preview">Llama 3.2 3B (Fast)</option>
                <option value="llama-3.2-1b-preview">Llama 3.2 1B (Light)</option>
                <option value="llama3-8b-8192">Llama 3 8B (Legacy)</option>
                <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
                <option value="gemma2-9b-it">Gemma 2 9B (Google)</option>
              </>)}
            </select>
            <span className="material-symbols-outlined absolute right-1 top-1/2 -translate-y-1/2 text-[12px] pointer-events-none text-[#39ff14]/60">expand_more</span>
          </div>
        )}
        {activeBackend === 'NVIDIA' && (
          <div className="relative w-full">
            <select value={activeNvidiaModel} onChange={e => { onSetNvidiaModel(e.target.value); localStorage.setItem('nvidia_model', e.target.value) }}
              className="w-full appearance-none bg-black/40 border border-outline-variant/30 rounded pl-1.5 pr-5 py-0.5 text-[#76b900] focus:outline-none focus:border-[#76b900] cursor-pointer font-mono-data">
              {dynamicNvidiaModels.length > 0 ? dynamicNvidiaModels.map(m => <option key={m} value={m}>{m}</option>) : (<>
                <option value="meta/llama-3.1-70b-instruct">Llama 3.1 70B (Instruct)</option>
                <option value="meta/llama-3.1-405b-instruct">Llama 3.1 405B (Heavy)</option>
                <option value="meta/llama-3.1-8b-instruct">Llama 3.1 8B (Fast)</option>
                <option value="mistralai/mixtral-8x22b-instruct-v0.1">Mixtral 8x22B (MoE)</option>
              </>)}
            </select>
            <span className="material-symbols-outlined absolute right-1 top-1/2 -translate-y-1/2 text-[12px] pointer-events-none text-[#76b900]/60">expand_more</span>
          </div>
        )}
        {activeBackend === 'ONDEVICE' && (
          <div className="w-full bg-black/40 border border-outline-variant/30 rounded px-1.5 py-0.5 text-[#00f2ff] font-mono-data text-[9px]">
            Gemini Nano (On-Device)
          </div>
        )}
      </div>

      <button onClick={onNewChat}
        className="px-2.5 py-1 rounded border border-outline-variant/30 text-on-surface-variant/60 hover:text-white hover:border-[#00f2ff]/50 hover:bg-[#00f2ff]/10 transition-all shrink-0 flex items-center gap-1 active:scale-95" title="New Chat">
        <span className="material-symbols-outlined text-[12px]">add_comment</span>
        <span className="text-[8px] uppercase font-bold hidden sm:inline">NEW</span>
      </button>
    </div>
  )
}
