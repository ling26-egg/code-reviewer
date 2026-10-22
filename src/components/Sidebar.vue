<template>
  <aside class="sidebar" :class="{ collapsed: store.sidebarCollapsed }">
    <!-- Logo 区域 -->
    <div class="logo-area">
      <div class="logo-icon">
        <el-icon :size="22"><Cpu /></el-icon>
      </div>
      <transition name="fade">
        <div v-if="!store.sidebarCollapsed" class="logo-text">
          <span class="logo-title">CodeReview</span>
          <span class="logo-sub">代码知识复习站</span>
        </div>
      </transition>
    </div>

    <!-- 导航菜单 -->
    <nav class="nav-menu">
      <router-link
        v-for="item in menuItems"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        active-class="active"
      >
        <el-icon class="nav-icon"><component :is="item.icon" /></el-icon>
        <transition name="fade">
          <span v-if="!store.sidebarCollapsed" class="nav-label">{{ item.title }}</span>
        </transition>
        <span v-if="item.badge && !store.sidebarCollapsed" class="nav-badge">{{ item.badge }}</span>
      </router-link>
    </nav>

    <!-- 底部用户区 -->
    <el-popover
      v-model:visible="userMenuOpen"
      placement="top-start"
      :width="260"
      trigger="click"
      popper-class="user-popover"
    >
      <template #reference>
        <div class="user-area" :class="{ active: userMenuOpen }">
          <div class="user-avatar" :style="avatarStyle">
            <template v-if="user.avatar">
              <img :src="user.avatar" alt="avatar" />
            </template>
            <template v-else>
              <span>{{ user.nickname.charAt(0).toUpperCase() }}</span>
            </template>
          </div>
          <transition name="fade">
            <div v-if="!store.sidebarCollapsed" class="user-info">
              <span class="user-name">{{ user.nickname }}</span>
              <span class="user-streak">🔥 连续 {{ store.streak }} 天</span>
            </div>
          </transition>
        </div>
      </template>

      <!-- 弹出菜单内容 -->
      <div class="user-menu">
        <div class="um-head">
          <div class="um-avatar" :style="avatarStyle">
            <img v-if="user.avatar" :src="user.avatar" />
            <span v-else>{{ user.nickname.charAt(0).toUpperCase() }}</span>
          </div>
          <div class="um-meta">
            <div class="um-name">{{ user.nickname }}</div>
            <div class="um-bio">{{ user.bio }}</div>
          </div>
        </div>

        <div class="um-field">
          <label>昵称</label>
          <el-input v-model="nickDraft" size="small" maxlength="12" @change="onNicknameChange" />
        </div>
        <div class="um-field">
          <label>个性签名</label>
          <el-input v-model="bioDraft" size="small" maxlength="30" @change="onBioChange" />
        </div>

        <div class="um-field">
          <label>预设头像</label>
          <div class="preset-grid">
            <div
              v-for="(p, i) in PRESET_AVATARS"
              :key="i"
              class="preset-item"
              :style="{ background: p.bg }"
              @click="applyPreset(p)"
            >{{ p.emoji }}</div>
          </div>
        </div>

        <div class="um-field">
          <label>自定义头像</label>
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            class="file-hidden"
            @change="onFilePick"
          />
          <div class="um-actions">
            <button class="btn-upload" @click="fileInput?.click()">
              <el-icon><Upload /></el-icon> 上传图片
            </button>
            <button v-if="user.avatar" class="btn-reset" @click="user.clearAvatar()">
              恢复默认
            </button>
          </div>
        </div>
      </div>
    </el-popover>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Upload } from '@element-plus/icons-vue'
import { useAppStore } from '../stores/app'
import { useUserStore, PRESET_AVATARS, compressImage } from '../stores/user'
import { getStats } from '../utils/stats'
import {
  Monitor, Collection, Refresh, DataLine, Trophy, Setting
} from '@element-plus/icons-vue'

const store = useAppStore()
const user = useUserStore()
const route = useRoute()

const userMenuOpen = ref(false)
const nickDraft = ref(user.nickname)
const bioDraft = ref(user.bio)
const fileInput = ref<HTMLInputElement | null>(null)

// 真实今日待复习数（用于 sidebar badge）
const dueBadge = ref(0)
async function refreshDue() {
  try { dueBadge.value = (await getStats()).todayDue } catch { /* ignore */ }
}
onMounted(refreshDue)
watch(() => route.path, refreshDue)

// 默认头像背景（紫蓝渐变，和 AI 悬浮球呼应）
const avatarStyle = computed(() => {
  if (user.avatar) return { background: '#1e1e2e' }
  return { background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }
})

