import { useState, useEffect, useCallback } from 'react'
import SettingsSection from './SettingsSection'
import { SettingToggle, SettingOptionGrid } from './SettingControls'
import LLMBackendSection from './LLMBackendSection'
import VoiceSettingsSection from './VoiceSettingsSection'
import ApiKeysSection from './ApiKeysSection'
import { useAIStore } from '../../stores/aiStore'
import { useAssistantStore } from '../../stores/assistantStore'
import { useThemeStore } from '../../stores/themeStore'
import { useAppStore } from '../../stores/appStore'
import HapticFeedback from '../../utils/HapticFeedback'
import {
  requestDefaultLauncher,
  openSystemSettings,
  getAssistantAndHomeRoleStatus,
} from '../../components/LauncherPlugin'

const HUB_TABS = [
  { id: 'HOME_ROLES', label: 'HOME & ROLES', icon: 'home_app_logo' },
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

  const {
    voiceEnabled,
    setVoiceEnabled,
    wakeWordEnabled,
    setWakeWordEnabled,
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

  const {
    dockHoldAssistant,
    setDockHoldAssistant,
  } = useThemeStore()

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
    const onVis = () => {
      if (!document.hidden) refreshRoleStatus()
    }
    window.addEventListener('focus', refreshRoleStatus)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('focus', refreshRoleStatus)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [refreshRoleStatus])

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

  const handleTestHomeVoice = () => {
    HapticFeedback.double()
    useAppStore.getState().setActivePage('home')
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('iris-trigger-assistant'))
    }, 80)
  }

  const handleOpenIrisAiPage = () => {
    HapticFeedback.light()
    useAppStore.getState().setActivePage('assistant')
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
                onClick={() => {
                  HapticFeedback.light()
                  setActiveTab(tab.id)
                }}
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
              <div className="p-3 rounded-xl bg-black/40 border border-primary-fixed-dim/25 flex flex-col justify-between space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-primary-fixed-dim">home</span>
                    <span className="text-[9px] font-bold font-mono text-white uppercase tracking-wider">DEFAULT HOME LAUNCHER</span>
                  </div>
                  <span className={`text-[7px] font-mono px-1.5 py-0.5 rounded border ${
                    roleStatus.isDefaultHome
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  }`}>
                    {roleStatus.isDefaultHome ? 'ACTIVE DEFAULT' : 'NOT DEFAULT'}
                  </span>
                </div>
                <p className="text-[8px] font-mono text-white/60 leading-relaxed">
                  Set IRIS as your default Android Home screen shell with Top Dynamic Island and Home Voice Overlay.
                </p>
                <button
                  type="button"
                  onClick={handleSetDefaultHome}
                  className="w-full py-1.5 rounded-lg bg-primary-fixed-dim/20 hover:bg-primary-fixed-dim/30 border border-primary-fixed-dim/40 text-primary-fixed-dim font-mono font-bold text-[9px] uppercase tracking-wider transition-all active:scale-95"
                >
                  {roleStatus.isDefaultHome ? 'CHANGE DEFAULT HOME APP' : 'SET AS DEFAULT HOME'}
                </button>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-cyan-500/25 flex flex-col justify-between space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-cyan-400">assistant</span>
                    <span className="text-[9px] font-bold font-mono text-white uppercase tracking-wider">DEFAULT DIGITAL ASSISTANT</span>
                  </div>
                  <span className={`text-[7px] font-mono px-1.5 py-0.5 rounded border ${
                    roleStatus.isDefaultAssistant
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  }`}>
                    {roleStatus.isDefaultAssistant ? 'ACTIVE DEFAULT' : 'NOT DEFAULT'}
                  </span>
                </div>
                <p className="text-[8px] font-mono text-white/60 leading-relaxed">
                  Wake IRIS from any app by holding the Power Button, swiping the bottom corner, or pressing your headset button (0% idle mic).
                </p>
                <button
                  type="button"
                  onClick={() => openSystemSettings('assistant')}
                  className="w-full py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 font-mono font-bold text-[9px] uppercase tracking-wider transition-all active:scale-95"
                >
                  {roleStatus.isDefaultAssistant ? 'CONFIGURE DIGITAL ASSISTANT' : 'SET DEFAULT DIGITAL ASSISTANT'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleTestHomeVoice}
                className="py-2 px-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/35 text-cyan-300 font-mono font-bold text-[8.5px] uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-xs">mic</span>
                <span>TEST HOME VOICE</span>
              </button>
              <button
                type="button"
                onClick={handleOpenIrisAiPage}
                className="py-2 px-3 rounded-xl bg-primary-fixed-dim/15 hover:bg-primary-fixed-dim/25 border border-primary-fixed-dim/35 text-primary-fixed-dim font-mono font-bold text-[8.5px] uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-xs">smart_toy</span>
                <span>OPEN IRIS AI CHAT</span>
              </button>
            </div>

            <div className="space-y-2.5 pt-1 font-mono-data text-xs">
              <SettingToggle
                label="Dock Hold Voice Assistant"
                sublabel="HOLD_BOTTOM_DOCK_1S_FOR_VOICE_OVERLAY"
                icon="touch_app"
                value={dockHoldAssistant}
                onChange={setDockHoldAssistant}
              />
              <SettingToggle
                label="Hands-Free Shake & Call Auto-Wake"
                sublabel="WAKE_ON_INCOMING_CALLS_OR_WRIST_SHAKE_NO_24_7_MIC"
                icon="sensors"
                value={wakeWordEnabled}
                onChange={setWakeWordEnabled}
              />
              <SettingToggle
                label="Spoken Voice Replies (Home & Iris AI)"
                sublabel="UNIFIED_TTS_AUDIO_OUTPUT"
                icon="volume_up"
                value={voiceEnabled}
                onChange={handleToggleVoice}
              />
              <SettingToggle
                label="Haptic Vibration Feedback"
                sublabel="VIBRATE_ON_ASSISTANT_AND_TOUCH"
                icon="vibration"
                value={haptics}
                onChange={handleHapticsChange}
              />
              <SettingToggle
                label="Show App Drawer Search Bar"
                sublabel="SHOW_SEARCH_IN_DRAWER"
                icon="search"
                value={showDrawerSearch}
                onChange={setShowDrawerSearch}
              />
            </div>
          </div>
        )}

        {activeTab === 'AI_BRAIN' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-[8px] text-primary-fixed-dim font-bold uppercase font-mono-data tracking-wider">
                UNIFIED HOME &amp; IRIS AI PERSONA MODE
              </p>
              <SettingOptionGrid
                options={PERSONA_OPTIONS}
                value={assistantPersona || 'CHAT'}
                onChange={(v) => setAssistantPersona(v)}
                columns={3}
              />
            </div>

            <div className="space-y-2 font-mono-data text-xs">
              <SettingToggle
                label="Live Web Search Citations"
                sublabel="DUCKDUCKGO_AND_WIKIPEDIA_AUGMENTATION"
                icon="travel_explore"
                value={!!webSearchEnabled}
                onChange={(v) => setWebSearchEnabled(v)}
              />
              <SettingToggle
                label="Incognito Zero-Trace Mode"
                sublabel="DO_NOT_SAVE_VOICE_OR_CHAT_HISTORY"
                icon="visibility_off"
                value={!!isPrivateSession}
                onChange={() => togglePrivate()}
              />
            </div>

            <div className="pt-2 border-t border-white/10">
              <p className="text-[8px] text-primary-fixed-dim font-bold uppercase font-mono-data tracking-wider mb-2">
                SHARED HOME &amp; IRIS AI LLM ENGINE
              </p>
              <LLMBackendSection
                embedded
                expandedSections={expandedSections}
                toggleSection={toggleSection}
                llmBackend={llmBackend}
                setLlmBackend={setLlmBackend}
                geminiModel={geminiModel}
                setGeminiModel={setGeminiModel}
              />
            </div>
          </div>
        )}

        {activeTab === 'VOICE_TTS' && (
          <VoiceSettingsSection
            embedded
            expandedSections={expandedSections}
            toggleSection={toggleSection}
            voicePitch={voicePitch}
            setVoicePitch={setVoicePitch}
            voiceRate={voiceRate}
            setVoiceRate={setVoiceRate}
          />
        )}

        {activeTab === 'API_KEYS' && (
          <ApiKeysSection
            embedded
            expandedSections={expandedSections}
            toggleSection={toggleSection}
            geminiKey={geminiKey}
            setGeminiKey={setGeminiKey}
            groqKey={groqKey}
            setGroqKey={setGroqKey}
          />
        )}
      </div>
    </SettingsSection>
  )
}
