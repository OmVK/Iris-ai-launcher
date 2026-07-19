import { useState } from 'react'

const DEFAULT_WIDGETS = [
  { id: 'performance', label: 'Kernel Performance Metrics' },
  { id: 'weather', label: 'Weather Forecast Node' },
  { id: 'stocks', label: 'Stock & Crypto Candlestick Cores' },
  { id: 'media', label: 'Sonic & System Media Player' },
  { id: 'tasks', label: 'Day Tasks Manager' },
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
    <section className="glass-surface glass-border rounded-xl p-4 text-xs font-mono-data space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-primary-fixed-dim font-bold flex items-center gap-1.5 text-xs">
          <span className="material-symbols-outlined text-sm animate-pulse">space_dashboard</span>
          CUSTOMIZE METRIC DASHBOARD
        </span>
        <button onClick={() => setIsConfigOpen(!isConfigOpen)}
          className="px-2.5 py-1 rounded border border-primary-fixed-dim/30 bg-primary-fixed-dim/10 text-primary-fixed-dim text-[9px] font-bold active:scale-95 transition-all">
          {isConfigOpen ? 'CLOSE WORKSHOP' : 'WIDGET WORKSHOP'}
        </button>
      </div>

      {isConfigOpen && (
        <div className="pt-3 border-t border-white/5 space-y-4">
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
    </section>
  )
}
