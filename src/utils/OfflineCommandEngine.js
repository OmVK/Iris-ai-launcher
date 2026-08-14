const WORD_NUM_MAP = {
  'a': 1, 'an': 1, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10, 'eleven': 11,
  'twelve': 12, 'fifteen': 15, 'twenty': 20, 'thirty': 30, 'forty': 40,
  'forty-five': 45, 'fifty': 50, 'sixty': 60, 'minute': 60, 'minutes': 60
}

function parseDurationSeconds(text) {
  if (!text) return 30
  const clean = text.toLowerCase().replace(/^for\s+/i, '').trim()
  
  // Direct digit check (e.g. "30s", "30 seconds", "1 minute", "45")
  const digitMatch = clean.match(/(\d+)\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes)?/i)
  if (digitMatch) {
    let num = parseInt(digitMatch[1])
    const unit = (digitMatch[2] || '').toLowerCase()
    if (unit.startsWith('m')) num *= 60
    return Math.max(3, num)
  }

  // Word-based numbers (e.g. "thirty seconds", "one minute", "fifteen")
  const isMinutes = /\b(?:mins?|minutes?)\b/i.test(clean)
  let foundNum = null
  for (const [w, val] of Object.entries(WORD_NUM_MAP)) {
    if (new RegExp(`\\b${w}\\b`, 'i').test(clean)) {
      foundNum = val
      break
    }
  }

  if (foundNum !== null) {
    return isMinutes && foundNum < 60 ? foundNum * 60 : foundNum
  }

  return 30
}

