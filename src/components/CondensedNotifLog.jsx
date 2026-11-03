import { useState, useEffect } from 'react'
import { useNotificationStore } from '../stores/notificationStore'
import { useAppsStore } from '../stores/appsStore'
import {
  launchApp,
  isNotificationAccessGranted,
  requestNotificationAccess,
  getArchivedNotifications,
} from './LauncherPlugin'
import HapticFeedback from '../utils/HapticFeedback'

export default function CondensedNotifLog({ onClose }) {
  const { history, clearHistory, deleteHistoryItem, syncNativeArchive } = useNotificationStore()
  const [hasPermission, setHasPermission] = useState(true)

  useEffect(() => {
    let cancelled = false
    const verifyAndSync = async () => {
      const granted = await isNotificationAccessGranted()
      if (!cancelled) setHasPermission(granted)
      const archived = await getArchivedNotifications()
      if (!cancelled && Array.isArray(archived) && archived.length > 0) {
        const installed = useAppsStore.getState().installedApps || []
        syncNativeArchive(archived, installed)
      }
    }
    verifyAndSync()
    return () => {
      cancelled = true
    }
  }, [syncNativeArchive])

  const handleGrantAccess = async (e) => {
    e.stopPropagation()
    HapticFeedback.light()
    await requestNotificationAccess()
  }

  const handleLaunch = (pkg) => {
    if (pkg) {
      HapticFeedback.light()
      launchApp(pkg)
      onClose?.()
    }
  }

  const handleDelete = (e, id) => {
    e.preventDefault()
    e.stopPropagation()
    HapticFeedback.selection()
    deleteHistoryItem(id)
  }

  const handleClear = (e) => {
    e.preventDefault()
    e.stopPropagation()
    HapticFeedback.double()
    clearHistory()
  }

  return (
    <div className="flex flex-col h-full text-white/90 font-mono-data select-none">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-primary-fixed text-sm">history_edu</span>
          <span className="text-[9px] font-bold tracking-widest uppercase text-white/80">
            NOTIFICATION ARCHIVE ({history.length})
          </span>
        </div>
        {history.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            onTouchEnd={(e) => { e.stopPropagation() }}
            className="text-[8.5px] font-bold text-red-300 hover:text-red-200 active:scale-95 px-2.5 py-1 rounded-md bg-red-500/20 border border-red-500/40 transition-all cursor-pointer"
          >
            CLEAR LOG
          </button>
        )}
      </div>

      {!hasPermission && (
        <div className="mt-2 p-2.5 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-amber-400 text-base shrink-0">notifications_off</span>
            <div className="min-w-0">
              <p className="text-[9px] font-bold text-amber-300 uppercase tracking-wider truncate">
                NOTIFICATION ACCESS REQUIRED
              </p>
              <p className="text-[7.5px] text-white/60 leading-tight">
                Enable listener to capture WhatsApp & deleted messages
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleGrantAccess}
            className="px-2.5 py-1 rounded-lg bg-amber-400 text-black text-[8px] font-bold uppercase tracking-wider shrink-0 active:scale-95 transition-transform"
          >
            ENABLE
          </button>
        </div>
      )}

      {/* List */}
      <div
        data-notif-scroll
        className="flex-1 overflow-y-auto space-y-2 pt-2 scroll-container pr-1 min-h-0"
      >
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-6 gap-2">
            <span className="material-symbols-outlined text-white/20 text-3xl">notifications_paused</span>
            <div className="text-[10px] text-white/40 tracking-wider uppercase font-semibold">NO MESSAGES RECORDED</div>
            <p className="text-[8px] text-white/25 max-w-[240px] leading-relaxed">
              Messages from WhatsApp, Instagram, Telegram & SMS are preserved here in real-time — even if deleted by the sender.
            </p>
          </div>
        ) : (
          history.map((item) => (
            <div
              key={item.id}
              onClick={() => handleLaunch(item.packageId)}
              className="group relative flex items-start gap-2.5 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-white/20 transition-colors cursor-pointer"
              style={{
                boxShadow: `inset 2px 0 0 ${item.color || '#00f2ff'}`
              }}
            >
              {/* App / Category Icon */}
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border"
                style={{
                  backgroundColor: `${item.color}22`,
                  borderColor: `${item.color}55`,
                  color: item.color
                }}
              >
                <span className="material-symbols-outlined text-sm">{item.icon || 'notifications'}</span>
              </div>

              {/* Message Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="text-[9px] font-bold uppercase truncate"
                      style={{ color: item.color }}
                    >
                      {item.appName}
                    </span>
                    <span className="text-[7.5px] text-white/40">•</span>
                    <span className="text-[9.5px] font-semibold text-white/90 truncate max-w-[130px]">
                      {item.title}
                    </span>
                  </div>
                  <span className="text-[8px] text-white/35 shrink-0">
                    {item.time}
                  </span>
                </div>

                <p className="text-[9px] text-white/85 line-clamp-2 leading-relaxed break-words font-sans">
                  {item.text}
                </p>

                <div className="flex items-center justify-between mt-1 pt-1 border-t border-white/5">
                  <div className="flex items-center gap-1.5">
                    {item.deletedBySender ? (
                      <span className="text-[7px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-red-300 tracking-wider uppercase">
                        DELETED BY SENDER
                      </span>
                    ) : item.dismissedFromSystem ? (
                      <span className="text-[7px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 tracking-wider uppercase">
                        CLEARED FROM BAR
                      </span>
                    ) : null}
                    <span className="text-[7.5px] text-primary-fixed/60 font-mono tracking-wider">
                      PRESERVED • {item.date}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, item.id)}
                    onTouchEnd={(e) => { e.stopPropagation() }}
                    className="text-white/40 hover:text-red-400 active:scale-90 px-1.5 py-0.5 rounded bg-white/5 hover:bg-red-500/15 transition-all cursor-pointer"
                    title="Delete log entry"
                  >
                    <span className="material-symbols-outlined text-[12px]">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
