import { Capacitor } from '@capacitor/core'
import { KeystoreStorage } from '../components/KeystorePlugin'

const OLD_PREFIX = 'iris_enc_'
const KS_PREFIX = 'ks_'
const DB_NAME = 'IrisSecureDB'
const STORE_NAME = 'keys'
const KEY_NAME = 'aes-gcm-key'

async function getOrCreateKey() {
  const db = await new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(KEY_NAME)
    req.onsuccess = async () => {
      if (req.result) { resolve(req.result); return }
      try {
        const salt = crypto.getRandomValues(new Uint8Array(16))
        const pinMaterial = new TextEncoder().encode(localStorage.getItem('iris_chrono_pin_offset') || 'iris-system-master')
        const baseKey = await crypto.subtle.importKey('raw', pinMaterial, 'PBKDF2', false, ['deriveKey'])
        const derivedKey = await crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt, iterations: 310000, hash: 'SHA-256' },
          baseKey,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt', 'decrypt']
        )
        const tx2 = db.transaction(STORE_NAME, 'readwrite')
        tx2.objectStore(STORE_NAME).put(derivedKey, KEY_NAME)
        tx2.oncomplete = () => resolve(derivedKey)
        tx2.onerror = () => reject(tx2.error)
      } catch (err) {
        reject(err)
      }
    }
    req.onerror = () => reject(req.error)
  })
}

function buf2str(buf) {
  return btoa(Array.from(new Uint8Array(buf), b => String.fromCharCode(b)).join(''))
}

function str2buf(str) {
  const bin = atob(str)
  const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  return buf
}

let keyPromise = null

function ensureKey() {
  if (!keyPromise) keyPromise = getOrCreateKey().catch(err => {
    console.warn('Key generation failed, will retry:', err)
    keyPromise = null
    return null
  })
  return keyPromise
}

async function encrypt(plaintext) {
  const key = await ensureKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  return buf2str(iv) + '.' + buf2str(ciphertext)
}

async function decrypt(blob) {
  if (!blob || typeof blob !== 'string' || !blob.includes('.')) return null
  const key = await ensureKey()
  const [ivStr, ctStr] = blob.split('.')
  const iv = str2buf(ivStr)
  const ct = str2buf(ctStr)
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return new TextDecoder().decode(plainBuf)
}

const isNative = Capacitor.isNativePlatform()

const PROTECTED_DATA_KEYS = new Set([
  'iris_assistant_sessions',
  'iris_voice_notes',
  'iris_day_tasks',
  'iris_custom_voice_macros',
  'iris_notif_archive_v1',
  'iris_notification_history',
  'iris_memory_vault',
  'iris_split_app_pairs',
])

const memoryVault = new Map()
const rawGetItem = Storage.prototype.getItem.bind(localStorage)
const rawSetItem = Storage.prototype.setItem.bind(localStorage)
const rawRemoveItem = Storage.prototype.removeItem.bind(localStorage)

let shieldInstalled = false
function installEncryptedStorageShield() {
  if (shieldInstalled) return
  shieldInstalled = true

  for (const key of PROTECTED_DATA_KEYS) {
    const legacyPlain = rawGetItem(key)
    if (legacyPlain) {
      memoryVault.set(key, legacyPlain)
    }
  }

  Storage.prototype.getItem = function (key) {
    if (this === localStorage && PROTECTED_DATA_KEYS.has(key)) {
      if (memoryVault.has(key)) return memoryVault.get(key)
      const fallbackPlain = rawGetItem(key)
      if (fallbackPlain) {
        memoryVault.set(key, fallbackPlain)
        return fallbackPlain
      }
      return null
    }
    return rawGetItem(key)
  }

  Storage.prototype.setItem = function (key, value) {
    if (this === localStorage && PROTECTED_DATA_KEYS.has(key)) {
      const strVal = String(value ?? '')
      memoryVault.set(key, strVal)
      rawRemoveItem(key)
      setItem(key, strVal).catch(() => {})
      return
    }
    return rawSetItem(key, value)
  }

  Storage.prototype.removeItem = function (key) {
    if (this === localStorage && PROTECTED_DATA_KEYS.has(key)) {
      memoryVault.delete(key)
      rawRemoveItem(key)
      removeItem(key)
      return
    }
    return rawRemoveItem(key)
  }
}

