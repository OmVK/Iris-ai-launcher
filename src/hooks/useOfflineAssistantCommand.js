import { useCallback } from 'react'
import { registerPlugin } from '@capacitor/core'
import { processCommand } from '../utils/OfflineCommandEngine'
import { handleSideEffect } from '../utils/offlineSideEffects'
import { queryIrisAI } from '../utils/aiQueryBridge'

const LauncherPlugin = registerPlugin('LauncherPlugin')

const launchApp = async (packageId, label) => {
  try {
    const { launchApp: nativeLaunch } = await import('../components/LauncherPlugin')
    return await nativeLaunch(packageId, label)
  } catch (e) {
    console.warn('[IRIS] launchApp failed:', e)
    throw e
  }
}

export default function useOfflineAssistantCommand({
  pendingContext, setPendingContext,
  pendingContextRef, pendingSuggestionsRef, pendingUninstallAppRef,
  pendingReminderTextRef, speechInterruptRef, conversationHistoryRef,
  mountedRef, timeoutsRef, isVisibleRef,
  setStatusText, setIsProcessing,
  startListening, onClose,
  dispatchCommand, speakTextNative,
}) {
  const handleWeather = useCallback(async (city) => {
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
  }, [])

  const handleNotifications = useCallback(async () => {
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
  }, [])

  const handleCommand = useCallback(async (text) => {
    setIsProcessing(true)
    let didClose = false
    let shouldKeepListening = false
    try {
      let result;

      // Cancel and exit commands close the overlay loop immediately
      if (/^(?:cancel|never\s*mind|nevermind|forget\s+it|scratch\s+that|exit|close|stop|bye|goodbye)$/i.test(text.trim())) {
        setPendingContext(null)
        pendingSuggestionsRef.current = []
        pendingUninstallAppRef.current = ''
        pendingReminderTextRef.current = ''
        result = { success: true, response: 'Goodbye.' }
        didClose = true
        shouldKeepListening = false
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
          shouldKeepListening = false
        } else {
          pendingUninstallAppRef.current = ''
          result = { success: true, response: 'Uninstall cancelled.' }
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
          result = { success: true, response: 'Notes not cleared.' }
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
            shouldKeepListening = false
          } catch (e) {
            result = { success: true, response: `I couldn't open ${selected.label}.` }
          }
        } else {
          result = { success: true, response: "Invalid selection. Please say 1, 2, or 3." }
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
            shouldKeepListening = false
          } catch (e) {
            try {
              await LauncherPlugin.dialNumber({ number: selected.number })
              result = { success: true, response: `Opening dialer for ${selected.label}.` }
              didClose = true
              shouldKeepListening = false
            } catch (e2) {
              result = { success: true, response: `I couldn't call ${selected.label}.` }
            }
          }
        } else {
          result = { success: true, response: "Invalid selection. Please say 1, 2, or 3." }
        }
        pendingSuggestionsRef.current = []
      } else if (/^(?:iris|hey\s+iris|hi\s+iris|ok\s+iris|hello\s+iris|ask\s+iris|ai|hey\s+ai|hi\s+ai|ok\s+ai|ask\s+ai|ask)\s+(.+)$/i.test(text.trim())) {
        const query = text.trim().replace(/^(?:iris|hey\s+iris|hi\s+iris|ok\s+iris|hello\s+iris|ask\s+iris|ai|hey\s+ai|hi\s+ai|ok\s+ai|ask\s+ai|ask)\s+/i, '')
        setStatusText('Connecting to Iris AI...')
        try {
          const aiResponse = await queryIrisAI(query, (chunk) => setStatusText(chunk))
          result = { success: true, response: aiResponse }
        } catch (err) {
          result = { success: false, response: err.message || 'Could not connect to Iris AI.' }
        }
      } else {
        result = await processCommand(text)
        // If local engine didn't match a hardware/app command, fallback to Iris AI seamlessly if available
        if (!result.commands?.length && !result.sideEffects?.length && text.trim().length > 6) {
          try {
            const aiResponse = await queryIrisAI(text.trim(), (chunk) => setStatusText(chunk))
            if (aiResponse) {
              result = { success: true, response: aiResponse }
            }
          } catch (_) {}
        }
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

      // Execute system commands FIRST for instant response (open apps, calls, search, etc.)
      if (result.commands?.length > 0) {
        for (const cmd of result.commands) {
          const res = await dispatchCommand(cmd)
          if (res?.close || cmd.action === 'open' || cmd.action === 'call' || cmd.action === 'search' || cmd.action === 'uninstall') {
            didClose = true
            shouldKeepListening = false
          }
          if (res?.error) {
            setStatusText(res.error)
            responseText = res.error
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

      // THEN speak the response (for conversational commands)
      if (!speechInterruptRef.current) {
        await speakTextNative(responseText, () => {
          setStatusText(responseText)
        })
      } else {
        setStatusText(responseText)
      }

    } catch (e) {
      console.error('[Iris] handleCommand error:', e)
      setStatusText("I'm listening...")
      shouldKeepListening = true
    } finally {
      setIsProcessing(false)
      if (isVisibleRef.current) {
        if (pendingContextRef.current) {
          const tid = setTimeout(() => {
            if (mountedRef.current && isVisibleRef.current) {
              startListening()
            }
          }, 300)
          timeoutsRef.current.push(tid)
        } else if (didClose) {
          if (typeof onClose === 'function') onClose()
        } else if (shouldKeepListening) {
          const tid = setTimeout(() => {
            if (mountedRef.current && isVisibleRef.current) {
              startListening()
            }
          }, 200)
          timeoutsRef.current.push(tid)
        } else {
          const tid = setTimeout(() => {
            if (mountedRef.current && isVisibleRef.current && !pendingContextRef.current) {
              if (typeof onClose === 'function') onClose()
            }
          }, 2500)
          timeoutsRef.current.push(tid)
        }
      }
    }
  }, [pendingContext, setPendingContext, pendingContextRef, pendingSuggestionsRef, pendingUninstallAppRef, pendingReminderTextRef, speechInterruptRef, conversationHistoryRef, mountedRef, timeoutsRef, isVisibleRef, setStatusText, setIsProcessing, startListening, onClose, dispatchCommand, speakTextNative, handleWeather, handleNotifications])

  return { handleCommand }
}
