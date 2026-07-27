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
    clipPath: 'path("M 0.5 0 C 0.8 0, 1 0.2, 1 0.5 C 1 0.8, 0.8 1, 0.5 1 L 0.3 1 C 0 1, 0 0.7, 0 0.5 C 0 0.2, 0.2 0, 0.5 0 Z")',
    borderRadius: '0',
  },
  system: {
    clipPath: 'none',
    borderRadius: '24%',
  },
}

const NORMALIZATION_SIZES = {
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

