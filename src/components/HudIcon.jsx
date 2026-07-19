import { IRIS_ICON_PACK } from '../utils/IrisIconPack'

export default function HudIcon({ packageId, size }) {
  const iconContent = IRIS_ICON_PACK[packageId]
  if (!iconContent) return null
  return (
    <div style={{
      width: `${size}px`,
      height: `${size}px`,
    }} className="flex items-center justify-center icon-circle-minimal-outline hud-icon-transition">
      {iconContent}
    </div>
  )
}
