<template>
  <div class="stats fade-in">
    <h1 class="page-title">学习统计</h1>
    <p class="page-desc">追踪你的学习进度与记忆曲线</p>

    <div class="stats-grid">
      <div class="stat-card big">
        <div class="stat-icon green"><el-icon :size="28"><CircleCheck /></el-icon></div>
        <div class="stat-info">
          <span class="stat-value">{{ stats ? stats.masteredCount : '—' }}</span>
          <span class="stat-label">已掌握知识点</span>
        </div>
      </div>
      <div class="stat-card big">
        <div class="stat-icon amber"><span class="flame-emoji">🔥</span></div>
        <div class="stat-info">
          <span class="stat-value">{{ stats ? stats.streak : '—' }}</span>
          <span class="stat-label">连续学习天数</span>
        </div>
      </div>
      <div class="stat-card big">
        <div class="stat-icon blue"><el-icon :size="28"><Clock /></el-icon></div>
        <div class="stat-info">
          <span class="stat-value">{{ quality.monthReviews }}</span>
          <span class="stat-label">本月复习次数</span>
        </div>
      </div>
      <div class="stat-card big">
        <div class="stat-icon purple"><el-icon :size="28"><TrendCharts /></el-icon></div>
        <div class="stat-info">
          <span class="stat-value">{{ quality.accuracy }}%</span>
          <span class="stat-label">复习正确率</span>
        </div>
      </div>
    </div>

    <div class="charts-row">
      <div class="panel chart-panel">
        <h3>各分类掌握度</h3>
        <div v-if="categoryStats.length" class="bar-chart">
          <div v-for="item in categoryStats" :key="item.name" class="bar-row" :title="`已掌握 ${item.mastered} / 共 ${item.total} 个`">
            <span class="bar-name">{{ item.name }}</span>
            <div class="bar-track">
              <div class="bar-fill" :style="{ width: item.percent + '%', background: colorOf(item.name) }"></div>
            </div>
            <span class="bar-percent">{{ item.percent }}%</span>
          </div>
        </div>
        <div v-else class="chart-empty">还没有知识点，先去知识库添加吧</div>
      </div>
      <div class="panel chart-panel">
        <h3>记忆曲线预测 <span v-if="avgStability > 0" class="curve-sub">平均稳定性 {{ Math.round(avgStability) }} 天</span></h3>
        <div v-if="curvePoints.length" class="curve-chart">
          <svg viewBox="0 0 300 180" class="curve-svg">
            <path :d="curveArea" fill="var(--accent-glow)"/>
            <path :d="curvePath" fill="none" stroke="var(--accent)" stroke-width="2.5"/>
            <line x1="10" y1="180" x2="290" y2="180" stroke="var(--border-light)" stroke-width="1"/>
            <line x1="10" y1="30" x2="10" y2="180" stroke="var(--border-light)" stroke-width="1"/>
            <circle :cx="curvePoints[curvePoints.length - 1].x" :cy="curvePoints[curvePoints.length - 1].y" r="4" fill="var(--accent)"/>
          </svg>
          <div class="curve-labels">
            <span>第1天</span>
            <span>第3天</span>
            <span>第7天</span>
            <span>第15天</span>
            <span>第30天</span>
          </div>
        </div>
        <div v-else class="chart-empty">先去复习几张卡片，这里会生成你的专属记忆曲线</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { CircleCheck, Clock, TrendCharts } from '@element-plus/icons-vue'
import { forgetting_curve, FSRS5_DEFAULT_DECAY } from 'ts-fsrs'
import {
  getStats, getCategoryStats, getReviewQuality, getAvgStability,
  type CategoryStat, type UserStats
} from '../utils/stats'

const stats = ref<UserStats | null>(null)
const quality = ref({ monthReviews: 0, accuracy: 0, total: 0 })
const categoryStats = ref<CategoryStat[]>([])
const avgStability = ref(0)

const CAT_COLORS: Record<string, string> = {
  '前端': '#3b82f6', 'Java': '#f59e0b', '算法': '#10b981',
  '网络': '#8b5cf6', '数据库': '#ec4899', '其他': '#64748b'
}
const colorOf = (n: string) => CAT_COLORS[n] || CAT_COLORS['其他']

// 真实记忆曲线：用全部复习过卡片的平均稳定性，代入 FSRS 遗忘公式 R(t)
const curvePoints = computed(() => {
  const S = avgStability.value
  if (S <= 0) return []
  const pts: { x: number; y: number }[] = []
  for (let t = 0; t <= 30; t++) {
    const r = forgetting_curve(FSRS5_DEFAULT_DECAY, t, S) // 0~1 可回忆概率
    pts.push({ x: 10 + (t / 30) * 280, y: 180 - r * 150 }) // 映射到 SVG 坐标
  }
  return pts
})
const curvePath = computed(() =>
  curvePoints.value.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
)
const curveArea = computed(() =>
  curvePoints.value.length ? `${curvePath.value} L290,180 L10,180 Z` : ''
)

onMounted(async () => {
  stats.value = await getStats()
  quality.value = await getReviewQuality()
  categoryStats.value = await getCategoryStats()
  avgStability.value = await getAvgStability()
})
</script>

<style scoped>
.stats { display: flex; flex-direction: column; gap: 20px; }
.page-title { font-size: 24px; font-weight: 700; }
.page-desc { color: var(--text-muted); font-size: 13px; margin-bottom: 4px; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.stat-card.big {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 22px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}
.stat-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.stat-icon.green { background: rgba(16,185,129,0.15); color: #10b981; }
.stat-icon.amber { background: var(--accent-glow); color: var(--accent); }
.stat-icon.blue { background: rgba(59,130,246,0.15); color: #3b82f6; }
.stat-icon.purple { background: rgba(139,92,246,0.15); color: #8b5cf6; }
.stat-info { display: flex; flex-direction: column; }
.stat-value { font-size: 26px; font-weight: 700; }
.stat-label { font-size: 12px; color: var(--text-muted); }

.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.panel {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 22px;
}
.panel h3 { font-size: 16px; font-weight: 600; margin-bottom: 20px; }
.panel h3 .curve-sub { font-size: 12px; font-weight: 400; color: var(--accent); margin-left: 8px; }

/* 图表空状态 */
.chart-empty {
  padding: 40px 0;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}

.bar-chart { display: flex; flex-direction: column; gap: 14px; }
.bar-row { display: flex; align-items: center; gap: 12px; }
.bar-name { width: 60px; font-size: 13px; color: var(--text-secondary); }
.bar-track {
  flex: 1;
  height: 10px;
  background: var(--bg-surface-2);
  border-radius: 5px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 1s ease;
}
.bar-percent { width: 40px; text-align: right; font-size: 13px; font-weight: 600; }

.curve-chart { display: flex; flex-direction: column; gap: 10px; }
.curve-svg { width: 100%; height: 180px; }
.curve-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-muted);
}
</style>
