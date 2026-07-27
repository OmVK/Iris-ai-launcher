import { useRef, useEffect } from 'react'
import RemoveButton from './RemoveButton'

const TRACKS = [
  { title: "NEURAL_DRIFT", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", time: "LOFI_AMBIENT_CORE" },
  { title: "CYBER_RESONANCE", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", time: "NEON_BEAT_SYNTH" },
  { title: "VOID_ECHO", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3", time: "DEEP_COGNITIVE_PADS" }
]

export default function MediaWidget({ isPlaying, trackIndex, playerMode, selectedSystemPlayer, onSetPlayerMode, onPlayToggle, onSkip, onSetSystemPlayer, onLaunchSystemPlayer, onRemove, isAppActive }) {
  const canvasRef = useRef(null)
  const currentTrack = TRACKS[trackIndex]

  useEffect(() => {
    let animationId
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const cw = 160, ch = 36
    canvas.width = cw * dpr
    canvas.height = ch * dpr
    canvas.style.width = cw + 'px'
    canvas.style.height = ch + 'px'
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const draw = () => {
      ctx.clearRect(0, 0, cw, ch)
      const barCount = 18
      const barWidth = 6
      const gap = 3

      for (let i = 0; i < barCount; i++) {
        let height = 4
        if (isPlaying) {
          height = Math.floor(Math.random() * (ch - 4)) + 4
        }
        ctx.fillStyle = 'rgba(0, 242, 255, 0.7)'
        ctx.fillRect(i * (barWidth + gap), ch - height, barWidth, height)
      }

      if (isAppActive && isPlaying) {
        animationId = requestAnimationFrame(draw)
      }
    }

    if (isAppActive) draw()
    return () => { if (animationId) cancelAnimationFrame(animationId) }
  }, [isPlaying, isAppActive])

  return (
    <section style={{ order: 3 }} className="col-span-2 md:col-span-5 glass-surface rounded-lg p-4 relative group">
      <RemoveButton onClick={onRemove} />
      <div className="flex flex-col gap-2 flex-1 justify-between min-h-[170px]">
        <div className="flex justify-between items-center pb-1.5 border-b border-white/5">
          <h3 className="font-label-caps text-label-caps text-primary tracking-widest">MEDIA CORE</h3>
          <div className="flex border border-outline-variant/30 rounded bg-black/40 text-[8px] p-0.5 z-10 mr-5">
            {['SONIC', 'EXTERNAL', 'SYSTEM'].map(mode => (
              <button key={mode} onClick={() => onSetPlayerMode(mode)}
                className={`px-2 py-0.5 rounded transition-all ${playerMode === mode ? 'bg-[#00f2ff] text-black font-bold' : 'text-on-surface-variant'}`}>
                {mode}
              </button>
            ))}
          </div>
        </div>

        {playerMode === 'SONIC' && (
          <>
            <div className="flex gap-3 mt-1.5">
              <div className="w-12 h-12 bg-surface-container-highest rounded overflow-hidden flex-shrink-0 border border-white/5 relative">
                <div className={`absolute inset-0 bg-gradient-to-tr from-[#00f2ff]/20 to-[#d1bcff]/20 flex items-center justify-center ${isPlaying ? 'animate-[pulse_2s_infinite]' : ''}`}>
                  <span className="material-symbols-outlined text-primary-fixed-dim text-2xl">{isPlaying ? 'graphic_eq' : 'music_note'}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-label-caps text-[8px] text-primary-container tracking-wider uppercase">TRACK_{trackIndex + 1}_STREAM</p>
                <h3 className="font-mono-data text-xs font-bold text-on-surface truncate mt-0.5">{currentTrack.title}</h3>
                <p className="font-mono-data text-[9px] text-on-surface-variant/70 mt-0.5">{currentTrack.time}</p>
              </div>
            </div>
            <div className="my-1.5 flex items-center justify-center bg-black/20 rounded p-1 border border-white/5 h-10">
              <canvas ref={canvasRef} className="opacity-80" />
            </div>
            <div className="flex items-center justify-between mt-auto">
              <div className="flex items-center gap-3">
                <button onClick={() => onSkip(-1)} className="material-symbols-outlined text-on-surface-variant/60 hover:text-white transition-colors active:scale-90">skip_previous</button>
                <button onClick={onPlayToggle} className="material-symbols-outlined text-[#00f2ff] text-2xl active:scale-95">
                  {isPlaying ? 'pause_circle' : 'play_circle'}
                </button>
                <button onClick={() => onSkip(1)} className="material-symbols-outlined text-on-surface-variant/60 hover:text-white transition-colors active:scale-90">skip_next</button>
              </div>
              <span className="material-symbols-outlined text-[#00f2ff]/40 text-sm">spotify</span>
            </div>
          </>
        )}

        {playerMode === 'EXTERNAL' && (
          <>
            <div className="flex gap-3 mt-1.5">
              <div className="w-12 h-12 bg-surface-container-highest rounded overflow-hidden flex-shrink-0 border border-white/5 relative">
                <div className={`absolute inset-0 bg-gradient-to-tr from-[#00f2ff]/20 to-[#d1bcff]/20 flex items-center justify-center ${isPlaying ? 'animate-[pulse_2s_infinite]' : ''}`}>
                  <span className="material-symbols-outlined text-primary-fixed-dim text-2xl">{isPlaying ? 'graphic_eq' : 'music_note'}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-label-caps text-[8px] text-primary-container tracking-wider uppercase">NATIVE_MEDIA_SESSION</p>
                <h3 className="font-mono-data text-xs font-bold text-on-surface truncate mt-0.5">EXTERNAL PLAYER</h3>
                <p className="font-mono-data text-[9px] text-on-surface-variant/70 mt-0.5">CONTROLS ANY ACTIVE PLAYER</p>
              </div>
            </div>
            <div className="my-1.5 flex items-center justify-center bg-black/20 rounded p-1 border border-white/5 h-10">
              <canvas ref={canvasRef} className="opacity-80" />
            </div>
            <div className="flex items-center justify-between mt-auto">
              <div className="flex items-center gap-3">
                <button onClick={() => onSkip(-1)} className="material-symbols-outlined text-on-surface-variant/60 hover:text-white transition-colors active:scale-90">skip_previous</button>
                <button onClick={onPlayToggle} className="material-symbols-outlined text-[#00f2ff] text-2xl active:scale-95">
                  {isPlaying ? 'pause_circle' : 'play_circle'}
                </button>
                <button onClick={() => onSkip(1)} className="material-symbols-outlined text-on-surface-variant/60 hover:text-white transition-colors active:scale-90">skip_next</button>
              </div>
              <span className="material-symbols-outlined text-[#00f2ff]/40 text-sm">cell_tower</span>
            </div>
          </>
        )}

        {playerMode === 'SYSTEM' && (
          <>
            <div className="flex flex-col gap-2.5 py-2 flex-1 justify-center">
              <div className="flex flex-col gap-1">
                <label className="text-[8px] text-on-surface-variant uppercase">CHOOSE DEFAULT PLAYER</label>
                <select value={selectedSystemPlayer} onChange={e => onSetSystemPlayer(e.target.value)}
                  className="w-full bg-black/40 border border-outline-variant/30 rounded px-2 py-1 text-[10px] text-primary-fixed-dim pr-6 focus:outline-none cursor-pointer">
                  <option value="spotify">Spotify Music</option>
                  <option value="ytmusic">YouTube Music</option>
                  <option value="apple">Apple Music</option>
                  <option value="samsung">Samsung Player</option>
                  <option value="default">Android System Default</option>
                </select>
              </div>
              <button onClick={onLaunchSystemPlayer}
                className="w-full py-2 bg-primary-fixed-dim/20 border border-primary-fixed-dim/40 text-primary-fixed-dim text-[9.5px] font-bold rounded-lg hover:bg-primary-fixed-dim/30 transition-all active:scale-95 uppercase flex items-center justify-center gap-1 shadow-[0_0_10px_rgba(var(--primary-rgb),0.15)]">
                <span className="material-symbols-outlined text-xs">open_in_new</span>LAUNCH SYSTEM PLAYER
              </button>
            </div>
            <p className="text-[7px] text-on-surface-variant/35 text-center mt-auto font-mono-data leading-none">
              WILL LAUNCH MOBILE AUDIO PROTOCOL
            </p>
          </>
        )}
      </div>
    </section>
  )
}
