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
  getScreenContext,
  injectTextToActiveInput,
  toggleFloatingCopilot,
  makeCall,
  lookupContact,
  lookupContactMultiple,
  sendSMS,
  sendMessage,
  setAlarm,
  setTimer,
  setBrightness,
  setAudioVolume,
  setVolumeLevel,
  dispatchMediaKey,
  toggleDND,
  getSystemInfo,
  answerCall,
  endCall,
  setSpeakerphone,
} from '../components/LauncherPlugin'
import { useAppsStore } from '../stores/appsStore'
import { useNotificationStore } from '../stores/notificationStore'

function parseAlarmTime(timeStr) {
  if (!timeStr) return null
  const clean = timeStr.toLowerCase().replace(/\./g, '').trim()
  const isPM = clean.includes('pm') || clean.includes('evening') || clean.includes('night') || clean.includes('afternoon')
  const isAM = clean.includes('am') || clean.includes('morning')
  const digits = clean.replace(/[^0-9:]/g, '')
  let hour = 8
  let min = 0
  if (digits.includes(':')) {
    const parts = digits.split(':')
    hour = parseInt(parts[0], 10)
    min = parseInt(parts[1], 10) || 0
  } else if (digits.length > 0) {
    if (digits.length <= 2) {
      hour = parseInt(digits, 10)
    } else if (digits.length === 3) {
      hour = parseInt(digits.slice(0, 1), 10)
      min = parseInt(digits.slice(1), 10)
    } else if (digits.length === 4) {
      hour = parseInt(digits.slice(0, 2), 10)
      min = parseInt(digits.slice(2), 10)
    }
  } else {
    return null
  }
  if (isPM && hour < 12) hour += 12
  if (isAM && hour === 12) hour = 0
  if (hour >= 0 && hour <= 23 && min >= 0 && min <= 59) {
    return { hour, min }
  }
  return null
}

