import { useState } from 'react'

const DEFAULT_WIDGETS = [
  { id: 'performance', label: 'Kernel Performance Metrics', icon: 'memory' },
  { id: 'weather', label: 'Weather Forecast Node', icon: 'cloud' },
  { id: 'stocks', label: 'Stock & Crypto Candlestick Cores', icon: 'show_chart' },
  { id: 'media', label: 'Sonic & System Media Player', icon: 'graphic_eq' },
  { id: 'tasks', label: 'Day Tasks Manager', icon: 'checklist' },
  { id: 'clock', label: 'Digital Clock', icon: 'schedule' },
  { id: 'analog_clock', label: 'Analog Clock', icon: 'watch' },
  { id: 'calendar', label: 'Calendar Widget', icon: 'calendar_month' },
  { id: 'battery', label: 'Battery Monitor', icon: 'battery_charging_full' },
  { id: 'notes', label: 'Quick Notes', icon: 'edit_note' },
  { id: 'ping', label: 'Ping Network Speedometer', icon: 'network_ping' },
  { id: 'signal', label: 'Dense Signal Telemetry', icon: 'signal_cellular_alt' }
]

export default function WidgetConfig({
  activeWidgetIds,
  customWidgets,
  onAddWidget,
  onRemoveWidget,
  onCreateCustomWidget,
  onAddSpacer,
  isEditMode,
  setIsEditMode,
  onResetLayout
}) {
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [customTitle, setCustomTitle] = useState('')
  const [customIcon, setCustomIcon] = useState('widgets')
  const [customContent, setCustomContent] = useState('')

  const allAvailableWidgets = [
    ...DEFAULT_WIDGETS,
    ...customWidgets.map(w => ({ id: w.id, label: `Custom: ${w.label}`, icon: w.icon || 'widgets' }))
  ]

  const handleCreate = (e) => {
    e.preventDefault()
    if (!customTitle.trim()) return
    onCreateCustomWidget({
      id: 'custom_' + Date.now(),
      label: customTitle.trim(),
      icon: customIcon || 'widgets',
      content: customContent.trim() || 'Custom operational node loaded successfully.'
    })
    setCustomTitle('')
    setCustomContent('')
  }

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* Top Action Controls Bar */}
      <div className="flex items-center justify-between gap-2 w-full max-w-4xl px-1">
        {/* Customize / Workshop Toggle */}
        <button
          onClick={() => setIsConfigOpen(!isConfigOpen)}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/[0.08] transition-all duration-300 cursor-pointer active:scale-95 text-primary-fixed-dim"
          style={{
            background: isConfigOpen ? 'rgba(12, 16, 28, 0.85)' : 'rgba(12, 16, 28, 0.6)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
          }}
        >
          <span className="material-symbols-outlined text-xs animate-pulse">space_dashboard</span>
          <span className="font-label-caps text-[9px] tracking-[0.1em] font-semibold">
            {isConfigOpen ? 'CLOSE WORKSHOP' : 'WIDGET WORKSHOP'}
          </span>
          <span className="material-symbols-outlined text-xs text-white/40 transition-transform duration-300" style={{ transform: isConfigOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            expand_more
          </span>
        </button>

        {/* Quick Edit Mode & Spacer Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onAddSpacer}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 text-[8.5px] font-mono font-semibold transition-all active:scale-95"
            title="Add Empty Space / Spacer to grid"
          >
            <span className="material-symbols-outlined text-[11px]">add_box</span>
            <span>+ EMPTY SPACE</span>
          </button>

          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-[8.5px] font-mono font-semibold transition-all active:scale-95 ${
              isEditMode
                ? 'bg-amber-500/20 border-amber-400/60 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.25)]'
                : 'bg-black/40 border-white/10 text-white/70 hover:text-white hover:border-white/20'
            }`}
          >
            <span className="material-symbols-outlined text-[11px]">{isEditMode ? 'lock_open' : 'tune'}</span>
            <span>{isEditMode ? 'DONE EDITING' : 'EDIT LAYOUT'}</span>
          </button>
        </div>
      </div>

      {/* Workshop Drawer */}
      {isConfigOpen && (
        <div
          className="w-full glass-surface rounded-2xl p-4 text-xs font-mono-data space-y-4 border border-white/[0.06] animate-in fade-in zoom-in-95 duration-200"
          style={{
            background: 'rgba(12, 16, 28, 0.75)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)',
          }}
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <p className="text-[8px] font-bold text-primary-fixed-dim uppercase tracking-wider">MOUNT / UNMOUNT DASHBOARD NODES</p>
            <button
              onClick={onResetLayout}
              className="text-[8px] text-white/40 hover:text-red-400 font-mono tracking-wider flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-[10px]">restart_alt</span>
              RESET LAYOUT
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {allAvailableWidgets.map(w => {
              const isActive = activeWidgetIds.includes(w.id)
              return (
                <button
                  key={w.id}
                  onClick={() => isActive ? onRemoveWidget(w.id) : onAddWidget(w.id)}
                  className={`px-2 py-2 rounded-xl border text-[9px] text-left transition-all truncate flex items-center justify-between ${
                    isActive
                      ? 'bg-primary-fixed-dim/15 border-primary-fixed-dim/40 text-primary-fixed-dim shadow-[0_0_8px_rgba(var(--primary-rgb),0.15)]'
                      : 'bg-black/30 border-white/10 text-white/50 hover:text-white hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="material-symbols-outlined text-xs opacity-70">{w.icon}</span>
                    <span className="truncate">{w.label}</span>
                  </div>
                  <span className="material-symbols-outlined text-[11px] ml-1 flex-shrink-0">
                    {isActive ? 'check_circle' : 'add_circle'}
                  </span>
                </button>
              )
            })}
          </div>

          <form onSubmit={handleCreate} className="bg-black/30 p-3 rounded-xl border border-white/5 space-y-2.5">
            <p className="text-[8px] font-bold text-primary-fixed-dim uppercase flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">rocket_launch</span>ESTABLISH NEW CUSTOM NODE
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                required
                value={customTitle}
                onChange={e => setCustomTitle(e.target.value)}
                placeholder="WIDGET TITLE..."
                className="bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-primary-fixed-dim focus:outline-none focus:border-primary-fixed-dim placeholder:text-white/30 font-mono-data"
              />
              <select
                value={customIcon}
                onChange={e => setCustomIcon(e.target.value)}
                className="bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-primary-fixed-dim pr-6 focus:outline-none cursor-pointer font-mono-data"
              >
                <option value="widgets">Default Widgets</option>
                <option value="shield">Security Shield</option>
                <option value="bolt">Power Bolt</option>
                <option value="star">Glowing Star</option>
                <option value="monitoring">Activity Heartbeat</option>
              </select>
            </div>
            <textarea
              value={customContent}
              onChange={e => setCustomContent(e.target.value)}
              placeholder="DYNAMIC TELEMETRY CONTENT LOGS..."
              className="w-full h-12 bg-black/50 border border-white/10 rounded-lg p-2 text-[10px] text-primary-fixed-dim focus:outline-none focus:border-primary-fixed-dim placeholder:text-white/30 font-mono-data"
            />
            <button
              type="submit"
              className="w-full py-1.5 bg-primary-fixed-dim/20 border border-primary-fixed-dim/40 text-primary-fixed-dim text-[9.5px] font-bold rounded-lg hover:bg-primary-fixed-dim/30 transition-all active:scale-[0.98] uppercase"
            >
              ESTABLISH CORE WIDGET
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
