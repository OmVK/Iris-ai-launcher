import { launchApp } from '../components/LauncherPlugin'

export default function usePageRouter({ setActivePage, setChronoTarget, setShowChronoLock, isVaultUnlocked, setShowVaultExplorer }) {
  const handleLaunchApp = (app) => {
    if (app.path) {
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
