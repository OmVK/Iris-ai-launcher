import { useMemo } from 'react'
import { useNotificationStore } from '../stores/notificationStore'
import { launchApp } from './LauncherPlugin'
import HapticFeedback from '../utils/HapticFeedback'

export default function CondensedNotifLog({ onClose }) {
  const { history, clearHistory, deleteHistoryItem } = useNotificationStore()

  const handleLaunch = (pkg) => {
    if (pkg) {
      HapticFeedback.light()
      launchApp(pkg)
      onClose?.()
    }
  }

  const handleDelete = (e, id) => {
    e.stopPropagation()
    HapticFeedback.selection()
    deleteHistoryItem(id)
  }

  const handleClear = (e) => {
    e.stopPropagation()
    HapticFeedback.double()
    clearHistory()
  }

  return (
    <div className="flex flex-col h-full text-white/90 font-mono-data select-none">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-primary-fixed text-sm animate-pulse">history_edu</span>
          <span className="text-[9px] font-bold tracking-widest uppercase text-white/80">
            NOTIFICATION ARCHIVE ({history.length})
          </span>
        </div>
        {history.length > 0 && (
          <button
            onClick={handleClear}
            className="text-[8px] font-bold text-red-400 hover:text-red-300 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/30 transition-colors"
          >
            CLEAR LOG
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-2 pt-2 scroll-container pr-1 min-h-0">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-6 gap-2">
            <span className="material-symbols-outlined text-white/20 text-3xl">notifications_paused</span>
            <div className="text-[10px] text-white/40 tracking-wider uppercase font-semibold">NO MESSAGES RECORDED</div>
            <p className="text-[8px] text-white/25 max-w-[240px] leading-relaxed">
              System notifications are preserved here in real-time, even after being cleared from Android.
            </p>
          </div>
        ) : (
          history.map((item) => (
            <div
              key={item.id}
              onClick={() => handleLaunch(item.packageId)}
              className="group relative flex items-start gap-2.5 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-white/20 transition-all cursor-pointer active:scale-[0.99]"
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

                <p className="text-[9px] text-white/70 line-clamp-2 leading-relaxed break-words font-sans">
                  {item.text}
                </p>

                <div className="flex items-center justify-between mt-1 pt-1 border-t border-white/5">
                  <span className="text-[7.5px] text-primary-fixed/60 font-mono tracking-wider">
                    PRESERVED • {item.date}
                  </span>
                  <button
                    onClick={(e) => handleDelete(e, item.id)}
                    className="text-white/30 hover:text-red-400 p-0.5 transition-colors"
                    title="Delete log entry"
                  >
                    <span className="material-symbols-outlined text-[11px]">delete</span>
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
