import React, { useState, useRef, useCallback } from 'react'
import HapticFeedback from '../../utils/HapticFeedback'
import WidgetContextMenuModal from './WidgetContextMenuModal'

export default function WidgetCardWrapper({
  id,
  index,
  totalCount,
  label,
  icon,
  widgetSpans,
  toggleWidgetSpan,
  minimizedWidgets,
  toggleWidgetMinimize,
  onRemove,
  onMoveUp,
  onMoveDown,
  onMoveToTop,
  onMoveToBottom,
  isEditMode,
  isSpacer,
  draggedId,
  setDraggedId,
  dragOverId,
  setDragOverId,
  onMoveWidget,
  defaultSpan = 'col-span-1',
  children,
}) {
  const isMinimized = !!minimizedWidgets[id]
  const currentSpan = widgetSpans[id] || defaultSpan
  const [showMenu, setShowMenu] = useState(false)
  const [menuStyle, setMenuStyle] = useState(null)
  const containerRef = useRef(null)
  const longPressTimer = useRef(null)
  const touchStartPos = useRef({ x: 0, y: 0 })

  const openMenuAtWidget = useCallback(() => {
    if (!containerRef.current) {
      setMenuStyle(null)
      setShowMenu(true)
      return
    }

    const rect = containerRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    const menuWidth = Math.min(320, viewportWidth - 24)
    const menuHeight = 250

    // Horizontal: center over widget card, clamp to margins
    let left = rect.left + (rect.width - menuWidth) / 2
    left = Math.max(12, Math.min(viewportWidth - menuWidth - 12, left))

    // Vertical: place directly over the widget card
    let top = rect.top + (rect.height - menuHeight) / 2

    // Safe boundaries: avoid status island at top (65px) and nav bar at bottom (80px)
    const minTop = 65
    const maxTop = Math.max(minTop, viewportHeight - menuHeight - 80)
    top = Math.max(minTop, Math.min(maxTop, top))

    setMenuStyle({
      position: 'fixed',
      left: `${Math.round(left)}px`,
      top: `${Math.round(top)}px`,
      width: `${Math.round(menuWidth)}px`,
    })
    setShowMenu(true)
  }, [])

  const handleTouchStart = (e) => {
    if (isEditMode) return
    if (e.target && e.target.closest('button, input, select, textarea, canvas, a, [data-interactive="true"]')) {
      return
    }
    const touch = e.touches[0]
    if (!touch) return
    touchStartPos.current = { x: touch.clientX, y: touch.clientY }

    if (longPressTimer.current) clearTimeout(longPressTimer.current)
    longPressTimer.current = setTimeout(() => {
      HapticFeedback.light()
      openMenuAtWidget()
    }, 700)
  }

  const handleTouchMove = (e) => {
    if (!longPressTimer.current) return
    const touch = e.touches[0]
    if (!touch) return
    const dist = Math.hypot(touch.clientX - touchStartPos.current.x, touch.clientY - touchStartPos.current.y)
    if (dist > 8) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleDragStart = (e) => {
    setDraggedId(id)
    e.dataTransfer.setData('text/plain', String(index))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverId !== id) setDragOverId(id)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const fromIndexStr = e.dataTransfer.getData('text/plain')
    const fromIndex = parseInt(fromIndexStr, 10)
    if (!isNaN(fromIndex) && fromIndex !== index) {
      onMoveWidget(fromIndex, index)
      HapticFeedback.light()
    }
    setDraggedId(null)
    setDragOverId(null)
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverId(null)
  }

  const isBeingDragged = draggedId === id
  const isTargetOfDrag = dragOverId === id && !isBeingDragged

  return (
    <div
      ref={containerRef}
      draggable={isEditMode}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
      className={`relative transition-all duration-300 ${currentSpan} ${
        isBeingDragged ? 'opacity-40 scale-[0.98] ring-2 ring-primary-fixed-dim/80 rounded-2xl' : ''
      } ${
        isTargetOfDrag ? 'ring-2 ring-primary-fixed-dim bg-primary-fixed-dim/10 scale-[1.01] rounded-2xl' : ''
      } ${
        showMenu ? 'ring-2 ring-primary-fixed-dim shadow-[0_0_25px_rgba(var(--primary-rgb),0.35)] rounded-2xl' : ''
      }`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onTouchCancel={handleTouchEnd}
      onContextMenu={(e) => {
        if (e.target && e.target.closest('button, input, select, textarea, canvas, a')) return
        e.preventDefault()
        HapticFeedback.light()
        openMenuAtWidget()
      }}
    >
      {/* Edit Mode HUD Toolbar */}
      {isEditMode && !isSpacer && (
        <div className="flex items-center justify-between px-3 py-1.5 mb-2 rounded-xl bg-black/80 border border-primary-fixed-dim/40 text-primary-fixed-dim backdrop-blur-md animate-fade-in shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)]">
          <div className="flex items-center gap-2 cursor-grab active:cursor-grabbing min-w-0 pr-2">
            <span className="material-symbols-outlined text-sm opacity-80 shrink-0">drag_indicator</span>
            <span className="text-[9px] font-mono uppercase tracking-wider font-bold truncate text-white/90">
              {label}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                HapticFeedback.light()
                onMoveUp()
              }}
              disabled={index === 0}
              className="w-6 h-6 rounded flex items-center justify-center bg-white/5 hover:bg-primary-fixed-dim/20 disabled:opacity-20 transition-all"
              title="Move Up"
            >
              <span className="material-symbols-outlined text-xs">arrow_upward</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                HapticFeedback.light()
                onMoveDown()
              }}
              disabled={index === totalCount - 1}
              className="w-6 h-6 rounded flex items-center justify-center bg-white/5 hover:bg-primary-fixed-dim/20 disabled:opacity-20 transition-all"
              title="Move Down"
            >
              <span className="material-symbols-outlined text-xs">arrow_downward</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                HapticFeedback.light()
                toggleWidgetSpan(id)
              }}
              className="px-2 h-6 rounded flex items-center gap-0.5 text-[8.5px] font-mono bg-white/5 hover:bg-primary-fixed-dim/20 border border-white/5"
              title="Cycle Width"
            >
              <span className="material-symbols-outlined text-xs">aspect_ratio</span>
              <span>{currentSpan === 'col-span-1' ? '1C' : currentSpan === 'col-span-2' ? '2C' : 'FULL'}</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                HapticFeedback.light()
                toggleWidgetMinimize(id)
              }}
              className="w-6 h-6 rounded flex items-center justify-center bg-white/5 hover:bg-primary-fixed-dim/20"
              title={isMinimized ? 'Expand' : 'Minimize'}
            >
              <span className="material-symbols-outlined text-xs">
                {isMinimized ? 'unfold_more' : 'unfold_less'}
              </span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                HapticFeedback.light()
                onRemove()
              }}
              className="w-6 h-6 rounded flex items-center justify-center bg-error/15 hover:bg-error/30 text-error"
              title="Remove"
            >
              <span className="material-symbols-outlined text-xs">delete</span>
            </button>
          </div>
        </div>
      )}

      {/* Minimized Placeholder Card */}
      {isMinimized && !isSpacer ? (
        <div
          onClick={() => {
            HapticFeedback.light()
            toggleWidgetMinimize(id)
          }}
          className="glass-surface border border-white/15 rounded-xl px-4 py-3 flex items-center justify-between shadow-lg hover:border-primary-fixed-dim/40 transition-all bg-black/60 backdrop-blur-md cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary-fixed-dim text-base">{icon || 'widgets'}</span>
            <span className="text-xs font-mono-data text-white/90 uppercase tracking-wider font-semibold">
              {label}
            </span>
            <span className="text-[9px] bg-primary-fixed-dim/20 text-primary-fixed-dim border border-primary-fixed-dim/30 px-1.5 py-0.5 rounded font-mono">
              MIN
            </span>
          </div>
          <span className="text-[8.5px] text-white/40 font-mono tracking-widest uppercase">
            TAP TO EXPAND
          </span>
        </div>
      ) : (
        <div className="relative w-full h-full">{children}</div>
      )}

      {/* Contextual Anchored Modal */}
      <WidgetContextMenuModal
        isOpen={showMenu}
        style={menuStyle}
        label={label}
        icon={icon}
        currentSpan={currentSpan}
        isMinimized={isMinimized}
        isSpacer={isSpacer}
        index={index}
        totalCount={totalCount}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onMoveToTop={onMoveToTop}
        onMoveToBottom={onMoveToBottom}
        onToggleSpan={() => toggleWidgetSpan(id)}
        onToggleMinimize={() => toggleWidgetMinimize(id)}
        onRemove={onRemove}
        onClose={() => setShowMenu(false)}
      />
    </div>
  )
}
