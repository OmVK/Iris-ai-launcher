import { create } from 'zustand'
import { getAppTheme } from '../utils/notificationColor'
import { clearArchivedNotifications, deleteArchivedNotification } from '../components/LauncherPlugin'

const STORAGE_KEY = 'iris_notification_history'
const CLEARED_AT_KEY = 'iris_notif_cleared_at'
const DELETED_SIGS_KEY = 'iris_notif_deleted_sigs'
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

function getClearedAt() {
  try {
    return parseInt(localStorage.getItem(CLEARED_AT_KEY) || '0', 10) || 0
  } catch {
    return 0
  }
}

function getDeletedSigs() {
  try {
    const raw = localStorage.getItem(DELETED_SIGS_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

function addDeletedSig(sig) {
  try {
    const set = getDeletedSigs()
    set.add(sig)
    const arr = Array.from(set).slice(-200)
    localStorage.setItem(DELETED_SIGS_KEY, JSON.stringify(arr))
  } catch {}
}

function isDeletedMessageText(text) {
  if (!text) return false
  const lower = String(text).trim().toLowerCase()
  return (
    lower === 'this message was deleted' ||
    lower === 'this message was deleted.' ||
    lower === 'you deleted this message' ||
    lower === 'you deleted this message.' ||
    lower === 'message deleted' ||
    lower.includes('this message was deleted') ||
    lower.includes('unsent a message')
  )
}

function formatRecord(notif, installedApps = []) {
  const pkg = notif.packageId || notif.packageName || ''
  const matchedApp = installedApps.find(a => a.packageId === pkg || a.id === pkg)
  const resolvedAppName = matchedApp?.label || matchedApp?.name || notif.appName || ''
  const theme = getAppTheme(pkg, resolvedAppName)
  const ts = notif.timestamp || notif.postTime || Date.now()
  const dt = new Date(ts)

  return {
    id: notif.id || `${ts}_${Math.random().toString(36).substring(2, 7)}`,
    key: notif.key || String(ts),
    packageId: pkg,
    appName: resolvedAppName || theme.name,
    title: notif.title || theme.name,
    text: notif.text || notif.message || 'New notification received',
    time: notif.time || dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: notif.date || dt.toLocaleDateString([], { month: 'short', day: 'numeric' }),
    timestamp: ts,
    postTime: notif.postTime || ts,
    color: theme.color,
    glow: theme.glow,
    icon: theme.icon,
    deletedBySender: !!notif.deletedBySender,
    dismissedFromSystem: !!notif.dismissedFromSystem,
  }
}

let activeNotificationTimer = null

export const useNotificationStore = create((set, get) => ({
  history: loadSavedHistory(),
  activeNotification: null,
  activeGlow: null,

  syncNativeArchive: (nativeList, installedApps = []) => {
    if (!Array.isArray(nativeList) || nativeList.length === 0) return

    const clearedAt = getClearedAt()
    const deletedSigs = getDeletedSigs()
    const existing = get().history
    const bySignature = new Map()

    for (const item of existing) {
      const sig = `${item.packageId}|${item.title}|${item.text}`
      bySignature.set(sig, item)
    }

    let changed = false
    const merged = [...existing]

    for (const raw of nativeList) {
      const pkg = raw.packageId || raw.packageName || ''
      const title = raw.title || ''
      const text = raw.text || ''
      if (!pkg && !title && !text) continue

      const itemTs = Math.max(raw.timestamp || 0, raw.postTime || 0)
      if (clearedAt > 0 && itemTs > 0 && itemTs <= clearedAt) {
        continue
      }

      if (isDeletedMessageText(text)) {
        const matchIdx = merged.findIndex(
          m => m.packageId === pkg && (!title || m.title === title || m.title.includes(title) || title.includes(m.title))
        )
        if (matchIdx !== -1 && !merged[matchIdx].deletedBySender) {
          merged[matchIdx] = { ...merged[matchIdx], deletedBySender: true }
          changed = true
        }
        continue
      }

      const sig = `${pkg}|${title}|${text}`
      if (deletedSigs.has(sig)) continue

      const found = bySignature.get(sig)
      if (found) {
        if ((raw.deletedBySender && !found.deletedBySender) || (raw.dismissedFromSystem && !found.dismissedFromSystem)) {
          const idx = merged.findIndex(m => m.id === found.id)
          if (idx !== -1) {
            merged[idx] = {
              ...merged[idx],
              deletedBySender: found.deletedBySender || !!raw.deletedBySender,
              dismissedFromSystem: found.dismissedFromSystem || !!raw.dismissedFromSystem,
            }
            changed = true
          }
        }
      } else {
        const formatted = formatRecord(raw, installedApps)
        merged.push(formatted)
        bySignature.set(sig, formatted)
        changed = true
      }
    }

    if (changed) {
      merged.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      const trimmed = merged.slice(0, MAX_HISTORY)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
      } catch {}
      set({ history: trimmed })
    }
  },

  recordNotification: (notif, options = { popBanner: true }) => {
    if (!notif) return

    const pkg = notif.packageId || notif.packageName || ''
    const title = (notif.title || '').trim()
    const text = (notif.text || notif.message || '').trim()

    if (!pkg && !title && !text) return

    const existing = get().history
    const now = Date.now()

    if (isDeletedMessageText(text)) {
      const matchIdx = existing.findIndex(
        item => item.packageId === pkg && (!title || item.title === title || item.title.includes(title) || title.includes(item.title))
      )
      if (matchIdx !== -1) {
        const updated = [...existing]
        updated[matchIdx] = { ...updated[matchIdx], deletedBySender: true }
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
        } catch {}
        set({ history: updated })
        return
      }
    }

    const duplicateIdx = existing.slice(0, 25).findIndex(
      item => item.packageId === pkg && item.title === title && item.text === text && Math.abs(now - (item.timestamp || 0)) < 60000
    )
    if (duplicateIdx !== -1) {
      if (notif.deletedBySender && !existing[duplicateIdx].deletedBySender) {
        const updated = [...existing]
        updated[duplicateIdx] = { ...updated[duplicateIdx], deletedBySender: true }
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
        } catch {}
        set({ history: updated })
      }
      return
    }

    const record = formatRecord({ ...notif, title, text, timestamp: now }, [])

    const updated = [record, ...existing].slice(0, MAX_HISTORY)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch {}

    if (options?.popBanner !== false) {
      set({
        history: updated,
        activeNotification: record,
        activeGlow: { color: record.color, glow: record.glow }
      })

      if (activeNotificationTimer) clearTimeout(activeNotificationTimer)
      activeNotificationTimer = setTimeout(() => {
        set({ activeNotification: null, activeGlow: null })
        activeNotificationTimer = null
      }, 4500)
    } else {
      set({ history: updated })
    }
  },

  dismissActive: () => {
    if (activeNotificationTimer) {
      clearTimeout(activeNotificationTimer)
      activeNotificationTimer = null
    }
    set({ activeNotification: null, activeGlow: null })
  },

  deleteHistoryItem: (id) => {
    const current = get().history
    const target = current.find(item => item.id === id)
    const next = current.filter(item => item.id !== id)
    set({ history: next })
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {}
    if (target) {
      const sig = `${target.packageId}|${target.title}|${target.text}`
      addDeletedSig(sig)
      deleteArchivedNotification(target.id)
      deleteArchivedNotification(sig)
    } else {
      deleteArchivedNotification(id)
    }
  },

  clearHistory: () => {
    if (activeNotificationTimer) {
      clearTimeout(activeNotificationTimer)
      activeNotificationTimer = null
    }
    const now = Date.now()
    try {
      localStorage.setItem(STORAGE_KEY, '[]')
      localStorage.setItem(CLEARED_AT_KEY, String(now))
      localStorage.setItem(DELETED_SIGS_KEY, '[]')
    } catch {}
    set({ history: [], activeNotification: null, activeGlow: null })
    clearArchivedNotifications()
  }
}))

export default useNotificationStore
