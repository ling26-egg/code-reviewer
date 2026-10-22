<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from './stores/auth'
import { useWallpaperStore } from './stores/wallpaper'
import { seedDb, setCurrentUser } from './utils/db'

const auth = useAuthStore()
const wallpaper = useWallpaperStore()

onMounted(async () => {
  // 恢复登录状态
  auth.init()
  if (auth.loggedIn) {
    setCurrentUser(auth.username)
    // 该用户首次打开时注入种子数据
    await seedDb()
  }
  await wallpaper.init()
})
</script>

<template>
  <router-view />
</template>

<style>
/* Element Plus 暗色适配 */
.el-dialog { background: var(--bg-surface) !important; }
.el-dialog__title { color: var(--text-primary) !important; }
.el-dialog__body { color: var(--text-secondary) !important; }
.el-select-dropdown { background: var(--bg-surface) !important; }
.el-select-dropdown__item { color: var(--text-primary) !important; }
.el-select-dropdown__item.is-hovering { background: rgba(124,58,237,0.15) !important; }
.el-select-dropdown__item.is-selected { color: var(--accent) !important; }

/* 全局滚动条 */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.3); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: rgba(124,58,237,0.5); }

/* 代码高亮（Markdown 里的 <pre><code>） */
pre {
  background: #0d1117 !important;
  border-radius: 10px;
  padding: 14px 16px;
  overflow-x: auto;
  margin: 12px 0;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 13px;
  line-height: 1.7;
  border: 1px solid rgba(124,58,237,0.15);
  max-height: 420px;
  overflow-y: auto;
}
pre code { font-family: inherit; background: transparent !important; }
code {
  background: rgba(124,58,237,0.15);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12.5px;
}
</style>
