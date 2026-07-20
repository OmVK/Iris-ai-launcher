import React, { useEffect, useRef } from 'react'

export default function IrisVisualizer({ 
  size = 190, 
  isProcessing = false, 
  isListening = false,
  isAppActive = true
}) {
  const canvasRef = useRef(null)
  
  // Keep track of animated colors across renders without triggering React state updates
  const colorState = useRef({ r: 0, g: 240, b: 255 })
  const animState = useRef({ time: 0 })
  const particlesRef = useRef(null)
  const isProcessingRef = useRef(isProcessing)
  const isListeningRef = useRef(isListening)
  const isAppActiveRef = useRef(isAppActive)

  // Update refs when props change (read inside animation loop)
  useEffect(() => { isProcessingRef.current = isProcessing }, [isProcessing])
  useEffect(() => { isListeningRef.current = isListening }, [isListening])
  useEffect(() => { 
    isAppActiveRef.current = isAppActive
  }, [isAppActive])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId
    const numParticles = 350 // Reduced to separate dots clearly
    let isVisible = !document.hidden

    const handleVisibility = () => {
      isVisible = !document.hidden && isAppActiveRef.current
      if (isVisible && !animationFrameId) {
        render() // restart loop when tab becomes visible and app active
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    // Use a ref to persist particles across size changes for seamless flight animation
    if (!particlesRef.current) {
      particlesRef.current = []
      // Golden ratio spiral for even 3D sphere distribution
      for (let i = 0; i < numParticles; i++) {
        const phi = Math.acos(-1 + (2 * i) / numParticles)
        const theta = Math.sqrt(numParticles * Math.PI) * phi
        
        particlesRef.current.push({
          x0: Math.sin(phi) * Math.cos(theta),
          y0: Math.cos(phi),
          z0: Math.sin(phi) * Math.sin(theta),
          baseSize: Math.random() * 1.0 + 0.6, // Smaller base size for delicate dots
          
          // Random properties for organic, amorphous morphing
          phaseX: Math.random() * Math.PI * 2,
          phaseY: Math.random() * Math.PI * 2,
          phaseZ: Math.random() * Math.PI * 2,
          speedX: Math.random() * 1.5 + 0.5,
          speedY: Math.random() * 1.5 + 0.5,
          speedZ: Math.random() * 1.5 + 0.5
        })
      }
    }
    const particles = particlesRef.current

    const render = () => {
      if (!isVisible || !isAppActiveRef.current) {
        animationFrameId = null
        return
      }


      const time = animState.current.time

      // Determine target color based on state (read from refs for latest values)
      let tR = 0, tG = 240, tB = 255 
      if (isListeningRef.current) { 
        tR = 34; tG = 197; tB = 94 // Green
      } else if (isProcessingRef.current) { 
        tR = 168; tG = 85; tB = 247 // Purple
      } else {
        // Static idle color — steady cyan
        tR = 0; tG = 220; tB = 255
      }

      // Smoothly lerp towards target color (slower transition)
      colorState.current.r += (tR - colorState.current.r) * 0.01
      colorState.current.g += (tG - colorState.current.g) * 0.01
      colorState.current.b += (tB - colorState.current.b) * 0.01

      const r = Math.round(colorState.current.r)
      const g = Math.round(colorState.current.g)
      const b = Math.round(colorState.current.b)

      // Handle high DPI displays dynamically. ONLY reallocate canvas buffer if size actually changed to save GPU!
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const targetSize = size * dpr
      if (canvas.width !== targetSize) {
        canvas.width = targetSize
        canvas.height = targetSize
      }
      
      // We don't scale context, we just multiply math by dpr to prevent fuzzy scaling
      const cx = (size * dpr) * 0.5
      const cy = (size * dpr) * 0.5
      // Slightly larger radius to separate dots more
      const radius = (size * dpr) * 0.40

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Draw extremely subtle background glow to prevent 'over glow'
      const intensity = isProcessingRef.current ? 1.5 : isListeningRef.current ? 1.0 : 0.5
      // Ensure gradient ends exactly at canvas edge (cx)
      const glowGradient = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, cx)
      glowGradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.08 * intensity})`)
      glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      
      ctx.fillStyle = glowGradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Animate particles (slower movement)
      animState.current.time += 0.005
      const rotY = time * 0.6
      const rotX = time * 0.3

      // Bright outer borders for the dots
      const dotR = Math.min(255, r + 80)
      const dotG = Math.min(255, g + 80)
      const dotB = Math.min(255, b + 80)
      
      ctx.fillStyle = `rgba(${dotR}, ${dotG}, ${dotB}, 1.0)` // Solid bright dots

      // Pre-calculate rotation trigonometry outside the loop to save 1,400 Math calls per frame
      const cosRotY = Math.cos(rotY)
      const sinRotY = Math.sin(rotY)
      const cosRotX = Math.cos(rotX)
      const sinRotX = Math.sin(rotX)

      for (let i = 0; i < numParticles; i++) {
        const p = particles[i]
        
        // Morph the particle's local position randomly over time so it's not just a rigid sphere
        const morphAmp = 0.3 * intensity
        const mx = p.x0 + Math.sin(time * p.speedX + p.phaseX) * morphAmp
        const my = p.y0 + Math.sin(time * p.speedY + p.phaseY) * morphAmp
        const mz = p.z0 + Math.sin(time * p.speedZ + p.phaseZ) * morphAmp

        // 3D Rotation Matrix applied to the organically morphed coordinates
        const x1 = mx * cosRotY - mz * sinRotY
        const z1 = mx * sinRotY + mz * cosRotY
        const y1 = my

        const y2 = y1 * cosRotX - z1 * sinRotX
        const z2 = y1 * sinRotX + z1 * cosRotX
        const x2 = x1

        // Sine wave wobble to make it feel alive
        const wobble = Math.sin(y2 * 5 + time * 5) * 0.05 * intensity
        
        // Simple perspective projection
        const perspective = 3.0 / (3.0 - (z2 + wobble))
        const px = cx + (x2 + wobble) * radius * perspective
        const py = cy + y2 * radius * perspective
        
        const pSize = Math.max(0.6, (p.baseSize * perspective * dpr) * (1 + (isListeningRef.current ? 0.3 : 0)))

        // Cull particles that are behind the sphere for fake depth
        if (z2 > -0.5) {
          const alpha = Math.min(1, (z2 + 1) * 0.6)
          ctx.globalAlpha = alpha
          
          ctx.beginPath()
          ctx.arc(px, py, pSize, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      ctx.globalAlpha = 1.0
      if (isVisible) {
        animationFrameId = requestAnimationFrame(render)
      } else {
        animationFrameId = null
      }
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [size])

  return (
    <div className="relative flex items-center justify-center transition-transform duration-300" style={{ width: size, height: size }}>
      <canvas 
        ref={canvasRef} 
        style={{ width: '100%', height: '100%', outline: 'none', background: 'transparent' }} 
      />
    </div>
  )
}
