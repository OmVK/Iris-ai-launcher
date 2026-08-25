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

async function setItem(key, value) {
  try {
    if (!value) {
      if (isNative) await KeystoreStorage.removeItem(key)
      else localStorage.removeItem(OLD_PREFIX + key)
      localStorage.removeItem(KS_PREFIX + key)
      return
    }
    if (isNative) {
      await KeystoreStorage.setItem(key, value)
    } else {
      const encrypted = await encrypt(value)
      localStorage.setItem(KS_PREFIX + key, encrypted)
    }
  } catch (e) {
    console.warn('SecureStorage.setItem failed:', e)
  }
}

async function getItem(key) {
  try {
    if (isNative) {
      return await KeystoreStorage.getItem(key)
    }
    const ksValue = localStorage.getItem(KS_PREFIX + key)
    if (ksValue) return await decrypt(ksValue)
    const oldValue = localStorage.getItem(OLD_PREFIX + key)
    if (oldValue) return await decrypt(oldValue)
  } catch (e) {
    console.warn('SecureStorage.getItem failed:', e)
  }
  return null
}

function removeItem(key) {
  if (isNative) KeystoreStorage.removeItem(key)
  localStorage.removeItem(KS_PREFIX + key)
  localStorage.removeItem(OLD_PREFIX + key)
  localStorage.removeItem(key)
}

async function migrateAll() {
  if (isNative) {
    const API_KEYS = ['gemini_api_key', 'groq_api_key', 'nvidia_api_key', 'cartesia_api_key', 'huggingface_api_key']
    for (const key of API_KEYS) {
      const ksValue = localStorage.getItem(KS_PREFIX + key)
      if (ksValue) continue
      const oldValue = localStorage.getItem(OLD_PREFIX + key)
      if (oldValue) {
        try {
          const plaintext = await decrypt(oldValue)
          await KeystoreStorage.setItem(key, plaintext)
          localStorage.removeItem(OLD_PREFIX + key)
        } catch {
          localStorage.removeItem(OLD_PREFIX + key)
        }
      }
    }
  } else {
    const API_KEYS = ['gemini_api_key', 'groq_api_key', 'nvidia_api_key', 'cartesia_api_key', 'huggingface_api_key']
    for (const key of API_KEYS) {
      const ksValue = localStorage.getItem(KS_PREFIX + key)
      if (ksValue) continue
      const oldValue = localStorage.getItem(OLD_PREFIX + key)
      if (oldValue) {
        try {
          const plaintext = await decrypt(oldValue)
          const encrypted = await encrypt(plaintext)
          localStorage.setItem(KS_PREFIX + key, encrypted)
          localStorage.removeItem(OLD_PREFIX + key)
        } catch {
          localStorage.removeItem(OLD_PREFIX + key)
        }
      }
    }
  }
}

export const SecureStorage = { setItem, getItem, removeItem, migrateAll }
