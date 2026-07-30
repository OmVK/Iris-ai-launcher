import React from 'react'

export default function AssistantStatusPanel({ statusText, canvasRef }) {
  const isPlaceholder = !statusText || /^(?:listening|starting|starting\.\.\.|i'm listening\.\.\.|tap to speak|microphon access required)$/i.test(statusText.trim())

  if (isPlaceholder) return null

  return (
    <div className="fixed top-[75px] left-1/2 -translate-x-1/2 z-50 flex flex-col items-center pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-top-2">
      <div className="pointer-events-auto max-w-[88vw] sm:max-w-md max-h-[300px] overflow-y-auto custom-scrollbar px-5 py-3 rounded-2xl bg-slate-950/85 backdrop-blur-2xl border border-purple-500/30 shadow-[0_10px_35px_rgba(0,0,0,0.6),0_0_20px_rgba(168,85,247,0.2)]">
        <p className="text-center text-slate-100 text-sm font-medium leading-relaxed tracking-wide select-none">
          {statusText}
        </p>
      </div>
    </div>
  )
}
