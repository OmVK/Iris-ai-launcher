import { registerPlugin, Capacitor } from '@capacitor/core'

// Register the custom native LauncherPlugin
const NativeLauncher = registerPlugin('LauncherPlugin')
const VpnBrowser = registerPlugin('IrisVpnBrowser')

export const isNative = Capacitor.isNativePlatform()

export function logNotification(tag, text, type = 'info') {
  try {
    const cached = localStorage.getItem('iris_system_notifications')
    const logs = cached ? JSON.parse(cached) : []
    const newLog = {
      id: Date.now() + Math.random(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      tag: tag.toUpperCase(),
      text,
      type
    }
    const updated = [newLog, ...logs].slice(0, 20)
    localStorage.setItem('iris_system_notifications', JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent('iris-notification-added', { detail: newLog }))
  } catch (e) {
    console.error("Failed to log notification:", e)
  }
}

// Use shared BUILTIN_APPS from constants.js

function downsampleIcon(iconDataUri) {
  return new Promise((resolve) => {
    try {
      if (!iconDataUri || !iconDataUri.startsWith('data:image/')) {
        resolve(iconDataUri)
        return
      }
      const img = new Image()
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = 128
          canvas.height = 128
          const ctx = canvas.getContext('2d')
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(img, 0, 0, 128, 128)
          resolve(canvas.toDataURL('image/png'))
        } catch {
          resolve(iconDataUri)
        }
      }
      img.onerror = () => resolve(iconDataUri)
      img.src = iconDataUri
    } catch {
      resolve(iconDataUri)
    }
  })
}

export async function getInstalledApps() {
  if (isNative) {
    try {
      const result = await NativeLauncher.getInstalledApps()
      if (result && result.apps) {
        const selfPkg = 'com.stitch.iris.launcher'
        const nativeMapped = await Promise.all(result.apps
          .filter(app => app.packageId !== selfPkg)
          .map(async (app) => ({
          id: app.packageId,
          packageId: app.packageId,
          label: app.label,
          icon: await downsampleIcon(app.icon || 'rocket_launch'),
          cat: app.category || 'COMMUNICATION',
          isHome: false,
          version: app.version || '1.0.0',
          permissions: app.permissions || 'STORAGE',
          storageSize: app.size || '12.4 MB'
        })))

        return nativeMapped
      }
      return []
    } catch (e) {
      console.error("Native Launcher getInstalledApps failed.", e)
      return []
    }
  } else {
    return []
  }
}

export async function launchApp(packageId, label = null) {
  const displayLabel = label || packageId

  if (isNative) {
    try {
      await NativeLauncher.launchApp({ packageId })
      logNotification('APP_LAUNCH', `Successfully booted: ${displayLabel}`, 'success')
      return true
    } catch (e) {
      console.error(`Native Launcher: Failed to boot app intent for ${packageId}`, e)
      logNotification('APP_LAUNCH', `Failed to boot intent: ${packageId}`, 'warning')
      return false
    }
  } else {
    logNotification('APP_LAUNCH', `Successfully booted: ${displayLabel}`, 'success')
    return true
  }
}

export async function uninstallApp(packageId, label = null) {
  const displayLabel = label || packageId
  logNotification('APP_UNINSTALL', `Initiated uninstallation for: ${displayLabel}`, 'warning')

  if (isNative) {
    try {
      await NativeLauncher.uninstallApp({ packageId })
      return true
    } catch (e) {
      console.error(`Native Launcher: Failed to request package uninstallation for ${packageId}`, e)
      return false
    }
  } else {
    return true
  }
}

export async function openAppSettings(packageId) {
  if (isNative) {
    try {
      await NativeLauncher.openAppSettings({ packageId })
      return true
    } catch (e) {
      console.error(`Native Launcher: Failed to open app settings for ${packageId}`, e)
      return false
    }
  } else {
    return false
  }
}

export async function requestDefaultLauncher() {
  if (isNative) {
    try {
      const result = await NativeLauncher.requestDefaultLauncher()
      return result || {}
    } catch (e) {
      console.error("Native Launcher: Failed requesting default home role settings.", e)
      return {}
    }
  } else {
    return { alreadyDefault: false }
  }
}

