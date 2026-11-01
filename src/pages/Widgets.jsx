import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  dispatchMediaKey,
  getActiveMediaSession,
  addNotificationListener,
  launchApp,
} from '../components/LauncherPlugin'
import PowerSaveManager from '../utils/PowerSaveManager'
import HapticFeedback from '../utils/HapticFeedback'
import { useAppStore } from '../stores/appStore'
import { useAppsStore } from '../stores/appsStore'
import { usePowerStore } from '../stores/powerStore'
import useWidgetMetrics from '../hooks/useWidgetMetrics'
import useWidgetWeather from '../hooks/useWidgetWeather'
import WidgetConfig from './widgets/WidgetConfig'
import WidgetCardWrapper from './widgets/WidgetCardWrapper'
import WidgetContentRenderer, { getWidgetMeta } from './widgets/WidgetContentRenderer'

const TRACKS = [
  {
    title: 'CYBERPUNK_SYNTH.WAV',
    freq: '432Hz',
    url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=cyberpunk-2099-10701.mp3',
  },
  {
    title: 'DARK_NET_DRONE.MP3',
    freq: '528Hz',
    url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=ambient-piano-amp-strings-10711.mp3',
  },
  {
    title: 'NEURAL_WAVE.OGG',
    freq: '852Hz',
    url: 'https://cdn.pixabay.com/download/audio/2021/11/23/audio_035a336e82.mp3?filename=future-bass-logo-11303.mp3',
  },
]

const DEFAULT_ACTIVE_IDS = ['performance', 'weather', 'stocks', 'media', 'tasks', 'ping', 'signal']

const DEFAULT_SPANS = {
  performance: 'col-span-1 md:col-span-2',
  weather: 'col-span-1',
  stocks: 'col-span-1 md:col-span-3',
  media: 'col-span-1',
  tasks: 'col-span-1 md:col-span-2',
  ping: 'col-span-1',
  signal: 'col-span-1 md:col-span-2',
}

const KNOWN_MUSIC_PACKAGES = new Set([
  'com.spotify.music',
  'com.spotify.lite',
  'com.google.android.apps.youtube.music',
  'app.revanced.android.apps.youtube.music',
  'com.apple.android.music',
  'com.sec.android.app.music',
  'com.samsung.android.app.soundalive',
  'org.videolan.vlc',
  'com.maxmpz.audioplayer',
  'in.krosbits.musicolet',
  'com.soundcloud.android',
  'com.aspiro.tidal',
  'deezer.android.app',
  'com.amazon.mp3',
  'com.audible.application',
  'au.com.shiftyjelly.pocketcasts',
  'com.aimp.player',
  'com.foobar2000.foobar2000',
  'com.neutroncode.mp',
  'code.name.monkey.retromusic',
  'com.piyush.music',
  'com.kodarkooperativet.blackplayerex',
  'com.dywx.larkplayer',
  'com.miui.player',
  'org.oxycblt.auxio',
  'it.vfsfitvnm.vimusic',
  'com.zionhuang.music',
  'com.maxrave.simpmusic',
  'com.metrolist.music',
  'org.schabi.newpipe',
  'com.pandora.android',
  'com.clearchannel.iheartradio.controller',
  'tunein.player',
  'com.bandcamp.android',
  'com.plexapp.android',
  'org.jellyfin.mobile',
  'com.google.android.youtube',
])

const MUSIC_KEYWORD_REGEX =
  /\b(music|spotify|audio|player|mp3|soundcloud|tidal|deezer|vlc|poweramp|musicolet|podcast|audible|radio|yt\s*music|youtube\s*music|vimusic|innertune|auxio|aimp|foobar)\b/i

const EXCLUDE_PACKAGE_REGEX =
  /\b(settings|systemui|permission|provider|telephony|contacts|calendar|calculator|camera|gallery|clock|weather|keyboard|inputmethod|gms|vending)\b/i

