<template>
  <div class="library fade-in">
    <div class="page-head">
      <div>
        <h1 class="page-title">知识库</h1>
        <p class="page-desc">
          共 {{ allCards.length }} 个知识点
          <template v-if="searchKey.trim()">，搜索「{{ searchKey.trim() }}」命中 {{ cards.length }} 个</template>
          <template v-else>，当前显示 {{ cards.length }} 个</template>
        </p>
      </div>
      <div class="head-actions">
        <button class="btn-import" @click="leetcodeDialog = true">
          <el-icon><Link /></el-icon>导入 LeetCode
        </button>
        <button class="btn-primary" @click="openEditor()">
          <el-icon><Plus /></el-icon>新建知识点
        </button>
      </div>
    </div>

    <!-- 搜索栏：独立大输入框 + Ctrl+K 快捷键 -->
    <div class="search-bar" :class="{ active: searchKey.trim() }">
      <el-icon class="search-icon" :size="18"><Search /></el-icon>
      <input
        ref="searchInputEl"
        v-model="searchKey"
        class="search-field"
        type="text"
        placeholder="搜索标题、正文、标签…"
      />
      <button v-if="searchKey" class="search-clear" @click="searchKey = ''">
        <el-icon><Close /></el-icon>
      </button>
      <span v-if="searchKey.trim()" class="search-count">{{ cards.length }} 个结果</span>
      <span v-else class="search-kbd">Ctrl+K</span>
    </div>

    <!-- 分类标签 -->
    <div class="category-bar">
      <div
        class="cat-item"
        :class="{ active: activeCat === '' }"
        @click="activeCat = ''"
      >全部 <span class="count">{{ allCards.length }}</span></div>
      <div
        v-for="cat in categories"
        :key="cat"
        class="cat-item"
        :class="{ active: activeCat === cat }"
        @click="activeCat = cat"
      >{{ cat }} <span class="count">{{ catCount[cat] || 0 }}</span></div>
    </div>

    <!-- 卡片网格 -->
    <div v-if="cards.length" class="card-grid">
      <div v-for="card in cards" :key="card.id" class="know-card" @click="openDetail(card)">
        <div class="card-top">
          <span class="card-tag" :style="{ background: catColor(card.category) + '20', color: catColor(card.category) }">{{ card.category }}</span>
          <span class="card-status" :class="card.status">{{ statusText(card.status) }}</span>
        </div>
        <h3 class="card-title">
          <template v-if="searchKey.trim()">
            <span v-for="(seg, si) in highlightTitle(card.title)" :key="si" :class="{ hit: seg.hit }">{{ seg.text }}</span>
          </template>
          <template v-else>{{ card.title }}</template>
        </h3>
        <p class="card-preview">{{ markdownPreview(card.content) }}</p>
        <div class="card-tags" v-if="card.tags.length">
          <span v-for="t in card.tags.slice(0, 3)" :key="t" class="mini-tag">#{{ t }}</span>
        </div>
        <div class="card-bottom">
          <span class="card-meta">创建于 {{ formatDate(card.createdAt) }}</span>
          <button class="del-btn" @click.stop="deleteCard(card)">
            <el-icon><Delete /></el-icon>
          </button>
        </div>
      </div>
    </div>
    <div v-else class="empty-state">
      <el-icon :size="48"><Document /></el-icon>
      <p v-if="searchKey.trim()">没有找到与「{{ searchKey.trim() }}」相关的知识点</p>
      <p v-else>还没有知识点，点击右上角「新建」开始吧！</p>
      <button v-if="searchKey.trim()" class="btn-ghost clear-search-btn" @click="searchKey = ''">清除搜索</button>
    </div>

    <!-- 新建/编辑弹窗 -->
    <el-dialog v-model="editorOpen" :title="editingCard ? '编辑知识点' : '新建知识点'" width="680px" class="editor-dialog">
      <div class="editor-form">
        <div class="field">
          <label>标题</label>
          <el-input v-model="draft.title" placeholder="例如：Vue 3 响应式原理" />
        </div>
        <div class="field-row">
          <div class="field half">
            <label>分类</label>
            <el-select v-model="draft.category" placeholder="选一个分类" style="width: 100%">
              <el-option v-for="c in [...categories, '其他']" :key="c" :label="c" :value="c" />
            </el-select>
          </div>
          <div class="field half">
            <label>标签（逗号分隔）</label>
            <el-input v-model="tagsInput" placeholder="Vue, 响应式, Proxy" />
          </div>
        </div>
        <div class="field">
          <div class="field-head">
            <label>正文（Markdown 支持代码块）</label>
            <span class="hint">按 Ctrl+Enter 快速保存</span>
          </div>
          <div class="editor-split">
            <textarea
              v-model="draft.content"
              class="md-textarea"
              placeholder="# 标题\n\n写点什么吧，支持 Markdown...\n\n\`\`\`js\nconst x = 1;\n\`\`\`"
              @keydown.ctrl.enter="saveCard"
            ></textarea>
            <div class="md-preview" v-html="rendered"></div>
          </div>
        </div>
      </div>
      <template #footer>
        <button class="btn-ghost" @click="editorOpen = false">取消</button>
        <button class="btn-primary" @click="saveCard" :disabled="!draft.title?.trim()">
          <el-icon><Check /></el-icon>{{ editingCard ? '保存修改' : '创建' }}
        </button>
      </template>
    </el-dialog>

    <!-- 知识点详情：大屏完整展示，不再憋在小框里 -->
    <el-dialog
      v-model="detailOpen"
      width="900px"
      top="4vh"
      class="detail-dialog"
      :show-close="true"
    >
      <template #header>
        <div class="detail-header" v-if="detailCard">
          <span class="card-tag" :style="{ background: catColor(detailCard.category) + '20', color: catColor(detailCard.category) }">{{ detailCard.category }}</span>
          <h2 class="detail-title">{{ detailCard.title }}</h2>
          <div class="detail-tags" v-if="detailCard.tags.length">
            <span v-for="t in detailCard.tags" :key="t" class="mini-tag">#{{ t }}</span>
          </div>
        </div>
      </template>
      <div class="detail-content" v-if="detailCard" v-html="detailHtml"></div>
      <template #footer>
        <div class="detail-footer">
          <span class="detail-meta" v-if="detailCard">创建于 {{ formatDate(detailCard.createdAt) }} · 更新于 {{ formatDate(detailCard.updatedAt) }}</span>
          <div class="detail-actions">
            <button class="btn-ghost" @click="detailOpen = false">关闭</button>
            <button class="btn-primary" @click="editFromDetail">
              <el-icon><EditPen /></el-icon>编辑
            </button>
          </div>
        </div>
      </template>
    </el-dialog>

    <!-- LeetCode 导入弹窗 -->
    <el-dialog v-model="leetcodeDialog" title="导入 LeetCode 题目" width="560px" class="lc-dialog">
      <div class="import-step" v-if="!fetchedProblem">
        <p class="import-tip">输入题目标题 slug 或完整链接，例如：</p>
        <ul class="examples">
          <li><code>two-sum</code></li>
          <li><code>https://leetcode.cn/problems/two-sum/</code></li>
        </ul>
        <el-input v-model="lcInput" placeholder="请输入题号 slug 或链接" size="large" clearable @keyup.enter="handleFetch">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <button class="btn-primary fetch-btn" :disabled="loading" @click="handleFetch">
          <el-icon v-if="loading" class="is-loading"><Loading /></el-icon>
          {{ loading ? '获取中...' : '获取题目' }}
        </button>
        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
      </div>
      <div class="import-step" v-else>
        <div class="problem-preview">
          <div class="preview-head">
            <span class="lc-id">#{{ fetchedProblem.id }}</span>
            <h3 class="preview-title">{{ fetchedProblem.title }}</h3>
            <span class="difficulty" :style="{ color: DIFFICULTY_COLOR[fetchedProblem.difficulty] }">{{ fetchedProblem.difficulty }}</span>
          </div>
          <div class="preview-tags">
            <span v-for="t in fetchedProblem.topics" :key="t" class="topic-tag">{{ t }}</span>
          </div>
          <div class="preview-content" v-html="fetchedProblem.content"></div>
          <div class="preview-actions">
            <button class="btn-ghost" @click="fetchedProblem = null">重新输入</button>
            <button class="btn-primary" @click="handleImport">
              <el-icon><Plus /></el-icon>确认导入
            </button>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { Plus, Link, Search, Loading, Delete, Check, Document, EditPen, Close } from '@element-plus/icons-vue'
