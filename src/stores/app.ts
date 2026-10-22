import { defineStore } from 'pinia'
import { getStats } from '../utils/stats'

export const useAppStore = defineStore('app', {
  state: () => ({
    sidebarCollapsed: false,
    // 以下全部由 Dexie 真实数据驱动，进入 Dashboard 时 refresh()
    todayReviewCount: 0,
    streak: 0,
    totalCards: 0,
    masteredCount: 0
  }),

  actions: {
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
    },
    /** 从数据库拉取最新统计 */
    async refresh() {
      const s = await getStats()
      this.todayReviewCount = s.todayDue
      this.streak = s.streak
      this.totalCards = s.totalCards
      this.masteredCount = s.masteredCount
    }
  }
})
