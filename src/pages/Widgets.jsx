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

export default function Widgets({ isAppActive = true, activePage = 'widgets', powerSaveMode }) {
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

  useEffect(() => { localStorage.setItem('iris_active_widgets', JSON.stringify(activeWidgetIds)) }, [activeWidgetIds])
  useEffect(() => { localStorage.setItem('iris_custom_widgets', JSON.stringify(customWidgets)) }, [customWidgets])

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
    setTimeout(() => setIsDiagnosticRunning(false), 1500)
  }, [isDiagnosticRunning])

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
  const [tasks, setTasks] = useState(() => { const cached = localStorage.getItem('iris_day_tasks'); return cached ? JSON.parse(cached) : [] })
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
    <div className="flex-1 mt-12 mb-20 overflow-y-auto px-4 py-6 scroll-container select-none">
      <audio ref={(el) => { if (el) { el.src = TRACKS[trackIndex].url; el.loop = true } }} />
      <div className="max-w-2xl mx-auto space-y-4">
        <WidgetConfig activeWidgetIds={activeWidgetIds} customWidgets={customWidgets} onAddWidget={handleAddWidget} onRemoveWidget={handleRemoveWidget} onCreateCustomWidget={handleCreateCustomWidget} />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {activeWidgetIds.includes('performance') && <PerformanceWidget batteryLevel={batteryLevel} isCharging={isCharging} osVersion={osVersion} usedMem={usedMem} totalMem={totalMem} cpuTemp={cpuTemp} isDiagnosticRunning={isDiagnosticRunning} onCpuClick={handleCpuClick} onRemove={() => handleRemoveWidget('performance')} />}
          {activeWidgetIds.includes('weather') && <WeatherWidget weatherData={weatherData} weatherCity={weatherCity} weatherLocalTime={weatherLocalTime} isWeatherLoading={isWeatherLoading} onRemove={() => handleRemoveWidget('weather')} />}
          {activeWidgetIds.includes('stocks') && <StockWidget onRemove={() => handleRemoveWidget('stocks')} />}
          {activeWidgetIds.includes('media') && <MediaWidget isPlaying={isPlaying} trackIndex={trackIndex} playerMode={playerMode} selectedSystemPlayer={selectedSystemPlayer} onSetPlayerMode={handleSetPlayerMode} onPlayToggle={handlePlayToggle} onSkip={handleSkip} onSetSystemPlayer={setSelectedSystemPlayer} onLaunchSystemPlayer={handleLaunchSystemPlayer} onRemove={() => handleRemoveWidget('media')} isAppActive={isAppActive} />}
          {activeWidgetIds.includes('tasks') && <TasksWidget tasks={tasks} newTaskText={newTaskText} newTaskTime={newTaskTime} onSetNewTaskText={setNewTaskText} onSetNewTaskTime={setNewTaskTime} onAddTask={handleAddTask} onToggleTask={handleToggleTask} onDeleteTask={handleDeleteTask} onClearAll={handleClearAllTasks} onRemove={() => handleRemoveWidget('tasks')} />}
          {customWidgets.filter(w => activeWidgetIds.includes(w.id)).map(w => <CustomWidget key={w.id} widget={w} onRemove={() => handleRemoveWidget(w.id)} />)}
          {activeWidgetIds.includes('ping') && <PingWidget pingResult={pingResult} pingHistory={pingHistory} pingFailed={pingFailed} onTriggerPingTest={handleTriggerPingTest} onRemove={() => handleRemoveWidget('ping')} />}
          {activeWidgetIds.includes('signal') && <SignalWidget onRemove={() => handleRemoveWidget('signal')} />}
        </div>
      </div>
    </div>
  )
}
