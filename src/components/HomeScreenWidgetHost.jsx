import { useState, useCallback, useRef } from 'react'

const WIDGET_TYPES = {
  clock: { label: 'Clock', icon: 'schedule', minWidth: 2, minHeight: 1, defaultWidth: 2, defaultHeight: 1 },
  weather: { label: 'Weather', icon: 'cloud', minWidth: 2, minHeight: 1, defaultWidth: 2, defaultHeight: 1 },
  battery: { label: 'Battery', icon: 'battery_std', minWidth: 1, minHeight: 1, defaultWidth: 1, defaultHeight: 1 },
  music: { label: 'Music', icon: 'music_note', minWidth: 3, minHeight: 1, defaultWidth: 3, defaultHeight: 1 },
  contacts: { label: 'Contacts', icon: 'contacts', minWidth: 3, minHeight: 1, defaultWidth: 3, defaultHeight: 1 },
  calendar: { label: 'Calendar', icon: 'calendar_today', minWidth: 2, minHeight: 2, defaultWidth: 2, defaultHeight: 2 },
  notes: { label: 'Notes', icon: 'sticky_note_2', minWidth: 2, minHeight: 1, defaultWidth: 2, defaultHeight: 1 },
}

export default function HomeScreenWidgetHost({ widgets = [], onAddWidget, onRemoveWidget, onUpdateWidget, gridColumns = 5, gridRows = 5 }) {
  const [showPicker, setShowPicker] = useState(false)
  const [resizing, setResizing] = useState(null)
  const [resizeStart, setResizeStart] = useState(null)

  const handleAddWidget = useCallback((type) => {
    const config = WIDGET_TYPES[type]
    if (!config) return

    const widget = {
      id: `widget_${Date.now()}`,
      type,
      x: 0,
      y: 0,
      width: config.defaultWidth,
      height: config.defaultHeight,
    }

    onAddWidget?.(widget)
    setShowPicker(false)
  }, [onAddWidget])

  const handleRemoveWidget = useCallback((widgetId) => {
    onRemoveWidget?.(widgetId)
  }, [onRemoveWidget])

  const handleResizeStart = useCallback((e, widgetId) => {
    e.stopPropagation()
    const touch = e.touches?.[0] || e
    setResizing(widgetId)
    setResizeStart({ x: touch.clientX, y: touch.clientY })
  }, [])

  const handleResizeEnd = useCallback((e, widgetId) => {
    if (!resizing || !resizeStart) return
    const touch = e.changedTouches?.[0] || e
    const dx = touch.clientX - resizeStart.x
    const dy = touch.clientY - resizeStart.y
    const cellWidth = window.innerWidth / gridColumns
    const cellHeight = window.innerHeight / gridRows
    const dCols = Math.round(dx / cellWidth)
    const dRows = Math.round(dy / cellHeight)

    if (dCols !== 0 || dRows !== 0) {
      onUpdateWidget?.(widgetId, { dCols, dRows })
    }

    setResizing(null)
    setResizeStart(null)
  }, [resizing, resizeStart, gridColumns, gridRows, onUpdateWidget])

  return (
    <div className="home-widget-host relative">
      {widgets.map(widget => (
        <div
          key={widget.id}
          className={`widget-container glass-surface rounded-xl p-3 border border-white/5 relative group ${
            resizing === widget.id ? 'ring-2 ring-[var(--primary-color)]' : ''
          }`}
          style={{
            gridColumn: `span ${widget.width || 1}`,
            gridRow: `span ${widget.height || 1}`,
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-white/40 text-sm">
                {WIDGET_TYPES[widget.type]?.icon || 'widgets'}
              </span>
              <span className="text-[9px] text-white/30 font-mono-data uppercase">
                {WIDGET_TYPES[widget.type]?.label || widget.type}
              </span>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onMouseDown={(e) => handleResizeStart(e, widget.id)}
                onTouchStart={(e) => handleResizeStart(e, widget.id)}
                className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/10"
              >
                <span className="material-symbols-outlined text-white/30 text-xs">open_in_full</span>
              </button>
              <button
                onClick={() => handleRemoveWidget(widget.id)}
                className="w-5 h-5 rounded flex items-center justify-center hover:bg-red-500/20"
              >
                <span className="material-symbols-outlined text-red-400/50 text-xs">close</span>
              </button>
            </div>
          </div>

          <div className="widget-content">
            <WidgetRenderer type={widget.type} data={widget.data} />
          </div>
        </div>
      ))}

      {widgets.length === 0 && (
        <button
          onClick={() => setShowPicker(true)}
          className="w-full py-8 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-2 hover:border-white/20 hover:bg-white/5 transition-all"
        >
          <span className="material-symbols-outlined text-white/20 text-2xl">widgets</span>
          <span className="text-[10px] text-white/20 font-mono-data">ADD WIDGET</span>
        </button>
      )}

      {showPicker && (
        <WidgetPicker onSelect={handleAddWidget} onClose={() => setShowPicker(false)} />
      )}
    </div>
  )
}

function WidgetRenderer({ type, data }) {
  switch (type) {
    case 'clock':
      return <ClockWidget data={data} />
    case 'battery':
      return <BatteryWidget data={data} />
    case 'weather':
      return <WeatherMiniWidget data={data} />
    case 'notes':
      return <NotesWidget data={data} />
    default:
      return (
        <div className="flex items-center justify-center h-16">
          <span className="text-[9px] text-white/20 font-mono-data">WIDGET CONTENT</span>
        </div>
      )
  }
}

function ClockWidget() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const hours = time.getHours().toString().padStart(2, '0')
  const minutes = time.getMinutes().toString().padStart(2, '0')

  return (
    <div className="flex items-center justify-center">
      <span className="text-2xl font-mono-data text-white/80">
        {hours}:{minutes}
      </span>
    </div>
  )
}

function BatteryWidget({ data }) {
  const level = data?.level ?? 75
  const charging = data?.charging ?? false
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-8 h-14 border-2 border-white/20 rounded-md">
        <div
          className="absolute bottom-0 left-0 right-0 rounded-b-sm transition-all"
          style={{
            height: `${level}%`,
            backgroundColor: level > 50 ? 'var(--primary-color)' : level > 20 ? '#f59e0b' : '#ef4444',
          }}
        />
        {charging && (
          <span className="material-symbols-outlined text-yellow-400 text-xs absolute -top-1 -right-1">bolt</span>
        )}
      </div>
      <span className="text-xs text-white/60 font-mono-data">{level}%</span>
    </div>
  )
}

