import React, { memo } from 'react'
import HapticFeedback from '../../utils/HapticFeedback'
import PerformanceWidget from './PerformanceWidget'
import WeatherWidget from './WeatherWidget'
import StockWidget from './StockWidget'
import MediaWidget from './MediaWidget'
import TasksWidget from './TasksWidget'
import PingWidget from './PingWidget'
import SignalWidget from './SignalWidget'
import ScreenTimeWidget from './ScreenTimeWidget'
import CustomWidget from './CustomWidget'
import {
  ClockWidget,
  AnalogClockWidget,
  BatteryWidget,
  CalendarWidget,
  NotesWidget,
} from '../../components/widgets/BuiltInWidgets'

export const WIDGET_CATALOG = {
  performance: { label: 'Kernel Telemetry', icon: 'memory' },
  screentime: { label: 'Screen Time HUD', icon: 'timelapse' },
  weather: { label: 'Meteo Station', icon: 'cloud' },
  stocks: { label: 'Market Feeds', icon: 'show_chart' },
  media: { label: 'Media Core', icon: 'graphic_eq' },
  tasks: { label: 'Task Protocol', icon: 'checklist' },
  ping: { label: 'Network Latency', icon: 'network_ping' },
  signal: { label: 'Signal Grid', icon: 'signal_cellular_alt' },
  clock: { label: 'Digital Clock', icon: 'schedule' },
  analog_clock: { label: 'Analog Clock', icon: 'watch' },
  calendar: { label: 'Calendar Node', icon: 'calendar_month' },
  battery: { label: 'Battery Cell', icon: 'battery_charging_full' },
  notes: { label: 'Quick Notes', icon: 'edit_note' },
}

export function getWidgetMeta(id, customWidgets) {
  if (id.startsWith('spacer_')) {
    return { label: 'Grid Spacer', icon: 'space_bar' }
  }
  if (WIDGET_CATALOG[id]) return WIDGET_CATALOG[id]
  const custom = customWidgets.find((w) => w.id === id)
  if (custom) return { label: custom.label, icon: custom.icon || 'widgets' }
  return { label: id.toUpperCase(), icon: 'widgets' }
}

const WidgetContentRenderer = memo(function WidgetContentRenderer({
  id,
  isAppActive = true,
  isEditMode,
  onRemove,
  batteryLevel,
  isCharging,
  osVersion,
  usedMem,
  totalMem,
  cpuTemp,
  isDiagnosticRunning,
  handleCpuClick,
  weatherData,
  weatherCity,
  weatherLocalTime,
  isWeatherLoading,
  onRefreshWeather,
  audioMode,
  isPlaying,
  trackIndex,
  tracks,
  systemPlayer,
  installedPlayers,
  activeMedia,
  switchAudioMode,
  setSystemPlayer,
  prevTrack,
  togglePlay,
  nextTrack,
  handleLaunchSystemPlayer,
  tasks,
  newTaskText,
  newTaskTime,
  setNewTaskText,
  setNewTaskTime,
  addTask,
  toggleTask,
  deleteTask,
  clearAllTasks,
  pingResult,
  pingHistory,
  pingFailed,
  isPingTesting,
  triggerPingTest,
  customWidgets,
}) {
  if (id.startsWith('spacer_')) {
    if (!isEditMode) {
      return <div className="min-h-[85px] sm:min-h-[110px] w-full pointer-events-none" />
    }
    return (
      <div className="min-h-[95px] sm:min-h-[120px] w-full rounded-2xl border-2 border-dashed border-cyan-500/35 bg-cyan-950/15 flex flex-col items-center justify-center p-4 gap-1.5 select-none">
        <div className="flex items-center gap-2 text-cyan-400">
          <span className="material-symbols-outlined text-base">space_bar</span>
          <span className="text-[10px] font-mono-data uppercase tracking-widest font-bold">
            EMPTY GRID SPACER
          </span>
        </div>
        <p className="text-[8px] font-mono text-white/40 text-center">
          Hold or use toolbar to resize width, reorder, or delete
        </p>
        <button
          type="button"
          onClick={() => {
            HapticFeedback.light()
            onRemove()
          }}
          className="mt-1 px-2.5 py-1 rounded-lg bg-error/20 border border-error/40 text-error text-[8.5px] font-mono font-bold hover:bg-error/30 transition-colors"
        >
          REMOVE SPACER
        </button>
      </div>
    )
  }

  switch (id) {
    case 'performance':
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
        />
      )
    case 'weather':
      return (
        <WeatherWidget
          weatherData={weatherData}
          weatherCity={weatherCity}
          weatherLocalTime={weatherLocalTime}
          isWeatherLoading={isWeatherLoading}
          onRefresh={onRefreshWeather}
        />
      )
    case 'stocks':
      return <StockWidget />
    case 'media':
      return (
        <MediaWidget
          audioMode={audioMode}
          isPlaying={isPlaying}
          trackIndex={trackIndex}
          tracks={tracks}
          systemPlayer={systemPlayer}
          installedPlayers={installedPlayers}
          activeMedia={activeMedia}
          onSwitchAudioMode={switchAudioMode}
          onSetSystemPlayer={setSystemPlayer}
          onPrevTrack={prevTrack}
          onTogglePlay={togglePlay}
          onNextTrack={nextTrack}
          onLaunchSystemPlayer={handleLaunchSystemPlayer}
        />
      )
    case 'tasks':
      return (
        <TasksWidget
          tasks={tasks}
          newTaskText={newTaskText}
          _newTaskTime={newTaskTime}
          onSetNewTaskText={setNewTaskText}
          onSetNewTaskTime={setNewTaskTime}
          onAddTask={addTask}
          onToggleTask={toggleTask}
          onDeleteTask={deleteTask}
          onClearAll={clearAllTasks}
        />
      )
    case 'ping':
      return (
        <PingWidget
          pingResult={pingResult}
          pingHistory={pingHistory}
          pingFailed={pingFailed}
          isPingTesting={isPingTesting}
          onTriggerPingTest={triggerPingTest}
        />
      )
    case 'signal':
      return <SignalWidget />
    case 'screentime':
      return <ScreenTimeWidget isAppActive={isAppActive} />
    case 'clock':
      return (
        <div className="iris-card border border-white/10 rounded-2xl p-4 relative h-full flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
          <ClockWidget size="medium" />
        </div>
      )
    case 'analog_clock':
      return (
        <div className="iris-card border border-white/10 rounded-2xl p-4 relative h-full flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
          <AnalogClockWidget size={120} />
        </div>
      )
    case 'calendar':
      return (
        <div className="iris-card border border-white/10 rounded-2xl p-4 relative h-full shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
          <CalendarWidget />
        </div>
      )
    case 'battery':
      return (
        <div className="iris-card border border-white/10 rounded-2xl p-4 relative h-full flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
          <BatteryWidget level={batteryLevel} />
        </div>
      )
    case 'notes':
      return (
        <div className="iris-card border border-white/10 rounded-2xl p-4 relative h-full shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
          <NotesWidget />
        </div>
      )
    default: {
      const custom = customWidgets.find((w) => w.id === id)
      if (!custom) return null
      return <CustomWidget widget={custom} />
    }
  }
})

export default WidgetContentRenderer