export async function setFullscreen(enable) {
  if (isNative) {
    try {
      await NativeLauncher.setFullscreen({ enable })
      return true
    } catch (e) {
      console.error("Native Launcher: setFullscreen failed.", e)
      return false
    }
  } else {
    return true
  }
}

let mockFlashlight = false
export async function toggleFlashlight() {
  if (isNative) {
    try {
      const result = await NativeLauncher.toggleFlashlight()
      logNotification('HARDWARE', `Flashlight transceiver updated: ${result.status ? 'ENGAGED' : 'TERMINATED'}`, result.status ? 'success' : 'info')
      return result || {}
    } catch (e) {
      console.error("Native Launcher: toggleFlashlight failed.", e)
      logNotification('HARDWARE', 'Flashlight hardware interface failed.', 'warning')
      return { status: false }
    }
  } else {
    mockFlashlight = !mockFlashlight
    logNotification('HARDWARE', `Flashlight simulated: ${mockFlashlight ? 'ENGAGED' : 'DEACTIVATED'}`, mockFlashlight ? 'success' : 'info')
    return { status: mockFlashlight }
  }
}

export async function makeCall(number) {
  logNotification('TELEPHONY', `Initiating dialer bridge for target node: ${number}`, 'info')
  if (isNative) {
    try {
      await NativeLauncher.makeCall({ number })
      return true
    } catch (e) {
      console.error(`Native Launcher: makeCall failed for number: ${number}`, e)
      logNotification('TELEPHONY', `Failed to route phone call to: ${number}`, 'warning')
      return false
    }
  } else {
    window.open(`tel:${number}`, '_blank')
    return true
  }
}

export async function setAlarm(hour, minutes, message = "IRIS AI Assistant") {
  logNotification('SYS_ALARM', `Scheduled alarm for ${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')} - "${message}"`, 'success')
  if (isNative) {
    try {
      await NativeLauncher.setAlarm({ hour, minutes, message })
      return true
    } catch (e) {
      console.error(`Native Launcher: setAlarm failed for time: ${hour}:${minutes}`, e)
      logNotification('SYS_ALARM', `Failed scheduling alarm for ${hour}:${minutes}`, 'warning')
      return false
    }
  } else {
    return true
  }
}

export async function speakTextNative(text) {
  if (isNative) {
    try {
      await NativeLauncher.speakText({ text })
      return true
    } catch (e) {
      console.error("Native TTS speak failed:", e)
      return false
    }
  }
  return new Promise((resolve) => {
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.onend = () => resolve(true)
        utterance.onerror = () => resolve(false)
        window.speechSynthesis.speak(utterance)
        setTimeout(() => resolve(true), Math.max(1200, text.length * 70))
      } else {
        setTimeout(() => resolve(true), 1000)
      }
    } catch (e) {
      console.warn('[IRIS] speakTextNative fallback warning:', e)
      resolve(false)
    }
  })
}


export async function speakCartesiaNative(text, voiceId, apiKey) {
  if (isNative) {
    try {
      return await NativeLauncher.speakCartesiaNative({ text, voiceId, apiKey })
    } catch (e) {
      console.error('Cartesia TTS failed:', e)
      throw e
    }
  }
}


export async function stopAudio() {
  if (isNative) {
    try {
      return await NativeLauncher.stopAudio()
    } catch (e) {
      console.error('Stop audio failed:', e)
    }
  }
}

export async function dispatchMediaKey(key = 'play_pause') {
  if (isNative) {
    try {
      await NativeLauncher.dispatchMediaKey({ key })
    } catch (e) {
      console.error('Failed to dispatch media key:', e)
    }
  }
}

export function addAudioFinishedListener(callback) {
  if (isNative) {
    return NativeLauncher.addListener('onAudioPlaybackFinished', callback)
  }
  // Return a no-op remover for web
  return { remove: () => {} }
}

export async function stopSpeakingNative() {
  if (isNative) {
    try {
      await NativeLauncher.stopSpeakingNative()
      return true
    } catch (e) {
      console.error("Native TTS stop failed", e)
      return false
    }
  } else {
    return true
  }
}

export async function setVoiceSettingsNative(pitch, rate, voiceTimbre = 'natural_female') {
  if (isNative) {
    try {
      await NativeLauncher.setVoiceSettings({ pitch, rate, voiceTimbre })
      return true
    } catch (e) {
      console.error("Native TTS setVoiceSettings failed", e)
      return false
    }
  } else {
    return true
  }
}


