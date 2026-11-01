import React, { useEffect, useRef, memo } from 'react'
import HapticFeedback from '../../utils/HapticFeedback'

const MediaWidget = memo(function MediaWidget({
  audioMode,
  isPlaying,
  trackIndex,
  tracks,
  systemPlayer,
  installedPlayers = [],
  activeMedia = {},
  onSwitchAudioMode,
  onSetSystemPlayer,
  onPrevTrack,
  onTogglePlay,
  onNextTrack,
  onLaunchSystemPlayer,
}) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rawRgb =
      getComputedStyle(document.documentElement).getPropertyValue('--primary-rgb').trim() || '0, 219, 231'
    const numBars = 24
    const barWidth = (canvas.width - (numBars - 1) * 3) / numBars

    const drawStaticIdle = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = `rgba(${rawRgb}, 0.25)`
      for (let i = 0; i < numBars; i++) {
        const x = i * (barWidth + 3)
        ctx.fillRect(x, canvas.height - 3, barWidth, 3)
      }
    }

    if (!isPlaying) {
      drawStaticIdle()
      return
    }

    let animId
    let phase = 0
    let lastDraw = 0

    const drawActive = (now) => {
      animId = requestAnimationFrame(drawActive)
      if (now - lastDraw < 50) return
      lastDraw = now

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      phase += 0.22
      ctx.fillStyle = `rgba(${rawRgb}, 0.85)`

      for (let i = 0; i < numBars; i++) {
        const wave1 = Math.sin(phase + i * 0.35) * 0.4 + 0.5
        const wave2 = Math.cos(phase * 1.6 - i * 0.5) * 0.3 + 0.3
        const barHeight = Math.max(4, (wave1 * 0.65 + wave2 * 0.35) * canvas.height * 0.88)
        const x = i * (barWidth + 3)
        const y = canvas.height - barHeight
        ctx.fillRect(x, y, barWidth, barHeight)
      }
    }

    animId = requestAnimationFrame(drawActive)
    return () => {
      if (animId) cancelAnimationFrame(animId)
    }
  }, [isPlaying])

  const selectedPlayerObj =
    installedPlayers.find((p) => p.packageId === systemPlayer) ||
    installedPlayers.find((p) => p.packageId === activeMedia?.packageId) ||
    null

  const activePlayerLabel = selectedPlayerObj
    ? selectedPlayerObj.label
    : activeMedia?.playerName || 'System Music Player'

  const hasLiveMetadata = Boolean(activeMedia?.title)
  const displayTitle =
    audioMode === 'SYSTEM'
      ? hasLiveMetadata
        ? activeMedia.title
        : isPlaying
          ? `${activePlayerLabel.toUpperCase()} // PLAYING`
          : `${activePlayerLabel.toUpperCase()} // READY`
      : tracks[trackIndex]?.title || 'STREAM NODE'

  const displaySubtitle =
    audioMode === 'SYSTEM'
      ? activeMedia?.artist
        ? `${activeMedia.artist}${activeMedia.album ? ` • ${activeMedia.album}` : ''}`
        : installedPlayers.length > 0
          ? `${installedPlayers.length} PLAYER${installedPlayers.length > 1 ? 'S' : ''} DETECTED ON DEVICE`
          : 'ANDROID MEDIA SESSION BRIDGE'
      : `${tracks[trackIndex]?.freq || '432Hz'} // STREAM LOOP`

  return (
    <section className="iris-card border border-white/10 rounded-2xl p-4 relative flex flex-col justify-between w-full h-full overflow-hidden hover:border-primary-fixed-dim/40 transition-colors shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center border-b border-white/10 pb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`material-symbols-outlined text-primary-fixed-dim text-sm shrink-0 ${
                isPlaying ? 'animate-spin' : ''
              }`}
            >
              album
            </span>
            <h3 className="font-label-caps text-[10px] text-primary-fixed-dim tracking-widest uppercase font-bold truncate">
              MEDIA CORE
            </h3>
          </div>

          <div className="flex border border-white/10 rounded-lg overflow-hidden bg-black/50 p-0.5 text-[7.5px] font-mono shrink-0">
            {[
              { id: 'SYSTEM', label: 'PLAYER' },
              { id: 'STREAM', label: 'STREAM' },
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => {
                  HapticFeedback.light()
                  onSwitchAudioMode(mode.id)
                }}
                className={`px-2 py-0.5 rounded transition-colors ${
                  audioMode === mode.id
                    ? 'bg-primary-fixed-dim text-black font-bold'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-black/50 rounded-xl p-2.5 border border-white/5 flex flex-col items-center">
          <canvas ref={canvasRef} width={220} height={38} className="w-full h-9 mb-1.5" />

          <div className="text-center w-full px-1">
            <p className="font-mono-data text-xs font-bold text-white truncate">{displayTitle}</p>
            <p className="text-[8px] font-mono-data text-primary-fixed-dim/75 uppercase tracking-wider mt-0.5 truncate">
              {displaySubtitle}
            </p>
          </div>
        </div>

        {audioMode === 'SYSTEM' && (
          <div className="flex items-center gap-1.5">
            <select
              value={systemPlayer}
              onChange={(e) => onSetSystemPlayer(e.target.value)}
              className="flex-1 min-w-0 bg-black/60 border border-white/10 rounded-lg px-2 py-1.5 text-[9px] font-mono-data text-primary-fixed-dim focus:outline-none cursor-pointer truncate"
            >
              {installedPlayers.map((player) => (
                <option key={player.packageId} value={player.packageId}>
                  {player.label}
                  {activeMedia?.packageId === player.packageId ? ' (Active)' : ''}
                </option>
              ))}
              <option value="default">System Default Music App</option>
            </select>
            <button
              type="button"
              onClick={() => {
                HapticFeedback.light()
                onLaunchSystemPlayer()
              }}
              className="px-2.5 py-1.5 rounded-lg bg-primary-fixed-dim/15 border border-primary-fixed-dim/30 text-primary-fixed-dim text-[8.5px] font-mono font-bold hover:bg-primary-fixed-dim/25 transition-colors shrink-0 flex items-center gap-1 active:scale-95"
            >
              <span className="material-symbols-outlined text-[11px]">open_in_new</span>
              OPEN
            </button>
          </div>
        )}

        <div className="flex justify-center items-center gap-5 pt-0.5">
          <button
            type="button"
            onClick={() => {
              HapticFeedback.light()
              onPrevTrack()
            }}
            className="text-on-surface-variant hover:text-primary-fixed-dim transition-colors active:scale-90 p-1"
            aria-label="Previous Track"
          >
            <span className="material-symbols-outlined text-xl">skip_previous</span>
          </button>

          <button
            type="button"
            onClick={() => {
              HapticFeedback.light()
              onTogglePlay()
            }}
            className="w-10 h-10 rounded-full bg-primary-fixed-dim/20 border border-primary-fixed-dim text-primary-fixed-dim flex items-center justify-center hover:bg-primary-fixed-dim hover:text-black transition-colors active:scale-95 shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)]"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            <span className="material-symbols-outlined text-xl">{isPlaying ? 'pause' : 'play_arrow'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              HapticFeedback.light()
              onNextTrack()
            }}
            className="text-on-surface-variant hover:text-primary-fixed-dim transition-colors active:scale-90 p-1"
            aria-label="Next Track"
          >
            <span className="material-symbols-outlined text-xl">skip_next</span>
          </button>
        </div>
      </div>
    </section>
  )
})

export default MediaWidget
