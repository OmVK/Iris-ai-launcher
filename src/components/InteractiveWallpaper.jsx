import React, { useEffect, useRef } from 'react'

export default function InteractiveWallpaper({ mode = 'NONE', activePage = 'home', isAppActive = true }) {
  const canvasRef = useRef(null)
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 })

  useEffect(() => {
    if (!isAppActive) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId
    let lastOrientationTime = 0

    const getW = () => Math.max(window.innerWidth, window.screen.width || 0)
    const getH = () => Math.max(window.innerHeight, window.screen.height || 0)

    // Handle Resize
    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = getW() * dpr
      canvas.height = getH() * dpr
      canvas.style.width = getW() + 'px'
      canvas.style.height = getH() + 'px'
    }
    window.addEventListener('resize', resizeCanvas)
    resizeCanvas()

    // Mouse Listeners (scaled relative to canvas/viewport ratio)
    const handleMouseMove = (e) => {
      mouseRef.current.targetX = e.clientX * (canvas.width / window.innerWidth)
      mouseRef.current.targetY = e.clientY * (canvas.height / window.innerHeight)
    }
    const handleTouchMove = (e) => {
      if (e.touches && e.touches[0]) {
        mouseRef.current.targetX = e.touches[0].clientX * (canvas.width / window.innerWidth)
        mouseRef.current.targetY = e.touches[0].clientY * (canvas.height / window.innerHeight)
      }
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('touchmove', handleTouchMove)

    // Init Mouse Position in Center
    mouseRef.current = {
      x: canvas.width / 2,
      y: canvas.height / 2,
      targetX: canvas.width / 2,
      targetY: canvas.height / 2
    }

    // ----------------------------------------------------
    // 1. MATRIX MODE INITIALIZATION
    // ----------------------------------------------------
    const fontSize = 16
    const columns = Math.ceil(canvas.width / fontSize) + 2
    const drops = Array(columns).fill(1)
    const characters = "01011001010011011010100010111"

    // ----------------------------------------------------
    // 2. CYBER GRID INITIALIZATION
    // ----------------------------------------------------
    let gridOffset = 0

    // ----------------------------------------------------
    // 3. NEON PARTICLES INITIALIZATION
    // ----------------------------------------------------
    const particles = []
    const particleCount = 20
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        radius: Math.random() * 2 + 1
      })
    }

    // Animation Loop
    let lastTime = performance.now()

    const draw = () => {
      // Completely halt animation and CPU usage when the app is minimized
      if (!isAppActive) return;

      animId = requestAnimationFrame(draw)

      const now = performance.now()
      const elapsed = now - lastTime

      // Determine target FPS dynamically:
      // When on Home screen, run at full refresh speed (e.g. 60-120fps, targetInterval = 0)
      // When on settings, drawer, assistant, widgets, throttle background rendering to 24fps
      const targetFps = activePage === 'home' ? 60 : 24
      const targetInterval = 1000 / targetFps

      if (activePage !== 'home' && elapsed < targetInterval) {
        return
      }

      lastTime = now - (elapsed % targetInterval)

      // Fetch dynamic theme color every 60 frames to prevent layout thrashing
      if (!ctx.primaryRgb || Math.random() < 0.02) {
        const rootStyles = getComputedStyle(document.documentElement)
        ctx.primaryRgb = rootStyles.getPropertyValue('--primary-rgb').trim() || '0, 219, 231'
      }
      const themeRgb = ctx.primaryRgb

      // Ease mouse coordinates for smooth lag effect
      const m = mouseRef.current
      m.x += (m.targetX - m.x) * 0.08
      m.y += (m.targetY - m.y) * 0.08

      if (mode === 'NONE') {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        return
      }

      if (mode === 'MATRIX') {
        // Fade existing pixels to transparent for the trailing effect instead of painting black
        ctx.globalCompositeOperation = 'destination-out'
        ctx.fillStyle = 'rgba(255, 255, 255, 0.07)'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.globalCompositeOperation = 'source-over'

        ctx.fillStyle = `rgba(${themeRgb}, 0.65)` // Dynamic matrix rain
        ctx.font = `${fontSize}px monospace`

        for (let i = 0; i < drops.length; i++) {
          const text = characters.charAt(Math.floor(Math.random() * characters.length))
          ctx.fillText(text, i * fontSize, drops[i] * fontSize)

          if (drops[i] * fontSize > canvas.height && Math.random() > 0.985) {
            drops[i] = 0
          }
          drops[i]++
        }
      }

      else if (mode === 'CYBER_GRID') {
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Horizon parameters (tilted by mouse)
        const horizonY = canvas.height * 0.4 + (m.y - canvas.height / 2) * 0.15
        const centerX = canvas.width / 2 + (m.x - canvas.width / 2) * 0.25

        ctx.strokeStyle = `rgba(${themeRgb}, 0.12)`
        ctx.lineWidth = 1

        // Perspective converging lines
        const lineCount = 20
        for (let i = -lineCount; i <= lineCount; i++) {
          ctx.beginPath()
          ctx.moveTo(centerX, horizonY)
          ctx.lineTo(centerX + i * (canvas.width / 12), canvas.height)
          ctx.stroke()
        }

        // Animated horizontal lines moving down
        gridOffset += 0.45
        if (gridOffset >= 40) gridOffset = 0

        const hLines = 14
        for (let i = 0; i < hLines; i++) {
          // Exponential distribution to create perspective depth scaling
          const ratio = Math.pow(i / hLines, 2.2)
          const currY = horizonY + (canvas.height - horizonY) * ratio + gridOffset * (ratio + 0.05)
          if (currY > canvas.height) continue

          ctx.beginPath()
          ctx.moveTo(0, currY)
          ctx.lineTo(canvas.width, currY)
          ctx.stroke()
        }

        // Draw sunset glow on horizon line
        const gradient = ctx.createLinearGradient(0, horizonY - 40, 0, horizonY)
        gradient.addColorStop(0, 'transparent')
        gradient.addColorStop(1, `rgba(${themeRgb}, 0.15)`)
        ctx.fillStyle = gradient
        ctx.fillRect(0, horizonY - 40, canvas.width, 40)
      }

      else if (mode === 'NEON_PARTICLES') {
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Update and draw particles
        particles.forEach((p, index) => {
          p.x += p.vx
          p.y += p.vy

          // Boundaries bounce
          if (p.x < 0 || p.x > canvas.width) p.vx *= -1
          if (p.y < 0 || p.y > canvas.height) p.vy *= -1

          // Gravity repulsion from pointer
          const dx = p.x - m.x
          const dy = p.y - m.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 130) {
            const force = (130 - dist) / 130
            p.x += (dx / dist) * force * 1.8
            p.y += (dy / dist) * force * 1.8
          }

          // Draw particle
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(0, 219, 231, 0.45)'
          ctx.fill()

          // Draw connector links to other particles
          for (let j = index + 1; j < particles.length; j++) {
            const p2 = particles[j]
            const linkDx = p.x - p2.x
            const linkDy = p.y - p2.y
            const linkDist = Math.sqrt(linkDx * linkDx + linkDy * linkDy)

            if (linkDist < 100) {
              ctx.beginPath()
              ctx.moveTo(p.x, p.y)
              ctx.lineTo(p2.x, p2.y)
              ctx.strokeStyle = `rgba(${themeRgb}, ${((100 - linkDist) / 100) * 0.12})`
              ctx.lineWidth = 0.5
              ctx.stroke()
            }
          }

          // Draw connector links to pointer gravity
          if (dist < 150) {
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(m.x, m.y)
            ctx.strokeStyle = `rgba(${themeRgb}, ${((150 - dist) / 150) * 0.18})`
            ctx.lineWidth = 0.55
            ctx.stroke()
          }
        })
      }
    }

    if (isAppActive) {
      animId = requestAnimationFrame(draw)
    }

    const handleOrientation = (e) => {
      const now = Date.now()
      if (now - lastOrientationTime < 16) return
      lastOrientationTime = now
      if (e.gamma != null) {
        mouseRef.current.targetX = Math.max(0, Math.min(window.innerWidth, window.innerWidth / 2 + e.gamma * 3))
        mouseRef.current.targetY = Math.max(0, Math.min(window.innerHeight, window.innerHeight / 2 + (e.beta || 0) * 3))
      }
    }
    window.addEventListener('deviceorientation', handleOrientation)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('deviceorientation', handleOrientation)
    }
  }, [mode, activePage, isAppActive])

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 pointer-events-none transition-opacity duration-500" 
      style={{ 
        zIndex: 0,
        opacity: mode === 'NONE' ? 0 : 0.65 
      }} 
    />
  )
}
