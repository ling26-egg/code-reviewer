<template>
  <div class="dashboard fade-in">
    <!-- 欢迎横幅 -->
    <section class="hero-banner">
      <div class="hero-left">
        <h1 class="hero-title">{{ greeting }}，学习者 👋</h1>
        <p class="hero-sub">今天有 <span class="accent">{{ store.todayReviewCount }}</span> 个知识点等你复习，保持节奏！</p>
        <div class="hero-actions">
          <button class="btn-primary" @click="$router.push('/review')">
            <el-icon><Refresh /></el-icon>
            开始今日复习
          </button>
          <button class="btn-ghost" @click="$router.push('/library')">
            <el-icon><Plus /></el-icon>
            添加知识点
          </button>
        </div>
      </div>
      <div class="hero-right">
        <div class="code-card">
          <div class="code-header">
            <span class="dot red"></span>
            <span class="dot yellow"></span>
            <span class="dot green"></span>
            <span class="code-filename">spaced-repetition.ts</span>
          </div>
          <pre class="code-body"><code><span class="c-key">const</span> <span class="c-var">review</span> = <span class="c-fn">schedule</span>({
  <span class="c-prop">interval</span>: <span class="c-num">3</span>,
  <span class="c-prop">ease</span>: <span class="c-num">2.5</span>,
  <span class="c-prop">due</span>: <span class="c-str">'today'</span>
});
<span class="c-comment">// 记忆是一场马拉松，不是冲刺</span></code></pre>
        </div>
      </div>
    </section>

    <!-- 数据卡片 -->
    <section class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon blue">
          <el-icon :size="22"><Collection /></el-icon>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ store.totalCards }}</span>
          <span class="stat-label">知识点总数</span>
        </div>
        <span class="stat-trend">⚡ 连续 {{ store.streak }} 天</span>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">
          <el-icon :size="22"><CircleCheck /></el-icon>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ store.masteredCount }}</span>
          <span class="stat-label">已掌握</span>
        </div>
        <span class="stat-trend up">{{ store.totalCards ? Math.round(store.masteredCount / store.totalCards * 100) : 0 }}%</span>
      </div>
      <div class="stat-card">
        <div class="stat-icon amber">
          <el-icon :size="22"><Clock /></el-icon>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ store.todayReviewCount }}</span>
          <span class="stat-label">今日待复习</span>
        </div>
        <span class="stat-trend">进行中</span>
      </div>
      <div class="stat-card rank-card-mini">
        <div class="stat-icon" :style="{ background: achievement.currentRank.color + '20', color: achievement.currentRank.color }">
          <span class="rank-emoji">{{ achievement.currentRank.icon }}</span>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ achievement.currentRank.name }}</span>
          <span class="stat-label">Lv.{{ achievement.currentLevel }} · {{ achievement.exp }} EXP</span>
        </div>
        <div class="mini-exp-bar">
          <div class="mini-exp-fill" :style="{ width: achievement.levelProgress + '%' }"></div>
        </div>
      </div>
    </section>

    <!-- 两栏布局 -->
    <section class="two-col">
      <!-- 今日复习队列 -->
      <div class="panel">
        <div class="panel-head">
          <h3>今日复习队列</h3>
          <a class="panel-link" @click="$router.push('/review')">查看全部 →</a>
        </div>
        <div v-if="reviewQueue.length" class="review-list">
          <div v-for="item in reviewQueue" :key="item.id" class="review-item">
            <div class="review-tag" :style="{ background: catColor(item.category) + '20', color: catColor(item.category) }">{{ item.category }}</div>
            <div class="review-content">
              <p class="review-title">{{ item.title }}</p>
              <p class="review-meta">间隔 {{ item.interval }} 天 · 已复习 {{ item.reviewCount }} 次</p>
            </div>
            <button class="review-btn" @click="$router.push('/review')">复习</button>
          </div>
        </div>
        <div v-else class="queue-empty">🎉 今日复习已清空，去知识库添加新内容吧</div>
      </div>

      <!-- 学习热力图 -->
      <div class="panel">
        <div class="panel-head">
          <h3>学习热力图</h3>
          <a class="panel-link">近 12 周</a>
        </div>
        <div class="heatmap">
          <div v-for="(week, wi) in heatmap" :key="wi" class="heat-week">
            <div
              v-for="(day, di) in week"
              :key="di"
              class="heat-cell"
              :class="day < 0 ? 'empty' : 'level-' + day"
            ></div>
          </div>
        </div>
        <div class="heat-legend">
          <span>少</span>
          <div class="heat-cell level-0"></div>
          <div class="heat-cell level-1"></div>
          <div class="heat-cell level-2"></div>
          <div class="heat-cell level-3"></div>
          <div class="heat-cell level-4"></div>
          <span>多</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '../stores/app'
import { useAchievementStore } from '../stores/achievement'
import { getDueQueue, getHeatmap, type QueueItem } from '../utils/stats'
import { Refresh, Plus, Collection, CircleCheck, Clock } from '@element-plus/icons-vue'

const store = useAppStore()
const achievement = useAchievementStore()

// 问候语按时段变化
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

// 真实数据：今日到期队列 + 热力图
const reviewQueue = ref<QueueItem[]>([])
const heatmap = ref<number[][]>([])

