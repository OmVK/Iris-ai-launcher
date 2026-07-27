import { useState } from 'react'

export default function ChatMessage({ msg, index, chatUnlocked, onDelete }) {
  const [isSelected, setIsSelected] = useState(false)
  const isIris = msg.sender === 'IRIS'
  const isError = msg.type === 'error'

  return (
    <div className={`w-full flex ${isIris ? 'justify-start' : 'justify-end'} mb-4 animate-in slide-in-from-bottom-2 fade-in duration-300 ${!chatUnlocked ? 'opacity-10 blur-md select-none' : ''}`}>
      <div 
        onClick={() => setIsSelected(!isSelected)}
        className={`group relative max-w-[85%] flex flex-col gap-1 cursor-pointer`}
      >
        <div className={`flex items-end gap-2 ${isIris ? 'flex-row' : 'flex-row-reverse'}`}>
          {isIris && (
            <div className="w-6 h-6 rounded-full bg-[rgba(var(--primary-rgb),0.2)] border border-[rgba(var(--primary-rgb),0.3)] flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(var(--primary-rgb),0.2)]">
              <span className="material-symbols-outlined text-[14px] text-[var(--primary-color)]">smart_toy</span>
            </div>
          )}
          
          <div className={`px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed ${msg.loading ? 'animate-pulse' : ''} ${
            isIris 
              ? (isError ? 'bg-red-500/10 border border-red-500/30 text-red-400 rounded-bl-sm' : 'bg-white/5 border border-white/10 text-white/90 backdrop-blur-md rounded-bl-sm') 
              : 'bg-[rgba(var(--primary-rgb),0.15)] border border-[rgba(var(--primary-rgb),0.3)] text-white shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)] rounded-br-sm'
          }`}>
            <span className="break-words font-sans selectable-text">{msg.text}</span>
          </div>
        </div>
        
        <div className={`text-[9px] uppercase tracking-wider text-white/30 font-medium px-8 ${isIris ? 'text-left' : 'text-right'}`}>
          {msg.time} {msg.loading ? '...' : ''}
        </div>

        {/* Floating Action Menu */}
        <div className={`${isSelected ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95'} md:group-hover:opacity-100 md:group-hover:visible md:group-hover:scale-100 transition-all duration-200 [transition-timing-function:cubic-bezier(0.25,1,0.5,1)] absolute ${isIris ? 'left-8' : 'right-0'} -top-11 bg-[#020617]/90 border border-[rgba(var(--primary-rgb),0.3)] rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.8)] flex items-center p-1 gap-1 z-10 backdrop-blur-xl`}>
          <button onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(msg.text); setIsSelected(false) }}
            className="p-1.5 hover:bg-[rgba(var(--primary-rgb),0.2)] rounded-lg text-[rgba(var(--primary-rgb),0.7)] hover:text-[var(--primary-color)] transition-colors" title="Copy">
            <span className="material-symbols-outlined text-[16px]">content_copy</span>
          </button>
          <button onClick={(e) => { e.stopPropagation(); navigator.share ? navigator.share({ title: 'Chat with IRIS', text: msg.text }).catch(console.error) : navigator.clipboard?.writeText(msg.text); setIsSelected(false) }}
            className="p-1.5 hover:bg-[rgba(var(--primary-rgb),0.2)] rounded-lg text-[rgba(var(--primary-rgb),0.7)] hover:text-[var(--primary-color)] transition-colors" title="Share">
            <span className="material-symbols-outlined text-[16px]">share</span>
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(index); setIsSelected(false) }}
            className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-400/70 hover:text-red-400 transition-colors" title="Delete">
            <span className="material-symbols-outlined text-[16px]">delete</span>
          </button>
        </div>
      </div>
    </div>
  )
}
