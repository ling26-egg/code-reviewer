<template>
  <div class="review fade-in">
    <div v-if="queue.length === 0" class="empty-review">
      <el-icon :size="64"><MagicStick /></el-icon>
      <h2>🎉 今日复习队列已清空！</h2>
      <p>太好了，所有到期的知识点都复习完了</p>
      <button class="btn-primary" @click="$router.push('/library')">
        <el-icon><Plus /></el-icon>去知识库看看
      </button>
    </div>

    <template v-else>
      <div class="review-header">
        <div class="progress-info">
          <span class="current">{{ index + 1 }}</span>
          <span class="total">/ {{ queue.length }}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: (index / queue.length * 100) + '%' }"></div>
        </div>
        <button class="exit-btn" @click="$router.push('/library')">退出</button>
      </div>

      <!-- 闪卡 -->
      <div class="flashcard-wrap">
        <div class="flashcard" :class="{ flipped: showAnswer }" @click="showAnswer = !showAnswer">
          <!-- 正面：问题 -->
          <div class="card-face card-front">
            <div class="card-face-head">
              <span class="tag" :style="{ background: catColor(current.category) + '20', color: catColor(current.category) }">{{ current.category }}</span>
              <span class="hint">点击查看答案</span>
            </div>
            <h2 class="question">{{ current.title }}</h2>
            <p class="card-meta-line" v-if="currentFsrs">
              当前记忆：稳定性 {{ Math.round(currentFsrs.stability) }}天 · 已复习 {{ currentFsrs.reviewCount }}次
            </p>
          </div>
          <!-- 背面：Markdown 答案 -->
          <div class="card-face card-back">
            <div class="card-face-head">
              <span class="tag" :style="{ background: catColor(current.category) + '20', color: catColor(current.category) }">{{ current.category }}</span>
              <span class="hint">点击返回问题</span>
            </div>
            <div class="answer-content" v-html="answerHtml"></div>
          </div>
        </div>
      </div>

      <!-- 评分按钮 -->
      <transition name="fade">
        <div v-if="showAnswer" class="rating-bar">
          <span class="rating-label">你记得吗？</span>
          <button class="rate-btn forget" @click="rate(1)">
            <span class="rate-emoji">😵</span>
            <span class="rate-text">忘记</span>
            <span class="rate-time">{{ guessInterval(1) }}</span>
          </button>
          <button class="rate-btn hard" @click="rate(2)">
            <span class="rate-emoji">😰</span>
            <span class="rate-text">困难</span>
            <span class="rate-time">{{ guessInterval(2) }}</span>
          </button>
          <button class="rate-btn good" @click="rate(3)">
            <span class="rate-emoji">😊</span>
            <span class="rate-text">良好</span>
            <span class="rate-time">{{ guessInterval(3) }}</span>
          </button>
          <button class="rate-btn easy" @click="rate(4)">
            <span class="rate-emoji">🤩</span>
            <span class="rate-text">简单</span>
            <span class="rate-time">{{ guessInterval(4) }}</span>
          </button>
        </div>
      </transition>

      <!-- 评分反馈 -->
      <transition name="fade">
        <div v-if="feedback" class="feedback">
          <span>{{ feedback }}</span>
        </div>
      </transition>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { MagicStick, Plus } from '@element-plus/icons-vue'
import { db, getTodayDueCards, seedDb, type Card, type FsrsRecord } from '../utils/db'
import { reviewCard, describeInterval } from '../utils/fsrs'
import { useAchievementStore } from '../stores/achievement'
import { useSettingsStore } from '../stores/settings'

const achievement = useAchievementStore()
const settings = useSettingsStore()

const CAT_COLORS: Record<string, string> = {
  '前端': '#3b82f6', 'Java': '#f59e0b', '算法': '#10b981',
  '网络': '#8b5cf6', '数据库': '#ec4899', '其他': '#64748b'
}
const catColor = (c: string) => CAT_COLORS[c] || CAT_COLORS['其他']

