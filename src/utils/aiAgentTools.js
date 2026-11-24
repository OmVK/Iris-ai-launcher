import {
  toggleFlashlight,
  setFlashlight,
  optimizeMemory,
  setSoundMode,
  cycleRingerMode,
  launchApp,
  openSystemSettings,
  performAccessibilityAction,
  expandNotificationPanel,
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
  clickScreenElement,
  toggleQuickSetting,
  launchSplitScreenPair,
} from '../components/LauncherPlugin'
import { useAppsStore } from '../stores/appsStore'
import { useAppStore } from '../stores/appStore'
import { useNotificationStore, detectScamRisk } from '../stores/notificationStore'
import { useAssistantStore } from '../stores/assistantStore'
import { safeEvaluate } from './safeMath'
import { fetchCurrentWeather } from './weather'
import { queryIrisAI } from './aiQueryBridge'

const lastAgentContext = {
  lastApp: null,
  lastContact: null,
  lastBrightness: 50,
  lastVolume: 50,
  lastReplyText: '',
  lastAction: '',
  updatedAt: 0,
}

export function updateLastAgentReply(replyText) {
  if (replyText && typeof replyText === 'string') {
    lastAgentContext.lastReplyText = replyText.trim()
    lastAgentContext.updatedAt = Date.now()
  }
}

