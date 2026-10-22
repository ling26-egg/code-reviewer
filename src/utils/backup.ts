/**
 * 数据备份：导出 / 导入 JSON
 * 包含三张表：cards、fsrs、reviewLogs，导入时自动重映射 cardId
 *
 * 新增 exportAccount / importAccount —— 按用户名操作账号包（含设置/壁纸元数据）
 */
import { db, getDbFor, setCurrentUser } from './db'
import { createInitialFsrs } from './fsrs'

// ===== 通用 helper =====

/** 切换当前活跃用户的数据库 */
function switchUser(username: string) {
  setCurrentUser(username)
  return getDbFor(username)
}

// ===== 按当前用户导出/导入 =====

/** 导出当前登录用户的完整账号包（含数据 + 设置元数据） */
export async function exportAccount(username: string): Promise<void> {
  // 确保 Proxy db 指向对应用户
  const targetDb = switchUser(username)
  const [cards, fsrs, reviewLogs] = await Promise.all([
    targetDb.cards.toArray(),
    targetDb.fsrs.toArray(),
    targetDb.reviewLogs.toArray()
  ])

  const idToIndex = new Map<number, number>()
  cards.forEach((c, i) => idToIndex.set(c.id!, i))

  // 收集该用户的设置（API Key、自定义模型等——敏感信息可以选择不导出）
  const settingsRaw = localStorage.getItem('code-reviewer-settings')
  const wallpaperRaw = localStorage.getItem('wallpaper-settings')

  const payload = {
    app: 'code-reviewer',
    version: 2,
    type: 'account-package',
    username,
    exportedAt: Date.now(),
    // 三张表
    cards: cards.map(({ id, ...rest }) => rest),
    fsrs: fsrs
      .filter(r => idToIndex.has(r.cardId))
      .map(({ id, cardId, ...rest }) => ({ ...rest, cardIndex: idToIndex.get(cardId) })),
    reviewLogs: reviewLogs
      .filter(l => idToIndex.has(l.cardId))
      .map(({ id, cardId, ...rest }) => ({ ...rest, cardIndex: idToIndex.get(cardId) })),
    // 设置（不包含 apiKey，安全起见）
    settings: settingsRaw ? (() => {
      try {
        const s = JSON.parse(settingsRaw)
        return { ...s, apiKey: '' }  // 清空 Key 避免意外泄露
      } catch { return null }
    })() : null,
    wallpaper: wallpaperRaw || null
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `code-reviewer-account-${username}-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** 导入账号包到指定用户的数据库（覆盖现有数据） */
export async function importAccount(file: File, username: string): Promise<{ cards: number }> {
  const text = await file.text()
  const data = JSON.parse(text)
  if (!data.app || data.app !== 'code-reviewer') {
    throw new Error('文件格式不对，请选择本应用导出的账号包')
  }

  const targetDb = switchUser(username)

  // 清空现有数据
  await targetDb.transaction('rw', [targetDb.cards, targetDb.fsrs, targetDb.reviewLogs], async () => {
    await Promise.all([targetDb.cards.clear(), targetDb.fsrs.clear(), targetDb.reviewLogs.clear()])
  })

  const fsrsData: any[] = data.fsrs || []
  const logData: any[] = data.reviewLogs || []

  let count = 0
  const oldIdxToNewId = new Map<number, number>()

  for (let i = 0; i < (data.cards || []).length; i++) {
    const c = data.cards[i]
    const now = Date.now()
    const newId = await targetDb.cards.add({
      title: c.title,
      content: c.content || '',
      category: c.category || '其他',
      tags: c.tags || [],
      status: c.status || 'new',
      createdAt: c.createdAt || now,
      updatedAt: c.updatedAt || now
    })
    oldIdxToNewId.set(i, newId)
    count++
  }

  for (const r of fsrsData) {
    const newId = oldIdxToNewId.get(r.cardIndex)
    if (newId == null) continue
    await targetDb.fsrs.add({
      cardId: newId,
      difficulty: r.difficulty ?? 0,
      stability: r.stability ?? 0,
      retrievability: r.retrievability ?? 0,
      interval: r.interval ?? 0,
      due: r.due ?? Date.now(),
      lastReview: r.lastReview ?? 0,
      reviewCount: r.reviewCount ?? 0,
      state: r.state ?? 'new'
    })
  }
  for (const newId of oldIdxToNewId.values()) {
    const has = await targetDb.fsrs.where('cardId').equals(newId).first()
    if (!has) await createInitialFsrs(newId)
  }

  for (const l of logData) {
    const newId = oldIdxToNewId.get(l.cardIndex)
    if (newId == null) continue
    await targetDb.reviewLogs.add({
      cardId: newId,
      grade: l.grade ?? 3,
      reviewedAt: l.reviewedAt ?? Date.now(),
      intervalDays: l.intervalDays ?? 0
    })
  }

  // 恢复设置（如果有，且版本匹配）
  if (data.settings && typeof data.settings === 'object') {
    // 不清 apiKey，让用户自己填
    const existingRaw = localStorage.getItem('code-reviewer-settings')
    let existing = existingRaw ? JSON.parse(existingRaw) : {}
    Object.assign(existing, data.settings, { apiKey: existing.apiKey || '' })
    localStorage.setItem('code-reviewer-settings', JSON.stringify(existing))
  }

  return { cards: count }
}

// ===== 旧版通用导出/导入（保持兼容 Settings 页）=====

export async function exportAll(): Promise<void> {
  const [cards, fsrs, reviewLogs] = await Promise.all([
    db.cards.toArray(),
    db.fsrs.toArray(),
    db.reviewLogs.toArray()
  ])

  const idToIndex = new Map<number, number>()
  cards.forEach((c, i) => idToIndex.set(c.id!, i))

  const payload = {
    app: 'code-reviewer',
    version: 1,
    exportedAt: Date.now(),
    cards: cards.map(({ id, ...rest }) => rest),
    fsrs: fsrs
      .filter(r => idToIndex.has(r.cardId))
      .map(({ id, cardId, ...rest }) => ({ ...rest, cardIndex: idToIndex.get(cardId) })),
    reviewLogs: reviewLogs
      .filter(l => idToIndex.has(l.cardId))
      .map(({ id, cardId, ...rest }) => ({ ...rest, cardIndex: idToIndex.get(cardId) }))
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `code-reviewer-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importAll(json: string): Promise<{ added: number; skipped: number }> {
  const data = JSON.parse(json)
  if (data.app !== 'code-reviewer' || !Array.isArray(data.cards)) {
    throw new Error('文件格式不对，请选择本应用导出的 JSON')
  }

  const existing = new Set((await db.cards.toArray()).map(c => `${c.title}`))
  const fsrsData: any[] = data.fsrs || []
  const logData: any[] = data.reviewLogs || []

  let added = 0, skipped = 0
  const oldIdxToNewId = new Map<number, number>()

  for (let i = 0; i < data.cards.length; i++) {
    const c = data.cards[i]
    if (existing.has(c.title)) { skipped++; continue }
    const now = Date.now()
    const newId = await db.cards.add({
      title: c.title,
      content: c.content || '',
      category: c.category || '其他',
      tags: c.tags || [],
      status: c.status || 'new',
      createdAt: c.createdAt || now,
      updatedAt: c.updatedAt || now
    })
    oldIdxToNewId.set(i, newId)
    added++
  }

  for (const r of fsrsData) {
    const newId = oldIdxToNewId.get(r.cardIndex)
    if (newId == null) continue
    await db.fsrs.add({
      cardId: newId,
      difficulty: r.difficulty ?? 0,
      stability: r.stability ?? 0,
      retrievability: r.retrievability ?? 0,
      interval: r.interval ?? 0,
      due: r.due ?? Date.now(),
      lastReview: r.lastReview ?? 0,
      reviewCount: r.reviewCount ?? 0,
      state: r.state ?? 'new'
    })
  }
  for (const newId of oldIdxToNewId.values()) {
    const has = await db.fsrs.where('cardId').equals(newId).first()
    if (!has) await createInitialFsrs(newId)
  }

  for (const l of logData) {
    const newId = oldIdxToNewId.get(l.cardIndex)
    if (newId == null) continue
    await db.reviewLogs.add({
      cardId: newId,
      grade: l.grade ?? 3,
      reviewedAt: l.reviewedAt ?? Date.now(),
      intervalDays: l.intervalDays ?? 0
    })
  }

  return { added, skipped }
}

export async function clearAllData(): Promise<void> {
  await db.transaction('rw', [db.cards, db.fsrs, db.reviewLogs], async () => {
    await Promise.all([db.cards.clear(), db.fsrs.clear(), db.reviewLogs.clear()])
  })
}
