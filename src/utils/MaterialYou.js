function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2
  if (max === min) { h = s = 0 } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100
  let r, g, b
  if (s === 0) { r = g = b = l } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
}

function extractColorsFromImage(imageUrl) {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const size = 64
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, size, size)
      const imageData = ctx.getImageData(0, 0, size, size)
      const pixels = imageData.data

      const colorBuckets = {}
      const step = 4
      for (let i = 0; i < pixels.length; i += step * 4) {
        const r = pixels[i]
        const g = pixels[i + 1]
        const b = pixels[i + 2]
        const a = pixels[i + 3]
        if (a < 128) continue
        const brightness = (r + g + b) / 3
        if (brightness < 20 || brightness > 240) continue
        const key = `${Math.round(r / 32) * 32},${Math.round(g / 32) * 32},${Math.round(b / 32) * 32}`
        colorBuckets[key] = (colorBuckets[key] || 0) + 1
      }

      const sorted = Object.entries(colorBuckets).sort((a, b) => b[1] - a[1])
      if (sorted.length === 0) {
        resolve({ primary: '#00dbe7', secondary: '#0088aa', tertiary: '#66f0ff', surface: '#0a0e17' })
        return
      }

      const [pr, pg, pb] = sorted[0][0].split(',').map(Number)
      const [h, s, l] = rgbToHsl(pr, pg, pb)

      const secondaryH = (h + 30) % 360
      const [sr, sg, sb] = hslToRgb(secondaryH, Math.min(s + 10, 100), Math.max(l - 10, 10))

      const tertiaryH = (h + 180) % 360
      const [tr, tg, tb] = hslToRgb(tertiaryH, Math.min(s + 5, 100), Math.max(l - 5, 10))

      const surfaceH = (h + 210) % 360
      const [surR, surG, surB] = hslToRgb(surfaceH, Math.min(s, 30), Math.max(l - 55, 5))

      resolve({
        primary: `#${pr.toString(16).padStart(2, '0')}${pg.toString(16).padStart(2, '0')}${pb.toString(16).padStart(2, '0')}`,
        secondary: `#${sr.toString(16).padStart(2, '0')}${sg.toString(16).padStart(2, '0')}${sb.toString(16).padStart(2, '0')}`,
        tertiary: `#${tr.toString(16).padStart(2, '0')}${tg.toString(16).padStart(2, '0')}${tb.toString(16).padStart(2, '0')}`,
        surface: `#${surR.toString(16).padStart(2, '0')}${surG.toString(16).padStart(2, '0')}${surB.toString(16).padStart(2, '0')}`,
        primaryRgb: `${pr}, ${pg}, ${pb}`,
      })
    }
    img.onerror = () => {
      resolve({ primary: '#00dbe7', secondary: '#0088aa', tertiary: '#66f0ff', surface: '#0a0e17', primaryRgb: '0, 219, 231' })
    }
    img.src = imageUrl
  })
}

function applyDynamicColors(colors) {
  const root = document.documentElement
  if (colors.primaryRgb) {
    root.style.setProperty('--primary-rgb', colors.primaryRgb)
  }
  if (colors.primary) {
    root.style.setProperty('--primary-color', colors.primary)
  }
  if (colors.secondary) {
    root.style.setProperty('--secondary-color', colors.secondary)
  }
  if (colors.tertiary) {
    root.style.setProperty('--tertiary-color', colors.tertiary)
  }
  if (colors.surface) {
    root.style.setProperty('--surface-color', colors.surface)
  }
}

const DYNAMIC_COLOR_KEY = 'dynamic_color_enabled'
const DYNAMIC_COLORS_KEY = 'dynamic_colors'

function isDynamicColorEnabled() {
  try { return localStorage.getItem(DYNAMIC_COLOR_KEY) === 'true' } catch { return false }
}

function setDynamicColorEnabled(enabled) {
  try { localStorage.setItem(DYNAMIC_COLOR_KEY, String(enabled)) } catch {}
}

function getCachedColors() {
  try {
    const raw = localStorage.getItem(DYNAMIC_COLORS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function cacheColors(colors) {
  try { localStorage.setItem(DYNAMIC_COLORS_KEY, JSON.stringify(colors)) } catch {}
}

async function extractAndApplyFromWallpaper(wallpaperUrl) {
  if (!wallpaperUrl) return null
  const colors = await extractColorsFromImage(wallpaperUrl)
  cacheColors(colors)
  if (isDynamicColorEnabled()) {
    applyDynamicColors(colors)
  }
  return colors
}

export default {
  rgbToHsl,
  hslToRgb,
  extractColorsFromImage,
  applyDynamicColors,
  isDynamicColorEnabled,
  setDynamicColorEnabled,
  getCachedColors,
  cacheColors,
  extractAndApplyFromWallpaper,
}