import { db, seedDb } from '../utils/db'
import { createInitialFsrs } from '../utils/fsrs'
import { type Card } from '../utils/db'
import {
  fetchLeetCodeProblem, parseSlug, DIFFICULTY_COLOR,
  problemToMarkdown, type LeetCodeProblem
} from '../utils/leetcode'

// ====== 分类颜色 ======
const CAT_COLORS: Record<string, string> = {
  '前端': '#3b82f6', 'Java': '#f59e0b', '算法': '#10b981',
  '网络': '#8b5cf6', '数据库': '#ec4899', '其他': '#64748b'
}
const catColor = (c: string) => CAT_COLORS[c] || CAT_COLORS['其他']

// ====== 加载全部卡片 ======
const allCards = ref<Card[]>([])
const activeCat = ref('')
const searchKey = ref('')
const categories = ref<string[]>([])
const route = useRoute()
const catCount = computed(() => {
  const m: Record<string, number> = {}
  allCards.value.forEach(c => { m[c.category] = (m[c.category] || 0) + 1 })
  return m
})
// 展示列表 = 分类过滤 + 搜索过滤（标题/正文/标签任一命中，不分大小写）
const cards = computed(() => {
  let list = activeCat.value
    ? allCards.value.filter(c => c.category === activeCat.value)
    : allCards.value
  const k = searchKey.value.trim().toLowerCase()
  if (k) {
    list = list.filter(c =>
      c.title.toLowerCase().includes(k) ||
      (c.content || '').toLowerCase().includes(k) ||
      (c.tags || []).some(t => t.toLowerCase().includes(k))
    )
  }
  return list
})

