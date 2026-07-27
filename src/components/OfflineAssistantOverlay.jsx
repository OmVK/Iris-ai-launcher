import React, { useEffect, useState, useRef } from 'react'
import { registerPlugin } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { LocalNotifications } from '@capacitor/local-notifications'
import { processCommand as _processCommand, initEngine } from '../utils/OfflineCommandEngine'
const processCommand = typeof _processCommand === 'function' ? _processCommand : async () => ({ success: false, response: 'Offline engine unavailable.' })
import IrisVisualizer from './IrisVisualizer'
import PowerSaveManager from '../utils/PowerSaveManager'
import { handleSideEffect } from '../utils/offlineSideEffects'
import useOfflineTTS from '../hooks/useOfflineTTS'
import useOfflineDispatch from '../hooks/useOfflineDispatch'
import AssistantStatusPanel from './AssistantStatusPanel'

const LauncherPlugin = registerPlugin('LauncherPlugin')
const launchApp = async (packageId, label) => {
  try {
    const { launchApp: nativeLaunch } = await import('./LauncherPlugin')
    return await nativeLaunch(packageId, label)
  } catch (e) {
    console.warn('[IRIS] launchApp failed:', e)
    throw e
  }
}

export default function OfflineAssistantOverlay({ isVisible, onClose, onOpen, showHomeOrb = true, appsList, onStateChange, isAppActive = true }) {
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
      return
    }

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
        await new Promise(r => setTimeout(r, 300))
      } catch (_) {}
      
      try {
        const { checkAndRequestPermission } = await import('./LauncherPlugin')
        const micStatus = await checkAndRequestPermission('RECORD_AUDIO')
        if (micStatus && !micStatus.granted && micStatus.sdkRequired) {
          setStatusText('Microphone access required')
          return
        }
      } catch (_) {}
      setStatusText('Starting...')
      setIsListening(false)
      setIsProcessing(true)
      const result = await LauncherPlugin.startOfflineSpeech()
      clearTimeout(unguardTimer)
      if (result?.text) {
        await handleCommand(result.text)
      } else {
        // No speech recognized — auto-retry up to 10 times to fight Soda timeout bug
        if (retryCount < 10 && !speechInterruptRef.current && isVisibleRef.current) {
          setIsProcessing(false)
          setIsListening(false)
          const tid = setTimeout(() => {
              if (mountedRef.current && isVisibleRef.current) startListening(retryCount + 1)
          }, 50)
          timeoutsRef.current.push(tid)
        } else {
          setStatusText('I didn\'t catch that. Tap to try again.')
          setIsListening(false)
        }
      }
    } catch (e) {
      clearTimeout(unguardTimer)
      console.error('[Iris] startListening error:', e)
      setIsProcessing(false)
      setIsListening(false)
      if (retryCount < 10 && !speechInterruptRef.current && isVisibleRef.current) {
        const tid = setTimeout(() => {
          if (mountedRef.current && isVisibleRef.current) {
            startListening(retryCount + 1)
          }
        }, 50)
        timeoutsRef.current.push(tid)
      } else {
        setStatusText('Tap to try again.')
      }
    } finally {
      clearTimeout(unguardTimer)
      speechStartingRef.current = false
    }
  }

  const handleCommand = async (text) => {
    setIsProcessing(true)
    let didClose = false
    let shouldKeepListening = false
    try {
      let result;

      // Cancel always works regardless of context
      if (/^(?:cancel|never\s*mind|nevermind|forget\s+it|scratch\s+that)$/i.test(text.trim())) {
        setPendingContext(null)
        pendingSuggestionsRef.current = []
        pendingUninstallAppRef.current = ''
        pendingReminderTextRef.current = ''
        result = { success: true, response: 'Cancelled.', keepListening: true }
      } else if (pendingContext === 'WAITING_FOR_NOTE_TEXT') {
        setPendingContext(null)
        result = {
          success: true,
          response: "Note saved.",
          sideEffects: [{ action: 'save_note', params: { text } }]
        }
      } else if (pendingContext === 'WAITING_FOR_REMINDER_TEXT') {
        setPendingContext(null)
        const reminderText = pendingReminderTextRef.current || text
        const durationMatch = text.match(/(\d+)\s+(minutes?|hours?|seconds?)/i)
        let val = 10, unit = 'minutes'
        if (durationMatch) {
          val = parseInt(durationMatch[1])
          unit = durationMatch[2]
        } else {
          val = 10
          unit = 'minutes'
        }
        pendingReminderTextRef.current = ''
        result = {
          success: true,
          response: `I will remind you to ${reminderText} in ${val} ${unit}.`,
          sideEffects: [{ action: 'remind', params: { task: reminderText, val, unit } }]
        }
      } else if (pendingContext === 'WAITING_FOR_UNINSTALL_CONFIRM') {
        setPendingContext(null)
        if (/^(?:yes|yep|yeah|confirm|do\s+it|go\s+ahead)$/i.test(text.trim())) {
          const app = pendingUninstallAppRef.current
          pendingUninstallAppRef.current = ''
          result = {
            success: true,
            commands: [{ action: 'uninstall', params: { app } }],
            response: `Uninstalling ${app}.`
          }
          didClose = true
        } else {
          pendingUninstallAppRef.current = ''
          result = { success: true, response: 'Uninstall cancelled.', keepListening: true }
        }
      } else if (pendingContext === 'WAITING_FOR_CLEAR_NOTES_CONFIRM') {
        setPendingContext(null)
        if (/^(?:yes|yep|yeah|confirm|do\s+it|go\s+ahead)$/i.test(text.trim())) {
          result = {
            success: true,
            sideEffects: [{ action: 'clear_notes' }],
            response: 'All notes cleared.'
          }
        } else {
          result = { success: true, response: 'Notes not cleared.', keepListening: true }
        }
      } else if (pendingContext === 'WAITING_FOR_APP_SELECTION') {
        setPendingContext(null)
        const num = parseInt(text.trim())
        const suggestions = pendingSuggestionsRef.current
        if (num >= 1 && num <= suggestions.length) {
          const selected = suggestions[num - 1]
          try {
            await launchApp(selected.packageId, selected.label)
            result = { success: true, response: `Opening ${selected.label}.` }
            didClose = true
          } catch (e) {
            result = { success: true, response: `I couldn't open ${selected.label}.` }
          }
        } else {
          result = { success: true, response: "Invalid selection. Please say 1, 2, or 3." }
          shouldKeepListening = true
        }
        pendingSuggestionsRef.current = []
      } else if (pendingContext === 'WAITING_FOR_CONTACT_SELECTION') {
        setPendingContext(null)
        const num = parseInt(text.trim())
        const suggestions = pendingSuggestionsRef.current
        if (num >= 1 && num <= suggestions.length) {
          const selected = suggestions[num - 1]
          try {
            await LauncherPlugin.makeCall({ number: selected.number, speaker: false })
            result = { success: true, response: `Calling ${selected.label}.` }
            didClose = true
          } catch (e) {
            try {
              await LauncherPlugin.dialNumber({ number: selected.number })
              result = { success: true, response: `Opening dialer for ${selected.label}.` }
              didClose = true
            } catch (e2) {
              result = { success: true, response: `I couldn't call ${selected.label}.` }
            }
          }
        } else {
          result = { success: true, response: "Invalid selection. Please say 1, 2, or 3." }
          shouldKeepListening = true
        }
        pendingSuggestionsRef.current = []
      } else {
        result = await processCommand(text)
        if (result.requireMoreContext) {
          setPendingContext(result.requireMoreContext)
          if (result.requireMoreContext === 'WAITING_FOR_UNINSTALL_CONFIRM') {
            pendingUninstallAppRef.current = result.uninstallApp || text.replace(/^uninstall\s+/i, '')
          }
          if (result.requireMoreContext === 'WAITING_FOR_REMINDER_TEXT') {
            pendingReminderTextRef.current = text
          }
        } else {
          setPendingContext(null)
        }
        if (result.keepListening) shouldKeepListening = true
      }

      // Conversation memory: track last 10 exchanges
      conversationHistoryRef.current.push({ role: 'user', text })
      if (result.response) {
        conversationHistoryRef.current.push({ role: 'assistant', text: result.response })
      }
      if (conversationHistoryRef.current.length > 20) {
        conversationHistoryRef.current = conversationHistoryRef.current.slice(-20)
      }

      if (!result.success) {
        setStatusText(result.response)
        shouldKeepListening = true
        if (!speechInterruptRef.current) await speakTextNative(result.response)
        return
      }

      let responseText = result.response

      // Handle side effects FIRST
      if (result.sideEffects) {
        for (const effect of result.sideEffects) {
          const effectText = await handleSideEffect(effect, { LauncherPlugin, handleWeather, handleNotifications })
          if (effectText !== undefined) responseText = effectText
        }
      }

      // Show response text immediately (no "Thinking..." delay for commands)
      setStatusText(responseText)

      // Execute system commands FIRST for instant response (open apps, calls, etc.)
      if (result.commands?.length > 0) {
        for (const cmd of result.commands) {
          const res = await dispatchCommand(cmd)
          if (res?.close) {
            didClose = true
          }
          if (res?.error) {
            setStatusText(res.error)
            responseText = res.error
            shouldKeepListening = true
          }
        }
      }

      // For action commands (open app, call, etc.), close overlay immediately — don't block on TTS
      if (didClose) {
        setStatusText(responseText)
        // Fire-and-forget TTS in background, don't await
        if (!speechInterruptRef.current && localStorage.getItem('assistant_tts_enabled') !== 'false') {
          speakTextNative(responseText).catch(() => {})
        }
        return
      }

      // THEN speak the response (only for info/conversational commands)
      if (!speechInterruptRef.current) {
        await speakTextNative(responseText, () => {
          setStatusText(responseText)
        })
      } else {
        setStatusText(responseText)
      }

    } catch (e) {
      console.error('[Iris] handleCommand error:', e)
      setStatusText('Something went wrong.')
      try { await speakTextNative('Something went wrong.') } catch (_) {}
    } finally {
      setIsProcessing(false)
      if (isVisibleRef.current) {
        if (pendingContextRef.current) {
          const tid = setTimeout(() => {
            if (mountedRef.current && isVisibleRef.current) {
              startListening()
            }
          }, 1500)
          timeoutsRef.current.push(tid)
        } else if (didClose) {
          if (typeof onClose === 'function') onClose()
        } else if (shouldKeepListening) {
          const tid = setTimeout(() => {
            if (mountedRef.current && isVisibleRef.current) {
              startListening()
            }
          }, 2000)
          timeoutsRef.current.push(tid)
        } else {
          const tid = setTimeout(() => {
            if (mountedRef.current && isVisibleRef.current) {
              if (typeof onClose === 'function') onClose()
            }
          }, 3000)
          timeoutsRef.current.push(tid)
        }
      }
    }
  }

  const handleWeather = async (city) => {
    if (!navigator.onLine) return 'I am offline and cannot check the weather.'
    try {
      let lat, lon, locName = city
      if (city && city !== 'local') {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`)
        const geoData = await geoRes.json()
        if (geoData.results?.length > 0) {
          lat = geoData.results[0].latitude
          lon = geoData.results[0].longitude
          locName = geoData.results[0].name
        } else return `Could not find ${city}.`
      } else {
        const { Geolocation } = await import('@capacitor/geolocation')
        const pos = await Geolocation.getCurrentPosition()
        lat = pos.coords.latitude
        lon = pos.coords.longitude
        locName = 'your area'
      }
      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`)
      const data = await weatherRes.json()
      if (data.current) {
        const codes = { 0: 'clear sky', 1: 'mainly clear', 2: 'partly cloudy', 3: 'overcast', 45: 'foggy', 51: 'light drizzle', 53: 'drizzle', 55: 'heavy drizzle', 61: 'slight rain', 63: 'moderate rain', 65: 'heavy rain', 71: 'snow', 73: 'moderate snow', 75: 'heavy snow', 80: 'rain showers', 95: 'thunderstorm' }
        return `${data.current.temperature_2m} degrees in ${locName}, ${codes[data.current.weather_code] || 'unknown conditions'}.`
      }
      return 'Could not get weather data.'
    } catch { return 'Weather service unavailable.' }
  }

  const handleNotifications = async () => {
    try {
      const res = await LauncherPlugin.getActiveNotifications()
      let notifications = []
      if (Array.isArray(res)) {
        notifications = res
      } else if (res?.notifications) {
        notifications = typeof res.notifications === 'string' ? JSON.parse(res.notifications) : res.notifications
      }
      if (notifications.length === 0) return 'No new notifications.'
      if (notifications.length === 1) return `1 notification from ${notifications[0].title || 'someone'}.`
      let msg = `${notifications.length} notifications. `
      for (let i = 0; i < Math.min(3, notifications.length); i++) msg += `${notifications[i].appName || 'app'}: ${notifications[i].title}. `
      return msg
    } catch {
      return 'Cannot access notifications.'
    }
  }

  return (
    <>
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center transition-all duration-500 pointer-events-none ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Backdrop */}
      <div className={`absolute inset-0 bg-transparent ${isVisible ? 'pointer-events-auto' : 'pointer-events-none'}`} onClick={() => onClose?.()} />

      {/* Content */}
      <AssistantStatusPanel
        statusText={statusText}
        canvasRef={canvasRef}
        isListening={isListening}
        isProcessing={isProcessing}
      />
    </div>

    {/* The Single Animated Orb that flies seamlessly across the screen */}
    {showHomeOrb && !PowerSaveManager.shouldDisable('orb') && (
      <div 
        className={`fixed inset-0 z-[110] pointer-events-none flex flex-col items-center ${
          isVisible ? 'justify-center pb-32' : 'justify-end pb-[96px]'
        }`}
      >
        <div 
          style={{ transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          className="pointer-events-auto cursor-pointer active:scale-95 flex items-center justify-center"
          onClick={(e) => {
          e.stopPropagation()
          if (!isVisible) {
            onOpen?.()
          } else {
            speechInterruptRef.current = false
            speechStartingRef.current = false
            stopSpeakingNative()
            LauncherPlugin.stopOfflineSpeech().catch(() => {})
            if (!isProcessing) startListening()
          }
        }}
      >
        <IrisVisualizer 
          size={isVisible ? 180 : 60}
          isProcessing={isProcessing}
          isListening={isListening}
          isAppActive={isAppActive}
        />
        </div>
      </div>
    )}
    </>
  )
}
