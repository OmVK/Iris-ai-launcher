import { ErrorBoundary } from './ErrorBoundary.jsx';
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { Preferences } from '@capacitor/preferences'
import { useAIStore } from './stores/aiStore'
window.useGlobalHudIcons = localStorage.getItem('use_global_hud_icons') !== 'false';

async function initApp() {
  // CRITICAL PATH: Only sync preferences and render immediately
  try {
    const { keys } = await Preferences.keys()
    const criticalKeys = ['iris_setup_complete', 'system_llm_backend', 'gemini_model', 'theme_color', 'glass_opacity', 'wallpaper', 'installed_apps']

    for (const key of keys) {
      if (key.startsWith('CapacitorStorage') || key === 'custom_wallpaper') {
        await Preferences.remove({ key })
        continue
      }
      if (!criticalKeys.some(ck => key.startsWith(ck) || key === ck)) continue

      const { value } = await Preferences.get({ key })
      if (value !== null) {
        try { localStorage.setItem(key, value) } catch (e) { if (e.name !== 'QuotaExceededError') console.warn(`Failed to sync ${key}`, e) }
      }
    }

    setupStorageBridge()
  } catch (e) {
    console.error("Failed to initialize capacitor preferences bridge", e)
  }

  try { await useAIStore.getState().loadKeys() } catch (e) { console.warn('Failed to load secure keys:', e) }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>,
  )

  // DEFERRED: Sync remaining preferences in background after render
  requestIdleCallback(() => deferBackgroundSync(), { timeout: 5000 })
}

function setupStorageBridge() {
  const originalSetItem = localStorage.setItem
  localStorage.setItem = function(key, value) {
    if (key.startsWith('CapacitorStorage')) {
      try { originalSetItem.apply(this, arguments) } catch (e) { if (e.name !== 'QuotaExceededError' && e.code !== 22 && e.code !== 1014) console.warn('CapacitorStorage setItem error:', e) }
      return
    }
    try { originalSetItem.apply(this, arguments) } catch (e) { if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) console.warn('LocalStorage Quota Exceeded:', e) }
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
}

async function deferBackgroundSync(allKeys) {
  try {
    const keysResult = await Preferences.keys()
    const skipPrefixes = ['CapacitorStorage', 'iris_ds_']
    const skipExact = ['custom_wallpaper', 'installed_apps', 'system_llm_backend', 'gemini_model', 'theme_color', 'glass_opacity', 'wallpaper']

    for (const key of keysResult.keys) {
      if (skipPrefixes.some(p => key.startsWith(p))) continue
      if (skipExact.includes(key)) continue
      if (key.startsWith('CapacitorStorage')) continue

      const { value } = await Preferences.get({ key })
      if (value !== null) {
        try { localStorage.setItem(key, value) } catch (e) { /* quota */ }
      }
    }

    // Purge oversized wallpaper
    const cw = localStorage.getItem('custom_wallpaper')
    if (cw && cw.length > 3000000) {
      localStorage.removeItem('custom_wallpaper')
    }
  } catch (e) {
    console.warn('Background sync failed:', e)
  }
}

initApp()
