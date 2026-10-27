import React, { useRef, useEffect } from 'react'
import HapticFeedback from '../../utils/HapticFeedback'

const TRACKS = [
  { title: 'NEURAL_DRIFT', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', time: 'LOFI_AMBIENT_CORE' },
  { title: 'CYBER_RESONANCE', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', time: 'NEON_BEAT_SYNTH' },
  { title: 'VOID_ECHO', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', time: 'DEEP_COGNITIVE_PADS' },
]

export default function MediaWidget({
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
}) {
  const canvasRef = useRef(null)
  const currentTrack = TRACKS[trackIndex] || TRACKS[0]
  const phaseRef = useRef(0)

  useEffect(() => {
    let animationId
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const cw = 150
    const ch = 30
    canvas.width = cw * dpr
    canvas.height = ch * dpr
    canvas.style.width = cw + 'px'
    canvas.style.height = ch + 'px'
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const draw = () => {
      ctx.clearRect(0, 0, cw, ch)
      phaseRef.current += 0.05

      if (isPlaying) {
        // Equalizer spectrum bars
        const barCount = 15
        const barWidth = 6
        const gap = 4
        for (let i = 0; i < barCount; i++) {
          const wave = Math.sin(phaseRef.current * 1.5 + i * 0.4) * 0.3 + 0.7
          const rand = Math.random() * 0.4 + 0.6
          const height = Math.max(4, Math.floor(wave * rand * (ch - 4)))
          ctx.fillStyle = 'rgba(var(--primary-rgb, 0, 219, 231), 0.8)'
          ctx.fillRect(i * (barWidth + gap), ch - height, barWidth, height)
        }
      } else {
        // Idle ambient sine wave
        ctx.beginPath()
        ctx.strokeStyle = 'rgba(var(--primary-rgb, 0, 219, 231), 0.35)'
        ctx.lineWidth = 1.5
        for (let x = 0; x < cw; x += 3) {
          const y = ch / 2 + Math.sin(x * 0.06 + phaseRef.current * 0.8) * 4
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }

      if (isAppActive) {
        animationId = requestAnimationFrame(draw)
      }
    }

    if (isAppActive) draw()
    return () => {
      if (animationId) cancelAnimationFrame(animationId)
    }
  }, [isPlaying, isAppActive])

  return (
    <section className="glass-surface border border-white/10 rounded-2xl p-4 relative flex flex-col justify-between w-full h-full overflow-hidden hover:border-primary-fixed-dim/40 transition-all bg-[#080d16]/85 backdrop-blur-xl">
      <div className="flex justify-between items-center pb-2 border-b border-white/10">
        <div>
          <h3 className="font-label-caps text-[10px] text-primary-fixed-dim tracking-widest uppercase font-bold">
            MEDIA CORE
          </h3>
          <p className="text-[8px] font-mono-data text-on-surface-variant/70 uppercase">
            {playerMode === 'SONIC' ? 'SYNTH ENGINE' : playerMode === 'EXTERNAL' ? 'ANDROID SYSTEM DISPATCH' : 'STREAM STREAM'}
          </p>
        </div>

        <div className="flex border border-white/10 rounded-lg bg-black/50 text-[8px] p-0.5">
          {['SONIC', 'EXTERNAL', 'SYSTEM'].map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                HapticFeedback.light()
                onSetPlayerMode(mode)
              }}
              className={`px-2 py-0.5 rounded transition-all font-mono font-bold ${
                playerMode === mode
                  ? 'bg-primary-fixed-dim text-black shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]'
                  : 'text-on-surface-variant/70 hover:text-white'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="py-2.5 flex items-center justify-between">
        <div className="min-w-0 pr-2 flex-1">
          <p className="text-xs font-mono font-bold uppercase truncate text-white">
            {playerMode === 'EXTERNAL' ? 'SYSTEM AUDIO GATEWAY' : currentTrack.title}
          </p>
          <p className="text-[8.5px] font-mono text-primary-fixed-dim/80 uppercase tracking-wider mt-0.5 truncate">
            {playerMode === 'EXTERNAL' ? 'SPOTIFY // YT MUSIC // AUDIBLE' : currentTrack.time}
          </p>
        </div>
        <canvas ref={canvasRef} className="shrink-0" />
      </div>

      <div className="pt-2 border-t border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              HapticFeedback.light()
              onSkip(-1)
            }}
            className="w-8 h-8 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center text-white hover:border-primary-fixed-dim/40 active:scale-95 transition-all"
            title="Previous"
          >
            <span className="material-symbols-outlined text-base">skip_previous</span>
          </button>

          <button
            type="button"
            onClick={() => {
              HapticFeedback.light()
              onPlayToggle()
            }}
            className="w-10 h-8 rounded-lg bg-primary-fixed-dim/20 border border-primary-fixed-dim/50 text-primary-fixed-dim flex items-center justify-center hover:bg-primary-fixed-dim/30 active:scale-95 transition-all shadow-[0_0_12px_rgba(var(--primary-rgb),0.2)]"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            <span className="material-symbols-outlined text-lg">
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              HapticFeedback.light()
              onSkip(1)
            }}
            className="w-8 h-8 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center text-white hover:border-primary-fixed-dim/40 active:scale-95 transition-all"
            title="Next"
          >
            <span className="material-symbols-outlined text-base">skip_next</span>
          </button>
        </div>

        {playerMode === 'SYSTEM' ? (
          <div className="flex items-center gap-1.5">
            <select
              value={selectedSystemPlayer}
              onChange={(e) => onSetSystemPlayer(e.target.value)}
              className="bg-black/60 border border-white/10 text-white rounded px-1.5 py-1 text-[8.5px] font-mono"
            >
              <option value="spotify">Spotify</option>
              <option value="ytmusic">YT Music</option>
              <option value="apple">Apple</option>
              <option value="samsung">Samsung</option>
              <option value="default">Default</option>
            </select>
            <button
              type="button"
              onClick={onLaunchSystemPlayer}
              className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-primary-fixed-dim hover:bg-primary-fixed-dim/20"
              title="Launch App"
            >
              <span className="material-symbols-outlined text-xs">launch</span>
            </button>
          </div>
        ) : (
          <span className="text-[7.5px] font-mono text-white/40 uppercase tracking-widest">
            {isPlaying ? 'AUDIO ACTIVE' : 'IDLE // READY'}
          </span>
        )}
      </div>
    </section>
  )
}
