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
    let shouldKeepListening = true
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
      } else if (pendingContext === 'WAITING_FOR_REMINDER_TEXT') {
        setPendingContext(null)
        result = {
          success: true,
          response: `I'll remind you to ${text} in 15 minutes.`,
          sideEffects: [{ action: 'remind', params: { task: text, val: 15, unit: 'minutes' } }]
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
          const aiResponse = await queryIrisAI(query, (chunk) => setStatusText(chunk), conversationHistoryRef.current)
          result = { success: true, response: aiResponse }
          shouldKeepListening = true
        } catch (err) {
          result = { success: false, response: err.message || 'Could not connect to Iris AI.' }
        }
      } else {
        result = await processCommand(text)
        
        // If local engine didn't match a local hardware/app command, route through Iris AI brain with multi-turn history & web retrieval
        if (!result.commands?.length && !result.sideEffects?.length && !result.requireMoreContext && !result.response) {
          try {
            setStatusText('Thinking...')
            const aiResponse = await queryIrisAI(text.trim(), (chunk) => setStatusText(chunk), conversationHistoryRef.current)
            if (aiResponse) {
              result = { success: true, response: aiResponse }
              shouldKeepListening = true
            }
          } catch (err) {
            console.warn('[Iris AI query failed]', err)
            result = { success: true, response: err?.message || "I'm ready. What would you like to do?" }
          }
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

      // Maintain multi-turn conversational continuity (rolling memory buffer)
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
      if (result.sideEffects?.length > 0) {
        for (const effect of result.sideEffects) {
          const effectText = await handleSideEffect(effect, { LauncherPlugin, handleNotifications })
          if (effectText !== undefined) responseText = effectText
        }
      }

      // Show response text immediately
      setStatusText(responseText)

      // Execute system commands FIRST (open apps, calls, etc.)
      if (result.commands?.length > 0) {
        for (const cmd of result.commands) {
          const res = await dispatchCommand(cmd)
          if (res?.close || cmd.action === 'open' || cmd.action === 'call' || cmd.action === 'uninstall') {
            didClose = true
            shouldKeepListening = false
          }
          if (res?.error) {
            setStatusText(res.error)
            responseText = res.error
          }
        }
      }

      // Action commands (e.g. open app) close immediately
      if (didClose) {
        setStatusText(responseText)
        if (!speechInterruptRef.current && localStorage.getItem('assistant_tts_enabled') !== 'false') {
          speakTextNative(responseText).catch(() => {})
        }
        return
      }

      // Speak response aloud for conversation & AI queries
      if (!speechInterruptRef.current && responseText) {
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
          }, 300)
          timeoutsRef.current.push(tid)
        } else {
          const tid = setTimeout(() => {
            if (mountedRef.current && isVisibleRef.current && !pendingContextRef.current) {
              if (typeof onClose === 'function') onClose()
            }
          }, 3500)
          timeoutsRef.current.push(tid)
        }
      }
    }
  }, [pendingContext, setPendingContext, pendingContextRef, pendingSuggestionsRef, pendingUninstallAppRef, pendingReminderTextRef, speechInterruptRef, conversationHistoryRef, mountedRef, timeoutsRef, isVisibleRef, setStatusText, setIsProcessing, startListening, onClose, dispatchCommand, speakTextNative, handleNotifications])

  return { handleCommand }
}