// ====== 搜索体验：Ctrl+K 聚焦 + 标题关键词高亮 ======
const searchInputEl = ref<HTMLInputElement | null>(null)

function onGlobalKey(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    searchInputEl.value?.focus()
    searchInputEl.value?.select()
  }
}
onMounted(() => window.addEventListener('keydown', onGlobalKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onGlobalKey))

/** 把标题按关键词切分成 {文本, 是否命中} 段，纯文本操作无 XSS 风险 */
function highlightTitle(title: string): { text: string; hit: boolean }[] {
  const k = searchKey.value.trim()
  if (!k) return [{ text: title, hit: false }]
  const lower = title.toLowerCase()
  const lk = k.toLowerCase()
  const parts: { text: string; hit: boolean }[] = []
  let i = 0
  while (true) {
    const idx = lower.indexOf(lk, i)
    if (idx === -1) { parts.push({ text: title.slice(i), hit: false }); break }
    if (idx > i) parts.push({ text: title.slice(i, idx), hit: false })
    parts.push({ text: title.slice(idx, idx + k.length), hit: true })
    i = idx + k.length
  }
  return parts
}

async function loadAll() {
  await seedDb()
  allCards.value = await db.cards.orderBy('createdAt').reverse().toArray()
  categories.value = [...new Set(allCards.value.map(c => c.category))]
  // 支持从顶栏搜索带过来的关键词
  if (route.query.q) searchKey.value = String(route.query.q)
}

onMounted(loadAll)
// 路由 query 变化时同步搜索词（用户在其他页面顶栏搜索后跳转过来）
watch(() => route.query.q, (q) => {
  if (q != null) searchKey.value = String(q)
})

// ====== 状态映射 ======
const statusText = (s: string) => ({ new: '未开始', learning: '学习中', review: '复习中', mastered: '已掌握' }[s] || s)

