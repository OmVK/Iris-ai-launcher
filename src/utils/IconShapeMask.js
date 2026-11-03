const THEME_SHAPES = {
  DEFAULT: { borderRadius: '22%' },
  SOLID: { borderRadius: '20%' },
  GLYPH_ONLY: { borderRadius: '16%' },
  RETRO: { borderRadius: '8px' },
  CLASSIC: { borderRadius: '50%' },
  circle: { borderRadius: '50%' },
  squircle: { borderRadius: '22%' },
  rounded_rect: { borderRadius: '16%' },
  teardrop: { borderRadius: '50% 50% 12% 50%' },
  system: { borderRadius: '22%' },
}

function getIconShape(themeOrShape = 'DEFAULT') {
  const key = typeof themeOrShape === 'string' ? themeOrShape : 'DEFAULT'
  return THEME_SHAPES[key] || THEME_SHAPES[key.toUpperCase()] || THEME_SHAPES.DEFAULT
}

export function getIconContainerStyle(themeOrShape = 'DEFAULT', size = 48) {
  const shapeConfig = getIconShape(themeOrShape)
  return {
    width: size,
    height: size,
    borderRadius: shapeConfig.borderRadius,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
}
