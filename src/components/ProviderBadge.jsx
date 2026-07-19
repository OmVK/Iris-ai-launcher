import { useState, useEffect } from 'react'
import { checkBackend, getBackendStatus, getBackendError } from '../utils/AIProviderManager'

const COLORS = {
  online: 'bg-emerald-400',
  offline: 'bg-red-400',
  unknown: 'bg-yellow-400',
}

const LABELS = {
  online: 'ONLINE',
  offline: 'OFFLINE',
  unknown: '??',
}

export default function ProviderBadge({ backend, showLabel = true }) {
  const [status, setStatus] = useState(() => getBackendStatus(backend))
  const [error, setError] = useState(() => getBackendError(backend))

  useEffect(() => {
    let mounted = true
    checkBackend(backend, true).then(({ available, error: err }) => {
      if (!mounted) return
      setStatus(available ? 'online' : 'offline')
      setError(err)
    })
    return () => { mounted = false }
  }, [backend])

  const dotColor = COLORS[status] || COLORS.unknown
  const label = status === 'online' ? LABELS.online : status === 'offline' ? LABELS.offline : LABELS.unknown

  return (
    <div className="flex items-center gap-1.5" title={error || `Backend: ${backend}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
      {showLabel && (
        <span className={`font-mono-data text-[7px] uppercase tracking-wider ${status === 'online' ? 'text-emerald-400' : status === 'offline' ? 'text-red-400' : 'text-yellow-400'}`}>
          {label}
        </span>
      )}
    </div>
  )
}
