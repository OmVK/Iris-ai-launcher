import React, { useState, useEffect, useRef } from 'react'
import { speakTextNative } from './LauncherPlugin'

export default function TaskAlarmOverlay({ setActivePage }) {
  const [activeTask, setActiveTask] = useState(null)
  const timeoutRef = useRef(null)
  const audioCtxRef = useRef(null)

  // Play a cyberpunk-style alert tone
  const playAlertTone = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
      }
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') ctx.resume()
      
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(440, ctx.currentTime) // A4
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1)
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3)
      
      gain.gain.setValueAtTime(0, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
      
      osc.connect(gain)
      gain.connect(ctx.destination)
      
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.5)
    } catch (e) {
      console.warn("AudioContext tone failed", e)
    }
  }

  useEffect(() => {
    const handleTrigger = (e) => {
      const task = e.detail
      setActiveTask(task)
      
      playAlertTone()
      setTimeout(() => {
        speakTextNative(`Reminder for task: ${task.text}`)
      }, 600)

      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        handleMarkDone(task.id)
      }, 60000)
    }

    window.addEventListener('TRIGGER_TASK_ALARM', handleTrigger)
    return () => {
      window.removeEventListener('TRIGGER_TASK_ALARM', handleTrigger)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {})
        audioCtxRef.current = null
      }
    }
  }, [])

  const dismiss = () => {
    setActiveTask(null)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    try {
      import('./LauncherPlugin').then(m => {
        if (m.stopSpeakingNative) m.stopSpeakingNative()
      })
    } catch (e) {}
  }

  const handleMarkDone = (id) => {
    // Send event back to Widgets/App to update localStorage
    window.dispatchEvent(new CustomEvent('UPDATE_TASK_STATE', {
      detail: { id, action: 'MARK_DONE' }
    }))
    dismiss()
    // Return to home
    if (setActivePage) setActivePage('home')
  }

  const handleWorkingOn = (task) => {
    // Send event back to Widgets/App to reschedule +15 mins
    window.dispatchEvent(new CustomEvent('UPDATE_TASK_STATE', {
      detail: { id: task.id, action: 'SNOOZE_15' }
    }))
    dismiss()
  }

  if (!activeTask) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-[#0a0a0a]/90 border border-primary-color/40 rounded-2xl p-6 shadow-[0_0_40px_rgba(var(--primary-rgb),0.3)] w-[90%] max-w-sm flex flex-col items-center text-center relative overflow-hidden">
        
        {/* Scanning line animation background */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="w-full h-1 bg-primary-color shadow-[0_0_10px_var(--primary-color)] absolute top-0 animate-[scan_2s_ease-in-out_infinite]" />
        </div>

        <div className="w-16 h-16 rounded-full bg-primary-color/20 border border-primary-color flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(var(--primary-rgb),0.5)] animate-pulse">
          <span className="material-symbols-outlined text-4xl text-primary-color">alarm_on</span>
        </div>
        
        <h2 className="text-xl font-bold font-mono-data tracking-widest text-white mb-2 uppercase">
          TASK REMINDER
        </h2>
        
        <p className="text-lg text-primary-color font-bold mb-6 break-words w-full">
          &quot;{activeTask.text}&quot;
        </p>
        
        <div className="w-full flex flex-col gap-3">
          <button 
            onClick={() => handleWorkingOn(activeTask)}
            className="w-full py-4 bg-transparent border-2 border-primary-color text-primary-color font-bold font-mono-data tracking-widest rounded-lg hover:bg-primary-color/10 active:scale-95 transition-all"
          >
            WORKING ON
          </button>
          
          <button 
            onClick={() => handleMarkDone(activeTask.id)}
            className="w-full py-4 bg-error/20 border-2 border-error text-error font-bold font-mono-data tracking-widest rounded-lg hover:bg-error/30 shadow-[0_0_15px_rgba(255,84,73,0.4)] active:scale-95 transition-all"
          >
            MARKDOWN AS DONE
          </button>
        </div>
      </div>
    </div>
  )
}
