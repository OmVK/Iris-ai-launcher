import { useState, useEffect, useCallback } from 'react'

const STEPS = [
  {
    title: 'IRIS AI LAUNCHER',
    subtitle: 'CYBERNETIC HOME OS',
    description: 'Welcome to IRIS — an AI-powered Android launcher with offline voice assistance, cybersecurity tools, and deep system integration.',
    icon: 'rocket_launch',
    color: '#00e5ff',
    highlight: 'home',
  },
  {
    title: 'HOME SCREEN',
    subtitle: 'YOUR COMMAND CENTER',
    description: 'Your home screen features a live clock, weather data, battery status, and an AI orb. Swipe up to open the drawer, left for news, right for the daily briefing.',
    icon: 'home',
    color: '#00e5ff',
    highlight: 'home',
  },
  {
    title: 'APP DRAWER',
    subtitle: '4 LAYOUTS',
    description: 'Swipe up from home to access your apps. Choose from Grid, List, Categories, or the 3D Ring layout. Supports folders, search, and A-Z filtering.',
    icon: 'grid_view',
    color: '#76ff03',
    highlight: 'drawer',
  },
  {
    title: 'WIDGETS',
    subtitle: 'LIVE DASHBOARDS',
    description: 'Access 8 widget types: Performance, Weather, Stocks, Media, Tasks, Ping, Signal, and Custom widgets. Arrange them freely on your widget page.',
    icon: 'dashboard',
    color: '#ff9100',
    highlight: 'widgets',
  },
  {
    title: 'AI ASSISTANT',
    subtitle: 'ONLINE & OFFLINE',
    description: 'Chat with AI powered by Gemini, Groq, or on-device models. Enable live voice mode for hands-free conversation. Works offline with 55+ voice commands.',
    icon: 'smart_toy',
    color: '#e040fb',
    highlight: 'assistant',
  },
  {
    title: 'IRIS TOOLS',
    subtitle: 'CYBERSECURITY SUITE',
    description: '12 built-in tools: password generator, hash calculator, IP lookup, port scanner, whois, DNS lookup, SQLmap, and more — all accessible from the tools page.',
    icon: 'security',
    color: '#ff5252',
    highlight: 'tools',
  },
  {
    title: 'PRIVATE VAULT',
    subtitle: 'ENCRYPTED STORAGE',
    description: 'Lock apps and files behind a time-based PIN (HHMM format) and biometric authentication. Failed attempts trigger silent threat photo capture.',
    icon: 'lock',
    color: '#ffd740',
    highlight: 'vault',
  },
  {
    title: 'SETTINGS',
    subtitle: 'FULL CONTROL',
    description: 'Customize everything: themes, wallpapers, live wallpapers, DPI, grid size, icon packs, transitions, voice settings, and power save modes.',
    icon: 'tune',
    color: '#448aff',
    highlight: 'settings',
  },
]

export default function FeatureTour({ onClose }) {
  const [step, setStep] = useState(0)
  const [fade, setFade] = useState(true)
  const current = STEPS[step]

  const goTo = useCallback((idx) => {
    setFade(false)
    setTimeout(() => {
      setStep(idx)
      setFade(true)
    }, 200)
  }, [])

  const next = useCallback(() => {
    if (step < STEPS.length - 1) goTo(step + 1)
    else onClose()
  }, [step, goTo, onClose])

  const prev = useCallback(() => {
    if (step > 0) goTo(step - 1)
  }, [step, goTo])

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') next()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [next, prev, onClose])

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl" onClick={(e) => e.target === e.currentTarget && onClose()}>
      {/* Skip */}
      <button onClick={onClose} className="absolute top-5 right-5 font-mono-data text-[10px] text-on-surface-variant/40 hover:text-on-surface-variant tracking-wider uppercase transition-colors z-10">
        Skip
      </button>

      {/* Step counter */}
      <div className="absolute top-5 left-5 font-mono-data text-[10px] text-on-surface-variant/30 tracking-wider">
        {step + 1} / {STEPS.length}
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5 mb-10">
        {STEPS.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`h-1 rounded-full transition-all duration-300 ${i === step ? 'w-6' : 'w-1.5'}`}
            style={{ backgroundColor: i === step ? current.color : 'rgba(255,255,255,0.15)' }}
          />
        ))}
      </div>

      {/* Icon */}
      <div
        className={`w-20 h-20 rounded-2xl flex items-center justify-center border mb-6 transition-all duration-300 ${fade ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
        style={{ borderColor: `${current.color}40`, backgroundColor: `${current.color}10` }}
      >
        <span className="material-symbols-outlined text-4xl" style={{ color: current.color }}>{current.icon}</span>
      </div>

      {/* Text */}
      <div className={`text-center px-8 max-w-md transition-all duration-300 ${fade ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
        <h1 className="font-mono-data text-lg tracking-[0.3em] uppercase mb-1" style={{ color: current.color }}>
          {current.title}
        </h1>
        <p className="font-mono-data text-[10px] text-on-surface-variant/40 tracking-[0.2em] uppercase mb-4">
          {current.subtitle}
        </p>
        <p className="font-mono-data text-xs text-on-surface-variant/60 leading-relaxed">
          {current.description}
        </p>
      </div>

      {/* Nav buttons */}
      <div className="flex gap-4 mt-10">
        {step > 0 && (
          <button onClick={prev} className="px-6 py-2.5 rounded-lg border border-outline-variant/20 font-mono-data text-[10px] text-on-surface-variant/50 tracking-wider uppercase hover:bg-white/5 transition-all">
            Back
          </button>
        )}
        <button
          onClick={next}
          className="px-8 py-2.5 rounded-lg border font-mono-data text-[10px] tracking-wider uppercase transition-all active:scale-95"
          style={{ borderColor: `${current.color}50`, backgroundColor: `${current.color}15`, color: current.color }}
        >
          {step === STEPS.length - 1 ? 'Get Started' : 'Next'}
        </button>
      </div>

      {/* Keyboard hint */}
      <div className="absolute bottom-5 font-mono-data text-[8px] text-on-surface-variant/20 tracking-wider">
        ← → ARROW KEYS &nbsp;·&nbsp; SPACE TO ADVANCE &nbsp;·&nbsp; ESC TO SKIP
      </div>
    </div>
  )
}
