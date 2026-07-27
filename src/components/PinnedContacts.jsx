import { useState, useMemo, useCallback, useEffect } from 'react'
import { launchApp } from '../components/LauncherPlugin'
import HudIcon from '../components/HudIcon'
import HudFallbackIcon from '../components/HudFallbackIcon'
import { IRIS_ICON_PACK } from '../utils/IrisIconPack'

export default function PinnedContacts({ contacts = [], onCall, onMessage, onContextMenu, globalIconTheme = 'DEFAULT' }) {
  const [scrollPosition, setScrollPosition] = useState(0)

  const handleContactClick = useCallback((contact) => {
    if (contact.phone) {
      onCall?.(contact)
    }
  }, [onCall])

  const handleContactLongPress = useCallback((contact) => {
    onContextMenu?.(contact)
  }, [onContextMenu])

  if (!contacts || contacts.length === 0) return null

  return (
    <div className="pinned-contacts-container w-full">
      <div className="flex items-center gap-1 px-2 mb-1">
        <span className="material-symbols-outlined text-[10px] text-white/20">contacts</span>
        <span className="text-[8px] text-white/20 font-mono-data tracking-wider">PINNED</span>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar px-2 py-1">
        {contacts.map((contact, index) => (
          <button
            key={contact.id || index}
            onClick={() => handleContactClick(contact)}
            onContextMenu={(e) => {
              e.preventDefault()
              handleContactLongPress(contact)
            }}
            className="flex flex-col items-center gap-1 min-w-[52px] group"
          >
            <div className="relative">
              <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border border-white/5 group-hover:border-[var(--primary-color)]/30 transition-all">
                {contact.icon ? (
                  <img src={contact.icon} alt={contact.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-white/40 text-lg">person</span>
                )}
              </div>
              {contact.unread > 0 && (
                <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[var(--primary-color)] flex items-center justify-center">
                  <span className="text-[7px] text-black font-bold">{contact.unread > 9 ? '9+' : contact.unread}</span>
                </div>
              )}
              {contact.lastCallTime && (
                <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-green-400/60" />
              )}
            </div>
            <span className="text-[8px] text-white/40 font-mono-data truncate max-w-[52px] text-center group-hover:text-white/60 transition-colors">
              {contact.name?.split(' ')[0] || 'Unknown'}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
