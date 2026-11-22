import { useState, useEffect, useCallback } from 'react'
import SettingsSection from './SettingsSection'
import { SettingToggle, SettingOptionGrid } from './SettingControls'
import LLMBackendSection from './LLMBackendSection'
import VoiceSettingsSection from './VoiceSettingsSection'
import ApiKeysSection from './ApiKeysSection'
import { useAIStore } from '../../stores/aiStore'
import { useAssistantStore } from '../../stores/assistantStore'
import { useThemeStore } from '../../stores/themeStore'
import HapticFeedback from '../../utils/HapticFeedback'
import {
  requestDefaultLauncher,
  openSystemSettings,
  getAssistantAndHomeRoleStatus,
} from '../../components/LauncherPlugin'

const HUB_TABS = [
  { id: 'HOME_ROLES', label: 'WAKE & ROLES', icon: 'sensors' },
  { id: 'AI_BRAIN', label: 'AI BRAIN', icon: 'neurology' },
  { id: 'VOICE_TTS', label: 'VOICE & TTS', icon: 'record_voice_over' },
  { id: 'API_KEYS', label: 'API KEYS', icon: 'key' },
]

const PERSONA_OPTIONS = [
  { id: 'CHAT', label: 'CHAT (DEFAULT)' },
  { id: 'CODER', label: 'CODER' },
  { id: 'TUTOR', label: 'TUTOR' },
  { id: 'RESEARCH', label: 'RESEARCH' },
  { id: 'COMMANDER', label: 'COMMANDER' },
]

const WAKE_TARGET_OPTIONS = [
  { id: 'HOME_OVERLAY', label: 'HOME VOICE PILL' },
  { id: 'FULL_LIVE_AI', label: 'FULL IRIS AI LIVE' },
]

const ACTIVATION_MODES = [
  { id: 'SYSTEM_ASSIST', label: 'System Assistant', desc: 'Power Btn / Corner Swipe', icon: 'assistant', tag: '0% IDLE MIC' },
  { id: 'DOCK_HOLD', label: 'Dock Hold (1s)', desc: 'Hold Bottom Home Dock', icon: 'touch_app', tag: '0% IDLE MIC' },
  { id: 'HEY_IRIS', label: '"Hey Iris" Voice', desc: 'Voice Wake on Home', icon: 'hearing', tag: 'GREEN MIC DOT' },
  { id: 'WRIST_SHAKE', label: 'Wrist Shake', desc: 'Flick Phone to Wake', icon: 'vibration', tag: '0% IDLE MIC' },
  { id: 'HOME_GESTURE', label: 'Home Gesture', desc: 'Double Tap / Long Press', icon: 'back_hand', tag: '0% IDLE MIC' },
  { id: 'MANUAL_ONLY', label: 'Manual Tap Only', desc: 'All Auto-Triggers Off', icon: 'block', tag: 'OFF' },
]

const SHAKE_SENSITIVITY_OPTIONS = [
  { id: 'LIGHT', label: 'LIGHT' },
  { id: 'NORMAL', label: 'NORMAL' },
  { id: 'FIRM', label: 'FIRM' },
]

const HOME_GESTURE_OPTIONS = [
  { id: 'double_tap', label: 'DOUBLE TAP' },
  { id: 'long_press_empty', label: 'LONG PRESS' },
  { id: 'two_finger_swipe_up', label: '2-FINGER UP' },
]

function getActiveAssistantGesture() {
  try {
    const raw = localStorage.getItem('iris_gesture_map')
    if (!raw) return 'double_tap'
    const map = JSON.parse(raw)
    for (const slot of ['double_tap', 'long_press_empty', 'two_finger_swipe_up']) {
      if (map?.[slot]?.action === 'assistant') return slot
    }
  } catch {}
  return 'double_tap'
}

