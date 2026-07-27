import { useState, useEffect, useCallback } from 'react'
import SettingsSection from './SettingsSection'
import { isAccessibilityServiceEnabled, openPermissionSettings } from '../../components/LauncherPlugin'

const GESTURE_SLOTS = [
  { id: 'swipe_up', label: 'Swipe Up', icon: 'swipe_up', surface: 'home' },
  { id: 'swipe_down', label: 'Swipe Down', icon: 'swipe_down', surface: 'home' },
  { id: 'swipe_left', label: 'Swipe Left', icon: 'swipe_left', surface: 'home' },
  { id: 'swipe_right', label: 'Swipe Right', icon: 'swipe_right', surface: 'home' },
  { id: 'double_tap', label: 'Double Tap', icon: 'touch_app', surface: 'home' },
  { id: 'long_press_empty', label: 'Long Press Empty', icon: 'back_hand', surface: 'home' },
  { id: 'pinch_in', label: 'Pinch In', icon: 'pinch', surface: 'home' },
  { id: 'two_finger_swipe_up', label: 'Two-Finger Swipe Up', icon: 'swipe_up', surface: 'home' },
  { id: 'two_finger_swipe_down', label: 'Two-Finger Swipe Down', icon: 'swipe_down', surface: 'home' },
  { id: 'drawer_swipe_up', label: 'Drawer Swipe Up', icon: 'swipe_up', surface: 'drawer' },
  { id: 'drawer_swipe_down', label: 'Drawer Swipe Down', icon: 'swipe_down', surface: 'drawer' },
  { id: 'dock_long_press', label: 'Dock Long Press', icon: 'back_hand', surface: 'dock' },
]

const GESTURE_ACTIONS = [
  { id: 'open_home', label: 'Home' },
  { id: 'open_drawer', label: 'Open Drawer' },
  { id: 'open_search', label: 'Open Search' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'quick_settings', label: 'Quick Settings' },
  { id: 'assistant', label: 'AI Assistant' },
  { id: 'recents', label: 'Recent Tasks' },
  { id: 'open_terminal', label: 'Terminal' },
  { id: 'open_widgets', label: 'Widgets' },
  { id: 'do_nothing', label: 'Do Nothing' },
]

const GESTURE_MAP_KEY = 'iris_gesture_map'

function loadGestureMap() {
  try {
    const raw = localStorage.getItem(GESTURE_MAP_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return {
    swipe_up: { action: 'open_drawer' },
    swipe_down: { action: 'notifications' },
    double_tap: { action: 'open_search' },
    swipe_left: { action: 'do_nothing' },
    swipe_right: { action: 'do_nothing' },
    long_press_empty: { action: 'do_nothing' },
    pinch_in: { action: 'do_nothing' },
    two_finger_swipe_up: { action: 'do_nothing' },
    two_finger_swipe_down: { action: 'do_nothing' },
    drawer_swipe_up: { action: 'do_nothing' },
    drawer_swipe_down: { action: 'do_nothing' },
    dock_long_press: { action: 'do_nothing' },
  }
}

function saveGestureMap(map) {
  try {
    localStorage.setItem(GESTURE_MAP_KEY, JSON.stringify(map))
  } catch {}
}

export default function GestureSettingsSection({ expandedSections, toggleSection }) {
  const [a11yEnabled, setA11yEnabled] = useState(false)
  const [gestureMap, setGestureMap] = useState(loadGestureMap)

  useEffect(() => {
    checkAccessibility()
  }, [])

  async function checkAccessibility() {
    const enabled = await isAccessibilityServiceEnabled()
    setA11yEnabled(enabled)
  }

  const handleGestureChange = useCallback((gestureId, actionId) => {
    setGestureMap(prev => {
      const next = { ...prev, [gestureId]: { action: actionId } }
      saveGestureMap(next)
      return next
    })
  }, [])

  const activeCount = Object.values(gestureMap).filter(g => g?.action && g.action !== 'do_nothing').length

  return (
    <SettingsSection title="GESTURES" icon="back_hand" sectionKey="gestures" expandedSections={expandedSections} toggleSection={toggleSection} badge={`${activeCount} ACTIVE`}>
      <div className="space-y-4">
        {!a11yEnabled && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-rounded text-amber-400 text-sm">accessibility_new</span>
            <p className="text-[10px] text-amber-400 font-mono-data font-semibold">ACCESSIBILITY SERVICE REQUIRED</p>
          </div>
          <p className="text-[10px] text-white/40 font-mono-data mb-2">
            Enable the IRIS accessibility service for advanced gestures, screen capture, and recents task switcher.
          </p>
          <button
            onClick={() => openPermissionSettings('BIND_ACCESSIBILITY_SERVICE')}
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-[10px] font-mono-data hover:bg-amber-500/30 transition-all"
          >
            OPEN ACCESSIBILITY SETTINGS
          </button>
        </div>
      )}

      <div className="space-y-3">
        {GESTURE_SLOTS.map(slot => (
          <div key={slot.id} className="glass-surface rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-rounded text-white/40 text-sm">{slot.icon}</span>
                <span className="text-xs text-white/70 font-mono-data">{slot.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[8px] text-white/20 font-mono-data px-1.5 py-0.5 rounded bg-white/5">{slot.surface}</span>
                <span className="text-[9px] text-white/30 font-mono-data">
                  {GESTURE_ACTIONS.find(a => a.id === gestureMap[slot.id]?.action)?.label || 'Do Nothing'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {GESTURE_ACTIONS.map(action => (
                <button
                  key={action.id}
                  onClick={() => handleGestureChange(slot.id, action.id)}
                  className={`py-1.5 px-1.5 rounded-lg text-[8px] font-mono-data transition-all ${
                    gestureMap[slot.id]?.action === action.id
                      ? 'bg-[rgba(var(--primary-rgb),0.2)] text-[var(--primary-color)] border border-[var(--primary-color)]/30'
                      : 'bg-white/5 text-white/40 hover:bg-white/10 border border-transparent'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      </div>
    </SettingsSection>
  )
}