function onNicknameChange() {
  user.setNickname(nickDraft.value)
  ElMessage.success('昵称已更新')
}
function onBioChange() {
  user.setBio(bioDraft.value)
  ElMessage.success('签名已更新')
}

// 应用预设头像（把 emoji + 渐变画到 canvas 转 base64，这样 avatar 字段统一存图）
function applyPreset(p: { emoji: string; bg: string }) {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = p.bg
  ctx.fillRect(0, 0, 128, 128)
  ctx.font = '72px serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(p.emoji, 64, 70)
  user.setAvatar(canvas.toDataURL('image/png'))
  ElMessage.success('头像已更换')
}

async function onFilePick(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  if (!f.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件')
    return
  }
  try {
    const dataUrl = await compressImage(f)
    user.setAvatar(dataUrl)
    ElMessage.success('头像已更换')
  } catch {
    ElMessage.error('图片处理失败')
  }
  if (fileInput.value) fileInput.value.value = ''
}

const menuItems = computed(() => [
  { path: '/dashboard', title: '工作台', icon: Monitor },
  { path: '/library', title: '知识库', icon: Collection },
  { path: '/review', title: '复习', icon: Refresh, badge: dueBadge.value || undefined },
  { path: '/stats', title: '统计', icon: DataLine },
  { path: '/achievements', title: '成就', icon: Trophy },
  { path: '/settings', title: '设置', icon: Setting }
])
</script>

<style scoped>
.sidebar {
  width: 240px;
  height: 100vh;
  background: var(--bg-surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  flex-shrink: 0;
}
.sidebar.collapsed {
  width: 72px;
}

/* Logo */
.logo-area {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 18px;
  border-bottom: 1px solid var(--border);
  min-height: 72px;
}
.logo-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--accent), #d97706);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0a0e1a;
  flex-shrink: 0;
}
.logo-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}
.logo-title {
  font-weight: 700;
  font-size: 17px;
  color: var(--text-primary);
  letter-spacing: -0.3px;
}
.logo-sub {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}

/* 导航 */
.nav-menu {
  flex: 1;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  border-radius: 10px;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  position: relative;
}
.nav-item:hover {
  background: var(--bg-surface-2);
  color: var(--text-primary);
}
.nav-item.active {
  background: var(--accent-glow);
  color: var(--accent);
}
.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  background: var(--accent);
  border-radius: 0 3px 3px 0;
}
.nav-icon {
  font-size: 18px;
  flex-shrink: 0;
}
.nav-badge {
  margin-left: auto;
  background: var(--danger);
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 10px;
}

/* 用户区 */
.user-area {
  padding: 14px;
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: background 0.2s;
}
.user-area:hover { background: var(--bg-surface-hover); }
.user-area.active { background: var(--bg-surface-hover); }
.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
  overflow: hidden;
}
.user-avatar img { width: 100%; height: 100%; object-fit: cover; }
.user-info {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
  overflow: hidden;
}
.user-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
.user-streak {
  font-size: 11px;
  color: var(--accent);
  margin-top: 2px;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>

<!-- el-popover 内容 teleport 到 body，必须用非 scoped 样式 -->
<style>
.user-popover.el-popover {
  padding: 16px !important;
  background: var(--bg-surface) !important;
  border: 1px solid var(--border) !important;
  border-radius: 16px !important;
}
.user-menu { display: flex; flex-direction: column; gap: 14px; }
.um-head { display: flex; align-items: center; gap: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--border); }
.um-avatar {
  width: 48px; height: 48px; border-radius: 50%;
  background: linear-gradient(135deg,#4f46e5,#7c3aed);
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 600; font-size: 18px; overflow: hidden;
}
.um-avatar img { width: 100%; height: 100%; object-fit: cover; }
.um-meta { flex: 1; min-width: 0; }
.um-name { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.um-bio { font-size: 12px; color: var(--text-muted); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.um-field label { display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 6px; }
.preset-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.preset-item {
  width: 100%; aspect-ratio: 1; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}
.preset-item:hover { transform: scale(1.1); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
.um-actions { display: flex; gap: 8px; }
.btn-upload, .btn-reset {
  padding: 7px 14px; border-radius: 8px; font-size: 13px;
  cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px;
  border: 1px solid var(--border); background: var(--bg-card); color: var(--text-primary);
}
.btn-upload { background: linear-gradient(135deg,#4f46e5,#7c3aed); color: #fff; border: none; }
.btn-upload:hover { transform: translateY(-1px); }
.btn-reset:hover { border-color: var(--accent); color: var(--accent); }
.file-hidden { display: none; }
</style>
