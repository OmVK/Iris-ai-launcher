import { isNative, NativeLauncher } from '../components/LauncherPlugin'

const PERMISSION_RATIONALES = {
  SET_WALLPAPER: 'IRIS needs wallpaper permission to set and manage your home screen background.',
  QUERY_ALL_PACKAGES: 'IRIS needs to list all installed apps for the app drawer.',
  REQUEST_INSTALL_PACKAGES: 'IRIS needs install permission to sideload updates when requested.',
  RECEIVE_BOOT_COMPLETED: 'IRIS starts automatically on boot to remain your default launcher.',
  BIND_ACCESSIBILITY_SERVICE: 'IRIS uses accessibility services for gesture navigation and app usage tracking.',
  PACKAGE_USAGE_STATS: 'IRIS uses usage data to sort apps by frequency.',
  READ_CONTACTS: 'IRIS shows your contacts for quick dial and pinned contacts.',
  CAMERA: 'IRIS uses the camera for silent threat capture and icon scanning.',
  RECORD_AUDIO: 'IRIS uses the microphone for voice commands and live conversation.',
  ACCESS_FINE_LOCATION: 'IRIS uses GPS for weather data and location-aware widgets.',
  ACCESS_COARSE_LOCATION: 'IRIS uses approximate location for weather and local services.',
  READ_EXTERNAL_STORAGE: 'IRIS reads storage for custom wallpapers and icon packs.',
  READ_MEDIA_IMAGES: 'IRIS reads your photos for wallpaper import on Android 13+.',
  POST_NOTIFICATIONS: 'IRIS sends notifications for task reminders and alerts.',
  WRITE_SETTINGS: 'IRIS adjusts screen brightness and system settings.',
  SYSTEM_ALERT_WINDOW: 'IRIS uses overlay for the floating recents panel.',
  ACCESS_NOTIFICATION_POLICY: 'IRIS integrates with Do Not Disturb for silent hours.',
  USE_BIOMETRIC: 'IRIS uses biometric authentication for app lock and vault.',
  VIBRATE: 'IRIS uses vibration for haptic feedback on gestures and taps.',
  CHANGE_NETWORK_STATE: 'IRIS toggles network settings from the quick settings panel.',
}

const CORE_PERMISSIONS = [
  'CAMERA',
  'RECORD_AUDIO',
  'ACCESS_FINE_LOCATION',
  'ACCESS_COARSE_LOCATION',
  'READ_CONTACTS',
  'POST_NOTIFICATIONS',
  'USE_BIOMETRIC',
]

const OPTIONAL_PERMISSIONS = [
  'READ_EXTERNAL_STORAGE',
  'READ_MEDIA_IMAGES',
  'VIBRATE',
  'CHANGE_NETWORK_STATE',
  'WRITE_SETTINGS',
  'SYSTEM_ALERT_WINDOW',
  'ACCESS_NOTIFICATION_POLICY',
  'PACKAGE_USAGE_STATS',
  'BIND_ACCESSIBILITY_SERVICE',
  'SET_WALLPAPER',
  'REQUEST_INSTALL_PACKAGES',
]

const DENIED_PERMISSIONS_KEY = 'iris_denied_permissions'
const PERMISSION_ASKED_KEY = 'iris_permissions_asked'

let _cachedSummary = null
let cacheTimeout = null