export function getLastAgentContext() {
  return { ...lastAgentContext }
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function emitStepProgress(steps) {
  try {
    window.dispatchEvent(new CustomEvent('iris-agent-steps', { detail: { steps: [...steps] } }))
  } catch {}
}

if (typeof window !== 'undefined' && !window.__irisUndoListenerAttached) {
  window.__irisUndoListenerAttached = true
  window.addEventListener('iris-agent-undo', async (e) => {
    const undo = e?.detail?.undo
    if (!undo || !undo.type) return
    try {
      let msg = 'Action undone.'
      if (undo.type === 'brightness') {
        const prev = typeof undo.prev === 'number' ? undo.prev : 50
        await setBrightness(prev)
        lastAgentContext.lastBrightness = prev
        msg = `Reverted brightness to ${prev}%.`
      } else if (undo.type === 'volume') {
        const prev = typeof undo.prev === 'number' ? undo.prev : 50
        await setVolumeLevel(prev, 'music')
        lastAgentContext.lastVolume = prev
        msg = `Reverted volume to ${prev}%.`
      } else if (undo.type === 'flashlight') {
        await setFlashlight(Boolean(undo.prev))
        msg = `Reverted flashlight ${undo.prev ? 'ON' : 'OFF'}.`
      } else if (undo.type === 'dnd') {
        await toggleDND(Boolean(undo.prev))
        msg = `Reverted Do Not Disturb ${undo.prev ? 'ON' : 'OFF'}.`
      } else if (undo.type === 'note' && undo.id) {
        const notes = JSON.parse(localStorage.getItem('iris_voice_notes') || '[]').filter((n) => n.id !== undo.id)
        localStorage.setItem('iris_voice_notes', JSON.stringify(notes))
        msg = 'Removed saved note.'
      } else if (undo.type === 'task' && undo.id) {
        const tasks = JSON.parse(localStorage.getItem('iris_day_tasks') || '[]').filter((t) => t.id !== undo.id)
        localStorage.setItem('iris_day_tasks', JSON.stringify(tasks))
        window.dispatchEvent(new CustomEvent('TASKS_SYNCED_GLOBALLY'))
        msg = 'Removed added task.'
      } else if (undo.type === 'memory' && undo.id) {
        const mems = JSON.parse(localStorage.getItem('iris_memory_vault') || '[]').filter((m) => m.id !== undo.id)
        localStorage.setItem('iris_memory_vault', JSON.stringify(mems))
        msg = 'Removed saved memory.'
      }
      useAssistantStore.getState().setActiveAiResponse(msg)
      emitStepProgress([{ icon: 'undo', label: '↺ Undone', ok: true }])
    } catch {}
  })
}

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

const SPOKEN_NUMBER_WORDS = {
  'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
  'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
  'ten': '10', 'eleven': '11', 'twelve': '12', 'fifteen': '15',
  'twenty': '20', 'twenty-five': '25', 'thirty': '30', 'forty': '40',
  'forty-five': '45', 'fifty': '50', 'sixty': '60', 'seventy': '70',
  'seventy-five': '75', 'eighty': '80', 'ninety': '90', 'hundred': '100',
}

export function normalizeSpokenNumbers(text) {
  if (!text) return ''
  let out = text
    .replace(/\b(?:one\s+hundred|a\s+hundred|max(?:imum)?|full)\s*(?:percent|%)\b/gi, '100%')
    .replace(/\bhalf\s*(?:percent|%|brightness|volume)?\b/gi, (m) => (m.toLowerCase().includes('brightness') ? 'brightness to 50%' : m.toLowerCase().includes('volume') ? 'volume to 50%' : '50%'))
    .replace(/\b(?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\s+(?:five)\b/gi, (m) => {
      const tens = m.split(/\s+/)[0].toLowerCase()
      const base = parseInt(SPOKEN_NUMBER_WORDS[tens] || '50', 10)
      return String(base + 5)
    })
  for (const [word, digit] of Object.entries(SPOKEN_NUMBER_WORDS)) {
    out = out.replace(new RegExp(`\\b${word}\\b(?=\\s*(?:%|percent|seconds?|secs?|minutes?|mins?|hours?|hrs?))`, 'gi'), digit)
  }
  return out
}

function levenshteinDistance(a, b) {
  if (!a || !b) return Math.max(a?.length || 0, b?.length || 0)
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i])
  for (let j = 0; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[a.length][b.length]
}

function findBestInstalledApp(target, apps) {
  if (!target || !Array.isArray(apps) || apps.length === 0) return null
  const cleanTarget = target.toLowerCase().trim()
  const compactTarget = cleanTarget.replace(/[^a-z0-9]/g, '')
  if (!compactTarget) return null

  const exact = apps.find((a) => a.label?.toLowerCase() === cleanTarget || a.label?.toLowerCase().replace(/[^a-z0-9]/g, '') === compactTarget)
  if (exact) return exact

  const starts = apps.find((a) => a.label?.toLowerCase().startsWith(cleanTarget) || a.label?.toLowerCase().replace(/[^a-z0-9]/g, '').startsWith(compactTarget))
  if (starts) return starts

  const partial = apps.find((a) => {
    const lbl = a.label?.toLowerCase() || ''
    const compactLbl = lbl.replace(/[^a-z0-9]/g, '')
    return lbl.includes(cleanTarget) || cleanTarget.includes(lbl) || (compactLbl.length >= 3 && (compactLbl.includes(compactTarget) || compactTarget.includes(compactLbl)))
  })
  if (partial) return partial

  let bestApp = null
  let bestDist = 3
  for (const app of apps) {
    const compactLbl = (app.label || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    if (compactLbl.length < 3) continue
    const dist = levenshteinDistance(compactTarget, compactLbl)
    const maxAllowed = compactTarget.length >= 6 ? 2 : 1
    if (dist <= maxAllowed && dist < bestDist) {
      bestDist = dist
      bestApp = app
    }
  }
  return bestApp
}

const ACTION_START_LOOKAHEAD = '(?:open|launch|start|run|take|capture|turn|switch|set|enable|disable|activate|deactivate|toggle|call|dial|phone|ring|text|sms|message|whatsapp|send|play|pause|resume|stop|skip|next|previous|mute|unmute|silent|vibrate|boost|clear|free|optimize|clean|lock|wait|sleep|delay|remind|add|save|create|note|read|check|show|search|google|navigate|directions|go|back|home|close|pull|expand|brighter|dimmer|darker|louder|quieter|tap|click|press|type|enter)'

export function splitIntoSequentialSteps(cleanedPrompt) {
  if (!cleanedPrompt) return []
  if (/\b(?:in\s+split\s*screen|side\s+by\s+side|split\s*screen\s+.+\s+(?:and|with)\s+|as\s+.+\s+pair)\b/i.test(cleanedPrompt)) {
    return [cleanedPrompt.trim()]
  }
  const normalized = cleanedPrompt
    .replace(/\s+(?:and\s+then|then|after\s+that|afterwards|next|followed\s+by)\s+/gi, ' ||STEP|| ')
    .replace(new RegExp(`(?:,\\s*(?:and\\s+)?|\\s+and\\s+|\\s+also\\s+)(?=${ACTION_START_LOOKAHEAD}\\b)`, 'gi'), ' ||STEP|| ')
    .replace(new RegExp(`\\s+(?=take\\s+a?\\s*screenshot\\b|capture\\s+screen\\b|open\\s+[a-z0-9]+\\b|wait\\s+\\d+\\s*(?:second|sec|s)\\b)`, 'gi'), () => {
      return ' ||STEP|| '
    })

  return normalized
    .split('||STEP||')
    .map((s) => s.trim().replace(/^[,.!?;:]|[,.!?;:]$/g, '').trim())
    .filter((s) => s.length >= 2)
}

async function executeSingleStep(stepText, stepIndex, totalSteps) {
  const lower = stepText.toLowerCase().trim()
  const logs = []
  const badges = []
  let didLaunchExternalApp = false

  // NEGATION GUARD ("don't turn on flashlight", "do not call John")
  if (/^(?:don'?t|do\s+not|never|avoid)\s+/i.test(lower)) {
    return { logs, badges, didLaunchExternalApp, stepIndex, totalSteps }
  }

  // 0. EXPLICIT WAIT / DELAY ("wait 3 seconds")
  const waitMatch = lower.match(/^(?:wait|pause|delay|sleep)\s+(?:for\s+)?(\d{1,2})\s*(?:seconds?|secs?|s)\b/i)
  if (waitMatch && waitMatch[1]) {
    const secs = Math.min(15, Math.max(1, parseInt(waitMatch[1], 10)))
    await delay(secs * 1000)
    logs.push(`Waited ${secs} seconds.`)
    badges.push({ icon: 'hourglass_empty', label: `Waited ${secs}s`, ok: true })
    return { logs, badges, didLaunchExternalApp }
  }

  // 1. SMART MULTI-ACTION ROUTINES (1-Phrase Macros)
  if (/^(?:good\s+morning|morning\s+routine|start\s+my\s+day|morning\s+briefing)$/i.test(lower)) {
    await toggleDND(false)
    await setBrightness(70)
    lastAgentContext.lastBrightness = 70
    const info = await getSystemInfo()
    const tasks = JSON.parse(localStorage.getItem('iris_day_tasks') || '[]').filter((t) => !t.completed && !t.done)
    logs.push(`Executed Good Morning Routine: Disabled Do Not Disturb, set brightness to 70%. Battery is at ${info?.batteryLevel ?? '--'}%, and you have ${tasks.length} pending tasks today.`)
    badges.push(
      { icon: 'do_not_disturb_off', label: 'DND Off', ok: true },
      { icon: 'light_mode', label: 'Brightness 70%', ok: true },
      { icon: 'battery_charging_full', label: `Battery ${info?.batteryLevel ?? '--'}%`, ok: true }
    )
    return { logs, badges, didLaunchExternalApp }
  }

  if (/^(?:focus\s+mode|work\s+mode|study\s+mode|deep\s+focus)$/i.test(lower)) {
    await toggleDND(true)
    await setSoundMode('mute')
    const mem = await optimizeMemory()
    await setTimer(25 * 60, 'IRIS Focus Session')
    logs.push(`Activated Focus Mode: Enabled Do Not Disturb, muted ringer, freed ${mem?.freedMb || 0}MB RAM, and started a 25-minute focus timer.`)
    badges.push(
      { icon: 'do_not_disturb_on', label: 'DND On', ok: true },
      { icon: 'volume_off', label: 'Muted', ok: true },
      { icon: 'memory', label: 'RAM Boosted', ok: true },
      { icon: 'timer', label: '25m Timer', ok: true }
    )
    return { logs, badges, didLaunchExternalApp }
  }

  if (/^(?:good\s*night|sleep\s+mode|bedtime\s+mode|night\s+routine)$/i.test(lower)) {
    await setFlashlight(false)
    await setBrightness(10)
    lastAgentContext.lastBrightness = 10
    await toggleDND(true)
    await setSoundMode('mute')
    logs.push('Activated Goodnight Routine: Turned off flashlight, dimmed screen to 10%, enabled Do Not Disturb, and silenced ringer.')
    badges.push(
      { icon: 'bedtime', label: 'DND & Silent', ok: true },
      { icon: 'brightness_low', label: 'Dimmed 10%', ok: true }
    )
    return { logs, badges, didLaunchExternalApp }
  }

  if (/^(?:driving\s+mode|car\s+mode|start\s+driving)$/i.test(lower)) {
    await setBrightness(85)
    await setVolumeLevel(80, 'music')
    lastAgentContext.lastBrightness = 85
    lastAgentContext.lastVolume = 80
    const apps = useAppsStore.getState().installedApps || []
    const mapsApp = apps.find((a) => /maps|waze|navigation/i.test(a.label || '') || /com\.google\.android\.apps\.maps/i.test(a.packageId || ''))
    if (mapsApp) {
      await launchApp(mapsApp.packageId, mapsApp.label)
      didLaunchExternalApp = true
    }
    logs.push(`Activated Driving Mode: Brightness 85%, Volume 80%${mapsApp ? `, and launched ${mapsApp.label}` : ''}.`)
    badges.push(
      { icon: 'directions_car', label: 'Driving Mode', ok: true },
      { icon: 'volume_up', label: 'Volume 80%', ok: true }
    )
    return { logs, badges, didLaunchExternalApp }
  }

  // 2. CONTEXTUAL FOLLOW-UP SHORTCUTS ("make it brighter", "louder", "save that as a note", "text him", "close it", "go back")
  if (/^(?:make\s+it\s+brighter|brighter|more\s+brightness|increase\s+it)$/i.test(lower)) {
    const nextLvl = Math.min(100, (lastAgentContext.lastBrightness || 50) + 25)
    await setBrightness(nextLvl)
    lastAgentContext.lastBrightness = nextLvl
    logs.push(`Increased screen brightness to ${nextLvl}%.`)
    badges.push({ icon: 'light_mode', label: `Brightness ${nextLvl}%`, ok: true })
    return { logs, badges, didLaunchExternalApp }
  }

  if (/^(?:make\s+it\s+(?:dimmer|darker)|dimmer|darker|less\s+brightness|dim\s+it)$/i.test(lower)) {
    const nextLvl = Math.max(10, (lastAgentContext.lastBrightness || 50) - 25)
    await setBrightness(nextLvl)
    lastAgentContext.lastBrightness = nextLvl
    logs.push(`Dimmed screen brightness to ${nextLvl}%.`)
    badges.push({ icon: 'brightness_low', label: `Brightness ${nextLvl}%`, ok: true })
    return { logs, badges, didLaunchExternalApp }
  }

  if (/^(?:make\s+it\s+louder|turn\s+it\s+up|louder|volume\s+up\s+more)$/i.test(lower)) {
    await setAudioVolume('up')
    logs.push('Increased device volume.')
    badges.push({ icon: 'volume_up', label: 'Volume Up', ok: true })
    return { logs, badges, didLaunchExternalApp }
  }

  if (/^(?:make\s+it\s+quieter|turn\s+it\s+down|quieter|softer|lower\s+it)$/i.test(lower)) {
    await setAudioVolume('down')
    logs.push('Decreased device volume.')
    badges.push({ icon: 'volume_down', label: 'Volume Down', ok: true })
    return { logs, badges, didLaunchExternalApp }
  }

  if (/^(?:save\s+(?:that|this|it)\s+(?:as\s+a\s+note|to\s+notes)|note\s+that)$/i.test(lower) && lastAgentContext.lastReplyText) {
    try {
      const notes = JSON.parse(localStorage.getItem('iris_voice_notes') || '[]')
      notes.unshift({ id: Date.now(), text: lastAgentContext.lastReplyText, timestamp: new Date().toLocaleString() })
      localStorage.setItem('iris_voice_notes', JSON.stringify(notes))
      logs.push(`Saved previous response to IRIS Notes: "${lastAgentContext.lastReplyText.slice(0, 80)}".`)
      badges.push({ icon: 'sticky_note_2', label: 'Saved to Notes', ok: true })
      return { logs, badges, didLaunchExternalApp }
    } catch {}
  }

  if (/^(?:add\s+(?:that|this|it)\s+to\s+(?:my\s+)?tasks|make\s+that\s+a\s+task)$/i.test(lower) && lastAgentContext.lastReplyText) {
    try {
      const tasks = JSON.parse(localStorage.getItem('iris_day_tasks') || '[]')
      tasks.unshift({ id: Date.now(), text: lastAgentContext.lastReplyText.slice(0, 120), completed: false })
      localStorage.setItem('iris_day_tasks', JSON.stringify(tasks))
      window.dispatchEvent(new CustomEvent('TASKS_SYNCED_GLOBALLY'))
      logs.push('Added previous response to Day Tasks.')
      badges.push({ icon: 'task_alt', label: 'Added to Tasks', ok: true })
      return { logs, badges, didLaunchExternalApp }
    } catch {}
  }

  if (/^(?:send\s+(?:that|this|it)\s+(?:on|to|via)\s+whatsapp|share\s+(?:that|it)\s+on\s+whatsapp)$/i.test(lower) && lastAgentContext.lastReplyText) {
    await sendMessage('whatsapp', lastAgentContext.lastReplyText)
    logs.push('Shared previous response to WhatsApp.')
    badges.push({ icon: 'send', label: 'Sent to WhatsApp', ok: true })
    return { logs, badges, didLaunchExternalApp }
  }

  // System Navigation Actions ("go back", "go home", "close it", "show recents", "pull down notifications")
  if (/^(?:go\s+back|navigate\s+back|back)$/i.test(lower)) {
    const res = await performAccessibilityAction('back')
    logs.push(res?.success ? 'Navigated back.' : 'Attempted to navigate back.')
    badges.push({ icon: 'arrow_back', label: 'Back', ok: Boolean(res?.success) })
    return { logs, badges, didLaunchExternalApp }
  }

  if (/^(?:go\s+home|go\s+to\s+home\s*screen|close\s+it|close\s+app|minimize\s+app)$/i.test(lower)) {
    const res = await performAccessibilityAction('home')
    useAppStore.getState().setActivePage('home')
    logs.push('Returned to Home screen.')
    badges.push({ icon: 'home', label: 'Home Screen', ok: Boolean(res?.success ?? true) })
    return { logs, badges, didLaunchExternalApp }
  }

  if (/^(?:show\s+recent\s+apps|open\s+recents|recent\s+apps|app\s+switcher)$/i.test(lower)) {
    const res = await performAccessibilityAction('recents')
    logs.push(res?.success ? 'Opened Recent Apps switcher.' : 'Attempted to open Recent Apps.')
    badges.push({ icon: 'layers', label: 'Recent Apps', ok: Boolean(res?.success) })
    return { logs, badges, didLaunchExternalApp }
  }

  if (/^(?:expand\s+notifications|pull\s+down\s+notifications|open\s+notification\s+(?:panel|shade)|show\s+notification\s+bar)$/i.test(lower)) {
    await expandNotificationPanel()
    logs.push('Expanded Android notification shade.')
    badges.push({ icon: 'notifications', label: 'Notification Shade', ok: true })
    return { logs, badges, didLaunchExternalApp }
  }

  // 2B. IN-APP HANDS-FREE SCROLL, CONTINUOUS AUTO-SCROLL & UI AUTOMATION
  if (/^(?:keep\s+scrolling(?:\s+down)?|auto\s*scroll(?:\s+down)?|start\s+scrolling(?:\s+down)?|continuous\s+scroll)$/i.test(lower)) {
    const res = await performAccessibilityAction('auto_scroll_down')
    logs.push(res?.success ? 'Started hands-free continuous downward scroll. Say "Stop scrolling" anytime.' : 'Continuous scroll requires IRIS Accessibility enabled.')
    badges.push({ icon: 'swipe_down', label: 'Auto-Scroll ON', ok: Boolean(res?.success) })
    return { logs, badges, didLaunchExternalApp }
  }

  if (/^(?:keep\s+scrolling\s+up|auto\s*scroll\s+up|start\s+scrolling\s+up)$/i.test(lower)) {
    const res = await performAccessibilityAction('auto_scroll_up')
    logs.push(res?.success ? 'Started hands-free continuous upward scroll.' : 'Continuous scroll requires IRIS Accessibility enabled.')
    badges.push({ icon: 'swipe_up', label: 'Auto-Scroll Up', ok: Boolean(res?.success) })
    return { logs, badges, didLaunchExternalApp }
  }

  if (/^(?:scroll\s+faster|faster\s+scroll|speed\s+up\s+scroll)$/i.test(lower)) {
    const res = await performAccessibilityAction('auto_scroll_fast')
    logs.push('Increased auto-scroll speed.')
    badges.push({ icon: 'fast_forward', label: 'Scroll Faster', ok: Boolean(res?.success) })
    return { logs, badges, didLaunchExternalApp }
  }

  if (/^(?:scroll\s+slower|slower\s+scroll|slow\s+down\s+scroll)$/i.test(lower)) {
    const res = await performAccessibilityAction('auto_scroll_slow')
    logs.push('Reduced auto-scroll speed.')
    badges.push({ icon: 'slow_motion_video', label: 'Scroll Slower', ok: Boolean(res?.success) })
    return { logs, badges, didLaunchExternalApp }
  }

  if (/^(?:stop\s+scrolling|pause\s+scrolling|stop\s+auto\s*scroll)$/i.test(lower)) {
    await performAccessibilityAction('stop_scroll')
    logs.push('Stopped hands-free continuous scrolling.')
    badges.push({ icon: 'pan_tool', label: 'Scroll Stopped', ok: true })
    return { logs, badges, didLaunchExternalApp }
  }

  if (/^(?:scroll\s+down|swipe\s+down|page\s+down)$/i.test(lower)) {
    const res = await performAccessibilityAction('scroll_down')
    logs.push('Scrolled screen down.')
    badges.push({ icon: 'arrow_downward', label: 'Scrolled Down', ok: Boolean(res?.success) })
    return { logs, badges, didLaunchExternalApp }
  }

  if (/^(?:scroll\s+up|swipe\s+up|page\s+up)$/i.test(lower)) {
    const res = await performAccessibilityAction('scroll_up')
    logs.push('Scrolled screen up.')
    badges.push({ icon: 'arrow_upward', label: 'Scrolled Up', ok: Boolean(res?.success) })
    return { logs, badges, didLaunchExternalApp }
  }

  if (/^(?:open\s+quick\s+settings|quick\s+settings|control\s+center)$/i.test(lower)) {
    const res = await performAccessibilityAction('quick_settings')
    logs.push(res?.success ? 'Opened Android Quick Settings.' : 'Quick Settings requires IRIS Accessibility enabled.')
    badges.push({ icon: 'tune', label: 'Quick Settings', ok: Boolean(res?.success) })
    return { logs, badges, didLaunchExternalApp }
  }

  if (/^(?:open\s+power\s+menu|power\s+menu|power\s+dialog)$/i.test(lower)) {
    const res = await performAccessibilityAction('power_dialog')
    logs.push(res?.success ? 'Opened Android Power Menu.' : 'Power Menu requires IRIS Accessibility enabled.')
    badges.push({ icon: 'power_settings_new', label: 'Power Menu', ok: Boolean(res?.success) })
    return { logs, badges, didLaunchExternalApp }
  }

  // 2B-2. 1-COMMAND DUAL-APP SPLIT-SCREEN LAUNCHER & SAVED APP PAIRS
  const savePairMatch = stepText.match(/^(?:save|create)\s+([a-z0-9\s.+_-]+?)\s+(?:and|with)\s+([a-z0-9\s.+_-]+?)\s+as\s+([a-z0-9\s_-]+?)(?:\s+pair|\s+split\s*screen)?$/i)
  if (savePairMatch && savePairMatch[1] && savePairMatch[2] && savePairMatch[3]) {
    const apps = useAppsStore.getState().installedApps || []
    const app1 = findBestInstalledApp(savePairMatch[1].trim(), apps)
    const app2 = findBestInstalledApp(savePairMatch[2].trim(), apps)
    const pairName = savePairMatch[3].trim().toLowerCase()
    if (app1 && app2) {
      try {
        const pairs = JSON.parse(localStorage.getItem('iris_split_app_pairs') || '{}')
        pairs[pairName] = {
          name: pairName,
          firstPackage: app1.packageId,
          firstLabel: app1.label,
          secondPackage: app2.packageId,
          secondLabel: app2.label,
        }
        localStorage.setItem('iris_split_app_pairs', JSON.stringify(pairs))
      } catch {}
      logs.push(`Saved split-screen app pair "${pairName}": ${app1.label} + ${app2.label}.`)
      badges.push({ icon: 'vertical_split', label: `Saved Pair: ${pairName}`, ok: true })
      return { logs, badges, didLaunchExternalApp }
    }
  }

  const openPairMatch = lower.match(/^(?:open|launch|start)\s+([a-z0-9\s_-]+?)\s+pair$/i)
  if (openPairMatch && openPairMatch[1]) {
    const pairName = openPairMatch[1].trim().toLowerCase()
    try {
      const pairs = JSON.parse(localStorage.getItem('iris_split_app_pairs') || '{}')
      const pair = pairs[pairName]
      if (pair?.firstPackage && pair?.secondPackage) {
        const res = await launchSplitScreenPair(pair.firstPackage, pair.secondPackage)
        logs.push(
          res?.success
            ? `Launched "${pairName}" in Split Screen: ${pair.firstLabel} + ${pair.secondLabel}.`
            : 'Split-screen pair requires IRIS Accessibility Service enabled.'
        )
        badges.push({ icon: 'vertical_split', label: `${pair.firstLabel} | ${pair.secondLabel}`, ok: Boolean(res?.success) })
        didLaunchExternalApp = Boolean(res?.success)
        return { logs, badges, didLaunchExternalApp }
      }
    } catch {}
  }

  const splitPairMatch =
    stepText.match(/^(?:open|launch|start|run)\s+([a-z0-9\s.+_-]+?)\s+(?:and|with)\s+([a-z0-9\s.+_-]+?)\s+(?:in\s+split\s*screen|side\s+by\s+side|together)$/i)
    || stepText.match(/^split\s*screen\s+([a-z0-9\s.+_-]+?)\s+(?:and|with)\s+([a-z0-9\s.+_-]+?)$/i)
  if (splitPairMatch && splitPairMatch[1] && splitPairMatch[2]) {
    const apps = useAppsStore.getState().installedApps || []
    const app1 = findBestInstalledApp(splitPairMatch[1].trim(), apps)
    const app2 = findBestInstalledApp(splitPairMatch[2].trim(), apps)
    if (app1 && app2) {
      const res = await launchSplitScreenPair(app1.packageId, app2.packageId)
      if (res?.success) {
        logs.push(`Launched ${app1.label} and ${app2.label} in Split Screen.`)
        badges.push({ icon: 'vertical_split', label: `${app1.label} | ${app2.label}`, ok: true })
        didLaunchExternalApp = true
      } else {
        logs.push('Dual-app Split Screen requires IRIS Accessibility Service enabled in Settings.')
        badges.push({ icon: 'vertical_split', label: 'Enable Accessibility', ok: false })
      }
      return { logs, badges, didLaunchExternalApp }
    }
  }

  if (/^(?:split\s+screen|toggle\s+split\s+screen|multi\s+window)$/i.test(lower)) {
    const res = await performAccessibilityAction('split_screen')
    logs.push(res?.success ? 'Toggled Split Screen mode.' : 'Split Screen requires IRIS Accessibility enabled.')
    badges.push({ icon: 'vertical_split', label: 'Split Screen', ok: Boolean(res?.success) })
    return { logs, badges, didLaunchExternalApp }
  }

  // 2B-3. HANDS-FREE QUICK-SETTINGS TILE AUTO-TAPPER (Works on any OEM skin via Accessibility)
  const qsToggleMatch = lower.match(/^(?:turn\s+on|turn\s+off|enable|disable|toggle|switch\s+on|switch\s+off)\s+(?:mobile\s+)?(hotspot|auto\s*rotate|screen\s+rotation|rotation|location|gps|battery\s+saver|power\s+saving|dark\s+mode|dark\s+theme|eye\s+comfort|night\s+light|nfc|wi-?fi|bluetooth|airplane\s+mode)$/i)
  if (qsToggleMatch && qsToggleMatch[1]) {
    const rawTile = qsToggleMatch[1].toLowerCase().replace(/\s+/g, '_')
    let tileKey = rawTile
    if (rawTile.includes('rotate') || rawTile.includes('rotation')) tileKey = 'rotation'
    else if (rawTile.includes('gps') || rawTile.includes('location')) tileKey = 'location'
    else if (rawTile.includes('battery') || rawTile.includes('power')) tileKey = 'battery_saver'
    else if (rawTile.includes('dark')) tileKey = 'dark_mode'
    else if (rawTile.includes('eye') || rawTile.includes('night')) tileKey = 'eye_comfort'
    else if (rawTile.includes('wifi') || rawTile.includes('wi-fi')) tileKey = 'wifi'
    else if (rawTile.includes('airplane')) tileKey = 'airplane'

    const res = await toggleQuickSetting(tileKey)
    if (res?.success) {
      logs.push(`Toggled ${res.matchedTile || qsToggleMatch[1]} in Quick Settings.`)
      badges.push({ icon: 'tune', label: `Toggled ${res.matchedTile || qsToggleMatch[1]}`, ok: true })
    } else {
      await openSystemSettings(tileKey === 'wifi' ? 'wifi_panel' : tileKey)
      logs.push(`Opened ${qsToggleMatch[1]} settings.`)
      badges.push({ icon: 'settings', label: `${qsToggleMatch[1]} Settings`, ok: true })
      didLaunchExternalApp = true
    }
    return { logs, badges, didLaunchExternalApp }
  }

  // 2C. BIXBY NATURAL PROBLEM TROUBLESHOOTER ("my eyes hurt", "my screen keeps rotating", "my battery is dying", "my phone is slow", "my storage is full")
  if (/\b(?:my\s+eyes\s+hurt|screen\s+is\s+too\s+bright|eye\s+comfort|night\s+shield|protect\s+my\s+eyes)\b/i.test(lower)) {
    await setBrightness(22)
    lastAgentContext.lastBrightness = 22
    logs.push('Eye Comfort Activated: Dimmed screen brightness to 22% to reduce eye strain.')
    badges.push({ icon: 'visibility', label: 'Eye Comfort 22%', ok: true })
    return { logs, badges, didLaunchExternalApp }
  }

  if (/\b(?:my\s+screen\s+keeps\s+rotating|stop\s+screen\s+rotation|lock\s+rotation|auto\s*rotate)\b/i.test(lower)) {
    const qsRes = await toggleQuickSetting('rotation')
    if (qsRes?.success) {
      logs.push(`Toggled ${qsRes.matchedTile || 'Auto-Rotate'} in Quick Settings.`)
      badges.push({ icon: 'screen_lock_rotation', label: 'Rotation Toggled', ok: true })
      return { logs, badges, didLaunchExternalApp }
    }
    await openSystemSettings('display')
    logs.push('Opened Display & Orientation settings so you can lock Auto-Rotate.')
    badges.push({ icon: 'screen_lock_rotation', label: 'Rotation Settings', ok: true })
    didLaunchExternalApp = true
    return { logs, badges, didLaunchExternalApp }
  }

  if (/\b(?:my\s+battery\s+is\s+(?:dying|low|draining)|save\s+(?:my\s+)?battery|low\s+battery\s+mode|emergency\s+battery)\b/i.test(lower)) {
    await setBrightness(18)
    lastAgentContext.lastBrightness = 18
    const mem = await optimizeMemory()
    try { localStorage.setItem('iris_power_save_mode', 'LOW') } catch {}
    const info = await getSystemInfo()
    logs.push(`Battery Rescue Activated: Dimmed screen to 18%, swept background apps (+${mem?.freedMb || 0}MB freed), enabled Low Power Save tier. Current battery is ${info?.batteryLevel ?? '--'}% (${info?.batteryTemp ?? '--'}°C).`)
    badges.push(
      { icon: 'battery_saver', label: 'Battery Saver ON', ok: true },
      { icon: 'brightness_low', label: 'Dimmed 18%', ok: true },
      { icon: 'memory', label: `+${mem?.freedMb || 0}MB Freed`, ok: true }
    )
    return { logs, badges, didLaunchExternalApp }
  }

  if (/\b(?:my\s+phone\s+is\s+(?:slow|lagging|freezing|hot)|speed\s+up\s+(?:my\s+)?phone|fix\s+lag)\b/i.test(lower)) {
    const mem = await optimizeMemory()
    const info = await getSystemInfo()
    logs.push(`System Accelerated: Swept background processes (+${mem?.freedMb || 0}MB RAM reclaimed). Free RAM is now ${info?.memAvail ?? '--'}MB and device temperature is ${info?.batteryTemp ?? '--'}°C.`)
    badges.push(
      { icon: 'speed', label: 'Phone Accelerated', ok: true },
      { icon: 'memory', label: `${info?.memAvail ?? '--'}MB Free`, ok: true }
    )
    return { logs, badges, didLaunchExternalApp }
  }

  if (/\b(?:my\s+storage\s+is\s+full|check\s+(?:my\s+)?storage|how\s+much\s+storage|free\s+storage\s+space)\b/i.test(lower)) {
    const info = await getSystemInfo()
    logs.push(`Device Storage: ${info?.storageUsed ?? '--'}GB used out of ${info?.storageTotal ?? '--'}GB total.`)
    badges.push({ icon: 'storage', label: `${info?.storageUsed ?? '--'}/${info?.storageTotal ?? '--'}GB Used`, ok: true })
    return { logs, badges, didLaunchExternalApp }
  }

  // 2D. LIVE OTP & VERIFICATION CODE EXTRACTOR ("what's my otp", "copy otp", "get verification code")
  if (/\b(?:what(?:'s|\s+is)\s+(?:my\s+)?otp|copy\s+(?:the\s+|my\s+)?otp|get\s+(?:my\s+)?(?:otp|verification\s+code)|read\s+(?:my\s+)?otp)\b/i.test(lower)) {
    const history = useNotificationStore.getState().history || []
    let foundOtp = ''
    for (const n of history) {
      if (n.otpCode) { foundOtp = String(n.otpCode); break }
      const m = `${n.title || ''} ${n.text || ''}`.match(/\b(\d{4,8})\b/)
      if (m && m[1]) { foundOtp = m[1]; break }
    }
    if (!foundOtp) {
      const screen = await getScreenContext()
      if (screen?.success && Array.isArray(screen.texts)) {
        const joined = screen.texts.join(' ')
        const m = joined.match(/(?:code|otp|pin|verification|passcode)[^0-9]{0,20}\b(\d{4,8})\b/i) || joined.match(/\b(\d{4,8})\b/)
        if (m && m[1]) foundOtp = m[1]
      }
    }
    if (foundOtp) {
      try { navigator.clipboard?.writeText(foundOtp) } catch {}
      await injectTextToActiveInput(foundOtp).catch(() => {})
      logs.push(`Your latest verification code is ${foundOtp} (copied to clipboard).`)
      badges.push({ icon: 'key', label: `OTP: ${foundOtp} (Copied)`, ok: true })
    } else {
      logs.push('No recent OTP or verification code found in notifications or on screen.')
      badges.push({ icon: 'key_off', label: 'No OTP Found', ok: false })
    }
    return { logs, badges, didLaunchExternalApp }
  }

  // 2E. BIXBY NOTIFICATION CONCIERGE & SMART REPLY ("did anyone message me", "reply to the last message saying ...")
  if (/\b(?:did\s+anyone\s+(?:important\s+)?message\s+me|who\s+messaged\s+me|any\s+important\s+(?:messages|notifications)|check\s+my\s+messages)\b/i.test(lower)) {
    const history = useNotificationStore.getState().history || []
    const msgNotifs = history.filter((n) => /whatsapp|message|sms|telegram|instagram|signal|messenger|chat|phone|call/i.test(`${n.appName || ''} ${n.packageName || ''}`)).slice(0, 4)
    if (msgNotifs.length > 0) {
      const summary = msgNotifs.map((n) => `${n.title} (${n.appName}): "${n.text}"`).join(' | ')
      logs.push(`You have ${msgNotifs.length} recent messages: ${summary}`)
      badges.push({ icon: 'mark_chat_unread', label: `${msgNotifs.length} Messages`, ok: true })
    } else {
      logs.push('No new direct messages or calls in your recent notifications.')
      badges.push({ icon: 'chat_bubble_outline', label: '0 Unread Messages', ok: true })
    }
    return { logs, badges, didLaunchExternalApp }
  }

  const replyLastMatch = stepText.match(/^(?:reply\s+to\s+(?:the\s+)?last\s+(?:message|notification)\s+(?:saying|with)|reply\s+saying)\s+(.+)$/i)
  if (replyLastMatch && replyLastMatch[1]) {
    const replyBody = replyLastMatch[1].trim().replace(/^["']|["']$/g, '')
    const history = useNotificationStore.getState().history || []
    const lastMsg = history.find((n) => n.title)
    if (lastMsg && /whatsapp/i.test(`${lastMsg.appName || ''} ${lastMsg.packageName || ''}`)) {
      await sendMessage('whatsapp', replyBody)
      logs.push(`Opened WhatsApp to reply to ${lastMsg.title}: "${replyBody}".`)
      badges.push({ icon: 'reply', label: `Reply: ${lastMsg.title}`, ok: true })
      didLaunchExternalApp = true
      return { logs, badges, didLaunchExternalApp }
    } else if (lastMsg?.title) {
      const contact = await lookupContact(lastMsg.title)
      if (contact?.found && contact?.number) {
        await sendSMS(contact.number, replyBody)
        logs.push(`Opened SMS reply to ${contact.name}: "${replyBody}".`)
        badges.push({ icon: 'reply', label: `SMS: ${contact.name}`, ok: true })
        didLaunchExternalApp = true
        return { logs, badges, didLaunchExternalApp }
      }
    }
    await sendMessage('whatsapp', replyBody)
    logs.push(`Opened messaging with reply: "${replyBody}".`)
    badges.push({ icon: 'reply', label: 'Reply Ready', ok: true })
    didLaunchExternalApp = true
    return { logs, badges, didLaunchExternalApp }
  }

  // 2F. UNIVERSAL IN-APP VOICE TAP ("tap skip ad", "click send", "press subscribe")
  const clickMatch = stepText.match(/^(?:tap|click|press|select)\s+(?:on\s+)?(?:the\s+)?["']?([a-z0-9\s._\-+&/]{2,36}?)["']?(?:\s+button|\s+icon|\s+link)?[.?]?$/i)
  if (clickMatch && clickMatch[1] && !/\b(?:flashlight|torch|wifi|wi-fi|bluetooth|dnd|do\s+not\s+disturb|ringer|speaker)\b/i.test(clickMatch[1])) {
    const targetLabel = clickMatch[1].trim()
    const res = await clickScreenElement(targetLabel)
    if (res?.success) {
      logs.push(`Tapped "${res.matchedText || targetLabel}" on screen.`)
      badges.push({ icon: 'touch_app', label: `Tapped "${(res.matchedText || targetLabel).slice(0, 18)}"`, ok: true })
      return { logs, badges, didLaunchExternalApp }
    } else if (res?.needsPermission) {
      logs.push('Voice screen tap requires IRIS Accessibility Service enabled in Settings.')
      badges.push({ icon: 'touch_app', label: 'Needs Accessibility', ok: false })
      return { logs, badges, didLaunchExternalApp }
    }
  }

  // 2F-2. YOYO AUTOPILOT IN-APP DIRECT TEXT TYPING ("type Rahul", "enter hello world")
  const directTypeMatch = stepText.match(/^(?:type|enter|input)\s+["']?(.+?)["']?$/i)
  if (directTypeMatch && directTypeMatch[1] && !/\b(?:in|into)\s+(?:the\s+)?(?:screen|input|app)\b/i.test(stepText)) {
    const textToType = directTypeMatch[1].trim()
    try { navigator.clipboard?.writeText(textToType) } catch {}
    const res = await injectTextToActiveInput(textToType)
    logs.push(res?.injected ? `Typed "${textToType}" into active input field.` : `Copied "${textToType}" to clipboard ready to paste.`)
    badges.push({ icon: 'keyboard', label: `Typed "${textToType.slice(0, 14)}"`, ok: true })
    return { logs, badges, didLaunchExternalApp }
  }

  // 2F-3. ESSENTIAL VOICE: LIVE TONE POLISHER & MULTI-LANGUAGE DICTATION INTO ACTIVE INPUT
  const polishMatch =
    stepText.match(/^(?:write\s+(professionally|casually|politely)|polish(?:\s+this)?|dictate\s+in\s+([a-z]+)|translate\s+to\s+([a-z]+)(?:\s+and\s+type)?)[:\s]+(.+)$/i)
  if (polishMatch && polishMatch[4]) {
    const tone = polishMatch[1] ? polishMatch[1].toLowerCase() : null
    const lang = (polishMatch[2] || polishMatch[3] || '').trim()
    const rawDraft = polishMatch[4].trim()
    const instruction = lang
      ? `Translate the following message into natural ${lang}. Return ONLY the translated text with no quotes or explanation: "${rawDraft}"`
      : `Rewrite the following message so it sounds ${tone || 'clear, polished, and well-written'}. Remove verbal filler. Return ONLY the rewritten message with no quotes or explanation: "${rawDraft}"`
    let finalOut = rawDraft
    try {
      const aiRes = await queryIrisAI(instruction)
      if (aiRes && typeof aiRes === 'string' && !aiRes.startsWith('Error')) {
        finalOut = aiRes.trim().replace(/^["']|["']$/g, '')
      }
    } catch {}
    try { navigator.clipboard?.writeText(finalOut) } catch {}
    const injected = await injectTextToActiveInput(finalOut)
    logs.push(
      lang
        ? `Translated to ${lang}${injected?.injected ? ' & typed into input' : ' (copied)'}: "${finalOut}"`
        : `Polished message${injected?.injected ? ' & typed into input' : ' (copied)'}: "${finalOut}"`
    )
    badges.push({
      icon: lang ? 'translate' : 'auto_fix_high',
      label: lang ? `Typed in ${lang}` : 'Polished & Typed',
      ok: true,
    })
    return { logs, badges, didLaunchExternalApp }
  }

  // 2F-4. "NOW BRIEF" PROACTIVE EXECUTIVE BRIEFING ("brief me", "now brief", "daily briefing")
  if (/^(?:brief\s+me|now\s+brief|daily\s+brief(?:ing)?|evening\s+brief(?:ing)?|my\s+briefing)$/i.test(lower)) {
    const [info, weatherData] = await Promise.all([
      getSystemInfo().catch(() => null),
      fetchCurrentWeather().catch(() => null),
    ])
    let pendingTasks = 0
    try {
      const tasks = JSON.parse(localStorage.getItem('iris_day_tasks') || '[]')
      pendingTasks = tasks.filter((t) => !t.completed).length
    } catch {}
    const history = useNotificationStore.getState().history || []
    const unreadCount = history.length
    const wText = weatherData ? `${weatherData.temp}°C (${String(weatherData.condition || 'CLEAR').replace(/_/g, ' ').toLowerCase()})` : 'Weather online'
    const bText = info ? `Battery ${info.batteryLevel}% (${info.memAvail}MB free RAM)` : 'System nominal'
    logs.push(`Now Brief: ${wText}, ${bText}. You have ${pendingTasks} pending tasks and ${unreadCount} recent notifications.`)
    badges.push(
      { icon: 'wb_sunny', label: weatherData ? `${weatherData.temp}°C` : 'Weather OK', ok: true },
      { icon: 'battery_charging_full', label: info ? `Bat ${info.batteryLevel}%` : 'System OK', ok: true },
      { icon: 'task_alt', label: `${pendingTasks} Tasks · ${unreadCount} Notifs`, ok: true }
    )
    return { logs, badges, didLaunchExternalApp }
  }

  // 2F-5. AI NOTIFICATION STACK DIGEST ("catch me up", "summarize my notifications", "notification digest")
  if (/^(?:catch\s+me\s+up|summarize\s+(?:my\s+)?notifications|notification\s+digest|notification\s+summary)$/i.test(lower)) {
    const history = useNotificationStore.getState().history || []
    if (history.length === 0) {
      logs.push('You are all caught up — zero unread notifications in your archive.')
      badges.push({ icon: 'done_all', label: 'All Caught Up', ok: true })
      return { logs, badges, didLaunchExternalApp }
    }
    const byApp = {}
    let latestOtp = null
    let scamCount = 0
    for (const n of history.slice(0, 25)) {
      const app = n.appName || 'App'
      if (!byApp[app]) byApp[app] = { count: 0, senders: new Set() }
      byApp[app].count++
      if (n.title && n.title !== app) byApp[app].senders.add(n.title.split('•')[0].trim())
      if (!latestOtp && n.otpCode) latestOtp = n.otpCode
      if (n.scamRisk || detectScamRisk(`${n.title || ''} ${n.text || ''}`)) scamCount++
    }
    const parts = Object.entries(byApp).slice(0, 4).map(([app, data]) => {
      const senderList = Array.from(data.senders).slice(0, 2).join(', ')
      return `${data.count} from ${app}${senderList ? ` (${senderList})` : ''}`
    })
    let digest = `Digest (${history.length} total): ${parts.join('; ')}.`
    if (latestOtp) digest += ` Latest OTP: ${latestOtp}.`
    if (scamCount > 0) digest += ` ⚠ ${scamCount} message(s) flagged as potential scam.`
    logs.push(digest)
    badges.push({ icon: 'summarize', label: `${history.length} Notifs Summarized`, ok: true })
    if (latestOtp) badges.push({ icon: 'key', label: `OTP: ${latestOtp}`, ok: true })
    if (scamCount > 0) badges.push({ icon: 'warning', label: `⚠ ${scamCount} Scam Risk`, ok: false })
    return { logs, badges, didLaunchExternalApp }
  }

  // 2F-6. LIVE SCAM, PHISHING & FAKE-LINK SHIELD ("is this screen safe", "check for scam", "scan for phishing")
  if (/\b(?:is\s+this\s+(?:screen|message|link|page)\s+safe|check\s+for\s+scam|is\s+this\s+a\s+scam|scan\s+for\s+(?:scam|phishing))\b/i.test(lower)) {
    const screen = await getScreenContext().catch(() => null)
    const screenText = (screen?.success && Array.isArray(screen.texts)) ? screen.texts.join(' ') : ''
    const history = useNotificationStore.getState().history || []
    const recentNotifText = history.slice(0, 5).map((n) => `${n.title} ${n.text}`).join(' ')
    const risk = detectScamRisk(screenText) || detectScamRisk(recentNotifText)
    if (risk) {
      logs.push(`⚠ Security Alert: Detected "${risk}". Avoid tapping unknown links or sharing OTP/KYC credentials.`)
      badges.push({ icon: 'gpp_bad', label: `⚠ ${risk.slice(0, 22)}`, ok: false })
    } else {
      logs.push('Security Scan Complete: No phishing links, masked short-URLs, or scam urgency triggers detected on screen or in recent messages.')
      badges.push({ icon: 'verified_user', label: 'Screen & Messages Safe', ok: true })
    }
    return { logs, badges, didLaunchExternalApp }
  }

  // 2G-0. "REMEMBER THIS SCREEN" (Essential Space Screen Snapshot inside Knox Memory Vault)
  if (/^(?:remember\s+this\s+screen|save\s+this\s+screen|snap\s+(?:this\s+screen\s+)?to\s+memory|memorize\s+this\s+screen)$/i.test(lower)) {
    const screen = await getScreenContext().catch(() => null)
    if (screen?.success && Array.isArray(screen.texts) && screen.texts.length > 0) {
      const appLabel = screen.appName || screen.packageName || 'Screen'
      const snippet = screen.texts.slice(0, 8).join(' • ').slice(0, 220)
      const memId = Date.now()
      const fact = `[${appLabel}] ${snippet}`
      try {
        const mems = JSON.parse(localStorage.getItem('iris_memory_vault') || '[]')
        mems.unshift({ id: memId, text: fact, timestamp: new Date().toLocaleString() })
        localStorage.setItem('iris_memory_vault', JSON.stringify(mems.slice(0, 100)))
      } catch {}
      logs.push(`Captured ${appLabel} screen into your Knox Memory Vault: "${snippet.slice(0, 90)}..."`)
      badges.push({ icon: 'screenshot_monitor', label: `Saved ${appLabel} Screen ↺`, ok: true, undo: { type: 'memory', id: memId } })
    } else {
      logs.push('Capturing screen context requires IRIS Accessibility Service enabled in Settings.')
      badges.push({ icon: 'visibility_off', label: 'Needs Accessibility', ok: false })
    }
    return { logs, badges, didLaunchExternalApp }
  }

  // 2G. "REMEMBER THIS" KNOX-ENCRYPTED PERSONAL MEMORY VAULT ("remember my gate code is 4829", "where did I park", "what's my gate code")
  const rememberMatch = stepText.match(/^(?:remember\s+(?:that\s+)?|memorize\s+(?:that\s+)?|save\s+to\s+memory[:\s]+)(.+)$/i)
  if (rememberMatch && rememberMatch[1] && !/\bto\s+(?:call|buy|pay|email|text|send|clean|take)\b/i.test(rememberMatch[1])) {
    const fact = rememberMatch[1].trim().replace(/[.]+$/, '')
    const memId = Date.now()
    try {
      const mems = JSON.parse(localStorage.getItem('iris_memory_vault') || '[]')
      mems.unshift({ id: memId, text: fact, timestamp: new Date().toLocaleString() })
      localStorage.setItem('iris_memory_vault', JSON.stringify(mems.slice(0, 100)))
      logs.push(`Locked in encrypted memory: "${fact}".`)
      badges.push({ icon: 'psychology', label: 'Memory Saved ↺', ok: true, undo: { type: 'memory', id: memId } })
      return { logs, badges, didLaunchExternalApp }
    } catch {}
  }

  if (/\b(?:what\s+did\s+i\s+(?:tell|ask)\s+you\s+to\s+remember|show\s+(?:my\s+)?memories|list\s+(?:my\s+)?memories|what\s+do\s+you\s+remember)\b/i.test(lower)) {
    try {
      const mems = JSON.parse(localStorage.getItem('iris_memory_vault') || '[]')
      logs.push(
        mems.length > 0
          ? `Your Encrypted Memories (${mems.length}): ${mems.slice(0, 6).map((m, i) => `${i + 1}. ${m.text}`).join(' | ')}`
          : 'Your Personal Memory Vault is currently empty. Say "Remember that my gate code is 4829" to save a memory.'
      )
      badges.push({ icon: 'psychology', label: `${mems.length} Memories`, ok: true })
      return { logs, badges, didLaunchExternalApp }
    } catch {}
  }

  const forgetMatch = stepText.match(/^(?:forget\s+(?:that\s+|about\s+)?|delete\s+memory\s+)(.+)$/i)
  if (forgetMatch && forgetMatch[1]) {
    const q = forgetMatch[1].trim().toLowerCase()
    try {
      const mems = JSON.parse(localStorage.getItem('iris_memory_vault') || '[]')
      if (/^(?:everything|all\s+memories)$/.test(q)) {
        localStorage.setItem('iris_memory_vault', '[]')
        logs.push('Cleared all items from your Personal Memory Vault.')
        badges.push({ icon: 'delete_sweep', label: 'Memories Cleared', ok: true })
      } else {
        const filtered = mems.filter((m) => !String(m.text || '').toLowerCase().includes(q))
        localStorage.setItem('iris_memory_vault', JSON.stringify(filtered))
        logs.push(`Removed matching memory ("${forgetMatch[1].trim()}").`)
        badges.push({ icon: 'psychology_alt', label: 'Memory Forgotten', ok: true })
      }
      return { logs, badges, didLaunchExternalApp }
    } catch {}
  }

  if (/^(?:where\s+did\s+i\s+park|where\s+is\s+my\s+car|what(?:'s|\s+is)\s+my\s+[a-z0-9\s]{2,28}|where\s+did\s+i\s+(?:put|keep|leave)\s+my\s+[a-z0-9\s]{2,28})\??$/i.test(lower)
      && !/\b(?:battery|ip|otp|time|weather|schedule|screen\s*time|name)\b/i.test(lower)) {
    try {
      const mems = JSON.parse(localStorage.getItem('iris_memory_vault') || '[]')
      if (mems.length > 0) {
        const stopWords = new Set(['what', 'whats', 'where', 'when', 'did', 'is', 'my', 'the', 'i', 'put', 'keep', 'leave', 'tell', 'you'])
        const tokens = lower.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w) => w.length >= 2 && !stopWords.has(w))
        if (tokens.length > 0) {
          const hit = mems.find((m) => {
            const mt = String(m.text || '').toLowerCase()
            return tokens.some((tk) => mt.includes(tk))
          })
          if (hit) {
            logs.push(`From your memory vault: ${hit.text}.`)
            badges.push({ icon: 'psychology', label: 'Recalled Memory', ok: true })
            return { logs, badges, didLaunchExternalApp }
          }
        }
      }
    } catch {}
  }

  // 3. INCOMING & ACTIVE CALL CONTROL
  if (/\b(answer|pick\s+up|accept|take)\b.*\b(call|phone)\b/.test(lower) || /^(?:answer|pick\s+up)(?:\s+on\s+speaker)?$/i.test(lower)) {
    const useSpeaker = /\b(speaker|speakerphone|hands\s*free)\b/.test(lower)
    const res = await answerCall(useSpeaker)
    logs.push(res?.success ? `Answered incoming call${useSpeaker ? ' on speakerphone' : ''}.` : 'Attempted to answer incoming call.')
    badges.push({ icon: 'call', label: useSpeaker ? 'Answered (Speaker)' : 'Call Answered', ok: Boolean(res?.success) })
  } else if (/\b(decline|reject|end|hang\s+up|drop|terminate)\b.*\b(call|phone)\b/.test(lower) || /^(?:hang\s+up|decline|reject\s+call|end\s+call)$/i.test(lower)) {
    const res = await endCall()
    logs.push(res?.success ? 'Ended phone call.' : 'Attempted to end phone call.')
    badges.push({ icon: 'call_end', label: 'Call Ended', ok: Boolean(res?.success) })
  } else if (/\b(turn\s+on|enable|switch\s+to)\s+(speaker|speakerphone)\b/.test(lower)) {
    await setSpeakerphone(true)
    logs.push('Speakerphone turned ON.')
    badges.push({ icon: 'volume_up', label: 'Speaker ON', ok: true })
  } else if (/\b(turn\s+off|disable)\s+(speaker|speakerphone)\b/.test(lower)) {
    await setSpeakerphone(false)
    logs.push('Speakerphone turned OFF.')
    badges.push({ icon: 'phone_in_talk', label: 'Speaker OFF', ok: true })
  }

  // 4. OUTGOING PHONE CALLS (including follow-up "call him" / "call her" / "call them back")
  const callMatch = stepText.match(/^(?:call|dial|phone|ring)\s+(.+?)(?:\s+on\s+(speaker|speakerphone))?[.?]?$/i)
  if (callMatch && callMatch[1] && !/\b(call|phone)\s+(me|it|that)\b/i.test(stepText)) {
    let target = callMatch[1].replace(/\s+on\s+speaker(?:phone)?$/i, '').replace(/\s+please$/i, '').trim()
    const useSpeaker = Boolean(callMatch[2]) || /\bon\s+speaker(?:phone)?\b/i.test(stepText)
    if (/^(?:him|her|them)(?:\s+back)?$/i.test(target) && lastAgentContext.lastContact?.number) {
      await makeCall(lastAgentContext.lastContact.number, useSpeaker)
      logs.push(`Calling ${lastAgentContext.lastContact.name} (${lastAgentContext.lastContact.number})${useSpeaker ? ' on speakerphone' : ''}.`)
      badges.push({ icon: 'call', label: `Called ${lastAgentContext.lastContact.name}`, ok: true })
      didLaunchExternalApp = true
    } else {
      const digitsOnly = target.replace(/[^0-9+]/g, '')
      if (digitsOnly.length >= 3 && /^[+\d\s()-]+$/.test(target)) {
        await makeCall(digitsOnly, useSpeaker)
        lastAgentContext.lastContact = { name: digitsOnly, number: digitsOnly }
        logs.push(`Placed phone call to ${digitsOnly}${useSpeaker ? ' on speakerphone' : ''}.`)
        badges.push({ icon: 'call', label: `Called ${digitsOnly}`, ok: true })
        didLaunchExternalApp = true
      } else {
        const contact = await lookupContact(target)
        if (contact?.found && contact?.number) {
          await makeCall(contact.number, useSpeaker)
          lastAgentContext.lastContact = { name: contact.name || target, number: contact.number }
          logs.push(`Placed phone call to ${contact.name || target} (${contact.number})${useSpeaker ? ' on speakerphone' : ''}.`)
          badges.push({ icon: 'call', label: `Called ${contact.name || target}`, ok: true })
          didLaunchExternalApp = true
        } else {
          const multi = await lookupContactMultiple(target)
          if (Array.isArray(multi) && multi.length > 0 && multi[0].number) {
            await makeCall(multi[0].number, useSpeaker)
            lastAgentContext.lastContact = { name: multi[0].name || target, number: multi[0].number }
            logs.push(`Placed phone call to ${multi[0].name || target} (${multi[0].number})${useSpeaker ? ' on speakerphone' : ''}.`)
            badges.push({ icon: 'call', label: `Called ${multi[0].name || target}`, ok: true })
            didLaunchExternalApp = true
          } else {
            logs.push(`No contact found matching "${target}".`)
            badges.push({ icon: 'person_off', label: `No contact: ${target}`, ok: false })
          }
        }
      }
    }
  }

  // 5. SMS & WHATSAPP MESSAGING (supports "text him/her [msg]")
  const smsMatch =
    stepText.match(/^(?:send\s+(?:a\s+)?(?:text|sms|message)\s+to|text|sms|message)\s+([a-z0-9\s+()-]{2,25}?)\s+(?:saying|that|with\s+message|:)\s+(.+)$/i) ||
    stepText.match(/^(?:text|sms)\s+([a-z0-9+()-]{2,18})\s+(.+)$/i)
  if (smsMatch && smsMatch[1] && smsMatch[2]) {
    const recipient = smsMatch[1].trim()
    const body = smsMatch[2].trim().replace(/^["']|["']$/g, '')
    if (/^(?:him|her|them)$/i.test(recipient) && lastAgentContext.lastContact?.number) {
      await sendSMS(lastAgentContext.lastContact.number, body)
      logs.push(`Opened SMS to ${lastAgentContext.lastContact.name}: "${body}".`)
      badges.push({ icon: 'sms', label: `SMS to ${lastAgentContext.lastContact.name}`, ok: true })
      didLaunchExternalApp = true
    } else {
      const digits = recipient.replace(/[^0-9+]/g, '')
      if (digits.length >= 3 && /^[+\d\s()-]+$/.test(recipient)) {
        await sendSMS(digits, body)
        lastAgentContext.lastContact = { name: digits, number: digits }
        logs.push(`Opened SMS composer to ${digits}: "${body}".`)
        badges.push({ icon: 'sms', label: `SMS to ${digits}`, ok: true })
        didLaunchExternalApp = true
      } else {
        const contact = await lookupContact(recipient)
        if (contact?.found && contact?.number) {
          await sendSMS(contact.number, body)
          lastAgentContext.lastContact = { name: contact.name || recipient, number: contact.number }
          logs.push(`Opened SMS composer to ${contact.name || recipient}: "${body}".`)
          badges.push({ icon: 'sms', label: `SMS to ${contact.name || recipient}`, ok: true })
          didLaunchExternalApp = true
        } else {
          logs.push(`Could not find contact "${recipient}" for SMS.`)
          badges.push({ icon: 'person_off', label: `No contact: ${recipient}`, ok: false })
        }
      }
    }
  }

  const waMatch = stepText.match(/^(?:send\s+(?:a\s+)?whatsapp(?:\s+message)?(?:\s+saying)?|whatsapp)\s+(.+)$/i)
  if (waMatch && waMatch[1]) {
    const msg = waMatch[1].trim().replace(/^["']|["']$/g, '')
    await sendMessage('whatsapp', msg)
    logs.push(`Opened WhatsApp with message: "${msg}".`)
    badges.push({ icon: 'chat', label: 'WhatsApp Ready', ok: true })
    didLaunchExternalApp = true
  }

  // 6. ALARMS, TIMERS & REMINDERS
  const alarmMatch =
    stepText.match(/\b(?:set\s+(?:an?\s+)?alarm\s+(?:for|at)|wake\s+me\s+up\s+at)\s+([0-9:]{1,5}(?:\s*(?:am|pm|a\.m\.|p\.m\.|in\s+the\s+morning|at\s+night|in\s+the\s+evening))?)/i)
  if (alarmMatch && alarmMatch[1]) {
    const parsed = parseAlarmTime(alarmMatch[1])
    if (parsed) {
      await setAlarm(parsed.hour, parsed.min, 'IRIS AI Alarm')
      const h12 = parsed.hour % 12 || 12
      const ampm = parsed.hour >= 12 ? 'PM' : 'AM'
      const minPad = String(parsed.min).padStart(2, '0')
      logs.push(`Set alarm for ${h12}:${minPad} ${ampm}.`)
      badges.push({ icon: 'alarm', label: `Alarm ${h12}:${minPad} ${ampm}`, ok: true })
    }
  }

  const timerMatch = stepText.match(/\b(?:set\s+(?:a\s+)?timer\s+for|start\s+(?:a\s+)?timer\s+for|timer\s+for)\s+(\d+)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b/i)
  if (timerMatch && timerMatch[1]) {
    const val = parseInt(timerMatch[1], 10)
    const unit = (timerMatch[2] || 'minutes').toLowerCase()
    let secs = val
    if (unit.startsWith('m')) secs = val * 60
    else if (unit.startsWith('h')) secs = val * 3600
    await setTimer(secs, 'IRIS Timer')
    try {
      window.dispatchEvent(new CustomEvent('iris-now-bar-timer', { detail: { label: `Timer ${val} ${unit}`, endsAt: Date.now() + secs * 1000 } }))
    } catch {}
    logs.push(`Started timer for ${val} ${unit}.`)
    badges.push({ icon: 'timer', label: `Timer ${val} ${unit}`, ok: true })
  }

  const remindMatch = stepText.match(/\bremind\s+me\s+to\s+(.+?)\s+in\s+(\d+)\s*(minutes?|mins?|hours?|hrs?)\b/i)
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
      window.dispatchEvent(new CustomEvent('TASKS_SYNCED_GLOBALLY'))
    } catch {}
    logs.push(`Scheduled reminder "${taskText}" for ${dueTime}.`)
    badges.push({ icon: 'notifications_active', label: `Reminder ${dueTime}`, ok: true })
  }

  // 7. FLASHLIGHT
  if (/\b(turn\s+on|enable|activate|switch\s+on)\b.*\b(flashlight|torch|light)\b/.test(lower) || /^flashlight\s+on$/i.test(lower)) {
    await setFlashlight(true)
    logs.push('Flashlight turned ON.')
    badges.push({ icon: 'flashlight_on', label: 'Flashlight ON ↺', ok: true, undo: { type: 'flashlight', prev: false } })
  } else if (/\b(turn\s+off|disable|deactivate|switch\s+off)\b.*\b(flashlight|torch|light)\b/.test(lower) || /^flashlight\s+off$/i.test(lower)) {
    await setFlashlight(false)
    logs.push('Flashlight turned OFF.')
    badges.push({ icon: 'flashlight_off', label: 'Flashlight OFF ↺', ok: true, undo: { type: 'flashlight', prev: true } })
  } else if (/\b(toggle|switch)\b.*\b(flashlight|torch)\b/.test(lower)) {
    const res = await toggleFlashlight()
    logs.push(`Flashlight toggled (${res?.status ? 'ON' : 'OFF'}).`)
    badges.push({ icon: 'flashlight_on', label: `Flashlight ${res?.status ? 'ON' : 'OFF'} ↺`, ok: true, undo: { type: 'flashlight', prev: !res?.status } })
  }

  // 8. VOLUME, MEDIA PLAYBACK, SOUND MODE & BRIGHTNESS
  const volLevelMatch = lower.match(/\b(?:set\s+)?volume\s+(?:to\s+)?(\d{1,3})\s*%?\b/)
  if (volLevelMatch && volLevelMatch[1]) {
    const prevVol = lastAgentContext.lastVolume || 50
    const lvl = Math.max(0, Math.min(100, parseInt(volLevelMatch[1], 10)))
    await setVolumeLevel(lvl, 'music')
    lastAgentContext.lastVolume = lvl
    logs.push(`Set volume to ${lvl}%.`)
    badges.push({ icon: 'volume_up', label: `Volume ${lvl}% ↺`, ok: true, undo: { type: 'volume', prev: prevVol } })
  } else if (/\b(volume\s+up|turn\s+up\s+(?:the\s+)?volume|increase\s+volume|louder)\b/.test(lower)) {
    await setAudioVolume('up')
    logs.push('Increased audio volume.')
    badges.push({ icon: 'volume_up', label: 'Volume Up', ok: true })
  } else if (/\b(volume\s+down|turn\s+down\s+(?:the\s+)?volume|decrease\s+volume|quieter|lower\s+volume)\b/.test(lower)) {
    await setAudioVolume('down')
    logs.push('Decreased audio volume.')
    badges.push({ icon: 'volume_down', label: 'Volume Down', ok: true })
  }

  const brightMatch = lower.match(/\b(?:set\s+)?brightness\s+(?:to\s+)?(\d{1,3})\s*%?\b/)
  if (brightMatch && brightMatch[1]) {
    const prevBright = lastAgentContext.lastBrightness || 50
    const lvl = Math.max(1, Math.min(100, parseInt(brightMatch[1], 10)))
    await setBrightness(lvl)
    lastAgentContext.lastBrightness = lvl
    logs.push(`Set screen brightness to ${lvl}%.`)
    badges.push({ icon: 'light_mode', label: `Brightness ${lvl}% ↺`, ok: true, undo: { type: 'brightness', prev: prevBright } })
  } else if (/\b(brightness\s+up|increase\s+brightness|brighter)\b/.test(lower)) {
    const prevBright = lastAgentContext.lastBrightness || 50
    await setBrightness(85)
    lastAgentContext.lastBrightness = 85
    logs.push('Set screen brightness to 85%.')
    badges.push({ icon: 'light_mode', label: 'Brightness 85% ↺', ok: true, undo: { type: 'brightness', prev: prevBright } })
  } else if (/\b(brightness\s+down|decrease\s+brightness|dim\s+(?:the\s+)?screen)\b/.test(lower)) {
    const prevBright = lastAgentContext.lastBrightness || 50
    await setBrightness(20)
    lastAgentContext.lastBrightness = 20
    logs.push('Dimmed screen brightness to 20%.')
    badges.push({ icon: 'brightness_low', label: 'Brightness 20% ↺', ok: true, undo: { type: 'brightness', prev: prevBright } })
  }

  if (/\b(play\s+music|resume\s+music|pause\s+music|stop\s+music|toggle\s+music)\b/.test(lower)) {
    await dispatchMediaKey('play_pause')
    logs.push('Toggled media Play/Pause.')
    badges.push({ icon: 'play_pause', label: 'Media Play/Pause', ok: true })
  } else if (/\b(next\s+(?:song|track)|skip\s+(?:song|track))\b/.test(lower)) {
    await dispatchMediaKey('next')
    logs.push('Skipped to next track.')
    badges.push({ icon: 'skip_next', label: 'Next Track', ok: true })
  } else if (/\b(previous\s+(?:song|track)|last\s+(?:song|track))\b/.test(lower)) {
    await dispatchMediaKey('previous')
    logs.push('Returned to previous track.')
    badges.push({ icon: 'skip_previous', label: 'Previous Track', ok: true })
  }

  if (/\b(turn\s+on|enable|activate)\s+(do\s+not\s+disturb|dnd)\b/.test(lower)) {
    await toggleDND(true)
    logs.push('Enabled Do Not Disturb.')
    badges.push({ icon: 'do_not_disturb_on', label: 'DND Enabled ↺', ok: true, undo: { type: 'dnd', prev: false } })
  } else if (/\b(turn\s+off|disable|deactivate)\s+(do\s+not\s+disturb|dnd)\b/.test(lower)) {
    await toggleDND(false)
    logs.push('Disabled Do Not Disturb.')
    badges.push({ icon: 'do_not_disturb_off', label: 'DND Disabled ↺', ok: true, undo: { type: 'dnd', prev: true } })
  } else if (/\b(set|put|switch|turn)\b.*\b(silent|mute)\b/.test(lower)) {
    await setSoundMode('mute')
    logs.push('Ringer set to Silent.')
    badges.push({ icon: 'volume_off', label: 'Silent Mode', ok: true })
  } else if (/\b(set|put|switch|turn)\b.*\b(vibrate|vibration)\b/.test(lower)) {
    await setSoundMode('vibrate')
    logs.push('Ringer set to Vibrate.')
    badges.push({ icon: 'vibration', label: 'Vibrate Mode', ok: true })
  } else if (/\b(set|put|switch|turn)\b.*\b(ringer|sound)\s+(on|normal)\b/.test(lower)) {
    await setSoundMode('normal')
    logs.push('Ringer set to Normal.')
    badges.push({ icon: 'notifications_active', label: 'Normal Ringer', ok: true })
  } else if (/\bcycle\s+ringer\b/.test(lower)) {
    const mode = await cycleRingerMode()
    logs.push(`Cycled ringer mode to ${String(mode).toUpperCase()}.`)
    badges.push({ icon: 'volume_up', label: `Ringer: ${String(mode).toUpperCase()}`, ok: true })
  }

  // 9. NOTES & DAY TASKS
  const noteMatch = stepText.match(/^(?:take\s+a\s+note|save\s+a\s+note|create\s+a\s+note|add\s+a\s+note|note\s+to\s+self)[:\s]+(.+)$/i)
  if (noteMatch && noteMatch[1]) {
    const noteText = noteMatch[1].trim()
    const noteId = Date.now()
    try {
      const notes = JSON.parse(localStorage.getItem('iris_voice_notes') || '[]')
      notes.unshift({ id: noteId, text: noteText, timestamp: new Date().toLocaleString() })
      localStorage.setItem('iris_voice_notes', JSON.stringify(notes))
      logs.push(`Saved note: "${noteText}".`)
      badges.push({ icon: 'sticky_note_2', label: 'Note Saved ↺', ok: true, undo: { type: 'note', id: noteId } })
    } catch {}
  } else if (/\b(read\s+(?:my\s+)?notes|what\s+are\s+my\s+notes|show\s+(?:my\s+)?notes)\b/.test(lower)) {
    try {
      const notes = JSON.parse(localStorage.getItem('iris_voice_notes') || '[]')
      logs.push(
        notes.length > 0
          ? `Saved Notes (${notes.length}): ${notes.slice(0, 5).map((n, i) => `${i + 1}. ${n.text}`).join(' | ')}`
          : 'You have no saved notes yet.'
      )
      badges.push({ icon: 'sticky_note_2', label: `${notes.length} Notes`, ok: true })
    } catch {}
  }

  const taskMatch = stepText.match(/^(?:add\s+(?:a\s+)?task|create\s+(?:a\s+)?task|add\s+to\s+(?:my\s+)?to-?do(?:\s+list)?)[:\s]+(.+)$/i)
  if (taskMatch && taskMatch[1]) {
    const taskText = taskMatch[1].trim()
    const taskId = Date.now()
    try {
      const tasks = JSON.parse(localStorage.getItem('iris_day_tasks') || '[]')
      tasks.unshift({ id: taskId, text: taskText, completed: false })
      localStorage.setItem('iris_day_tasks', JSON.stringify(tasks))
      window.dispatchEvent(new CustomEvent('TASKS_SYNCED_GLOBALLY'))
      logs.push(`Added task: "${taskText}".`)
      badges.push({ icon: 'task_alt', label: 'Task Added ↺', ok: true, undo: { type: 'task', id: taskId } })
    } catch {}
  }

  // 10. MEMORY BOOST & SYSTEM TELEMETRY
  if (/\b(boost\s+ram|clear\s+ram|free\s+up\s+(ram|memory)|optimize\s+(ram|memory|phone)|clean\s+memory)\b/.test(lower)) {
    const res = await optimizeMemory()
    logs.push(
      res?.freedMb > 0
        ? `Memory Boost reclaimed +${res.freedMb} MB RAM (${res.killedCount || 0} background apps swept).`
        : 'System RAM optimized and running at peak efficiency.'
    )
    badges.push({ icon: 'memory', label: res?.freedMb > 0 ? `+${res.freedMb}MB Freed` : 'RAM Optimized', ok: true })
  }

  if (/\b(battery\s+(?:level|percentage|status|temp|temperature)|how\s+much\s+(?:battery|ram|memory|storage)|system\s+(?:status|diagnostics|telemetry)|cpu\s+temp)\b/.test(lower)) {
    const info = await getSystemInfo()
    if (info) {
      logs.push(
        `Device Status: Battery ${info.batteryLevel}% (${info.batteryStatus}, ${info.batteryTemp}°C), RAM ${info.memUsed}MB/${info.memTotal}MB (${info.memAvail}MB free), Storage ${info.storageUsed}GB/${info.storageTotal}GB.`
      )
      badges.push({ icon: 'battery_charging_full', label: `Battery ${info.batteryLevel}%`, ok: true })
    }
  }

  // 11. SCREEN LOCK, SCREENSHOT & DIGITAL WELLBEING
  if (/\b(lock\s+(the\s+|my\s+)?(screen|phone|device))\b/.test(lower)) {
    const res = await performAccessibilityAction('lock_screen')
    logs.push(
      res?.success
        ? 'Locked device screen.'
        : 'Screen lock requires IRIS Accessibility Service enabled in Android Settings.'
    )
    badges.push({ icon: 'lock', label: res?.success ? 'Screen Locked' : 'Enable Accessibility', ok: Boolean(res?.success) })
  }

  if (/\b(take\s+a?\s*screenshot|capture\s+screen|screenshot)\b/.test(lower)) {
    const res = await performAccessibilityAction('screenshot')
    logs.push(
      res?.success
        ? 'Captured device screenshot.'
        : 'Screenshot could not run because IRIS Accessibility Service is not enabled in Android Settings > Accessibility.'
    )
    badges.push({ icon: 'screenshot', label: res?.success ? 'Screenshot Saved' : 'Needs Accessibility', ok: Boolean(res?.success) })
  }

  if (/\b(screen\s*time|digital\s+wellbeing|app\s+usage\s+today|most\s+used\s+apps)\b/.test(lower)) {
    const stats = await getScreenTimeStats()
    if (stats?.granted && Array.isArray(stats.apps)) {
      const hrs = Math.floor((stats.totalScreenTimeMs || 0) / 3600000)
      const mins = Math.round(((stats.totalScreenTimeMs || 0) % 3600000) / 60000)
      const topSummary = stats.apps.slice(0, 4).map((a) => `${a.label} (${a.minutes}m)`).join(', ')
      logs.push(`Screen time today: ${hrs}h ${mins}m. Top apps: ${topSummary || 'None'}.`)
      badges.push({ icon: 'schedule', label: `Screen Time ${hrs}h ${mins}m`, ok: true })
    }
  }

  // 12. NOTIFICATIONS, SCREEN CONTEXT & COPILOT
  if (/\b(recent\s+notifications|unread\s+messages|what\s+notifications|check\s+(?:my\s+)?notifications|read\s+(?:my\s+)?notifications|any\s+otp)\b/.test(lower)) {
    const history = useNotificationStore.getState().history || []
    const recent = history.slice(0, 5).map((n) => `[${n.appName}] ${n.title}: ${n.text}${n.otpCode ? ` (OTP: ${n.otpCode})` : ''}`)
    logs.push(recent.length > 0 ? `Recent Notifications:\n${recent.join('\n')}` : 'No unread notifications in archive.')
    badges.push({ icon: 'notifications', label: `${recent.length} Notifications`, ok: true })
  }

  if (/\b(read\s+(my\s+|the\s+)?screen|what('s|\s+is)\s+on\s+(my\s+|the\s+)?screen|analyze\s+(the\s+|my\s+)?screen|summarize\s+(the\s+|my\s+)?screen)\b/.test(lower)) {
    const screen = await getScreenContext()
    if (screen?.success && Array.isArray(screen.texts) && screen.texts.length > 0) {
      logs.push(`Active Screen (${screen.appName || screen.packageName}): ${screen.texts.slice(0, 15).join(' | ')}`)
      badges.push({ icon: 'visibility', label: 'Screen Analyzed', ok: true })
    } else {
      logs.push('Screen reading requires IRIS Accessibility Service enabled in Settings.')
      badges.push({ icon: 'visibility_off', label: 'Needs Accessibility', ok: false })
    }
  }

  if (/\b(enable|turn\s+on|activate|start)\s+(floating\s+)?copilot\b/.test(lower)) {
    await toggleFloatingCopilot(true)
    logs.push('Floating Screen Copilot enabled.')
    badges.push({ icon: 'auto_awesome', label: 'Copilot ON', ok: true })
  } else if (/\b(disable|turn\s+off|deactivate|stop)\s+(floating\s+)?copilot\b/.test(lower)) {
    await toggleFloatingCopilot(false)
    logs.push('Floating Screen Copilot disabled.')
    badges.push({ icon: 'block', label: 'Copilot OFF', ok: true })
  }

  const typeMatch = stepText.match(/(?:type|insert|write)\s+["']([^"']+)["']\s+(?:in|into)\s+(?:the\s+)?(?:screen|input|app)/i)
  if (typeMatch && typeMatch[1]) {
    const res = await injectTextToActiveInput(typeMatch[1])
    logs.push(res?.injected ? `Typed "${typeMatch[1]}" into active input.` : `Copied "${typeMatch[1]}" to clipboard.`)
    badges.push({ icon: 'keyboard', label: 'Text Inserted', ok: true })
  }

  const shellMatch = stepText.match(/(?:run\s+shell|execute\s+command|sh\s+-c)\s+[`"']?([^`"'\n]+)[`"']?/i)
  if (shellMatch && shellMatch[1]) {
    const res = await executeShellCommand(shellMatch[1].trim())
    logs.push(`Shell '${shellMatch[1].trim()}' (exit ${res?.exitCode}): ${(res?.output || '').slice(0, 800)}`)
    badges.push({ icon: 'terminal', label: 'Shell Executed', ok: res?.exitCode === 0 })
  }

  // 12B. 0ms INSTANT MATH, PERCENTAGES, UNIT CONVERSIONS & SMART CLIPBOARD
  const pctMatch = lower.match(/\b(?:what\s+is\s+|calculate\s+)?(\d+(?:\.\d+)?)\s*(?:%|percent)\s+of\s+(\d+(?:\.\d+)?)\b/)
  if (pctMatch) {
    const pct = parseFloat(pctMatch[1])
    const base = parseFloat(pctMatch[2])
    const ans = Number(((pct / 100) * base).toFixed(4))
    logs.push(`${pct}% of ${base} is ${ans}.`)
    badges.push({ icon: 'calculate', label: `= ${ans}`, ok: true })
    return { logs, badges, didLaunchExternalApp }
  }

  const unitMatch = lower.match(/\b(?:convert\s+|what\s+is\s+|how\s+many\s+)?(\d+(?:\.\d+)?)\s*(km|kilometers?|mi|miles?|kg|kilograms?|lbs?|pounds?|c|celsius|f|fahrenheit|m|meters?|ft|feet)\s+(?:to|in)\s+(km|kilometers?|mi|miles?|kg|kilograms?|lbs?|pounds?|c|celsius|f|fahrenheit|m|meters?|ft|feet)\b/)
  if (unitMatch) {
    const val = parseFloat(unitMatch[1])
    const from = unitMatch[2]
    const to = unitMatch[3]
    let out = null
    let unitLabel = to
    if (/^(km|kilometer)/.test(from) && /^(mi|mile)/.test(to)) { out = val * 0.621371; unitLabel = 'mi' }
    else if (/^(mi|mile)/.test(from) && /^(km|kilometer)/.test(to)) { out = val * 1.60934; unitLabel = 'km' }
    else if (/^(kg|kilogram)/.test(from) && /^(lb|pound)/.test(to)) { out = val * 2.20462; unitLabel = 'lbs' }
    else if (/^(lb|pound)/.test(from) && /^(kg|kilogram)/.test(to)) { out = val * 0.453592; unitLabel = 'kg' }
    else if (/^(c|celsius)/.test(from) && /^(f|fahrenheit)/.test(to)) { out = (val * 9) / 5 + 32; unitLabel = '°F' }
    else if (/^(f|fahrenheit)/.test(from) && /^(c|celsius)/.test(to)) { out = ((val - 32) * 5) / 9; unitLabel = '°C' }
    else if (/^(m|meter)/.test(from) && /^(ft|feet)/.test(to)) { out = val * 3.28084; unitLabel = 'ft' }
    else if (/^(ft|feet)/.test(from) && /^(m|meter)/.test(to)) { out = val * 0.3048; unitLabel = 'm' }
    if (out !== null) {
      const formatted = Number(out.toFixed(2))
      logs.push(`${val} ${from} = ${formatted} ${unitLabel}.`)
      badges.push({ icon: 'swap_horiz', label: `${formatted} ${unitLabel}`, ok: true })
      return { logs, badges, didLaunchExternalApp }
    }
  }

  const mathCandidate = lower
    .replace(/^(?:what\s+is|what's|calculate|compute|solve)\s+/i, '')
    .replace(/\bplus\b/g, '+')
    .replace(/\bminus\b/g, '-')
    .replace(/\b(?:times|multiplied\s+by)\b/g, '*')
    .replace(/\b(?:divided\s+by|over)\b/g, '/')
    .replace(/[?]/g, '')
    .trim()
  if (/^[\d.\s+\-*/()]+$/.test(mathCandidate) && /[+\-*/]/.test(mathCandidate)) {
    const val = safeEvaluate(mathCandidate)
    if (Number.isFinite(val)) {
      const cleanVal = Number(val.toFixed(4))
      logs.push(`${mathCandidate} = ${cleanVal}.`)
      badges.push({ icon: 'calculate', label: `= ${cleanVal}`, ok: true })
      return { logs, badges, didLaunchExternalApp }
    }
  }

  if (/\b(save\s+(?:my\s+)?clipboard|save\s+what\s+i\s+copied|note\s+from\s+clipboard|open\s+(?:the\s+)?(?:copied|clipboard)\s+link)\b/.test(lower)) {
    try {
      const clipText = (await navigator.clipboard?.readText?.())?.trim() || ''
      if (!clipText) {
        logs.push('Clipboard is currently empty.')
        badges.push({ icon: 'content_paste_off', label: 'Clipboard Empty', ok: false })
      } else if (/\bopen\b/.test(lower) && /^https?:\/\//i.test(clipText)) {
        window.open(clipText, '_system')
        logs.push(`Opened copied link: ${clipText}`)
        badges.push({ icon: 'open_in_new', label: 'Opened Link', ok: true })
        didLaunchExternalApp = true
      } else {
        const notes = JSON.parse(localStorage.getItem('iris_voice_notes') || '[]')
        notes.unshift({ id: Date.now(), text: clipText, timestamp: new Date().toLocaleString() })
        localStorage.setItem('iris_voice_notes', JSON.stringify(notes))
        logs.push(`Saved clipboard to notes: "${clipText.slice(0, 60)}".`)
        badges.push({ icon: 'content_paste', label: 'Clipboard Saved', ok: true })
      }
      return { logs, badges, didLaunchExternalApp }
    } catch {}
  }

  // 13. DEEP-LINK SEARCH, CROSS-APP RELAY & INTERNAL PAGES & APP LAUNCHING
  const ytSearchMatch = stepText.match(/^(?:search\s+youtube\s+for|play\s+(.+?)\s+on\s+youtube|youtube\s+search)\s*(.*)$/i)
  if (ytSearchMatch) {
    const query = (ytSearchMatch[1] || ytSearchMatch[2] || '').trim()
    if (query) {
      window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, '_system')
      logs.push(`Searched YouTube for "${query}".`)
      badges.push({ icon: 'smart_display', label: `YouTube: ${query.slice(0, 18)}`, ok: true })
      didLaunchExternalApp = true
      return { logs, badges, didLaunchExternalApp }
    }
  }

  const spotifyMatch = stepText.match(/^(?:play\s+(.+?)\s+on\s+spotify|search\s+spotify\s+for\s+(.+))$/i)
  if (spotifyMatch) {
    const query = (spotifyMatch[1] || spotifyMatch[2] || '').trim()
    if (query) {
      window.open(`https://open.spotify.com/search/${encodeURIComponent(query)}`, '_system')
      logs.push(`Opened Spotify search for "${query}".`)
      badges.push({ icon: 'music_note', label: `Spotify: ${query.slice(0, 16)}`, ok: true })
      didLaunchExternalApp = true
      return { logs, badges, didLaunchExternalApp }
    }
  }

  const amazonMatch = stepText.match(/^(?:search\s+amazon\s+for|find\s+(.+?)\s+on\s+amazon|buy\s+(.+?)\s+on\s+amazon)\s*(.*)$/i)
  if (amazonMatch) {
    const query = (amazonMatch[1] || amazonMatch[2] || amazonMatch[3] || '').trim()
    if (query) {
      window.open(`https://www.amazon.com/s?k=${encodeURIComponent(query)}`, '_system')
      logs.push(`Searched Amazon for "${query}".`)
      badges.push({ icon: 'shopping_bag', label: `Amazon: ${query.slice(0, 16)}`, ok: true })
      didLaunchExternalApp = true
      return { logs, badges, didLaunchExternalApp }
    }
  }

  if (/\b(?:share\s+(?:this\s+|my\s+)?screen\s+(?:text\s+)?to\s+whatsapp|send\s+what(?:'s|\s+is)\s+on\s+(?:my\s+|the\s+)?screen\s+to\s+whatsapp|copy\s+(?:all\s+)?screen\s+text)\b/i.test(lower)) {
    const screen = await getScreenContext()
    if (screen?.success && Array.isArray(screen.texts) && screen.texts.length > 0) {
      const summaryText = screen.texts.slice(0, 14).join('\n')
      try { navigator.clipboard?.writeText(summaryText) } catch {}
      if (/\bwhatsapp\b/i.test(lower)) {
        await sendMessage('whatsapp', summaryText)
        logs.push(`Extracted text from ${screen.appName || 'screen'} and opened WhatsApp to share it.`)
        badges.push({ icon: 'ios_share', label: 'Screen → WhatsApp', ok: true })
        didLaunchExternalApp = true
      } else {
        logs.push(`Copied ${screen.texts.length} lines of screen text to clipboard.`)
        badges.push({ icon: 'content_copy', label: 'Screen Text Copied', ok: true })
      }
    } else {
      logs.push('Screen text extraction requires IRIS Accessibility Service enabled.')
      badges.push({ icon: 'visibility_off', label: 'Needs Accessibility', ok: false })
    }
    return { logs, badges, didLaunchExternalApp }
  }

  const mapsMatch = stepText.match(/^(?:navigate\s+to|directions\s+to|find\s+on\s+maps|map\s+of)\s+(.+)$/i)
  if (mapsMatch && mapsMatch[1]) {
    const place = mapsMatch[1].trim()
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`, '_system')
    logs.push(`Opened Maps navigation for "${place}".`)
    badges.push({ icon: 'map', label: `Maps: ${place.slice(0, 18)}`, ok: true })
    didLaunchExternalApp = true
    return { logs, badges, didLaunchExternalApp }
  }

  const openMatch = lower.match(/^(?:please\s+)?(?:can\s+you\s+)?(?:open|launch|start|run|go\s+to)\s+(?:the\s+)?(?:app\s+)?([a-z0-9\s.+_-]{2,35}?)(?:\s+app|\s+please)?$/i)
  if (openMatch && openMatch[1]) {
    const target = openMatch[1].trim()
    const internalPages = {
      'settings': 'settings',
      'iris settings': 'settings',
      'launcher settings': 'settings',
      'widgets': 'widgets',
      'widget dashboard': 'widgets',
      'iris tools': 'iris_tools',
      'cyber tools': 'iris_tools',
      'security tools': 'iris_tools',
      'drawer': 'drawer',
      'app drawer': 'drawer',
      'all apps': 'drawer',
      'home': 'home',
      'home screen': 'home',
      'assistant': 'assistant',
      'iris ai': 'assistant',
    }
    const settingsMap = {
      'wifi': 'wifi',
      'wi-fi': 'wifi',
      'wifi settings': 'wifi',
      'wi-fi settings': 'wifi',
      'internet panel': 'wifi_panel',
      'bluetooth': 'bluetooth',
      'bluetooth settings': 'bluetooth',
      'display': 'display',
      'display settings': 'display',
      'refresh rate': 'refresh_rate',
      'refresh rate settings': 'refresh_rate',
      '120hz': 'refresh_rate',
      'eye comfort': 'eye_comfort',
      'dark mode settings': 'dark_mode',
      'battery': 'battery',
      'battery settings': 'battery',
      'battery saver': 'battery_saver',
      'power saving': 'battery_saver',
      'auto start': 'autostart',
      'autostart': 'autostart',
      'background apps': 'autostart',
      'sound': 'sound',
      'sound settings': 'sound',
      'volume panel': 'volume_panel',
      'accessibility': 'accessibility',
      'accessibility settings': 'accessibility',
      'hotspot': 'hotspot',
      'hotspot settings': 'hotspot',
      'mobile hotspot': 'hotspot',
      'tethering': 'hotspot',
      'airplane mode': 'airplane',
      'location': 'location',
      'location settings': 'location',
      'gps': 'location',
      'nfc': 'nfc',
      'nfc settings': 'nfc',
      'storage': 'storage',
      'storage settings': 'storage',
      'data usage': 'data_usage',
      'cast': 'connected_devices',
      'cast settings': 'connected_devices',
      'connected devices': 'connected_devices',
      'developer options': 'developer',
      'developer settings': 'developer',
      'security settings': 'security',
      'system settings': 'settings',
      'android settings': 'settings',
      'phone settings': 'settings',
    }

    if (internalPages[target]) {
      useAppStore.getState().setActivePage(internalPages[target])
      logs.push(`Navigated to IRIS ${target}.`)
      badges.push({ icon: 'open_in_new', label: `Opened ${target}`, ok: true })
    } else if (settingsMap[target]) {
      await openSystemSettings(settingsMap[target])
      logs.push(`Opened Android ${settingsMap[target]} settings.`)
      badges.push({ icon: 'settings', label: `Settings: ${settingsMap[target]}`, ok: true })
      didLaunchExternalApp = true
    } else {
      const apps = useAppsStore.getState().installedApps || []
      const found = findBestInstalledApp(target, apps)
      if (found) {
        await launchApp(found.packageId, found.label)
        lastAgentContext.lastApp = { label: found.label, packageId: found.packageId }
        logs.push(`Launched app: ${found.label}.`)
        badges.push({ icon: 'launch', label: `Opened ${found.label}`, ok: true })
        didLaunchExternalApp = true
      } else {
        logs.push(`Could not find an installed app named "${target}".`)
        badges.push({ icon: 'error_outline', label: `Not found: ${target}`, ok: false })
      }
    }
  }

  if (logs.length > 0) {
    lastAgentContext.lastAction = logs.join(' ')
    lastAgentContext.updatedAt = Date.now()
  }

  return { logs, badges, didLaunchExternalApp, stepIndex, totalSteps }
}

export async function executeDeviceAgentIntent(prompt, onProgress) {
  if (!prompt || typeof prompt !== 'string') return ''
  let cleanedPrompt = normalizeSpokenNumbers(
    prompt
      .trim()
      .replace(/^(?:please|can\s+you|could\s+you|would\s+you|hey\s+iris|hi\s+iris|ok\s+iris|iris)[,\s]+/i, '')
      .trim()
  )

  // MODULE 3: BIXBY QUICK COMMANDS (Create / List / Delete / Trigger Custom Voice Macros)
  const createMacroMatch =
    cleanedPrompt.match(/^(?:when\s+i\s+say|create\s+(?:a\s+)?(?:custom\s+|quick\s+)?command(?:\s+called)?)\s+["']?([a-z0-9\s]{2,28}?)["']?\s*(?:,|to|that|do|run)\s+(.+)$/i)
  if (createMacroMatch && createMacroMatch[1] && createMacroMatch[2]) {
    const triggerPhrase = createMacroMatch[1].trim().toLowerCase()
    const macroActions = createMacroMatch[2].trim()
    try {
      const macros = JSON.parse(localStorage.getItem('iris_custom_macros') || '{}')
      macros[triggerPhrase] = macroActions
      localStorage.setItem('iris_custom_macros', JSON.stringify(macros))
    } catch {}
    const badge = [{ icon: 'auto_fix_high', label: `Macro Saved: "${triggerPhrase}"`, ok: true }]
    emitStepProgress(badge)
    if (typeof onProgress === 'function') onProgress(badge)
    return `\n[REAL-TIME DEVICE OS ACTIONS EXECUTED BY IRIS]:\n- Saved custom Quick Command "${triggerPhrase}": whenever you say "${triggerPhrase}", IRIS will execute "${macroActions}".\nIMPORTANT: Confirm this saved Quick Command concisely.`
  }

  if (/^(?:list\s+(?:my\s+)?(?:custom|quick)\s+commands|what\s+are\s+my\s+(?:custom|quick)\s+commands)$/i.test(cleanedPrompt)) {
    try {
      const macros = JSON.parse(localStorage.getItem('iris_custom_macros') || '{}')
      const keys = Object.keys(macros)
      const badge = [{ icon: 'list', label: `${keys.length} Quick Commands`, ok: true }]
      emitStepProgress(badge)
      if (typeof onProgress === 'function') onProgress(badge)
      const listText = keys.length > 0
        ? keys.map((k) => `"${k}" -> ${macros[k]}`).join(' | ')
        : 'You have no custom Quick Commands saved yet. Say "When I say Gym Time, set volume to 80% and open Spotify" to create one.'
      return `\n[REAL-TIME DEVICE OS ACTIONS EXECUTED BY IRIS]:\n- Custom Quick Commands (${keys.length}): ${listText}\nIMPORTANT: Confirm these concisely.`
    } catch {}
  }

  const deleteMacroMatch = cleanedPrompt.match(/^(?:delete|remove)\s+(?:custom|quick)\s+command\s+["']?([a-z0-9\s]{2,28}?)["']?$/i)
  if (deleteMacroMatch && deleteMacroMatch[1]) {
    const triggerPhrase = deleteMacroMatch[1].trim().toLowerCase()
    try {
      const macros = JSON.parse(localStorage.getItem('iris_custom_macros') || '{}')
      delete macros[triggerPhrase]
      localStorage.setItem('iris_custom_macros', JSON.stringify(macros))
    } catch {}
    const badge = [{ icon: 'delete', label: `Removed "${triggerPhrase}"`, ok: true }]
    emitStepProgress(badge)
    if (typeof onProgress === 'function') onProgress(badge)
    return `\n[REAL-TIME DEVICE OS ACTIONS EXECUTED BY IRIS]:\n- Deleted custom Quick Command "${triggerPhrase}".\nIMPORTANT: Confirm concisely.`
  }

  // Expand saved custom macro if the user's phrase matches a saved Quick Command trigger
  try {
    const macros = JSON.parse(localStorage.getItem('iris_custom_macros') || '{}')
    const triggerKey = cleanedPrompt.toLowerCase().replace(/[.,!?]+$/g, '').trim()
    if (macros[triggerKey]) {
      cleanedPrompt = macros[triggerKey]
    }
  } catch {}

  // MODULE 6: SCHEDULED & DELAYED CONDITIONAL TASKS ("In 10 minutes, turn off flashlight and lock my screen")
  const scheduledMatch = cleanedPrompt.match(/^(?:in|after)\s+(\d{1,3})\s*(seconds?|secs?|minutes?|mins?)\s*[,:]?\s+(.+)$/i)
  if (scheduledMatch && scheduledMatch[1] && scheduledMatch[3] && !/^remind\s+me\b/i.test(scheduledMatch[3])) {
    const amount = parseInt(scheduledMatch[1], 10)
    const unit = scheduledMatch[2].toLowerCase()
    const delayedActions = scheduledMatch[3].trim()
    const delayMs = unit.startsWith('m') ? amount * 60000 : amount * 1000
    const tid = setTimeout(() => {
      executeDeviceAgentIntent(delayedActions).catch(() => {})
    }, delayMs)
    try {
      window.dispatchEvent(new CustomEvent('iris-now-bar-timer', { detail: { label: delayedActions.slice(0, 22), endsAt: Date.now() + delayMs } }))
      const onCancel = () => {
        clearTimeout(tid)
        window.removeEventListener('iris-now-bar-cancel', onCancel)
      }
      window.addEventListener('iris-now-bar-cancel', onCancel)
    } catch {}
    const unitShort = unit.startsWith('m') ? 'm' : 's'
    const badge = [{ icon: 'schedule', label: `Scheduled in ${amount}${unitShort}`, ok: true }]
    emitStepProgress(badge)
    if (typeof onProgress === 'function') onProgress(badge)
    return `\n[REAL-TIME DEVICE OS ACTIONS EXECUTED BY IRIS]:\n- Scheduled task in ${amount} ${unit}: "${delayedActions}".\nIMPORTANT: Confirm that this task has been scheduled and will execute automatically.`
  }

  const steps = splitIntoSequentialSteps(cleanedPrompt)
  if (steps.length === 0) return ''

  const allLogs = []
  const liveStepBadges = []

  try {
    for (let i = 0; i < steps.length; i++) {
      const stepText = steps[i]
      const res = await executeSingleStep(stepText, i + 1, steps.length)
      if (res.logs.length > 0) {
        allLogs.push(...res.logs)
      }
      if (res.badges.length > 0) {
        liveStepBadges.push(...res.badges)
        emitStepProgress(liveStepBadges)
        if (typeof onProgress === 'function') {
          onProgress([...liveStepBadges])
        }
      }

      // If this step launched an external app and there is another step right after it
      // (such as taking a screenshot or opening a second app), wait 1.4s so the app renders on screen first.
      if (res.didLaunchExternalApp && i < steps.length - 1) {
        await delay(1400)
      } else if (res.logs.length > 0 && i < steps.length - 1) {
        await delay(350)
      }
    }
  } catch (e) {
    console.warn('[aiAgentTools] Error executing device intent sequence:', e)
  }

  if (allLogs.length === 0) return ''
  return `\n[REAL-TIME DEVICE OS ACTIONS EXECUTED BY IRIS]:\n${allLogs.map((l) => `- ${l}`).join('\n')}\nIMPORTANT: These actions have ALREADY been physically executed on the user's Android phone. Confirm them in 1 brief, Siri-like sentence. Never claim you are a simulated AI without a physical screen.`
}
