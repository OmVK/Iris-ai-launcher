import { useRef, useEffect, useCallback, useMemo } from 'react'
import LetterFilterBar from './LetterFilterBar'

const CLUSTER_SIZE = 5
const LONG_PRESS_MS = 500

const CATEGORY_COLORS = {
  SYSTEM: [0, 242, 255],
  COMMUNICATION: [57, 255, 20],
  MEDIA: [255, 0, 127],
  DEVTOOLS: [147, 130, 220],
  GAMES: [255, 165, 0],
  default: [100, 160, 255],
}

function getColor(cat) {
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS.default
}

function buildClusters(apps) {
  const clusters = []
  const byCat = {}
  apps.forEach((app, idx) => {
    const cat = app.cat || 'default'
    if (!byCat[cat]) byCat[cat] = []
    byCat[cat].push({ app, idx })
  })
  for (const items of Object.values(byCat)) {
    for (let i = 0; i < items.length; i += CLUSTER_SIZE) {
      clusters.push(items.slice(i, i + CLUSTER_SIZE))
    }
  }
  const orphans = []
  for (const cluster of clusters) {
    if (cluster.length < CLUSTER_SIZE) orphans.push(...cluster)
  }
  for (let i = 0; i < orphans.length; i += CLUSTER_SIZE) {
    const chunk = orphans.slice(i, i + CLUSTER_SIZE)
    if (chunk.length === CLUSTER_SIZE) clusters.push(chunk)
  }
  return clusters
}

