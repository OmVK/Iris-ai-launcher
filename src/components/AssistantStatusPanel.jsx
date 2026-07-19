import React from 'react'

export default function AssistantStatusPanel({ statusText, canvasRef, isListening, isProcessing }) {
  return (
    <div className={`relative z-10 flex flex-col items-center gap-6 mt-64 transition-all duration-500`}>
      <canvas ref={canvasRef} width={220} height={44} className="w-[220px] h-[44px] opacity-80" />
      {statusText ? (
        <div className="max-w-sm max-h-[350px] overflow-y-auto custom-scrollbar px-6 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
          <p className="text-center text-white/90 text-sm font-medium leading-relaxed tracking-wide">
            {statusText}
          </p>
        </div>
      ) : (
        <p className="text-white/40 text-xs uppercase tracking-[0.2em]">Tap the orb to speak</p>
      )}
    </div>
  )
}
