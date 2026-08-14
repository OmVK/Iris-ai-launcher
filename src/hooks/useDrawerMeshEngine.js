import { useRef, useEffect, useCallback, useMemo } from 'react'
import HapticFeedback from '../utils/HapticFeedback'
import { HUD_SVG_PATHS, HUD_COLOR } from '../components/drawer/drawerMeshData'
import { buildClusters, getColor, LONG_PRESS_MS } from '../components/drawer/drawerMeshUtils'

export default function useDrawerMeshEngine({ filteredApps, showAppLabels, drawerIconSize = 100, onAppClick, onContextMenu }) {
  const canvasRef = useRef(null)
  const nodesRef = useRef([])
  const edgesRef = useRef([])
  const orbRef = useRef({ pulse: 0 })
  const dragRef = useRef({ active: false, nodeIdx: -1 })
  const pinchRef = useRef({ active: false, lastDist: 0 })
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1, targetX: 0, targetY: 0, targetZoom: 1, velX: 0, velY: 0 })
  const hoveredRef = useRef(-1)
  const longPressRef = useRef({ timer: null, nodeIdx: -1, startX: 0, startY: 0, fired: false })
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 })
  const iconImageCache = useRef({})
  const dirtyRef = useRef(true)
  const rafRef = useRef(null)
  const camVelRef = useRef(false)
  const timeRef = useRef(0)
  const lastInteractRef = useRef(Date.now())

  const edges = useMemo(() => {
    if (filteredApps.length < 2) return []
    const result = []
    const clusters = buildClusters(filteredApps)
    const idxMap = {}
    filteredApps.forEach((app, i) => { idxMap[app.packageId] = i })
    for (const cluster of clusters) {
      for (let i = 0; i < cluster.length; i++) {
        for (let j = i + 1; j < cluster.length; j++) {
          const a = idxMap[cluster[i].packageId]
          const b = idxMap[cluster[j].packageId]
          if (a !== undefined && b !== undefined) result.push({ a, b })
        }
      }
    }
    return result
  }, [filteredApps])

  useEffect(() => {
    const n = filteredApps.length
    if (n === 0) { nodesRef.current = []; dirtyRef.current = true; return }
    const existing = nodesRef.current
    const clusters = buildClusters(filteredApps)
    const newNodes = filteredApps.map((app, i) => {
      if (existing[i] && existing[i].app.packageId === app.packageId) return { ...existing[i], app, idx: i }
      let clusterIdx = 0, posInCluster = 0, clusterCount = 0
      for (let c = 0; c < clusters.length; c++) {
        const found = clusters[c].find(item => item.packageId === app.packageId)
        if (found) { clusterIdx = c; posInCluster = clusters[c].indexOf(found); clusterCount = clusters[c].length; break }
      }
      const clusterAngle = (clusterIdx / Math.max(1, clusters.length)) * Math.PI * 2
      const clusterRadius = 150 + (clusterIdx % 3) * 50
      const cx = Math.cos(clusterAngle) * clusterRadius
      const cy = Math.sin(clusterAngle) * clusterRadius
      const spreadAngle = clusterCount > 1 ? (posInCluster / (clusterCount - 1)) * Math.PI * 2 : 0
      const spreadRadius = clusterCount > 1 ? 40 : 0
      return { x: cx + Math.cos(spreadAngle) * spreadRadius, y: cy + Math.sin(spreadAngle) * spreadRadius, vx: 0, vy: 0, app, idx: i }
    })
    nodesRef.current = newNodes
    edgesRef.current = edges
    dirtyRef.current = true
  }, [filteredApps, edges])

  useEffect(() => {
    let mounted = true
    filteredApps.forEach(app => {
      const pkg = app.packageId
      const iconKey = 'nat_' + pkg
      if (app.icon && (typeof app.icon === 'string') && (app.icon.startsWith('data:') || app.icon.startsWith('http') || app.icon.startsWith('/'))) {
        if (!iconImageCache.current[iconKey] || iconImageCache.current[iconKey]._src !== app.icon) {
          const img = new Image()
          img.onload = () => {
            if (mounted) {
              img._src = app.icon
              iconImageCache.current[iconKey] = img
              dirtyRef.current = true
            }
          }
          img.src = app.icon
        }
      } else if (HUD_SVG_PATHS[pkg] && !iconImageCache.current['hud_' + pkg]) {
        const svg = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="' + HUD_SVG_PATHS[pkg] + '" fill="%2300f2ff"/></svg>'
        const img = new Image()
        img.onload = () => { if (mounted) { iconImageCache.current['hud_' + pkg] = img; dirtyRef.current = true } }
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
      }
    })
    return () => { mounted = false }
  }, [filteredApps])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true })
    let running = true
    let w, h
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas.getBoundingClientRect()
      w = rect.width; h = rect.height
      canvas.width = w * dpr; canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      dirtyRef.current = true
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const colCache = {}
    const getColStr = (col, a) => {
      const key = col[0] + ',' + col[1] + ',' + col[2] + ',' + a
      if (!colCache[key]) colCache[key] = 'rgba(' + key + ')'
      return colCache[key]
    }

    const render = () => {
      if (!running) return

      const now = Date.now()
      const idleMs = now - lastInteractRef.current
      const isIdle = idleMs > 3000
      if (isIdle) {
        rafRef.current = setTimeout(() => { rafRef.current = requestAnimationFrame(render) }, 100)
      } else {
        rafRef.current = requestAnimationFrame(render)
      }

      const nodes = nodesRef.current
      const edgeList = edgesRef.current
      const cam = cameraRef.current
      const orb = orbRef.current
      const isDragging = dragRef.current.active

      const camMoving = Math.abs(cam.velX) > 0.05 || Math.abs(cam.velY) > 0.05 || Math.abs(cam.targetX - cam.x) > 0.05 || Math.abs(cam.targetY - cam.y) > 0.05 || Math.abs(cam.targetZoom - cam.zoom) > 0.001
      if (!isDragging && camVelRef.current && !camMoving) {
        cam.velX = 0; cam.velY = 0
        camVelRef.current = false
      }
      if (camMoving) { camVelRef.current = true; dirtyRef.current = true }

      if (!isDragging && camVelRef.current) {
        cam.x += cam.velX
        cam.y += cam.velY
        cam.velX *= 0.92
        cam.velY *= 0.92
        if (Math.abs(cam.velX) < 0.05) cam.velX = 0
        if (Math.abs(cam.velY) < 0.05) cam.velY = 0
      }
      cam.x += (cam.targetX - cam.x) * 0.25
      cam.y += (cam.targetY - cam.y) * 0.25
      cam.zoom += (cam.targetZoom - cam.zoom) * 0.2

      if (isDragging) dirtyRef.current = true

      const simSpeed = isDragging ? 0.5 : isIdle ? 0.04 : 0.15
      const nLen = nodes.length
      const dragIdx = isDragging ? dragRef.current.nodeIdx : -1
      timeRef.current += 0.016
      for (let i = 0; i < nLen; i++) {
        const node = nodes[i]
        if (i === dragIdx) continue
        let fx = 0, fy = 0
        for (let j = 0; j < nLen; j++) {
          if (i === j) continue
          const dx = node.x - nodes[j].x
          const dy = node.y - nodes[j].y
          const distSq = dx * dx + dy * dy
          if (distSq > 40000 || distSq < 1) continue
          const invDist = 1 / Math.sqrt(distSq)
          fx += dx * invDist * 900 * invDist * invDist
          fy += dy * invDist * 900 * invDist * invDist
        }
        for (let e = 0; e < edgeList.length; e++) {
          const edge = edgeList[e]
          let other = -1
          if (edge.a === i) other = edge.b
          else if (edge.b === i) other = edge.a
          if (other === -1) continue
          const dx = nodes[other].x - node.x
          const dy = nodes[other].y - node.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const force = (dist - 80) * 0.012
          fx += (dx / dist) * force
          fy += (dy / dist) * force
        }
        fx += -node.x * 0.004
        fy += -node.y * 0.004
        const idlePhase = timeRef.current + i * 0.7
        fx += Math.sin(idlePhase * 0.5) * 0.8
        fy += Math.cos(idlePhase * 0.7) * 0.6
        node.vx = (node.vx + fx * simSpeed) * 0.82
        node.vy = (node.vy + fy * simSpeed) * 0.82
        node.x += node.vx
        node.y += node.vy
      }
      dirtyRef.current = true

      orb.pulse += 0.04

      if (!dirtyRef.current) return
      dirtyRef.current = false

      const halfW = w * 0.5 + cam.x
      const halfH = h * 0.5 + cam.y
      const zoom = cam.zoom
      const invZoom = 1 / zoom

      ctx.clearRect(0, 0, w, h)
      ctx.save()
      ctx.translate(halfW, halfH)
      ctx.scale(zoom, zoom)

      const orbR = 30 * (1 + Math.sin(orb.pulse) * 0.08)
      ctx.fillStyle = 'rgba(0,242,255,0.15)'
      ctx.beginPath()
      ctx.arc(0, 0, orbR * 2, 0, 6.283)
      ctx.fill()
      ctx.fillStyle = 'rgba(0,242,255,0.8)'
      ctx.beginPath()
      ctx.arc(0, 0, orbR * 0.35, 0, 6.283)
      ctx.fill()

      const viewL = (-halfW * invZoom) - 60
      const viewR = ((w - halfW) * invZoom) + 60
      const viewT = (-halfH * invZoom) - 60
      const viewB = ((h - halfH) * invZoom) + 60

      ctx.lineWidth = 1.5
      for (let e = 0; e < edgeList.length; e++) {
        const edge = edgeList[e]
        const a = nodes[edge.a], b = nodes[edge.b]
        if (!a || !b) continue
        if ((a.x < viewL && b.x < viewL) || (a.x > viewR && b.x > viewR)) continue
        if ((a.y < viewT && b.y < viewT) || (a.y > viewB && b.y > viewB)) continue
        const col = getColor(filteredApps[edge.a]?.cat || 'default')
        ctx.strokeStyle = getColStr(col, 0.2)
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      }

      const iconSize = 48 * (drawerIconSize / 100)
      const useHud = window.useGlobalHudIcons !== false
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = 'bold 16px "JetBrains Mono", monospace'

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        if (node.x < viewL || node.x > viewR || node.y < viewT || node.y > viewB) continue

        const isHovered = i === hoveredRef.current
        const isDraggedItem = isDragging && dragRef.current.nodeIdx === i
        const col = useHud ? HUD_COLOR : getColor(node.app.cat || 'default')
        const scale = isDraggedItem ? 1.2 : isHovered ? 1.1 : 1
        const drawSize = iconSize * scale
        const r = drawSize * 0.5
        const dist = Math.sqrt(node.x * node.x + node.y * node.y)
        ctx.globalAlpha = Math.max(0.3, 1 - (dist / 350) * 0.5)

        if (useHud) {
          ctx.fillStyle = getColStr(col, 0.06)
          ctx.beginPath()
          ctx.arc(node.x, node.y, r, 0, 6.283)
          ctx.fill()

          ctx.strokeStyle = getColStr(col, isHovered ? 0.9 : 0.4)
          ctx.lineWidth = isHovered ? 2 : 1.2
          ctx.beginPath()
          ctx.arc(node.x, node.y, r, 0, 6.283)
          ctx.stroke()

          const hudImg = iconImageCache.current['hud_' + node.app.packageId]
          const natImg = iconImageCache.current['nat_' + node.app.packageId]
          if (natImg) {
            const imgS = drawSize * 0.55
            ctx.drawImage(natImg, node.x - imgS * 0.5, node.y - imgS * 0.5, imgS, imgS)
          } else if (hudImg) {
            const imgS = drawSize * 0.55
            ctx.drawImage(hudImg, node.x - imgS * 0.5, node.y - imgS * 0.5, imgS, imgS)
          } else {
            ctx.fillStyle = getColStr(col, 0.9)
            ctx.fillText((node.app.label || '?')[0].toUpperCase(), node.x, node.y)
          }
        } else {
          ctx.fillStyle = getColStr(col, isHovered ? 0.25 : 0.1)
          ctx.strokeStyle = getColStr(col, isHovered ? 0.75 : 0.3)
          ctx.lineWidth = isHovered ? 1.5 : 1
          ctx.beginPath()
          ctx.arc(node.x, node.y, r, 0, 6.283)
          ctx.fill()
          ctx.stroke()

          const natImg = iconImageCache.current['nat_' + node.app.packageId]
          if (natImg) {
            const imgS = drawSize * 0.55
            ctx.drawImage(natImg, node.x - imgS * 0.5, node.y - imgS * 0.5, imgS, imgS)
          } else {
            ctx.fillStyle = getColStr(col, 0.8)
            ctx.fillText((node.app.label || '?')[0].toUpperCase(), node.x, node.y)
          }
        }
      }

      ctx.globalAlpha = 1
      ctx.restore()
    }
    rafRef.current = requestAnimationFrame(render)
    return () => { running = false; if (rafRef.current) { cancelAnimationFrame(rafRef.current); clearTimeout(rafRef.current) } ro.disconnect() }
  }, [filteredApps, showAppLabels, drawerIconSize])

  const markDirty = useCallback(() => { dirtyRef.current = true; lastInteractRef.current = Date.now() }, [])

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
      dragRef.current.moved = true
      const app = nodesRef.current[hit]?.app
      if (app && onContextMenu) {
        HapticFeedback.medium()
        onContextMenu({ clientX, clientY, preventDefault() {}, stopPropagation() {} }, app)
      }
    }, LONG_PRESS_MS), nodeIdx: hit, startX: clientX, startY: clientY, fired: false }
  }, [hitTest, onContextMenu])

  const handleTouchStart = useCallback((e) => {
    e.stopPropagation()
    lastInteractRef.current = Date.now()
    if (e.touches && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      pinchRef.current = { active: true, lastDist: Math.sqrt(dx * dx + dy * dy) }
      dragRef.current.active = false
      cameraRef.current.velX = 0; cameraRef.current.velY = 0
      clearLongPress()
      markDirty()
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
        dragRef.current = { active: true, nodeIdx: hit, offsetX: world.x - node.x, offsetY: world.y - node.y, moved: false, startNodeX: node.x, startNodeY: node.y }
        startLongPress(touch.clientX, touch.clientY)
      } else {
        dragRef.current = { active: true, nodeIdx: -1, moved: false, lastX: touch.clientX, lastY: touch.clientY, lastTime: Date.now() }
      }
      markDirty()
    }
  }, [hitTest, screenToWorld, startLongPress, clearLongPress, markDirty])

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
        const prevX = node.x
        const prevY = node.y
        node.x = world.x - dragRef.current.offsetX
        node.y = world.y - dragRef.current.offsetY
        node.vx = 0; node.vy = 0
        const totalDx = node.x - (dragRef.current.startNodeX ?? prevX)
        const totalDy = node.y - (dragRef.current.startNodeY ?? prevY)
        if (!dragRef.current.moved && Math.sqrt(totalDx * totalDx + totalDy * totalDy) > 8) {
          dragRef.current.moved = true
        }
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
        if (!dragRef.current.moved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
          dragRef.current.moved = true
        }
        dragRef.current.lastX = touch.clientX
        dragRef.current.lastY = touch.clientY
        dragRef.current.lastTime = now
      }
      dirtyRef.current = true
    }
  }, [screenToWorld, clearLongPress])

  const handleTouchEnd = useCallback((e) => {
    e.stopPropagation()
    const wasLongPressFired = longPressRef.current.fired
    const endX = e.changedTouches ? e.changedTouches[0]?.clientX : 0
    const endY = e.changedTouches ? e.changedTouches[0]?.clientY : 0
    clearLongPress()
    if (!dragRef.current.moved && dragRef.current.nodeIdx !== -1 && !wasLongPressFired) {
      const app = nodesRef.current[dragRef.current.nodeIdx]?.app
      if (app) {
        const elapsed = Date.now() - touchStartRef.current.time
        if (elapsed < 500) onAppClick({ clientX: endX, clientY: endY, preventDefault() {}, stopPropagation() {} }, app)
      }
    }
    dragRef.current.active = false
    dragRef.current.nodeIdx = -1
    pinchRef.current.active = false
    hoveredRef.current = -1
    dirtyRef.current = true
  }, [onAppClick, clearLongPress])

  const handleMouseDown = useCallback((e) => {
    lastInteractRef.current = Date.now()
    const hit = hitTest(e.clientX, e.clientY)
    cameraRef.current.velX = 0; cameraRef.current.velY = 0
    if (hit !== -1) {
      const node = nodesRef.current[hit]
      const world = screenToWorld(e.clientX, e.clientY)
      dragRef.current = { active: true, nodeIdx: hit, offsetX: world.x - node.x, offsetY: world.y - node.y, moved: false, startNodeX: node.x, startNodeY: node.y }
      startLongPress(e.clientX, e.clientY)
    } else {
      dragRef.current = { active: true, nodeIdx: -1, moved: false, lastX: e.clientX, lastY: e.clientY, lastTime: Date.now() }
    }
    dirtyRef.current = true
  }, [hitTest, screenToWorld, startLongPress])

  const handleMouseMove = useCallback((e) => {
    if (!dragRef.current.active) {
      const hit = hitTest(e.clientX, e.clientY)
      const prev = hoveredRef.current
      hoveredRef.current = hit
      if (prev !== hit) dirtyRef.current = true
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
      const totalDx = node.x - (dragRef.current.startNodeX ?? node.x)
      const totalDy = node.y - (dragRef.current.startNodeY ?? node.y)
      if (!dragRef.current.moved && Math.sqrt(totalDx * totalDx + totalDy * totalDy) > 8) {
        dragRef.current.moved = true
      }
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
      if (!dragRef.current.moved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        dragRef.current.moved = true
      }
      dragRef.current.lastX = e.clientX
      dragRef.current.lastY = e.clientY
      dragRef.current.lastTime = now
    }
    dirtyRef.current = true
  }, [hitTest, screenToWorld, clearLongPress])

  const handleMouseUp = useCallback((e) => {
    const wasLongPressFired = longPressRef.current.fired
    clearLongPress()
    if (!dragRef.current.moved && dragRef.current.nodeIdx !== -1 && !wasLongPressFired) {
      const app = nodesRef.current[dragRef.current.nodeIdx]?.app
      if (app) onAppClick({ clientX: e.clientX, clientY: e.clientY, preventDefault() {}, stopPropagation() {} }, app)
    }
    dragRef.current.active = false
    dragRef.current.nodeIdx = -1
    hoveredRef.current = -1
    dirtyRef.current = true
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
    dirtyRef.current = true
  }, [])

  return {
    canvasRef,
    handlers: {
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd,
      handleMouseDown,
      handleMouseMove,
      handleMouseUp,
      handleWheel,
    },
  }
}
