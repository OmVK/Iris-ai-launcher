export default function PinKeypad({ onKeyPress, onBackspace, onClear }) {
  return (
    <div className="grid grid-cols-3 gap-2.5 w-full max-w-[280px] mb-4">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
        <button
          key={num}
          type="button"
          onClick={() => onKeyPress(String(num))}
          className="h-10 rounded-lg border border-primary-fixed-dim/20 bg-surface-container/20 font-mono-data font-bold text-xs text-white flex items-center justify-center hover:bg-primary-fixed-dim/10 hover:border-primary-fixed-dim/50 hover:shadow-[0_0_12px_rgba(var(--primary-rgb),0.25)] active:scale-90 transition-all select-none"
        >
          {num}
        </button>
      ))}

      <button
        type="button"
        onClick={onClear}
        className="h-10 rounded-lg border border-outline-variant/30 bg-surface-container/10 font-label-caps text-[9px] text-on-surface-variant/60 hover:text-white flex items-center justify-center hover:bg-white/5 active:scale-90 transition-all select-none"
      >
        CLR
      </button>

      <button
        type="button"
        onClick={() => onKeyPress('0')}
        className="h-10 rounded-lg border border-primary-fixed-dim/20 bg-surface-container/20 font-mono-data font-bold text-xs text-white flex items-center justify-center hover:bg-primary-fixed-dim/10 hover:border-primary-fixed-dim/50 hover:shadow-[0_0_12px_rgba(var(--primary-rgb),0.25)] active:scale-90 transition-all select-none"
      >
        0
      </button>

      <button
        type="button"
        onClick={onBackspace}
        className="h-10 rounded-lg border border-outline-variant/30 bg-surface-container/10 font-mono-data text-white flex items-center justify-center hover:bg-white/5 active:scale-90 transition-all select-none"
      >
        <span className="material-symbols-outlined text-sm">backspace</span>
      </button>
    </div>
  )
}
