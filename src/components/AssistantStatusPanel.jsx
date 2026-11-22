import React from 'react'
import { useAppStore } from '../stores/appStore'
import { useAIStore } from '../stores/aiStore'
import { useAssistantStore } from '../stores/assistantStore'

export default function AssistantStatusPanel({ statusText, isListening, isProcessing, onRetry, onClose }) {
  const displayText = statusText || (isListening ? 'Listening...' : isProcessing ? 'Thinking...' : 'Tap to speak')
  const isRetryable = /try again|microphon|didn't catch|tap to speak|starting/i.test(displayText)
  const { llmBackend } = useAIStore()
  const { assistantPersona, isPrivateSession } = useAssistantStore()

  const handleOpenFullAssistant = (e) => {
    e.stopPropagation()
    if (typeof onClose === 'function') onClose()
    useAppStore.getState().setActivePage('assistant')
  }

  return (
    <div className="fixed top-[88px] left-1/2 -translate-x-1/2 z-50 pointer-events-none flex justify-center w-full px-4 animate-in fade-in slide-in-from-top-3 duration-300">
      <div
        onClick={() => { if (typeof onRetry === 'function') onRetry() }}
        className={`pointer-events-auto max-w-[92vw] sm:max-w-md max-h-[260px] overflow-y-auto custom-scrollbar px-4 py-3 rounded-2xl bg-slate-950/94 backdrop-blur-2xl border transition-all duration-300 shadow-[0_10px_35px_rgba(0,0,0,0.85),0_0_22px_rgba(0,242,255,0.25)] flex items-center gap-3 cursor-pointer active:scale-95 ${
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
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[8px] font-mono font-bold tracking-wider uppercase text-cyan-400/80">
              {`IRIS // ${llmBackend} · ${assistantPersona || 'CHAT'}`}
            </span>
            {isPrivateSession && (
              <span className="text-[7px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300">
                INCOGNITO
              </span>
            )}
          </div>
          <p className="text-slate-100 text-xs font-medium leading-relaxed tracking-wide select-none">
            {displayText}
          </p>
          {isRetryable && (
            <p className="text-[9px] text-cyan-400/80 font-mono tracking-wider uppercase mt-0.5">
              [ TAP TO LISTEN ]
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleOpenFullAssistant}
          className="px-2 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-300 font-mono text-[8px] font-bold uppercase tracking-wider flex items-center gap-0.5 shrink-0"
        >
          <span>IRIS AI</span>
          <span className="material-symbols-outlined text-[10px]">north_east</span>
        </button>
      </div>
    </div>
  )
}
