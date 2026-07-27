import React, { useState, useEffect } from 'react'
import { useThemeStore } from '../../stores/themeStore'

export function ClockWidget({ size = 'medium' }) {
  const [time, setTime] = useState(new Date())
  const { use24HourClock } = useThemeStore()

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const hours = use24HourClock ? time.getHours() : time.getHours() % 12 || 12
  const minutes = time.getMinutes().toString().padStart(2, '0')
  const seconds = time.getSeconds().toString().padStart(2, '0')
  const ampm = time.getHours() >= 12 ? 'PM' : 'AM'

  const isLarge = size === 'large'

  return (
    <div className={`flex flex-col items-center justify-center ${isLarge ? 'p-6' : 'p-3'}`}>
      <div className={`font-mono-data font-bold text-white tracking-wider ${isLarge ? 'text-5xl' : 'text-3xl'}`}>
        {hours}:{minutes}
        <span className={`text-primary-fixed-dim ${isLarge ? 'text-2xl' : 'text-lg'}`}>:{seconds}</span>
      </div>
      {!use24HourClock && (
        <span className="text-xs text-white/40 font-mono-data mt-1">{ampm}</span>
      )}
      <span className="text-[9px] text-white/30 font-mono-data mt-2 uppercase">
        {time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
      </span>
    </div>
  )
}

export function AnalogClockWidget({ size = 120 }) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const seconds = time.getSeconds()
  const minutes = time.getMinutes()
  const hours = time.getHours() % 12

  const secondAngle = seconds * 6
  const minuteAngle = minutes * 6 + seconds * 0.1
  const hourAngle = hours * 30 + minutes * 0.5

  return (
    <div className="flex items-center justify-center p-3">
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
        {[...Array(12)].map((_, i) => {
          const angle = (i * 30 - 90) * (Math.PI / 180)
          const x1 = 50 + 38 * Math.cos(angle)
          const y1 = 50 + 38 * Math.sin(angle)
          const x2 = 50 + 42 * Math.cos(angle)
          const y2 = 50 + 42 * Math.sin(angle)
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
        })}
        <line x1="50" y1="50" x2={50 + 20 * Math.cos((hourAngle - 90) * Math.PI / 180)} y2={50 + 20 * Math.sin((hourAngle - 90) * Math.PI / 180)} stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="50" y1="50" x2={50 + 28 * Math.cos((minuteAngle - 90) * Math.PI / 180)} y2={50 + 28 * Math.sin((minuteAngle - 90) * Math.PI / 180)} stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="50" y1="50" x2={50 + 32 * Math.cos((secondAngle - 90) * Math.PI / 180)} y2={50 + 32 * Math.sin((secondAngle - 90) * Math.PI / 180)} stroke="#00f2ff" strokeWidth="0.8" strokeLinecap="round" />
        <circle cx="50" cy="50" r="2" fill="#00f2ff" />
      </svg>
    </div>
  )
}


export function BatteryWidget({ level = 100 }) {
  const getColor = () => {
    if (level > 60) return 'text-green-400'
    if (level > 30) return 'text-amber-400'
    return 'text-red-400'
  }

  return (
    <div className="p-3 flex flex-col items-center gap-1">
      <div className="relative w-10 h-5 border border-white/20 rounded-sm">
        <div className={`absolute inset-0.5 rounded-sm transition-all ${getColor()}`} style={{ width: `${level}%`, backgroundColor: 'currentColor', opacity: 0.3 }} />
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono-data text-white/80">{level}%</span>
      </div>
      <span className="text-[8px] text-white/40 font-mono-data">BATTERY</span>
    </div>
  )
}


export function CalendarWidget() {
  const today = new Date()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay()

  return (
    <div className="p-3">
      <div className="text-center mb-2">
        <span className="text-[10px] text-white/60 font-mono-data uppercase">
          {today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <span key={i} className="text-[7px] text-white/30 font-mono-data">{d}</span>
        ))}
        {[...Array(firstDay)].map((_, i) => <span key={`empty-${i}`} />)}
        {[...Array(daysInMonth)].map((_, i) => {
          const day = i + 1
          const isToday = day === today.getDate()
          return (
            <span key={day} className={`text-[8px] font-mono-data py-0.5 rounded ${isToday ? 'bg-primary-fixed-dim/20 text-primary-fixed-dim font-bold' : 'text-white/50'}`}>
              {day}
            </span>
          )
        })}
      </div>
    </div>
  )
}

export function NotesWidget({ notes = [], onAdd }) {
  const [text, setText] = useState('')

  const handleAdd = () => {
    if (text.trim()) {
      onAdd?.(text.trim())
      setText('')
    }
  }

  return (
    <div className="p-3">
      <div className="space-y-1.5 mb-2 max-h-20 overflow-y-auto">
        {notes.length === 0 && (
          <p className="text-[8px] text-white/30 font-mono-data text-center py-2">No notes yet</p>
        )}
        {notes.slice(0, 3).map((note, i) => (
          <p key={i} className="text-[9px] text-white/60 font-mono-data truncate">{note}</p>
        ))}
      </div>
      <div className="flex gap-1.5">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Quick note..."
          className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-[9px] text-white/80 font-mono-data placeholder:text-white/20 focus:outline-none focus:border-primary-fixed-dim/40"
        />
        <button onClick={handleAdd} className="px-2 py-1 rounded bg-primary-fixed-dim/20 text-primary-fixed-dim text-[9px] font-mono-data">
          ADD
        </button>
      </div>
    </div>
  )
}
