<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useAiStore, type SessionType, type AIMessage } from '../stores/ai'
import { useSettingsStore } from '../stores/settings'
import { streamChat, chat, QA_SYSTEM, interviewSystem, generatePrompt, type ChatMessage } from '../utils/ai'

const ai = useAiStore()
const settings = useSettingsStore()

marked.setOptions({ breaks: true })

// 渲染 Markdown（用 v-html，已用 DOMPurify 消毒）
function render(md: string) {
  return DOMPurify.sanitize(marked.parse(md || '') as string)
}

const input = ref('')
const genCount = ref(5)
const loading = ref(false)
const abortCtrl = ref<AbortController | null>(null)

const messages = computed(() => ai.messages[ai.session])
const listEl = ref<HTMLElement | null>(null)

watch(() => messages.value.length, scrollBottom)

function scrollBottom() {
  nextTick(() => {
    if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
  })
}

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

/** 通用发送：userMsg 用户文本，buildMessages 构造发给 API 的消息数组 */
async function send(userText: string, buildMessages: (history: AIMessage[]) => ChatMessage[]) {
  const session = ai.session
  ai.push(session, { id: genId(), role: 'user', content: userText })
  ai.push(session, { id: genId(), role: 'assistant', content: '', loading: true })
  scrollBottom()

  loading.value = true
  abortCtrl.value = new AbortController()
  try {
    const apiMsgs = buildMessages(ai.messages[session].filter(m => !m.loading))
    await streamChat({
      messages: apiMsgs,
      signal: abortCtrl.value.signal,
      onChunk: (delta) => ai.appendLast(session, delta)
    })
  } catch (e: any) {
    ai.appendLast(session, `\n\n❌ ${e.message || '请求失败'}`)
  } finally {
    ai.doneLast(session)
    loading.value = false
    abortCtrl.value = null
    scrollBottom()
  }
}

// ===== 自由问答 =====
async function sendQA() {
  const text = input.value.trim()
  if (!text || loading.value) return
  input.value = ''
  await send(text, (history) => {
    const ctx: ChatMessage[] = [QA_SYSTEM]
    for (const m of history) ctx.push({ role: m.role, content: m.content })
    return ctx
  })
}

// ===== 模拟面试 =====
async function sendInterview() {
  const text = input.value.trim()
  if (loading.value) return
  input.value = ''
  await send(text, (history) => {
    const ctx: ChatMessage[] = [interviewSystem(ai.direction)]
    for (const m of history) ctx.push({ role: m.role, content: m.content })
    return ctx
  })
}

/** 面试开始（首条消息，AI 自动出题） */
async function startInterview() {
  ai.clear('interview')
  ai.push('interview', { id: genId(), role: 'assistant', content: '', loading: true })
  loading.value = true
  abortCtrl.value = new AbortController()
  try {
    await streamChat({
      messages: [interviewSystem(ai.direction), { role: 'user', content: '开始面试' }],
      signal: abortCtrl.value.signal,
      onChunk: (delta) => ai.appendLast('interview', delta)
    })
  } catch (e: any) {
    ai.appendLast('interview', `❌ ${e.message || '请求失败'}`)
  } finally {
    ai.doneLast('interview')
    loading.value = false
    abortCtrl.value = null
    scrollBottom()
  }
}

// ===== 生成面试题 =====
interface GenQuestion { question: string; answer: string; difficulty: string; tags: string[] }
const genResult = ref<GenQuestion[]>([])
const genLoading = ref(false)

