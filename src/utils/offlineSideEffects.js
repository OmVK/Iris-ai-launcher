import { Filesystem, Directory } from '@capacitor/filesystem'
import { LocalNotifications } from '@capacitor/local-notifications'
import { usePowerStore } from '../stores/powerStore'

export async function handleSideEffect(effect, deps) {
  const { LauncherPlugin, handleNotifications } = deps
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

    case 'notifications':
      if (handleNotifications) responseText = await handleNotifications()
      break

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
        responseText = "Sleep mode activated. Visual effects disabled for maximum battery savings."
      } catch (e) {
        responseText = "I couldn't enable sleep mode."
      }
      break

    case 'driving_mode':
      try {
        usePowerStore.getState().setPowerSaveMode('MEDIUM')
        responseText = "Driving mode activated."
      } catch (e) {
        responseText = "I couldn't enable driving mode."
      }
      break

    case 'remind':
      try {
        let secs = effect.params.val
        if (effect.params.unit?.startsWith('minute')) secs *= 60
        if (effect.params.unit?.startsWith('hour')) secs *= 3600

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

    case 'stealth_photo':
      try {
        const facing = effect.params?.facing || 'back'
        const cap = await LauncherPlugin.captureSilentPhoto({ facing })
        if (cap?.image) {
          try {
            await Filesystem.mkdir({ path: 'silent_captures', directory: Directory.Data }).catch(() => {})
          } catch(e) {}
          const stamp = Date.now()
          const cleanBase64 = cap.image.replace(/^data:image\/[a-z]+;base64,/, '')
          await Filesystem.writeFile({
            path: `silent_captures/vault_photo_${facing}_${stamp}.jpg`,
            data: cleanBase64,
            directory: Directory.Data
          }).catch(() => {})
        }
      } catch (e) {
        console.warn('[IRIS] Stealth photo failed:', e)
      }
      break

    case 'stealth_video':
      try {
        const facing = effect.params?.facing || 'back'
        const duration = parseInt(effect.params?.duration) || 30
        await LauncherPlugin.recordSilentVideo({ facing, duration })
      } catch (e) {
        console.warn('[IRIS] Stealth video failed:', e)
      }
      break

    case 'stealth_audio':
      try {
        const duration = parseInt(effect.params?.duration) || 30
        await LauncherPlugin.recordSilentAudio({ duration })
      } catch (e) {
        console.warn('[IRIS] Stealth audio failed:', e)
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
            const cleanFront = cap.front.replace(/^data:image\/[a-z]+;base64,/, '')
            await Filesystem.writeFile({
              path: `silent_captures/threat_front_${stamp}.jpg`,
              data: cleanFront,
              directory: Directory.Data
            }).catch(() => {})
          }
          if (cap.back) {
            const cleanBack = cap.back.replace(/^data:image\/[a-z]+;base64,/, '')
            await Filesystem.writeFile({
              path: `silent_captures/threat_back_${stamp}.jpg`,
              data: cleanBack,
              directory: Directory.Data
            }).catch(() => {})
          }
        }
      } catch (e) {
        console.warn('[IRIS] Stealth capture failed:', e)
      }
      break

    default:
      break
  }

  return responseText
}
