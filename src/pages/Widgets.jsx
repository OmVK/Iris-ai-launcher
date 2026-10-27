import React, { useState, useEffect, useRef, useCallback } from 'react'
import { LocalNotifications } from '@capacitor/local-notifications'
import { dispatchMediaKey } from '../components/LauncherPlugin'
import CyberSynth from '../components/CyberSynth'
import WidgetConfig from './widgets/WidgetConfig'
import WidgetCardWrapper from './widgets/WidgetCardWrapper'
import WidgetContentRenderer from './widgets/WidgetContentRenderer'
import useWidgetMetrics from '../hooks/useWidgetMetrics'
import useWidgetWeather from '../hooks/useWidgetWeather'
import HapticFeedback from '../utils/HapticFeedback'

const DEFAULT_ACTIVE_WIDGETS = ['performance', 'weather', 'stocks', 'media', 'tasks', 'ping', 'signal']

const TRACKS = [
  { title: 'NEURAL_DRIFT', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', time: 'LOFI_AMBIENT_CORE' },
  { title: 'CYBER_RESONANCE', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', time: 'NEON_BEAT_SYNTH' },
  { title: 'VOID_ECHO', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', time: 'DEEP_COGNITIVE_PADS' },
]

export default function Widgets({ isAppActive = true, activePage = 'widgets', powerSaveMode }) {
  const [activeWidgetIds, setActiveWidgetIds] = useState(() => {
    try {
      const cached = localStorage.getItem('iris_active_widgets')
      const parsed = cached ? JSON.parse(cached) : null
      return Array.isArray(parsed) ? parsed : DEFAULT_ACTIVE_WIDGETS
    } catch {
      return DEFAULT_ACTIVE_WIDGETS
    }
  })
  const [customWidgets, setCustomWidgets] = useState(() => {
    try {
      const cached = localStorage.getItem('iris_custom_widgets')
      return cached ? JSON.parse(cached) : []
    } catch {
      return []
    }
  })
  const [widgetSpans, setWidgetSpans] = useState(() => {
    try {
      const cached = localStorage.getItem('iris_widget_spans')
      return cached ? JSON.parse(cached) : {}
    } catch {
      return {}
    }
  })
  const [minimizedWidgets, setMinimizedWidgets] = useState(() => {
    try {
      const cached = localStorage.getItem('iris_minimized_widgets')
      return cached ? JSON.parse(cached) : {}
    } catch {
      return {}
    }
  })
  const [spacerHeights, setSpacerHeights] = useState(() => {
    try {
      const cached = localStorage.getItem('iris_spacer_heights')
      return cached ? JSON.parse(cached) : {}
    } catch {
      return {}
    }
  })
  const [isEditMode, setIsEditMode] = useState(false)
  const [draggedId, setDraggedId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)

  useEffect(() => {
    localStorage.setItem('iris_active_widgets', JSON.stringify(activeWidgetIds))
  }, [activeWidgetIds])
  useEffect(() => {
    localStorage.setItem('iris_custom_widgets', JSON.stringify(customWidgets))
  }, [customWidgets])
  useEffect(() => {
    localStorage.setItem('iris_spacer_heights', JSON.stringify(spacerHeights))
  }, [spacerHeights])

  const metrics = useWidgetMetrics({ isAppActive, activePage, powerSaveMode })
  const weather = useWidgetWeather({ isAppActive, activePage, powerSaveMode })

  // Tasks state
  const [tasks, setTasks] = useState(() => {
    try {
      const cached = localStorage.getItem('iris_day_tasks')
      return cached ? JSON.parse(cached) : []
    } catch {
      return []
    }
  })
  const [newTaskText, setNewTaskText] = useState('')
  const [newTaskTime, setNewTaskTime] = useState('')
  useEffect(() => {
    localStorage.setItem('iris_day_tasks', JSON.stringify(tasks))
  }, [tasks])

  const handleAddTask = useCallback(
    async (e) => {
      e.preventDefault()
      if (!newTaskText.trim()) return
      HapticFeedback.light()
      const id = Date.now()
      const timeStr = newTaskTime.trim() ? newTaskTime : 'ALL_DAY // DIRECTIVE'
      setTasks((prev) => [...prev, { id, text: newTaskText, time: timeStr, done: false }])
      setNewTaskText('')
      setNewTaskTime('')
      if (timeStr !== 'ALL_DAY // DIRECTIVE') {
        try {
          const time = new Date(timeStr).getTime()
          if (!isNaN(time)) {
            const notifyTime = new Date(time - 10 * 60 * 1000)
            if (notifyTime.getTime() > Date.now()) {
              await LocalNotifications.requestPermissions()
              await LocalNotifications.schedule({
                notifications: [
                  {
                    title: 'Iris Task Reminder',
                    body: `Starting in 10 mins: ${newTaskText}`,
                    id: Number(String(id).slice(-8)),
                    schedule: { at: notifyTime },
                    sound: null,
                  },
                ],
              })
            }
          }
        } catch {}
      }
    },
    [newTaskText, newTaskTime]
  )

  const handleToggleTask = useCallback((id) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  }, [])
  const handleDeleteTask = useCallback((id, e) => {
    e.stopPropagation()
    setTasks((prev) => prev.filter((t) => t.id !== id))
    LocalNotifications.cancel({ notifications: [{ id: Number(String(id).slice(-8)) }] }).catch(() => {})
  }, [])
  const handleClearAllTasks = useCallback(() => {
    tasks.forEach((t) => {
      LocalNotifications.cancel({ notifications: [{ id: Number(String(t.id).slice(-8)) }] }).catch(() => {})
    })
    setTasks([])
  }, [tasks])

  // Media state
  const [isPlaying, setIsPlaying] = useState(false)
  const [trackIndex, setTrackIndex] = useState(0)
  const [playerMode, setPlayerMode] = useState(() => localStorage.getItem('iris_media_player_mode') || 'SONIC')
  const [selectedSystemPlayer, setSelectedSystemPlayer] = useState(
    () => localStorage.getItem('iris_selected_system_player') || 'spotify'
  )
  const synthRef = useRef(null)
  if (!synthRef.current) synthRef.current = new CyberSynth()

  useEffect(() => {
    localStorage.setItem('iris_media_player_mode', playerMode)
  }, [playerMode])
  useEffect(() => {
    localStorage.setItem('iris_selected_system_player', selectedSystemPlayer)
  }, [selectedSystemPlayer])
  useEffect(() => {
    return () => {
      if (synthRef.current) synthRef.current.stop()
    }
  }, [])

  useEffect(() => {
    if (!activeWidgetIds.includes('media') && isPlaying) {
      if (playerMode === 'SONIC') synthRef.current?.stop()
      else if (playerMode === 'SYSTEM') document.querySelector('audio')?.pause()
      setIsPlaying(false)
    }
  }, [activeWidgetIds, isPlaying, playerMode])

  const handleSetPlayerMode = useCallback(
    (mode) => {
      if (isPlaying) {
        if (playerMode === 'SONIC') synthRef.current?.stop()
        else if (playerMode === 'SYSTEM') document.querySelector('audio')?.pause()
        setIsPlaying(false)
      }
      setPlayerMode(mode)
    },
    [isPlaying, playerMode]
  )

  const handlePlayToggle = useCallback(() => {
    if (playerMode === 'SONIC') {
      if (isPlaying) synthRef.current?.stop()
      else synthRef.current?.start()
      setIsPlaying(!isPlaying)
    } else if (playerMode === 'EXTERNAL') {
      dispatchMediaKey('play_pause')
      setIsPlaying(!isPlaying)
    } else {
      const audio = document.querySelector('audio')
      if (audio) {
        if (isPlaying) audio.pause()
        else audio.play().catch(() => {})
        setIsPlaying(!isPlaying)
      }
    }
  }, [isPlaying, playerMode])

  const handleSkip = useCallback(
    (direction) => {
      if (playerMode === 'EXTERNAL') {
        dispatchMediaKey(direction > 0 ? 'next' : 'previous')
        return
      }
      let nextIndex = trackIndex + direction
      if (nextIndex >= TRACKS.length) nextIndex = 0
      if (nextIndex < 0) nextIndex = TRACKS.length - 1
      setTrackIndex(nextIndex)
      setIsPlaying(false)
      if (playerMode === 'SONIC') {
        synthRef.current?.stop()
        setTimeout(() => {
          synthRef.current?.start()
          setIsPlaying(true)
        }, 150)
      } else {
        setTimeout(() => {
          const audio = document.querySelector('audio')
          if (audio) {
            audio.load()
            audio.play().then(() => setIsPlaying(true)).catch(() => {})
          }
        }, 100)
      }
    },
    [trackIndex, playerMode]
  )

  const handleLaunchSystemPlayer = useCallback(() => {
    let url = 'spotify://'
    if (selectedSystemPlayer === 'ytmusic') url = 'https://music.youtube.com/'
    else if (selectedSystemPlayer === 'apple') url = 'music://'
    else if (selectedSystemPlayer === 'samsung') url = 'samsungmusic://'
    else if (selectedSystemPlayer === 'default') url = 'intent://#Intent;action=android.intent.action.MUSIC_PLAYER;end'
    window.open(url, '_blank')
  }, [selectedSystemPlayer])

  // Latency & Ping state
  const [pingResult, setPingResult] = useState(19)
  const [isPingTesting, setIsPingTesting] = useState(false)
  const [pingHistory, setPingHistory] = useState([19, 15, 22, 18, 14, 19, 17, 20, 19])
  const [pingFailed, setPingFailed] = useState([false, false, false, false, false, false, false, false, false])

  const handleTriggerPingTest = useCallback(async () => {
    if (isPingTesting) return
    setIsPingTesting(true)
    for (let i = 0; i < 5; i++) {
      const start = Date.now()
      let failed = false
      try {
        await fetch('https://1.1.1.1/cdn-cgi/trace', { mode: 'no-cors', cache: 'no-store' })
      } catch {
        failed = true
      }
      const latency = Date.now() - start
      setPingResult(latency)
      setPingHistory((prev) => [...prev.slice(1), latency])
      setPingFailed((prev) => [...prev.slice(1), failed])
      await new Promise((r) => setTimeout(r, 200))
    }
    setIsPingTesting(false)
  }, [isPingTesting])

  // Periodic background live ping monitor
  useEffect(() => {
    let timer
    if (isAppActive && activePage === 'widgets') {
      const livePing = async () => {
        const start = Date.now()
        let failed = false
        try {
          await fetch('https://1.1.1.1/cdn-cgi/trace', { mode: 'no-cors', cache: 'no-store' })
        } catch {
          failed = true
        }
        const latency = Date.now() - start
        setPingResult(latency)
        setPingHistory((prev) => [...prev.slice(1), latency])
        setPingFailed((prev) => [...prev.slice(1), failed])
      }
      livePing()
      timer = setInterval(livePing, 10000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [isAppActive, activePage])

  // Notes state
  const [notes, setNotes] = useState(() => {
    try {
      const raw = localStorage.getItem('iris_notes')
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })
  useEffect(() => {
    localStorage.setItem('iris_notes', JSON.stringify(notes))
  }, [notes])
  const handleAddNote = useCallback((text) => {
    setNotes((prev) => [...prev.slice(0, 9), text])
  }, [])

  // Widget Actions
  const toggleWidgetSpan = useCallback((id) => {
    setWidgetSpans((prev) => {
      const current = prev[id] || 'col-span-1'
      const next = current === 'col-span-1' ? 'col-span-2' : current === 'col-span-2' ? 'col-span-full' : 'col-span-1'
      const updated = { ...prev, [id]: next }
      try {
        localStorage.setItem('iris_widget_spans', JSON.stringify(updated))
      } catch {}
      return updated
    })
  }, [])

  const toggleWidgetMinimize = useCallback((id) => {
    setMinimizedWidgets((prev) => {
      const updated = { ...prev, [id]: !prev[id] }
      try {
        localStorage.setItem('iris_minimized_widgets', JSON.stringify(updated))
      } catch {}
      return updated
    })
  }, [])

  const cycleSpacerHeight = useCallback((id) => {
    setSpacerHeights((prev) => {
      const current = prev[id] || 'h-28'
      const next = current === 'h-28' ? 'h-48' : current === 'h-48' ? 'h-72' : 'h-28'
      const updated = { ...prev, [id]: next }
      try {
        localStorage.setItem('iris_spacer_heights', JSON.stringify(updated))
      } catch {}
      return updated
    })
  }, [])

  const handleRemoveWidget = useCallback((id) => {
    setActiveWidgetIds((prev) => prev.filter((wId) => wId !== id))
    if (id.startsWith('custom_')) setCustomWidgets((prev) => prev.filter((w) => w.id !== id))
  }, [])
  const handleAddWidget = useCallback((id) => {
    setActiveWidgetIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }, [])
  const handleAddSpacer = useCallback(() => {
    setActiveWidgetIds((prev) => [...prev, `spacer_${Date.now()}`])
  }, [])
  const handleCreateCustomWidget = useCallback((newWidget) => {
    setCustomWidgets((prev) => [...prev, newWidget])
    setActiveWidgetIds((prev) => [...prev, newWidget.id])
  }, [])
  const handleResetLayout = useCallback(() => {
    if (window.confirm('Reset all widgets to default order and layout?')) {
      setActiveWidgetIds(DEFAULT_ACTIVE_WIDGETS)
      setWidgetSpans({})
      setMinimizedWidgets({})
      setSpacerHeights({})
    }
  }, [])

  const handleMoveWidget = useCallback((fromIndex, toIndex) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return
    setActiveWidgetIds((prev) => {
      const updated = [...prev]
      const [movedItem] = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, movedItem)
      return updated
    })
  }, [])

  const handleMoveUp = useCallback((id) => {
    setActiveWidgetIds((prev) => {
      const index = prev.indexOf(id)
      if (index <= 0) return prev
      const updated = [...prev]
      const [item] = updated.splice(index, 1)
      updated.splice(index - 1, 0, item)
      return updated
    })
  }, [])

  const handleMoveDown = useCallback((id) => {
    setActiveWidgetIds((prev) => {
      const index = prev.indexOf(id)
      if (index < 0 || index >= prev.length - 1) return prev
      const updated = [...prev]
      const [item] = updated.splice(index, 1)
      updated.splice(index + 1, 0, item)
      return updated
    })
  }, [])

  const handleMoveToTop = useCallback((id) => {
    setActiveWidgetIds((prev) => {
      const index = prev.indexOf(id)
      if (index <= 0) return prev
      const updated = [...prev]
      const [item] = updated.splice(index, 1)
      updated.unshift(item)
      return updated
    })
  }, [])

  const handleMoveToBottom = useCallback((id) => {
    setActiveWidgetIds((prev) => {
      const index = prev.indexOf(id)
      if (index < 0 || index === prev.length - 1) return prev
      const updated = [...prev]
      const [item] = updated.splice(index, 1)
      updated.push(item)
      return updated
    })
  }, [])

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
    if (id === 'notes') return { label: 'Quick Notes', icon: 'edit_note', defaultSpan: 'col-span-1' }
    if (id === 'ping') return { label: 'Network Latency', icon: 'network_ping', defaultSpan: 'col-span-1' }
    if (id === 'signal') return { label: 'Telemetry Bars', icon: 'signal_cellular_alt', defaultSpan: 'col-span-1' }
    if (id.startsWith('spacer')) return { label: 'Empty Space', icon: 'crop_free', defaultSpan: 'col-span-1' }
    if (id.startsWith('custom_')) {
      const w = customWidgets.find((item) => item.id === id)
      return { label: w?.label || 'Custom Node', icon: w?.icon || 'code', defaultSpan: 'col-span-1' }
    }
    return { label: 'Operational Node', icon: 'widgets', defaultSpan: 'col-span-1' }
  }

  return (
    <div className="relative flex-1 flex flex-col h-[100lvh] min-h-0 overflow-hidden font-mono-data select-none">
      <div className="flex-grow pt-16 md:pt-20 px-margin overflow-y-auto pb-24 scroll-container">
        <audio
          ref={(el) => {
            if (el) {
              el.src = TRACKS[trackIndex].url
              el.loop = true
            }
          }}
        />
        <div className="mx-auto space-y-4 max-w-6xl">
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 auto-rows-min items-start">
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
                  <WidgetContentRenderer
                    id={id}
                    metrics={metrics}
                    weather={weather}
                    tasks={tasks}
                    newTaskText={newTaskText}
                    newTaskTime={newTaskTime}
                    onSetNewTaskText={setNewTaskText}
                    onSetNewTaskTime={setNewTaskTime}
                    onAddTask={handleAddTask}
                    onToggleTask={handleToggleTask}
                    onDeleteTask={handleDeleteTask}
                    onClearAllTasks={handleClearAllTasks}
                    isPlaying={isPlaying}
                    trackIndex={trackIndex}
                    playerMode={playerMode}
                    selectedSystemPlayer={selectedSystemPlayer}
                    onSetPlayerMode={handleSetPlayerMode}
                    onPlayToggle={handlePlayToggle}
                    onSkip={handleSkip}
                    onSetSystemPlayer={setSelectedSystemPlayer}
                    onLaunchSystemPlayer={handleLaunchSystemPlayer}
                    isAppActive={isAppActive}
                    notes={notes}
                    onAddNote={handleAddNote}
                    pingResult={pingResult}
                    pingHistory={pingHistory}
                    pingFailed={pingFailed}
                    isPingTesting={isPingTesting}
                    onTriggerPingTest={handleTriggerPingTest}
                    spacerHeights={spacerHeights}
                    cycleSpacerHeight={cycleSpacerHeight}
                    onRemoveWidget={handleRemoveWidget}
                    isEditMode={isEditMode}
                    customWidgets={customWidgets}
                  />
                </WidgetCardWrapper>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