async function generateQuestions() {
  if (genLoading.value) return
  ai.clear('generate')
  genResult.value = []
  ai.push('generate', { id: genId(), role: 'user', content: `生成 ${genCount.value} 道${ai.direction}面试题` })
  ai.push('generate', { id: genId(), role: 'assistant', content: '正在出题…', loading: true })
  genLoading.value = true
  abortCtrl.value = new AbortController()
  try {
    const raw = await chat(generatePrompt(ai.direction, genCount.value), abortCtrl.value.signal)
    // 提取 JSON 数组（防止 AI 多输出文字）
    const m = raw.match(/\[[\s\S]*\]/)
    const arr = m ? JSON.parse(m[0]) : []
    genResult.value = arr
    ai.appendLast('generate', `已生成 ${arr.length} 道题目`)
  } catch (e: any) {
    ai.appendLast('generate', `❌ ${e.message || '生成失败'}`)
  } finally {
    ai.doneLast('generate')
    genLoading.value = false
    abortCtrl.value = null
  }
}

/** 切换到某个会话 tab */
function switchSession(s: SessionType) {
  ai.setSession(s)
}

function stop() {
  abortCtrl.value?.abort()
}

const tabs: { key: SessionType; label: string; icon: string }[] = [
  { key: 'qa', label: '问答', icon: '💬' },
  { key: 'interview', label: '模拟面试', icon: '🎤' },
  { key: 'generate', label: '生成面试题', icon: '📝' }
]
</script>

