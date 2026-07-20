import React, { useRef, useEffect, useCallback, useMemo } from 'react'
import LetterFilterBar from './LetterFilterBar'

const CLUSTER_SIZE = 5
const LONG_PRESS_MS = 500

const HUD_SVG_PATHS = {
  'com.android.chrome': 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
  'com.google.android.dialer': 'M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z',
  'com.google.android.apps.messaging': 'M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z',
  'com.google.android.GoogleCamera': 'M4 4h3l2-2h6l2 2h3c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm8 3c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8c-1.65 0-3-1.35-3-3s1.35-3 3-3 3 1.35 3 3-1.35 3-3 3z',
  'com.android.settings': 'M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z',
  'com.google.android.apps.maps': 'M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z',
  'com.google.android.youtube': 'M21.58 7.19c-.23-.86-.91-1.54-1.77-1.77C18.25 5 12 5 12 5s-6.25 0-7.81.42c-.86.23-1.54.91-1.77 1.77C2 8.75 2 12 2 12s0 3.25.42 4.81c.23.86.91 1.54 1.77 1.77C5.75 19 12 19 12 19s6.25 0 7.81-.42c.86-.23 1.54-.91 1.77-1.77C22 15.25 22 12 22 12s0-3.25-.42-4.81zM10 15V9l5.2 3-5.2 3z',
  'com.google.android.gm': 'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
  'com.google.android.apps.photos': 'M22 16V4c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2zm-11-4l2.03 2.71L16 11l4 5H8l3-4zM2 6v14c0 1.1.9 2 2 2h14v-2H4V6H2z',
  'com.android.vending': 'M19.14 11.23L4.47 2.45c-.32-.19-.74-.11-.93.21-.06.1-.09.21-.09.33v18.02c0 .37.3.67.67.67.11 0 .22-.03.32-.09l14.67-8.78c.32-.19.43-.61.24-.93-.05-.09-.13-.17-.21-.23z',
  'com.google.android.deskclock': 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z',
  'com.google.android.calendar': 'M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z',
  'com.google.android.calculator': 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5.9 3.5v2h2v-2h-2zm-4.3 0v2h2v-2h-2zm-4.3 0v2h2v-2h-2zm12.9 12h-2v-2h2v2zm0-4.3h-2v-2h2v2zm-4.3 4.3h-2v-2h2v2zm0-4.3h-2v-2h2v2zm-4.3 4.3h-2v-2h2v2zm0-4.3h-2v-2h2v2z',
}

const HUD_COLOR = [0, 242, 255]

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
  apps.forEach((app) => {
    const cat = app.cat || 'default'
    if (!byCat[cat]) byCat[cat] = []
    byCat[cat].push(app)
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

function DrawerMesh({ filteredApps, showAppLabels, drawerIconSize = 100, drawerTextSize = 100, activeLetter, setActiveLetter, onAppClick, onContextMenu }) {
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
      if (iconImageCache.current['hud_' + pkg] || iconImageCache.current['nat_' + pkg]) return
      if (HUD_SVG_PATHS[pkg]) {
        const svg = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="' + HUD_SVG_PATHS[pkg] + '" fill="%2300f2ff"/></svg>'
        const img = new Image()
        img.onload = () => { if (mounted) { iconImageCache.current['hud_' + pkg] = img; dirtyRef.current = true } }
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
      }
      if (app.icon && app.icon.startsWith('data:')) {
        const img = new Image()
        img.onload = () => { if (mounted) { iconImageCache.current['nat_' + pkg] = img; dirtyRef.current = true } }
        img.src = app.icon
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
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
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

      let hasMovingNodes = false
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
        if (Math.abs(node.vx) > 0.02 || Math.abs(node.vy) > 0.02) hasMovingNodes = true
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
          if (hudImg) {
            const imgS = drawSize * 0.55
            ctx.drawImage(hudImg, node.x - imgS * 0.5, node.y - imgS * 0.5, imgS, imgS)
          } else if (natImg) {
            const imgS = drawSize * 0.5
            ctx.drawImage(natImg, node.x - imgS * 0.5, node.y - imgS * 0.5, imgS, imgS)
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
        if (navigator.vibrate) navigator.vibrate(40)
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
        dragRef.current = { active: true, nodeIdx: hit, offsetX: world.x - node.x, offsetY: world.y - node.y, moved: false }
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
        if (elapsed < 300) onAppClick({ clientX: endX, clientY: endY, preventDefault() {}, stopPropagation() {} }, app)
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
      dragRef.current = { active: true, nodeIdx: hit, offsetX: world.x - node.x, offsetY: world.y - node.y, moved: false }
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

export default React.memo(DrawerMesh)
