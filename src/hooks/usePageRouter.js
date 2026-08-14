import { launchApp } from '../components/LauncherPlugin'
import { useAppStore } from '../stores/appStore'

export default function usePageRouter({ setActivePage, setChronoTarget, setShowChronoLock, isVaultUnlocked, setShowVaultExplorer }) {
  const handleLaunchApp = (app) => {
    if (!app) return
    const pkg = typeof app === 'string' ? app : app.packageId
    const { lockedApps, isVaultUnlocked: vaultOpen } = useAppStore.getState()
    const isLocked = pkg && Array.isArray(lockedApps) && lockedApps.includes(pkg)

    if (isLocked && !vaultOpen && !isVaultUnlocked) {
      const targetObj = typeof app === 'string' ? { packageId: app } : app
      setChronoTarget(targetObj)
      setShowChronoLock(true)
      return
    }

    if (typeof app === 'string') {
      launchApp(app)
    } else if (app.path) {
      setActivePage(app.path)
    } else if (app.packageId) {
      launchApp(app.packageId, app.label)
    }
  }

  const handleTriggerVault = () => {
    if (isVaultUnlocked) setShowVaultExplorer(true)
    else { setChronoTarget(null); setShowChronoLock(true) }
  }

  const handleTriggerChronoLock = (t) => {
    setChronoTarget(t); setShowChronoLock(true)
  }

  return { handleLaunchApp, handleTriggerVault, handleTriggerChronoLock }
}
