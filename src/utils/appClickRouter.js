export function routeAppClick(app, { onNavigate, launchApp }) {
  if (app.path) {
    onNavigate(app.path)
  } else {
    launchApp(app.packageId, app.label)
  }
  return true
}
