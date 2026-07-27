import { useState } from 'react'

const DEFAULT_WIDGETS = [
  { id: 'performance', label: 'Kernel Performance Metrics' },
  { id: 'weather', label: 'Weather Forecast Node' },
  { id: 'stocks', label: 'Stock & Crypto Candlestick Cores' },
  { id: 'media', label: 'Sonic & System Media Player' },
  { id: 'tasks', label: 'Day Tasks Manager' },
  { id: 'clock', label: 'Digital Clock' },
  { id: 'analog_clock', label: 'Analog Clock' },
  { id: 'calendar', label: 'Calendar Widget' },
  { id: 'battery', label: 'Battery Monitor' },
  { id: 'notes', label: 'Quick Notes' },
  { id: 'ping', label: 'Ping Network Speedometer' },
  { id: 'signal', label: 'Dense Signal Telemetry' }
]

export default function WidgetConfig({ activeWidgetIds, customWidgets, onAddWidget, onRemoveWidget, onCreateCustomWidget }) {
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [customTitle, setCustomTitle] = useState('')
  const [customIcon, setCustomIcon] = useState('widgets')
  const [customContent, setCustomContent] = useState('')

  const allAvailableWidgets = [
    ...DEFAULT_WIDGETS,
    ...customWidgets.map(w => ({ id: w.id, label: `Custom: ${w.label}` }))
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
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={() => setIsConfigOpen(!isConfigOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/[0.08] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] cursor-pointer active:scale-95"
        style={{
          background: isConfigOpen ? 'rgba(12, 16, 28, 0.82)' : 'rgba(12, 16, 28, 0.6)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          boxShadow: isConfigOpen
            ? '0 4px 24px rgba(0,0,0,0.4), 0 0 1px rgba(0,229,255,0.15), inset 0 1px 0 rgba(255,255,255,0.04)'
            : '0 2px 12px rgba(0,0,0,0.2)',
          height: isConfigOpen ? 40 : 32,
          width: isConfigOpen ? '100%' : 'auto',
          maxWidth: isConfigOpen ? 400 : 'none',
        }}
      >
        <span className="material-symbols-outlined text-primary-fixed-dim animate-pulse" style={{ fontSize: 14 }}>space_dashboard</span>
        <span className="font-label-caps text-[9px] tracking-[0.12em] text-primary-fixed-dim">
          {isConfigOpen ? 'WIDGET WORKSHOP' : 'CUSTOMIZE DASHBOARD'}
        </span>
        <span className="material-symbols-outlined text-on-surface-variant/40 transition-transform duration-300" style={{ fontSize: 14, transform: isConfigOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          expand_more
        </span>
      </button>

      {isConfigOpen && (
        <div className="w-full glass-surface rounded-2xl p-4 text-xs font-mono-data space-y-4 border border-white/[0.06]"
          style={{
            background: 'rgba(12, 16, 28, 0.7)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
          }}
        >
          <div className="space-y-1.5">
            <p className="text-[7.5px] text-on-surface-variant/40 uppercase">ACTIVE MOUNT SYSTEM NODES</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {allAvailableWidgets.map(w => {
                const isActive = activeWidgetIds.includes(w.id)
                return (
                  <button key={w.id} onClick={() => isActive ? onRemoveWidget(w.id) : onAddWidget(w.id)}
                    className={`px-2 py-1.5 rounded border text-[9px] text-left transition-all truncate flex items-center justify-between ${
                      isActive ? 'bg-primary-fixed-dim/15 border-primary-fixed-dim/40 text-primary-fixed-dim shadow-[0_0_8px_rgba(var(--primary-rgb),0.15)]' : 'bg-black/20 border-outline-variant/20 text-on-surface-variant/50 hover:text-white'
                    }`}>
                    <span className="truncate">{w.label}</span>
                    <span className="material-symbols-outlined text-[10px]">{isActive ? 'remove_circle' : 'add_circle'}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <form onSubmit={handleCreate} className="bg-black/20 p-3 rounded border border-white/5 space-y-2.5">
            <p className="text-[8px] font-bold text-primary-fixed-dim uppercase flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">rocket_launch</span>ESTABLISH NEW USER CORE WIDGET
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input type="text" required value={customTitle} onChange={e => setCustomTitle(e.target.value)} placeholder="WIDGET TITLE..."
                className="bg-black/40 border border-outline-variant/30 rounded px-2.5 py-1 text-[10px] text-primary-fixed-dim focus:outline-none focus:border-primary-fixed-dim placeholder:text-on-surface-variant/30 font-mono-data" />
              <select value={customIcon} onChange={e => setCustomIcon(e.target.value)}
                className="bg-black/40 border border-outline-variant/30 rounded px-2.5 py-1 text-[10px] text-primary-fixed-dim pr-6 focus:outline-none cursor-pointer font-mono-data">
                <option value="widgets">Default Widgets</option>
                <option value="shield">Security Shield</option>
                <option value="bolt">Power Bolt</option>
                <option value="star">Glowing Star</option>
                <option value="monitoring">Activity Heartbeat</option>
              </select>
            </div>
            <textarea value={customContent} onChange={e => setCustomContent(e.target.value)} placeholder="DYNAMIC TELEMETRY CONTENT LOGS..."
              className="w-full h-12 bg-black/40 border border-outline-variant/30 rounded p-2 text-[10px] text-primary-fixed-dim focus:outline-none focus:border-primary-fixed-dim placeholder:text-on-surface-variant/30 font-mono-data" />
            <button type="submit" className="w-full py-1.5 bg-primary-fixed-dim/20 border border-primary-fixed-dim/40 text-primary-fixed-dim text-[9.5px] font-bold rounded-lg hover:bg-primary-fixed-dim/30 transition-all active:scale-[0.98] uppercase">
              ESTABLISH CORE WIDGET
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
