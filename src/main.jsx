import { ErrorBoundary } from './ErrorBoundary.jsx';
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { Preferences } from '@capacitor/preferences'
import { useAIStore } from './stores/aiStore'
window.useGlobalHudIcons = localStorage.getItem('use_global_hud_icons') !== 'false';

async function initApp() {
  try {
    // 1. CLEAR LOCAL STORAGE BLOAT BEFORE PREFERENCES SYNC
    const keysToRemove = []
    let cwLength = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('CapacitorStorage')) {
        keysToRemove.push(key)
      } else if (key === 'custom_wallpaper') {
        const cw = localStorage.getItem('custom_wallpaper')
        cwLength = cw ? cw.length : 0
        if (cwLength > 3000000) {
          keysToRemove.push(key) // Purge oversized wallpaper immediately
        }
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k))

    // 2. NOW SYNC FROM PREFERENCES
    const { keys } = await Preferences.keys()
    for (const key of keys) {
      if (key.startsWith('CapacitorStorage') || key === 'custom_wallpaper') {
        await Preferences.remove({ key }) // Purge bad keys from native DB
        continue
      }
      const { value } = await Preferences.get({ key })
      if (value !== null) {
        try {
          localStorage.setItem(key, value)
        } catch (e) {
          console.warn(`Failed to sync key ${key} from preferences to local storage`, e)
        }
      }
    }
    
    const originalSetItem = localStorage.setItem
    localStorage.setItem = function(key, value) {
      if (key.startsWith('CapacitorStorage')) {
        try { originalSetItem.apply(this, arguments) } catch (e) { if (e.name !== 'QuotaExceededError' && e.code !== 22 && e.code !== 1014) console.warn('CapacitorStorage setItem error:', e) }
        return
      }
      
      try {
        originalSetItem.apply(this, arguments)
      } catch (e) {
        if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
          console.warn('LocalStorage Quota Exceeded:', e)
        } else {
          console.warn('LocalStorage setItem error:', e)
        }
      }

      // DO NOT send massive images over the native bridge, it will crash Android SharedPreferences!
      if (key !== 'custom_wallpaper') {
        Preferences.set({ key, value: String(value) }).catch(console.error)
      }
    }

    const originalRemoveItem = localStorage.removeItem
    localStorage.removeItem = function(key) {
      originalRemoveItem.apply(this, arguments)
      Preferences.remove({ key }).catch(console.error)
    }

    const originalClear = localStorage.clear
    localStorage.clear = function() {
      originalClear.apply(this, arguments)
      Preferences.clear().catch(console.error)
    }
  } catch (e) {
    console.error("Failed to initialize capacitor preferences bridge", e)
  }

  try { await useAIStore.getState().loadKeys() } catch (e) { console.warn('Failed to load secure keys:', e) }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>,
  )
}

initApp()
