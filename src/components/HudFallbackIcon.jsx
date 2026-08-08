import React from 'react'

const HudFallbackIcon = React.memo(function HudFallbackIcon({ src, size }) {
  <div style={{
    width: `${size}px`,
    height: `${size}px`,
  }} className="flex items-center justify-center icon-circle-minimal-outline overflow-hidden hud-icon-transition bg-black/20">
    <img 
      src={src} 
      className="w-[85%] h-[85%] object-contain opacity-85" 
      style={{ filter: 'grayscale(1) sepia(1) hue-rotate(140deg) saturate(3) brightness(1.2)' }} 
      alt="" 
    />
  </div>
})

export default HudFallbackIcon
