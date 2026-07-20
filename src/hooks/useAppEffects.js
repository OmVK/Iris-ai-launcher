import { useEffect } from 'react'
import { isNative, setFullscreen, restartKeepAlive, setVaultPackages, addNotificationListener, dismissNotification } from '../components/LauncherPlugin'
import PowerSaveManager from '../utils/PowerSaveManager'
import { useAppStore } from '../stores/appStore'

export default function useAppEffects({ isAppActive, setIsAppActive, setShowChronoLock, setShowVaultExplorer, setIsVaultUnlocked, setShowLiveConfigModal, setActivePage, loadNativeApps, lockedApps, fullscreenActive, isVaultUnlocked, powerSaveMode }) {
  useEffect(() => { setVaultPackages(lockedApps) }, [lockedApps])

  useEffect(() => {
    setFullscreen(fullscreenActive)

    if (isNative) {
      let backHandle, stateHandle
      let isMounted = true
      import('@capacitor/app').then(({ App: CapacitorApp }) => {
        if (!isMounted) return
        backHandle = CapacitorApp.addListener('backButton', () => {
          setShowChronoLock(false); setShowVaultExplorer(false); setIsVaultUnlocked(false); setShowLiveConfigModal(false)
          const cur = useAppStore.getState().activePage
          if (cur !== 'home') setActivePage('home')
        })
        stateHandle = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
          setIsAppActive(isActive)
          if (isActive) { restartKeepAlive(); loadNativeApps() }
        })
      })
      return () => {
        isMounted = false
        backHandle?.then(h => h.remove()); stateHandle?.then(h => h.remove())
      }
    }
  }, [fullscreenActive])

  useEffect(() => {
    if (!isNative || !isAppActive) return
    const interval = PowerSaveManager.getPollingInterval('keepAlivePollMs')
    const watchdog = setInterval(() => {
      if (!document.hidden) restartKeepAlive()
    }, interval)
    const onVis = () => { if (!document.hidden) restartKeepAlive() }
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(watchdog); document.removeEventListener('visibilitychange', onVis) }
  }, [isAppActive, powerSaveMode])

  useEffect(() => {
    if (!isAppActive) return
    let lastCheckedMinute = -1
    const checkTasks = () => {
      const now = new Date()
      if (now.getMinutes() === lastCheckedMinute) return
      try {
        const cached = localStorage.getItem('iris_day_tasks')
        if (!cached) return
        let tasks = JSON.parse(cached)
        let changed = false
        tasks.forEach(task => {
          if (!task.done && task.time !== "ALL_DAY // DIRECTIVE" && !task.alarmTriggered) {
            const taskTime = new Date(task.time).getTime()
            if (!isNaN(taskTime) && Date.now() >= taskTime && Date.now() < taskTime + 120000) {
              task.alarmTriggered = true; changed = true
              window.dispatchEvent(new CustomEvent('TRIGGER_TASK_ALARM', { detail: task }))
            }
          }
        })
        if (changed) {
          localStorage.setItem('iris_day_tasks', JSON.stringify(tasks))
          window.dispatchEvent(new CustomEvent('TASKS_SYNCED_GLOBALLY'))
        }
      } catch (e) { console.warn('[IRIS] Task check failed:', e) }
      lastCheckedMinute = now.getMinutes()
    }
    const interval = setInterval(() => { if (!document.hidden) checkTasks() }, PowerSaveManager.getPollingInterval('taskCheckPollMs'))
    return () => clearInterval(interval)
  }, [isAppActive, powerSaveMode])

  useEffect(() => {
    const timeoutMs = parseInt(localStorage.getItem('vault_auto_lock') || '0')
    if (!isVaultUnlocked || !timeoutMs) return
    const timer = setTimeout(() => {
      setIsVaultUnlocked(false)
      setShowVaultExplorer(false)
    }, timeoutMs)
    return () => clearTimeout(timer)
  }, [isVaultUnlocked])

  useEffect(() => {
    const handle = (e) => {
      const { id, action } = e.detail
      try {
        const cached = localStorage.getItem('iris_day_tasks')
        if (!cached) return
        let tasks = JSON.parse(cached)
        tasks = tasks.map(task => {
          if (task.id === id) {
            if (action === 'MARK_DONE') return { ...task, done: true, alarmTriggered: true }
            if (action === 'SNOOZE_15') {
              const ct = new Date(task.time).getTime()
              const nt = new Date(ct + 15 * 60000)
              const localIso = new Date(nt.getTime() - (nt.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)
              return { ...task, done: false, alarmTriggered: false, time: localIso }
            }
          }
          return task
        })
        localStorage.setItem('iris_day_tasks', JSON.stringify(tasks))
        window.dispatchEvent(new CustomEvent('TASKS_SYNCED_GLOBALLY'))
      } catch (e) { console.warn('[IRIS] Task state update failed:', e) }
    }
    window.addEventListener('UPDATE_TASK_STATE', handle)
    return () => window.removeEventListener('UPDATE_TASK_STATE', handle)
  }, [])

  useEffect(() => {
    const listener = addNotificationListener((notif) => {
      try {
        const pkg = notif.packageId || notif.packageName
        if (!pkg) return
        const locked = useAppStore.getState().lockedApps
        if (Array.isArray(locked) && locked.includes(pkg)) {
          dismissNotification(notif.key || notif.id)
        }
      } catch (e) { console.error("Failed to process Vault notification intercept:", e) }
    })
    return () => { if (listener && typeof listener.remove === 'function') listener.remove() }
  }, [])
}
