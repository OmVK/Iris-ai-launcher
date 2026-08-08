import { useState, useMemo } from 'react'
import { useThemeStore } from '../stores/themeStore'

const CATEGORIES = [
  {
    name: 'App Control',
    icon: 'apps',
    color: '#00e5ff',
    commands: [
      { say: 'open <app name>', desc: 'Launch any installed app (fuzzy match)', example: 'open WhatsApp' },
      { say: 'close', desc: 'Dismiss overlays, modals, or assistant', example: '' },
      { say: 'uninstall <app name>', desc: 'Remove an app from device', example: 'uninstall TikTok' },
      { say: 'app info <app name>', desc: 'Open Android app settings page', example: 'app info Chrome' },
    ],
  },
  {
    name: 'Phone & Contacts',
    icon: 'call',
    color: '#76ff03',
    commands: [
      { say: 'call <name>', desc: 'Dial a contact by name (fuzzy match)', example: 'call John' },
      { say: 'call last', desc: 'Redial the most recent outgoing call', example: '' },
      { say: 'open phone', desc: 'Launch the phone/dialer app', example: '' },
    ],
  },
  {
    name: 'System Controls',
    icon: 'settings',
    color: '#ff9100',
    commands: [
      { say: 'check battery', desc: 'Read current battery percentage', example: '' },
      { say: 'flashlight on / off', desc: 'Toggle the device flashlight', example: '' },
      { say: 'set brightness <0-100>', desc: 'Adjust screen brightness', example: 'set brightness 50' },
      { say: 'set volume <0-100>', desc: 'Set media volume level', example: 'set volume 75' },
      { say: 'do not disturb on / off', desc: 'Toggle DND mode', example: '' },
      { say: 'open camera', desc: 'Launch the default camera app', example: '' },
      { say: 'open settings', desc: 'Launch Android Settings', example: '' },
      { say: 'check temperature', desc: 'Read device CPU temperature', example: '' },
      { say: 'check ram / memory', desc: 'Show available RAM', example: '' },
      { say: 'optimize memory', desc: 'Clear background processes', example: '' },
      { say: 'sleep mode', desc: 'Activate power-saving sleep mode', example: '' },
      { say: 'driving mode', desc: 'Activate driving mode profile', example: '' },
    ],
  },
  {
    name: 'Timers & Alarms',
    icon: 'timer',
    color: '#ffea00',
    commands: [
      { say: 'set timer <duration>', desc: 'Start a countdown timer', example: 'set timer 5 minutes' },
      { say: 'set alarm <HH:MM>', desc: 'Schedule an alarm for specific time', example: 'set alarm 07:30' },
      { say: 'remind me to <task> in <duration>', desc: 'Set a reminder with task description', example: 'remind me to take medicine in 2 hours' },
    ],
  },
  {
    name: 'Notes & Info',
    icon: 'sticky_note_2',
    color: '#e040fb',
    commands: [
      { say: 'save note <text>', desc: 'Append text to your notes file', example: 'save note Buy groceries' },
      { say: 'read notes', desc: 'Speak back all saved notes', example: '' },
      { say: 'clear notes', desc: 'Delete all saved notes', example: '' },
      { say: 'what time is it', desc: 'Read current time aloud', example: '' },
      { say: 'what day is it', desc: 'Read current date aloud', example: '' },
      { say: 'weather / what\'s the weather', desc: 'Get weather for your saved location', example: '' },
      { say: 'check notifications', desc: 'List recent device notifications', example: '' },
    ],
  },
  {
    name: 'Media & Audio',
    icon: 'music_note',
    color: '#448aff',
    commands: [
      { say: 'play music / pause / resume', desc: 'Control media playback', example: '' },
      { say: 'next / previous', desc: 'Skip or go back a track', example: '' },
      { say: 'stop', desc: 'Stop all audio playback', example: '' },
    ],
  },
  {
    name: 'Clipboard',
    icon: 'content_copy',
    color: '#18ffff',
    commands: [
      { say: 'copy that', desc: 'Copy the last assistant response to clipboard', example: '' },
      { say: 'read clipboard', desc: 'Speak the current clipboard content', example: '' },
    ],
  },
  {
    name: 'Navigation & Shortcuts',
    icon: 'explore',
    color: '#69f0ae',
    commands: [
      { say: 'go home', desc: 'Navigate to home screen', example: '' },
      { say: 'open drawer / app drawer', desc: 'Open the app drawer', example: '' },
      { say: 'open tools', desc: 'Open IRIS cybersecurity tools', example: '' },
      { say: 'open widgets', desc: 'Open the widgets dashboard', example: '' },
      { say: 'open vault', desc: 'Open the private vault (requires PIN)', example: '' },
      { say: 'open news', desc: 'Open IRIS news feed', example: '' },
    ],
  },
  {
    name: 'Routines',
    icon: 'routine',
    color: '#ffd740',
    commands: [
      { say: 'good morning', desc: 'Morning routine: time, battery, weather, today\'s tasks', example: '' },
      { say: 'leaving home', desc: 'Leaving routine: DND, flashlight check, battery status', example: '' },
      { say: 'goodnight / bedtime', desc: 'Bedtime routine: DND on, sleep mode, battery check', example: '' },
    ],
  },
  {
    name: 'Cancellation',
    icon: 'cancel',
    color: '#ff5252',
    commands: [
      { say: 'cancel / never mind / abort', desc: 'Cancel any pending confirmation or action', example: '' },
    ],
  },
]

