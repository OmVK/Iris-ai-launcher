import {
  toggleFlashlight,
  setFlashlight,
  optimizeMemory,
  setSoundMode,
  cycleRingerMode,
  launchApp,
  openSystemSettings,
  performAccessibilityAction,
  getScreenTimeStats,
  executeShellCommand,
} from '../components/LauncherPlugin'
import { useAppsStore } from '../stores/appsStore'
import { useNotificationStore } from '../stores/notificationStore'

export async function executeDeviceAgentIntent(prompt) {
  if (!prompt || typeof prompt !== 'string') return ''
  const lower = prompt.toLowerCase().trim()
  const executedLogs = []

  try {
    if (/\b(turn\s+on|enable|activate)\b.*\b(flashlight|torch)\b/.test(lower)) {
      await setFlashlight(true)
      executedLogs.push('Executed hardware action: Flashlight turned ON.')
    } else if (/\b(turn\s+off|disable|deactivate)\b.*\b(flashlight|torch)\b/.test(lower)) {
      await setFlashlight(false)
      executedLogs.push('Executed hardware action: Flashlight turned OFF.')
    } else if (/\b(toggle|switch)\b.*\b(flashlight|torch)\b/.test(lower)) {
      const res = await toggleFlashlight()
      executedLogs.push(`Executed hardware action: Flashlight toggled (${res?.status ? 'ON' : 'OFF'}).`)
    }

    if (/\b(boost\s+ram|clear\s+ram|free\s+up\s+(ram|memory)|optimize\s+(ram|memory)|clean\s+memory)\b/.test(lower)) {
      const res = await optimizeMemory()
      executedLogs.push(
        res?.freedMb > 0
          ? `Executed OS Memory Boost: Reclaimed +${res.freedMb} MB RAM (${res.killedCount || 0} background packages swept).`
          : 'Executed OS Memory Boost: System RAM is already at peak optimal efficiency.'
      )
    }

    if (/\b(set|put|switch|turn)\b.*\b(silent|mute|do\s+not\s+disturb)\b/.test(lower)) {
      await setSoundMode('mute')
      executedLogs.push('Executed audio action: Ringer mode set to SILENT.')
    } else if (/\b(set|put|switch|turn)\b.*\b(vibrate|vibration)\b/.test(lower)) {
      await setSoundMode('vibrate')
      executedLogs.push('Executed audio action: Ringer mode set to VIBRATE.')
    } else if (/\b(set|put|switch|turn)\b.*\b(ringer|sound)\s+(on|normal)\b/.test(lower)) {
      await setSoundMode('normal')
      executedLogs.push('Executed audio action: Ringer mode set to NORMAL.')
    } else if (/\bcycle\s+ringer\b/.test(lower)) {
      const mode = await cycleRingerMode()
      executedLogs.push(`Executed audio action: Cycled ringer mode to ${String(mode).toUpperCase()}.`)
    }

    if (/\b(lock\s+(the\s+|my\s+)?(screen|phone|device))\b/.test(lower)) {
      const res = await performAccessibilityAction('lock_screen')
      executedLogs.push(
        res?.success
          ? 'Executed Accessibility global action: Device screen locked.'
          : 'Attempted to lock screen (requires IRIS Accessibility Service enabled in Settings).'
      )
    }

    if (/\b(take\s+a?\s*screenshot|capture\s+screen)\b/.test(lower)) {
      const res = await performAccessibilityAction('screenshot')
      executedLogs.push(
        res?.success
          ? 'Executed Accessibility global action: Screenshot captured.'
          : 'Attempted screenshot (requires IRIS Accessibility Service enabled in Settings).'
      )
    }

    if (/\b(screen\s*time|digital\s+wellbeing|app\s+usage\s+today|most\s+used\s+apps)\b/.test(lower)) {
      const stats = await getScreenTimeStats()
      if (stats?.granted && Array.isArray(stats.apps)) {
        const hrs = Math.floor((stats.totalScreenTimeMs || 0) / 3600000)
        const mins = Math.round(((stats.totalScreenTimeMs || 0) % 3600000) / 60000)
        const topSummary = stats.apps.slice(0, 5).map(a => `${a.label} (${a.minutes}m, ${a.percentage}%)`).join(', ')
        executedLogs.push(`Live Android UsageStats today: Total screen time = ${hrs}h ${mins}m. Top apps: ${topSummary || 'None'}.`)
      }
    }

    if (/\b(recent\s+notifications|unread\s+messages|what\s+notifications|check\s+my\s+notifications|any\s+otp)\b/.test(lower)) {
      const history = useNotificationStore.getState().history || []
      const recent = history.slice(0, 6).map(n => `[${n.appName} - ${n.time}] ${n.title}: ${n.text}${n.otpCode ? ` (OTP: ${n.otpCode})` : ''}`)
      executedLogs.push(
        recent.length > 0
          ? `Live Notification Archive (${recent.length} most recent):\n${recent.join('\n')}`
          : 'Live Notification Archive: No notifications recorded yet.'
      )
    }

    const shellMatch = prompt.match(/(?:run\s+shell|execute\s+command|sh\s+-c)\s+[`"']?([^`"'\n]+)[`"']?/i)
    if (shellMatch && shellMatch[1]) {
      const res = await executeShellCommand(shellMatch[1].trim())
      executedLogs.push(`Executed Android Linux shell '${shellMatch[1].trim()}' (exit ${res?.exitCode}):\n${(res?.output || '').slice(0, 1200)}`)
    }

    const openMatch = lower.match(/\b(?:open|launch|start)\s+([a-z0-9\s.+_-]{2,28})$/i)
    if (openMatch && openMatch[1]) {
      const target = openMatch[1].trim()
      const settingsMap = {
        'wifi settings': 'wifi',
        'bluetooth settings': 'bluetooth',
        'display settings': 'display',
        'battery settings': 'battery',
        'sound settings': 'sound',
        'accessibility settings': 'accessibility',
      }
      if (settingsMap[target]) {
        await openSystemSettings(settingsMap[target])
        executedLogs.push(`Opened Android system settings: ${settingsMap[target]}.`)
      } else {
        const apps = useAppsStore.getState().installedApps || []
        const found = apps.find(a => a.label?.toLowerCase() === target || a.label?.toLowerCase().includes(target))
        if (found) {
          await launchApp(found.packageId, found.label)
          executedLogs.push(`Launched installed Android app: ${found.label} (${found.packageId}).`)
        }
      }
    }
  } catch (e) {
    console.warn('[aiAgentTools] Error executing device intent:', e)
  }

  if (executedLogs.length === 0) return ''
  return `\n[REAL-TIME DEVICE OS ACTIONS EXECUTED BY IRIS]:\n${executedLogs.map(l => `- ${l}`).join('\n')}\nConfirm these completed hardware/OS actions clearly and concisely in your response.`
}