<template>
  <Teleport to="body">
    <Transition name="slide">
      <div v-if="ai.open" class="ai-panel">
        <!-- 头部 -->
        <div class="ai-header">
          <div class="ai-title">
            <span class="ai-logo">✨</span>
            <span>AI 助手</span>
          </div>
          <div class="ai-tabs">
            <button
              v-for="t in tabs"
              :key="t.key"
              class="tab"
              :class="{ active: ai.session === t.key }"
              @click="switchSession(t.key)"
            >
              <span class="tab-icon">{{ t.icon }}</span>{{ t.label }}
            </button>
          </div>
          <button class="close-btn" @click="ai.setOpen(false)">✕</button>
        </div>

        <!-- 模拟面试方向选择 -->
        <div v-if="ai.session === 'interview'" class="dir-bar">
          <span class="dir-label">方向：</span>
          <select v-model="ai.direction" class="dir-select" @change="ai.clear('interview')">
            <option>前端</option>
            <option>Java</option>
            <option>算法</option>
            <option>网络</option>
            <option>数据库</option>
            <option>操作系统</option>
          </select>
          <button v-if="!loading && ai.messages.interview.length === 0" class="start-btn" @click="startInterview">开始面试</button>
          <button v-else-if="loading" class="start-btn" disabled>面试中…</button>
        </div>

        <!-- 消息列表 -->
        <div ref="listEl" class="ai-messages">
          <div v-if="messages.length === 0" class="ai-empty">
            <template v-if="ai.session === 'qa'">
              <p>👋 你好！我是代码复习助手</p>
              <p class="hint">可以问我任何编程问题，比如：<br>「解释一下闭包」「HashMap 为什么线程不安全」</p>
            </template>
            <template v-else-if="ai.session === 'interview'">
              <p>🎤 模拟面试模式</p>
              <p class="hint">选择方向后点击「开始面试」，我会逐题提问并点评你的回答</p>
            </template>
            <template v-else>
              <p>📝 面试题生成器</p>
              <p class="hint">选择方向和数量，一键生成带答案的面试题</p>
            </template>
            <p v-if="!settings.apiKey" class="warn">⚠️ 请先到「设置」填入 API Key</p>
          </div>

          <div
            v-for="m in messages"
            :key="m.id"
            class="msg"
            :class="m.role"
          >
            <div class="msg-bubble" v-html="render(m.content)"></div>
            <span v-if="m.loading" class="typing"><i></i><i></i><i></i></span>
          </div>

          <!-- 生成面试题的结果卡片 -->
          <div v-if="ai.session === 'generate' && genResult.length" class="gen-list">
            <div v-for="(q, i) in genResult" :key="i" class="gen-card">
              <div class="gen-head">
                <span class="gen-idx">{{ i + 1 }}</span>
                <span class="gen-diff" :class="q.difficulty">{{ q.difficulty }}</span>
              </div>
              <p class="gen-q">{{ q.question }}</p>
              <details class="gen-ans">
                <summary>参考答案</summary>
                <div v-html="render(q.answer)"></div>
              </details>
              <div class="gen-tags">
                <span v-for="t in q.tags" :key="t" class="tag">{{ t }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部输入区 -->
        <div v-if="ai.session !== 'generate'" class="ai-footer">
          <textarea
            v-model="input"
            class="ai-input"
            :placeholder="ai.session === 'interview' ? '输入你的回答…' : '输入问题…（Enter 发送，Shift+Enter 换行）'"
            rows="2"
            @keydown.enter.exact.prevent="ai.session === 'interview' ? sendInterview() : sendQA()"
          />
          <div class="footer-actions">
            <button v-if="loading" class="stop-btn" @click="stop">停止</button>
            <button
              v-else
              class="send-btn"
              :disabled="!input.trim()"
              @click="ai.session === 'interview' ? sendInterview() : sendQA()"
            >
              发送
            </button>
          </div>
        </div>

        <!-- 生成面试题底部 -->
        <div v-else class="ai-footer gen-footer">
          <div class="gen-controls">
            <label>方向：
              <select v-model="ai.direction" class="dir-select">
                <option>前端</option>
                <option>Java</option>
                <option>算法</option>
                <option>网络</option>
                <option>数据库</option>
                <option>操作系统</option>
              </select>
            </label>
            <label>数量：
              <select v-model.number="genCount" class="dir-select">
                <option :value="3">3</option>
                <option :value="5">5</option>
                <option :value="10">10</option>
                <option :value="20">20</option>
              </select>
            </label>
          </div>
          <button class="send-btn" :disabled="genLoading" @click="generateQuestions">
            {{ genLoading ? '生成中…' : '生成面试题' }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.ai-panel {
  position: fixed;
  right: 24px;
  bottom: 96px;
  width: 420px;
  max-width: calc(100vw - 48px);
  height: 70vh;
  max-height: 680px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
  z-index: 9998;
  overflow: hidden;
}
.slide-enter-active, .slide-leave-active { transition: all 0.25s ease; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateY(20px) scale(0.96); }

.ai-header {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-surface-2);
}
.ai-title { display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 15px; white-space: nowrap; }
.ai-logo { font-size: 18px; }
.ai-tabs { display: flex; gap: 4px; flex: 1; justify-content: center; }
.tab {
  background: transparent; border: none; cursor: pointer;
  padding: 6px 10px; border-radius: 8px;
  font-size: 13px; color: var(--text-muted);
  display: flex; align-items: center; gap: 4px;
  transition: all 0.15s;
}
.tab:hover { color: var(--text-primary); background: var(--bg-surface); }
.tab.active { color: var(--accent); background: var(--accent-glow); }
.tab-icon { font-size: 14px; }
.close-btn {
  background: transparent; border: none; cursor: pointer;
  color: var(--text-muted); font-size: 16px;
  width: 28px; height: 28px; border-radius: 6px;
}
.close-btn:hover { color: var(--danger, #ef4444); background: var(--bg-surface); }

.dir-bar {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
}
.dir-label { color: var(--text-muted); }
.dir-select {
  background: var(--bg-surface-2);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 13px;
  font-family: var(--font-sans);
}
.start-btn {
  margin-left: auto;
  padding: 5px 14px;
  background: var(--accent); color: #000;
  border: none; border-radius: 6px;
  font-size: 13px; font-weight: 600; cursor: pointer;
}
.start-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.ai-messages {
  flex: 1; overflow-y: auto;
  padding: 16px;
  display: flex; flex-direction: column; gap: 12px;
}
.ai-empty { text-align: center; color: var(--text-muted); padding: 40px 20px; line-height: 1.8; }
.ai-empty .hint { font-size: 13px; }
.ai-empty .warn { color: var(--danger, #f87171); font-size: 12px; margin-top: 12px; }

.msg { display: flex; }
.msg.user { justify-content: flex-end; }
.msg.assistant { justify-content: flex-start; }
.msg-bubble {
  max-width: 85%;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px; line-height: 1.6;
  word-break: break-word;
}
.msg.user .msg-bubble {
  background: var(--accent); color: #000;
  border-bottom-right-radius: 4px;
}
.msg.assistant .msg-bubble {
  background: var(--bg-surface-2); color: var(--text-primary);
  border-bottom-left-radius: 4px;
  border: 1px solid var(--border-light);
}
.msg-bubble :deep(pre) {
  background: #0d1117; padding: 10px; border-radius: 8px;
  overflow-x: auto; margin: 8px 0; font-size: 12px;
}
.msg-bubble :deep(code) {
  background: rgba(135,131,120,0.15); padding: 1px 5px; border-radius: 4px;
  font-family: var(--font-mono); font-size: 12px;
}
.msg-bubble :deep(pre code) { background: transparent; padding: 0; }
.msg-bubble :deep(p) { margin: 0 0 6px; }
.msg-bubble :deep(p:last-child) { margin: 0; }

.typing { display: inline-flex; gap: 3px; margin-left: 8px; align-self: center; }
.typing i {
  width: 6px; height: 6px; border-radius: 50%; background: var(--text-muted);
  animation: bounce 1.2s infinite;
}
.typing i:nth-child(2) { animation-delay: 0.2s; }
.typing i:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce { 0%,80%,100% { transform: translateY(0); } 40% { transform: translateY(-5px); } }

.ai-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  background: var(--bg-surface-2);
}
.ai-input {
  width: 100%;
  background: var(--bg-surface);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px; font-family: var(--font-sans);
  resize: none; outline: none;
  box-sizing: border-box;
}
.ai-input:focus { border-color: var(--accent); }
.footer-actions { display: flex; justify-content: flex-end; margin-top: 8px; }
.send-btn, .stop-btn {
  padding: 7px 20px;
  border: none; border-radius: 8px;
  font-size: 14px; font-weight: 600; cursor: pointer;
  font-family: var(--font-sans);
}
.send-btn { background: var(--accent); color: #000; }
.send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.stop-btn { background: var(--bg-surface); color: var(--danger, #f87171); border: 1px solid var(--border); }

/* 生成面试题 */
.gen-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.gen-controls { display: flex; gap: 16px; font-size: 13px; color: var(--text-muted); }
.gen-controls select { margin-left: 4px; }

.gen-list { display: flex; flex-direction: column; gap: 12px; }
.gen-card {
  background: var(--bg-surface-2);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 14px;
}
.gen-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.gen-idx {
  width: 24px; height: 24px; border-radius: 50%;
  background: var(--accent); color: #000;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700;
}
.gen-diff {
  font-size: 11px; padding: 2px 8px; border-radius: 10px;
  font-weight: 600;
}
.gen-diff.简单 { background: rgba(16,185,129,0.2); color: #34d399; }
.gen-diff.中等 { background: rgba(245,158,11,0.2); color: #fbbf24; }
.gen-diff.困难 { background: rgba(239,68,68,0.2); color: #f87171; }
.gen-q { font-size: 14px; font-weight: 500; margin: 4px 0 8px; }
.gen-ans summary {
  cursor: pointer; color: var(--accent); font-size: 13px;
  list-style: none;
}
.gen-ans summary::before { content: '▼ '; font-size: 10px; }
.gen-ans[open] summary::before { content: '▲ '; }
.gen-ans > div {
  margin-top: 8px; padding: 10px;
  background: var(--bg-surface); border-radius: 8px;
  font-size: 13px; line-height: 1.6;
}
.gen-tags { margin-top: 8px; display: flex; gap: 6px; flex-wrap: wrap; }
.tag {
  font-size: 11px; padding: 2px 8px; border-radius: 10px;
  background: var(--bg-surface); color: var(--text-muted);
  border: 1px solid var(--border-light);
}
</style>