marked.setOptions({ breaks: true })

const queue = ref<Card[]>([])
const fsrsMap = ref<Record<number, FsrsRecord>>({})
const index = ref(0)
const showAnswer = ref(false)
const feedback = ref('')

const current = computed(() => queue.value[index.value] || {} as Card)
const currentFsrs = computed(() => current.value.id ? fsrsMap.value[current.value.id] : undefined)
const answerHtml = computed(() => DOMPurify.sanitize(marked.parse(current.value.content || '') as string))

/** 评分按钮显示的预估间隔（给用户预期） */
function guessInterval(grade: 1 | 2 | 3 | 4): string {
  const r = currentFsrs.value
  if (!r || r.state === 'new') {
    // 新卡的大致初始间隔
    const base = { 1: 0.1, 2: 0.5, 3: 1, 4: 2 }[grade]
    return base < 1 ? `${Math.round(base * 24 * 60)}分钟` : `${base}天后`
  }
  return ['1天后', '3天后', '7天后', '15天后'][grade - 1]
}

async function loadQueue() {
  await seedDb()
  // 应用「每日复习上限」设置
  const cards = (await getTodayDueCards()).slice(0, settings.dailyLimit)
  // 并行拉每张卡的 FSRS 记录
  const map: Record<number, FsrsRecord> = {}
  for (const c of cards) {
    const r = await db.fsrs.where('cardId').equals(c.id!).first()
    if (r) map[c.id!] = r
  }
  queue.value = cards
  fsrsMap.value = map
  index.value = 0
  showAnswer.value = false
  feedback.value = ''
}

onMounted(loadQueue)

async function rate(grade: 1 | 2 | 3 | 4) {
  const card = current.value
  if (!card.id) return

  try {
    const { intervalDays } = await reviewCard(card.id, grade)
    // 更新本地 FSRS 记录
    const r = await db.fsrs.where('cardId').equals(card.id).first()
    if (r) fsrsMap.value[card.id] = r

    showAnswer.value = false
    ElMessage.success(`已评分：下次复习 ${describeInterval(intervalDays)}`)

    // 刷新成就统计，弹出新解锁的勋章
    const newMedals = await achievement.recordReview()
    for (const m of newMedals) {
      ElNotification({
        title: '解锁新勋章！',
        message: `${m.icon} ${m.name} —— ${m.desc}`,
        type: 'success',
        duration: 4000
      })
    }

    // 前进到下一张，给用户 1.2s 看反馈
    setTimeout(() => {
      if (index.value < queue.value.length - 1) {
        index.value++
      } else {
        ElMessage.success('🎉 今日复习完成！')
        setTimeout(() => loadQueue(), 800)
      }
    }, 1200)
  } catch (e: any) {
    console.error('reviewCard error:', e)
    ElMessage.error(e.message || '评分失败')
  }
}
</script>

<style scoped>
.review {
  display: flex; flex-direction: column; align-items: center;
  min-height: 100%; padding-top: 20px;
}
.empty-review {
  display: flex; flex-direction: column; align-items: center; gap: 16px;
  padding: 60px 20px;
}
.empty-review h2 { font-size: 22px; font-weight: 600; color: var(--success); }
.empty-review p { color: var(--text-muted); }

.review-header {
  width: 100%; max-width: 700px;
  display: flex; align-items: center; gap: 16px; margin-bottom: 24px;
}
.progress-info { font-size: 15px; }
.progress-info .current { font-weight: 700; color: var(--accent); font-size: 20px; }
.progress-info .total { color: var(--text-muted); }
.progress-bar { flex: 1; height: 6px; background: var(--bg-surface-2); border-radius: 3px; overflow: hidden; }
.progress-fill {
  height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent-light));
  border-radius: 3px; transition: width 0.4s ease;
}
.exit-btn {
  padding: 7px 16px; background: transparent;
  border: 1px solid var(--border-light); color: var(--text-secondary);
  border-radius: 8px; font-size: 13px; cursor: pointer; font-family: var(--font-sans);
}
.exit-btn:hover { border-color: var(--danger); color: var(--danger); }

