export function routeAppClick(app, { onNavigate, launchApp, onTriggerChronoLock, lockedApps = [], isVaultUnlocked = false }) {
  if (!app) return false
  if (app.path) {
    onNavigate(app.path)
  } else {
    const isLocked = Array.isArray(lockedApps) && lockedApps.includes(app.packageId)
    if (isLocked && !isVaultUnlocked && onTriggerChronoLock) {
      onTriggerChronoLock(app)
    } else {
      launchApp(app.packageId, app.label)
    }
  }
  return true
}
