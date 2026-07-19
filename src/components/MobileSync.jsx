import { useState, useEffect } from 'react'
import { launchApp, getActiveNotifications, isNative } from './LauncherPlugin'
import PowerSaveManager from '../utils/PowerSaveManager'
import { usePowerStore } from '../stores/powerStore'

export default function MobileSync() {
  const powerSaveMode = usePowerStore(s => s.powerSaveMode)
  const [isConnected, setIsConnected] = useState(true)
  const [hardware, setHardware] = useState({ wifi: true, bluetooth: false, flash: false })
  const [notifications, setNotifications] = useState([])
  const [battery, setBattery] = useState(84)
  const [mobileApp, setMobileApp] = useState('')
  const [actionLog, setActionLog] = useState([])

  useEffect(() => {
    let batteryInstance = null
    let onLevelChange = null
    let onChargingChange = null
    const updateBatteryState = (bat) => {
      setBattery(Math.round(bat.level * 100))
    }

    if (navigator.getBattery) {
      navigator.getBattery().then(bat => {
        batteryInstance = bat
        updateBatteryState(bat)
        onLevelChange = () => updateBatteryState(bat)
        onChargingChange = () => {
          pushLog(`TELEMETRY: Power cell state changed. Charging: ${bat.charging ? 'ACTIVE' : 'OFF'}`)
        }
        bat.addEventListener('levelchange', onLevelChange)
        bat.addEventListener('chargingchange', onChargingChange)
      }).catch(() => {})
    }

    return () => {
      if (batteryInstance && onLevelChange) {
        batteryInstance.removeEventListener('levelchange', onLevelChange)
      }
      if (batteryInstance && onChargingChange) {
        batteryInstance.removeEventListener('chargingchange', onChargingChange)
      }
      batteryInstance = null
    }
  }, [])

  const fetchNotifications = async () => {
    if (!isNative) return
    try {
      const notifs = await getActiveNotifications()
      if (Array.isArray(notifs) && notifs.length > 0) {
        setNotifications(notifs.slice(0, 8).map(n => ({
          id: n.key || n.id || Date.now(),
          sender: n.packageId || n.packageName || 'Unknown',
          title: n.title || '',
          text: n.text || '',
          time: n.postTime ? new Date(n.postTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'
        })))
      }
    } catch (e) { console.warn('[IRIS] Notification sync failed:', e) }
  }

  useEffect(() => {
    fetchNotifications()
    const timer = setInterval(fetchNotifications, PowerSaveManager.getPollingInterval('networkPollMs'))
    return () => clearInterval(timer)
  }, [powerSaveMode])

  const pushLog = (msg) => {
    setActionLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 5)])
  }

  const toggleSwitch = (key) => {
    setHardware(prev => {
      const next = { ...prev, [key]: !prev[key] }
      pushLog(`HARDWARE: Toggled ${key.toUpperCase()} to ${next[key] ? 'ON' : 'OFF'}`)
      return next
    })
  }

  const handleLaunchApp = (e) => {
    e.preventDefault()
    const pkg = mobileApp.trim()
    if (!pkg) return
    if (isNative) {
      launchApp(pkg, pkg)
      pushLog(`REMOTE_APP: Launched Android app pkg: ${pkg}`)
    } else {
      pushLog(`REMOTE_APP: Launch requires native Android (${pkg})`)
    }
    setMobileApp('')
  }

  return (
    <div className="glass-surface glass-border rounded-xl p-4 space-y-4 font-mono-data text-xs text-[#dfe2ef]">
      <div className="flex justify-between items-center pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#00f2ff] text-sm animate-pulse">phonelink</span>
          <span className="font-label-caps text-label-caps text-primary-fixed-dim">DEVICE SYNC PORTAL</span>
        </div>
        <button
          onClick={() => {
            setIsConnected(prev => !prev)
            pushLog(`SYSTEM: Device link ${!isConnected ? 'ESTABLISHED' : 'DISCONNECTED'}`)
          }}
          className={`px-2 py-0.5 rounded text-[8px] font-bold border ${
            isConnected
              ? 'bg-[#00f2ff]/20 text-[#00f2ff] border-[#00f2ff]/40'
              : 'bg-error-container/20 text-error border-error/40'
          }`}
        >
          {isConnected ? 'LINK_ACTIVE' : 'LINK_OFF'}
        </button>
      </div>

      {isConnected ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-black/20 p-2.5 rounded border border-white/5 space-y-1">
              <span className="text-[8px] text-on-surface-variant font-label-caps uppercase">BATTERY_TELEMETRY</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xl font-bold text-primary-fixed-dim">{battery}%</span>
                <span className="material-symbols-outlined text-green-400">battery_full</span>
              </div>
              <div className="w-full bg-[#1c1f29] h-1 rounded-full overflow-hidden mt-1">
                <div className="bg-green-400 h-full" style={{ width: `${battery}%` }} />
              </div>
            </div>

            <div className="bg-black/20 p-2.5 rounded border border-white/5 space-y-1">
              <span className="text-[8px] text-on-surface-variant font-label-caps uppercase">HARDWARE_TOGGLES</span>
              <div className="flex justify-between mt-1">
                {Object.keys(hardware).map((key) => (
                  <button
                    key={key}
                    onClick={() => toggleSwitch(key)}
                    className={`w-7 h-7 rounded flex items-center justify-center border transition-all active:scale-90 ${
                      hardware[key]
                        ? 'bg-[#00f2ff]/20 border-[#00f2ff]/50 text-[#00f2ff]'
                        : 'bg-black/40 border-outline-variant/30 text-on-surface-variant/40'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xs">
                      {key === 'wifi' ? 'wifi' : key === 'bluetooth' ? 'bluetooth' : 'flashlight_on'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[8px] text-on-surface-variant font-label-caps uppercase">NOTIFICATION FEED</span>
              <button onClick={fetchNotifications} className="text-[7px] text-[#00f2ff] hover:underline">REFRESH</button>
            </div>
            <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
              {notifications.length === 0 ? (
                <div className="bg-black/30 p-2 rounded border border-white/5 text-[9px] text-on-surface-variant/40 text-center">
                  {isNative ? 'No active notifications' : 'Notification feed requires Android native'}
                </div>
              ) : (
                notifications.map((msg) => (
                  <div key={msg.id} className="bg-black/30 p-2 rounded border border-white/5 flex flex-col gap-0.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#00f2ff] text-[10px] truncate max-w-[60%]">{msg.title || msg.sender}</span>
                      <span className="text-[7px] text-on-surface-variant/50">{msg.time}</span>
                    </div>
                    <p className="text-[9px] text-on-surface-variant/90 leading-normal">{msg.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <form onSubmit={handleLaunchApp} className="bg-black/30 p-2.5 rounded border border-white/5 space-y-2">
            <span className="text-[8px] text-on-surface-variant font-label-caps uppercase">LAUNCH APP BY PACKAGE</span>
            <div className="flex gap-2">
              <input
                type="text"
                value={mobileApp}
                onChange={e => setMobileApp(e.target.value)}
                placeholder="com.spotify.music"
                className="flex-1 bg-black/40 border border-outline-variant/30 rounded text-[10px] p-1 text-[#dfe2ef] focus:outline-none"
              />
              <button
                type="submit"
                className="px-3 py-1 rounded bg-secondary-fixed-dim/20 text-secondary-fixed-dim border border-secondary-fixed-dim/30 text-[9px] font-bold"
              >
                LAUNCH
              </button>
            </div>
          </form>

          <div className="bg-black/60 rounded border border-white/5 p-2 h-16 overflow-y-auto scroll-container font-mono-data text-[7px] text-[#00f2ff]/60 leading-normal flex flex-col gap-0.5">
            {actionLog.length === 0 ? (
              <span className="italic text-on-surface-variant/30">NO COMMANDS EXECUTED</span>
            ) : (
              actionLog.map((log, i) => <p key={i}>{log}</p>)
            )}
          </div>
        </div>
      ) : (
        <div className="h-48 flex flex-col items-center justify-center text-center p-4">
          <span className="material-symbols-outlined text-4xl text-error animate-bounce mb-2">signal_cellular_nodata</span>
          <p className="font-label-caps text-[10px] text-error tracking-widest">DEVICE SYNC OFFLINE</p>
          <p className="text-[9px] text-on-surface-variant/40 mt-1">UPLINK PORTAL SHUTDOWN. ACTIVATE LINK CORE TO COMMUNICATE.</p>
        </div>
      )}
    </div>
  )
}