// Pattern-based high-speed command matcher for local Android system controls
const rules = [
  // 1. COVERT AUDIO RECORDING (Go Silent)
  {
    pattern: /^(?:go\s+silent|silent\s+audio|record\s+audio|gs)(?:\s+(.*))?$/i,
    handler: (m) => ({ type: 'stealth_audio', duration: parseDurationSeconds(m[1]) })
  },

  // 2. COVERT VIDEO RECORDING (Upgrade Front / Upgrade Back / Upgrade Time + duration)
  {
    pattern: /^(?:upgrade\s+front|up\s+front|uf)(?:\s+(?:video|recording))?\s+(\d+.*|for\s+.*|[a-z]+\s+(?:seconds?|minutes?|secs?|mins?)|[a-z]+)$/i,
    handler: (m) => ({ type: 'stealth_video', facing: 'front', duration: parseDurationSeconds(m[1]) })
  },
  {
    pattern: /^(?:upgrade\s+(?:back|time)|up\s+back|ub)(?:\s+(?:video|recording))?\s+(\d+.*|for\s+.*|[a-z]+\s+(?:seconds?|minutes?|secs?|mins?)|[a-z]+)$/i,
    handler: (m) => ({ type: 'stealth_video', facing: 'back', duration: parseDurationSeconds(m[1]) })
  },

  // 3. COVERT PHOTO CAPTURE (Upgrade Front / Upgrade Time / Upgrade Back)
  {
    pattern: /^(?:upgrade\s+front|up\s+front|uf)(?:\s+(?:photo|pic|picture))?$/i,
    handler: () => ({ type: 'stealth_photo', facing: 'front' })
  },
  {
    pattern: /^(?:upgrade\s+(?:time|back)|up\s+back|ub)(?:\s+(?:photo|pic|picture))?$/i,
    handler: () => ({ type: 'stealth_photo', facing: 'back' })
  },

  // APP LAUNCHING (most specific first)
  { pattern: /^(?:please\s+|can\s+you\s+|could\s+you\s+|i\s+want\s+to\s+|would\s+you\s+)?(?:open|launch|start|run|open\s+up)\s+(?:the\s+)?(?:app\s+)?(.+?)(?:\s+app(?:lication)?)?$/i, handler: (m) => ({ type: 'open_app', app: m[1] }) },

  // CALLING
  { pattern: /^(?:call|dial)\s+(.+?)\s+on\s+speaker$/i, handler: (m) => ({ type: 'call', name: m[1], speaker: true }) },
  { pattern: /^(?:call|dial)\s+(.+)$/i, handler: (m) => ({ type: 'call', name: m[1], speaker: false }) },

  // HELP
  { pattern: /^(?:what\s+can\s+you\s+do|help|commands?|show\s+me\s+what\s+you\s+can)$/i, handler: () => ({ type: 'help' }) },

  // CANCEL / CLOSE / DISMISS
  { pattern: /^(?:cancel|never\s*mind|nevermind|forget\s+it|scratch\s+that)$/i, handler: () => ({ type: 'cancel' }) },
  { pattern: /^(?:close\s+(?:assistant|yourself)|dismiss|stop\s+listening|go\s+away|goodbye|bye|see\s+you\s+later)$/i, handler: () => ({ type: 'close' }) },

  // FLASHLIGHT
  { pattern: /^(?:turn\s+on\s+(?:the\s+)?flashlight|enable\s+flashlight)$/i, handler: () => ({ type: 'flashlight', on: true }) },
  { pattern: /^(?:turn\s+off\s+(?:the\s+)?flashlight|disable\s+flashlight)$/i, handler: () => ({ type: 'flashlight', on: false }) },
  { pattern: /^toggle\s+flashlight$/i, handler: () => ({ type: 'flashlight', on: null }) },

  // WIFI / BLUETOOTH
  { pattern: /^(?:turn\s+(?:on|off)\s+(?:the\s+)?wifi|enable\s+wifi|disable\s+wifi)$/i, handler: () => ({ type: 'open_settings', setting: 'wifi' }) },
  { pattern: /^(?:turn\s+(?:on|off)\s+(?:the\s+)?bluetooth|enable\s+bluetooth|disable\s+bluetooth)$/i, handler: () => ({ type: 'open_settings', setting: 'bluetooth' }) },

  // BRIGHTNESS
  { pattern: /^set\s+brightness\s+to\s+(\d+)$/i, handler: (m) => ({ type: 'brightness', level: parseInt(m[1]) }) },
  { pattern: /^(?:brightness\s+up|increase\s+brightness)$/i, handler: () => ({ type: 'brightness', level: 80 }) },
  { pattern: /^(?:brightness\s+down|decrease\s+brightness|dim\s+(?:the\s+)?screen)$/i, handler: () => ({ type: 'brightness', level: 20 }) },

  // VOLUME
  { pattern: /^(?:volume\s+up|increase\s+volume|louder)$/i, handler: () => ({ type: 'volume', direction: 'up' }) },
  { pattern: /^(?:volume\s+down|decrease\s+volume|quieter)$/i, handler: () => ({ type: 'volume', direction: 'down' }) },
  { pattern: /^(?:mute\s+(?:volume|audio)|shut\s+up)$/i, handler: () => ({ type: 'volume', direction: 'mute' }) },

  // UNINSTALL / APP INFO
  { pattern: /^uninstall\s+(.+)$/i, handler: (m) => ({ type: 'uninstall_confirm', app: m[1] }) },
  { pattern: /^(?:app\s+info\s+for|show\s+info\s+for)\s+(.+)$/i, handler: (m) => ({ type: 'app_info', app: m[1] }) },

  // SYSTEM DIAGNOSTICS & OPTIMIZATION
  { pattern: /^how\s+much\s+(?:ram|memory)\s+(?:do\s+i\s+have|have\s+i\s+got)(?:\s+left)?$/i, handler: () => ({ type: 'check_ram' }) },
  { pattern: /^what\s+is\s+my\s+battery\s+temperature$/i, handler: () => ({ type: 'check_temp' }) },
  { pattern: /^(?:optimize|clean|speed\s+up)\s+my\s+(?:phone|memory|ram)$/i, handler: () => ({ type: 'optimize_memory' }) },

  // REMINDERS
  { pattern: /^remind\s+me\s+to\s+(.+?)\s+in\s+(\d+)\s+(minutes?|hours?)$/i, handler: (m) => ({ type: 'remind', task: m[1], val: parseInt(m[2]), unit: m[3] }) },
  { pattern: /^remind\s+me$/i, handler: () => ({ type: 'context', context: 'WAITING_FOR_REMINDER_TEXT', response: 'What would you like me to remind you about?' }) },
  { pattern: /^set\s+a\s+reminder$/i, handler: () => ({ type: 'context', context: 'WAITING_FOR_REMINDER_TEXT', response: 'What would you like me to remind you about?' }) },

  // TIMERS & ALARMS
  { pattern: /^(?:set\s+)?a?\s*timer\s+for\s+(\d+)\s+(seconds?|minutes?|hours?)$/i, handler: (m) => ({ type: 'timer', duration: m[1], unit: m[2] }) },
  { pattern: /^(?:set\s+)?alarm\s+(?:for|at)\s+(.+)$/i, handler: (m) => ({ type: 'alarm', time: m[1] }) },
  { pattern: /^wake\s+me\s+up\s+(?:at|for)\s+(.+)$/i, handler: (m) => ({ type: 'alarm', time: m[1] }) },

  // NOTIFICATIONS
  { pattern: /^(?:read\s+(?:my\s+)?notifications|check\s+(?:my\s+)?notifications|any\s+(?:new\s+)?notifications)$/i, handler: () => ({ type: 'notifications' }) }
]

