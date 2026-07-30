const WALLPAPER_KEY = 'wallpaper'
const CUSTOM_WALLPAPER_KEY = 'custom_wallpaper'
const WALLPAPER_BLUR_KEY = 'wallpaper_blur'
const WALLPAPER_VIGNETTE_KEY = 'wallpaper_vignette'
const DAILY_ROTATION_KEY = 'daily_wallpaper_rotation'
const DAILY_ROTATION_LAST_KEY = 'daily_wallpaper_last_date'
const WALLPAPER_CACHE_KEY = 'wallpaper_cache'

const WALLPAPERS = [
  { id: 'SYSTEM', label: 'Phone Wallpaper', desc: 'Android native wallpaper', type: 'system', css: (o) => `radial-gradient(ellipse at 50% 0%, rgba(10,14,23,${o}) 0%, rgba(2,6,23,${o}) 100%)` },
  { id: 'VOID', label: 'Void Space', desc: 'Dark void gradient', type: 'gradient', css: (o) => `radial-gradient(ellipse at 50% 0%, rgba(10,14,23,${o}) 0%, rgba(2,6,23,${o}) 100%)` },
  { id: 'GRID', label: 'Cyber Grid', desc: 'Vector grid matrix', type: 'gradient', css: (o) => `linear-gradient(180deg, rgba(10,14,23,${o}) 0%, rgba(20,25,35,${o}) 50%, rgba(10,14,23,${o}) 100%)` },
  { id: 'NEBULA', label: 'Nebula Dust', desc: 'Nebula cloud gas', type: 'gradient', css: (o) => `radial-gradient(ellipse at top, rgba(30,27,75,${o}) 0%, rgba(2,6,23,${o}) 100%)` },
  { id: 'FIBER', label: 'Carbon Tech', desc: 'Carbon tactical weave', type: 'gradient', css: (o) => `linear-gradient(180deg, rgba(10,14,23,${o}) 0%, rgba(20,25,35,${o}) 50%, rgba(10,14,23,${o}) 100%)` },
  { id: 'AURORA', label: 'Aurora Sweep', desc: 'Northern glowing sky', type: 'gradient', css: (o) => `linear-gradient(135deg, rgba(2,6,23,${o}) 0%, rgba(6,78,59,${o}) 50%, rgba(2,6,23,${o}) 100%)` },
  { id: 'OCEAN', label: 'Deep Ocean', desc: 'Dark ocean depths', type: 'gradient', css: (o) => `linear-gradient(180deg, rgba(0,20,40,${o}) 0%, rgba(0,10,20,${o}) 100%)` },
  { id: 'SUNSET', label: 'Horizon', desc: 'Warm sunset glow', type: 'gradient', css: (o) => `linear-gradient(180deg, rgba(40,10,20,${o}) 0%, rgba(20,5,10,${o}) 100%)` },
  { id: 'FOREST', label: 'Dark Forest', desc: 'Deep forest shadows', type: 'gradient', css: (o) => `linear-gradient(180deg, rgba(5,20,10,${o}) 0%, rgba(2,10,5,${o}) 100%)` },
]

function getOpacity() {
  try {
    const glassOpacity = parseInt(localStorage.getItem('glass_opacity') || '75')
    return (glassOpacity / 100).toFixed(2)
  } catch { return '0.75' }
}

function getWallpaperStyle(wallpaperId) {
  const wp = WALLPAPERS.find(w => w.id === wallpaperId)
  if (wp) return wp.css(getOpacity())
  return WALLPAPERS[0].css(getOpacity())
}

function getCustomWallpaper() {
  try {
    return localStorage.getItem(CUSTOM_WALLPAPER_KEY) || null
  } catch { return null }
}

function setCustomWallpaper(dataUrl) {
  try {
    if (dataUrl && dataUrl.length > 5000000) return false
    if (dataUrl) {
      localStorage.setItem(CUSTOM_WALLPAPER_KEY, dataUrl)
    } else {
      localStorage.removeItem(CUSTOM_WALLPAPER_KEY)
    }
    return true
  } catch { return false }
}

function getBlur() {
  try {
    return parseInt(localStorage.getItem(WALLPAPER_BLUR_KEY) || '0')
  } catch { return 0 }
}

function setBlur(value) {
  try { localStorage.setItem(WALLPAPER_BLUR_KEY, String(value)) } catch {}
}

function getVignette() {
  try {
    return parseInt(localStorage.getItem(WALLPAPER_VIGNETTE_KEY) || '0')
  } catch { return 0 }
}

function setVignette(value) {
  try { localStorage.setItem(WALLPAPER_VIGNETTE_KEY, String(value)) } catch {}
}

function getWallpaperUrl() {
  const wallpaper = localStorage.getItem(WALLPAPER_KEY) || 'VOID'
  if (wallpaper === 'CUSTOM') {
    return getCustomWallpaper()
  }
  return null
}

function getWallpaperCss() {
  const wallpaper = localStorage.getItem(WALLPAPER_KEY) || 'VOID'
  if (wallpaper === 'CUSTOM') {
    const url = getCustomWallpaper()
    if (url) return `url(${url}) center/cover no-repeat`
  }
  return getWallpaperStyle(wallpaper)
}

function applyWallpaperOverlay(element) {
  if (!element) return
  const blur = getBlur()
  const vignette = getVignette()
  element.style.filter = blur > 0 ? `blur(${blur}px)` : ''
  if (vignette > 0) {
    element.style.boxShadow = `inset 0 0 ${vignette * 3}px rgba(0,0,0,${vignette / 100})`
  } else {
    element.style.boxShadow = ''
  }
}

function getDailyRotationWallpapers() {
  return ['VOID', 'GRID', 'NEBULA', 'FIBER', 'AURORA', 'OCEAN', 'SUNSET', 'FOREST']
}

function shouldRotateDaily() {
  try {
    return localStorage.getItem(DAILY_ROTATION_KEY) === 'true'
  } catch { return false }
}

function setDailyRotation(enabled) {
  try { localStorage.setItem(DAILY_ROTATION_KEY, String(enabled)) } catch {}
}

function checkDailyRotation() {
  if (!shouldRotateDaily()) return false
  const today = new Date().toDateString()
  const lastDate = localStorage.getItem(DAILY_ROTATION_LAST_KEY)
  if (lastDate === today) return false
  const wallpapers = getDailyRotationWallpapers()
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000)
  const wpIndex = dayOfYear % wallpapers.length
  localStorage.setItem(WALLPAPER_KEY, wallpapers[wpIndex])
  localStorage.setItem(DAILY_ROTATION_LAST_KEY, today)
  return true
}

function cropImage(dataUrl, cropX, cropY, cropWidth, cropHeight, outputWidth, outputHeight) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = outputWidth || cropWidth
      canvas.height = outputHeight || cropHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.92))
    }
    img.src = dataUrl
  })
}

function resizeForWallpaper(dataUrl, maxWidth = 2560, maxHeight = 1440) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      let width = img.width
      let height = img.height
      if (width > maxWidth || height > maxHeight) {
        if (width > height) { height *= maxWidth / width; width = maxWidth }
        else { width *= maxHeight / height; height = maxHeight }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', 0.92))
    }
    img.src = dataUrl
  })
}

export default {
  WALLPAPERS,
  getWallpaperStyle,
  getCustomWallpaper,
  setCustomWallpaper,
  getBlur,
  setBlur,
  getVignette,
  setVignette,
  getWallpaperUrl,
  getWallpaperCss,
  applyWallpaperOverlay,
  shouldRotateDaily,
  setDailyRotation,
  checkDailyRotation,
  cropImage,
  resizeForWallpaper,
}