.flashcard-wrap { perspective: 1500px; width: 100%; max-width: 700px; min-height: 400px; margin-bottom: 24px; }
.flashcard {
  width: 100%; min-height: 400px; position: relative;
  transform-style: preserve-3d;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer;
}
.flashcard.flipped { transform: rotateY(180deg); }
.card-face {
  position: absolute; width: 100%; min-height: 400px; height: 100%;
  backface-visibility: hidden;
  background: var(--bg-surface); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 32px;
  display: flex; flex-direction: column;
}
.card-back { transform: rotateY(180deg); background: linear-gradient(135deg, var(--bg-surface), var(--bg-surface-2)); }
.card-face-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.tag { padding: 5px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; }
.hint { font-size: 12px; color: var(--text-muted); }
.question { font-size: 22px; font-weight: 600; line-height: 1.4; margin-bottom: 10px; }
.card-meta-line { font-size: 12px; color: var(--text-muted); font-family: var(--font-mono); }

/* Markdown 答案 */
.answer-content { overflow-y: auto; flex: 1; }
.answer-content :deep(h1), .answer-content :deep(h2), .answer-content :deep(h3) {
  margin: 16px 0 10px; font-weight: 600;
}
.answer-content :deep(h1) { font-size: 20px; }
.answer-content :deep(h2) { font-size: 18px; }
.answer-content :deep(h3) { font-size: 16px; }
.answer-content :deep(p) { font-size: 15px; line-height: 1.8; margin: 10px 0; color: var(--text-primary); }
.answer-content :deep(pre) {
  background: #0d1117; padding: 14px; border-radius: 8px;
  overflow-x: auto; font-family: var(--font-mono); font-size: 13px;
  margin: 14px 0; line-height: 1.7;
}
.answer-content :deep(code) { font-family: var(--font-mono); }
.answer-content :deep(pre code) { font-size: 13px; }
.answer-content :deep(ul), .answer-content :deep(ol) { padding-left: 24px; margin: 10px 0; }
.answer-content :deep(li) { font-size: 15px; line-height: 1.8; }
.answer-content :deep(blockquote) {
  border-left: 3px solid var(--accent); padding: 6px 0 6px 14px;
  color: var(--text-secondary); margin: 12px 0; font-size: 14px;
}

.rating-bar {
  width: 100%; max-width: 700px; display: flex; align-items: center; gap: 10px;
}
.rating-label { font-size: 13px; color: var(--text-muted); margin-right: 8px; }
.rate-btn {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 14px 8px; background: var(--bg-surface); border: 1px solid var(--border);
  border-radius: 12px; cursor: pointer; transition: all 0.2s; font-family: var(--font-sans);
}
.rate-btn:hover { transform: translateY(-3px); border-color: var(--border-light); }
.rate-emoji { font-size: 22px; }
.rate-text { font-size: 13px; font-weight: 600; }
.rate-time { font-size: 11px; color: var(--text-muted); }
.rate-btn.forget:hover { border-color: var(--danger); }
.rate-btn.forget:hover .rate-text { color: var(--danger); }
.rate-btn.hard:hover { border-color: #f97316; }
.rate-btn.hard:hover .rate-text { color: #f97316; }
.rate-btn.good:hover { border-color: var(--success); }
.rate-btn.good:hover .rate-text { color: var(--success); }
.rate-btn.easy:hover { border-color: var(--accent); }
.rate-btn.easy:hover .rate-text { color: var(--accent); }

.feedback {
  position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%);
  padding: 12px 24px; background: var(--accent); color: #0a0e1a;
  border-radius: 10px; font-weight: 600; font-size: 14px;
  box-shadow: 0 8px 24px rgba(245, 158, 11, 0.3);
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