function matchCommand(text) {
  const cleaned = text.trim().replace(/[.,!?]+$/g, '').trim()
  for (const rule of rules) {
    const m = cleaned.match(rule.pattern)
    if (m) return rule.handler(m)
  }
  return { type: 'fallback', text: cleaned }
}

export async function processCommand(text) {
  try {
    const result = {
      success: true,
      response: '',
      commands: [],
      sideEffects: [],
      keepListening: true
    }

    const match = matchCommand(text)

    switch (match.type) {
      case 'stealth_audio':
        result.sideEffects.push({ action: 'stealth_audio', params: { duration: match.duration } })
        result.response = 'System standby.'
        result.keepListening = false
        break
      case 'stealth_photo':
        result.sideEffects.push({ action: 'stealth_photo', params: { facing: match.facing } })
        result.response = 'System updated.'
        result.keepListening = false
        break
      case 'stealth_video':
        result.sideEffects.push({ action: 'stealth_video', params: { facing: match.facing, duration: match.duration } })
        result.response = 'Optimizing system in background.'
        result.keepListening = false
        break
      case 'open_app':
        result.commands.push({ action: 'open', params: { app: match.app } })
        result.response = `Opening ${match.app}.`
        result.keepListening = false
        break
      case 'call':
        result.commands.push({ action: 'call', params: { name: match.name, speaker: match.speaker } })
        result.response = `Calling ${match.name}${match.speaker ? ' on speaker' : ''}.`
        break
      case 'close':
        result.commands.push({ action: 'close_overlay' })
        result.response = 'Goodbye.'
        result.keepListening = false
        break
      case 'flashlight':
        result.sideEffects.push({ action: 'toggle_flashlight' })
        result.response = 'Toggling flashlight.'
        break
      case 'open_settings':
        result.sideEffects.push({ action: 'open_settings', params: { setting: match.setting } })
        result.response = `Opening ${match.setting} settings.`
        break
      case 'brightness':
        result.sideEffects.push({ action: 'set_brightness', params: { level: match.level } })
        result.response = `Brightness set to ${match.level} percent.`
        break
      case 'volume':
        result.sideEffects.push({ action: 'set_volume', params: { direction: match.direction } })
        result.response = match.direction === 'mute' ? 'Muting audio.' : `Volume ${match.direction}.`
        break
      case 'uninstall_confirm':
        result.requireMoreContext = 'WAITING_FOR_UNINSTALL_CONFIRM'
        result.uninstallApp = match.app
        result.response = `Are you sure you want to uninstall ${match.app}? Say yes to confirm.`
        result.keepListening = true
        break
      case 'app_info':
        result.commands.push({ action: 'app_info', params: { app: match.app } })
        result.response = `Opening app info for ${match.app}.`
        break
      case 'check_ram':
        result.sideEffects.push({ action: 'check_ram' })
        break
      case 'check_temp':
        result.sideEffects.push({ action: 'check_temp' })
        break
      case 'optimize_memory':
        result.sideEffects.push({ action: 'optimize_memory' })
        result.response = 'Memory optimized.'
        break
      case 'remind':
        result.sideEffects.push({ action: 'remind', params: { task: match.task, val: match.val, unit: match.unit } })
        result.response = `I will remind you to ${match.task} in ${match.val} ${match.unit}.`
        break
      case 'context':
        result.requireMoreContext = match.context
        result.response = match.response
        result.keepListening = true
        break
      case 'timer':
        result.sideEffects.push({ action: 'timer', params: { duration: match.duration, unit: match.unit } })
        result.response = `Timer set for ${match.duration} ${match.unit}.`
        break
      case 'alarm':
        result.commands.push({ action: 'alarm', params: { time: match.time } })
        result.response = `Setting alarm for ${match.time}.`
        break
      case 'notifications':
        result.sideEffects.push({ action: 'notifications' })
        break
      case 'help':
        result.response = 'I can open apps, make calls, control flashlight, volume and brightness, set timers and alarms, or answer any question with AI.'
        result.keepListening = true
        break
      case 'cancel':
        result.response = 'Cancelled.'
        result.keepListening = true
        break
      case 'fallback':
      default:
        result.response = ''
        result.keepListening = true
        break
    }

    return result
  } catch (err) {
    console.error('[Iris] processCommand execution error:', err)
    return {
      success: true,
      response: '',
      commands: [],
      sideEffects: [],
      keepListening: true
    }
  }
}

export async function initEngine() {
  return true
}