const CAT_COLORS: Record<string, string> = {
  '前端': '#3b82f6', 'Java': '#f59e0b', '算法': '#10b981',
  '网络': '#8b5cf6', '数据库': '#ec4899', '其他': '#64748b'
}
const catColor = (c: string) => CAT_COLORS[c] || CAT_COLORS['其他']

onMounted(async () => {
  await Promise.all([store.refresh(), achievement.refresh()])
  reviewQueue.value = await getDueQueue(5)
  heatmap.value = await getHeatmap()
})
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 欢迎横幅 */
.hero-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  padding: 28px 32px;
  background: linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-surface-2) 100%);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  position: relative;
  overflow: hidden;
}
.hero-banner::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -10%;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, var(--accent-glow) 0%, transparent 70%);
  pointer-events: none;
}
.hero-left {
  position: relative;
  z-index: 1;
}
.hero-title {
  font-size: 26px;
  font-weight: 700;
  margin-bottom: 8px;
  letter-spacing: -0.5px;
}
.hero-sub {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 20px;
}
.accent {
  color: var(--accent);
  font-weight: 700;
}
.hero-actions {
  display: flex;
  gap: 12px;
}
.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: var(--accent);
  color: #0a0e1a;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: var(--font-sans);
}
.btn-primary:hover {
  background: var(--accent-light);
  transform: translateY(-1px);
  box-shadow: var(--shadow-glow);
}
.btn-ghost {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-light);
  border-radius: 10px;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: var(--font-sans);
}
.btn-ghost:hover {
  border-color: var(--accent);
  color: var(--accent);
}

/* 代码卡片 */
.hero-right {
  position: relative;
  z-index: 1;
}
.code-card {
  width: 360px;
  background: #0d1117;
  border: 1px solid var(--border-light);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow-lg);
}
.code-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: #161b22;
  border-bottom: 1px solid var(--border);
}
.code-header .dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
}
.code-header .dot.red { background: #ff5f56; }
.code-header .dot.yellow { background: #ffbd2e; }
.code-header .dot.green { background: #27c93f; }
.code-filename {
  margin-left: 8px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-muted);
}
.code-body {
  padding: 16px;
  margin: 0;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.7;
  overflow-x: auto;
}
.c-key { color: #ff7b72; }
.c-var { color: #79c0ff; }
.c-fn { color: #d2a8ff; }
.c-prop { color: #7ee787; }
.c-num { color: #f0883e; }
.c-str { color: #a5d6ff; }
.c-comment { color: #8b949e; font-style: italic; }

/* 数据卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  transition: all 0.2s;
}
.stat-card:hover {
  border-color: var(--border-light);
  transform: translateY(-2px);
}
.stat-icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.stat-icon.blue { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
.stat-icon.green { background: rgba(16, 185, 129, 0.15); color: #10b981; }
.stat-icon.amber { background: var(--accent-glow); color: var(--accent); }
.stat-icon.purple { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; }
.stat-info {
  display: flex;
  flex-direction: column;
}
.stat-value {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
}
.stat-label {
  font-size: 12px;
  color: var(--text-muted);
}
.stat-trend {
  margin-left: auto;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
}
.stat-trend.up {
  color: var(--success);
}

/* 段位卡片特殊样式 */
.rank-card-mini {
  flex-wrap: wrap;
}
.rank-card-mini .stat-value {
  font-size: 20px;
}
.rank-emoji {
  font-size: 22px;
  line-height: 1;
}
.mini-exp-bar {
  width: 100%;
  height: 6px;
  background: var(--bg-surface-2);
  border-radius: 3px;
  margin-top: 10px;
  overflow: hidden;
}
.mini-exp-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--accent-light));
  border-radius: 3px;
  transition: width 0.6s;
}

/* 两栏 */
.two-col {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 16px;
}
.panel {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 20px;
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.panel-head h3 {
  font-size: 16px;
  font-weight: 600;
}
.panel-link {
  font-size: 13px;
  color: var(--accent);
  cursor: pointer;
}

/* 复习列表 */
.review-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.review-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--bg-base);
  border: 1px solid var(--border);
  border-radius: 10px;
  transition: all 0.2s;
}
.review-item:hover {
  border-color: var(--border-light);
  background: var(--bg-surface-2);
}
.review-tag {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}
.review-content {
  flex: 1;
  min-width: 0;
}
.review-title {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.review-meta {
  font-size: 11px;
  color: var(--text-muted);
}
.review-btn {
  padding: 6px 14px;
  background: var(--accent);
  color: #0a0e1a;
  border: none;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  font-family: var(--font-sans);
}
.review-btn:hover {
  background: var(--accent-light);
}

/* 热力图 */
.heatmap {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  padding: 4px 0;
}
.heat-cell.empty {
  visibility: hidden;
}
/* 空队列提示 */
.queue-empty {
  padding: 32px 0;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}
.heat-week {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.heat-cell {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  background: var(--bg-surface-2);
}
.heat-cell.level-0 { background: var(--bg-surface-2); }
.heat-cell.level-1 { background: rgba(245, 158, 11, 0.25); }
.heat-cell.level-2 { background: rgba(245, 158, 11, 0.5); }
.heat-cell.level-3 { background: rgba(245, 158, 11, 0.75); }
.heat-cell.level-4 { background: var(--accent); }
.heat-legend {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 14px;
  font-size: 11px;
  color: var(--text-muted);
  justify-content: flex-end;
}
</style>
