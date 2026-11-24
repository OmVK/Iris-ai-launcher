import React, { useEffect, useState, useRef, useCallback } from 'react'
import { registerPlugin } from '@capacitor/core'
import { initEngine } from '../utils/OfflineCommandEngine'
import useOfflineTTS from '../hooks/useOfflineTTS'
import useOfflineDispatch from '../hooks/useOfflineDispatch'
import useOfflineAssistantCommand from '../hooks/useOfflineAssistantCommand'
import IrisVoiceCard from './IrisVoiceCard'
import { useAssistantStore } from '../stores/assistantStore'
import { checkAndRequestPermission } from './LauncherPlugin'

const LauncherPlugin = registerPlugin('LauncherPlugin')

export default function IrisVoiceOverlay({ isVisible, onClose, appsList, isAppActive = true, onNavigate: _onNavigate }) {
  const [statusText, setStatusText] = useState('')
  const [userTranscript, setUserTranscript] = useState('')
  const [_actionBadges, setActionBadges] = useState([])
  const [_isProcessing, setIsProcessing] = useState(false)
  const [_isListening, setIsListening] = useState(false)
  const [pendingContext, setPendingContext] = useState(null)

  const pendingContextRef = useRef(null)
  const pendingSuggestionsRef = useRef([])
  const pendingUninstallAppRef = useRef('')
  const pendingReminderTextRef = useRef('')
  const speechInterruptRef = useRef(false)
  const conversationHistoryRef = useRef([])
  const mountedRef = useRef(true)
  const timeoutsRef = useRef([])
  const isVisibleRef = useRef(isVisible)
  const appsListRef = useRef(appsList)
  const speechStartingRef = useRef(false)

  const handleCommandRef = useRef(null)
  const startListeningRef = useRef(null)

  const setIsStoreListening = useAssistantStore(state => state.setIsListening)

  useEffect(() => {
    setIsStoreListening(isVisible)
    return () => {
      setIsStoreListening(false)
    }
  }, [isVisible, setIsStoreListening])

  const { speakTextNative, stopSpeakingNative } = useOfflineTTS({ isVisible, isAppActive, speechInterruptRef })

  useEffect(() => { pendingContextRef.current = pendingContext }, [pendingContext])
  useEffect(() => { appsListRef.current = appsList }, [appsList])

  const { dispatchCommand } = useOfflineDispatch({ appsListRef, pendingSuggestionsRef })

  useEffect(() => {
    initEngine()
  }, [])

  useEffect(() => {
    mountedRef.current = true
    timeoutsRef.current.forEach(id => clearTimeout(id))
    timeoutsRef.current = []

    return () => {
      mountedRef.current = false
      timeoutsRef.current.forEach(id => clearTimeout(id))
      timeoutsRef.current = []
      LauncherPlugin.stopOfflineSpeech().catch(() => { })
    }
  }, [])

  const fallbackWebSpeech = async () => {
    return new Promise((resolve) => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!SpeechRecognition) return resolve(null)
      try {
        const recog = new SpeechRecognition()
        recog.continuous = false
        recog.interimResults = true
        recog.lang = 'en-US'
        let finalTranscript = ''
        recog.onstart = () => {
          if (mountedRef.current && isVisibleRef.current) {
            setStatusText('Listening...')
            setIsListening(true)
            setIsProcessing(false)
          }
        }
        recog.onresult = (event) => {
          let interim = ''
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript
            else interim += event.results[i][0].transcript
          }
          const text = finalTranscript || interim
          if (text && mountedRef.current && isVisibleRef.current) setUserTranscript(text)
        }
        recog.onerror = () => { setIsListening(false); setIsProcessing(false); resolve(null) }
        recog.onend = () => {
          setIsListening(false)
          resolve(finalTranscript.trim() ? { text: finalTranscript.trim() } : null)
        }
        recog.start()
      } catch { resolve(null) }
    })
  }

  const { handleCommand } = useOfflineAssistantCommand({
    pendingContext, setPendingContext,
    pendingContextRef, pendingSuggestionsRef, pendingUninstallAppRef,
    pendingReminderTextRef, speechInterruptRef, conversationHistoryRef,
    mountedRef, timeoutsRef, isVisibleRef,
    setStatusText, setIsProcessing, setUserTranscript,
    startListening: (retry) => {
      if (startListeningRef.current) startListeningRef.current(retry)
    },
    onClose,
    dispatchCommand, speakTextNative,
  })

  handleCommandRef.current = handleCommand

  const startListening = useCallback(async (retryCount = 0) => {
    if (speechStartingRef.current) speechStartingRef.current = false
    speechStartingRef.current = true
    const unguardTimer = setTimeout(() => { speechStartingRef.current = false }, 12000)

    try {
      try {
        await LauncherPlugin.stopOfflineSpeech()
        await new Promise(r => setTimeout(r, 150))
      } catch (_) { }

      try {
        const micStatus = await checkAndRequestPermission('RECORD_AUDIO')
        if (micStatus && !micStatus.granted && micStatus.sdkRequired) {
          setStatusText('Microphone access required'); setIsListening(false); setIsProcessing(false); return
        }
      } catch (_) { }

      setStatusText(window.__iris_incoming_call_ringing ? "Incoming Call — Say 'Answer call', 'Answer on speaker', or 'Decline'" : 'Listening...')
      setIsListening(true); setIsProcessing(false)

      let result = null
      try {
        result = await LauncherPlugin.startOfflineSpeech()
      } catch (nativeErr) {
        console.warn('[Iris] Native speech failed, trying WebSpeech:', nativeErr)
        result = await fallbackWebSpeech()
      }

      clearTimeout(unguardTimer)
      if (result?.text) {
        setUserTranscript(result.text)
        if (handleCommandRef.current) await handleCommandRef.current(result.text)
      } else if (retryCount < 1 && !speechInterruptRef.current && isVisibleRef.current) {
        setIsProcessing(false); setIsListening(false)
        const tid = setTimeout(() => {
          if (mountedRef.current && isVisibleRef.current && startListeningRef.current) startListeningRef.current(retryCount + 1)
        }, 150)
        timeoutsRef.current.push(tid)
      } else {
        setStatusText("Didn't catch that. Tap orb to try again."); setIsListening(false); setIsProcessing(false)
        LauncherPlugin.stopOfflineSpeech().catch(() => { })
      }
    } catch (e) {
      clearTimeout(unguardTimer)
      console.error('[Iris] startListening error:', e)
      setIsProcessing(false); setIsListening(false)
      if (retryCount < 1 && !speechInterruptRef.current && isVisibleRef.current) {
        const tid = setTimeout(() => {
          if (mountedRef.current && isVisibleRef.current && startListeningRef.current) startListeningRef.current(retryCount + 1)
        }, 150)
        timeoutsRef.current.push(tid)
      } else {
        setStatusText('Tap orb to speak.'); LauncherPlugin.stopOfflineSpeech().catch(() => { })
      }
    } finally {
      clearTimeout(unguardTimer)
      speechStartingRef.current = false
    }
  }, [])

  startListeningRef.current = startListening

  useEffect(() => {
    useAssistantStore.getState().setActiveUserTranscript(userTranscript || '')
  }, [userTranscript])

  useEffect(() => {
    const isPlaceholder = !statusText || /^(?:listening\.{0,3}|thinking\.{0,3}|working on it\.{0,3}|tap (?:orb )?to (?:speak|try again)\.?|didn't catch that.*)$/i.test(statusText.trim())
    useAssistantStore.getState().setActiveAiResponse(isPlaceholder ? '' : statusText)
  }, [statusText])

  useEffect(() => {
    const onSteps = (e) => {
      if (Array.isArray(e?.detail?.steps)) setActionBadges(e.detail.steps)
    }
    const onFollowUp = () => {
      timeoutsRef.current.forEach((id) => clearTimeout(id))
      timeoutsRef.current = []
      speechInterruptRef.current = true
      stopSpeakingNative()
      setActionBadges([])
      setUserTranscript('')
      setStatusText('Listening...')
      useAssistantStore.getState().setActiveUserTranscript('')
      useAssistantStore.getState().setActiveAiResponse('')
      window.dispatchEvent(new CustomEvent('iris-agent-steps', { detail: { steps: [] } }))
      setTimeout(() => {
        speechInterruptRef.current = false
        if (startListeningRef.current) startListeningRef.current(0)
      }, 60)
    }
    const onNotchClose = () => {
      if (typeof onClose === 'function') onClose()
    }
    window.addEventListener('iris-agent-steps', onSteps)
    window.addEventListener('iris-notch-followup', onFollowUp)
    window.addEventListener('iris-notch-close', onNotchClose)
    return () => {
      window.removeEventListener('iris-agent-steps', onSteps)
      window.removeEventListener('iris-notch-followup', onFollowUp)
      window.removeEventListener('iris-notch-close', onNotchClose)
    }
  }, [onClose, stopSpeakingNative])

  useEffect(() => {
    isVisibleRef.current = isVisible

    if (!isVisible) {
      setIsProcessing(false); setIsListening(false); setStatusText(''); setUserTranscript(''); setActionBadges([])
      useAssistantStore.getState().setActiveUserTranscript('')
      useAssistantStore.getState().setActiveAiResponse('')
      window.dispatchEvent(new CustomEvent('iris-agent-steps', { detail: { steps: [] } }))
      setPendingContext(null)
      pendingSuggestionsRef.current = []
      pendingUninstallAppRef.current = ''
      pendingReminderTextRef.current = ''
      speechInterruptRef.current = true
      stopSpeakingNative()
      LauncherPlugin.stopOfflineSpeech().catch(() => { })
      window.__iris_offline_assistant_active = false
      return
    }

    window.__iris_offline_assistant_active = true
    speechInterruptRef.current = false
    setActionBadges([])
    const pendingCmd = window.__iris_pending_wake_command
    if (pendingCmd) {
      window.__iris_pending_wake_command = null
      setUserTranscript(pendingCmd)
      if (handleCommandRef.current) handleCommandRef.current(pendingCmd)
    } else if (startListeningRef.current) {
      startListeningRef.current(0)
    }

    const statusListener = LauncherPlugin.addListener('onSpeechStatus', (data) => {
      if (!mountedRef.current) return
      if (data.status === 'listening') {
        setStatusText(window.__iris_incoming_call_ringing ? "Incoming Call — Say 'Answer call', 'Answer on speaker', or 'Decline'" : 'Listening...')
        setIsListening(true); setIsProcessing(false)
      } else if (data.status === 'processing') {
        setStatusText('Thinking...'); setIsListening(false); setIsProcessing(true)
      }
    })

    const partialListener = LauncherPlugin.addListener('onSpeechPartial', (data) => {
      if (mountedRef.current && data.text) setUserTranscript(data.text)
    })

    return () => {
      if (typeof statusListener?.then === 'function') statusListener.then(l => l.remove())
      else statusListener?.remove?.()
      if (typeof partialListener?.then === 'function') partialListener.then(l => l.remove())
      else partialListener?.remove?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible])

  if (!isVisible) return null

  return (
    <div
      className="fixed inset-0 z-40 pointer-events-auto animate-in fade-in duration-200"
      onClick={() => { if (typeof onClose === 'function') onClose() }}
    >
      <div className="pointer-events-none fixed inset-0 z-30 transition-all duration-300 shadow-[inset_0_0_24px_rgba(var(--primary-rgb),0.28)]" />
      <IrisVoiceCard />
    </div>
  )
}