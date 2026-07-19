import React from 'react'

export default function ThreatPhotoCapture({ onCapture }) {
  return (
    <div className="flex items-center gap-1.5 bg-white/5 border border-white/5 px-3 py-1 rounded">
      <span className="material-symbols-outlined text-[9px] text-[#ff1744] animate-pulse">gpp_maybe</span>
      <span>SECURE BIOMETRIC VAULT LOCK ACTIVE</span>
    </div>
  )
}