export async function getActiveNotifications() {
  if (isNative) {
    try {
      const res = await NativeLauncher.getActiveNotifications()
      if (res && res.notifications && typeof res.notifications === 'string') {
        return JSON.parse(res.notifications)
      }
      return []
    } catch (e) {
      console.error("Failed to get active notifications", e)
      return []
    }
  } else {
    return []
  }
}

export async function dismissNotification(key) {
  if (isNative) {
    try {
      await NativeLauncher.dismissNotification({ key })
      return true
    } catch (e) {
      console.error("Failed to dismiss notification", e)
      return false
    }
  }
  return true
}

export async function setVaultPackages(packages) {
  if (isNative) {
    try {
      await NativeLauncher.setVaultPackages({ packages })
    } catch (e) {
      console.error("Failed to set vault packages", e)
    }
  }
}

export function addNotificationListener(callback) {
  if (isNative) {
    return NativeLauncher.addListener('onNotificationUpdated', callback)
  }
  return { remove: () => {} }
}

export async function expandNotificationPanel() {
  if (isNative) {
    try {
      await NativeLauncher.expandNotificationPanel()
      return true
    } catch (e) {
      console.error("Failed to expand notification panel", e)
      return false
    }
  } else {
    return true
  }
}

export async function authenticateBiometric() {
  if (isNative) {
    try {
      if (NativeLauncher.authenticateBiometric) {
        const result = await NativeLauncher.authenticateBiometric()
        if (!result.success && result.error) {
          logNotification('BIOMETRIC_ERR', `Vault Biometric error: ${result.error}`, 'error')
        }
        return result
      } else {
        console.warn("authenticateBiometric not implemented in native bridge.")
        return { success: false, error: 'Not implemented' }
      }
    } catch (e) {
      console.error("Biometric prompt failed:", e)
      logNotification('BIOMETRIC_CRASH', e.message, 'error')
      return { success: false, error: e.message }
    }
  } else {
    // Web Simulation: Immediately return true for testing, or allow user to bypass
    const res = window.confirm("[Web Simulation] Iris Vault Biometric Authentication. Click OK to simulate fingerprint success, or Cancel to use PIN.")
    return { success: res }
  }
}

export async function requestStorageAccess() {
  if (isNative) {
    try {
      if (NativeLauncher.requestStorageAccess) {
        await NativeLauncher.requestStorageAccess()
        return true
      }
    } catch(e) {
      console.error("Native requestStorageAccess failed", e)
      return false
    }
  }
  return false
}

export async function getSystemStats() {
  if (isNative) {
    try {
      if (NativeLauncher.getSystemStats) {
        const stats = await NativeLauncher.getSystemStats()
        return stats
      }
    } catch(e) {
      console.error("Native getSystemStats failed", e)
    }
  }
  return { memTotal: 0, memUsed: 0, memAvailable: 0, cpuTemp: 35.0 }
}

export async function getDeviceOemInfo() {
  if (isNative) {
    try {
      const result = await NativeLauncher.getDeviceOemInfo()
      return result || { manufacturer: 'unknown', model: 'unknown', sdkVersion: 0 }
    } catch (e) {
      console.error("Failed to get device OEM info", e)
      return { manufacturer: 'unknown', model: 'unknown', sdkVersion: 0 }
    }
  }
  return { manufacturer: 'google', model: 'Web Browser', sdkVersion: 34 }
}

export async function requestIgnoreBatteryOptimizations() {
  if (isNative) {
    try {
      const result = await NativeLauncher.requestIgnoreBatteryOptimizations()
      return result || { prompted: false }
    } catch (e) {
      console.error("Failed to request battery optimization exemption", e)
      return { prompted: false }
    }
  }
  return { prompted: false, alreadyIgnoring: true }
}

export async function openOemBatterySettings(manufacturer) {
  if (isNative) {
    try {
      await NativeLauncher.openOemBatterySettings({ manufacturer })
      return true
    } catch (e) {
      console.error("Failed to open OEM battery settings", e)
      return false
    }
  }
  return true
}

