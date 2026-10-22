/**
 * FSRS-5 间隔重复算法封装
 *
 * ts-fsrs 真实 API：
 *   fsrs() → 创建调度器 scheduler
 *   scheduler.next(card, now, Rating.Good) → { card, log }
 *   createEmptyCard() → 新卡完整初始参数
 *   Rating.Again=1 / Hard=2 / Good=3 / Easy=4
 *   State.New=0 / Learning=1 / Review=2 / Relearning=3
 */
import { fsrs, createEmptyCard, State } from 'ts-fsrs'
import { db, type FsrsRecord } from './db'

const scheduler = fsrs()

/** DB state ↔ FSRS State */
const stateMap: Record<FsrsRecord['state'], number> = {
  new: State.New, learning: State.Learning,
  review: State.Review, relearning: State.Relearning
}
const stateRevMap: Record<number, FsrsRecord['state']> = {
  [State.New]: 'new', [State.Learning]: 'learning',
  [State.Review]: 'review', [State.Relearning]: 'relearning'
}

/** 把 DB 的 FsrsRecord 转成 FSRS 需要的完整 card 对象 */
function toFsrsCard(r: FsrsRecord) {
  // FSRS 需要完整 card 结构，缺失字段用默认值
  return {
    stability: r.stability,
    difficulty: r.difficulty,
    reps: r.reviewCount,
    lapses: 0,
    elapsed_days: r.interval,
    scheduled_days: r.interval,
    learning_steps: 0,
    state: stateMap[r.state],
    last_review: r.lastReview ? new Date(r.lastReview) : undefined,
    due: new Date(r.due)
  }
}

/** 评分等级 */
export type ReviewGrade = 1 | 2 | 3 | 4

/** 为一张新卡片创建初始 FSRS 记录 */
export async function createInitialFsrs(cardId: number): Promise<FsrsRecord> {
  const fc = createEmptyCard()
  const now = Date.now()
  const record: FsrsRecord = {
    cardId,
    difficulty: fc.difficulty,
    stability: fc.stability,
    retrievability: 0,
    interval: 0,
    due: now,
    lastReview: 0,
    reviewCount: 0,
    state: 'new'
  }
  const id = await db.fsrs.add(record)
  return { ...record, id }
}

/** 对一张卡片评分 → FSRS 计算 → 更新 DB */
export async function reviewCard(cardId: number, grade: ReviewGrade): Promise<{
  record: FsrsRecord
  intervalDays: number
}> {
  const record = await db.fsrs.where('cardId').equals(cardId).first()
  if (!record) throw new Error(`卡片 ${cardId} 没有 FSRS 记录`)

  const now = Date.now()
  const fsrsCard = toFsrsCard(record)
  const result = scheduler.next(fsrsCard, now, grade)
  const newCard = result.card

  const intervalDays = Math.round(
    (new Date(newCard.due).getTime() - now) / (1000 * 60 * 60 * 24)
  )

  const newRecord: FsrsRecord = {
    ...record,
    difficulty: newCard.difficulty,
    stability: newCard.stability,
    retrievability: 0,
    interval: intervalDays,
    due: new Date(newCard.due).getTime(),
    lastReview: now,
    reviewCount: record.reviewCount + 1,
    state: stateRevMap[newCard.state] || record.state
  }
  await db.fsrs.put(newRecord)
  // 记一条复习日志（统计/热力图/成就的数据源）
  await db.reviewLogs.add({ cardId, grade, reviewedAt: now, intervalDays })
  return { record: newRecord, intervalDays }
}

/** interval → 人话 */
export function describeInterval(days: number): string {
  if (days <= 0) return '今天'
  if (days === 1) return '明天'
  return `${days} 天后`
}
