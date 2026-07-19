import { useState } from 'react'

export default function ChatMessage({ msg, index, chatUnlocked, onDelete }) {
  const [isSelected, setIsSelected] = useState(false)
  const isIris = msg.sender === 'IRIS'
  let color = 'text-on-surface'
  if (msg.type === 'error') color = 'text-error font-bold'

  return (
    <div onClick={() => setIsSelected(!isSelected)} className={`group flex gap-2 relative cursor-pointer ${msg.loading ? 'animate-pulse' : ''} ${!chatUnlocked ? 'opacity-10 blur-md select-none' : ''}`}>
      <span className="text-on-surface-variant/40 shrink-0">[{msg.time}]</span>
      <span className={`font-bold shrink-0 ${isIris ? 'text-primary-container' : 'text-[#c6c5d4]'}`}>[{msg.sender}]</span>
      <span className={`flex-1 break-words ${isIris ? color : 'text-[#dfe2ef]/85'}`}>{msg.text}</span>
      <div className={`${isSelected ? 'opacity-100 visible' : 'opacity-0 invisible'} md:group-hover:opacity-100 md:group-hover:visible transition-all absolute right-0 -top-4 bg-black/90 border border-[#00f2ff]/30 rounded-md shadow-[0_0_15px_rgba(0,0,0,0.8)] flex items-center p-1.5 gap-2 z-10 backdrop-blur-md`}>
        <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(msg.text); setIsSelected(false) }}
          className="p-1 hover:bg-[#00f2ff]/20 rounded text-[#00f2ff] transition-colors" title="Copy">
          <span className="material-symbols-outlined text-[16px]">content_copy</span>
        </button>
        <button onClick={(e) => { e.stopPropagation(); navigator.share ? navigator.share({ title: 'Chat with IRIS', text: msg.text }).catch(console.error) : navigator.clipboard.writeText(msg.text); setIsSelected(false) }}
          className="p-1 hover:bg-[#00f2ff]/20 rounded text-[#00f2ff] transition-colors" title="Share">
          <span className="material-symbols-outlined text-[16px]">share</span>
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(index); setIsSelected(false) }}
          className="p-1 hover:bg-error/20 rounded text-error transition-colors" title="Delete">
          <span className="material-symbols-outlined text-[16px]">delete</span>
        </button>
      </div>
    </div>
  )
}
