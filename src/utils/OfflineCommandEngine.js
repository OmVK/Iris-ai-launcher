import { registerPlugin } from '@capacitor/core'
import convert from 'convert-units'

const LauncherPlugin = registerPlugin('LauncherPlugin')

const unitMap = {
  'milliliter': 'ml', 'milliliters': 'ml', 'ml': 'ml',
  'liter': 'l', 'liters': 'l',
  'teaspoon': 'tsp', 'teaspoons': 'tsp',
  'tablespoon': 'Tbs', 'tablespoons': 'Tbs',
  'ounce': 'oz', 'ounces': 'oz',
  'cup': 'cup', 'cups': 'cup',
  'pint': 'pnt', 'pints': 'pnt',
  'quart': 'qt', 'quarts': 'qt',
  'gallon': 'gal', 'gallons': 'gal',
  'milligram': 'mg', 'milligrams': 'mg',
  'gram': 'g', 'grams': 'g',
  'kilogram': 'kg', 'kilograms': 'kg', 'kilo': 'kg', 'kilos': 'kg',
  'pound': 'lb', 'pounds': 'lb', 'lbs': 'lb',
  'millimeter': 'mm', 'millimeters': 'mm',
  'centimeter': 'cm', 'centimeters': 'cm',
  'meter': 'm', 'meters': 'm',
  'kilometer': 'km', 'kilometers': 'km',
  'inch': 'in', 'inches': 'in',
  'foot': 'ft', 'feet': 'ft',
  'yard': 'yd', 'yards': 'yd',
  'mile': 'mi', 'miles': 'mi',
  'celsius': 'C', 'fahrenheit': 'F', 'kelvin': 'K',
  'megabyte': 'MB', 'gigabytes': 'GB', 'gigabyte': 'GB'
}

function resolveUnit(spoken) {
  let norm = spoken.toLowerCase().trim()
  if (norm.endsWith('s') && !unitMap[norm] && unitMap[norm.slice(0, -1)]) {
    norm = norm.slice(0, -1)
  }
  return unitMap[norm] || norm
}

import RiveScript from 'rivescript'

import beginRive from '../rivescript/personality/begin.rive?raw'
import elizaRive from '../rivescript/personality/eliza.rive?raw'
import brainRive from '../rivescript/brain.rive?raw'

let rs = null
let rsReady = false
let commandQueue = Promise.resolve()