function getDeniedPermissions() {
  try {
    const raw = localStorage.getItem(DENIED_PERMISSIONS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function setPermissionDenied(permission) {
  const denied = getDeniedPermissions()
  denied[permission] = Date.now()
  localStorage.setItem(DENIED_PERMISSIONS_KEY, JSON.stringify(denied))
}

function clearPermissionDenied(permission) {
  const denied = getDeniedPermissions()
  delete denied[permission]
  localStorage.setItem(DENIED_PERMISSIONS_KEY, JSON.stringify(denied))
}

function wasAlreadyAsked(permission) {
  try {
    const raw = localStorage.getItem(PERMISSION_ASKED_KEY)
    const asked = raw ? JSON.parse(raw) : {}
    return !!asked[permission]
  } catch {
    return false
  }
}

function markAsAsked(permission) {
  try {
    const raw = localStorage.getItem(PERMISSION_ASKED_KEY)
    const asked = raw ? JSON.parse(raw) : {}
    asked[permission] = Date.now()
    localStorage.setItem(PERMISSION_ASKED_KEY, JSON.stringify(asked))
  } catch {
    // Ignore
  }
}

export function isCorePermission(permission) {
  return CORE_PERMISSIONS.includes(permission)
}

function isPermanentlyDenied(permission) {
  const denied = getDeniedPermissions()
  if (!denied[permission]) return false
  const elapsed = Date.now() - denied[permission]
  return elapsed > 300000
}

function getRationale(permission) {
  return PERMISSION_RATIONALES[permission] || 'This permission is required for IRIS functionality.'
}

export function getCorePermissions() {
  return [...CORE_PERMISSIONS]
}

export function getOptionalPermissions() {
  return [...OPTIONAL_PERMISSIONS]
}

function getAllPermissions() {
  return [...CORE_PERMISSIONS, ...OPTIONAL_PERMISSIONS]
}

export async function checkPermission(permission) {
  if (!isNative) {
    return { granted: true, sdkRequired: false, message: 'Web simulation' }
  }

  try {
    const result = await NativeLauncher.checkAndRequestPermission({ permission })
    return result || { granted: false, sdkRequired: false, message: 'Unknown' }
  } catch (e) {
    console.error(`Permission check failed for ${permission}:`, e)
    return { granted: false, sdkRequired: false, message: e.message }
  }
}

export async function requestPermission(permission) {
  if (!isNative) {
    return { granted: true, sdkRequired: false, message: 'Web simulation' }
  }

  if (wasAlreadyAsked(permission) && isPermanentlyDenied(permission)) {
    await openPermissionSettings(permission)
    return {
      granted: false,
      sdkRequired: false,
      message: `Permission previously denied. Opening settings.`,
      permanentlyDenied: true,
    }
  }

  markAsAsked(permission)

  try {
    const result = await NativeLauncher.checkAndRequestPermission({ permission })

    if (result && result.granted) {
      clearPermissionDenied(permission)
    } else {
      setPermissionDenied(permission)
    }

    return result || { granted: false, sdkRequired: false, message: 'Unknown' }
  } catch (e) {
    console.error(`Permission request failed for ${permission}:`, e)
    return { granted: false, sdkRequired: false, message: e.message }
  }
}

export async function batchCheckPermissions(permissions) {
  if (!isNative) {
    return permissions.map(p => ({
      permission: p,
      granted: true,
      rationale: getRationale(p),
      isRuntime: false,
    }))
  }

  try {
    const result = await NativeLauncher.batchCheckPermissions({ permissions })
    return result?.results || []
  } catch (e) {
    console.error('Batch permission check failed:', e)
    return permissions.map(p => ({
      permission: p,
      granted: false,
      rationale: getRationale(p),
      isRuntime: false,
    }))
  }
}

async function batchRequestPermissions(permissions) {
  if (!isNative) {
    return { results: permissions.map(p => ({ permission: p, granted: true })), requested: 0 }
  }

  try {
    const result = await NativeLauncher.batchRequestPermissions({ permissions })
    return result || { results: [], requested: 0 }
  } catch (e) {
    console.error('Batch permission request failed:', e)
    return { results: [], requested: 0 }
  }
}

export async function openPermissionSettings(permission) {
  if (!isNative) return

  try {
    await NativeLauncher.openPermissionSettings({ permission })
  } catch (e) {
    console.error('Failed to open permission settings:', e)
  }
}

export async function getPermissionSummary() {
  if (!isNative) {
    const allPerms = getAllPermissions()
    return { permissions: Object.fromEntries(allPerms.map(p => [p, true])), granted: allPerms.length, total: allPerms.length }
  }

  try {
    const result = await NativeLauncher.getPermissionStatusSummary()
    _cachedSummary = result
    if (cacheTimeout) clearTimeout(cacheTimeout)
    cacheTimeout = setTimeout(() => { _cachedSummary = null }, 30000)
    return result
  } catch (e) {
    console.error('Failed to get permission summary:', e)
    return { permissions: {}, granted: 0, total: getAllPermissions().length }
  }
}

export async function requestCorePermissions() {
  const result = await batchRequestPermissions(CORE_PERMISSIONS)
  const stillDenied = result.results?.filter(r => !r.granted).map(r => r.permission) || []
  if (result.requested === 0 && stillDenied.length > 0) {
    await openPermissionSettings(stillDenied[0])
  }
  return {
    granted: result.results?.filter(r => r.granted).length || 0,
    total: CORE_PERMISSIONS.length,
  }
}

export async function requestOptionalPermissions() {
  const allPerms = getAllPermissions()
  const result = await batchRequestPermissions(allPerms)
  const stillDenied = result.results?.filter(r => !r.granted).map(r => r.permission) || []
  if (result.requested === 0 && stillDenied.length > 0) {
    await openPermissionSettings(stillDenied[0])
  }
  return {
    granted: result.results?.filter(r => r.granted).length || 0,
    total: allPerms.length,
  }
}

export function shouldShowRationale(permission) {
  return wasAlreadyAsked(permission) && !isPermanentlyDenied(permission)
}

export function getDegradedFeatures(deniedPermissions) {
  const degraded = []
  const map = {
    CAMERA: 'Threat photo capture',
    RECORD_AUDIO: 'Voice commands and live conversation',
    ACCESS_FINE_LOCATION: 'Precise GPS weather',
    ACCESS_COARSE_LOCATION: 'Location-aware widgets',
    READ_CONTACTS: 'Contact quick-dial and pinned contacts',
    POST_NOTIFICATIONS: 'Task reminders and alerts',
    USE_BIOMETRIC: 'Biometric app lock',
    WRITE_SETTINGS: 'Brightness control from quick settings',
    SYSTEM_ALERT_WINDOW: 'Floating recents overlay',
    ACCESS_NOTIFICATION_POLICY: 'Do Not Disturb integration',
    PACKAGE_USAGE_STATS: 'Frequency-based app sorting',
    BIND_ACCESSIBILITY_SERVICE: 'Gesture navigation and screen capture',
    SET_WALLPAPER: 'Programmatic wallpaper changes',
    QUERY_ALL_PACKAGES: 'App drawer population',
    REQUEST_INSTALL_PACKAGES: 'Sideload APK updates',
  }

  for (const perm of deniedPermissions) {
    if (map[perm]) {
      degraded.push({ permission: perm, feature: map[perm] })
    }
  }

  return degraded
}