export default function CommandReference({ glassBg, onClose }) {
  const [expandedCat, setExpandedCat] = useState(null)
  const [search, setSearch] = useState('')
  const glassOpacity = useThemeStore(s => s.glassOpacity)

  const filtered = useMemo(() => {
    if (!search.trim()) return CATEGORIES
    const q = search.toLowerCase()
    return CATEGORIES.map(cat => ({
      ...cat,
      commands: cat.commands.filter(c => c.say.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q)),
    })).filter(cat => cat.commands.length > 0)
  }, [search])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <button onClick={onClose} className="flex items-center gap-1 text-on-surface-variant/50 hover:text-on-surface-variant text-xs font-mono-data transition-colors">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          TOOLS
        </button>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center border border-cyan-500/40"
          style={{ backgroundColor: glassBg }}>
          <span className="material-symbols-outlined text-lg text-cyan-400">lock_open</span>
        </div>
        <div>
          <h2 className="font-mono-data text-sm text-on-surface-variant tracking-wider uppercase">Unlock IRIS</h2>
          <p className="font-mono-data text-[9px] text-on-surface-variant/40">VOICE COMMAND REFERENCE — {CATEGORIES.reduce((a, c) => a + c.commands.length, 0)} COMMANDS</p>
        </div>
      </div>

      <div className="relative mb-4">
        <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/30 text-sm">search</span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search commands..."
          className="w-full bg-black/40 border border-outline-variant/30 rounded-lg pl-8 pr-3 py-2 text-xs text-on-surface-variant font-mono-data focus:outline-none focus:border-cyan-500/50 placeholder:text-on-surface-variant/20"
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 scroll-container pr-1">
        {filtered.map((cat, i) => (
          <div key={i} className="border border-outline-variant/10 rounded-xl overflow-hidden" style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}>
            <button
              onClick={() => setExpandedCat(expandedCat === i ? null : i)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/5"
            >
              <span className="material-symbols-outlined text-sm" style={{ color: cat.color }}>{cat.icon}</span>
              <div className="flex-1">
                <span className="font-mono-data text-[10px] text-on-surface-variant/80 tracking-wider uppercase">{cat.name}</span>
                <span className="font-mono-data text-[8px] text-on-surface-variant/30 ml-2">({cat.commands.length})</span>
              </div>
              <span className="material-symbols-outlined text-xs text-on-surface-variant/30">
                {expandedCat === i ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {expandedCat === i && (
              <div className="border-t border-outline-variant/10 px-3 py-2 space-y-1.5">
                {cat.commands.map((cmd, j) => (
                  <div key={j} className="flex flex-col gap-0.5 py-1.5 border-b border-outline-variant/5 last:border-0">
                    <div className="flex items-start gap-2">
                      <span className="font-mono-data text-[10px] font-bold tracking-wide shrink-0" style={{ color: cat.color }}>{cmd.say}</span>
                    </div>
                    <span className="font-mono-data text-[9px] text-on-surface-variant/40 leading-relaxed">{cmd.desc}</span>
                    {cmd.example && (
                      <span className="font-mono-data text-[8px] text-on-surface-variant/25 italic">e.g. &quot;{cmd.example}&quot;</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 border-t border-outline-variant/10 pt-3">
        <p className="font-mono-data text-[8px] text-on-surface-variant/30 text-center leading-relaxed">
          OFFLINE ASSISTANT — ALL COMMANDS PROCESS ON-DEVICE. NO INTERNET REQUIRED.
        </p>
      </div>
    </div>
  )
}
