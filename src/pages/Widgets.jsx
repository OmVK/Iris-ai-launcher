import { useState, useEffect, useRef, useCallback } from 'react'
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

export default function Widgets({ isAppActive = true, activePage = 'widgets', powerSaveMode }) {
  const pendingTimers = useRef([])
  const [activeWidgetIds, setActiveWidgetIds] = useState(() => {
    try {
      const cached = localStorage.getItem('iris_active_widgets')
      const parsed = cached ? JSON.parse(cached) : null
      return Array.isArray(parsed) ? parsed : ['performance', 'weather', 'stocks', 'media', 'tasks', 'ping', 'signal']
    } catch { return ['performance', 'weather', 'stocks', 'media', 'tasks', 'ping', 'signal'] }
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

  useEffect(() => { localStorage.setItem('iris_active_widgets', JSON.stringify(activeWidgetIds)) }, [activeWidgetIds])
  useEffect(() => { localStorage.setItem('iris_custom_widgets', JSON.stringify(customWidgets)) }, [customWidgets])

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

  const handleRemoveWidget = useCallback((id) => {
    setActiveWidgetIds(prev => prev.filter(wId => wId !== id))
    if (id.startsWith('custom_')) setCustomWidgets(prev => prev.filter(w => w.id !== id))
  }, [])
  const handleAddWidget = useCallback((id) => { setActiveWidgetIds(prev => prev.includes(id) ? prev : [...prev, id]) }, [])
  const handleCreateCustomWidget = useCallback((newWidget) => {
    setCustomWidgets(prev => [...prev, newWidget])
    setActiveWidgetIds(prev => [...prev, newWidget.id])
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

  const TRACKS = [
    { title: "NEURAL_DRIFT", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", time: "LOFI_AMBIENT_CORE" },
    { title: "CYBER_RESONANCE", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", time: "NEON_BEAT_SYNTH" },
    { title: "VOID_ECHO", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3", time: "DEEP_COGNITIVE_PADS" }
  ]

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

  return (
    <div className="relative flex-1 flex flex-col h-[100lvh] min-h-0 overflow-hidden">
      <div className="flex-grow pt-12 px-margin overflow-y-auto pb-20 scroll-container select-none">
        <audio ref={(el) => { if (el) { el.src = TRACKS[trackIndex].url; el.loop = true } }} />
        <div className="mx-auto space-y-4">
        <WidgetConfig activeWidgetIds={activeWidgetIds} customWidgets={customWidgets} onAddWidget={handleAddWidget} onRemoveWidget={handleRemoveWidget} onCreateCustomWidget={handleCreateCustomWidget} />
        
        {/* Dense Auto-Reflowing Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 grid-flow-dense auto-rows-min">
          {activeWidgetIds.includes('performance') && (
            <WidgetCardWrapper id="performance" label="System Telemetry" icon="memory" widgetSpans={widgetSpans} toggleWidgetSpan={toggleWidgetSpan} minimizedWidgets={minimizedWidgets} toggleWidgetMinimize={toggleWidgetMinimize} onRemove={() => handleRemoveWidget('performance')}>
              <PerformanceWidget batteryLevel={batteryLevel} isCharging={isCharging} osVersion={osVersion} usedMem={usedMem} totalMem={totalMem} cpuTemp={cpuTemp} isDiagnosticRunning={isDiagnosticRunning} onCpuClick={handleCpuClick} onRemove={() => handleRemoveWidget('performance')} />
            </WidgetCardWrapper>
          )}

          {activeWidgetIds.includes('weather') && (
            <WidgetCardWrapper id="weather" label="Weather Station" icon="cloud" widgetSpans={widgetSpans} toggleWidgetSpan={toggleWidgetSpan} minimizedWidgets={minimizedWidgets} toggleWidgetMinimize={toggleWidgetMinimize} onRemove={() => handleRemoveWidget('weather')}>
              <WeatherWidget weatherData={weatherData} weatherCity={weatherCity} weatherLocalTime={weatherLocalTime} isWeatherLoading={isWeatherLoading} onRemove={() => handleRemoveWidget('weather')} />
            </WidgetCardWrapper>
          )}

          {activeWidgetIds.includes('stocks') && (
            <WidgetCardWrapper id="stocks" label="Market Matrix" icon="show_chart" widgetSpans={widgetSpans} toggleWidgetSpan={toggleWidgetSpan} minimizedWidgets={minimizedWidgets} toggleWidgetMinimize={toggleWidgetMinimize} onRemove={() => handleRemoveWidget('stocks')}>
              <StockWidget onRemove={() => handleRemoveWidget('stocks')} />
            </WidgetCardWrapper>
          )}

          {activeWidgetIds.includes('media') && (
            <WidgetCardWrapper id="media" label="Cyber Synth Media" icon="graphic_eq" widgetSpans={widgetSpans} toggleWidgetSpan={toggleWidgetSpan} minimizedWidgets={minimizedWidgets} toggleWidgetMinimize={toggleWidgetMinimize} onRemove={() => handleRemoveWidget('media')} defaultSpan="col-span-2">
              <MediaWidget isPlaying={isPlaying} trackIndex={trackIndex} playerMode={playerMode} selectedSystemPlayer={selectedSystemPlayer} onSetPlayerMode={handleSetPlayerMode} onPlayToggle={handlePlayToggle} onSkip={handleSkip} onSetSystemPlayer={setSelectedSystemPlayer} onLaunchSystemPlayer={handleLaunchSystemPlayer} onRemove={() => handleRemoveWidget('media')} isAppActive={isAppActive} />
            </WidgetCardWrapper>
          )}

          {activeWidgetIds.includes('tasks') && (
            <WidgetCardWrapper id="tasks" label="Task Protocol" icon="checklist" widgetSpans={widgetSpans} toggleWidgetSpan={toggleWidgetSpan} minimizedWidgets={minimizedWidgets} toggleWidgetMinimize={toggleWidgetMinimize} onRemove={() => handleRemoveWidget('tasks')}>
              <TasksWidget tasks={tasks} newTaskText={newTaskText} newTaskTime={newTaskTime} onSetNewTaskText={setNewTaskText} onSetNewTaskTime={setNewTaskTime} onAddTask={handleAddTask} onToggleTask={handleToggleTask} onDeleteTask={handleDeleteTask} onClearAll={handleClearAllTasks} onRemove={() => handleRemoveWidget('tasks')} />
            </WidgetCardWrapper>
          )}

          {activeWidgetIds.includes('clock') && (
            <WidgetCardWrapper id="clock" label="Digital Clock" icon="schedule" widgetSpans={widgetSpans} toggleWidgetSpan={toggleWidgetSpan} minimizedWidgets={minimizedWidgets} toggleWidgetMinimize={toggleWidgetMinimize} onRemove={() => handleRemoveWidget('clock')}>
              <div className="glass-surface border border-white/10 rounded-xl overflow-hidden relative">
                <ClockWidget size="medium" />
              </div>
            </WidgetCardWrapper>
          )}

          {activeWidgetIds.includes('analog_clock') && (
            <WidgetCardWrapper id="analog_clock" label="Analog Dial" icon="watch" widgetSpans={widgetSpans} toggleWidgetSpan={toggleWidgetSpan} minimizedWidgets={minimizedWidgets} toggleWidgetMinimize={toggleWidgetMinimize} onRemove={() => handleRemoveWidget('analog_clock')}>
              <div className="glass-surface border border-white/10 rounded-xl overflow-hidden relative">
                <AnalogClockWidget size={100} />
              </div>
            </WidgetCardWrapper>
          )}

          {activeWidgetIds.includes('calendar') && (
            <WidgetCardWrapper id="calendar" label="Calendar Node" icon="calendar_month" widgetSpans={widgetSpans} toggleWidgetSpan={toggleWidgetSpan} minimizedWidgets={minimizedWidgets} toggleWidgetMinimize={toggleWidgetMinimize} onRemove={() => handleRemoveWidget('calendar')}>
              <div className="glass-surface border border-white/10 rounded-xl overflow-hidden relative">
                <CalendarWidget />
              </div>
            </WidgetCardWrapper>
          )}

          {activeWidgetIds.includes('battery') && (
            <WidgetCardWrapper id="battery" label="Power Core" icon="battery_charging_full" widgetSpans={widgetSpans} toggleWidgetSpan={toggleWidgetSpan} minimizedWidgets={minimizedWidgets} toggleWidgetMinimize={toggleWidgetMinimize} onRemove={() => handleRemoveWidget('battery')}>
              <div className="glass-surface border border-white/10 rounded-xl overflow-hidden relative">
                <BatteryWidget level={batteryLevel} />
              </div>
            </WidgetCardWrapper>
          )}

          {activeWidgetIds.includes('notes') && (
            <WidgetCardWrapper id="notes" label="Quick Encrypted Notes" icon="edit_note" widgetSpans={widgetSpans} toggleWidgetSpan={toggleWidgetSpan} minimizedWidgets={minimizedWidgets} toggleWidgetMinimize={toggleWidgetMinimize} onRemove={() => handleRemoveWidget('notes')}>
              <div className="glass-surface border border-white/10 rounded-xl overflow-hidden relative">
                <NotesWidget notes={notes} onAdd={handleAddNote} />
              </div>
            </WidgetCardWrapper>
          )}

          {customWidgets.filter(w => activeWidgetIds.includes(w.id)).map(w => (
            <WidgetCardWrapper key={w.id} id={w.id} label={w.title || 'Custom Widget'} icon="code" widgetSpans={widgetSpans} toggleWidgetSpan={toggleWidgetSpan} minimizedWidgets={minimizedWidgets} toggleWidgetMinimize={toggleWidgetMinimize} onRemove={() => handleRemoveWidget(w.id)}>
              <CustomWidget widget={w} onRemove={() => handleRemoveWidget(w.id)} />
            </WidgetCardWrapper>
          ))}

          {activeWidgetIds.includes('ping') && (
            <WidgetCardWrapper id="ping" label="Network Latency Ping" icon="network_ping" widgetSpans={widgetSpans} toggleWidgetSpan={toggleWidgetSpan} minimizedWidgets={minimizedWidgets} toggleWidgetMinimize={toggleWidgetMinimize} onRemove={() => handleRemoveWidget('ping')}>
              <PingWidget pingResult={pingResult} pingHistory={pingHistory} pingFailed={pingFailed} onTriggerPingTest={handleTriggerPingTest} onRemove={() => handleRemoveWidget('ping')} />
            </WidgetCardWrapper>
          )}

          {activeWidgetIds.includes('signal') && (
            <WidgetCardWrapper id="signal" label="Telemetry Bars" icon="signal_cellular_alt" widgetSpans={widgetSpans} toggleWidgetSpan={toggleWidgetSpan} minimizedWidgets={minimizedWidgets} toggleWidgetMinimize={toggleWidgetMinimize} onRemove={() => handleRemoveWidget('signal')}>
              <SignalWidget onRemove={() => handleRemoveWidget('signal')} />
            </WidgetCardWrapper>
          )}

          {/* Add Widget to Empty Space Card */}
          <div 
            onClick={() => {
              const el = document.getElementById('add-widget-btn')
              if (el) el.click()
            }}
            className="col-span-1 border-2 border-dashed border-white/10 hover:border-cyan-500/40 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:bg-cyan-500/5 group text-white/30 hover:text-cyan-400 min-h-[120px] bg-black/20"
          >
            <span className="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform text-cyan-400/80">add_circle</span>
            <span className="text-[10px] font-mono-data uppercase tracking-wider text-white/60">Add Widget To Slot</span>
          </div>
         </div>
       </div>
     </div>
     </div>
   )
}

function WidgetCardWrapper({ id, label, icon, widgetSpans, toggleWidgetSpan, minimizedWidgets, toggleWidgetMinimize, onRemove, defaultSpan = 'col-span-1', children }) {
  const isMinimized = !!minimizedWidgets[id]
  const currentSpan = widgetSpans[id] || defaultSpan

  return (
    <div className={`relative transition-all duration-300 ${currentSpan}`}>
      {isMinimized ? (
        <div className="glass-surface border border-white/15 rounded-xl px-4 py-3 flex items-center justify-between shadow-lg hover:border-cyan-500/40 transition-all bg-black/60 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-cyan-400 text-base">{icon || 'widgets'}</span>
            <span className="text-xs font-mono-data text-white/90 uppercase tracking-wider font-semibold">{label}</span>
            <span className="text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.5 rounded font-mono">MIN</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => toggleWidgetSpan(id)} 
              title="Resize Width Span" 
              className="text-white/40 hover:text-cyan-400 p-1 rounded transition-colors bg-white/5 hover:bg-white/10"
            >
              <span className="material-symbols-outlined text-sm">aspect_ratio</span>
            </button>
            <button 
              onClick={() => toggleWidgetMinimize(id)} 
              title="Expand Widget" 
              className="text-white/40 hover:text-cyan-400 p-1 rounded transition-colors bg-white/5 hover:bg-white/10"
            >
              <span className="material-symbols-outlined text-sm">unfold_more</span>
            </button>
            <button 
              onClick={onRemove} 
              title="Remove Widget" 
              className="text-white/30 hover:text-red-400 p-1 rounded transition-colors bg-white/5 hover:bg-white/10"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="relative group">
          <div className="absolute top-2.5 right-7 z-20 flex items-center gap-1.5">
            <button 
              onClick={() => toggleWidgetMinimize(id)} 
              title="Minimize Widget" 
              className="text-white/30 hover:text-cyan-400 p-1 rounded transition-colors bg-black/60 backdrop-blur-sm border border-white/10 shadow"
            >
              <span className="material-symbols-outlined text-[12px]">unfold_less</span>
            </button>
            <button 
              onClick={() => toggleWidgetSpan(id)} 
              title="Resize Width Span" 
              className="text-white/30 hover:text-cyan-400 p-1 rounded transition-colors bg-black/60 backdrop-blur-sm border border-white/10 shadow"
            >
              <span className="material-symbols-outlined text-[12px]">aspect_ratio</span>
            </button>
          </div>
          {children}
        </div>
      )}
    </div>
  )
}
