const HAPTIC_ENABLED_KEY = 'haptic_enabled'

function isEnabled() {
  try { return localStorage.getItem(HAPTIC_ENABLED_KEY) !== 'false' } catch { return true }
}

function setEnabled(enabled) {
  try { localStorage.setItem(HAPTIC_ENABLED_KEY, String(enabled)) } catch {}
}

function vibrate(pattern) {
  if (!isEnabled()) return
  if (navigator.vibrate) {
    navigator.vibrate(pattern)
  }
}

function light() { vibrate(10) }
function medium() { vibrate(25) }
function heavy() { vibrate(50) }
function double() { vibrate([10, 50, 10]) }
function success() { vibrate([10, 30, 10, 30, 50]) }
function error() { vibrate([50, 30, 50]) }
function warning() { vibrate([30, 20, 30]) }

export default {
  isEnabled,
  setEnabled,
  vibrate,
  light,
  medium,
  heavy,
  double,
  success,
  error,
  warning,
}
