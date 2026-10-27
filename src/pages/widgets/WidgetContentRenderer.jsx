import React from 'react'
import PerformanceWidget from './PerformanceWidget'
import WeatherWidget from './WeatherWidget'
import StockWidget from './StockWidget'
import MediaWidget from './MediaWidget'
import TasksWidget from './TasksWidget'
import PingWidget from './PingWidget'
import SignalWidget from './SignalWidget'
import CustomWidget from './CustomWidget'
import {
  ClockWidget,
  AnalogClockWidget,
  BatteryWidget,
  CalendarWidget,
  NotesWidget,
} from '../../components/widgets/BuiltInWidgets'
import HapticFeedback from '../../utils/HapticFeedback'

export default function WidgetContentRenderer({
  id,
  metrics,
  weather,
  tasks,
  newTaskText,
  newTaskTime,
  onSetNewTaskText,
  onSetNewTaskTime,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onClearAllTasks,
  isPlaying,
  trackIndex,
  playerMode,
  selectedSystemPlayer,
  onSetPlayerMode,
  onPlayToggle,
  onSkip,
  onSetSystemPlayer,
  onLaunchSystemPlayer,
  isAppActive,
  notes,
  onAddNote,
  pingResult,
  pingHistory,
  pingFailed,
  isPingTesting,
  onTriggerPingTest,
  spacerHeights,
  cycleSpacerHeight,
  onRemoveWidget,
  isEditMode,
  customWidgets,
}) {
  if (id === 'performance') {
    return (
      <PerformanceWidget
        batteryLevel={metrics.batteryLevel}
        isCharging={metrics.isCharging}
        osVersion={metrics.osVersion}
        usedMem={metrics.usedMem}
        totalMem={metrics.totalMem}
        cpuTemp={metrics.cpuTemp}
        isDiagnosticRunning={metrics.isDiagnosticRunning}
        onCpuClick={metrics.handleCpuClick}
      />
    )
  }
  if (id === 'weather') {
    return (
      <WeatherWidget
        weatherData={weather.weatherData}
        weatherCity={weather.weatherCity}
        weatherLocalTime={weather.weatherLocalTime}
        isWeatherLoading={weather.isWeatherLoading}
      />
    )
  }
  if (id === 'stocks') return <StockWidget />
  if (id === 'media') {
    return (
      <MediaWidget
        isPlaying={isPlaying}
        trackIndex={trackIndex}
        playerMode={playerMode}
        selectedSystemPlayer={selectedSystemPlayer}
        onSetPlayerMode={onSetPlayerMode}
        onPlayToggle={onPlayToggle}
        onSkip={onSkip}
        onSetSystemPlayer={onSetSystemPlayer}
        onLaunchSystemPlayer={onLaunchSystemPlayer}
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
        onSetNewTaskText={onSetNewTaskText}
        onSetNewTaskTime={onSetNewTaskTime}
        onAddTask={onAddTask}
        onToggleTask={onToggleTask}
        onDeleteTask={onDeleteTask}
        onClearAll={onClearAllTasks}
      />
    )
  }
  if (id === 'clock') {
    return (
      <div className="glass-surface border border-white/10 rounded-2xl overflow-hidden p-2">
        <ClockWidget size="medium" />
      </div>
    )
  }
  if (id === 'analog_clock') {
    return (
      <div className="glass-surface border border-white/10 rounded-2xl overflow-hidden p-3 flex items-center justify-center">
        <AnalogClockWidget size={110} />
      </div>
    )
  }
  if (id === 'calendar') {
    return (
      <div className="glass-surface border border-white/10 rounded-2xl overflow-hidden p-3">
        <CalendarWidget />
      </div>
    )
  }
  if (id === 'battery') {
    return (
      <div className="glass-surface border border-white/10 rounded-2xl overflow-hidden p-3">
        <BatteryWidget level={metrics.batteryLevel} />
      </div>
    )
  }
  if (id === 'notes') {
    return (
      <div className="glass-surface border border-white/10 rounded-2xl overflow-hidden p-3">
        <NotesWidget notes={notes} onAdd={onAddNote} />
      </div>
    )
  }
  if (id === 'ping') {
    return (
      <PingWidget
        pingResult={pingResult}
        pingHistory={pingHistory}
        pingFailed={pingFailed}
        isPingTesting={isPingTesting}
        onTriggerPingTest={onTriggerPingTest}
      />
    )
  }
  if (id === 'signal') return <SignalWidget />
  if (id.startsWith('spacer')) {
    const heightClass = spacerHeights[id] || 'h-28'
    return (
      <div
        className={`w-full ${heightClass} rounded-2xl transition-all flex items-center justify-center ${
          isEditMode
            ? 'border-2 border-dashed border-primary-fixed-dim/40 bg-primary-fixed-dim/10 backdrop-blur-sm'
            : 'pointer-events-none'
        }`}
      >
        {isEditMode && (
          <div className="flex flex-col items-center gap-1.5 text-primary-fixed-dim">
            <span className="material-symbols-outlined text-base">crop_free</span>
            <span className="text-[9px] font-mono tracking-widest uppercase font-bold">SPACER</span>
            <div className="flex items-center gap-1.5 mt-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  HapticFeedback.light()
                  cycleSpacerHeight(id)
                }}
                className="px-2 py-0.5 rounded-lg bg-primary-fixed-dim/20 hover:bg-primary-fixed-dim/30 text-[8.5px] font-mono border border-primary-fixed-dim/30 font-bold"
              >
                HEIGHT: {heightClass === 'h-28' ? 'S' : heightClass === 'h-48' ? 'M' : 'L'}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  HapticFeedback.light()
                  onRemoveWidget(id)
                }}
                className="px-2 py-0.5 rounded-lg bg-error/20 hover:bg-error/30 text-[8.5px] font-mono border border-error/30 text-error font-bold"
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
    const customWidget = customWidgets.find((w) => w.id === id)
    if (customWidget) return <CustomWidget widget={customWidget} />
  }
  return null
}