export async function checkAndRequestPermission(permission) {
  if (isNative) {
    try {
      const result = await NativeLauncher.checkAndRequestPermission({ permission })
      return result || { granted: false, sdkRequired: false, message: 'Unknown' }
    } catch (e) {
      console.error(`Failed to check/request permission: ${permission}`, e)
      return { granted: false, sdkRequired: true, message: e.message }
    }
  }
  return { granted: true, sdkRequired: false, message: `${permission} auto-granted (web simulation)` }
}

export async function batchCheckPermissions(permissions) {
  if (isNative) {
    try {
      const result = await NativeLauncher.batchCheckPermissions({ permissions })
      return result?.results || []
    } catch (e) {
      console.error('Batch permission check failed:', e)
      return permissions.map(p => ({ permission: p, granted: false }))
    }
  }
  return permissions.map(p => ({ permission: p, granted: true }))
}

export async function batchRequestPermissions(permissions) {
  if (isNative) {
    try {
      const result = await NativeLauncher.batchRequestPermissions({ permissions })
      return result || { results: [], requested: 0 }
    } catch (e) {
      console.error('Batch permission request failed:', e)
      return { results: [], requested: 0 }
    }
  }
  return { results: permissions.map(p => ({ permission: p, granted: true })), requested: 0 }
}

export async function openPermissionSettings(permission) {
  if (isNative) {
    try {
      await NativeLauncher.openPermissionSettings({ permission })
    } catch (e) {
      console.error('Failed to open permission settings:', e)
    }
  }
}

export async function getPermissionStatusSummary() {
  if (isNative) {
    try {
      return await NativeLauncher.getPermissionStatusSummary()
    } catch (e) {
      console.error('Failed to get permission summary:', e)
      return { permissions: {}, granted: 0, total: 0 }
    }
  }
  return { permissions: {}, granted: 0, total: 0 }
}

export async function isAccessibilityServiceEnabled() {
  if (isNative) {
    try {
      const result = await NativeLauncher.isAccessibilityServiceEnabled()
      return result?.enabled || false
    } catch (e) {
      return false
    }
  }
  return false
}

export async function isUsageStatsEnabled() {
  if (isNative) {
    try {
      const result = await NativeLauncher.isUsageStatsEnabled()
      return result?.enabled || false
    } catch (e) {
      return false
    }
  }
  return false
}

export async function performGlobalAction(action) {
  if (isNative) {
    try {
      const result = await NativeLauncher.performGlobalAction({ action })
      return result?.performed || false
    } catch (e) {
      console.error('Failed to perform global action:', e)
      return false
    }
  }
  return false
}


export function addPackageChangeListener(callback) {
  if (isNative) {
    return NativeLauncher.addListener('onPackageChanged', callback)
  }
  return { remove: () => {} }
}

export async function restartKeepAlive() {
  if (isNative) {
    try {
      await NativeLauncher.restartKeepAlive()
    } catch (e) {
      console.error('Failed to restart keep-alive service:', e)
    }
  }
}

export async function execCommand(command) {
  if (isNative) {
    try {
      const result = await NativeLauncher.execCommand({ command })
      return result || { output: '', error: '', exitCode: 0 }
    } catch (e) {
      return { output: '', error: e.message, exitCode: 1 }
    }
  }
  return { output: '[Web] Shell commands not available in browser', error: '', exitCode: 1 }
}

export async function getSystemInfo() {
  if (isNative) {
    try {
      return await NativeLauncher.getSystemInfo()
    } catch (e) {
      console.error('Failed to get system info:', e)
      return null
    }
  }
  return null
}

export async function getSystemWallpaper() {
  if (isNative) {
    try {
      return await NativeLauncher.getSystemWallpaper()
    } catch (e) {
      console.error('Failed to get system wallpaper:', e)
      return null
    }
  }
  return null
}


// ─── VPN Browser ─────────────────────────────────────────
export async function startVpnBrowser(url = 'https://search.censys.io') {
  if (isNative) {
    try {
      return await VpnBrowser.startVpnBrowser({ url })
    } catch (e) {
      console.error('Failed to start VPN browser:', e)
      return { status: 'error', error: e.message }
    }
  }
  return { status: 'web_unsupported' }
}

export async function stopVpnBrowser() {
  if (isNative) {
    try {
      return await VpnBrowser.stopVpnBrowser()
    } catch (e) {
      console.error('Failed to stop VPN browser:', e)
      return { status: 'error' }
    }
  }
  return { status: 'web_unsupported' }
}



