import { Preferences } from '@capacitor/preferences'

const stores = new Map()
const listeners = new Map()
const cache = new Map()

class TypedStore {
  constructor(name) {
    this.name = name
    this.prefix = `iris_ds_${name}_`
  }

  async get(key, defaultValue = null) {
    const fullKey = this.prefix + key
    if (cache.has(fullKey)) return cache.get(fullKey)

    try {
      const { value } = await Preferences.get({ key: fullKey })
      if (value === null) return defaultValue
      const parsed = JSON.parse(value)
      cache.set(fullKey, parsed)
      return parsed
    } catch {
      return defaultValue
    }
  }

  async set(key, value) {
    const fullKey = this.prefix + key
    cache.set(fullKey, value)
    try {
      await Preferences.set({ key: fullKey, value: JSON.stringify(value) })
    } catch (e) {
      console.warn(`DataStore[${this.name}] set failed:`, e)
    }
    this.emit(key, value)
  }

  async remove(key) {
    const fullKey = this.prefix + key
    cache.delete(fullKey)
    try {
      await Preferences.remove({ key: fullKey })
    } catch (e) {
      console.warn(`DataStore[${this.name}] remove failed:`, e)
    }
    this.emit(key, null)
  }

  async getAll() {
    const result = {}
    try {
      const { keys } = await Preferences.keys()
      for (const key of keys) {
        if (key.startsWith(this.prefix)) {
          const subKey = key.slice(this.prefix.length)
          const val = await this.get(subKey)
          if (val !== null) result[subKey] = val
        }
      }
    } catch (e) {
      console.warn(`DataStore[${this.name}] getAll failed:`, e)
    }
    return result
  }

  async clear() {
    try {
      const { keys } = await Preferences.keys()
      for (const key of keys) {
        if (key.startsWith(this.prefix)) {
          await Preferences.remove({ key })
          cache.delete(key)
        }
      }
    } catch (e) {
      console.warn(`DataStore[${this.name}] clear failed:`, e)
    }
    this.emit('*', null)
  }

  subscribe(key, callback) {
    const listenerKey = `${this.name}:${key}`
    if (!listeners.has(listenerKey)) {
      listeners.set(listenerKey, new Set())
    }
    listeners.get(listenerKey).add(callback)
    return () => {
      const set = listeners.get(listenerKey)
      if (set) {
        set.delete(callback)
        if (set.size === 0) listeners.delete(listenerKey)
      }
    }
  }

  emit(key, value) {
    const specificKey = `${this.name}:${key}`
    const specificListeners = listeners.get(specificKey)
    if (specificListeners) {
      for (const cb of specificListeners) {
        try { cb(value) } catch (e) { console.warn('DataStore listener error:', e) }
      }
    }
    const wildcardListeners = listeners.get(`${this.name}:*`)
    if (wildcardListeners) {
      for (const cb of wildcardListeners) {
        try { cb({ key, value }) } catch (e) { console.warn('DataStore listener error:', e) }
      }
    }
  }
}

function getStore(name) {
  if (!stores.has(name)) {
    stores.set(name, new TypedStore(name))
  }
  return stores.get(name)
}

const AppPositionStore = getStore('app_positions')
const FolderStore = getStore('folders')
const WidgetStore = getStore('widgets')
const GestureStore = getStore('gestures')
export const HiddenAppsStore = getStore('hidden_apps')
const LockedAppsStore = getStore('locked_apps')
const SettingsStore = getStore('settings')
export const BadgeStore = getStore('badges')
const SessionStore = getStore('sessions')

async function migrateFromLocalStorage(mappings) {
  for (const [lsKey, store, storeKey] of mappings) {
    try {
      const raw = localStorage.getItem(lsKey)
      if (raw !== null) {
        const existing = await store.get(storeKey)
        if (existing === null) {
          const parsed = JSON.parse(raw)
          await store.set(storeKey, parsed)
        }
      }
    } catch (e) {
      // Skip failed migrations
    }
  }
}

async function runMigrations() {
  await migrateFromLocalStorage([
    ['installed_apps', AppPositionStore, 'positions'],
    ['iris_custom_folders', FolderStore, 'folders'],
    ['iris_active_widgets', WidgetStore, 'active_ids'],
    ['iris_custom_widgets', WidgetStore, 'custom'],
    ['iris_locked_apps', LockedAppsStore, 'locked'],
  ])
}
