import { create } from 'zustand'
import { getAppTheme } from '../utils/notificationColor'

const STORAGE_KEY = 'iris_notification_history'
const MAX_HISTORY = 100

function loadSavedHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {}
  return []
}

let activeNotificationTimer = null

export const useNotificationStore = create((set, get) => ({
  history: loadSavedHistory(),
  activeNotification: null,
  activeGlow: null,

  recordNotification: (notif) => {
    if (!notif) return

    const pkg = notif.packageId || notif.packageName || ''
    const title = notif.title || ''
    const text = notif.text || notif.message || ''

    if (!pkg && !title && !text) return

    const theme = getAppTheme(pkg, notif.appName)
    const now = Date.now()

    // Deduplicate rapid identical notifications within 3 seconds
    const existing = get().history
    if (existing.length > 0) {
      const last = existing[0]
      if (last.packageId === pkg && last.title === title && last.text === text && (now - last.timestamp < 3000)) {
        return
      }
    }

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const dateStr = new Date().toLocaleDateString([], { month: 'short', day: 'numeric' })

    const record = {
      id: `${now}_${Math.random().toString(36).substring(2, 7)}`,
      key: notif.key || notif.id || String(now),
      packageId: pkg,
      appName: notif.appName || theme.name,
      title: title || theme.name,
      text: text || 'New notification received',
      time: timeStr,
      date: dateStr,
      timestamp: now,
      color: theme.color,
      glow: theme.glow,
      icon: theme.icon,
      dismissedFromSystem: false,
    }

    const updated = [record, ...existing].slice(0, MAX_HISTORY)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch {}

    // Pop the active notification and trigger glow
    set({
      history: updated,
      activeNotification: record,
      activeGlow: { color: theme.color, glow: theme.glow }
    })

    if (activeNotificationTimer) clearTimeout(activeNotificationTimer)
    activeNotificationTimer = setTimeout(() => {
      set({ activeNotification: null, activeGlow: null })
      activeNotificationTimer = null
    }, 6000)
  },

  dismissActive: () => {
    if (activeNotificationTimer) {
      clearTimeout(activeNotificationTimer)
      activeNotificationTimer = null
    }
    set({ activeNotification: null, activeGlow: null })
  },

  deleteHistoryItem: (id) => {
    const next = get().history.filter(item => item.id !== id)
    set({ history: next })
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {}
  },

  clearHistory: () => {
    set({ history: [] })
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]))
    } catch {}
  }
}))

export default useNotificationStore