export async function lookupContactMultiple(name) {
  if (isNative) {
    try {
      if (NativeLauncher.lookupContactMultiple) {
        const result = await NativeLauncher.lookupContactMultiple({ name })
        if (result && result.contacts) {
          return JSON.parse(result.contacts)
        }
      }
    } catch (e) {
      console.error('Failed to lookup multiple contacts:', e)
    }
  }
  return []
}

export async function sendSMS(number, message = '') {
  if (isNative) {
    try {
      if (NativeLauncher.sendSMS) {
        await NativeLauncher.sendSMS({ number, message })
        return true
      }
    } catch (e) {
      console.error('Failed to send SMS:', e)
    }
  } else {
    window.open(`sms:${number}?body=${encodeURIComponent(message)}`, '_blank')
    return true
  }
  return false
}

export async function getInstalledIconPacks() {
  if (!isNative) return []
  try {
    const res = await NativeLauncher.getInstalledIconPacks()
    return res?.iconPacks || []
  } catch {
    return []
  }
}

export async function loadIconPackFilter(packageName) {
  if (!isNative) return {}
  try {
    const res = await NativeLauncher.loadIconPackFilter({ packageName })
    return res?.iconMap || {}
  } catch {
    return {}
  }
}

// ─── Native Security & Cybersecurity Tools ───────────────
export async function listProcesses(sort = 'cpu') {
  if (!isNative) return { processes: [], count: 0 }
  try {
    return await NativeLauncher.listProcesses({ sort })
  } catch (e) {
    console.error('Failed to list processes:', e)
    return { processes: [], count: 0, error: e.message }
  }
}

export async function portScan(host, startPort = 1, endPort = 1024, timeout = 1500) {
  if (!isNative) return { host, openPorts: [], totalScanned: 0 }
  try {
    return await NativeLauncher.portScan({ host, startPort, endPort, timeout })
  } catch (e) {
    console.error('Failed to run port scan:', e)
    return { host, openPorts: [], error: e.message }
  }
}

export async function dnsLookup(host) {
  if (!isNative) return { host, records: [] }
  try {
    return await NativeLauncher.dnsLookup({ host })
  } catch (e) {
    console.error('Failed to perform DNS lookup:', e)
    return { host, records: [], error: e.message }
  }
}

export async function whoisLookup(domain) {
  if (!isNative) return { domain, raw: '' }
  try {
    return await NativeLauncher.whoisLookup({ domain })
  } catch (e) {
    console.error('Failed to run WHOIS lookup:', e)
    return { domain, raw: '', error: e.message }
  }
}

export async function traceroute(host, maxHops = 15, timeout = 3000) {
  if (!isNative) return { host, hops: [] }
  try {
    return await NativeLauncher.traceroute({ host, maxHops, timeout })
  } catch (e) {
    console.error('Failed to execute traceroute:', e)
    return { host, hops: [], error: e.message }
  }
}

export async function sqlmapCheck(url) {
  if (!isNative) return { url, vulnerable: false, vulnerabilities: [] }
  try {
    return await NativeLauncher.sqlmapCheck({ url })
  } catch (e) {
    console.error('Failed to run SQL vulnerability check:', e)
    return { url, vulnerable: false, error: e.message }
  }
}

// ─── Audio & Model Downloading ───────────────────────────
export async function playAudioBase64(data) {
  if (!isNative) return false
  try {
    await NativeLauncher.playAudioBase64({ data })
    return true
  } catch (e) {
    console.error('Failed to play base64 audio:', e)
    return false
  }
}

export async function playAudioFile(path) {
  if (!isNative) return false
  try {
    await NativeLauncher.playAudioFile({ path })
    return true
  } catch (e) {
    console.error('Failed to play audio file:', e)
    return false
  }
}

export async function downloadModel(url, filename) {
  if (!isNative) return false
  try {
    return await NativeLauncher.downloadModel({ url, filename })
  } catch (e) {
    console.error('Failed to download model:', e)
    return { success: false, error: e.message }
  }
}

// ─── Native Hardware & System Controls ───────────────────
export async function getInstalledAppsCount() {
  if (!isNative) return 0
  try {
    const res = await NativeLauncher.getInstalledAppsCount()
    return res?.count || 0
  } catch {
    return 0
  }
}