function WeatherMiniWidget({ data }) {
  return (
    <div className="flex items-center gap-2">
      <span className="material-symbols-outlined text-white/60 text-lg">cloud</span>
      <div>
        <span className="text-xs text-white/60 font-mono-data">{data?.temp || '--'}°</span>
        <span className="text-[9px] text-white/30 font-mono-data block">{data?.condition || 'N/A'}</span>
      </div>
    </div>
  )
}

function NotesWidget({ data }) {
  const [note, setNote] = useState(data?.note || '')
  return (
    <textarea
      value={note}
      onChange={(e) => setNote(e.target.value)}
      placeholder="Quick note..."
      className="w-full h-16 bg-transparent text-[10px] text-white/60 font-mono-data resize-none focus:outline-none placeholder:text-white/20"
    />
  )
}

function WidgetPicker({ onSelect, onClose }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-surface rounded-2xl p-5 max-w-sm w-full animate-in fade-in zoom-in duration-200">
        <h3 className="text-xs font-semibold text-white/80 font-mono-data mb-4">SELECT WIDGET</h3>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(WIDGET_TYPES).map(([type, config]) => (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
            >
              <span className="material-symbols-outlined text-white/50 text-lg">{config.icon}</span>
              <span className="text-[9px] text-white/50 font-mono-data">{config.label}</span>
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full mt-4 py-2 rounded-xl bg-white/5 text-white/30 text-[10px] font-mono-data hover:bg-white/10 transition-all"
        >
          CANCEL
        </button>
      </div>
    </div>
  )
}

