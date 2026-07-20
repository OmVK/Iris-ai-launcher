import { Preferences } from '@capacitor/preferences'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { LocalNotifications } from '@capacitor/local-notifications'
import { usePowerStore } from '../stores/powerStore'
import { useAppStore } from '../stores/appStore'

export async function handleSideEffect(effect, deps) {
  const { LauncherPlugin, handleWeather, handleNotifications } = deps
  let responseText = undefined

  switch (effect.action) {
    case 'battery_result':
      responseText = `Battery is at ${effect.params.level} percent.`
      break

    case 'check_battery_rive':
      try {
        const battInfo = await LauncherPlugin.getSystemInfo()
        responseText = `Battery is at ${battInfo.batteryLevel || 'unknown'} percent.`
      } catch (e) {
        responseText = 'Could not check battery.'
      }
      break

    case 'spoken_text':
      responseText = effect.params?.text || ''
      break

    case 'contact_result':
      responseText = effect.params.error
        ? `Could not find ${effect.params.name}.`
        : `${effect.params.name} is ${effect.params.number}.`
      break

    case 'weather':
      responseText = await handleWeather(effect.params.city)
      break

    case 'notifications':
      responseText = await handleNotifications()
      break

    case 'notes_result': {
      const notes = effect.params.notes
      if (!Array.isArray(notes)) { responseText = 'No notes saved.'; break }
      responseText = notes.length > 0
        ? `You have ${notes.length} notes. Latest: ${notes[notes.length - 1].text}`
        : 'No notes saved.'
      break
    }

    case 'check_ram':
      try {
        const info = await LauncherPlugin.getSystemInfo()
        const ramLeftMb = Math.round(info.memAvail / (1024 * 1024))
        responseText = `You have approximately ${ramLeftMb} megabytes of RAM available.`
      } catch (e) {
        responseText = "I couldn't check your RAM."
      }
      break

    case 'check_temp':
      try {
        const info = await LauncherPlugin.getSystemInfo()
        responseText = `Your battery temperature is ${info.batteryTemp} degrees Celsius.`
      } catch (e) {
        responseText = "I couldn't read the battery temperature."
      }
      break

    case 'optimize_memory':
      try {
        await LauncherPlugin.optimizeMemory()
        responseText = "Memory optimized."
      } catch (e) {
        responseText = "I couldn't optimize memory."
      }
      break

    case 'toggle_flashlight':
      try {
        const state = await LauncherPlugin.toggleFlashlight()
        responseText = state?.status ? 'Flashlight on.' : 'Flashlight off.'
      } catch (e) {
        responseText = "I couldn't toggle the flashlight."
      }
      break

    case 'set_brightness':
      try {
        const rawLevel = effect.params?.level ?? 50
        const level = Math.max(0, Math.min(255, Math.round(rawLevel)))
        await LauncherPlugin.setBrightness({ level })
        responseText = `Brightness set to ${level} percent.`
      } catch (e) {
        responseText = "I couldn't set the brightness."
      }
      break

    case 'set_volume':
      try {
        const dir = effect.params?.direction || 'up'
        await LauncherPlugin.setAudioVolume({ direction: dir })
        responseText = dir === 'mute' ? 'Muted.' : `Volume ${dir}.`
      } catch (e) {
        responseText = "I couldn't change the volume."
      }
      break

    case 'open_settings':
      try {
        const setting = effect.params?.setting || 'wifi'
        await LauncherPlugin.openSystemSettings({ setting })
        responseText = `Opening ${setting} settings.`
      } catch (e) {
        responseText = "I couldn't open settings."
      }
      break

    case 'timer':
      try {
        let secs = parseInt(effect.params?.duration) || 0
        if (effect.params?.unit?.startsWith('minute')) secs *= 60
        else if (effect.params?.unit?.startsWith('hour')) secs *= 3600
        await LauncherPlugin.setTimer({ seconds: secs })
        responseText = `Timer set for ${effect.params.duration} ${effect.params.unit}.`
      } catch (e) {
        responseText = "I couldn't set the timer."
      }
      break

    case 'sleep_mode':
      try {
        usePowerStore.getState().setPowerSaveMode('LOW')
        responseText = "Sleep mode activated. All visual effects disabled for maximum battery savings."
      } catch (e) {
        responseText = "I couldn't enable sleep mode."
      }
      break

    case 'driving_mode':
      try {
        usePowerStore.getState().setPowerSaveMode('MEDIUM')
        responseText = "Driving mode activated. Reduced visual effects for safety."
      } catch (e) {
        responseText = "I couldn't enable driving mode."
      }
      break

    case 'save_note':
      try {
        const current = await Preferences.get({ key: 'iris_notes' })
        const notes = current.value ? JSON.parse(current.value) : []
        notes.push({ text: effect.params.text, time: Date.now() })
        await Preferences.set({ key: 'iris_notes', value: JSON.stringify(notes) })
      } catch (e) {
        console.warn('[IRIS] Failed to save note:', e)
      }
      break

    case 'read_notes':
      try {
        const current = await Preferences.get({ key: 'iris_notes' })
        const notes = current.value ? JSON.parse(current.value) : []
        if (notes.length > 0) {
          responseText = `Your last note was: ${notes[notes.length - 1].text}`
        } else {
          responseText = "You don't have any saved notes."
        }
      } catch (e) {
        responseText = "I couldn't read your notes."
      }
      break

    case 'clear_notes':
      try {
        await Preferences.remove({ key: 'iris_notes' })
        responseText = "All notes have been cleared."
      } catch (e) {
        responseText = "I couldn't clear your notes."
      }
      break

    case 'delete_last_note':
      try {
        const current = await Preferences.get({ key: 'iris_notes' })
        const notes = current.value ? JSON.parse(current.value) : []
        if (notes.length > 0) {
          notes.pop()
          await Preferences.set({ key: 'iris_notes', value: JSON.stringify(notes) })
          responseText = "Your last note was deleted."
        } else {
          responseText = "You don't have any notes to delete."
        }
      } catch (e) {
        responseText = "I couldn't delete your note."
      }
      break

    case 'remind':
      try {
        let secs = effect.params.val
        if (effect.params.unit.startsWith('minute')) secs *= 60
        if (effect.params.unit.startsWith('hour')) secs *= 3600

        const triggerTime = new Date(Date.now() + secs * 1000)
        const hour = triggerTime.getHours()
        const minutes = triggerTime.getMinutes()

        await LocalNotifications.requestPermissions()
        await LocalNotifications.schedule({
          notifications: [
            {
              title: "Iris Reminder",
              body: effect.params.task,
              id: Date.now() + Math.floor(Math.random() * 10000),
              schedule: { at: triggerTime }
            }
          ]
        })

        try {
          await LauncherPlugin.setAlarm({ hour, minutes, message: effect.params.task })
        } catch (_) {}
      } catch (e) {
        responseText = "I couldn't set the reminder."
      }
      break

    case 'search_web':
      try {
        const q = effect.params?.query || ''
        if (q) {
          await LauncherPlugin.execCommand({ command: `am start -a android.intent.action.VIEW -d "https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}"` })
        }
        responseText = `Searching the web for "${q}".`
      } catch (e) {
        responseText = "I couldn't search for that."
      }
      break

    case 'stealth_capture':
      try {
        const cap = await LauncherPlugin.captureSilentPhotos()
        if (cap && (cap.front || cap.back)) {
          try {
            await Filesystem.mkdir({ path: 'silent_captures', directory: Directory.Data }).catch(() => {})
          } catch(e) {}
          const stamp = Date.now()
          if (cap.front) {
            const frontData = cap.front.replace(/^data:image\/\w+;base64,/, "")
            await Filesystem.writeFile({ path: `silent_captures/front_${stamp}.jpg`, data: frontData, directory: Directory.Data })
          }
          if (cap.back) {
            const backData = cap.back.replace(/^data:image\/\w+;base64,/, "")
            await Filesystem.writeFile({ path: `silent_captures/back_${stamp}.jpg`, data: backData, directory: Directory.Data })
          }
        }
      } catch (e) {
        console.error('[Iris] Stealth capture failed:', e)
      }
      break

    case 'clipboard_copy':
      try {
        const notes = await Preferences.get({ key: 'iris_notes' })
        const parsed = notes.value ? JSON.parse(notes.value) : []
        if (parsed.length > 0) {
          const last = parsed[parsed.length - 1].text
          await navigator.clipboard.writeText(last)
          responseText = 'Last note copied to clipboard.'
        } else {
          responseText = 'No notes to copy.'
        }
      } catch (e) {
        responseText = 'Could not access clipboard.'
      }
      break

    case 'clipboard_read':
      try {
        const text = await navigator.clipboard.readText()
        responseText = text ? `Clipboard says: ${text}` : 'Clipboard is empty.'
      } catch (e) {
        responseText = 'Could not read clipboard.'
      }
      break

    case 'switch_app':
      try {
        await LauncherPlugin.execCommand({ command: 'input keyevent KEYCODE_APP_SWITCH' })
      } catch (e) {
        responseText = 'Could not switch apps.'
      }
      break

    case 'recent_apps':
      try {
        await LauncherPlugin.execCommand({ command: 'input keyevent KEYCODE_APP_SWITCH' })
      } catch (e) {
        responseText = 'Could not open recent apps.'
      }
      break

    case 'media_control':
      try {
        const mediaAction = effect.params?.mediaAction || 'play'
        await LauncherPlugin.dispatchMediaKey({ action: mediaAction })
      } catch (e) {
        responseText = 'Could not control media.'
      }
      break

    case 'routine': {
      const routine = effect.params?.routine
      if (routine === 'morning') {
        try {
          const weatherRes = await handleWeather('local')
          const notesRaw = await Preferences.get({ key: 'iris_notes' })
          const notes = notesRaw.value ? JSON.parse(notesRaw.value) : []
          let msg = `Good morning. `
          if (weatherRes && !weatherRes.includes('offline')) msg += `Weather: ${weatherRes} `
          const now = new Date()
          msg += `It is ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. `
          if (notes.length > 0) msg += `You have ${notes.length} notes. `
          responseText = msg
        } catch (e) {
          responseText = 'Good morning.'
        }
      } else if (routine === 'leaving') {
        try {
          usePowerStore.getState().setPowerSaveMode('MEDIUM')
          responseText = 'Driving mode activated. Be safe.'
        } catch (e) {
          responseText = 'Could not activate leaving mode.'
        }
      } else if (routine === 'bedtime') {
        try {
          usePowerStore.getState().setPowerSaveMode('LOW')
          responseText = 'Sleep mode activated. Goodnight.'
        } catch (e) {
          responseText = 'Could not activate sleep mode.'
        }
      }
      break
    }
  }

  return responseText
}
