import { defineStore } from 'pinia'

/**
 * 通知 store
 * - 来源：复习队列提醒 / 成就解锁 / 连续打卡里程碑
 * - 已读状态存 localStorage，未读数显示在铃铛红点
 */
const READ_KEY = 'code-reviewer-read-notifications'

export interface Notice {
  id: string           // 唯一标识（用于已读匹配）
  type: 'review' | 'achievement' | 'streak' | 'system'
  icon: string         // emoji
  title: string
  desc: string
  time: number         // 时间戳
}

function loadRead(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY)
    if (raw) return new Set(JSON.parse(raw))
  } catch { /* ignore */ }
  return new Set()
}

export const useNoticeStore = defineStore('notice', {
  state: () => ({
    notices: [] as Notice[],
    readIds: loadRead()
  }),
  getters: {
    unreadCount: (s) => s.notices.filter(n => !s.readIds.has(n.id)).length,
    hasUnread: (s) => s.notices.some(n => !s.readIds.has(n.id))
  },
  actions: {
    /** 把一组候选通知合并进来（按 id 去重，已存在的更新时间） */
    merge(candidates: Notice[]) {
      const map = new Map(this.notices.map(n => [n.id, n]))
      for (const c of candidates) {
        const existing = map.get(c.id)
        if (existing) {
          // 已存在则更新内容（比如待复习数量变化）
          existing.title = c.title
          existing.desc = c.desc
          existing.time = c.time
        } else {
          map.set(c.id, c)
        }
      }
      // 按时间倒序
      this.notices = [...map.values()].sort((a, b) => b.time - a.time)
    },
    markRead(id: string) {
      this.readIds.add(id)
      this.saveRead()
    },
    markAllRead() {
      this.notices.forEach(n => this.readIds.add(n.id))
      this.saveRead()
    },
    saveRead() {
      localStorage.setItem(READ_KEY, JSON.stringify([...this.readIds]))
    }
  }
})
