import { useState, useEffect, useCallback, useRef } from 'react'
import { performGlobalAction, getActiveNotifications } from '../components/LauncherPlugin'
import useBadgeStore from '../stores/badgeStore'

export default function RecentsOverlay({ isOpen, onClose }) {
  const [cards, setCards] = useState([])
  const [screenshot, setScreenshot] = useState(null)
  const [touchStart, setTouchStart] = useState(null)
  const [touchCurrent, setTouchCurrent] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      loadRecentApps()
      captureScreenshot()
    }
  }, [isOpen])

  async function loadRecentApps() {
    const notifications = await getActiveNotifications()
    const recentApps = []
    const seen = new Set()

    for (const notif of notifications) {
      if (!seen.has(notif.packageId)) {
        seen.add(notif.packageId)
        recentApps.push({
          id: notif.packageId,
          packageId: notif.packageId,
          title: notif.title || notif.packageId,
          text: notif.text || '',
          postTime: notif.postTime,
        })
      }
    }

    setCards(recentApps.slice(0, 8))
  }

  async function captureScreenshot() {
    try {
      await performGlobalAction('GLOBAL_ACTION_TAKE_SCREENSHOT')
      const handler = (e) => {
        if (e.detail?.screenshot) {
          setScreenshot(e.detail.screenshot)
        }
        window.removeEventListener('iris-screenshot-captured', handler)
      }
      window.addEventListener('iris-screenshot-captured', handler)
      setTimeout(() => window.removeEventListener('iris-screenshot-captured', handler), 5000)
    } catch (e) {
      // Screenshot not available
    }
  }

  const handleTouchStart = useCallback((e) => {
    const touch = e.touches?.[0] || e
    setTouchStart({ x: touch.clientX, y: touch.clientY })
    setTouchCurrent({ x: touch.clientX, y: touch.clientY })
    setIsDragging(true)
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (!isDragging) return
    const touch = e.touches?.[0] || e
    setTouchCurrent({ x: touch.clientX, y: touch.clientY })
  }, [isDragging])

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchCurrent) {
      setIsDragging(false)
      return
    }

    const dx = touchCurrent.x - touchStart.x
    const dy = touchCurrent.y - touchStart.y

    if (Math.abs(dx) > 100 && Math.abs(dx) > Math.abs(dy)) {
      const direction = dx > 0 ? 'right' : 'left'
      if (direction === 'right') {
        setCards(prev => prev.slice(1))
      }
    }

    setTouchStart(null)
    setTouchCurrent(null)
    setIsDragging(false)
  }, [touchStart, touchCurrent])

  const dismissCard = useCallback((id) => {
    setCards(prev => prev.filter(c => c.id !== id))
  }, [])

  if (!isOpen) return null

  const dragOffset = touchStart && touchCurrent ? touchCurrent.x - touchStart.x : 0

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      {screenshot && (
        <div className="absolute inset-4 rounded-2xl overflow-hidden opacity-20">
          <img src={`data:image/jpeg;base64,${screenshot}`} className="w-full h-full object-cover" alt="" />
        </div>
      )}

      <div
        ref={containerRef}
        className="relative z-10 w-full max-w-lg px-4"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseMove={isDragging ? handleTouchMove : undefined}
        onMouseUp={handleTouchEnd}
      >
        <div className="text-center mb-6">
          <h2 className="text-sm font-semibold text-white/70 font-mono-data">RECENT TASKS</h2>
          <p className="text-[10px] text-white/30 font-mono-data">{cards.length} APP{cards.length !== 1 ? 'S' : ''}</p>
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar">
          {cards.length === 0 ? (
            <div className="text-center py-12">
              <span className="material-symbols-rounded text-white/20 text-4xl">apps</span>
              <p className="text-[10px] text-white/30 font-mono-data mt-2">NO RECENT TASKS</p>
            </div>
          ) : (
            cards.map((card, index) => {
              const cardDragOffset = index === 0 ? dragOffset : 0
              const opacity = Math.max(0.3, 1 - index * 0.1)
              const scale = Math.max(0.85, 1 - index * 0.03)

              return (
                <div
                  key={card.id}
                  className="glass-surface rounded-xl p-4 cursor-grab active:cursor-grabbing transition-all"
                  style={{
                    transform: `translateX(${cardDragOffset}px) scale(${scale})`,
                    opacity,
                    transition: isDragging ? 'none' : 'transform 0.2s ease-out, opacity 0.2s ease-out',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                        <span className="material-symbols-rounded text-white/60 text-lg">open_in_new</span>
                      </div>
                      <div>
                        <p className="text-xs text-white/80 font-mono-data">{card.title}</p>
                        <p className="text-[10px] text-white/30 font-mono-data">{card.packageId}</p>
                        {card.text && (
                          <p className="text-[9px] text-white/20 font-mono-data mt-0.5 truncate max-w-[200px]">{card.text}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); dismissCard(card.id) }}
                      className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-red-500/20 group transition-all"
                    >
                      <span className="material-symbols-rounded text-white/30 text-sm group-hover:text-red-400">close</span>
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="flex justify-center mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 text-white/40 text-[10px] font-mono-data hover:bg-white/10 transition-all"
          >
            CLEAR ALL
          </button>
        </div>
      </div>
    </div>
  )
}
