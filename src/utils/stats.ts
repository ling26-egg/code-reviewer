/**
 * 统计聚合 —— 全部从 Dexie 真实数据计算，没有任何 mock
 * 数据源：cards / fsrs / reviewLogs 三张表
 */
import { db } from './db'

/** 用户统计（成就系统的判定依据） */
export interface UserStats {
  totalCards: number      // 知识点总数
  totalReviews: number    // 累计复习次数
  todayDue: number        // 今日待复习数
  masteredCount: number   // 已掌握数（复习中且间隔 >= 21 天）
  streak: number          // 连续打卡天数
  reviewToday: number     // 今日已复习数
  lastReviewHour: number  // 上次复习的小时（无复习记录为 -1）
  perfectDays: number     // 完美日数（单日复习满 10 张的天数）
}

/** 时间戳 → 'YYYY-M-D' 天key（本地时区） */
export function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

/** 聚合全部统计 */
export async function getStats(): Promise<UserStats> {
  const logs = await db.reviewLogs.toArray()
  const [totalCards, totalReviews] = await Promise.all([
    db.cards.count(),
    db.reviewLogs.count()
  ])

  // 今日待复习
  const todayDue = await db.fsrs.where('due').belowOrEqual(Date.now()).count()

  // 已掌握：进入 review 状态且间隔 >= 21 天
  const fsrsAll = await db.fsrs.toArray()
  const masteredCount = fsrsAll.filter(r => r.state === 'review' && r.interval >= 21).length

  // 每天复习次数
  const perDay = new Map<string, number>()
  for (const l of logs) {
    const k = dayKey(l.reviewedAt)
    perDay.set(k, (perDay.get(k) || 0) + 1)
  }

  // 连续打卡：从今天（或昨天）往前数连续有复习记录的天数
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  if (!perDay.has(dayKey(cursor.getTime()))) {
    cursor.setDate(cursor.getDate() - 1) // 今天还没学不算断，从昨天起算
  }
  let streak = 0
  while (perDay.has(dayKey(cursor.getTime()))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }

  // 上次复习的小时
  const lastTs = logs.reduce((max, l) => Math.max(max, l.reviewedAt), 0)
  const lastReviewHour = lastTs ? new Date(lastTs).getHours() : -1

  // 完美日：单日复习满 10 张
  const perfectDays = [...perDay.values()].filter(c => c >= 10).length

  return {
    totalCards,
    totalReviews,
    todayDue,
    masteredCount,
    streak,
    reviewToday: perDay.get(dayKey(Date.now())) || 0,
    lastReviewHour,
    perfectDays
  }
}

/** 今日复习队列（带卡片信息 + FSRS 元数据），最多 limit 条 */
export interface QueueItem {
  id: number
  title: string
  category: string
  interval: number   // 当前间隔（天）
  reviewCount: number
}

export async function getDueQueue(limit = 5): Promise<QueueItem[]> {
  const due = await db.fsrs.where('due').belowOrEqual(Date.now()).toArray()
  due.sort((a, b) => a.due - b.due) // 最先到期的排前面
  const items: QueueItem[] = []
  for (const r of due.slice(0, limit)) {
    const card = await db.cards.get(r.cardId)
    if (card?.id != null) {
      items.push({
        id: card.id,
        title: card.title,
        category: card.category,
        interval: r.interval,
        reviewCount: r.reviewCount
      })
    }
  }
  return items
}

/** 各分类掌握度（已掌握数 / 总数） */
export interface CategoryStat {
  name: string
  total: number
  mastered: number
  percent: number
}

export async function getCategoryStats(): Promise<CategoryStat[]> {
  const [cards, fsrsAll] = await Promise.all([db.cards.toArray(), db.fsrs.toArray()])
  const fsrsMap = new Map(fsrsAll.map(r => [r.cardId, r]))
  const byCat = new Map<string, { total: number; mastered: number }>()
  for (const c of cards) {
    const b = byCat.get(c.category) || { total: 0, mastered: 0 }
    b.total++
    const r = fsrsMap.get(c.id!)
    if (r && r.state === 'review' && r.interval >= 21) b.mastered++
    byCat.set(c.category, b)
  }
  return [...byCat.entries()]
    .map(([name, b]) => ({
      name,
      total: b.total,
      mastered: b.mastered,
      percent: b.total ? Math.round((b.mastered / b.total) * 100) : 0
    }))
    .sort((a, b) => b.total - a.total)
}

/** 复习质量：本月复习次数 + 正确率（Good/Easy 记为正确） */
export async function getReviewQuality(): Promise<{ monthReviews: number; accuracy: number; total: number }> {
  const logs = await db.reviewLogs.toArray()
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const monthReviews = logs.filter(l => l.reviewedAt >= monthStart.getTime()).length
  const good = logs.filter(l => l.grade >= 3).length
  return {
    monthReviews,
    accuracy: logs.length ? Math.round((good / logs.length) * 100) : 0,
    total: logs.length
  }
}

/** 平均记忆稳定性（天），用于画真实记忆曲线；没有复习数据返回 0 */
export async function getAvgStability(): Promise<number> {
  const fsrsAll = await db.fsrs.toArray()
  const reviewed = fsrsAll.filter(r => r.reviewCount > 0)
  if (!reviewed.length) return 0
  return reviewed.reduce((s, r) => s + r.stability, 0) / reviewed.length
}

/** 近 12 周热力图：周一开头的周列，值为复习次数映射的 0-4 级，-1 表示占位空格 */
export async function getHeatmap(): Promise<number[][]> {
  const logs = await db.reviewLogs.toArray()
  const perDay = new Map<string, number>()
  for (const l of logs) {
    const k = dayKey(l.reviewedAt)
    perDay.set(k, (perDay.get(k) || 0) + 1)
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const mondayOffset = (today.getDay() + 6) % 7 // 周一=0
  // 往前推到某一周一，共 11 个整周 + 本周已过天数
  const totalDays = 11 * 7 + mondayOffset + 1
  const start = new Date(today)
  start.setDate(start.getDate() - (totalDays - 1))

  const countToLevel = (c: number) => (c <= 0 ? 0 : c <= 2 ? 1 : c <= 5 ? 2 : c <= 9 ? 3 : 4)

  const weeks: number[][] = []
  let week: number[] = []
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const wd = (d.getDay() + 6) % 7
    if (wd === 0 && week.length) {
      weeks.push(week)
      week = []
    }
    week.push(countToLevel(perDay.get(dayKey(d.getTime())) || 0))
  }
  // 最后一列补齐 7 格（空位 -1，渲染时隐藏）
  while (week.length < 7) week.push(-1)
  weeks.push(week)
  return weeks
}
