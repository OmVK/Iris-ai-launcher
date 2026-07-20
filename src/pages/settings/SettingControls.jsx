export function SettingToggle({ label, sublabel, icon, value, onChange }) {
  return (
    <div className="flex items-center justify-between pt-3 border-t border-white/5 group">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center border border-white/5">
          <span className="material-symbols-outlined text-primary-fixed-dim text-sm">{icon}</span>
        </div>
        <div>
          <p className="font-mono-data text-[10px]">{label}</p>
          {sublabel && <p className="font-label-caps text-[7.5px] text-on-surface-variant/40">{sublabel}</p>}
        </div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`w-8 h-4.5 rounded-full relative transition-colors ${value ? 'bg-primary-fixed-dim/40' : 'bg-white/10'}`}
      >
        <div className={`absolute top-[2px] w-3.5 h-3.5 rounded-full bg-white transition-all ${value ? 'right-[2px]' : 'left-[2px]'}`} />
      </button>
    </div>
  )
}

export function SettingSlider({ label, value, onChange, min, max, step, unit, description }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-[10px]">
        <span>{label}</span>
        <span className="text-primary-fixed-dim font-bold">{value}{unit || ''}</span>
      </div>
      <input
        type="range"
        value={value}
        onChange={e => onChange(step ? parseFloat(e.target.value) : parseInt(e.target.value))}
        className="w-full cyber-slider"
        max={max}
        min={min}
        step={step}
      />
      {description && <p className="text-[7px] text-on-surface-variant/45">{description}</p>}
    </div>
  )
}

const GRID_COL_CLASSES = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
}

export function SettingOptionGrid({ options, value, onChange, columns = 3 }) {
  return (
    <div className={`grid ${GRID_COL_CLASSES[columns] || 'grid-cols-3'} gap-2`}>
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`p-2 rounded border text-[9.5px] font-bold flex items-center gap-1.5 transition-all active:scale-95 ${
            value === opt.id
              ? 'bg-primary-fixed-dim/15 border-primary-fixed-dim text-primary-fixed-dim shadow-[0_0_8px_rgba(var(--primary-rgb),0.2)]'
              : 'bg-black/20 border-outline-variant/30 text-on-surface-variant/70 hover:text-white'
          }`}
        >
          {opt.color && (
            <span className="w-2.5 h-2.5 rounded-full block border border-white/10" style={{ backgroundColor: opt.color, boxShadow: `0 0 6px ${opt.color}` }} />
          )}
          {opt.icon && <span className="material-symbols-outlined text-[10px] text-primary-fixed-dim">{opt.icon}</span>}
          {opt.label}
        </button>
      ))}
    </div>
  )
}
