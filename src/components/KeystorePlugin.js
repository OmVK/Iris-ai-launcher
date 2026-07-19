import { registerPlugin } from '@capacitor/core'

const IrisKeystore = registerPlugin('IrisKeystore')

export const KeystoreStorage = {
  async setItem(key, value) {
    try {
      if (!value) {
        localStorage.removeItem('ks_' + key)
        if (key === 'nvidia_api_key') localStorage.removeItem('iris_has_nvidia_key')
        return
      }
      const result = await IrisKeystore.storeValue({ value })
      localStorage.setItem('ks_' + key, result.encrypted)
      if (key === 'nvidia_api_key') localStorage.setItem('iris_has_nvidia_key', 'true')
    } catch (e) {
      console.warn('KeystoreStorage.setItem failed:', e)
    }
  },

  async getItem(key) {
    try {
      const encrypted = localStorage.getItem('ks_' + key)
      if (encrypted) {
        const result = await IrisKeystore.retrieveValue({ encrypted })
        return result.value
      }
    } catch (e) {
      console.warn('KeystoreStorage.getItem failed:', e)
    }
    return null
  },

  removeItem(key) {
    localStorage.removeItem('ks_' + key)
    localStorage.removeItem(key)
    if (key === 'nvidia_api_key') localStorage.removeItem('iris_has_nvidia_key')
  }
}