export async function executeDeviceAgentIntent(prompt) {
  if (!prompt || typeof prompt !== 'string') return ''
  const cleanedPrompt = prompt.trim().replace(/^(?:please|can\s+you|could\s+you|would\s+you|hey\s+iris|hi\s+iris|iris)[,\s]+/i, '').trim()
  const lower = cleanedPrompt.toLowerCase()
  const executedLogs = []

  try {
    // 1. INCOMING & ACTIVE CALL CONTROL (Answer / Decline / Hang Up / Speakerphone)
    if (/\b(answer|pick\s+up|accept|take)\b.*\b(call|phone)\b/.test(lower) || /^(?:answer|pick\s+up)(?:\s+on\s+speaker)?$/i.test(lower)) {
      const useSpeaker = /\b(speaker|speakerphone|hands\s*free)\b/.test(lower)
      const res = await answerCall(useSpeaker)
      executedLogs.push(
        res?.success
          ? `Executed Telecom action: Answered incoming phone call${useSpeaker ? ' on speakerphone' : ''}.`
          : 'Attempted to answer incoming call (requires Phone/Call permission).'
      )
    } else if (/\b(decline|reject|end|hang\s+up|drop|terminate)\b.*\b(call|phone)\b/.test(lower) || /^(?:hang\s+up|decline|reject\s+call|end\s+call)$/i.test(lower)) {
      const res = await endCall()
      executedLogs.push(
        res?.success
          ? 'Executed Telecom action: Ended / declined phone call.'
          : 'Attempted to end/decline phone call.'
      )
    } else if (/\b(turn\s+on|enable|switch\s+to)\s+(speaker|speakerphone)\b/.test(lower)) {
      await setSpeakerphone(true)
      executedLogs.push('Executed audio action: Speakerphone turned ON.')
    } else if (/\b(turn\s+off|disable)\s+(speaker|speakerphone)\b/.test(lower)) {
      await setSpeakerphone(false)
      executedLogs.push('Executed audio action: Speakerphone turned OFF.')
    }

    // 2. OUTGOING PHONE CALLS ("call Mom", "call John on speaker", "dial 555-1234")
    const callMatch = cleanedPrompt.match(/^(?:call|dial|phone|ring)\s+(.+?)(?:\s+on\s+(speaker|speakerphone))?[.?]?$/i)
    if (callMatch && callMatch[1] && !/\b(call|phone)\s+(me|it|that)\b/i.test(cleanedPrompt)) {
      const target = callMatch[1].replace(/\s+on\s+speaker(?:phone)?$/i, '').replace(/\s+please$/i, '').trim()
      const useSpeaker = Boolean(callMatch[2]) || /\bon\s+speaker(?:phone)?\b/i.test(cleanedPrompt)
      const digitsOnly = target.replace(/[^0-9+]/g, '')
      if (digitsOnly.length >= 3 && /^[+\d\s()-]+$/.test(target)) {
        await makeCall(digitsOnly, useSpeaker)
        executedLogs.push(`Placed phone call to ${digitsOnly}${useSpeaker ? ' on speakerphone' : ''}.`)
      } else {
        const contact = await lookupContact(target)
        if (contact?.found && contact?.number) {
          await makeCall(contact.number, useSpeaker)
          executedLogs.push(`Placed phone call to ${contact.name || target} (${contact.number})${useSpeaker ? ' on speakerphone' : ''}.`)
        } else {
          const multi = await lookupContactMultiple(target)
          if (Array.isArray(multi) && multi.length > 0 && multi[0].number) {
            await makeCall(multi[0].number, useSpeaker)
            executedLogs.push(`Placed phone call to ${multi[0].name || target} (${multi[0].number})${useSpeaker ? ' on speakerphone' : ''}.`)
          } else {
            executedLogs.push(`Contact lookup for "${target}": No matching contact found in device address book.`)
          }
        }
      }
    }

    // 3. SMS & WHATSAPP MESSAGING ("text Mom I'm on my way", "send a message to Alex saying hello")
    const smsMatch =
      cleanedPrompt.match(/^(?:send\s+(?:a\s+)?(?:text|sms|message)\s+to|text|sms|message)\s+([a-z0-9\s+()-]{2,25}?)\s+(?:saying|that|with\s+message|:)\s+(.+)$/i) ||
      cleanedPrompt.match(/^(?:text|sms)\s+([a-z0-9+()-]{2,18})\s+(.+)$/i)
    if (smsMatch && smsMatch[1] && smsMatch[2]) {
      const recipient = smsMatch[1].trim()
      const body = smsMatch[2].trim().replace(/^["']|["']$/g, '')
      const digits = recipient.replace(/[^0-9+]/g, '')
      if (digits.length >= 3 && /^[+\d\s()-]+$/.test(recipient)) {
        await sendSMS(digits, body)
        executedLogs.push(`Opened SMS composer to ${digits} with message: "${body}".`)
      } else {
        const contact = await lookupContact(recipient)
        if (contact?.found && contact?.number) {
          await sendSMS(contact.number, body)
          executedLogs.push(`Opened SMS composer to ${contact.name || recipient} (${contact.number}) with message: "${body}".`)
        } else {
          executedLogs.push(`Could not find phone number for "${recipient}" to send SMS.`)
        }
      }
    }

    const waMatch = cleanedPrompt.match(/^(?:send\s+(?:a\s+)?whatsapp(?:\s+message)?(?:\s+saying)?|whatsapp)\s+(.+)$/i)
    if (waMatch && waMatch[1]) {
      const msg = waMatch[1].trim().replace(/^["']|["']$/g, '')
      await sendMessage('whatsapp', msg)
      executedLogs.push(`Opened WhatsApp with message: "${msg}".`)
    }

    // 4. ALARMS, TIMERS & REMINDERS
    const alarmMatch =
      cleanedPrompt.match(/\b(?:set\s+(?:an?\s+)?alarm\s+(?:for|at)|wake\s+me\s+up\s+at)\s+([0-9:]{1,5}(?:\s*(?:am|pm|a\.m\.|p\.m\.|in\s+the\s+morning|at\s+night|in\s+the\s+evening))?)/i)
    if (alarmMatch && alarmMatch[1]) {
      const parsed = parseAlarmTime(alarmMatch[1])
      if (parsed) {
        await setAlarm(parsed.hour, parsed.min, 'IRIS AI Alarm')
        const h12 = parsed.hour % 12 || 12
        const ampm = parsed.hour >= 12 ? 'PM' : 'AM'
        const minPad = String(parsed.min).padStart(2, '0')
        executedLogs.push(`Set system alarm for ${h12}:${minPad} ${ampm}.`)
      }
    }

    const timerMatch = cleanedPrompt.match(/\b(?:set\s+(?:a\s+)?timer\s+for|start\s+(?:a\s+)?timer\s+for|timer\s+for)\s+(\d+)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b/i)
    if (timerMatch && timerMatch[1]) {
      const val = parseInt(timerMatch[1], 10)
      const unit = (timerMatch[2] || 'minutes').toLowerCase()
      let secs = val
      if (unit.startsWith('m')) secs = val * 60
      else if (unit.startsWith('h')) secs = val * 3600
      await setTimer(secs, 'IRIS Timer')
      executedLogs.push(`Started countdown timer for ${val} ${unit}.`)
    }

    const remindMatch = cleanedPrompt.match(/\bremind\s+me\s+to\s+(.+?)\s+in\s+(\d+)\s*(minutes?|mins?|hours?|hrs?)\b/i)
    if (remindMatch && remindMatch[1] && remindMatch[2]) {
      const taskText = remindMatch[1].trim()
      const amount = parseInt(remindMatch[2], 10)
      const unit = remindMatch[3].toLowerCase()
      const ms = unit.startsWith('h') ? amount * 3600000 : amount * 60000
      const dueDate = new Date(Date.now() + ms)
      const dueTime = `${String(dueDate.getHours()).padStart(2, '0')}:${String(dueDate.getMinutes()).padStart(2, '0')}`
      try {
        const existing = JSON.parse(localStorage.getItem('iris_day_tasks') || '[]')
        existing.unshift({ id: Date.now(), text: taskText, time: dueTime, completed: false, notified: false })
        localStorage.setItem('iris_day_tasks', JSON.stringify(existing))
      } catch {}
      executedLogs.push(`Scheduled reminder "${taskText}" for ${dueTime} (in ${amount} ${unit}).`)
    }

    // 5. FLASHLIGHT
    if (/\b(turn\s+on|enable|activate|switch\s+on)\b.*\b(flashlight|torch|light)\b/.test(lower) || /^flashlight\s+on$/i.test(lower)) {
      await setFlashlight(true)
      executedLogs.push('Executed hardware action: Flashlight turned ON.')
    } else if (/\b(turn\s+off|disable|deactivate|switch\s+off)\b.*\b(flashlight|torch|light)\b/.test(lower) || /^flashlight\s+off$/i.test(lower)) {
      await setFlashlight(false)
      executedLogs.push('Executed hardware action: Flashlight turned OFF.')
    } else if (/\b(toggle|switch)\b.*\b(flashlight|torch)\b/.test(lower)) {
      const res = await toggleFlashlight()
      executedLogs.push(`Executed hardware action: Flashlight toggled (${res?.status ? 'ON' : 'OFF'}).`)
    }

    // 6. VOLUME, MEDIA PLAYBACK, SOUND MODE & BRIGHTNESS
    const volLevelMatch = lower.match(/\b(?:set\s+)?volume\s+(?:to\s+)?(\d{1,3})\s*%?\b/)
    if (volLevelMatch && volLevelMatch[1]) {
      const lvl = Math.max(0, Math.min(100, parseInt(volLevelMatch[1], 10)))
      await setVolumeLevel(lvl, 'music')
      executedLogs.push(`Set media volume to ${lvl}%.`)
    } else if (/\b(volume\s+up|turn\s+up\s+(?:the\s+)?volume|increase\s+volume|louder)\b/.test(lower)) {
      await setAudioVolume('up')
      executedLogs.push('Increased device audio volume.')
    } else if (/\b(volume\s+down|turn\s+down\s+(?:the\s+)?volume|decrease\s+volume|quieter|lower\s+volume)\b/.test(lower)) {
      await setAudioVolume('down')
      executedLogs.push('Decreased device audio volume.')
    }

    const brightMatch = lower.match(/\b(?:set\s+)?brightness\s+(?:to\s+)?(\d{1,3})\s*%?\b/)
    if (brightMatch && brightMatch[1]) {
      const lvl = Math.max(1, Math.min(100, parseInt(brightMatch[1], 10)))
      await setBrightness(lvl)
      executedLogs.push(`Set screen brightness to ${lvl}%.`)
    } else if (/\b(brightness\s+up|increase\s+brightness|brighter)\b/.test(lower)) {
      await setBrightness(85)
      executedLogs.push('Increased screen brightness to 85%.')
    } else if (/\b(brightness\s+down|decrease\s+brightness|dim\s+(?:the\s+)?screen)\b/.test(lower)) {
      await setBrightness(20)
      executedLogs.push('Dimmed screen brightness to 20%.')
    }

    if (/\b(play\s+music|resume\s+music|pause\s+music|stop\s+music|toggle\s+music)\b/.test(lower)) {
      await dispatchMediaKey('play_pause')
      executedLogs.push('Dispatched media key: Play/Pause.')
    } else if (/\b(next\s+(?:song|track)|skip\s+(?:song|track))\b/.test(lower)) {
      await dispatchMediaKey('next')
      executedLogs.push('Dispatched media key: Next Track.')
    } else if (/\b(previous\s+(?:song|track)|last\s+(?:song|track))\b/.test(lower)) {
      await dispatchMediaKey('previous')
      executedLogs.push('Dispatched media key: Previous Track.')
    }

    if (/\b(turn\s+on|enable|activate)\s+(do\s+not\s+disturb|dnd)\b/.test(lower)) {
      await toggleDND(true)
      executedLogs.push('Enabled Do Not Disturb mode.')
    } else if (/\b(turn\s+off|disable|deactivate)\s+(do\s+not\s+disturb|dnd)\b/.test(lower)) {
      await toggleDND(false)
      executedLogs.push('Disabled Do Not Disturb mode.')
    } else if (/\b(set|put|switch|turn)\b.*\b(silent|mute)\b/.test(lower)) {
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

    // 7. NOTES & DAY TASKS
    const noteMatch = cleanedPrompt.match(/^(?:take\s+a\s+note|save\s+a\s+note|create\s+a\s+note|add\s+a\s+note|note\s+to\s+self)[:\s]+(.+)$/i)
    if (noteMatch && noteMatch[1]) {
      const noteText = noteMatch[1].trim()
      try {
        const notes = JSON.parse(localStorage.getItem('iris_voice_notes') || '[]')
        notes.unshift({ id: Date.now(), text: noteText, timestamp: new Date().toLocaleString() })
        localStorage.setItem('iris_voice_notes', JSON.stringify(notes))
        executedLogs.push(`Saved voice note: "${noteText}".`)
      } catch {}
    } else if (/\b(read\s+(?:my\s+)?notes|what\s+are\s+my\s+notes|show\s+(?:my\s+)?notes)\b/.test(lower)) {
      try {
        const notes = JSON.parse(localStorage.getItem('iris_voice_notes') || '[]')
        executedLogs.push(
          notes.length > 0
            ? `Saved Voice Notes (${notes.length}):\n${notes.slice(0, 8).map((n, i) => `${i + 1}. ${n.text}`).join('\n')}`
            : 'Saved Voice Notes: You have no saved notes yet.'
        )
      } catch {}
    }

    const taskMatch = cleanedPrompt.match(/^(?:add\s+(?:a\s+)?task|create\s+(?:a\s+)?task|add\s+to\s+(?:my\s+)?to-?do(?:\s+list)?)[:\s]+(.+)$/i)
    if (taskMatch && taskMatch[1]) {
      const taskText = taskMatch[1].trim()
      try {
        const tasks = JSON.parse(localStorage.getItem('iris_day_tasks') || '[]')
        tasks.unshift({ id: Date.now(), text: taskText, completed: false })
        localStorage.setItem('iris_day_tasks', JSON.stringify(tasks))
        executedLogs.push(`Added task to Day Tasks: "${taskText}".`)
      } catch {}
    }

    // 8. MEMORY BOOST & SYSTEM DIAGNOSTICS
    if (/\b(boost\s+ram|clear\s+ram|free\s+up\s+(ram|memory)|optimize\s+(ram|memory|phone)|clean\s+memory)\b/.test(lower)) {
      const res = await optimizeMemory()
      executedLogs.push(
        res?.freedMb > 0
          ? `Executed OS Memory Boost: Reclaimed +${res.freedMb} MB RAM (${res.killedCount || 0} background packages swept).`
          : 'Executed OS Memory Boost: System RAM is already at peak optimal efficiency.'
      )
    }

    if (/\b(battery\s+(?:level|percentage|status|temp|temperature)|how\s+much\s+(?:battery|ram|memory|storage)|system\s+(?:status|diagnostics|telemetry)|cpu\s+temp)\b/.test(lower)) {
      const info = await getSystemInfo()
      if (info) {
        executedLogs.push(
          `Live Device Telemetry: Battery = ${info.batteryLevel}% (${info.batteryStatus}, ${info.batteryTemp}°C), RAM = ${info.memUsed}MB / ${info.memTotal}MB (${info.memAvail}MB free), Storage = ${info.storageUsed}GB / ${info.storageTotal}GB, Device = ${info.manufacturer} ${info.model} (Android ${info.androidVersion}).`
        )
      }
    }

    // 9. SCREEN LOCK, SCREENSHOT & DIGITAL WELLBEING
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

    // 10. NOTIFICATIONS & SCREEN CONTEXT & COPILOT
    if (/\b(recent\s+notifications|unread\s+messages|what\s+notifications|check\s+(?:my\s+)?notifications|read\s+(?:my\s+)?notifications|any\s+otp)\b/.test(lower)) {
      const history = useNotificationStore.getState().history || []
      const recent = history.slice(0, 6).map(n => `[${n.appName} - ${n.time}] ${n.title}: ${n.text}${n.otpCode ? ` (OTP: ${n.otpCode})` : ''}`)
      executedLogs.push(
        recent.length > 0
          ? `Live Notification Archive (${recent.length} most recent):\n${recent.join('\n')}`
          : 'Live Notification Archive: No notifications recorded yet.'
      )
    }

    if (/\b(read\s+(my\s+|the\s+)?screen|what('s|\s+is)\s+on\s+(my\s+|the\s+)?screen|analyze\s+(the\s+|my\s+)?screen|summarize\s+(the\s+|my\s+)?screen)\b/.test(lower)) {
      const screen = await getScreenContext()
      if (screen?.success && Array.isArray(screen.texts) && screen.texts.length > 0) {
        executedLogs.push(`Live Screen Context (${screen.appName || screen.packageName}):\n- Draft in input: "${screen.currentDraft || '(none)'}"\n- Visible elements: ${screen.texts.slice(0, 15).join(' | ')}`)
      } else {
        executedLogs.push('Screen context is currently unavailable (requires IRIS Accessibility Service enabled).')
      }
    }

    if (/\b(enable|turn\s+on|activate|start)\s+(floating\s+)?copilot\b/.test(lower)) {
      await toggleFloatingCopilot(true)
      executedLogs.push('Floating Screen Copilot activated (displays edge assistant pill in other apps).')
    } else if (/\b(disable|turn\s+off|deactivate|stop)\s+(floating\s+)?copilot\b/.test(lower)) {
      await toggleFloatingCopilot(false)
      executedLogs.push('Floating Screen Copilot deactivated.')
    }

    const typeMatch = prompt.match(/(?:type|insert|write)\s+["']([^"']+)["']\s+(?:in|into)\s+(?:the\s+)?(?:screen|input|app)/i)
    if (typeMatch && typeMatch[1]) {
      const res = await injectTextToActiveInput(typeMatch[1])
      executedLogs.push(res?.injected ? `Inserted "${typeMatch[1]}" into active input box.` : `Copied "${typeMatch[1]}" to clipboard for pasting.`)
    }

    const shellMatch = prompt.match(/(?:run\s+shell|execute\s+command|sh\s+-c)\s+[`"']?([^`"'\n]+)[`"']?/i)
    if (shellMatch && shellMatch[1]) {
      const res = await executeShellCommand(shellMatch[1].trim())
      executedLogs.push(`Executed Android Linux shell '${shellMatch[1].trim()}' (exit ${res?.exitCode}):\n${(res?.output || '').slice(0, 1200)}`)
    }

    // 11. SETTINGS & APP LAUNCHING
    const openMatch = lower.match(/\b(?:open|launch|start|run)\s+(?:the\s+)?(?:app\s+)?([a-z0-9\s.+_-]{2,30}?)(?:\s+app|\s+please)?[.!?]?$/i)
    if (openMatch && openMatch[1]) {
      const target = openMatch[1].trim()
      const settingsMap = {
        'wifi': 'wifi',
        'wi-fi': 'wifi',
        'wifi settings': 'wifi',
        'wi-fi settings': 'wifi',
        'bluetooth': 'bluetooth',
        'bluetooth settings': 'bluetooth',
        'display settings': 'display',
        'battery settings': 'battery',
        'sound settings': 'sound',
        'accessibility settings': 'accessibility',
        'system settings': 'settings',
        'android settings': 'settings',
      }
      if (settingsMap[target]) {
        await openSystemSettings(settingsMap[target])
        executedLogs.push(`Opened Android system settings: ${settingsMap[target]}.`)
      } else {
        const apps = useAppsStore.getState().installedApps || []
        const exact = apps.find(a => a.label?.toLowerCase() === target)
        const partial = apps.find(a => a.label?.toLowerCase().includes(target) || target.includes(a.label?.toLowerCase() || '___'))
        const found = exact || partial
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