export default function DrawerMesh({ filteredApps, showAppLabels, drawerIconSize, drawerTextSize = 100, activeLetter, setActiveLetter, onAppClick, onContextMenu }) {
  const canvasRef = useRef(null)
  const nodesRef = useRef([])
  const edgesRef = useRef([])
  const orbRef = useRef({ pulse: 0, scale: 1 })
  const dragRef = useRef({ active: false, nodeIdx: -1 })
  const pinchRef = useRef({ active: false, lastDist: 0 })
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1, targetX: 0, targetY: 0, targetZoom: 1, velX: 0, velY: 0 })
  const hoveredRef = useRef(-1)
  const longPressRef = useRef({ timer: null, nodeIdx: -1, startX: 0, startY: 0, fired: false })
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 })
  const iconImageCache = useRef({})

  const edges = useMemo(() => {
    if (filteredApps.length < 2) return []
    const result = []
    const clusters = buildClusters(filteredApps)
    const idxMap = {}
    filteredApps.forEach((app, i) => { idxMap[app.packageId] = i })
    for (const cluster of clusters) {
      for (let i = 0; i < cluster.length; i++) {
        for (let j = i + 1; j < cluster.length; j++) {
          const a = idxMap[cluster[i].app.packageId]
          const b = idxMap[cluster[j].app.packageId]
          if (a !== undefined && b !== undefined) result.push({ a, b, strength: 0.8 })
        }
      }
    }
    return result
  }, [filteredApps])

  useEffect(() => {
    const n = filteredApps.length
    if (n === 0) { nodesRef.current = []; return }
    const existing = nodesRef.current
    const clusters = buildClusters(filteredApps)
    const newNodes = filteredApps.map((app, i) => {
      if (existing[i]) return { ...existing[i], app, idx: i }
      let clusterIdx = 0, posInCluster = 0, clusterCount = 0
      for (let c = 0; c < clusters.length; c++) {
        const found = clusters[c].find(item => item.app.packageId === app.packageId)
        if (found) { clusterIdx = c; posInCluster = clusters[c].indexOf(found); clusterCount = clusters[c].length; break }
      }
      const clusterAngle = (clusterIdx / Math.max(1, clusters.length)) * Math.PI * 2
      const clusterRadius = 180 + (clusterIdx % 3) * 60
      const cx = Math.cos(clusterAngle) * clusterRadius
      const cy = Math.sin(clusterAngle) * clusterRadius
      const spreadAngle = clusterCount > 1 ? (posInCluster / (clusterCount - 1)) * Math.PI * 2 : 0
      const spreadRadius = clusterCount > 1 ? 50 : 0
      return { x: cx + Math.cos(spreadAngle) * spreadRadius + (Math.random() - 0.5) * 20, y: cy + Math.sin(spreadAngle) * spreadRadius + (Math.random() - 0.5) * 20, vx: 0, vy: 0, app, idx: i, glow: 0, scale: 1 }
    })
    nodesRef.current = newNodes
    edgesRef.current = edges
  }, [filteredApps, edges])

  useEffect(() => {
    filteredApps.forEach(app => {
      if (app.icon && app.icon.startsWith('data:') && !iconImageCache.current[app.packageId]) {
        const img = new Image()
        img.src = app.icon
        img.onload = () => { iconImageCache.current[app.packageId] = img }
      }
    })
  }, [filteredApps])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let running = true
    let w, h
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const rect = canvas.getBoundingClientRect()
      w = rect.width; h = rect.height
      canvas.width = w * dpr; canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const tick = () => {
      if (!running) return
      const nodes = nodesRef.current
      const edgeList = edgesRef.current
      const cam = cameraRef.current
      const orb = orbRef.current

      if (!dragRef.current.active) {
        cam.x += cam.velX
        cam.y += cam.velY
        cam.velX *= 0.9
        cam.velY *= 0.9
        if (Math.abs(cam.velX) < 0.1) cam.velX = 0
        if (Math.abs(cam.velY) < 0.1) cam.velY = 0
      }
      cam.x += (cam.targetX - cam.x) * 0.2
      cam.y += (cam.targetY - cam.y) * 0.2
      cam.zoom += (cam.targetZoom - cam.zoom) * 0.18

      orb.pulse += 0.03
      orb.scale = 1 + Math.sin(orb.pulse) * 0.08

      const simSpeed = dragRef.current.active ? 0.5 : 0.25
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        if (dragRef.current.active && dragRef.current.nodeIdx === i) continue
        let fx = 0, fy = 0
        for (let j = 0; j < nodes.length; j++) {
          if (i === j) continue
          const dx = node.x - nodes[j].x
          const dy = node.y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy) + 1
          const force = 900 / (dist * dist)
          fx += (dx / dist) * force
          fy += (dy / dist) * force
        }
        for (const edge of edgeList) {
          let other = -1
          if (edge.a === i) other = edge.b
          else if (edge.b === i) other = edge.a
          if (other === -1) continue
          const dx = nodes[other].x - node.x
          const dy = nodes[other].y - node.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const force = (dist - 80) * 0.012 * edge.strength
          fx += (dx / dist) * force
          fy += (dy / dist) * force
        }
        fx += -node.x * 0.004
        fy += -node.y * 0.004
        node.vx = (node.vx + fx * simSpeed) * 0.78
        node.vy = (node.vy + fy * simSpeed) * 0.78
        node.x += node.vx
        node.y += node.vy
      }

      ctx.clearRect(0, 0, w, h)
      ctx.save()
      ctx.translate(w / 2 + cam.x, h / 2 + cam.y)
      ctx.scale(cam.zoom, cam.zoom)

      const orbRadius = 30 * orb.scale
      const orbGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, orbRadius * 2)
      orbGrad.addColorStop(0, 'rgba(0, 242, 255, 0.5)')
      orbGrad.addColorStop(0.3, 'rgba(0, 242, 255, 0.15)')
      orbGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = orbGrad
      ctx.beginPath()
      ctx.arc(0, 0, orbRadius * 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(0, 242, 255, 0.8)'
      ctx.beginPath()
      ctx.arc(0, 0, orbRadius * 0.35, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(0, 242, 255, 0.2)'
      ctx.lineWidth = 0.8
      for (let r = 0; r < 3; r++) {
        ctx.globalAlpha = 0.12 - r * 0.03 + Math.sin(orb.pulse + r) * 0.04
        ctx.beginPath()
        ctx.arc(0, 0, orbRadius * (0.7 + r * 0.4), 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.globalAlpha = 1

      for (const edge of edgeList) {
        const a = nodes[edge.a], b = nodes[edge.b]
        if (!a || !b) continue
        const col = getColor(filteredApps[edge.a]?.cat || 'default')
        const pulse = Math.sin(orb.pulse * 2 + edge.a * 0.3) * 0.15 + 0.2
        ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${pulse})`
        ctx.lineWidth = 1.5 * edge.strength
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
        const sp = Math.sin(orb.pulse * 3 + edge.a + edge.b) * 0.5 + 0.5
        ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${sp * 0.35})`
        ctx.beginPath()
        ctx.arc(mx, my, 1.5, 0, Math.PI * 2)
        ctx.fill()
      }

      const iconSize = 48 * (drawerIconSize / 100)
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        const isHovered = i === hoveredRef.current
        const isDragged = dragRef.current.active && dragRef.current.nodeIdx === i
        const col = getColor(node.app.cat || 'default')
        const nodeScale = isDragged ? 1.2 : isHovered ? 1.1 : 1
        const drawSize = iconSize * nodeScale
        const dist = Math.sqrt(node.x * node.x + node.y * node.y)
        const alpha = Math.max(0.25, 1 - (dist / 350) * 0.5)
        ctx.globalAlpha = alpha

        const glowRadius = drawSize * 0.75
        const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowRadius)
        glow.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},0.12)`)
        glow.addColorStop(1, 'transparent')
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${isHovered ? 0.25 : 0.1})`
        ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${isHovered ? 0.75 : 0.3})`
        ctx.lineWidth = isHovered ? 1.5 : 1
        ctx.beginPath()
        ctx.arc(node.x, node.y, drawSize / 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        const cachedImg = iconImageCache.current[node.app.packageId]
        if (cachedImg) {
          const imgSize = drawSize * 0.55
          ctx.drawImage(cachedImg, node.x - imgSize / 2, node.y - imgSize / 2, imgSize, imgSize)
        } else {
          const initial = (node.app.label || '?')[0].toUpperCase()
          ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},0.8)`
          ctx.font = `bold ${14 * nodeScale}px monospace`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(initial, node.x, node.y)
        }
      }

      ctx.globalAlpha = 1
      ctx.restore()
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    return () => { running = false; ro.disconnect() }
  }, [filteredApps, showAppLabels, drawerIconSize, drawerTextSize])

  const screenToWorld = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const cam = cameraRef.current
    return { x: (clientX - rect.left - rect.width / 2 - cam.x) / cam.zoom, y: (clientY - rect.top - rect.height / 2 - cam.y) / cam.zoom }
  }, [])

  const hitTest = useCallback((clientX, clientY) => {
    const world = screenToWorld(clientX, clientY)
    const nodes = nodesRef.current
    let best = -1, bestDist = Infinity
    for (let i = 0; i < nodes.length; i++) {
      const dx = world.x - nodes[i].x, dy = world.y - nodes[i].y
      const dist = dx * dx + dy * dy
      if (dist < 900 && dist < bestDist) { best = i; bestDist = dist }
    }
    return best
  }, [screenToWorld])

  const clearLongPress = useCallback(() => {
    if (longPressRef.current.timer) { clearTimeout(longPressRef.current.timer); longPressRef.current.timer = null }
    longPressRef.current.nodeIdx = -1
    longPressRef.current.fired = false
  }, [])

  const startLongPress = useCallback((clientX, clientY) => {
    const hit = hitTest(clientX, clientY)
    if (hit === -1) return
    longPressRef.current = { timer: setTimeout(() => {
      if (longPressRef.current.fired) return
      longPressRef.current.fired = true
      const app = nodesRef.current[hit]?.app
      if (app && onContextMenu) {
        if (navigator.vibrate) navigator.vibrate(40)
        onContextMenu({ clientX, clientY, preventDefault: () => {}, stopPropagation: () => {} }, app)
      }
    }, LONG_PRESS_MS), nodeIdx: hit, startX: clientX, startY: clientY, fired: false }
  }, [hitTest, onContextMenu])

  const handleTouchStart = useCallback((e) => {
    e.stopPropagation()
    if (e.touches && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      pinchRef.current = { active: true, lastDist: Math.sqrt(dx * dx + dy * dy) }
      dragRef.current.active = false
      cameraRef.current.velX = 0; cameraRef.current.velY = 0
      clearLongPress()
      return
    }
    if (e.touches && e.touches.length === 1) {
      const touch = e.touches[0]
      const hit = hitTest(touch.clientX, touch.clientY)
      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() }
      cameraRef.current.velX = 0; cameraRef.current.velY = 0
      if (hit !== -1) {
        const node = nodesRef.current[hit]
        const world = screenToWorld(touch.clientX, touch.clientY)
        dragRef.current = { active: true, nodeIdx: hit, offsetX: world.x - node.x, offsetY: world.y - node.y, moved: false }
        startLongPress(touch.clientX, touch.clientY)
      } else {
        dragRef.current = { active: true, nodeIdx: -1, moved: false, lastX: touch.clientX, lastY: touch.clientY, lastTime: Date.now() }
      }
    }
  }, [hitTest, screenToWorld, startLongPress, clearLongPress])

  const handleTouchMove = useCallback((e) => {
    e.stopPropagation()
    if (pinchRef.current.active && e.touches && e.touches.length === 2) {
      e.preventDefault()
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const scale = dist / pinchRef.current.lastDist
      const cam = cameraRef.current
      const newZoom = Math.min(3, Math.max(0.4, cam.targetZoom * scale))
      const canvas = canvasRef.current
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        const pivotX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left - rect.width / 2
        const pivotY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top - rect.height / 2
        const zr = newZoom / cam.targetZoom
        cam.targetX = pivotX - (pivotX - cam.targetX) * zr
        cam.targetY = pivotY - (pivotY - cam.targetY) * zr
      }
      cam.targetZoom = newZoom
      pinchRef.current.lastDist = dist
      clearLongPress()
      return
    }
    if (dragRef.current.active && e.touches && e.touches.length === 1) {
      e.preventDefault()
      const touch = e.touches[0]
      if (longPressRef.current.nodeIdx !== -1) {
        const dx = touch.clientX - longPressRef.current.startX
        const dy = touch.clientY - longPressRef.current.startY
        if (Math.sqrt(dx * dx + dy * dy) > 15) clearLongPress()
      }
      if (dragRef.current.nodeIdx !== -1) {
        const world = screenToWorld(touch.clientX, touch.clientY)
        const node = nodesRef.current[dragRef.current.nodeIdx]
        node.x = world.x - dragRef.current.offsetX
        node.y = world.y - dragRef.current.offsetY
        node.vx = 0; node.vy = 0
        dragRef.current.moved = true
      } else {
        const dx = touch.clientX - dragRef.current.lastX
        const dy = touch.clientY - dragRef.current.lastY
        const now = Date.now()
        const dt = Math.max(1, now - dragRef.current.lastTime)
        cameraRef.current.targetX += dx
        cameraRef.current.targetY += dy
        cameraRef.current.x += dx
        cameraRef.current.y += dy
        cameraRef.current.velX = (dx / dt) * 16
        cameraRef.current.velY = (dy / dt) * 16
        dragRef.current.moved = true
        dragRef.current.lastX = touch.clientX
        dragRef.current.lastY = touch.clientY
        dragRef.current.lastTime = now
      }
    }
  }, [screenToWorld, clearLongPress])

  const handleTouchEnd = useCallback((e) => {
    e.stopPropagation()
    const wasLongPressFired = longPressRef.current.fired
    clearLongPress()
    if (!dragRef.current.moved && dragRef.current.nodeIdx !== -1 && !wasLongPressFired) {
      const app = nodesRef.current[dragRef.current.nodeIdx]?.app
      if (app) {
        const elapsed = Date.now() - touchStartRef.current.time
        if (elapsed < 300) onAppClick(e, app)
      }
    }
    dragRef.current.active = false
    dragRef.current.nodeIdx = -1
    pinchRef.current.active = false
    hoveredRef.current = -1
  }, [onAppClick, clearLongPress])

  const handleMouseDown = useCallback((e) => {
    const hit = hitTest(e.clientX, e.clientY)
    cameraRef.current.velX = 0; cameraRef.current.velY = 0
    if (hit !== -1) {
      const node = nodesRef.current[hit]
      const world = screenToWorld(e.clientX, e.clientY)
      dragRef.current = { active: true, nodeIdx: hit, offsetX: world.x - node.x, offsetY: world.y - node.y, moved: false }
      startLongPress(e.clientX, e.clientY)
    } else {
      dragRef.current = { active: true, nodeIdx: -1, moved: false, lastX: e.clientX, lastY: e.clientY, lastTime: Date.now() }
    }
  }, [hitTest, screenToWorld, startLongPress])

  const handleMouseMove = useCallback((e) => {
    if (!dragRef.current.active) {
      const hit = hitTest(e.clientX, e.clientY)
      hoveredRef.current = hit
      canvasRef.current.style.cursor = hit !== -1 ? 'pointer' : 'grab'
      return
    }
    if (longPressRef.current.nodeIdx !== -1) {
      const dx = e.clientX - longPressRef.current.startX
      const dy = e.clientY - longPressRef.current.startY
      if (Math.sqrt(dx * dx + dy * dy) > 15) clearLongPress()
    }
    if (dragRef.current.nodeIdx !== -1) {
      const world = screenToWorld(e.clientX, e.clientY)
      const node = nodesRef.current[dragRef.current.nodeIdx]
      node.x = world.x - dragRef.current.offsetX
      node.y = world.y - dragRef.current.offsetY
      node.vx = 0; node.vy = 0
      dragRef.current.moved = true
    } else {
      const dx = e.clientX - dragRef.current.lastX
      const dy = e.clientY - dragRef.current.lastY
      const now = Date.now()
      const dt = Math.max(1, now - dragRef.current.lastTime)
      cameraRef.current.targetX += dx
      cameraRef.current.targetY += dy
      cameraRef.current.x += dx
      cameraRef.current.y += dy
      cameraRef.current.velX = (dx / dt) * 16
      cameraRef.current.velY = (dy / dt) * 16
      dragRef.current.moved = true
      dragRef.current.lastX = e.clientX
      dragRef.current.lastY = e.clientY
      dragRef.current.lastTime = now
    }
  }, [hitTest, screenToWorld, clearLongPress])

  const handleMouseUp = useCallback((e) => {
    const wasLongPressFired = longPressRef.current.fired
    clearLongPress()
    if (!dragRef.current.moved && dragRef.current.nodeIdx !== -1 && !wasLongPressFired) {
      const app = nodesRef.current[dragRef.current.nodeIdx]?.app
      if (app) onAppClick(e, app)
    }
    dragRef.current.active = false
    dragRef.current.nodeIdx = -1
    hoveredRef.current = -1
  }, [onAppClick, clearLongPress])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const cam = cameraRef.current
    const newZoom = Math.min(3, Math.max(0.4, cam.targetZoom - e.deltaY * 0.001))
    const canvas = canvasRef.current
    if (canvas) {
      const rect = canvas.getBoundingClientRect()
      const pivotX = e.clientX - rect.left - rect.width / 2
      const pivotY = e.clientY - rect.top - rect.height / 2
      const zr = newZoom / cam.targetZoom
      cam.targetX = pivotX - (pivotX - cam.targetX) * zr
      cam.targetY = pivotY - (pivotY - cam.targetY) * zr
    }
    cam.targetZoom = newZoom
  }, [])

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col overflow-hidden select-none pointer-events-auto pb-20"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas
        ref={canvasRef}
        className="w-full flex-1 min-h-0"
        style={{ touchAction: 'none', cursor: 'grab' }}
      />
      <LetterFilterBar activeLetter={activeLetter} setActiveLetter={setActiveLetter} />
    </div>
  )
}
