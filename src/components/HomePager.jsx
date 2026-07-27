import { useState, useRef, useCallback, useEffect, useMemo } from 'react'

export default function HomePager({ pages, onPageChange, className = '' }) {
  const [currentPage, setCurrentPage] = useState(0)
  const [touchStart, setTouchStart] = useState(null)
  const [touchDelta, setTouchDelta] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef(null)
  const totalPages = pages?.length || 1

  useEffect(() => {
    onPageChange?.(currentPage)
  }, [currentPage, onPageChange])

  const handleTouchStart = useCallback((e) => {
    const touch = e.touches?.[0]
    if (!touch) return
    setTouchStart({ x: touch.clientX, y: touch.clientY, time: Date.now() })
    setIsDragging(true)
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (!touchStart || !isDragging) return
    const touch = e.touches?.[0]
    if (!touch) return
    const dx = touch.clientX - touchStart.x
    setTouchDelta(dx)
  }, [touchStart, isDragging])

  const handleTouchEnd = useCallback(() => {
    if (!touchStart) {
      setIsDragging(false)
      return
    }

    const threshold = 80
    if (Math.abs(touchDelta) > threshold) {
      if (touchDelta < 0 && currentPage < totalPages - 1) {
        setCurrentPage(prev => prev + 1)
      } else if (touchDelta > 0 && currentPage > 0) {
        setCurrentPage(prev => prev - 1)
      }
    }

    setTouchStart(null)
    setTouchDelta(0)
    setIsDragging(false)
  }, [touchStart, touchDelta, currentPage, totalPages])

  const goToPage = useCallback((index) => {
    if (index >= 0 && index < totalPages) {
      setCurrentPage(index)
    }
  }, [totalPages])

  const dragOffset = isDragging ? touchDelta * 0.3 : 0

  if (!pages || totalPages === 0) return null

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div
        ref={containerRef}
        className="flex h-full transition-transform"
        style={{
          transform: `translateX(calc(-${currentPage * 100}% + ${dragOffset}px))`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseMove={isDragging ? handleTouchMove : undefined}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
      >
        {pages.map((page, index) => (
          <div
            key={index}
            className="flex-shrink-0 w-full h-full"
            style={{ minWidth: '100%' }}
          >
            {page}
          </div>
        ))}
      </div>
    </div>
  )
}