installEncryptedStorageShield()

async function setItem(key, value) {
  try {
    if (!value) {
      if (isNative) await KeystoreStorage.removeItem(key)
      else rawRemoveItem(OLD_PREFIX + key)
      rawRemoveItem(KS_PREFIX + key)
      return
    }
    if (isNative) {
      await KeystoreStorage.setItem(key, value)
    } else {
      const encrypted = await encrypt(value)
      rawSetItem(KS_PREFIX + key, encrypted)
    }
  } catch (e) {
    console.warn('SecureStorage.setItem failed:', e)
  }
}

async function getItem(key) {
  try {
    if (isNative) {
      const nativeVal = await KeystoreStorage.getItem(key)
      if (nativeVal) return nativeVal
    }
    const ksValue = rawGetItem(KS_PREFIX + key)
    if (ksValue) {
      const decrypted = await decrypt(ksValue)
      if (decrypted) return decrypted
    }
    const oldValue = rawGetItem(OLD_PREFIX + key)
    if (oldValue) {
      const decrypted = await decrypt(oldValue)
      if (decrypted) return decrypted
    }
    const rawVal = rawGetItem(key)
    if (rawVal) return rawVal
  } catch (e) {
    console.warn('SecureStorage.getItem failed:', e)
  }
  return null
}

function removeItem(key) {
  if (isNative) KeystoreStorage.removeItem(key)
  rawRemoveItem(KS_PREFIX + key)
  rawRemoveItem(OLD_PREFIX + key)
  rawRemoveItem(key)
}

async function migrateAll() {
  const API_KEYS = ['gemini_api_key', 'groq_api_key', 'nvidia_api_key', 'cartesia_api_key', 'huggingface_api_key']
  if (isNative) {
    for (const key of API_KEYS) {
      const ksValue = rawGetItem(KS_PREFIX + key)
      if (ksValue) {
        rawRemoveItem(key)
        rawRemoveItem(OLD_PREFIX + key)
        continue
      }
      const oldValue = rawGetItem(OLD_PREFIX + key)
      if (oldValue) {
        try {
          const plaintext = await decrypt(oldValue)
          if (plaintext) {
            await KeystoreStorage.setItem(key, plaintext)
            rawRemoveItem(OLD_PREFIX + key)
          }
        } catch {
          rawRemoveItem(OLD_PREFIX + key)
        }
      }
      const raw = rawGetItem(key)
      if (raw) {
        try {
          await KeystoreStorage.setItem(key, raw)
          rawRemoveItem(key)
        } catch {}
      }
    }
  } else {
    for (const key of API_KEYS) {
      const ksValue = rawGetItem(KS_PREFIX + key)
      if (ksValue) {
        rawRemoveItem(key)
        rawRemoveItem(OLD_PREFIX + key)
        continue
      }
      const oldValue = rawGetItem(OLD_PREFIX + key)
      if (oldValue) {
        try {
          const plaintext = await decrypt(oldValue)
          if (plaintext) {
            const encrypted = await encrypt(plaintext)
            rawSetItem(KS_PREFIX + key, encrypted)
            rawRemoveItem(OLD_PREFIX + key)
          }
        } catch {
          rawRemoveItem(OLD_PREFIX + key)
        }
      }
      const raw = rawGetItem(key)
      if (raw) {
        try {
          const encrypted = await encrypt(raw)
          rawSetItem(KS_PREFIX + key, encrypted)
          rawRemoveItem(key)
        } catch {}
      }
    }
  }

  for (const dataKey of PROTECTED_DATA_KEYS) {
    try {
      const rawPlain = rawGetItem(dataKey)
      if (rawPlain) {
        memoryVault.set(dataKey, rawPlain)
        await setItem(dataKey, rawPlain)
        rawRemoveItem(dataKey)
      } else {
        const decrypted = await getItem(dataKey)
        if (decrypted) {
          memoryVault.set(dataKey, decrypted)
        }
      }
    } catch {}
  }

  try {
    window.dispatchEvent(new CustomEvent('IRIS_SECURE_VAULT_HYDRATED'))
  } catch {}
}

export const SecureStorage = { setItem, getItem, removeItem, migrateAll }
