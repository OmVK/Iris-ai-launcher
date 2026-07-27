import { IRIS_ICON_PACK } from '../utils/IrisIconPack'
import { getIconContainerStyle } from '../utils/IconShapeMask'

export default function HudIcon({ packageId, size, iconShape = 'system' }) {
  const iconContent = IRIS_ICON_PACK[packageId]
  if (!iconContent) return null
  const shapeStyle = getIconContainerStyle(iconShape, size)
  return (
    <div style={shapeStyle} className="flex items-center justify-center hud-icon-transition">
      {iconContent}
    </div>
  )
}