export default function Widgets() {
  const isAppActive = useAppStore((s) => s.isAppActive)
  const activePage = useAppStore((s) => s.activePage)
  const powerSaveMode = usePowerStore((s) => s.powerSaveMode)
  const installedApps = useAppsStore((s) => s.installedApps)

  const {
    batteryLevel,
    isCharging,
    totalMem,
    usedMem,
    cpuTemp,
    osVersion,
    isDiagnosticRunning,
    handleCpuClick,
  } = useWidgetMetrics({ isAppActive, activePage, powerSaveMode })

  const { weatherCity, weatherData, isWeatherLoading, weatherLocalTime, refreshWeather } =
    useWidgetWeather({ isAppActive, activePage, powerSaveMode })

  const installedPlayers = useMemo(() => {
    const matched = []
    const seen = new Set()
    for (const app of installedApps || []) {
      const pkg = app.packageId || ''
      const label = app.label || ''
      if (!pkg || seen.has(pkg)) continue
      const isKnown = KNOWN_MUSIC_PACKAGES.has(pkg)
      const isKeywordMatch =
        !EXCLUDE_PACKAGE_REGEX.test(pkg) &&
        (MUSIC_KEYWORD_REGEX.test(label) || MUSIC_KEYWORD_REGEX.test(pkg))

      if (isKnown || isKeywordMatch) {
        seen.add(pkg)
        matched.push({
          packageId: pkg,
          label: label || pkg,
          priority: isKnown ? 0 : 1,
        })
      }
    }
    matched.sort((a, b) => a.priority - b.priority || a.label.localeCompare(b.label))
    return matched
  }, [installedApps])

  const [isPlaying, setIsPlaying] = useState(false)
  const [trackIndex, setTrackIndex] = useState(0)
  const [audioMode, setAudioMode] = useState(() => {
    const saved = localStorage.getItem('iris_media_mode')
    return saved === 'STREAM' ? 'STREAM' : 'SYSTEM'
  })
  const [systemPlayer, setSystemPlayer] = useState(() => {
    return localStorage.getItem('iris_preferred_music_player') || 'default'
  })
  const [activeMedia, setActiveMedia] = useState({
    isPlaying: false,
    packageId: '',
    title: '',
    artist: '',
    album: '',
    playerName: '',
  })

  const audioRef = useRef(null)

  const [pingResult, setPingResult] = useState(18)
  const [pingHistory, setPingHistory] = useState([16, 19, 15, 22, 18, 17, 21, 18, 16, 18])
  const [pingFailed, setPingFailed] = useState(() => new Array(10).fill(false))
  const [isPingTesting, setIsPingTesting] = useState(false)

  const [tasks, setTasks] = useState(() => {
    try {
      const saved = localStorage.getItem('iris_day_tasks')
      return saved
        ? JSON.parse(saved)
        : [
            { id: 1, text: 'DAILY SYSTEM SECURITY AUDIT', time: '14:00', done: false, alerted: false },
            { id: 2, text: 'SYNC NEURAL CORE MODEL', time: '18:30', done: true, alerted: true },
          ]
    } catch {
      return []
    }
  })
  const [newTaskText, setNewTaskText] = useState('')
  const [newTaskTime, setNewTaskTime] = useState('')

  const [activeWidgetIds, setActiveWidgetIds] = useState(() => {
    try {
      const saved = localStorage.getItem('iris_active_widgets')
      return saved ? JSON.parse(saved) : DEFAULT_ACTIVE_IDS
    } catch {
      return DEFAULT_ACTIVE_IDS
    }
  })

  const [customWidgets, setCustomWidgets] = useState(() => {
    try {
      const saved = localStorage.getItem('iris_custom_widgets')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [widgetSpans, setWidgetSpans] = useState(() => {
    try {
      const saved = localStorage.getItem('iris_widget_spans')
      return saved ? JSON.parse(saved) : DEFAULT_SPANS
    } catch {
      return DEFAULT_SPANS
    }
  })

  const [minimizedWidgets, setMinimizedWidgets] = useState(() => {
    try {
      const saved = localStorage.getItem('iris_minimized_widgets')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  const [isEditMode, setIsEditMode] = useState(false)
  const [draggedId, setDraggedId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)

  // Auto-select first installed third-party music player if current choice isn't installed
  useEffect(() => {
    if (installedPlayers.length === 0) return
    if (
      systemPlayer === 'default' ||
      !installedPlayers.some((p) => p.packageId === systemPlayer)
    ) {
      const preferred = installedPlayers[0].packageId
      setSystemPlayer(preferred)
      localStorage.setItem('iris_preferred_music_player', preferred)
    }
  }, [installedPlayers, systemPlayer])

  const handleSelectSystemPlayer = useCallback((pkg) => {
    setSystemPlayer(pkg)
    localStorage.setItem('iris_preferred_music_player', pkg)
  }, [])

  const syncActiveMediaSession = useCallback(async () => {
    try {
      const session = await getActiveMediaSession()
      if (!session) return
      const matchedApp = installedPlayers.find((p) => p.packageId === session.packageId)
      setActiveMedia({
        isPlaying: Boolean(session.isPlaying || session.isMusicActive),
        packageId: session.packageId || '',
        title: session.title || '',
        artist: session.artist || '',
        album: session.album || '',
        playerName: matchedApp?.label || '',
      })
      if (audioMode === 'SYSTEM') {
        setIsPlaying(Boolean(session.isPlaying || session.isMusicActive))
      }
      if (
        session.packageId &&
        installedPlayers.some((p) => p.packageId === session.packageId)
      ) {
        setSystemPlayer(session.packageId)
      }
    } catch {}
  }, [audioMode, installedPlayers])

  useEffect(() => {
    if (!isAppActive || activePage !== 'widgets') return
    syncActiveMediaSession()
    const interval = setInterval(syncActiveMediaSession, 4000)
    const sub = addNotificationListener(() => {
      syncActiveMediaSession()
    })
    return () => {
      clearInterval(interval)
      if (sub && sub.remove) sub.remove()
    }
  }, [isAppActive, activePage, syncActiveMediaSession])

  useEffect(() => {
    localStorage.setItem('iris_active_widgets', JSON.stringify(activeWidgetIds))
  }, [activeWidgetIds])

  useEffect(() => {
    localStorage.setItem('iris_custom_widgets', JSON.stringify(customWidgets))
  }, [customWidgets])

  useEffect(() => {
    localStorage.setItem('iris_widget_spans', JSON.stringify(widgetSpans))
  }, [widgetSpans])

  useEffect(() => {
    localStorage.setItem('iris_minimized_widgets', JSON.stringify(minimizedWidgets))
  }, [minimizedWidgets])

  const handleAddWidget = useCallback((id) => {
    setActiveWidgetIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }, [])

  const handleRemoveWidget = useCallback((id) => {
    setActiveWidgetIds((prev) => prev.filter((item) => item !== id))
  }, [])

  const handleCreateCustomWidget = useCallback((newWidget) => {
    setCustomWidgets((prev) => [...prev, newWidget])
    setActiveWidgetIds((prev) => [...prev, newWidget.id])
  }, [])

  const handleAddSpacer = useCallback(() => {
    HapticFeedback.light()
    const spacerId = 'spacer_' + Date.now()
    setActiveWidgetIds((prev) => [...prev, spacerId])
    setWidgetSpans((prev) => ({ ...prev, [spacerId]: 'col-span-1' }))
    setIsEditMode(true)
  }, [])

  const handleResetLayout = useCallback(() => {
    HapticFeedback.medium()
    setActiveWidgetIds(DEFAULT_ACTIVE_IDS)
    setWidgetSpans(DEFAULT_SPANS)
    setMinimizedWidgets({})
  }, [])

  const moveWidgetByOffset = useCallback((index, delta) => {
    setActiveWidgetIds((prev) => {
      const targetIndex = index + delta
      if (targetIndex < 0 || targetIndex >= prev.length) return prev
      const next = [...prev]
      const [moved] = next.splice(index, 1)
      next.splice(targetIndex, 0, moved)
      return next
    })
  }, [])

  const moveWidgetToEdge = useCallback((index, edge) => {
    setActiveWidgetIds((prev) => {
      if (prev.length <= 1) return prev
      const next = [...prev]
      const [moved] = next.splice(index, 1)
      if (edge === 'top') next.unshift(moved)
      else next.push(moved)
      return next
    })
  }, [])

  const moveWidgetFromTo = useCallback((fromIndex, toIndex) => {
    setActiveWidgetIds((prev) => {
      if (
        fromIndex < 0 ||
        fromIndex >= prev.length ||
        toIndex < 0 ||
        toIndex >= prev.length ||
        fromIndex === toIndex
      ) {
        return prev
      }
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }, [])

  const toggleWidgetSpan = useCallback((id) => {
    setWidgetSpans((prev) => {
      const current = prev[id] || DEFAULT_SPANS[id] || 'col-span-1'
      let nextSpan = 'col-span-1'
      if (current === 'col-span-1') nextSpan = 'col-span-1 md:col-span-2'
      else if (current === 'col-span-1 md:col-span-2') nextSpan = 'col-span-1 md:col-span-3'
      else nextSpan = 'col-span-1'
      return { ...prev, [id]: nextSpan }
    })
  }, [])

  const toggleWidgetMinimize = useCallback((id) => {
    setMinimizedWidgets((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }, [])

  // Keep stream audio src synced only when trackIndex changes
  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const targetUrl = TRACKS[trackIndex]?.url
    if (targetUrl && el.src !== targetUrl) {
      el.src = targetUrl
      el.loop = true
    }
  }, [trackIndex])

  useEffect(() => {
    const audioEl = audioRef.current
    return () => {
      if (audioEl) audioEl.pause()
    }
  }, [])

  const togglePlay = useCallback(() => {
    if (audioMode === 'STREAM') {
      if (!audioRef.current) return
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.play().catch(() => {})
        setIsPlaying(true)
      }
    } else {
      dispatchMediaKey('play_pause')
      setIsPlaying((prev) => !prev)
      setTimeout(syncActiveMediaSession, 350)
    }
  }, [audioMode, isPlaying, syncActiveMediaSession])

  const switchAudioMode = useCallback(
    (newMode) => {
      if (newMode === audioMode) return
      if (audioRef.current) audioRef.current.pause()
      setAudioMode(newMode)
      localStorage.setItem('iris_media_mode', newMode)
      if (newMode === 'SYSTEM') {
        setIsPlaying(Boolean(activeMedia.isPlaying))
        syncActiveMediaSession()
      } else {
        setIsPlaying(false)
      }
    },
    [audioMode, activeMedia.isPlaying, syncActiveMediaSession]
  )

  const nextTrack = useCallback(() => {
    if (audioMode === 'SYSTEM') {
      dispatchMediaKey('next')
      setIsPlaying(true)
      setTimeout(syncActiveMediaSession, 350)
      return
    }
    const nextIdx = (trackIndex + 1) % TRACKS.length
    setTrackIndex(nextIdx)
    if (audioMode === 'STREAM' && isPlaying && audioRef.current) {
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.src = TRACKS[nextIdx].url
          audioRef.current.play().catch(() => {})
        }
      }, 50)
    }
  }, [audioMode, trackIndex, isPlaying, syncActiveMediaSession])

  const prevTrack = useCallback(() => {
    if (audioMode === 'SYSTEM') {
      dispatchMediaKey('previous')
      setIsPlaying(true)
      setTimeout(syncActiveMediaSession, 350)
      return
    }
    const prevIdx = (trackIndex - 1 + TRACKS.length) % TRACKS.length
    setTrackIndex(prevIdx)
    if (audioMode === 'STREAM' && isPlaying && audioRef.current) {
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.src = TRACKS[prevIdx].url
          audioRef.current.play().catch(() => {})
        }
      }, 50)
    }
  }, [audioMode, trackIndex, isPlaying, syncActiveMediaSession])

  const handleLaunchSystemPlayer = useCallback(async () => {
    const targetPkg =
      systemPlayer !== 'default'
        ? systemPlayer
        : activeMedia.packageId || installedPlayers[0]?.packageId || 'default'

    if (targetPkg && targetPkg !== 'default') {
      const playerObj = installedPlayers.find((p) => p.packageId === targetPkg)
      await launchApp(targetPkg, playerObj?.label || targetPkg)
    } else {
      await dispatchMediaKey('launch_default')
    }
  }, [systemPlayer, activeMedia.packageId, installedPlayers])

  useEffect(() => {
    let pingInterval
    if (isAppActive && activePage === 'widgets') {
      const livePing = async () => {
        const start = performance.now()
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 3000)
          await fetch('https://1.1.1.1/cdn-cgi/trace', { mode: 'no-cors', signal: controller.signal })
          clearTimeout(timeoutId)
          const rtt = Math.round(performance.now() - start)
          setPingResult(rtt)
          setPingHistory((prev) => [...prev.slice(1), rtt])
          setPingFailed((prev) => [...prev.slice(1), false])
        } catch {
          const fallbackRtt = Math.floor(Math.random() * 14) + 12
          setPingResult(fallbackRtt)
          setPingHistory((prev) => [...prev.slice(1), fallbackRtt])
          setPingFailed((prev) => [...prev.slice(1), true])
        }
      }
      livePing()
      const pollMs = PowerSaveManager.getPollingInterval('networkPollMs') || 15000
      pingInterval = setInterval(livePing, pollMs)
    }
    return () => {
      if (pingInterval) clearInterval(pingInterval)
    }
  }, [isAppActive, activePage, powerSaveMode])

  const triggerPingTest = useCallback(async () => {
    if (isPingTesting) return
    setIsPingTesting(true)
    for (let i = 0; i < 4; i++) {
      const start = performance.now()
      try {
        await fetch('https://www.google.com/generate_204', { mode: 'no-cors', cache: 'no-store' })
        const rtt = Math.round(performance.now() - start)
        setPingResult(rtt)
        setPingHistory((prev) => [...prev.slice(1), rtt])
        setPingFailed((prev) => [...prev.slice(1), false])
      } catch {
        const sim = Math.floor(Math.random() * 20) + 15
        setPingResult(sim)
        setPingHistory((prev) => [...prev.slice(1), sim])
        setPingFailed((prev) => [...prev.slice(1), true])
      }
      await new Promise((r) => setTimeout(r, 250))
    }
    setIsPingTesting(false)
  }, [isPingTesting])

  const saveTasks = useCallback((updated) => {
    setTasks(updated)
    localStorage.setItem('iris_day_tasks', JSON.stringify(updated))
  }, [])

  const addTask = useCallback(
    (e) => {
      e.preventDefault()
      if (!newTaskText.trim()) return
      const newTask = {
        id: Date.now(),
        text: newTaskText.toUpperCase(),
        time: newTaskTime ? newTaskTime.replace('T', ' @ ') : 'ALL-DAY',
        rawTime: newTaskTime || null,
        done: false,
        alerted: false,
      }
      setTasks((prev) => {
        const next = [newTask, ...prev]
        localStorage.setItem('iris_day_tasks', JSON.stringify(next))
        return next
      })
      setNewTaskText('')
      setNewTaskTime('')
    },
    [newTaskText, newTaskTime]
  )

  const toggleTask = useCallback((id) => {
    setTasks((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
      localStorage.setItem('iris_day_tasks', JSON.stringify(next))
      return next
    })
  }, [])

  const deleteTask = useCallback((id, e) => {
    if (e) e.stopPropagation()
    setTasks((prev) => {
      const next = prev.filter((t) => t.id !== id)
      localStorage.setItem('iris_day_tasks', JSON.stringify(next))
      return next
    })
  }, [])

  const clearAllTasks = useCallback(() => {
    saveTasks([])
  }, [saveTasks])

  return (
    <main className="h-screen pt-14 pb-28 px-4 max-w-6xl mx-auto overflow-y-auto scroll-container space-y-4">
      <div className="pt-2">
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
      </div>

      {isEditMode && (
        <div className="rounded-xl px-4 py-2.5 border border-amber-400/40 bg-amber-500/10 flex items-center justify-between text-[9.5px] font-mono text-amber-200">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-amber-400">pan_tool</span>
            <span>
              <strong>LAYOUT EDIT MODE:</strong> Drag or use arrows to reorder, cycle width (1C / 2C / FULL), or tap{' '}
              <strong>+ EMPTY SPACE</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsEditMode(false)}
            className="px-2.5 py-1 rounded bg-amber-400 text-black font-bold text-[8.5px] uppercase tracking-wider shrink-0 ml-2"
          >
            LOCK
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch pb-8">
        {activeWidgetIds.map((id, index) => {
          const meta = getWidgetMeta(id, customWidgets)
          const isSpacer = id.startsWith('spacer_')

          return (
            <WidgetCardWrapper
              key={id}
              id={id}
              index={index}
              totalCount={activeWidgetIds.length}
              label={meta.label}
              icon={meta.icon}
              widgetSpans={widgetSpans}
              defaultSpan={DEFAULT_SPANS[id] || 'col-span-1'}
              minimizedWidgets={minimizedWidgets}
              isSpacer={isSpacer}
              isEditMode={isEditMode}
              onMoveUp={() => moveWidgetByOffset(index, -1)}
              onMoveDown={() => moveWidgetByOffset(index, 1)}
              onMoveToTop={() => moveWidgetToEdge(index, 'top')}
              onMoveToBottom={() => moveWidgetToEdge(index, 'bottom')}
              toggleWidgetSpan={toggleWidgetSpan}
              toggleWidgetMinimize={toggleWidgetMinimize}
              onRemove={() => handleRemoveWidget(id)}
              draggedId={draggedId}
              dragOverId={dragOverId}
              setDraggedId={setDraggedId}
              setDragOverId={setDragOverId}
              onMoveWidget={moveWidgetFromTo}
            >
              <WidgetContentRenderer
                id={id}
                isEditMode={isEditMode}
                onRemove={() => handleRemoveWidget(id)}
                batteryLevel={batteryLevel}
                isCharging={isCharging}
                osVersion={osVersion}
                usedMem={usedMem}
                totalMem={totalMem}
                cpuTemp={cpuTemp}
                isDiagnosticRunning={isDiagnosticRunning}
                handleCpuClick={handleCpuClick}
                weatherData={weatherData}
                weatherCity={weatherCity}
                weatherLocalTime={weatherLocalTime}
                isWeatherLoading={isWeatherLoading}
                onRefreshWeather={refreshWeather}
                audioMode={audioMode}
                isPlaying={isPlaying}
                trackIndex={trackIndex}
                tracks={TRACKS}
                systemPlayer={systemPlayer}
                installedPlayers={installedPlayers}
                activeMedia={activeMedia}
                switchAudioMode={switchAudioMode}
                setSystemPlayer={handleSelectSystemPlayer}
                prevTrack={prevTrack}
                togglePlay={togglePlay}
                nextTrack={nextTrack}
                handleLaunchSystemPlayer={handleLaunchSystemPlayer}
                tasks={tasks}
                newTaskText={newTaskText}
                newTaskTime={newTaskTime}
                setNewTaskText={setNewTaskText}
                setNewTaskTime={setNewTaskTime}
                addTask={addTask}
                toggleTask={toggleTask}
                deleteTask={deleteTask}
                clearAllTasks={clearAllTasks}
                pingResult={pingResult}
                pingHistory={pingHistory}
                pingFailed={pingFailed}
                isPingTesting={isPingTesting}
                triggerPingTest={triggerPingTest}
                customWidgets={customWidgets}
              />
            </WidgetCardWrapper>
          )
        })}
      </div>

      <audio ref={audioRef} preload="none" loop />
    </main>
  )
}
