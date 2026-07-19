import { useState, useEffect } from 'react'
import { isNative } from '../components/LauncherPlugin'

export default function VpnBrowser({ url, onClose }) {
  const [status, setStatus] = useState('Starting secure browser...')

  useEffect(() => {
    openBrowser()
  }, [])

  const openBrowser = async () => {
    if (isNative) {
      try {
        const { startVpnBrowser } = await import('../components/LauncherPlugin')
        await startVpnBrowser(url)
        setStatus('Browser opened — VPN active')
        // Close this overlay after launching native browser
        setTimeout(() => onClose?.(), 300)
      } catch (e) {
        console.error('Failed to start VPN browser:', e)
        setStatus('Failed: ' + e.message)
      }
    } else {
      // Web fallback: open in new tab
      window.open(url, '_blank')
      onClose?.()
    }
  }

  const handleClose = async () => {
    if (isNative) {
      try {
        const { stopVpnBrowser } = await import('../components/LauncherPlugin')
        await stopVpnBrowser()
      } catch (e) {}
    }
    onClose?.()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0e17]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-full border border-green-400/30 bg-green-400/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-xl text-green-400 animate-pulse">shield</span>
        </div>
        <p className="font-mono-data text-[10px] text-on-surface-variant/50 tracking-wider uppercase">{status}</p>
        <button onClick={handleClose} className="px-4 py-1.5 border border-red-400/30 rounded text-red-400 text-[10px] font-mono-data mt-4 active:scale-95">
          CANCEL
        </button>
      </div>
    </div>
  )
}
