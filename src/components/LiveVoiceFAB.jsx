export default function LiveVoiceFAB({ isListening, onClick }) {
  return (
    <button onClick={onClick} className="fixed bottom-24 right-6 z-40 w-12 h-12 rounded-full glass-surface border border-primary-fixed-dim/40 flex items-center justify-center shadow-[0_0_20px_rgba(0,242,255,0.3)] hover:shadow-[0_0_30px_rgba(0,242,255,0.6)] hover:border-primary-fixed-dim active:scale-95 transition-all group" style={{ background: 'rgba(10, 14, 23, 0.75)' }}>
      <div className="absolute inset-0 rounded-full border border-primary-fixed-dim/20 animate-ping opacity-60 pointer-events-none" />
      <span className="material-symbols-outlined text-primary-fixed-dim animate-pulse text-xl">{isListening ? 'graphic_eq' : 'settings_voice'}</span>
    </button>
  )
}