// ====== Markdown 工具 ======
marked.setOptions({ breaks: true })
const renderMd = (src: string) => DOMPurify.sanitize(marked.parse(src) as string)
const markdownPreview = (src: string) => {
  const plain = src.replace(/[#*`>\[\]()]/g, '').replace(/\n+/g, ' ')
  return plain.slice(0, 80) + (plain.length > 80 ? '...' : '')
}
const formatDate = (ts: number) => {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// ====== 编辑器 ======
const editorOpen = ref(false)
const editingCard = ref<Card | null>(null)
const draft = ref<Partial<Card>>({ title: '', category: '前端', tags: [], content: '' })
const tagsInput = ref('')
const rendered = computed(() => renderMd(draft.value.content || ''))

function openEditor(card?: Card) {
  if (card) {
    editingCard.value = card
    draft.value = { ...card }
    tagsInput.value = (card.tags || []).join(', ')
  } else {
    editingCard.value = null
    draft.value = { title: '', category: categories.value[0] || '前端', tags: [], content: '' }
    tagsInput.value = ''
  }
  editorOpen.value = true
}

// ====== 详情大屏：点卡片完整展示全文 ======
const detailOpen = ref(false)
const detailCard = ref<Card | null>(null)
const detailHtml = computed(() =>
  detailCard.value ? renderMd(detailCard.value.content || '') : ''
)

function openDetail(card: Card) {
  // 从 allCards 里取最新数据，避免编辑后显示旧内容
  detailCard.value = allCards.value.find(c => c.id === card.id) || card
  detailOpen.value = true
}

function editFromDetail() {
  if (!detailCard.value) return
  detailOpen.value = false
  openEditor(detailCard.value)
}

async function saveCard() {
  if (!draft.value.title?.trim()) { ElMessage.warning('请输入标题'); return }
  draft.value.tags = tagsInput.value.split(',').map(t => t.trim()).filter(Boolean)
  const now = Date.now()

  if (editingCard.value?.id) {
    await db.cards.update(editingCard.value.id, {
      ...draft.value,
      updatedAt: now
    } as any)
    ElMessage.success('已更新')
  } else {
    const cardId = await db.cards.add({
      title: draft.value.title!,
      content: draft.value.content || '',
      category: draft.value.category || '其他',
      tags: draft.value.tags || [],
      status: 'new',
      createdAt: now,
      updatedAt: now
    })
    await createInitialFsrs(cardId)
    ElMessage.success('已创建')
  }
  editorOpen.value = false
  await loadAll()
}

async function deleteCard(card: Card) {
  try {
    await ElMessageBox.confirm(`确定删除「${card.title}」？这会同时删除复习记录。`, '确认删除', {
      type: 'warning'
    })
  } catch { return }
  await db.transaction('rw', [db.cards, db.fsrs], async () => {
    await db.fsrs.where('cardId').equals(card.id!).delete()
    await db.cards.delete(card.id!)
  })
  ElMessage.success('已删除')
  await loadAll()
}

// ====== LeetCode 导入 ======
const leetcodeDialog = ref(false)
const lcInput = ref('')
const loading = ref(false)
const errorMsg = ref('')
const fetchedProblem = ref<LeetCodeProblem | null>(null)

async function handleFetch() {
  if (!lcInput.value.trim()) { errorMsg.value = '请输入题号或链接'; return }
  loading.value = true; errorMsg.value = ''
  try {
    const slug = parseSlug(lcInput.value)
    fetchedProblem.value = await fetchLeetCodeProblem(slug)
  } catch (e: any) {
    errorMsg.value = e.message || '获取失败'
  } finally { loading.value = false }
}

async function handleImport() {
  if (!fetchedProblem.value) return
  const p = fetchedProblem.value
  const md = problemToMarkdown(p)
  const now = Date.now()
  const id = await db.cards.add({
    title: `[${p.difficulty}] ${p.title}`,
    content: md,
    category: '算法',
    tags: ['LeetCode', ...p.topics],
    status: 'new',
    createdAt: now, updatedAt: now
  })
  await createInitialFsrs(id)
  ElMessage.success(`已导入：${p.title}`)
  leetcodeDialog.value = false
  fetchedProblem.value = null
  lcInput.value = ''
  await loadAll()
}
</script>

<style scoped>
.library { display: flex; flex-direction: column; gap: 20px; }
.page-head { display: flex; justify-content: space-between; align-items: flex-end; }
.head-actions { display: flex; gap: 10px; align-items: center; }

/* ====== 搜索栏 ====== */
.search-bar {
  display: flex; align-items: center; gap: 10px;
  max-width: 560px; height: 46px; padding: 0 14px;
  background: var(--bg-surface); border: 1px solid var(--border);
  border-radius: 12px;
  transition: all 0.2s;
}
.search-bar:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}
.search-bar.active { border-color: var(--accent); }
.search-icon { color: var(--text-muted); flex-shrink: 0; }
.search-field {
  flex: 1; min-width: 0;
  background: transparent; border: none; outline: none;
  color: var(--text-primary); font-size: 14px;
  font-family: var(--font-sans);
}
.search-field::placeholder { color: var(--text-muted); }
.search-clear {
  flex-shrink: 0;
  display: flex; align-items: center;
  background: transparent; border: none; color: var(--text-muted);
  cursor: pointer; padding: 4px; border-radius: 6px;
  transition: all 0.15s;
}
.search-clear:hover { color: var(--text-primary); background: var(--bg-surface-2); }
.search-count {
  flex-shrink: 0;
  font-size: 12px; font-weight: 600; color: var(--accent);
  background: var(--accent-glow);
  padding: 3px 10px; border-radius: 20px; white-space: nowrap;
}
.search-kbd {
  flex-shrink: 0;
  font-size: 11px; color: var(--text-muted);
  border: 1px solid var(--border-light); border-radius: 6px;
  padding: 2px 8px;
  font-family: var(--font-mono);
}
/* 卡片标题里的关键词高亮 */
.card-title .hit {
  color: var(--accent);
  background: var(--accent-glow);
  border-radius: 3px; padding: 0 1px;
}
/* 幽灵按钮（清除搜索等） */
.btn-ghost {
  padding: 8px 18px;
  background: transparent; color: var(--text-secondary);
  border: 1px solid var(--border-light); border-radius: 10px;
  font-size: 13px; cursor: pointer; font-family: var(--font-sans);
  transition: all 0.2s;
}
.btn-ghost:hover { border-color: var(--accent); color: var(--accent); }
.clear-search-btn { margin-top: 4px; }
.btn-import {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 18px;
  background: transparent; color: var(--text-primary);
  border: 1px solid var(--border-light); border-radius: 10px;
  font-weight: 500; font-size: 14px; cursor: pointer;
  transition: all 0.2s; font-family: var(--font-sans);
}
.btn-import:hover { border-color: var(--accent); color: var(--accent); }
.page-title { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
.page-desc { color: var(--text-muted); font-size: 13px; }
.btn-primary {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 18px;
  background: var(--accent); color: #0a0e1a; border: none;
  border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer;
  font-family: var(--font-sans);
}
.btn-primary:hover { background: var(--accent-light); }

.category-bar { display: flex; gap: 8px; flex-wrap: wrap; }
.cat-item {
  padding: 7px 16px;
  background: var(--bg-surface); border: 1px solid var(--border);
  border-radius: 20px; font-size: 13px;
  color: var(--text-secondary); cursor: pointer;
  transition: all 0.2s; display: flex; align-items: center; gap: 6px;
}
.cat-item.active { background: var(--accent); color: #0a0e1a; border-color: var(--accent); font-weight: 600; }
.cat-item .count { font-size: 11px; opacity: 0.7; }

.card-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px;
}
.know-card {
  background: var(--bg-surface); border: 1px solid var(--border);
  border-radius: var(--radius-md); padding: 18px;
  display: flex; flex-direction: column; gap: 10px;
  transition: all 0.2s; cursor: pointer; position: relative;
}
.know-card:hover { border-color: var(--border-light); transform: translateY(-2px); box-shadow: var(--shadow-md); }
.card-top { display: flex; justify-content: space-between; align-items: center; }
.card-tag { padding: 3px 10px; border-radius: 5px; font-size: 11px; font-weight: 600; }
.card-status { font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 4px; }
.card-status.new { color: var(--text-muted); }
.card-status.learning { color: var(--info); }
.card-status.review { color: var(--accent); }
.card-status.mastered { color: var(--success); }
.card-title { font-size: 15px; font-weight: 600; line-height: 1.4; }
.card-preview {
  font-size: 13px; color: var(--text-secondary); line-height: 1.5;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.card-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.mini-tag {
  font-size: 10px; padding: 2px 8px;
  background: var(--bg-surface-2); border-radius: 4px; color: var(--text-muted);
}
.card-bottom {
  display: flex; justify-content: space-between; align-items: center;
  padding-top: 10px; border-top: 1px solid var(--border);
  margin-top: 4px;
}
.card-meta { font-size: 12px; color: var(--text-muted); }
.del-btn {
  padding: 4px; background: transparent; border: none;
  color: var(--text-muted); cursor: pointer; border-radius: 4px;
}
.del-btn:hover { color: var(--danger); }

.empty-state {
  grid-column: 1 / -1; text-align: center; padding: 60px 20px;
  color: var(--text-muted); display: flex; flex-direction: column; gap: 14px; align-items: center;
}

/* 编辑器 */
.editor-form { display: flex; flex-direction: column; gap: 16px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 12px; color: var(--text-secondary); font-weight: 500; }
.field-head { display: flex; justify-content: space-between; align-items: center; }
.field-head .hint { font-size: 11px; color: var(--text-muted); }
.field-row { display: flex; gap: 12px; }
.field.half { flex: 1; }
.editor-split {
  display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
  height: 360px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden;
}
.md-textarea {
  width: 100%; height: 100%; padding: 12px;
  background: var(--bg-base); border: none; resize: none;
  color: var(--text-primary); font-family: var(--font-mono);
  font-size: 13px; line-height: 1.6; outline: none;
}
.md-textarea:focus { background: var(--bg-surface); }
.md-preview {
  padding: 12px; overflow-y: auto;
  background: var(--bg-surface); font-size: 13px; line-height: 1.7;
  color: var(--text-primary);
}
.md-preview :deep(h1), .md-preview :deep(h2), .md-preview :deep(h3) {
  margin: 12px 0 8px; font-weight: 600;
}
.md-preview :deep(h1) { font-size: 18px; }
.md-preview :deep(h2) { font-size: 16px; }
.md-preview :deep(h3) { font-size: 15px; }
.md-preview :deep(pre) {
  background: #0d1117; padding: 10px; border-radius: 6px;
  overflow-x: auto; font-family: var(--font-mono); font-size: 12px; margin: 8px 0;
}
.md-preview :deep(code) { font-family: var(--font-mono); }
.md-preview :deep(ul), .md-preview :deep(ol) { padding-left: 20px; margin: 8px 0; }
.md-preview :deep(blockquote) {
  border-left: 3px solid var(--accent); padding-left: 12px; color: var(--text-secondary); margin: 8px 0;
}

/* ====== 详情大屏弹窗 ====== */
.detail-header { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
.detail-title { font-size: 22px; font-weight: 700; line-height: 1.4; }
.detail-tags { display: flex; gap: 6px; flex-wrap: wrap; }

.detail-content {
  /* 高度基本占满视口，只有这一层滚动，代码块再自己滚 */
  max-height: calc(100vh - 240px);
  overflow-y: auto;
  padding: 4px 12px 4px 4px;
  font-size: 15px; line-height: 1.8; color: var(--text-primary);
}
.detail-content :deep(h1),
.detail-content :deep(h2),
.detail-content :deep(h3) { margin: 20px 0 10px; font-weight: 600; }
.detail-content :deep(h1) { font-size: 22px; }
.detail-content :deep(h2) { font-size: 19px; }
.detail-content :deep(h3) { font-size: 16px; }
.detail-content :deep(p) { margin: 10px 0; }
.detail-content :deep(pre) {
  background: #0d1117; padding: 14px; border-radius: 8px;
  overflow: auto; max-height: 420px; /* 代码块内部滚动 */
  font-family: var(--font-mono); font-size: 13px; line-height: 1.7;
  margin: 12px 0;
}
.detail-content :deep(code) { font-family: var(--font-mono); }
.detail-content :deep(ul), .detail-content :deep(ol) { padding-left: 24px; margin: 10px 0; }
.detail-content :deep(li) { line-height: 1.9; }
.detail-content :deep(blockquote) {
  border-left: 3px solid var(--accent); padding: 6px 0 6px 14px;
  color: var(--text-secondary); margin: 12px 0;
}
.detail-content :deep(table) { border-collapse: collapse; margin: 12px 0; width: 100%; }
.detail-content :deep(th), .detail-content :deep(td) {
  border: 1px solid var(--border); padding: 8px 12px; font-size: 14px; text-align: left;
}

.detail-footer { display: flex; justify-content: space-between; align-items: center; }
.detail-meta { font-size: 12px; color: var(--text-muted); }
.detail-actions { display: flex; gap: 10px; }
</style>
