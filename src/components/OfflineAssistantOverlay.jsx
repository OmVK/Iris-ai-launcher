import React, { useEffect, useState, useRef } from 'react'
import { registerPlugin } from '@capacitor/core'
import { initEngine } from '../utils/OfflineCommandEngine'
import useOfflineTTS from '../hooks/useOfflineTTS'
import useOfflineDispatch from '../hooks/useOfflineDispatch'
import useOfflineAssistantCommand from '../hooks/useOfflineAssistantCommand'
import AssistantStatusPanel from './AssistantStatusPanel'
import { useAssistantStore } from '../stores/assistantStore'

const LauncherPlugin = registerPlugin('LauncherPlugin')

export default function OfflineAssistantOverlay({ isVisible, onClose, onOpen, appsList, onStateChange, isAppActive = true }) {
  const [statusText, setStatusText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [pendingContext, setPendingContext] = useState(null)
  const pendingContextRef = useRef(null)
  const pendingSuggestionsRef = useRef([])
  const pendingUninstallAppRef = useRef('')
  const pendingReminderTextRef = useRef('')
  const speechInterruptRef = useRef(false)
  const conversationHistoryRef = useRef([])
  const mountedRef = useRef(true)
  const timeoutsRef = useRef([])

  const setIsStoreListening = useAssistantStore(state => state.setIsListening)

  useEffect(() => {
    setIsStoreListening(isVisible)
    return () => {
      setIsStoreListening(false)
    }
  }, [isVisible, setIsStoreListening])

  const { speakTextNative, stopSpeakingNative, canvasRef, activeAudioRef, ttsResolvers } = useOfflineTTS({ isVisible, isAppActive, speechInterruptRef })

  // Keep ref in sync with state for use in finally blocks
  useEffect(() => { pendingContextRef.current = pendingContext }, [pendingContext])
  const isVisibleRef = useRef(isVisible)
  const appsListRef = useRef(appsList)

  useEffect(() => {
    appsListRef.current = appsList
  }, [appsList])

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
      LauncherPlugin.stopOfflineSpeech().catch(() => {})
    }
  }, [])

  useEffect(() => {
    isVisibleRef.current = isVisible

    if (!isVisible) {
      setIsProcessing(false)
      setIsListening(false)
      setStatusText('')
      setPendingContext(null)
      pendingSuggestionsRef.current = []
      pendingUninstallAppRef.current = ''
      pendingReminderTextRef.current = ''
      speechInterruptRef.current = true
      stopSpeakingNative()
      LauncherPlugin.stopOfflineSpeech().catch(() => {})
      window.__iris_offline_assistant_active = false
      return
    }

    window.__iris_offline_assistant_active = true
    speechInterruptRef.current = false
    startListening()

    const statusListener = LauncherPlugin.addListener('onSpeechStatus', (data) => {
      if (!mountedRef.current) return
      if (data.status === 'listening') {
        setStatusText('Listening...')
        setIsListening(true)
        setIsProcessing(false)
      } else if (data.status === 'processing') {
        setStatusText('Thinking...')
        setIsListening(false)
        setIsProcessing(true)
      }
    })

    const partialListener = LauncherPlugin.addListener('onSpeechPartial', (data) => {
      if (!mountedRef.current) return
      if (data.text) setStatusText(data.text)
    })

    return () => {
      const removeStatus = typeof statusListener?.then === 'function' ? statusListener.then(l => l.remove()) : statusListener?.remove?.()
      const removePartial = typeof partialListener?.then === 'function' ? partialListener.then(l => l.remove()) : partialListener?.remove?.()
    }
  }, [isVisible])

  useEffect(() => {
    if (onStateChange) onStateChange({ isListening, isProcessing })
  }, [isListening, isProcessing, onStateChange])

  const speechStartingRef = useRef(false)

  const fallbackWebSpeech = async () => {
    return new Promise((resolve) => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!SpeechRecognition) {
        resolve(null)
        return
      }
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
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript
            } else {
              interim += event.results[i][0].transcript
            }
          }
          const text = finalTranscript || interim
          if (text && mountedRef.current && isVisibleRef.current) {
            setStatusText(text)
          }
        }

        recog.onerror = (err) => {
          console.warn('[Iris WebSpeech Error]', err)
          setIsListening(false)
          setIsProcessing(false)
          resolve(null)
        }

        recog.onend = () => {
          setIsListening(false)
          if (finalTranscript.trim()) {
            resolve({ text: finalTranscript.trim() })
          } else {
            resolve(null)
          }
        }

        recog.start()
      } catch (e) {
        console.warn('[Iris WebSpeech start error]', e)
        resolve(null)
      }
    })
  }

  const startListening = async (retryCount = 0) => {
    // Reset guard if stale from a previous session that never completed
    if (speechStartingRef.current) {
      speechStartingRef.current = false
    }
    speechStartingRef.current = true
    // Safety timeout — unblock after 12s if startOfflineSpeech hangs
    const unguardTimer = setTimeout(() => { speechStartingRef.current = false }, 12000)
    try {
      // Always stop any previous session first
      try {
        await LauncherPlugin.stopOfflineSpeech()
        // Brief delay to let native recognizer fully release
        await new Promise(r => setTimeout(r, 150))
      } catch (_) {}
      
      try {
        const { checkAndRequestPermission } = await import('./LauncherPlugin')
        const micStatus = await checkAndRequestPermission('RECORD_AUDIO')
        if (micStatus && !micStatus.granted && micStatus.sdkRequired) {
          setStatusText('Microphone access required')
          setIsListening(false)
          setIsProcessing(false)
          return
        }
      } catch (_) {}

      setStatusText('Listening...')
      setIsListening(true)
      setIsProcessing(false)

      let result = null
      try {
        result = await LauncherPlugin.startOfflineSpeech()
      } catch (nativeErr) {
        console.warn('[Iris] Native startOfflineSpeech failed/rejected, attempting WebSpeech:', nativeErr)
        result = await fallbackWebSpeech()
      }

      clearTimeout(unguardTimer)
      if (result?.text) {
        await handleCommand(result.text)
      } else {
        if (retryCount < 1 && !speechInterruptRef.current && isVisibleRef.current) {
          setIsProcessing(false)
          setIsListening(false)
          const tid = setTimeout(() => {
              if (mountedRef.current && isVisibleRef.current) startListening(retryCount + 1)
          }, 150)
          timeoutsRef.current.push(tid)
        } else {
          setStatusText('I didn\'t catch that. Tap to try again.')
          setIsListening(false)
          setIsProcessing(false)
          LauncherPlugin.stopOfflineSpeech().catch(() => {})
        }
      }
    } catch (e) {
      clearTimeout(unguardTimer)
      console.error('[Iris] startListening error:', e)
      setIsProcessing(false)
      setIsListening(false)
      if (retryCount < 1 && !speechInterruptRef.current && isVisibleRef.current) {
        const tid = setTimeout(() => {
          if (mountedRef.current && isVisibleRef.current) {
            startListening(retryCount + 1)
          }
        }, 150)
        timeoutsRef.current.push(tid)
      } else {
        setStatusText('Tap to try again.')
        LauncherPlugin.stopOfflineSpeech().catch(() => {})
      }
    } finally {
      clearTimeout(unguardTimer)
      speechStartingRef.current = false
    }
  }

  const { handleCommand } = useOfflineAssistantCommand({
    pendingContext, setPendingContext,
    pendingContextRef, pendingSuggestionsRef, pendingUninstallAppRef,
    pendingReminderTextRef, speechInterruptRef, conversationHistoryRef,
    mountedRef, timeoutsRef, isVisibleRef,
    setStatusText, setIsProcessing,
    startListening, onClose,
    dispatchCommand, speakTextNative,
  })

  if (!isVisible) return null

  return (
    <div 
      className="fixed inset-0 z-40 pointer-events-auto"
      onClick={() => {
        if (typeof onClose === 'function') onClose()
      }}
    >
      <div onClick={(e) => e.stopPropagation()}>
        <AssistantStatusPanel
          statusText={statusText}
          isListening={isListening}
          isProcessing={isProcessing}
          onRetry={() => startListening(0)}
        />
      </div>
    </div>
  )
}
