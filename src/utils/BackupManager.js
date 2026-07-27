import { Preferences } from '@capacitor/preferences'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'

const BACKUP_VERSION = 1
const BACKUP_PREFIX = 'iris_backup_'

async function createBackupBundle() {
  const bundle = {
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    appVersion: '4.6.2',
    stores: {},
    localStorage: {},
  }

  const { keys } = await Preferences.keys()
  for (const key of keys) {
    if (key.startsWith('CapacitorStorage')) continue
    if (key === 'custom_wallpaper') continue
    const { value } = await Preferences.get({ key })
    if (value !== null) {
      bundle.localStorage[key] = value
    }
  }

  const storeKeys = [
    'iris_ds_app_positions_positions',
    'iris_ds_folders_folders',
    'iris_ds_widgets_active_ids',
    'iris_ds_widgets_custom',
    'iris_ds_gestures_gestures',
    'iris_ds_hidden_apps_hidden',
    'iris_ds_locked_apps_locked',
    'iris_ds_badges_counts',
    'iris_ds_badges_total',
    'iris_ds_sessions_sessions',
  ]

  for (const key of storeKeys) {
    const { value } = await Preferences.get({ key })
    if (value !== null) {
      bundle.stores[key] = value
    }
  }

  return bundle
}

export async function exportBackup(filename) {
  try {
    const bundle = await createBackupBundle()
    const json = JSON.stringify(bundle, null, 2)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const name = filename || `iris-backup-${timestamp}.json`

    if (Capacitor.isNativePlatform()) {
      await Filesystem.writeFile({
        path: name,
        data: json,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      })
      return { success: true, path: `Documents/${name}`, size: json.length }
    } else {
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      return { success: true, path: name, size: json.length }
    }
  } catch (e) {
    console.error('Backup export failed:', e)
    return { success: false, error: e.message }
  }
}

export async function importBackup(filePath) {
  try {
    let json
    if (Capacitor.isNativePlatform()) {
      const result = await Filesystem.readFile({
        path: filePath,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      })
      json = result.data
    } else {
      throw new Error('Web import not supported — use file picker')
    }

    const bundle = JSON.parse(json)

    if (!bundle.version || bundle.version > BACKUP_VERSION) {
      return { success: false, error: `Incompatible backup version: ${bundle.version}` }
    }

    let migratedCount = 0

    for (const [key, value] of Object.entries(bundle.localStorage || {})) {
      try {
        const existing = localStorage.getItem(key)
        if (existing === null) {
          localStorage.setItem(key, value)
          await Preferences.set({ key, value })
          migratedCount++
        }
      } catch (e) { /* skip */ }
    }

    for (const [key, value] of Object.entries(bundle.stores || {})) {
      try {
        const existing = await Preferences.get({ key })
        if (!existing.value) {
          await Preferences.set({ key, value })
          migratedCount++
        }
      } catch (e) { /* skip */ }
    }

    return { success: true, migratedCount, createdAt: bundle.createdAt, appVersion: bundle.appVersion }
  } catch (e) {
    console.error('Backup import failed:', e)
    return { success: false, error: e.message }
  }
}

export async function resetToDefaults() {
  const protectedKeys = ['custom_wallpaper', 'iris_setup_complete']

  const { keys } = await Preferences.keys()
  for (const key of keys) {
    if (key.startsWith('CapacitorStorage')) continue
    if (protectedKeys.includes(key)) continue
    if (key.startsWith('iris_') || key.startsWith('iris_ds_')) {
      await Preferences.remove({ key })
      localStorage.removeItem(key)
    }
  }

  for (const key of Object.keys(localStorage)) {
    if (protectedKeys.includes(key)) continue
    if (key.startsWith('iris_') || key.startsWith('iris_ds_')) {
      localStorage.removeItem(key)
    }
  }

  return { success: true }
}

export async function getBackupInfo(filePath) {
  try {
    let json
    if (Capacitor.isNativePlatform()) {
      const result = await Filesystem.readFile({
        path: filePath,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      })
      json = result.data
    } else {
      return null
    }

    const bundle = JSON.parse(json)
    return {
      version: bundle.version,
      createdAt: bundle.createdAt,
      appVersion: bundle.appVersion,
      storeCount: Object.keys(bundle.stores || {}).length,
      settingCount: Object.keys(bundle.localStorage || {}).length,
      size: json.length,
    }
  } catch {
    return null
  }
}
