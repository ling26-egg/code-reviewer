import { defineStore } from 'pinia'
import { getStats, type UserStats } from '../utils/stats'

// ===== 段位配置 =====
const RANKS = [
  { name: '青铜', color: '#cd7f32', icon: '🥉', minExp: 0 },
  { name: '白银', color: '#c0c0c0', icon: '🥈', minExp: 500 },
  { name: '黄金', color: '#ffd700', icon: '🥇', minExp: 1500 },
  { name: '铂金', color: '#00d4ff', icon: '💎', minExp: 3500 },
  { name: '钻石', color: '#b9f2ff', icon: '💠', minExp: 7000 },
  { name: '王者', color: '#ff6b6b', icon: '👑', minExp: 12000 }
]

// ===== 勋章定义：condition 直接对真实统计求值 =====
export interface Medal {
  id: string
  name: string
  desc: string
  icon: string
  condition: (s: UserStats) => boolean
}

const MEDALS: Medal[] = [
  { id: 'beginner', name: '初心者', desc: '完成第一次复习', icon: '🌱', condition: s => s.totalReviews >= 1 },
  { id: 'scholar', name: '学者', desc: '掌握 10 个知识点', icon: '📚', condition: s => s.masteredCount >= 10 },
  { id: 'master', name: '大师', desc: '掌握 50 个知识点', icon: '🏆', condition: s => s.masteredCount >= 50 },
  { id: 'streak7', name: '坚持者', desc: '连续打卡 7 天', icon: '⚡', condition: s => s.streak >= 7 },
  { id: 'streak30', name: '火焰', desc: '连续打卡 30 天', icon: '🔥', condition: s => s.streak >= 30 },
  { id: 'review100', name: '百题斩', desc: '累计复习 100 次', icon: '💯', condition: s => s.totalReviews >= 100 },
  { id: 'review500', name: '千锤百炼', desc: '累计复习 500 次', icon: '⚔️', condition: s => s.totalReviews >= 500 },
  { id: 'perfect', name: '完美日', desc: '单日复习满 10 张', icon: '✨', condition: s => s.perfectDays >= 1 },
  { id: 'nightowl', name: '夜猫子', desc: '凌晨 0-5 点复习', icon: '🦉', condition: s => s.lastReviewHour >= 0 && s.lastReviewHour < 5 },
  { id: 'earlybird', name: '早起鸟', desc: '早上 5-8 点复习', icon: '🐦', condition: s => s.lastReviewHour >= 5 && s.lastReviewHour < 8 },
  { id: 'sprint', name: '冲刺', desc: '今天复习 20 张以上', icon: '🚀', condition: s => s.reviewToday >= 20 },
  { id: 'collector', name: '收藏家', desc: '拥有 100 个知识点', icon: '📦', condition: s => s.totalCards >= 100 }
]

export const useAchievementStore = defineStore('achievement', {
  state: () => ({
    stats: {
      totalCards: 0,
      totalReviews: 0,
      todayDue: 0,
      masteredCount: 0,
      streak: 0,
      reviewToday: 0,
      lastReviewHour: -1,
      perfectDays: 0
    } as UserStats,
    /** 经验 = 复习次数×10 + 掌握数×50，由真实数据推导，可随时重算 */
    exp: 0
  }),

  getters: {
    // 当前段位
    currentRank(state) {
      let rank = RANKS[0]
      for (const r of RANKS) {
        if (state.exp >= r.minExp) rank = r
      }
      return rank
    },
    // 当前段位内等级（1-5）
    currentLevel(): number {
      const rank = this.currentRank
      const nextRankIdx = RANKS.indexOf(rank) + 1
      const nextRank = RANKS[nextRankIdx]
      if (!nextRank) return 5
      const range = nextRank.minExp - rank.minExp
      const progress = this.exp - rank.minExp
      return Math.min(5, Math.floor((progress / range) * 5) + 1)
    },
    // 到下一级的进度百分比
    levelProgress(): number {
      const rank = this.currentRank
      const nextRankIdx = RANKS.indexOf(rank) + 1
      const nextRank = RANKS[nextRankIdx]
      if (!nextRank) return 100
      const range = nextRank.minExp - rank.minExp
      const progress = this.exp - rank.minExp
      return Math.min(100, Math.floor((progress / range) * 100))
    },
    // 下一段位需要的经验
    nextRankExp(): number {
      const rank = this.currentRank
      const nextRankIdx = RANKS.indexOf(rank) + 1
      const nextRank = RANKS[nextRankIdx]
      return nextRank ? nextRank.minExp : rank.minExp
    },
    // 所有勋章（实时按真实统计判定解锁状态）
    allMedals(state) {
      return MEDALS.map(m => ({
        ...m,
        unlocked: m.condition(state.stats)
      }))
    },
    unlockedCount(): number {
      return this.allMedals.filter(m => m.unlocked).length
    },
    totalMedals() {
      return MEDALS.length
    }
  },

  actions: {
    /** 从数据库刷新真实统计并重算经验 */
    async refresh() {
      this.stats = await getStats()
      this.exp = this.stats.totalReviews * 10 + this.stats.masteredCount * 50
    },
    /** 复习后调用：刷新统计，返回本次新解锁的勋章（用于弹通知） */
    async recordReview(): Promise<Medal[]> {
      const before = new Set(this.allMedals.filter(m => m.unlocked).map(m => m.id))
      await this.refresh()
      return this.allMedals.filter(m => m.unlocked && !before.has(m.id))
    },
    // 获取所有段位（用于展示）
    getAllRanks() {
      return RANKS
    }
  }
})
