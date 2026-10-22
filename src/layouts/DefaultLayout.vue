<template>
  <div class="layout" :class="{ 'has-wallpaper': !!wallpaper.activeUrl }">
    <!-- 图片壁纸 -->
    <div
      v-if="wallpaper.activeUrl && !wallpaper.isVideo"
      class="wallpaper-layer"
      :style="wallpaperStyle"
    ></div>
    <!-- 视频壁纸 -->
    <video
      v-else-if="wallpaper.activeUrl && wallpaper.isVideo"
      class="wallpaper-layer wallpaper-video"
      :src="wallpaper.activeUrl"
      :muted="wallpaper.muted"
      autoplay loop playsinline
      :style="wallpaperFilterStyle"
    ></video>

    <Sidebar />
    <div class="main-wrapper">
      <!-- 顶部栏 -->
      <header class="topbar">
        <div class="topbar-left">
          <button class="collapse-btn" @click="store.toggleSidebar()">
            <el-icon :size="20"><Fold /></el-icon>
          </button>
          <div class="search-box" @click="focusSearch">
            <el-icon class="search-icon"><Search /></el-icon>
            <input
              v-model="topSearch"
              type="text"
              placeholder="搜索知识点、代码片段..."
              @focus="goLibrary"
              @keyup.enter="goLibrary"
            />
            <kbd class="kbd">Ctrl K</kbd>
          </div>
        </div>
        <div class="topbar-right">
          <button class="icon-btn" title="AI 助手" @click="ai.toggle()">
            <el-icon :size="18"><MagicStick /></el-icon>
          </button>
          <el-popover
            v-model:visible="noticeOpen"
            placement="bottom-end"
            :width="320"
            trigger="click"
            popper-class="notice-popover"
          >
            <template #reference>
              <button class="icon-btn" title="通知">
                <el-icon :size="18"><Bell /></el-icon>
                <span v-if="notice.hasUnread" class="dot"></span>
              </button>
            </template>
            <div class="notice-panel">
              <div class="np-head">
                <span class="np-title">通知</span>
                <button v-if="notice.hasUnread" class="np-clear" @click="notice.markAllRead()">
                  全部已读
                </button>
              </div>
              <div v-if="notice.notices.length === 0" class="np-empty">
                <el-icon :size="28"><Bell /></el-icon>
                <p>暂无通知</p>
              </div>
              <div v-else class="np-list">
                <div
                  v-for="n in notice.notices"
                  :key="n.id"
                  class="np-item"
                  :class="{ unread: !notice.readIds.has(n.id) }"
                  @click="notice.markRead(n.id)"
                >
                  <div class="np-icon">{{ n.icon }}</div>
                  <div class="np-body">
                    <div class="np-item-title">{{ n.title }}</div>
                    <div class="np-desc">{{ n.desc }}</div>
                    <div class="np-time">{{ formatTime(n.time) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </el-popover>
          <div class="streak-chip">
            <span class="flame">🔥</span>
            <span>{{ store.streak }} 天</span>
          </div>
          <el-dropdown trigger="click" @command="onUserCmd">
            <button class="user-chip">
              <el-icon :size="14"><User /></el-icon>
              <span>{{ auth.username }}</span>
              <el-icon :size="12"><ArrowDown /></el-icon>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="settings">⚙️ 设置</el-dropdown-item>
                <el-dropdown-item command="export">📤 导出账号包</el-dropdown-item>
                <el-dropdown-item command="import">📥 导入账号包</el-dropdown-item>
                <el-dropdown-item divided command="logout" style="color:#ef4444">🚪 退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <!-- 主内容区 -->
      <main class="content">
        <router-view v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
    <!-- AI 助手悬浮球 + 面板（全局，仅登录后可见） -->
    <AIFloatingBall />
    <AIAssistant />
    <!-- 导入账号包用的隐藏 file input -->
    <input
      id="account-import-input" type="file" accept=".json"
      style="display:none"
      @change="handleAccountImport"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Sidebar from '../components/Sidebar.vue'
import AIFloatingBall from '../components/AIFloatingBall.vue'
import AIAssistant from '../components/AIAssistant.vue'
import { useAppStore } from '../stores/app'
import { useWallpaperStore } from '../stores/wallpaper'
import { useAiStore } from '../stores/ai'
import { useNoticeStore, type Notice } from '../stores/notice'
import { useAuthStore } from '../stores/auth'
import { getStats, getReviewQuality } from '../utils/stats'
import { Fold, Search, MagicStick, Bell, User, ArrowDown } from '@element-plus/icons-vue'

const store = useAppStore()
const wallpaper = useWallpaperStore()
const ai = useAiStore()
const notice = useNoticeStore()
const auth = useAuthStore()
const router = useRouter()
const topSearch = ref('')
const noticeOpen = ref(false)

// 用户下拉菜单命令
async function onUserCmd(cmd: string) {
  if (cmd === 'settings') {
    router.push('/settings')
  } else if (cmd === 'export') {
    const { exportAccount } = await import('../utils/backup')
    await exportAccount(auth.username)
  } else if (cmd === 'import') {
    // 触发隐藏的 file input
    const input = document.getElementById('account-import-input') as HTMLInputElement
    input?.click()
  } else if (cmd === 'logout') {
    auth.logout()
    router.replace('/login')
  }
}

// 隐藏的文件输入（用于导入账号包）
async function handleAccountImport(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  const { importAccount } = await import('../utils/backup')
  await importAccount(f, auth.username)
  ;(e.target as HTMLInputElement).value = ''
}

// 顶栏搜索：跳转知识库并带上关键词
function goLibrary() {
  router.push({ path: '/library', query: { q: topSearch.value } })
}
function focusSearch(e: Event) {
  ;(e.currentTarget as HTMLElement).querySelector('input')?.focus()
}

// 时间显示：今天/昨天/N 天前
function formatTime(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const thatDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diff = Math.round((today - thatDay) / 86400000)
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  if (diff === 0) return `今天 ${hm}`
  if (diff === 1) return `昨天 ${hm}`
  if (diff < 7) return `${diff} 天前`
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// 根据真实数据生成通知
async function buildNotices() {
  const list: Notice[] = []
  const now = Date.now()
  const ov = await getStats()

  // 1. 今日待复习提醒
  if (ov.todayDue > 0) {
    list.push({
      id: 'due-today',
      type: 'review',
      icon: '📚',
      title: `今日有 ${ov.todayDue} 个知识点待复习`,
      desc: '趁热打铁，巩固记忆效果最佳',
      time: now
    })
  }

  // 2. 连续打卡里程碑
  if (ov.streak >= 3 && ov.streak % 3 === 0) {
    list.push({
      id: `streak-${ov.streak}`,
      type: 'streak',
      icon: '🔥',
      title: `连续学习 ${ov.streak} 天`,
      desc: '坚持就是胜利，继续保持！',
      time: now - 60000
    })
  }

  // 3. 复习质量反馈（正确率偏低提醒）
  const q = await getReviewQuality()
  if (q.total >= 5 && q.accuracy < 60) {
    list.push({
      id: 'low-accuracy',
      type: 'review',
      icon: '💡',
      title: '最近复习正确率偏低',
      desc: `正确率 ${q.accuracy}%，建议回顾错题并标记重点`,
      time: now - 120000
    })
  }

  // 4. 成就提醒（即将解锁）
  if (ov.masteredCount > 0 && ov.masteredCount < 10) {
    list.push({
      id: 'first-10-mastered',
      type: 'achievement',
      icon: '🏅',
      title: '即将解锁「初窥门径」成就',
      desc: `已掌握 ${ov.masteredCount}/10 个知识点，再努力一下`,
      time: now - 180000
    })
  }

  notice.merge(list)
}

onMounted(async () => {
  await wallpaper.init()
  await buildNotices()
})

// 壁纸样式：图片 + 模糊 + 亮度 + 透明度
const wallpaperStyle = computed(() => ({
  backgroundImage: `url(${wallpaper.activeUrl})`,
  filter: `blur(${wallpaper.blur}px) brightness(${wallpaper.brightness})`,
  opacity: wallpaper.opacity
}))
// 视频壁纸只需要 filter
const wallpaperFilterStyle = computed(() => ({
  filter: `blur(${wallpaper.blur}px) brightness(${wallpaper.brightness})`,
  opacity: wallpaper.opacity
}))
</script>

<style scoped>
.layout {
  display: flex;
  width: 100%;
  height: 100vh;
  position: relative;
}

/* 壁纸背景层：铺满全屏，置于内容下方 */
.wallpaper-layer {
  position: absolute;
  inset: -20px; /* 留边防止模糊后边缘露底 */
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: 0;
  pointer-events: none;
  transition: opacity 0.4s ease;
}
/* 视频壁纸特别样式 */
.wallpaper-video {
  width: calc(100% + 40px);
  height: calc(100% + 40px);
  object-fit: cover;
}

.layout :deep(.sidebar),
.layout :deep(.main-wrapper) {
  position: relative;
  z-index: 1;
}

/* 有壁纸时：侧边栏/顶栏变半透明磨砂，让壁纸透出来 */
.layout.has-wallpaper :deep(.sidebar) {
  background: rgba(17, 24, 39, 0.72);
  backdrop-filter: blur(14px);
}
.layout.has-wallpaper .topbar {
  background: rgba(17, 24, 39, 0.6);
  backdrop-filter: blur(14px);
}
.layout.has-wallpaper .content {
  background: transparent;
}
.main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

/* 顶部栏 */
.topbar {
  height: 64px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
}
.topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  max-width: 600px;
}
.collapse-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.collapse-btn:hover {
  background: var(--bg-surface-2);
  color: var(--text-primary);
}
.search-box {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}
.search-box input {
  width: 100%;
  padding: 9px 12px 9px 38px;
  background: var(--bg-surface-2);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 13px;
  font-family: var(--font-sans);
  transition: all 0.2s;
}
.search-box input::placeholder {
  color: var(--text-muted);
}
.search-box input:focus {
  outline: none;
  border-color: var(--accent);
  background: var(--bg-base);
}
.search-icon {
  position: absolute;
  left: 12px;
  color: var(--text-muted);
  font-size: 16px;
}
.kbd {
  position: absolute;
  right: 10px;
  background: var(--bg-hover);
  color: var(--text-muted);
  font-size: 11px;
  font-family: var(--font-mono);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--border-light);
}
.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.icon-btn {
  width: 38px;
  height: 38px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  position: relative;
}
.icon-btn:hover {
  background: var(--bg-surface-2);
  color: var(--accent);
}
.dot {
  position: absolute;
  top: 8px;
  right: 9px;
  width: 8px;
  height: 8px;
  background: var(--danger);
  border-radius: 50%;
  border: 2px solid var(--bg-surface);
}
.streak-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  background: var(--bg-surface-2);
  border: 1px solid var(--border);
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
.flame {
  font-size: 15px;
}
.user-chip {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 12px;
  background: linear-gradient(135deg, rgba(79,70,229,0.25), rgba(124,58,237,0.25));
  border: 1px solid rgba(124,58,237,0.35);
  border-radius: 20px;
  font-size: 13px; font-weight: 600; color: #fff;
  cursor: pointer; transition: all 0.2s;
  font-family: var(--font-sans);
}
.user-chip:hover {
  background: linear-gradient(135deg, rgba(79,70,229,0.4), rgba(124,58,237,0.4));
  box-shadow: 0 0 16px rgba(124,58,237,0.3);
}

/* 内容区 */
.content {
  flex: 1;
  overflow-y: auto;
  padding: 28px 32px;
}

/* 页面切换动画 */
.page-enter-active, .page-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>

<!-- 通知 popover 是 teleport 到 body，必须用非 scoped 样式 -->
<style>
.notice-popover.el-popover {
  padding: 0 !important;
  background: var(--bg-surface) !important;
  border: 1px solid var(--border) !important;
  border-radius: 16px !important;
  overflow: hidden;
}
.notice-panel { display: flex; flex-direction: column; max-height: 420px; }
.np-head {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 16px; border-bottom: 1px solid var(--border);
}
.np-title { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.np-clear {
  background: none; border: none; color: var(--accent);
  font-size: 12px; cursor: pointer; padding: 0;
}
.np-clear:hover { text-decoration: underline; }
.np-empty {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 40px 0; color: var(--text-muted);
}
.np-empty p { margin: 0; font-size: 13px; }
.np-list { overflow-y: auto; }
.np-item {
  display: flex; gap: 12px; padding: 12px 16px;
  cursor: pointer; transition: background 0.15s;
  border-bottom: 1px solid var(--border);
}
.np-item:last-child { border-bottom: none; }
.np-item:hover { background: var(--bg-surface-hover); }
.np-item.unread { background: rgba(245, 158, 11, 0.06); }
.np-item.unread:hover { background: rgba(245, 158, 11, 0.12); }
.np-icon { font-size: 20px; line-height: 1; margin-top: 2px; }
.np-body { flex: 1; min-width: 0; }
.np-item-title { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.np-desc { font-size: 12px; color: var(--text-muted); margin-top: 3px; line-height: 1.4; }
.np-time { font-size: 11px; color: var(--text-muted); margin-top: 6px; opacity: 0.7; }
</style>
