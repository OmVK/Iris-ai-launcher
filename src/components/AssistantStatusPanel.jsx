import React from 'react'

export default function AssistantStatusPanel({ statusText, isListening, isProcessing, onRetry }) {
  const displayText = statusText || (isListening ? 'Listening...' : isProcessing ? 'Thinking...' : 'Tap to speak')
  const isRetryable = /try again|microphon|didn't catch|tap to speak|starting/i.test(displayText)

  return (
    <div className="fixed top-[88px] left-1/2 -translate-x-1/2 z-50 pointer-events-none flex justify-center w-full px-4 animate-in fade-in slide-in-from-top-3 duration-300">
      <div 
        onClick={() => { if (typeof onRetry === 'function') onRetry() }}
        className={`pointer-events-auto max-w-[90vw] sm:max-w-md max-h-[250px] overflow-y-auto custom-scrollbar px-5 py-3 rounded-2xl bg-slate-950/92 backdrop-blur-2xl border transition-all duration-300 shadow-[0_10px_35px_rgba(0,0,0,0.8),0_0_20px_rgba(0,242,255,0.25)] flex items-center gap-3 cursor-pointer active:scale-95 ${
          isListening
            ? 'border-cyan-400/60 shadow-[0_0_25px_rgba(0,242,255,0.4)]'
            : isProcessing
            ? 'border-purple-500/60 shadow-[0_0_25px_rgba(168,85,247,0.4)]'
            : 'border-white/20 hover:border-cyan-400/40'
        }`}
      >
        <div className="relative flex items-center justify-center w-5 h-5 flex-shrink-0">
          {isListening ? (
            <>
              <span className="absolute inset-0 rounded-full bg-cyan-400/40 animate-ping" />
              <span className="material-symbols-outlined text-cyan-400 text-base animate-pulse">mic</span>
            </>
          ) : isProcessing ? (
            <span className="material-symbols-outlined text-purple-400 text-base animate-spin">progress_activity</span>
          ) : (
            <span className="material-symbols-outlined text-cyan-300 text-base">mic_none</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-slate-100 text-xs font-medium leading-relaxed tracking-wide select-none">
            {displayText}
          </p>
          {isRetryable && (
            <p className="text-[9px] text-cyan-400/80 font-mono tracking-wider uppercase mt-0.5">
              [ TAP TO LISTEN ]
            </p>
          )}
        </div>

        {isRetryable && (
          <span className="material-symbols-outlined text-cyan-400 text-xs animate-pulse flex-shrink-0">refresh</span>
        )}
      </div>
    </div>
  )
}