export async function setFlashlight(enable = true) {
  if (!isNative) return false
  try {
    await NativeLauncher.setFlashlight({ enable })
    return true
  } catch {
    return false
  }
}

export async function openSystemSettings(type = 'main') {
  if (!isNative) return false
  try {
    await NativeLauncher.openSystemSettings({ type })
    return true
  } catch {
    return false
  }
}

export async function setSoundMode(mode = 'normal') {
  if (!isNative) return false
  try {
    await NativeLauncher.setSoundMode({ mode })
    return true
  } catch {
    return false
  }
}

export async function dialNumber(number) {
  if (!isNative) return false
  try {
    await NativeLauncher.dialNumber({ number })
    return true
  } catch {
    return false
  }
}

export async function setTimer(seconds, label = 'Timer') {
  if (!isNative) return false
  try {
    await NativeLauncher.setTimer({ seconds, label })
    return true
  } catch {
    return false
  }
}

export async function openAppInfo(packageId) {
  if (!isNative) return false
  try {
    await NativeLauncher.openAppInfo({ packageId })
    return true
  } catch {
    return false
  }
}

export async function optimizeMemory() {
  if (!isNative) return { freedMb: 0 }
  try {
    return await NativeLauncher.optimizeMemory()
  } catch {
    return { freedMb: 0 }
  }
}

export async function setDoNotDisturb(enable = true) {
  if (!isNative) return false
  try {
    await NativeLauncher.setDoNotDisturb({ enable })
    return true
  } catch {
    return false
  }
}

export async function openCamera() {
  if (!isNative) return false
  try {
    await NativeLauncher.openCamera()
    return true
  } catch {
    return false
  }
}

export async function captureSilentPhotos(count = 1) {
  if (!isNative) return { photos: [] }
  try {
    return await NativeLauncher.captureSilentPhotos({ count })
  } catch {
    return { photos: [] }
  }
}

export async function startScreenShare() {
  if (!isNative) return false
  try {
    await NativeLauncher.startScreenShare()
    return true
  } catch {
    return false
  }
}

export async function stopScreenShare() {
  if (!isNative) return false
  try {
    await NativeLauncher.stopScreenShare()
    return true
  } catch {
    return false
  }
}

export async function updateOverlayText(text) {
  if (!isNative) return false
  try {
    await NativeLauncher.updateOverlayText({ text })
    return true
  } catch {
    return false
  }
}

export async function toggleDND(enable = true) {
  if (!isNative) return false
  try {
    await NativeLauncher.toggleDND({ enable })
    return true
  } catch {
    return false
  }
}

export async function setBrightness(level = 50) {
  if (!isNative) return false
  try {
    await NativeLauncher.setBrightness({ level })
    return true
  } catch {
    return false
  }
}

export async function getBatteryLevel() {
  if (!isNative) return 100
  try {
    const res = await NativeLauncher.getBatteryLevel()
    return res?.level ?? 100
  } catch {
    return 100
  }
}

export async function setAudioVolume(direction = 'up') {
  if (!isNative) return false
  try {
    await NativeLauncher.setAudioVolume({ direction })
    return true
  } catch {
    return false
  }
}

export async function sendMessage(app = 'whatsapp', text = '') {
  if (!isNative) return false
  try {
    await NativeLauncher.sendMessage({ app, text })
    return true
  } catch {
    return false
  }
}

export async function requestNotificationAccess() {
  if (!isNative) return false
  try {
    await NativeLauncher.requestNotificationAccess()
    return true
  } catch {
    return false
  }
}

export async function startOfflineSpeech() {
  if (!isNative) return false
  try {
    await NativeLauncher.startOfflineSpeech()
    return true
  } catch {
    return false
  }
}

export async function stopOfflineSpeech() {
  if (!isNative) return false
  try {
    await NativeLauncher.stopOfflineSpeech()
    return true
  } catch {
    return false
  }
}

export async function resolveWithPartial(text) {
  if (!isNative) return false
  try {
    await NativeLauncher.resolveWithPartial({ text })
    return true
  } catch {
    return false
  }
}

export async function executeSystemAction(action, param = '', speaker = false) {
  if (!isNative) return false
  try {
    await NativeLauncher.executeSystemAction({ action, param, speaker })
    return true
  } catch {
    return false
  }
}

