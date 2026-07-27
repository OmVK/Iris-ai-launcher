import ProviderBadge from '../../components/ProviderBadge'
import { logNotification } from '../../components/LauncherPlugin'

export default function EngineModelBar({ activeBackend, onSetBackend, selectedOllamaModel, onSetOllamaModel, ollamaModels, ollamaStatus, activeGeminiModel, onSetGeminiModel, dynamicGeminiModels, activeGroqModel, onSetGroqModel, dynamicGroqModels, activeNvidiaModel, onSetNvidiaModel, dynamicNvidiaModels, onFetchOllamaModels, onNewChat, backendStatus }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-black/20 backdrop-blur-xl border border-white/10 rounded-full shadow-lg">
      
      <div className="flex items-center bg-white/5 rounded-full px-2 py-1">
        <ProviderBadge backend={activeBackend} showLabel={false} />
        <select value={activeBackend} onChange={e => { onSetBackend(e.target.value); if (e.target.value === 'OLLAMA') onFetchOllamaModels() }}
          className="appearance-none bg-transparent text-white/90 text-[11px] font-medium px-2 py-0.5 focus:outline-none cursor-pointer">
          <option value="OLLAMA" className="bg-[#1e293b]">Local Ollama</option>
          <option value="ONDEVICE" className="bg-[#1e293b]">Gemini Nano</option>
          <option value="GEMINI" className="bg-[#1e293b]">Google Gemini</option>
          <option value="GROQ" className="bg-[#1e293b]">Groq LPU</option>
          <option value="NVIDIA" className="bg-[#1e293b]">NVIDIA NIM</option>
        </select>
        <span className="material-symbols-outlined text-[14px] text-white/50 pointer-events-none -ml-1">expand_more</span>
      </div>

      <div className="w-[1px] h-4 bg-white/10 mx-1"></div>

      <div className="flex items-center text-[11px] font-medium text-[rgba(var(--primary-rgb),0.8)]">
        {activeBackend === 'OLLAMA' && (
          <div className="relative flex items-center">
            <select value={selectedOllamaModel} onChange={e => { onSetOllamaModel(e.target.value); localStorage.setItem('ollama_model', e.target.value) }}
              className="appearance-none bg-transparent pr-5 focus:outline-none cursor-pointer" disabled={ollamaStatus !== 'online' || ollamaModels.length === 0}>
              {ollamaModels.length === 0 ? <option value="" className="bg-[#1e293b]">(No models found)</option> : ollamaModels.map(m => <option key={m.name} value={m.name} className="bg-[#1e293b]">{m.name}</option>)}
            </select>
            <span className="material-symbols-outlined absolute right-0 text-[14px] pointer-events-none">expand_more</span>
          </div>
        )}
        {activeBackend === 'GEMINI' && (
          <div className="relative flex items-center">
            <select value={activeGeminiModel} onChange={e => { onSetGeminiModel(e.target.value); logNotification('MODEL', `Selected: ${e.target.value}`, 'success') }}
              className="appearance-none bg-transparent pr-5 focus:outline-none cursor-pointer">
              {dynamicGeminiModels.length > 0 ? dynamicGeminiModels.map(m => <option key={m} value={m} className="bg-[#1e293b]">{m}</option>) : (<>
                <option value="gemini-1.5-flash" className="bg-[#1e293b]">1.5 Flash</option>
                <option value="gemini-1.5-pro" className="bg-[#1e293b]">1.5 Pro</option>
                <option value="gemini-2.5-flash" className="bg-[#1e293b]">2.5 Flash</option>
                <option value="gemini-pro" className="bg-[#1e293b]">Gemini Pro</option>
              </>)}
            </select>
            <span className="material-symbols-outlined absolute right-0 text-[14px] pointer-events-none">expand_more</span>
          </div>
        )}
        {activeBackend === 'GROQ' && (
          <div className="relative flex items-center">
            <select value={activeGroqModel} onChange={e => { onSetGroqModel(e.target.value); localStorage.setItem('groq_model', e.target.value) }}
              className="appearance-none bg-transparent pr-5 focus:outline-none cursor-pointer">
              {dynamicGroqModels.length > 0 ? dynamicGroqModels.map(m => <option key={m} value={m} className="bg-[#1e293b]">{m}</option>) : (<>
                <option value="llama-3.3-70b-versatile" className="bg-[#1e293b]">Llama 3.3 70B</option>
                <option value="llama-3.2-3b-preview" className="bg-[#1e293b]">Llama 3.2 3B</option>
                <option value="llama-3.2-1b-preview" className="bg-[#1e293b]">Llama 3.2 1B</option>
                <option value="mixtral-8x7b-32768" className="bg-[#1e293b]">Mixtral 8x7B</option>
              </>)}
            </select>
            <span className="material-symbols-outlined absolute right-0 text-[14px] pointer-events-none">expand_more</span>
          </div>
        )}
        {activeBackend === 'NVIDIA' && (
          <div className="relative flex items-center">
            <select value={activeNvidiaModel} onChange={e => { onSetNvidiaModel(e.target.value); localStorage.setItem('nvidia_model', e.target.value) }}
              className="appearance-none bg-transparent pr-5 focus:outline-none cursor-pointer">
              {dynamicNvidiaModels.length > 0 ? dynamicNvidiaModels.map(m => <option key={m} value={m} className="bg-[#1e293b]">{m}</option>) : (<>
                <option value="meta/llama-3.1-70b-instruct" className="bg-[#1e293b]">Llama 3.1 70B</option>
                <option value="meta/llama-3.1-405b-instruct" className="bg-[#1e293b]">Llama 3.1 405B</option>
              </>)}
            </select>
            <span className="material-symbols-outlined absolute right-0 text-[14px] pointer-events-none">expand_more</span>
          </div>
        )}
        {activeBackend === 'ONDEVICE' && (
          <span className="px-1">Nano On-Device</span>
        )}
      </div>

      <button onClick={onNewChat}
        className="ml-2 w-7 h-7 rounded-full bg-[rgba(var(--primary-rgb),0.1)] border border-[rgba(var(--primary-rgb),0.2)] text-[var(--primary-color)] hover:bg-[rgba(var(--primary-rgb),0.2)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center" title="New Chat">
        <span className="material-symbols-outlined text-[16px]">edit_square</span>
      </button>
    </div>
  )
}
