export const getLS = (key, fallback) => {
  try {
    const v = localStorage.getItem(key)
    return v !== null ? v : fallback
  } catch { return fallback }
}

export const getLSNum = (key, fallback) => {
  try { const v = parseInt(localStorage.getItem(key)); return isNaN(v) ? fallback : v } catch { return fallback }
}

export const getLSBool = (key, fallback) => {
  try { return localStorage.getItem(key) !== null ? localStorage.getItem(key) !== 'false' : fallback } catch { return fallback }
}
