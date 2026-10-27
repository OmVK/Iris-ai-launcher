import React, { useState, useEffect } from 'react'
import HapticFeedback from '../../utils/HapticFeedback'

export default function SetupVaultStep({ onNext }) {
  const [currentTime, setCurrentTime] = useState('')
  const [targetPin, setTargetPin] = useState('')
  const [testPin, setTestPin] = useState('')
  const [unlocked, setUnlocked] = useState(false)

  useEffect(() => {
    const update = () => {
      const now = new Date()
      const hh = String(now.getHours()).padStart(2, '0')
      const mm = String(now.getMinutes()).padStart(2, '0')
      setCurrentTime(`${hh}:${mm}`)
      setTargetPin(`${hh}${mm}`)
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleKeyPress = (num) => {
    if (unlocked || testPin.length >= 4) return
    const next = testPin + num
    setTestPin(next)
    HapticFeedback.light()

    if (next.length === 4) {
      if (next === targetPin) {
        setUnlocked(true)
        HapticFeedback.double()
      } else {
        HapticFeedback.error()
        setTimeout(() => setTestPin(''), 500)
      }
    }
  }

  const handleClear = () => {
    setTestPin('')
    HapticFeedback.light()
  }

  return (
    <div className="space-y-4 animate-fade-in text-center">
      <div className="border-b border-white/10 pb-3">
        <h2 className="text-base font-bold text-primary-fixed-dim uppercase tracking-widest">
          Chrono Lock Security
        </h2>
        <p className="text-[9px] text-on-surface-variant/70 uppercase tracking-wider mt-0.5">
          Dynamic Time-Synchronized PIN Architecture
        </p>
      </div>

      <div className="bg-black/50 border border-primary-fixed-dim/20 rounded-xl p-3 text-left space-y-2">
        <p className="text-[10px] text-white/90 leading-relaxed font-sans">
          The IRIS Private Vault uses a dynamic time-based cipher. By default, your master unlock PIN continuously shifts to match the current system time in <span className="text-primary-fixed-dim font-bold font-mono">HHMM</span> 24-hour format:
        </p>
        <div className="flex items-center justify-between bg-primary-fixed-dim/10 border border-primary-fixed-dim/30 rounded-lg px-3 py-2">
          <div className="text-[10px] text-on-surface-variant/70">
            CURRENT TIME: <span className="text-white font-mono font-bold">{currentTime}</span>
          </div>
          <div className="text-[10px] text-primary-fixed-dim font-mono font-bold tracking-wider">
            UNLOCK PIN: {targetPin}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[9px] uppercase tracking-widest text-on-surface-variant/70 font-bold">
          {unlocked ? 'CIPHER SYNCHRONIZED' : 'TEST THE CIPHER (ENTER PIN ABOVE)'}
        </p>

        <div className="flex justify-center gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-9 h-11 rounded-lg border flex items-center justify-center font-mono text-base font-bold transition-all ${
                unlocked
                  ? 'border-success text-success bg-success/10 shadow-[0_0_12px_rgba(0,255,100,0.3)]'
                  : testPin[i]
                  ? 'border-primary-fixed-dim text-primary-fixed-dim bg-primary-fixed-dim/10'
                  : 'border-white/15 bg-black/40 text-white/30'
              }`}
            >
              {testPin[i] || '•'}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-1.5 max-w-[210px] mx-auto pt-1">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => handleKeyPress(n)}
              className="py-1.5 rounded-lg bg-black/40 border border-white/10 text-white font-mono text-xs hover:border-primary-fixed-dim/40 active:scale-95 transition-all"
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="py-1.5 rounded-lg bg-black/40 border border-white/10 text-white/50 font-mono text-[9px] hover:border-white/20 active:scale-95 uppercase"
          >
            CLR
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="py-1.5 rounded-lg bg-black/40 border border-white/10 text-white font-mono text-xs hover:border-primary-fixed-dim/40 active:scale-95 transition-all"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => {
              setTestPin(targetPin)
              setUnlocked(true)
              HapticFeedback.double()
            }}
            className="py-1.5 rounded-lg bg-primary-fixed-dim/10 border border-primary-fixed-dim/30 text-primary-fixed-dim font-mono text-[9px] active:scale-95 uppercase font-bold"
          >
            AUTO
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onNext}
        className="w-full py-2.5 bg-primary-fixed-dim/20 border border-primary-fixed-dim/50 text-primary-fixed-dim font-bold rounded-xl hover:bg-primary-fixed-dim/30 transition-all active:scale-95 uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)] mt-1"
      >
        {unlocked ? 'CIPHER CONFIRMED — CONTINUE' : 'ACCEPT PROTOCOL & CONTINUE'}
      </button>
    </div>
  )
}
