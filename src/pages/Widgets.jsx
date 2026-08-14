import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Device } from '@capacitor/device'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Geolocation } from '@capacitor/geolocation'
import { getSystemStats, dispatchMediaKey } from '../components/LauncherPlugin'
import { fetchDetailedWeather } from '../utils/weather'
import CyberSynth from '../components/CyberSynth'
import PowerSaveManager from '../utils/PowerSaveManager'
import WidgetConfig from './widgets/WidgetConfig'
import PerformanceWidget from './widgets/PerformanceWidget'
import WeatherWidget from './widgets/WeatherWidget'
import StockWidget from './widgets/StockWidget'
import MediaWidget from './widgets/MediaWidget'
import TasksWidget from './widgets/TasksWidget'
import PingWidget from './widgets/PingWidget'
import SignalWidget from './widgets/SignalWidget'
import CustomWidget from './widgets/CustomWidget'
import { ClockWidget, AnalogClockWidget, BatteryWidget, CalendarWidget, NotesWidget } from '../components/widgets/BuiltInWidgets'

const DEFAULT_ACTIVE_WIDGETS = ['performance', 'weather', 'stocks', 'media', 'tasks', 'ping', 'signal']

const TRACKS = [
  { title: "NEURAL_DRIFT", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", time: "LOFI_AMBIENT_CORE" },
  { title: "CYBER_RESONANCE", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", time: "NEON_BEAT_SYNTH" },
  { title: "VOID_ECHO", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3", time: "DEEP_COGNITIVE_PADS" }
]

export default function Widgets({ isAppActive = true, activePage = 'widgets', powerSaveMode }) {
  const pendingTimers = useRef([])

  // Layout & Widget State
  const [activeWidgetIds, setActiveWidgetIds] = useState(() => {
    try {
      const cached = localStorage.getItem('iris_active_widgets')
      const parsed = cached ? JSON.parse(cached) : null
      return Array.isArray(parsed) ? parsed : DEFAULT_ACTIVE_WIDGETS
    } catch { return DEFAULT_ACTIVE_WIDGETS }
  })
  const [customWidgets, setCustomWidgets] = useState(() => {
    try { const cached = localStorage.getItem('iris_custom_widgets'); return cached ? JSON.parse(cached) : [] } catch { return [] }
  })
  const [widgetSpans, setWidgetSpans] = useState(() => {
    try { const cached = localStorage.getItem('iris_widget_spans'); return cached ? JSON.parse(cached) : {} } catch { return {} }
  })
  const [minimizedWidgets, setMinimizedWidgets] = useState(() => {
    try { const cached = localStorage.getItem('iris_minimized_widgets'); return cached ? JSON.parse(cached) : {} } catch { return {} }
  })
  const [spacerHeights, setSpacerHeights] = useState(() => {
    try { const cached = localStorage.getItem('iris_spacer_heights'); return cached ? JSON.parse(cached) : {} } catch { return {} }
  })
  const [isEditMode, setIsEditMode] = useState(false)
  const [draggedId, setDraggedId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)

  useEffect(() => { localStorage.setItem('iris_active_widgets', JSON.stringify(activeWidgetIds)) }, [activeWidgetIds])
  useEffect(() => { localStorage.setItem('iris_custom_widgets', JSON.stringify(customWidgets)) }, [customWidgets])
  useEffect(() => { localStorage.setItem('iris_spacer_heights', JSON.stringify(spacerHeights)) }, [spacerHeights])

  // Widget Actions
  const toggleWidgetSpan = useCallback((id) => {
    setWidgetSpans(prev => {
      const current = prev[id] || 'col-span-1'
      const next = current === 'col-span-1' ? 'col-span-2' : current === 'col-span-2' ? 'col-span-full' : 'col-span-1'
      const updated = { ...prev, [id]: next }
      try { localStorage.setItem('iris_widget_spans', JSON.stringify(updated)) } catch {}
      return updated
    })
  }, [])

  const toggleWidgetMinimize = useCallback((id) => {
    setMinimizedWidgets(prev => {
      const updated = { ...prev, [id]: !prev[id] }
      try { localStorage.setItem('iris_minimized_widgets', JSON.stringify(updated)) } catch {}
      return updated
    })
  }, [])

  const cycleSpacerHeight = useCallback((id) => {
    setSpacerHeights(prev => {
      const current = prev[id] || 'h-28'
      const next = current === 'h-28' ? 'h-48' : current === 'h-48' ? 'h-72' : 'h-28'
      const updated = { ...prev, [id]: next }
      try { localStorage.setItem('iris_spacer_heights', JSON.stringify(updated)) } catch {}
      return updated
    })
  }, [])

  const handleRemoveWidget = useCallback((id) => {
    setActiveWidgetIds(prev => prev.filter(wId => wId !== id))
    if (id.startsWith('custom_')) setCustomWidgets(prev => prev.filter(w => w.id !== id))
  }, [])

  const handleAddWidget = useCallback((id) => {
    setActiveWidgetIds(prev => prev.includes(id) ? prev : [...prev, id])
  }, [])

  const handleAddSpacer = useCallback(() => {
    const newSpacerId = `spacer_${Date.now()}`
    setActiveWidgetIds(prev => [...prev, newSpacerId])
  }, [])

  const handleCreateCustomWidget = useCallback((newWidget) => {
    setCustomWidgets(prev => [...prev, newWidget])
    setActiveWidgetIds(prev => [...prev, newWidget.id])
  }, [])

  const handleResetLayout = useCallback(() => {
    if (window.confirm('Reset all widgets to default order and layouts?')) {
      setActiveWidgetIds(DEFAULT_ACTIVE_WIDGETS)
      setWidgetSpans({})
      setMinimizedWidgets({})
      setSpacerHeights({})
    }
  }, [])

  // Reordering Callbacks
  const handleMoveWidget = useCallback((fromIndex, toIndex) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return
    setActiveWidgetIds(prev => {
      const updated = [...prev]
      const [movedItem] = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, movedItem)
      return updated
    })
  }, [])

  const handleMoveUp = useCallback((id) => {
    setActiveWidgetIds(prev => {
      const index = prev.indexOf(id)
      if (index <= 0) return prev
      const updated = [...prev]
      const [item] = updated.splice(index, 1)
      updated.splice(index - 1, 0, item)
      return updated
    })
  }, [])

  const handleMoveDown = useCallback((id) => {
    setActiveWidgetIds(prev => {
      const index = prev.indexOf(id)
      if (index < 0 || index >= prev.length - 1) return prev
      const updated = [...prev]
      const [item] = updated.splice(index, 1)
      updated.splice(index + 1, 0, item)
      return updated
    })
  }, [])

  const handleMoveToTop = useCallback((id) => {
    setActiveWidgetIds(prev => {
      const index = prev.indexOf(id)
      if (index <= 0) return prev
      const updated = [...prev]
      const [item] = updated.splice(index, 1)
      updated.unshift(item)
      return updated
    })
  }, [])

  const handleMoveToBottom = useCallback((id) => {
    setActiveWidgetIds(prev => {
      const index = prev.indexOf(id)
      if (index < 0 || index === prev.length - 1) return prev
      const updated = [...prev]
      const [item] = updated.splice(index, 1)
      updated.push(item)
      return updated
    })
  }, [])

  // Performance state
  const [batteryLevel, setBatteryLevel] = useState(100)
  const [isCharging, setIsCharging] = useState(false)
  const [totalMem, setTotalMem] = useState(0)
  const [usedMem, setUsedMem] = useState(0)
  const [cpuTemp, setCpuTemp] = useState(35.0)
  const [osVersion, setOsVersion] = useState('IRIS_OS')
  const [isDiagnosticRunning, setIsDiagnosticRunning] = useState(false)

  useEffect(() => {
    const fetchDeviceMetrics = async () => {
      try {
        const info = await Device.getInfo()
        try {
          const stats = await getSystemStats()
          setUsedMem((stats.memUsed / 1024 / 1024 / 1024).toFixed(1))
          setTotalMem((stats.memTotal / 1024 / 1024 / 1024).toFixed(1))
          if (stats.cpuTemp) setCpuTemp(stats.cpuTemp)
        } catch (e) {
          if (info.memUsed) setUsedMem((info.memUsed / (1024 * 1024 * 1024)).toFixed(1))
          if (info.realDiskFree && info.realDiskTotal) setTotalMem((info.realDiskTotal / (1024 * 1024 * 1024)).toFixed(1))
          else setTotalMem(info.memUsed ? (info.memUsed / (1024 * 1024 * 1024) + 2).toFixed(1) : 8.0)
        }
        setOsVersion(`${info.operatingSystem.toUpperCase()} ${info.osVersion}`)
        const battery = await Device.getBatteryInfo()
        if (battery.batteryLevel !== undefined) setBatteryLevel(Math.round(battery.batteryLevel * 100))
        if (battery.isCharging !== undefined) setIsCharging(battery.isCharging)
      } catch (_e) { /* device info unavailable */ }
    }
    let timer
    if (isAppActive && activePage === 'widgets') {
      fetchDeviceMetrics()
      timer = setInterval(fetchDeviceMetrics, PowerSaveManager.getPollingInterval('widgetMetricsPollMs'))
    }
    return () => { if (timer) clearInterval(timer) }
  }, [isAppActive, activePage, powerSaveMode])

  const handleCpuClick = useCallback(async () => {
    if (isDiagnosticRunning) return
    setIsDiagnosticRunning(true)
    try {
      const battery = await Device.getBatteryInfo()
      if (battery.batteryLevel !== undefined) { setBatteryLevel(Math.round(battery.batteryLevel * 100)); setIsCharging(battery.isCharging) }
    } catch (_e) { /* battery info unavailable */ }
    const id = setTimeout(() => setIsDiagnosticRunning(false), 1500)
    pendingTimers.current.push(id)
  }, [isDiagnosticRunning])

  useEffect(() => {
    return () => { pendingTimers.current.forEach(id => clearTimeout(id)); pendingTimers.current = [] }
  }, [])

  // Weather state
  const [weatherCity, setWeatherCity] = useState(() => localStorage.getItem('iris_weather_city') || 'Neo Tokyo')
  const [weatherData, setWeatherData] = useState({
    temp: 24, condition: "CLEAR", humidity: 55, wind: 12, uv: 4,
    forecast: [{ day: "TOMORROW", temp: 23, cond: "PARTLY_CLOUDY" }, { day: "NEXT_DAY", temp: 22, cond: "RAINY" }, { day: "THIRD_DAY", temp: 25, cond: "CLEAR" }]
  })
  const [isWeatherLoading, setIsWeatherLoading] = useState(false)
  const [weatherLocalTime, setWeatherLocalTime] = useState('')

  useEffect(() => {
    let timer
    if (isAppActive && activePage === 'widgets') {
      setWeatherLocalTime(new Date().toLocaleTimeString([], { hour12: false }))
      timer = setInterval(() => setWeatherLocalTime(new Date().toLocaleTimeString([], { hour12: false })), PowerSaveManager.getPollingInterval('clockPollMs'))
    }
    return () => { if (timer) clearInterval(timer) }
  }, [weatherCity, isAppActive, activePage, powerSaveMode])

  useEffect(() => {
    const fetchWeather = async () => {
      setIsWeatherLoading(true)
      try {
        const posPromise = Geolocation.getCurrentPosition()
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Geolocation timeout')), 8000))
        const position = await Promise.race([posPromise, timeoutPromise])
        localStorage.setItem('iris_weather_lat', position.coords.latitude)
        localStorage.setItem('iris_weather_lon', position.coords.longitude)
        setWeatherCity('LOCAL SENSORS')
      } catch (e) {
        setWeatherCity('OFFLINE_CACHE')
      }
      try {
        const data = await fetchDetailedWeather()
        if (data) setWeatherData(data)
      } catch (e) {}
      setIsWeatherLoading(false)
    }
    let timer
    if (isAppActive && activePage === 'widgets') { fetchWeather(); timer = setInterval(fetchWeather, PowerSaveManager.getPollingInterval('weatherPollMs')) }
    return () => { if (timer) clearInterval(timer) }
  }, [isAppActive, activePage, powerSaveMode])

  // Tasks state
  const [tasks, setTasks] = useState(() => { try { const cached = localStorage.getItem('iris_day_tasks'); return cached ? JSON.parse(cached) : [] } catch { return [] } })
  const [newTaskText, setNewTaskText] = useState('')
  const [newTaskTime, setNewTaskTime] = useState('')
  useEffect(() => { localStorage.setItem('iris_day_tasks', JSON.stringify(tasks)) }, [tasks])

  const handleAddTask = useCallback(async (e) => {
    e.preventDefault()
    if (!newTaskText.trim()) return
    const id = Date.now(); const timeStr = newTaskTime.trim() ? newTaskTime : "ALL_DAY // DIRECTIVE"
    setTasks(prev => [...prev, { id, text: newTaskText, time: timeStr, done: false }])
    setNewTaskText(''); setNewTaskTime('')
    if (timeStr !== "ALL_DAY // DIRECTIVE") {
      try {
        const time = new Date(timeStr).getTime()
        if (!isNaN(time)) {
          const notifyTime = new Date(time - 10 * 60 * 1000)
          if (notifyTime.getTime() > Date.now()) {
            await LocalNotifications.requestPermissions()
            await LocalNotifications.schedule({ notifications: [{ title: "Iris Task Reminder", body: `Starting in 10 mins: ${newTaskText}`, id: Number(String(id).slice(-8)), schedule: { at: notifyTime }, sound: null }] })
          }
        }
      } catch (err) { console.error("Failed to schedule task reminder:", err) }
    }
  }, [newTaskText, newTaskTime])

  const handleToggleTask = useCallback((id) => setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t)), [])
  const handleDeleteTask = useCallback((id, e) => { e.stopPropagation(); setTasks(prev => prev.filter(t => t.id !== id)); LocalNotifications.cancel({ notifications: [{ id: Number(String(id).slice(-8)) }] }).catch(() => {}) }, [])
  const handleClearAllTasks = useCallback(() => { tasks.forEach(t => LocalNotifications.cancel({ notifications: [{ id: Number(String(t.id).slice(-8)) }] }).catch(() => {})); setTasks([]) }, [tasks])

  // Media state
  const [isPlaying, setIsPlaying] = useState(false)
  const [trackIndex, setTrackIndex] = useState(0)
  const [playerMode, setPlayerMode] = useState(() => localStorage.getItem('iris_media_player_mode') || 'SONIC')
  const [selectedSystemPlayer, setSelectedSystemPlayer] = useState(() => localStorage.getItem('iris_selected_system_player') || 'spotify')
  const synthRef = useRef(null)
  if (!synthRef.current) synthRef.current = new CyberSynth()

  useEffect(() => { localStorage.setItem('iris_media_player_mode', playerMode) }, [playerMode])
  useEffect(() => { localStorage.setItem('iris_selected_system_player', selectedSystemPlayer) }, [selectedSystemPlayer])
  useEffect(() => { return () => { if (synthRef.current) synthRef.current.stop() } }, [])

  useEffect(() => {
    if (!activeWidgetIds.includes('media') && isPlaying) {
      if (playerMode === 'SONIC') synthRef.current?.stop()
      else if (playerMode === 'SYSTEM') document.querySelector('audio')?.pause()
      setIsPlaying(false)
    }
  }, [activeWidgetIds, isPlaying, playerMode])



  const handleSetPlayerMode = useCallback((mode) => {
    if (isPlaying) { if (playerMode === 'SONIC') synthRef.current.stop(); else if (playerMode === 'SYSTEM') document.querySelector('audio')?.pause(); setIsPlaying(false) }
    setPlayerMode(mode)
  }, [isPlaying, playerMode])

  const handlePlayToggle = useCallback(() => {
    if (playerMode === 'SONIC') { if (isPlaying) synthRef.current.stop(); else synthRef.current.start(); setIsPlaying(!isPlaying) }
    else if (playerMode === 'EXTERNAL') { dispatchMediaKey('play_pause'); setIsPlaying(!isPlaying) }
    else { const audio = document.querySelector('audio'); if (audio) { if (isPlaying) audio.pause(); else audio.play().catch(() => {}); setIsPlaying(!isPlaying) } }
  }, [isPlaying, playerMode])

  const handleSkip = useCallback((direction) => {
    if (playerMode === 'EXTERNAL') { dispatchMediaKey(direction > 0 ? 'next' : 'previous'); return }
    let nextIndex = trackIndex + direction; if (nextIndex >= TRACKS.length) nextIndex = 0; if (nextIndex < 0) nextIndex = TRACKS.length - 1
    setTrackIndex(nextIndex); setIsPlaying(false)
    if (playerMode === 'SONIC') { synthRef.current.stop(); setTimeout(() => { synthRef.current.start(); setIsPlaying(true) }, 150) }
    else { setTimeout(() => { const audio = document.querySelector('audio'); if (audio) { audio.load(); audio.play().then(() => setIsPlaying(true)).catch(() => {}) } }, 100) }
  }, [trackIndex, playerMode])

  const handleLaunchSystemPlayer = useCallback(() => {
    let url = 'spotify://'
    if (selectedSystemPlayer === 'ytmusic') url = 'https://music.youtube.com/'
    else if (selectedSystemPlayer === 'apple') url = 'music://'
    else if (selectedSystemPlayer === 'samsung') url = 'samsungmusic://'
    else if (selectedSystemPlayer === 'default') url = 'intent://#Intent;action=android.intent.action.MUSIC_PLAYER;end'
    window.open(url, '_blank')
  }, [selectedSystemPlayer])

  // RAG & Ping state
  const [pingResult, setPingResult] = useState(19)
  const [isPingTesting, setIsPingTesting] = useState(false)
  const [pingHistory, setPingHistory] = useState([19, 15, 22, 18, 14, 19, 17, 20, 19])
  const [pingFailed, setPingFailed] = useState([false, false, false, false, false, false, false, false, false])

  // Notes state
  const [notes, setNotes] = useState(() => {
    try { const raw = localStorage.getItem('iris_notes'); return raw ? JSON.parse(raw) : [] } catch { return [] }
  })
  useEffect(() => { localStorage.setItem('iris_notes', JSON.stringify(notes)) }, [notes])
  const handleAddNote = useCallback((text) => {
    setNotes(prev => [...prev.slice(0, 9), text])
  }, [])

  const handleTriggerPingTest = useCallback(async () => {
    if (isPingTesting) return; setIsPingTesting(true)
    for (let i = 0; i < 5; i++) {
      const start = Date.now()
      let failed = false
      try { await fetch('https://1.1.1.1/cdn-cgi/trace', { mode: 'no-cors', cache: 'no-store' }) } catch (_e) { failed = true }
      const latency = Date.now() - start; setPingResult(latency)
      setPingHistory(prev => [...prev.slice(1), latency])
      setPingFailed(prev => [...prev.slice(1), failed])
      await new Promise(r => setTimeout(r, 250))
    }
    setIsPingTesting(false)
  }, [isPingTesting])

  // Dynamic Widget Renderer based on ID
  const renderWidgetContent = (id) => {
    if (id === 'performance') {
      return (
        <PerformanceWidget
          batteryLevel={batteryLevel}
          isCharging={isCharging}
          osVersion={osVersion}
          usedMem={usedMem}
          totalMem={totalMem}
          cpuTemp={cpuTemp}
          isDiagnosticRunning={isDiagnosticRunning}
          onCpuClick={handleCpuClick}
          onRemove={() => handleRemoveWidget('performance')}
        />
      )
    }
    if (id === 'weather') {
      return (
        <WeatherWidget
          weatherData={weatherData}
          weatherCity={weatherCity}
          weatherLocalTime={weatherLocalTime}
          isWeatherLoading={isWeatherLoading}
          onRemove={() => handleRemoveWidget('weather')}
        />
      )
    }
    if (id === 'stocks') {
      return <StockWidget onRemove={() => handleRemoveWidget('stocks')} />
    }
    if (id === 'media') {
      return (
        <MediaWidget
          isPlaying={isPlaying}
          trackIndex={trackIndex}
          playerMode={playerMode}
          selectedSystemPlayer={selectedSystemPlayer}
          onSetPlayerMode={handleSetPlayerMode}
          onPlayToggle={handlePlayToggle}
          onSkip={handleSkip}
          onSetSystemPlayer={setSelectedSystemPlayer}
          onLaunchSystemPlayer={handleLaunchSystemPlayer}
          onRemove={() => handleRemoveWidget('media')}
          isAppActive={isAppActive}
        />
      )
    }
    if (id === 'tasks') {
      return (
        <TasksWidget
          tasks={tasks}
          newTaskText={newTaskText}
          newTaskTime={newTaskTime}
          onSetNewTaskText={setNewTaskText}
          onSetNewTaskTime={setNewTaskTime}
          onAddTask={handleAddTask}
          onToggleTask={handleToggleTask}
          onDeleteTask={handleDeleteTask}
          onClearAll={handleClearAllTasks}
          onRemove={() => handleRemoveWidget('tasks')}
        />
      )
    }
    if (id === 'clock') {
      return (
        <div className="glass-surface border border-white/10 rounded-xl overflow-hidden relative">
          <ClockWidget size="medium" />
        </div>
      )
    }
    if (id === 'analog_clock') {
      return (
        <div className="glass-surface border border-white/10 rounded-xl overflow-hidden relative">
          <AnalogClockWidget size={100} />
        </div>
      )
    }
    if (id === 'calendar') {
      return (
        <div className="glass-surface border border-white/10 rounded-xl overflow-hidden relative">
          <CalendarWidget />
        </div>
      )
    }
    if (id === 'battery') {
      return (
        <div className="glass-surface border border-white/10 rounded-xl overflow-hidden relative">
          <BatteryWidget level={batteryLevel} />
        </div>
      )
    }
    if (id === 'notes') {
      return (
        <div className="glass-surface border border-white/10 rounded-xl overflow-hidden relative">
          <NotesWidget notes={notes} onAdd={handleAddNote} />
        </div>
      )
    }
    if (id === 'ping') {
      return (
        <PingWidget
          pingResult={pingResult}
          pingHistory={pingHistory}
          pingFailed={pingFailed}
          onTriggerPingTest={handleTriggerPingTest}
          onRemove={() => handleRemoveWidget('ping')}
        />
      )
    }
    if (id === 'signal') {
      return <SignalWidget onRemove={() => handleRemoveWidget('signal')} />
    }
    if (id.startsWith('spacer')) {
      const heightClass = spacerHeights[id] || 'h-28'
      return (
        <div
          className={`w-full ${heightClass} rounded-2xl transition-all flex items-center justify-center ${
            isEditMode
              ? 'border-2 border-dashed border-cyan-500/40 bg-cyan-950/20 backdrop-blur-sm'
              : 'pointer-events-none'
          }`}
        >
          {isEditMode && (
            <div className="flex flex-col items-center gap-1.5 text-cyan-400/80">
              <span className="material-symbols-outlined text-base">crop_free</span>
              <span className="text-[9px] font-mono tracking-widest uppercase">EMPTY SPACE / SPACER</span>
              <div className="flex items-center gap-1 mt-1">
                <button
                  onClick={(e) => { e.stopPropagation(); cycleSpacerHeight(id) }}
                  className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/40 text-[8px] font-mono border border-cyan-500/30 text-cyan-300"
                >
                  HEIGHT: {heightClass === 'h-28' ? 'S' : heightClass === 'h-48' ? 'M' : 'L'}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemoveWidget(id) }}
                  className="px-2 py-0.5 rounded bg-red-500/20 hover:bg-red-500/40 text-[8px] font-mono border border-red-500/30 text-red-300"
                >
                  DELETE
                </button>
              </div>
            </div>
          )}
        </div>
      )
    }
    if (id.startsWith('custom_')) {
      const customWidget = customWidgets.find(w => w.id === id)
      if (customWidget) {
        return <CustomWidget widget={customWidget} onRemove={() => handleRemoveWidget(id)} />
      }
    }
    return null
  }

  const getWidgetMeta = (id) => {
    if (id === 'performance') return { label: 'System Telemetry', icon: 'memory', defaultSpan: 'col-span-1' }
    if (id === 'weather') return { label: 'Weather Station', icon: 'cloud', defaultSpan: 'col-span-1' }
    if (id === 'stocks') return { label: 'Market Matrix', icon: 'show_chart', defaultSpan: 'col-span-1' }
    if (id === 'media') return { label: 'Cyber Synth Media', icon: 'graphic_eq', defaultSpan: 'col-span-2' }
    if (id === 'tasks') return { label: 'Task Protocol', icon: 'checklist', defaultSpan: 'col-span-1' }
    if (id === 'clock') return { label: 'Digital Clock', icon: 'schedule', defaultSpan: 'col-span-1' }
    if (id === 'analog_clock') return { label: 'Analog Dial', icon: 'watch', defaultSpan: 'col-span-1' }
    if (id === 'calendar') return { label: 'Calendar Node', icon: 'calendar_month', defaultSpan: 'col-span-1' }
    if (id === 'battery') return { label: 'Power Core', icon: 'battery_charging_full', defaultSpan: 'col-span-1' }
    if (id === 'notes') return { label: 'Quick Encrypted Notes', icon: 'edit_note', defaultSpan: 'col-span-1' }
    if (id === 'ping') return { label: 'Network Latency Ping', icon: 'network_ping', defaultSpan: 'col-span-1' }
    if (id === 'signal') return { label: 'Telemetry Bars', icon: 'signal_cellular_alt', defaultSpan: 'col-span-1' }
    if (id.startsWith('spacer')) return { label: 'Empty Space', icon: 'crop_free', defaultSpan: 'col-span-1' }
    if (id.startsWith('custom_')) {
      const w = customWidgets.find(item => item.id === id)
      return { label: w?.title || 'Custom Node', icon: w?.icon || 'code', defaultSpan: 'col-span-1' }
    }
    return { label: 'Operational Node', icon: 'widgets', defaultSpan: 'col-span-1' }
  }

  return (
    <div className="relative flex-1 flex flex-col h-[100lvh] min-h-0 overflow-hidden">
      <div className="flex-grow pt-12 px-margin overflow-y-auto pb-20 scroll-container select-none">
        <audio ref={(el) => { if (el) { el.src = TRACKS[trackIndex].url; el.loop = true } }} />
        <div className="mx-auto space-y-4 max-w-6xl">
          {/* Top Config & Workshop Bar */}
          <WidgetConfig
            activeWidgetIds={activeWidgetIds}
            customWidgets={customWidgets}
            onAddWidget={handleAddWidget}
            onRemoveWidget={handleRemoveWidget}
            onCreateCustomWidget={handleCreateCustomWidget}
            onAddSpacer={handleAddSpacer}
            isEditMode={isEditMode}
            setIsEditMode={setIsEditMode}
            onResetLayout={handleResetLayout}
          />

          {/* Clean User-Ordered Grid Layout (Without Unwanted Auto-Packing) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-min items-start">
            {activeWidgetIds.map((id, index) => {
              const meta = getWidgetMeta(id)
              const isSpacer = id.startsWith('spacer')

              return (
                <WidgetCardWrapper
                  key={id}
                  id={id}
                  index={index}
                  totalCount={activeWidgetIds.length}
                  label={meta.label}
                  icon={meta.icon}
                  defaultSpan={meta.defaultSpan}
                  widgetSpans={widgetSpans}
                  toggleWidgetSpan={toggleWidgetSpan}
                  minimizedWidgets={minimizedWidgets}
                  toggleWidgetMinimize={toggleWidgetMinimize}
                  onRemove={() => handleRemoveWidget(id)}
                  onMoveUp={() => handleMoveUp(id)}
                  onMoveDown={() => handleMoveDown(id)}
                  onMoveToTop={() => handleMoveToTop(id)}
                  onMoveToBottom={() => handleMoveToBottom(id)}
                  isEditMode={isEditMode}
                  isSpacer={isSpacer}
                  draggedId={draggedId}
                  setDraggedId={setDraggedId}
                  dragOverId={dragOverId}
                  setDragOverId={setDragOverId}
                  onMoveWidget={handleMoveWidget}
                >
                  {renderWidgetContent(id)}
                </WidgetCardWrapper>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function WidgetCardWrapper({
  id,
  index,
  totalCount,
  label,
  icon,
  widgetSpans,
  toggleWidgetSpan,
  minimizedWidgets,
  toggleWidgetMinimize,
  onRemove,
  onMoveUp,
  onMoveDown,
  onMoveToTop,
  onMoveToBottom,
  isEditMode,
  isSpacer,
  draggedId,
  setDraggedId,
  dragOverId,
  setDragOverId,
  onMoveWidget,
  defaultSpan = 'col-span-1',
  children
}) {
  const isMinimized = !!minimizedWidgets[id]
  const currentSpan = widgetSpans[id] || defaultSpan
  const [showMenu, setShowMenu] = useState(false)
  const longPressTimer = useRef(null)

  const handlePressStart = () => {
    if (isEditMode) return
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
    longPressTimer.current = setTimeout(() => {
      setShowMenu(true)
    }, 450)
  }

  const handlePressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  // HTML5 Drag & Drop Handlers
  const handleDragStart = (e) => {
    setDraggedId(id)
    e.dataTransfer.setData('text/plain', String(index))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverId !== id) setDragOverId(id)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const fromIndexStr = e.dataTransfer.getData('text/plain')
    const fromIndex = parseInt(fromIndexStr, 10)
    if (!isNaN(fromIndex) && fromIndex !== index) {
      onMoveWidget(fromIndex, index)
    }
    setDraggedId(null)
    setDragOverId(null)
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverId(null)
  }

  const isBeingDragged = draggedId === id
  const isTargetOfDrag = dragOverId === id && !isBeingDragged

  return (
    <div
      draggable={isEditMode}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
      className={`relative transition-all duration-300 ${currentSpan} ${
        isBeingDragged ? 'opacity-40 scale-[0.98] ring-2 ring-cyan-400/80 rounded-2xl' : ''
      } ${
        isTargetOfDrag ? 'ring-2 ring-cyan-400 bg-cyan-950/20 scale-[1.01] rounded-2xl' : ''
      }`}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onTouchMove={handlePressEnd}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
      onContextMenu={(e) => {
        e.preventDefault()
        setShowMenu(true)
      }}
    >
      {/* Edit Mode HUD Toolbar for each widget */}
      {isEditMode && !isSpacer && (
        <div className="flex items-center justify-between px-3 py-1.5 mb-1.5 rounded-xl bg-black/80 border border-cyan-500/40 text-cyan-300 backdrop-blur-md animate-in fade-in duration-150">
          <div className="flex items-center gap-2 cursor-grab active:cursor-grabbing">
            <span className="material-symbols-outlined text-sm opacity-80">drag_indicator</span>
            <span className="text-[8.5px] font-mono uppercase tracking-wider font-semibold truncate max-w-[100px] text-white/90">{label}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); onMoveUp() }}
              disabled={index === 0}
              className="w-6 h-6 rounded flex items-center justify-center bg-white/5 hover:bg-cyan-500/20 disabled:opacity-30 disabled:hover:bg-transparent"
              title="Move Up / Earlier"
            >
              <span className="material-symbols-outlined text-xs">arrow_upward</span>
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); onMoveDown() }}
              disabled={index === totalCount - 1}
              className="w-6 h-6 rounded flex items-center justify-center bg-white/5 hover:bg-cyan-500/20 disabled:opacity-30 disabled:hover:bg-transparent"
              title="Move Down / Later"
            >
              <span className="material-symbols-outlined text-xs">arrow_downward</span>
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); toggleWidgetSpan(id) }}
              className="px-1.5 h-6 rounded flex items-center gap-0.5 text-[8px] font-mono bg-white/5 hover:bg-cyan-500/20"
              title="Toggle Width"
            >
              <span className="material-symbols-outlined text-xs">aspect_ratio</span>
              <span>{currentSpan === 'col-span-1' ? '1C' : currentSpan === 'col-span-2' ? '2C' : 'FL'}</span>
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); toggleWidgetMinimize(id) }}
              className="w-6 h-6 rounded flex items-center justify-center bg-white/5 hover:bg-cyan-500/20"
              title={isMinimized ? 'Expand' : 'Minimize'}
            >
              <span className="material-symbols-outlined text-xs">{isMinimized ? 'unfold_more' : 'unfold_less'}</span>
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); onRemove() }}
              className="w-6 h-6 rounded flex items-center justify-center bg-red-500/10 hover:bg-red-500/30 text-red-400"
              title="Remove Widget"
            >
              <span className="material-symbols-outlined text-xs">delete</span>
            </button>
          </div>
        </div>
      )}

      {/* Widget Minimized State */}
      {isMinimized && !isSpacer ? (
        <div
          onClick={() => toggleWidgetMinimize(id)}
          className="glass-surface border border-white/15 rounded-xl px-4 py-3 flex items-center justify-between shadow-lg hover:border-cyan-500/40 transition-all bg-black/60 backdrop-blur-md cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-cyan-400 text-base">{icon || 'widgets'}</span>
            <span className="text-xs font-mono-data text-white/90 uppercase tracking-wider font-semibold">{label}</span>
            <span className="text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.5 rounded font-mono">MIN</span>
          </div>
          <span className="text-[9px] text-white/30 font-mono tracking-widest uppercase">TAP TO EXPAND</span>
        </div>
      ) : (
        <div className="relative">
          {children}
        </div>
      )}

      {/* Long-Press Options Modal */}
      {showMenu && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md animate-in fade-in duration-150" onClick={() => setShowMenu(false)} />
          <div className="relative glass-surface border border-cyan-500/40 rounded-2xl p-4 w-80 animate-in fade-in zoom-in-95 duration-150 shadow-2xl space-y-3 z-10 bg-black/90">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-cyan-400 text-base">{icon || 'widgets'}</span>
                <span className="text-xs font-mono-data font-bold text-white uppercase tracking-wider">{label}</span>
              </div>
              <button onClick={() => setShowMenu(false)} className="text-white/40 hover:text-white p-1">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="space-y-1.5 pt-1">
              {/* Position Shift Commands */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  disabled={index === 0}
                  onClick={() => { onMoveUp(); setShowMenu(false) }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-white/90 bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-300 transition-colors disabled:opacity-30"
                >
                  <span className="material-symbols-outlined text-sm">arrow_upward</span>
                  <span>Move Up</span>
                </button>
                <button
                  disabled={index === totalCount - 1}
                  onClick={() => { onMoveDown(); setShowMenu(false) }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-white/90 bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-300 transition-colors disabled:opacity-30"
                >
                  <span className="material-symbols-outlined text-sm">arrow_downward</span>
                  <span>Move Down</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  disabled={index === 0}
                  onClick={() => { onMoveToTop(); setShowMenu(false) }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-white/90 bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-300 transition-colors disabled:opacity-30"
                >
                  <span className="material-symbols-outlined text-sm">vertical_align_top</span>
                  <span>Move to Top</span>
                </button>
                <button
                  disabled={index === totalCount - 1}
                  onClick={() => { onMoveToBottom(); setShowMenu(false) }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-white/90 bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-300 transition-colors disabled:opacity-30"
                >
                  <span className="material-symbols-outlined text-sm">vertical_align_bottom</span>
                  <span>Move to Bottom</span>
                </button>
              </div>

              <button
                onClick={() => { toggleWidgetSpan(id); setShowMenu(false) }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-white/90 hover:bg-cyan-500/20 hover:text-cyan-300 transition-colors border border-transparent hover:border-cyan-500/30"
              >
                <span className="material-symbols-outlined text-base">aspect_ratio</span>
                <span>Resize Width ({currentSpan === 'col-span-1' ? '1 Column' : currentSpan === 'col-span-2' ? '2 Columns' : 'Full Width'})</span>
              </button>

              {!isSpacer && (
                <button
                  onClick={() => { toggleWidgetMinimize(id); setShowMenu(false) }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-white/90 hover:bg-cyan-500/20 hover:text-cyan-300 transition-colors border border-transparent hover:border-cyan-500/30"
                >
                  <span className="material-symbols-outlined text-base">{isMinimized ? 'unfold_more' : 'unfold_less'}</span>
                  <span>{isMinimized ? 'Expand Height' : 'Minimize Height'}</span>
                </button>
              )}

              <button
                onClick={() => { onRemove(); setShowMenu(false) }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors border border-transparent hover:border-red-500/30"
              >
                <span className="material-symbols-outlined text-base">delete_forever</span>
                <span>Remove From Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
