const SHAPES = {
  circle: {
    clipPath: 'circle(50% at 50% 50%)',
    borderRadius: '50%',
  },
  squircle: {
    clipPath: 'none',
    borderRadius: '22%',
  },
  rounded_rect: {
    clipPath: 'none',
    borderRadius: '16%',
  },
  teardrop: {
    clipPath: 'none',
    borderRadius: '50% 50% 12% 50%',
  },
  system: {
    clipPath: 'none',
    borderRadius: '24%',
  },
}

const _NORMALIZATION_SIZES = {
  adaptive: { padding: 0.1, targetRatio: 0.7 },
  normal: { padding: 0.15, targetRatio: 0.65 },
  small: { padding: 0.2, targetRatio: 0.6 },
}

function getIconShape(shape = 'system') {
  return SHAPES[shape] || SHAPES.system
}


export function getIconContainerStyle(shape = 'system', size = 48) {
  const shapeConfig = getIconShape(shape)
  return {
    width: size,
    height: size,
    clipPath: shapeConfig.clipPath !== 'none' ? shapeConfig.clipPath : undefined,
    borderRadius: shapeConfig.borderRadius !== '0' ? shapeConfig.borderRadius : undefined,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
}

