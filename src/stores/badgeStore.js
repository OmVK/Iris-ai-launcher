import { create } from 'zustand'
import { BadgeStore } from '../utils/DataStore'

const useBadgeStore = create((set, get) => ({
  badgeCounts: {},
  totalUnread: 0,
  notifications: [],

  setBadgeData(data) {
    const badgeCounts = data?.badgeCounts || {}
    const totalUnread = data?.totalUnread || 0
    const notifications = data?.notifications || []

    set({ badgeCounts, totalUnread, notifications })

    BadgeStore.set('counts', badgeCounts).catch(() => {})
    BadgeStore.set('total', totalUnread).catch(() => {})
  },

  getBadgeCount(packageId) {
    return get().badgeCounts[packageId] || 0
  },

  hasBadge(packageId) {
    return (get().badgeCounts[packageId] || 0) > 0
  },

  clearBadge(packageId) {
    const counts = { ...get().badgeCounts }
    const prev = counts[packageId] || 0
    delete counts[packageId]
    set({
      badgeCounts: counts,
      totalUnread: Math.max(0, get().totalUnread - prev),
    })
  },

  clearAllBadges() {
    set({ badgeCounts: {}, totalUnread: 0 })
    BadgeStore.set('counts', {}).catch(() => {})
    BadgeStore.set('total', 0).catch(() => {})
  },

  async loadPersisted() {
    try {
      const counts = await BadgeStore.get('counts', {})
      const total = await BadgeStore.get('total', 0)
      set({ badgeCounts: counts, totalUnread: total })
    } catch (e) {
      // Ignore
    }
  },
}))

export default useBadgeStore
