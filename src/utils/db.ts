/**
 * Dexie 数据库 —— 按用户名隔离
 * 每个用户名对应独立的 IndexedDB 数据库（数据库名 = code-reviewer-${username}）
 *
 * 使用方式：
 *   1. 登录后调 setCurrentUser(username) 激活对应用户的数据库
 *   2. 所有文件继续 import { db } 正常使用，Proxy 自动路由到当前用户的实例
 *   3. 登出后调 clearDbCache() 清理缓存
 */
import Dexie, { type Table } from 'dexie'

export interface Card {
  id?: number
  title: string
  content: string
  category: string
  tags: string[]
  status: 'new' | 'learning' | 'review' | 'mastered'
  createdAt: number
  updatedAt: number
}

export interface FsrsRecord {
  id?: number
  cardId: number
  difficulty: number
  stability: number
  retrievability: number
  interval: number
  due: number
  lastReview: number
  reviewCount: number
  state: 'new' | 'learning' | 'review' | 'relearning'
}

export interface ReviewLog {
  id?: number
  cardId: number
  grade: 1 | 2 | 3 | 4
  reviewedAt: number
  intervalDays: number
}

export class AppDB extends Dexie {
  cards!: Table<Card, number>
  fsrs!: Table<FsrsRecord, number>
  reviewLogs!: Table<ReviewLog, number>

  constructor(username: string) {
    super(`code-reviewer-${username}`)
    this.version(1).stores({
      cards: '++id, title, category, status, createdAt',
      fsrs: '++id, &cardId, due, state'
    })
    this.version(2).stores({
      reviewLogs: '++id, cardId, reviewedAt'
    })
  }
}

// ===== 实例缓存 + 当前用户 =====
const instanceCache = new Map<string, AppDB>()
let _currentUsername = ''

/** 设置当前活跃用户（登录成功后调用） */
export function setCurrentUser(username: string) {
  _currentUsername = username.trim() || '_guest'
}

/** 获取指定用户的数据库实例（内部用） */
export function getDbFor(username: string): AppDB {
  const key = username.trim() || '_guest'
  if (!instanceCache.has(key)) {
    instanceCache.set(key, new AppDB(key))
  }
  return instanceCache.get(key)!
}

/** 清除所有缓存实例 + 断开当前用户（登出时调用） */
export function clearDbCache() {
  instanceCache.clear()
  _currentUsername = ''
}

/**
 * 对外导出的 db 对象——Proxy 自动路由到当前用户的 Dexie 实例
 * 所有文件保持 import { db } 不变，零调用方改动
 */
export const db = new Proxy({} as AppDB, {
  get(_target, prop: string | symbol) {
    const real = getDbFor(_currentUsername || '_guest')
    const value = (real as any)[prop]
    // 如果是函数（如 db.cards.add），绑定 this 到 real 实例
    if (typeof value === 'function') return value.bind(real)
    return value
  }
})

// ===== 辅助函数（用户名显式传参，方便独立调用）=====

export async function getFsrsByCard(cardId: number): Promise<FsrsRecord | undefined> {
  return db.fsrs.where('cardId').equals(cardId).first()
}

export async function getTodayDueCards(): Promise<Card[]> {
  const now = Date.now()
  const fsrsList = await db.fsrs.where('due').belowOrEqual(now).toArray()
  const ids = fsrsList.map(r => r.cardId)
  if (!ids.length) return []
  return db.cards.where('id').anyOf(ids).toArray()
}

// ===== 种子数据 =====

/** 检查当前用户数据库是否为空 */
export async function isDbEmpty(): Promise<boolean> {
  return (await db.cards.count()) === 0
}

/**
 * 为新用户注入种子示例卡（仅该用户数据库为空时）
 * 不再用全局 localStorage 标记——改为按用户检查是否为空库
 */
export async function seedDb(): Promise<void> {
  const count = await db.cards.count()
  if (count > 0) return

  const samples: Omit<Card, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      title: 'Vue 3 响应式原理',
      category: '前端',
      tags: ['Vue', '响应式', 'Proxy'],
      content: `# Vue 3 响应式原理\n\n## 核心变化\n- **Proxy** 替代 Object.defineProperty，直接劫持对象本身\n- 支持数组下标和属性新增/删除\n- 新增 **ref** (基本类型) 和 **reactive** (对象) 两个入口\n\n## 关键代码\n\`\`\`js\nconst observed = new Proxy(target, handler)\n// get 时收集依赖（track）\n// set 时触发更新（trigger）\n\`\`\`\n\n## 为什么 Proxy 更好\ndefineProperty 需要遍历每个属性，Proxy 只包一层。`,
      status: 'new'
    },
    {
      title: 'HashMap 底层实现',
      category: 'Java',
      tags: ['HashMap', '红黑树', 'JDK1.8'],
      content: `# HashMap 底层\n\n## 数据结构\n数组 + 链表 + 红黑树\n\n## 阈值\n- **TREEIFY_THRESHOLD = 8**：链表长度超过 8 触发树化\n- **UNTREEIFY_THRESHOLD = 6**：红黑树节点少于 6 退化为链表\n- 数组长度需 **>= 64** 才树化，否则优先扩容\n\n## 为什么是 8？\n泊松分布计算，正常哈希冲突概率极低，链表长度很少超过 8。超过说明哈希函数有问题，需要红黑树兜底。`,
      status: 'new'
    },
    {
      title: 'HTTPS 握手过程',
      category: '网络',
      tags: ['TLS', '握手', 'SSL'],
      content: `# HTTPS 握手\n\n## TLS 1.2（四次握手）\n1. Client Hello → 协商算法版本 + 随机数\n2. Server Hello → 选好算法 + 发证书 + ServerKeyExchange\n3. Client → 验证书 + 发 ClientKeyExchange（含预主密钥）\n4. 双方用预主密钥生成会话密钥\n\n## TLS 1.3（两次握手）\n减少往返，客户端先发支持的密钥交换套件，服务端直接生成会话密钥。`,
      status: 'new'
    },
    {
      title: '动态规划入门',
      category: '算法',
      tags: ['DP', '状态转移'],
      content: `# 动态规划入门\n\n## 核心思想\n把大问题拆成小问题，记录子问题答案避免重复计算。\n\n## 三步骤\n1. **定义状态**：dp[i] 代表什么\n2. **状态转移方程**：dp[i] 怎么从之前算出来\n3. **初始化**：边界条件是什么\n\n## 例子 — 爬楼梯\n\`\`\`js\n// dp[i] = 到第 i 阶的方法数\n// dp[i] = dp[i-1] + dp[i-2]\nconst dp = new Array(n + 1).fill(0)\ndp[0] = 1; dp[1] = 1\nfor (let i = 2; i <= n; i++) dp[i] = dp[i-1] + dp[i-2]\n\`\`\``,
      status: 'new'
    }
  ]

  const now = Date.now()
  for (const s of samples) {
    const cardId = await db.cards.add({ ...s, createdAt: now, updatedAt: now })
    await db.fsrs.add({
      cardId,
      difficulty: 0,
      stability: 0,
      retrievability: 0,
      interval: 0,
      due: now,
      lastReview: 0,
      reviewCount: 0,
      state: 'new'
    })
  }
}
