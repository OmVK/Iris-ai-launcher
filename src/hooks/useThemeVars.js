import { useEffect } from 'react'

const COLOR_MAP = {
  cyan: ['0, 219, 231', '#00dbe7', '#00f2ff'],
  pink: ['255, 0, 127', '#ff007f', '#ff3399'],
  green: ['57, 255, 20', '#39ff14', '#66ff4d'],
  amber: ['255, 170, 0', '#ffaa00', '#ffbb33'],
  purple: ['157, 78, 223', '#9d4edf', '#b380ff'],
  red: ['255, 23, 68', '#ff1744', '#ff4d6a'],
}

export default function useThemeVars({ themeColor, glassOpacity }) {
  useEffect(() => {
    const [rgb, hex, hexSec] = COLOR_MAP[themeColor] || COLOR_MAP.cyan
    document.documentElement.style.setProperty('--primary-rgb', rgb)
    document.documentElement.style.setProperty('--primary-color', hex)
    document.documentElement.style.setProperty('--primary-color-secondary', hexSec)
  }, [themeColor])

  useEffect(() => {
    document.documentElement.style.setProperty('--glass-opacity', glassOpacity / 100)
  }, [glassOpacity])

  useEffect(() => {
    document.body.style.backgroundColor = '#020617'
    document.documentElement.style.backgroundColor = '#020617'
    document.getElementById('root').style.background = 'transparent'
  }, [])
}