// Pattern-based command matcher — used for high-speed system commands
const rules = [
  // APP LAUNCHING (most specific first)
  { pattern: /^(?:open|launch|start)\s+(?:the\s+)?(.+?)(?:\s+app(?:lication)?)?$/i, handler: (m) => ({ type: 'open_app', app: m[1] }) },

  // CALLING
  { pattern: /^(?:call|dial)\s+(.+?)\s+on\s+speaker$/i, handler: (m) => ({ type: 'call', name: m[1], speaker: true }) },
  { pattern: /^(?:call|dial)\s+(.+)$/i, handler: (m) => ({ type: 'call', name: m[1], speaker: false }) },

  // CLIPBOARD
  { pattern: /^copy\s+that$/i, handler: () => ({ type: 'clipboard_copy' }) },
  { pattern: /^read\s+(?:my\s+)?clipboard$/i, handler: () => ({ type: 'clipboard_read' }) },

  // APP SWITCHING
  { pattern: /^(?:switch\s+to\s+)?(?:last|previous)\s+app$/i, handler: () => ({ type: 'switch_app' }) },
  { pattern: /^(?:show\s+)?recent\s+apps?$/i, handler: () => ({ type: 'recent_apps' }) },

  // MEDIA CONTROL
  { pattern: /^(?:play|resume)(?:\s+(?:music|the\s+music|the\s+song|the\s+track))?$/i, handler: () => ({ type: 'media', action: 'play' }) },
  { pattern: /^(?:pause|stop)(?:\s+(?:music|the\s+music|the\s+song|the\s+track))?$/i, handler: () => ({ type: 'media', action: 'pause' }) },
  { pattern: /^(?:skip|next)(?:\s+(?:song|track|track))?$/i, handler: () => ({ type: 'media', action: 'next' }) },
  { pattern: /^(?:previous|go\s+back)(?:\s+(?:song|track))?$/i, handler: () => ({ type: 'media', action: 'previous' }) },

  // HELP
  { pattern: /^(?:what\s+can\s+you\s+do|help|commands?|show\s+me\s+what\s+you\s+can)$/i, handler: () => ({ type: 'help' }) },

  // ROUTINES
  { pattern: /^good\s+morning$/i, handler: () => ({ type: 'routine', routine: 'morning' }) },
  { pattern: /^(?:leaving\s+home|i'?m?\s+leaving|heading\s+out|go\s+to\s+work)$/i, handler: () => ({ type: 'routine', routine: 'leaving' }) },
  { pattern: /^(?:good\s+night|bedtime|time\s+for\s+bed|i'?m?\s+going\s+to\s+sleep)$/i, handler: () => ({ type: 'routine', routine: 'bedtime' }) },

  // CANCEL (must be before close/dismiss to catch multi-turn cancellation)
  { pattern: /^(?:cancel|never\s*mind|nevermind|forget\s+it|scratch\s+that)$/i, handler: () => ({ type: 'cancel' }) },

  // CLOSE / DISMISS
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

  // MODES
  { pattern: /^(?:activate|turn\s+on)\s+sleep\s+mode$/i, handler: () => ({ type: 'sleep_mode' }) },
  { pattern: /^(?:activate|turn\s+on)\s+driving\s+mode$/i, handler: () => ({ type: 'driving_mode' }) },

  // UNINSTALL / APP INFO
  { pattern: /^uninstall\s+(.+)$/i, handler: (m) => ({ type: 'uninstall_confirm', app: m[1] }) },
  { pattern: /^(?:app\s+info\s+for|show\s+info\s+for)\s+(.+)$/i, handler: (m) => ({ type: 'app_info', app: m[1] }) },

  // SYSTEM
  { pattern: /^how\s+much\s+(?:ram|memory)\s+(?:do\s+i\s+have|have\s+i\s+got)(?:\s+left)?$/i, handler: () => ({ type: 'check_ram' }) },
  { pattern: /^what\s+is\s+my\s+battery\s+temperature$/i, handler: () => ({ type: 'check_temp' }) },
  { pattern: /^(?:optimize|clean|speed\s+up)\s+my\s+(?:phone|memory|ram)$/i, handler: () => ({ type: 'optimize_memory' }) },

  // NOTES
  { pattern: /^(?:take|save|write)\s+(?:a\s+)?note\s+(.+)$/i, handler: (m) => ({ type: 'save_note', text: m[1] }) },
  { pattern: /^note\s+(.+)$/i, handler: (m) => ({ type: 'save_note', text: m[1] }) },
  { pattern: /^(?:take|save)\s+a\s+note$/i, handler: () => ({ type: 'context', context: 'WAITING_FOR_NOTE_TEXT', response: 'What should I note down?' }) },
  { pattern: /^(?:read|what\s+are)\s+my\s+notes$/i, handler: () => ({ type: 'read_notes' }) },
  { pattern: /^(?:clear|delete)\s+my\s+notes$/i, handler: () => ({ type: 'clear_notes_confirm' }) },
  { pattern: /^(?:delete|remove)\s+my\s+last\s+note$/i, handler: () => ({ type: 'delete_last_note' }) },

  // REMINDERS
  { pattern: /^remind\s+me\s+to\s+(.+?)\s+in\s+(\d+)\s+(minutes?|hours?)$/i, handler: (m) => ({ type: 'remind', task: m[1], val: parseInt(m[2]), unit: m[3] }) },
  { pattern: /^remind\s+me$/i, handler: () => ({ type: 'context', context: 'WAITING_FOR_REMINDER_TEXT', response: 'What would you like me to remind you about?' }) },
  { pattern: /^set\s+a\s+reminder$/i, handler: () => ({ type: 'context', context: 'WAITING_FOR_REMINDER_TEXT', response: 'What would you like me to remind you about?' }) },

  // TIMERS
  { pattern: /^(?:set\s+)?a?\s*timer\s+for\s+(\d+)\s+(seconds?|minutes?|hours?)$/i, handler: (m) => ({ type: 'timer', duration: m[1], unit: m[2] }) },

  // ALARMS
  { pattern: /^(?:set\s+)?alarm\s+(?:for|at)\s+(.+)$/i, handler: (m) => ({ type: 'alarm', time: m[1] }) },
  { pattern: /^wake\s+me\s+up\s+(?:at|for)\s+(.+)$/i, handler: (m) => ({ type: 'alarm', time: m[1] }) },

  // SEARCH / WEB
  { pattern: /^(?:search\s+(?:for\s+)?|look\s+up\s+|google\s+|find\s+)(.+)$/i, handler: (m) => ({ type: 'search', query: m[1] }) },
  { pattern: /^who\s+is\s+(.+)$/i, handler: (m) => ({ type: 'search', query: 'who is ' + m[1] }) },
  { pattern: /^what\s+is\s+the\s+weather$/i, handler: () => ({ type: 'weather', city: 'local' }) },
  { pattern: /^weather\s+in\s+(.+)$/i, handler: (m) => ({ type: 'weather', city: m[1] }) },
  { pattern: /^(?:what\s+are\s+)?notifications?$/i, handler: () => ({ type: 'notifications' }) },
  { pattern: /^read\s+my\s+notifications?$/i, handler: () => ({ type: 'notifications' }) },

  // UNIT CONVERTER
  { pattern: /^convert\s+(\d+(?:\.\d+)?)\s+(.+?)\s+to\s+(.+)$/i, handler: (m) => ({ type: 'convert', quantity: m[1], from: m[2], to: m[3] }) },
  { pattern: /^convert\s+(.+?)\s+to\s+(.+)$/i, handler: (m) => ({ type: 'convert', quantity: '1', from: m[1], to: m[2] }) },
  { pattern: /^how\s+many\s+(.+?)\s+in\s+(\d+(?:\.\d+)?)\s+(.+)$/i, handler: (m) => ({ type: 'convert_quantity', unit: m[1], quantity: m[2], fromUnit: m[3] }) },
]

function matchCommand(text) {
  const trimmed = text.trim()
  for (const rule of rules) {
    const m = trimmed.match(rule.pattern)
    if (m) return rule.handler(m)
  }
  return { type: 'fallback', text: trimmed }
}

export async function processCommand(text) {
  const run = async () => {
  const result = {
    success: true,
    response: '',
    commands: [],
    sideEffects: [],
    keepListening: false
  }

  const match = matchCommand(text)

  // All commands keep listening by default, except close and open_app
  result.keepListening = true

  switch (match.type) {
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
    case 'sleep_mode':
      result.sideEffects.push({ action: 'sleep_mode' })
      result.response = 'Sleep mode activated. Goodnight.'
      break
    case 'driving_mode':
      result.sideEffects.push({ action: 'driving_mode' })
      result.response = 'Driving mode activated. Be safe.'
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
    case 'save_note':
      result.sideEffects.push({ action: 'save_note', params: { text: match.text } })
      result.response = 'Note saved.'
      break
    case 'read_notes':
      result.sideEffects.push({ action: 'read_notes' })
      break
    case 'clear_notes_confirm':
      result.requireMoreContext = 'WAITING_FOR_CLEAR_NOTES_CONFIRM'
      result.response = 'Are you sure you want to delete all notes? Say yes to confirm.'
      result.keepListening = true
      break
    case 'delete_last_note':
      result.sideEffects.push({ action: 'delete_last_note' })
      result.response = 'Deleting your last note.'
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
    case 'search':
      result.sideEffects.push({ action: 'search_web', params: { query: match.query } })
      result.response = `Searching the web for "${match.query}".`
      break
    case 'weather':
      result.sideEffects.push({ action: 'weather', params: { city: match.city } })
      result.response = `Checking the weather in ${match.city}.`
      break
    case 'notifications':
      result.sideEffects.push({ action: 'notifications' })
      break
    case 'clipboard_copy':
      result.sideEffects.push({ action: 'clipboard_copy' })
      result.response = 'Copied to clipboard.'
      break
    case 'clipboard_read':
      result.sideEffects.push({ action: 'clipboard_read' })
      break
    case 'switch_app':
      result.sideEffects.push({ action: 'switch_app' })
      result.response = 'Switching to previous app.'
      result.keepListening = false
      break
    case 'recent_apps':
      result.sideEffects.push({ action: 'recent_apps' })
      result.response = 'Opening recent apps.'
      result.keepListening = false
      break
    case 'media':
      result.sideEffects.push({ action: 'media_control', params: { mediaAction: match.action } })
      result.response = match.action === 'play' ? 'Playing.' : match.action === 'pause' ? 'Paused.' : match.action === 'next' ? 'Skipping.' : 'Going back.'
      break
    case 'help':
      result.response = 'I can open apps, make calls, control flashlight, brightness, volume, set timers and alarms, take notes, set reminders, check weather and RAM, search the web, send texts, control media, and more. Just say what you need.'
      result.keepListening = true
      break
    case 'routine':
      result.sideEffects.push({ action: 'routine', params: { routine: match.routine } })
      if (match.routine === 'morning') result.response = 'Good morning. Running your morning routine.'
      else if (match.routine === 'leaving') result.response = 'Activating leaving home mode.'
      else result.response = 'Goodnight. Activating bedtime mode.'
      break
    case 'cancel':
      result.response = 'Cancelled.'
      result.keepListening = true
      break
    case 'convert': {
      const val = parseFloat(match.quantity) || 1
      const fromUnit = resolveUnit(match.from)
      const toUnit = resolveUnit(match.to)
      try {
        const converted = convert(val).from(fromUnit).to(toUnit)
        const formatted = converted % 1 === 0 ? converted : converted.toFixed(2)
        result.response = `${val} ${match.from} is equal to ${formatted} ${match.to}.`
      } catch (e) {
        result.response = `I couldn't convert ${match.from} to ${match.to}.`
      }
      break
    }
    case 'convert_quantity': {
      const unit = resolveUnit(match.unit)
      const val = parseFloat(match.quantity) || 1
      const fromUnit = resolveUnit(match.fromUnit)
      try {
        const converted = convert(val).from(fromUnit).to(unit)
        const formatted = converted % 1 === 0 ? converted : converted.toFixed(2)
        result.response = `${val} ${match.fromUnit} is equal to ${formatted} ${match.unit}.`
      } catch (e) {
        result.response = `I couldn't convert ${match.fromUnit} to ${match.unit}.`
      }
      break
    }
    case 'fallback':
    default:
      if (rsReady && rs) {
        try {
          // Reset global side effect accumulators
          window._irisRiveSideEffects = []
          window._irisRiveCommands = []
          
          let reply = await rs.reply('localuser', match.text)
          if (reply && reply !== 'ERR: No Reply Matched') {
            result.response = reply
            if (window._irisRiveSideEffects.length > 0) result.sideEffects.push(...window._irisRiveSideEffects)
            if (window._irisRiveCommands.length > 0) result.commands.push(...window._irisRiveCommands)
            
            // If the reply itself implies closing, close it
            if (reply.toLowerCase().includes('goodbye')) result.keepListening = false
            break
          }
        } catch (e) {
          console.error('RiveScript error:', e)
        }
      }
      result.response = 'I\'m not sure what you mean. Try saying "open" followed by an app name, or ask me to search the web.'
      result.keepListening = true
      break
  }

  return result
  }
  return new Promise(resolve => {
    commandQueue = commandQueue.then(() => run().then(resolve))
  })
}

export async function initEngine() {
  if (rsReady) return true
  try {
    rs = new RiveScript({ utf8: true })
    
    // Stream raw string contents synchronously into RiveScript
    rs.stream(beginRive)
    rs.stream(elizaRive)
    rs.stream(brainRive)
    
    rs.sortReplies()

    // Register macros referenced by brain.rive
    rs.setSubroutine('set_flashlight', (rs, args) => {
      const on = args[0] === 'true' ? true : args[0] === 'false' ? false : null
      window._irisRiveSideEffects.push({ action: 'toggle_flashlight', params: { on } })
      return ''
    })
    rs.setSubroutine('set_wifi', (rs, args) => {
      window._irisRiveSideEffects.push({ action: 'open_settings', params: { setting: 'wifi' } })
      return ''
    })
    rs.setSubroutine('set_bluetooth', (rs, args) => {
      window._irisRiveSideEffects.push({ action: 'open_settings', params: { setting: 'bluetooth' } })
      return ''
    })
    rs.setSubroutine('set_volume', (rs, args) => {
      window._irisRiveSideEffects.push({ action: 'set_volume', params: { direction: args[0] } })
      return ''
    })
    rs.setSubroutine('check_battery', (rs, args) => {
      window._irisRiveSideEffects.push({ action: 'check_battery_rive' })
      return ''
    })
    rs.setSubroutine('set_dnd', (rs, args) => {
      window._irisRiveSideEffects.push({ action: 'open_settings', params: { setting: 'dnd' } })
      return ''
    })
    rs.setSubroutine('open_camera', (rs, args) => {
      window._irisRiveCommands.push({ action: 'open', params: { app: 'camera' } })
      return ''
    })
    rs.setSubroutine('show_notifications', (rs, args) => {
      window._irisRiveSideEffects.push({ action: 'notifications' })
      return ''
    })
    rs.setSubroutine('get_time', (rs, args) => {
      const now = new Date()
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      window._irisRiveSideEffects.push({ action: 'spoken_text', params: { text: `It is ${timeStr}.` } })
      return ''
    })
    rs.setSubroutine('get_date', (rs, args) => {
      const now = new Date()
      const dateStr = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
      window._irisRiveSideEffects.push({ action: 'spoken_text', params: { text: `Today is ${dateStr}.` } })
      return ''
    })
    rs.setSubroutine('launch_app', (rs, args) => {
      window._irisRiveCommands.push({ action: 'open', params: { app: args.join(' ') } })
      return ''
    })
    rs.setSubroutine('make_call', (rs, args) => {
      window._irisRiveCommands.push({ action: 'call', params: { name: args.join(' '), speaker: false } })
      return ''
    })
    rs.setSubroutine('set_timer', (rs, args) => {
      window._irisRiveSideEffects.push({ action: 'timer', params: { duration: args[0], unit: 'minutes' } })
      return ''
    })
    rs.setSubroutine('set_alarm', (rs, args) => {
      window._irisRiveCommands.push({ action: 'alarm', params: { time: args.join(' ') } })
      return ''
    })
    rs.setSubroutine('check_weather', (rs, args) => {
      window._irisRiveSideEffects.push({ action: 'weather', params: { city: args[0] === 'local' ? 'local' : args.join(' ') } })
      return ''
    })
    rs.setSubroutine('take_note', (rs, args) => {
      window._irisRiveSideEffects.push({ action: 'save_note', params: { text: args.join(' ') } })
      return ''
    })
    rs.setSubroutine('read_notes', (rs, args) => {
      window._irisRiveSideEffects.push({ action: 'read_notes' })
      return ''
    })

    rsReady = true
    return true
  } catch (e) {
    console.error('Failed to initialize RiveScript:', e)
    rs = null
    rsReady = false
    return false
  }
}