function setAssistantGestureSlot(slotId) {
  try {
    const defaults = {
      swipe_up: { action: 'open_drawer' },
      swipe_down: { action: 'notifications' },
      double_tap: { action: 'open_search' },
      swipe_left: { action: 'do_nothing' },
      swipe_right: { action: 'do_nothing' },
      long_press_empty: { action: 'do_nothing' },
      pinch_in: { action: 'do_nothing' },
      two_finger_swipe_up: { action: 'do_nothing' },
      two_finger_swipe_down: { action: 'do_nothing' },
    }
    const raw = localStorage.getItem('iris_gesture_map')
    const map = raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults }
    for (const s of ['double_tap', 'long_press_empty', 'two_finger_swipe_up']) {
      if (map[s]?.action === 'assistant') {
        map[s] = { action: s === 'double_tap' ? 'open_search' : 'do_nothing' }
      }
    }
    if (slotId && slotId !== 'NONE') {
      map[slotId] = { action: 'assistant' }
    }
    localStorage.setItem('iris_gesture_map', JSON.stringify(map))
  } catch {}
}

export default function IrisAssistantHubSection({
  expandedSections,
  toggleSection,
  llmBackend,
  setLlmBackend,
  geminiModel,
  setGeminiModel,
  geminiKey,
  setGeminiKey,
  groqKey,
  setGroqKey,
  voicePitch,
  setVoicePitch,
  voiceRate,
  setVoiceRate,
  showDrawerSearch,
  setShowDrawerSearch,
}) {
  const [activeTab, setActiveTab] = useState('HOME_ROLES')
  const [roleStatus, setRoleStatus] = useState({ isDefaultHome: false, isDefaultAssistant: false })
  const [haptics, setHaptics] = useState(() => HapticFeedback.isEnabled())
  const [homeGestureSlot, setHomeGestureSlot] = useState(getActiveAssistantGesture)

  const {
    voiceEnabled,
    setVoiceEnabled,
    assistantActivationMode,
    setAssistantActivationMode,
    shakeSensitivity,
    setShakeSensitivity,
    callAutoWakeEnabled,
    setCallAutoWakeEnabled,
    assistantWakeTarget,
    setAssistantWakeTarget,
    voiceEngineProvider,
  } = useAIStore()

  const {
    assistantPersona,
    setAssistantPersona,
    webSearchEnabled,
    setWebSearchEnabled,
    isPrivateSession,
    togglePrivate,
  } = useAssistantStore()

  const { setDockHoldAssistant } = useThemeStore()

  const refreshRoleStatus = useCallback(async () => {
    const res = await getAssistantAndHomeRoleStatus()
    if (res) {
      setRoleStatus({
        isDefaultHome: !!res.isDefaultHome,
        isDefaultAssistant: !!res.isDefaultAssistant,
      })
    }
  }, [])

  useEffect(() => {
    refreshRoleStatus()
    const onVis = () => { if (!document.hidden) refreshRoleStatus() }
    window.addEventListener('focus', refreshRoleStatus)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('focus', refreshRoleStatus)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [refreshRoleStatus])

  const handleSelectActivationMode = (mode) => {
    HapticFeedback.light()
    setAssistantActivationMode(mode)
    setDockHoldAssistant(mode === 'DOCK_HOLD')
    if (mode === 'HOME_GESTURE') {
      const slot = homeGestureSlot || 'double_tap'
      setAssistantGestureSlot(slot)
      setHomeGestureSlot(slot)
    } else {
      setAssistantGestureSlot('NONE')
    }
  }

  const handleHomeGestureSelect = (slotId) => {
    HapticFeedback.light()
    setHomeGestureSlot(slotId)
    setAssistantGestureSlot(slotId)
  }

  const handleToggleVoice = (v) => {
    setVoiceEnabled(v)
    try { localStorage.setItem('assistant_tts_enabled', v.toString()) } catch {}
  }

  const handleHapticsChange = (val) => {
    HapticFeedback.setEnabled(val)
    setHaptics(val)
  }

  const handleSetDefaultHome = async () => {
    HapticFeedback.light()
    await requestDefaultLauncher()
    setTimeout(refreshRoleStatus, 600)
  }

  const badge = (
    <span className="font-mono-data text-[8px] px-2 py-0.5 rounded bg-primary-fixed-dim/15 border border-primary-fixed-dim/40 text-primary-fixed-dim font-bold">
      {`${llmBackend} · ${assistantPersona || 'CHAT'} · ${voiceEngineProvider}`}
    </span>
  )

  return (
    <SettingsSection
      title="IRIS HOME & AI ASSISTANT"
      icon="smart_toy"
      sectionKey="irisAssistantHub"
      expandedSections={expandedSections}
      toggleSection={toggleSection}
      badge={badge}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10">
          {HUB_TABS.map((tab) => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => { HapticFeedback.light(); setActiveTab(tab.id) }}
                className={`py-2 px-1 rounded-lg flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                  active
                    ? 'bg-primary-fixed-dim/20 border border-primary-fixed-dim/50 text-primary-fixed-dim shadow-[0_0_12px_rgba(var(--primary-rgb),0.25)]'
                    : 'text-on-surface-variant/60 hover:text-white border border-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-xs">{tab.icon}</span>
                <span className="font-mono-data text-[7.5px] font-bold tracking-wider truncate w-full text-center">
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>

        {activeTab === 'HOME_ROLES' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-black/40 border border-primary-fixed-dim/25 flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-primary-fixed-dim">home</span>
                    <span className="text-[9px] font-bold font-mono text-white uppercase tracking-wider">DEFAULT HOME LAUNCHER</span>
                  </div>
                  <span className={`text-[7px] font-mono px-1.5 py-0.5 rounded border ${
                    roleStatus.isDefaultHome ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  }`}>
                    {roleStatus.isDefaultHome ? 'ACTIVE DEFAULT' : 'NOT DEFAULT'}
                  </span>
                </div>
                <button type="button" onClick={handleSetDefaultHome} className="w-full py-1.5 rounded-lg bg-primary-fixed-dim/20 hover:bg-primary-fixed-dim/30 border border-primary-fixed-dim/40 text-primary-fixed-dim font-mono font-bold text-[9px] uppercase tracking-wider transition-all active:scale-95">
                  {roleStatus.isDefaultHome ? 'CHANGE DEFAULT HOME APP' : 'SET AS DEFAULT HOME'}
                </button>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-cyan-500/25 flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-cyan-400">assistant</span>
                    <span className="text-[9px] font-bold font-mono text-white uppercase tracking-wider">DEFAULT DIGITAL ASSISTANT</span>
                  </div>
                  <span className={`text-[7px] font-mono px-1.5 py-0.5 rounded border ${
                    roleStatus.isDefaultAssistant ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  }`}>
                    {roleStatus.isDefaultAssistant ? 'ACTIVE DEFAULT' : 'NOT DEFAULT'}
                  </span>
                </div>
                <button type="button" onClick={() => openSystemSettings('assistant')} className="w-full py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 font-mono font-bold text-[9px] uppercase tracking-wider transition-all active:scale-95">
                  {roleStatus.isDefaultAssistant ? 'CONFIGURE DIGITAL ASSISTANT' : 'SET DEFAULT DIGITAL ASSISTANT'}
                </button>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-black/35 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[8px] text-primary-fixed-dim font-bold uppercase font-mono-data tracking-wider">
                  WHEN ACTIVATED, OPEN INTERFACE
                </p>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('iris-activate-assistant'))}
                  className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-mono text-[7.5px] font-bold uppercase active:scale-95"
                >
                  TEST NOW
                </button>
              </div>
              <SettingOptionGrid options={WAKE_TARGET_OPTIONS} value={assistantWakeTarget || 'HOME_OVERLAY'} onChange={setAssistantWakeTarget} columns={2} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[8px] text-cyan-400 font-bold uppercase font-mono-data tracking-wider">
                  CHOOSE 1 PRIMARY AI ACTIVATION METHOD
                </p>
                <span className="text-[7px] font-mono text-white/45 uppercase">SINGLE EXCLUSIVE MODE</span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 font-mono">
                {ACTIVATION_MODES.map((m) => {
                  const isSelected = (assistantActivationMode || 'SYSTEM_ASSIST') === m.id
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSelectActivationMode(m.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all active:scale-95 flex flex-col justify-between ${
                        isSelected
                          ? 'bg-cyan-950/65 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(0,242,255,0.2)]'
                          : 'bg-black/35 border-white/10 text-on-surface-variant/65 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className={`material-symbols-outlined text-xs ${isSelected ? 'text-cyan-400' : 'text-white/40'}`}>{m.icon}</span>
                        <span className={`text-[6.5px] px-1.5 py-0.2 rounded border ${
                          isSelected
                            ? 'bg-cyan-500/25 border-cyan-400/60 text-cyan-200 font-bold'
                            : 'bg-white/5 border-white/10 text-white/40'
                        }`}>
                          {isSelected ? 'ACTIVE' : m.tag}
                        </span>
                      </div>
                      <span className="text-[9px] font-bold truncate">{m.label}</span>
                      <span className="text-[7px] text-white/45 truncate mt-0.5">{m.desc}</span>
                    </button>
                  )
                })}
              </div>

              {assistantActivationMode === 'WRIST_SHAKE' && (
                <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 space-y-1.5">
                  <p className="text-[8px] text-cyan-300 font-bold font-mono uppercase">WRIST SHAKE SENSITIVITY</p>
                  <SettingOptionGrid options={SHAKE_SENSITIVITY_OPTIONS} value={shakeSensitivity || 'NORMAL'} onChange={setShakeSensitivity} columns={3} />
                </div>
              )}

              {assistantActivationMode === 'HOME_GESTURE' && (
                <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 space-y-1.5">
                  <p className="text-[8px] text-cyan-300 font-bold font-mono uppercase">SELECT HOME SCREEN GESTURE</p>
                  <SettingOptionGrid options={HOME_GESTURE_OPTIONS} value={homeGestureSlot} onChange={handleHomeGestureSelect} columns={3} />
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-white/10 space-y-2 font-mono-data text-xs">
              <SettingToggle label="Auto-Wake on Incoming Phone Calls" sublabel="SAY_ANSWER_CALL_OR_DECLINE_WHEN_RINGING" icon="call" value={callAutoWakeEnabled} onChange={setCallAutoWakeEnabled} />
              <SettingToggle label="Spoken Voice Replies (Home & Iris AI)" sublabel="UNIFIED_TTS_AUDIO_OUTPUT" icon="volume_up" value={voiceEnabled} onChange={handleToggleVoice} />
              <SettingToggle label="Haptic Vibration Feedback" sublabel="VIBRATE_ON_ASSISTANT_AND_TOUCH" icon="sensors" value={haptics} onChange={handleHapticsChange} />
              <SettingToggle label="Show App Drawer Search Bar" sublabel="SHOW_SEARCH_IN_DRAWER" icon="search" value={showDrawerSearch} onChange={setShowDrawerSearch} />
            </div>
          </div>
        )}

        {activeTab === 'AI_BRAIN' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-[8px] text-primary-fixed-dim font-bold uppercase font-mono-data tracking-wider">UNIFIED HOME &amp; IRIS AI PERSONA MODE</p>
              <SettingOptionGrid options={PERSONA_OPTIONS} value={assistantPersona || 'CHAT'} onChange={setAssistantPersona} columns={3} />
            </div>
            <div className="space-y-2 font-mono-data text-xs">
              <SettingToggle label="Live Web Search Citations" sublabel="DUCKDUCKGO_AND_WIKIPEDIA_AUGMENTATION" icon="travel_explore" value={!!webSearchEnabled} onChange={setWebSearchEnabled} />
              <SettingToggle label="Incognito Zero-Trace Mode" sublabel="DO_NOT_SAVE_VOICE_OR_CHAT_HISTORY" icon="visibility_off" value={!!isPrivateSession} onChange={() => togglePrivate()} />
            </div>
            <div className="pt-2 border-t border-white/10">
              <p className="text-[8px] text-primary-fixed-dim font-bold uppercase font-mono-data tracking-wider mb-2">SHARED HOME &amp; IRIS AI LLM ENGINE</p>
              <LLMBackendSection embedded expandedSections={expandedSections} toggleSection={toggleSection} llmBackend={llmBackend} setLlmBackend={setLlmBackend} geminiModel={geminiModel} setGeminiModel={setGeminiModel} />
            </div>
          </div>
        )}

        {activeTab === 'VOICE_TTS' && (
          <VoiceSettingsSection embedded expandedSections={expandedSections} toggleSection={toggleSection} voicePitch={voicePitch} setVoicePitch={setVoicePitch} voiceRate={voiceRate} setVoiceRate={setVoiceRate} />
        )}

        {activeTab === 'API_KEYS' && (
          <ApiKeysSection embedded expandedSections={expandedSections} toggleSection={toggleSection} geminiKey={geminiKey} setGeminiKey={setGeminiKey} groqKey={groqKey} setGroqKey={setGroqKey} />
        )}
      </div>
    </SettingsSection>
  )
}
