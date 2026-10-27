import React, { useEffect } from 'react'
import HapticFeedback from '../../utils/HapticFeedback'
import { setContextMenuOpen } from '../../hooks/useAppGestures'

export default function WidgetContextMenuModal({
  isOpen,
  style,
  label,
  icon,
  currentSpan,
  isMinimized,
  isSpacer,
  index,
  totalCount,
  onMoveUp,
  onMoveDown,
  onMoveToTop,
  onMoveToBottom,
  onToggleSpan,
  onToggleMinimize,
  onRemove,
  onClose,
}) {
  useEffect(() => {
    if (!isOpen) return

    setContextMenuOpen(true)
    const scrollContainers = document.querySelectorAll('.scroll-container')
    scrollContainers.forEach((el) => {
      el.style.overflow = 'hidden'
      el.style.touchAction = 'none'
    })
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'

    const preventTouch = (e) => {
      if (!e.target.closest('[data-modal-menu="true"]')) {
        e.preventDefault()
      }
    }

    window.addEventListener('touchmove', preventTouch, { passive: false })

    return () => {
      setContextMenuOpen(false)
      scrollContainers.forEach((el) => {
        el.style.overflow = ''
        el.style.touchAction = ''
      })
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
      window.removeEventListener('touchmove', preventTouch)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 z-[9998] bg-transparent backdrop-blur-md animate-fade-in overscroll-none touch-none select-none"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onClose()
        }}
        onTouchStart={(e) => {
          e.stopPropagation()
        }}
        onTouchMove={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onClose()
        }}
      />
      <div
        data-modal-menu="true"
        style={style || { position: 'fixed', top: '25%', left: '16px', right: '16px' }}
        className="fixed z-[9999] glass-surface border border-primary-fixed-dim/60 rounded-2xl p-3.5 shadow-[0_12px_45px_rgba(0,0,0,0.9)] space-y-2.5 bg-[#020617]/95 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-fixed-dim text-base">
              {icon || 'widgets'}
            </span>
            <span className="text-xs font-mono-data font-bold text-white uppercase tracking-wider truncate max-w-[200px]">
              {label}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        <div className="space-y-1.5 pt-0.5">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => {
                HapticFeedback.light()
                onMoveUp()
                onClose()
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-white/90 bg-white/5 hover:bg-primary-fixed-dim/20 hover:text-primary-fixed-dim transition-colors disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-sm">arrow_upward</span>
              <span>Move Up</span>
            </button>
            <button
              type="button"
              disabled={index === totalCount - 1}
              onClick={() => {
                HapticFeedback.light()
                onMoveDown()
                onClose()
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-white/90 bg-white/5 hover:bg-primary-fixed-dim/20 hover:text-primary-fixed-dim transition-colors disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-sm">arrow_downward</span>
              <span>Move Down</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => {
                HapticFeedback.light()
                onMoveToTop()
                onClose()
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-white/90 bg-white/5 hover:bg-primary-fixed-dim/20 hover:text-primary-fixed-dim transition-colors disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-sm">vertical_align_top</span>
              <span>Move to Top</span>
            </button>
            <button
              type="button"
              disabled={index === totalCount - 1}
              onClick={() => {
                HapticFeedback.light()
                onMoveToBottom()
                onClose()
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-white/90 bg-white/5 hover:bg-primary-fixed-dim/20 hover:text-primary-fixed-dim transition-colors disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-sm">vertical_align_bottom</span>
              <span>Move to Bottom</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              HapticFeedback.light()
              onToggleSpan()
              onClose()
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium text-white/90 bg-white/5 hover:bg-primary-fixed-dim/20 hover:text-primary-fixed-dim transition-colors border border-transparent hover:border-primary-fixed-dim/30"
          >
            <span className="material-symbols-outlined text-base">aspect_ratio</span>
            <span>
              Resize ({currentSpan === 'col-span-1' ? '1 Column' : currentSpan === 'col-span-2' ? '2 Columns' : 'Full Width'})
            </span>
          </button>

          {!isSpacer && (
            <button
              type="button"
              onClick={() => {
                HapticFeedback.light()
                onToggleMinimize()
                onClose()
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium text-white/90 bg-white/5 hover:bg-primary-fixed-dim/20 hover:text-primary-fixed-dim transition-colors border border-transparent hover:border-primary-fixed-dim/30"
            >
              <span className="material-symbols-outlined text-base">
                {isMinimized ? 'unfold_more' : 'unfold_less'}
              </span>
              <span>{isMinimized ? 'Expand Height' : 'Minimize Height'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              HapticFeedback.light()
              onRemove()
              onClose()
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium text-error bg-error/10 hover:bg-error/20 transition-colors border border-transparent hover:border-error/30"
          >
            <span className="material-symbols-outlined text-base">delete_forever</span>
            <span>Remove From Dashboard</span>
          </button>
        </div>
      </div>
    </>
  )
}
