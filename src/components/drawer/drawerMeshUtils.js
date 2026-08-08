export const CLUSTER_SIZE = 5
export const LONG_PRESS_MS = 500

const CATEGORY_COLORS = {
  SYSTEM: [0, 242, 255],
  COMMUNICATION: [57, 255, 20],
  MEDIA: [255, 0, 127],
  DEVTOOLS: [147, 130, 220],
  GAMES: [255, 165, 0],
  default: [100, 160, 255],
}

export function getColor(cat) {
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS.default
}

export function buildClusters(apps) {
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
