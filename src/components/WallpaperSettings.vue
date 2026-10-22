<template>
  <div class="wallpaper-panel">
    <!-- 当前壁纸预览 -->
    <div class="current-preview">
      <div class="preview-box">
        <video
          v-if="store.isVideo && store.current"
          :src="store.current.url"
          muted autoplay loop playsinline
        ></video>
        <img v-else-if="store.current" :src="store.current.url" alt="当前壁纸" />
        <div v-else class="no-wallpaper">
          <el-icon :size="28"><PictureFilled /></el-icon>
          <span>未设置壁纸</span>
        </div>
        <div v-if="store.isVideo" class="video-tag">🎬 视频</div>
      </div>
      <div class="preview-actions">
        <button class="btn-ghost" @click="onPickFiles">
          <el-icon><Upload /></el-icon>
          选图片/视频
        </button>
        <button class="btn-primary-fix" @click="onPickFolder">
          <el-icon><Folder /></el-icon>
          选 Wallpaper Engine 文件夹
        </button>
        <button v-if="store.current" class="btn-danger-ghost" @click="store.clear()">
          <el-icon><Delete /></el-icon>
          恢复默认
        </button>
        <input
          ref="fileInput"
          type="file"
          accept="image/*,video/*"
          style="display: none"
          @change="onFileChange"
        />
      </div>
    </div>

    <!-- 效果调节 -->
    <div v-if="store.current" class="effects-row">
      <div class="effect-item">
        <span class="effect-label">模糊</span>
        <el-slider v-model="blur" :min="0" :max="20" style="width: 140px" />
        <span class="effect-val">{{ blur }}px</span>
      </div>
      <div class="effect-item">
        <span class="effect-label">亮度</span>
        <el-slider v-model="brightness" :min="0.3" :max="1" :step="0.05" style="width: 140px" />
        <span class="effect-val">{{ Math.round(brightness * 100) }}%</span>
      </div>
      <div class="effect-item">
        <span class="effect-label">透明度</span>
        <el-slider v-model="opacity" :min="0.3" :max="1" :step="0.05" style="width: 140px" />
        <span class="effect-val">{{ Math.round(opacity * 100) }}%</span>
      </div>
      <div v-if="store.isVideo" class="effect-item">
        <span class="effect-label">静音</span>
        <el-switch v-model="muted" size="default" />
      </div>
    </div>

    <!-- 扫描到的壁纸列表 -->
    <div v-if="store.scanned.length > 0" class="scan-section">
      <div class="scan-head">
        <h4>📂 扫描到 {{ store.scanned.length }} 个壁纸</h4>
        <span class="scan-tip">点击即可设为壁纸</span>
      </div>
      <div class="scan-grid">
        <div
          v-for="(item, idx) in store.scanned"
          :key="idx"
          class="scan-item"
          :class="{ active: store.current?.url === item.url }"
          @click="pickItem(item)"
        >
          <video
            v-if="item.mediaType === 'video'"
            :src="item.url"
            muted autoplay loop playsinline
          ></video>
          <img v-else :src="item.url" alt="" />
          <div class="scan-info">
            <span class="scan-name" :title="item.name">{{ item.name }}</span>
            <span class="scan-type">{{ item.mediaType === 'video' ? '🎬 视频' : '🖼️ 图片' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 使用说明 -->
    <div class="hint-box">
      <el-icon><InfoFilled /></el-icon>
      <div>
        <strong>Wallpaper Engine 文件夹在哪找？</strong>
        打开 Wallpaper Engine → 右键一张你喜欢的壁纸 → 选择 <em>「在资源管理器中打开」</em> → 把那个文件夹路径复制给我就行。
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { PictureFilled, Upload, Folder, Delete, InfoFilled } from '@element-plus/icons-vue'
import { useWallpaperStore, type WallpaperItem } from '../stores/wallpaper'

const store = useWallpaperStore()
const fileInput = ref<HTMLInputElement>()

const blur = computed({
  get: () => store.blur,
  set: v => store.setEffects({ blur: v })
})
const brightness = computed({
  get: () => store.brightness,
  set: v => store.setEffects({ brightness: v })
})
const opacity = computed({
  get: () => store.opacity,
  set: v => store.setEffects({ opacity: v })
})
const muted = computed({
  get: () => store.muted,
  set: v => store.setEffects({ muted: v })
})

/** 选单个文件 */
function onPickFiles() {
  fileInput.value?.click()
}
async function onFileChange(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files || !files.length) return
  const file = files[0]
  if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
    ElMessage.warning('请选择图片或视频文件')
    return
  }
  await store.setFromBlob(file, file.name)
  ElMessage.success('壁纸已设置')
  ;(e.target as HTMLInputElement).value = ''
}

/** 选 Wallpaper Engine 文件夹 */
async function onPickFolder() {
  // showDirectoryPicker 只在 HTTPS 和 localhost 可用
  if (!(window as any).showDirectoryPicker) {
    ElMessage.warning('当前浏览器不支持文件夹选择，请使用 Chrome/Edge，或改用「选图片/视频」按钮')
    return
  }
  try {
    const handle = await (window as any).showDirectoryPicker({
      mode: 'read',
      startIn: 'desktop'
    })
    ElMessage.info('正在扫描文件夹，请稍候...')
    const items = await store.scanFolder(handle)
    if (!items.length) {
      ElMessage.warning('没找到可用的壁纸（支持 jpg/png/gif/webp/mp4/webm）')
    } else {
      ElMessage.success(`扫描到 ${items.length} 个壁纸，点击下方缩略图应用`)
    }
  } catch (err: any) {
    if (err?.name !== 'AbortError') {
      ElMessage.error('扫描失败：' + (err?.message || '未知错误'))
    }
  }
}

async function pickItem(item: WallpaperItem) {
  // 从已扫描列表里取 file 对象需要重新保存，这里直接用 blob url 存 IndexedDB
  // 简单做法：fetch 一遍 blob
  try {
    const res = await fetch(item.url)
    const blob = await res.blob()
    await store.setFromBlob(blob, item.name)
    ElMessage.success('壁纸已设置')
  } catch {
    ElMessage.error('无法设置此壁纸')
  }
}
</script>

<style scoped>
.wallpaper-panel { display: flex; flex-direction: column; gap: 16px; }

.current-preview { display: flex; gap: 16px; align-items: flex-start; }
.preview-box {
  width: 240px;
  height: 135px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--border-light);
  background: var(--bg-surface-2);
  flex-shrink: 0;
  position: relative;
}
.preview-box img, .preview-box video { width: 100%; height: 100%; object-fit: cover; display: block; }
.no-wallpaper {
  width: 100%; height: 100%;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 8px; color: var(--text-muted); font-size: 12px;
}
.video-tag {
  position: absolute; top: 6px; left: 6px;
  padding: 2px 8px;
  background: rgba(245, 158, 11, 0.85);
  color: #0a0e1a; font-size: 11px; font-weight: 600;
  border-radius: 4px;
}
.preview-actions { display: flex; flex-direction: column; gap: 8px; }

.btn-ghost, .btn-danger-ghost {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 16px;
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  font-size: 13px; cursor: pointer;
  font-family: var(--font-sans);
  transition: all 0.2s;
  width: 180px; justify-content: center;
}
.btn-ghost:hover { border-color: var(--accent); color: var(--accent); }
.btn-danger-ghost:hover { border-color: var(--danger); color: var(--danger); }

.btn-primary-fix {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 16px;
  background: var(--accent);
  color: #0a0e1a;
  border: none; border-radius: 8px;
  font-size: 13px; font-weight: 600;
  cursor: pointer; font-family: var(--font-sans);
  width: 180px; justify-content: center;
  transition: all 0.2s;
}
.btn-primary-fix:hover { background: var(--accent-light); }

.effects-row {
  display: flex; gap: 24px; flex-wrap: wrap;
  padding: 14px;
  background: var(--bg-surface-2);
  border-radius: 10px;
}
.effect-item { display: flex; align-items: center; gap: 10px; }
.effect-label { font-size: 13px; color: var(--text-secondary); width: 42px; }
.effect-val { font-size: 12px; color: var(--accent); font-family: var(--font-mono); width: 44px; }

.scan-section {
  border-top: 1px solid var(--border);
  padding-top: 16px;
}
.scan-head {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 12px;
}
.scan-head h4 { font-size: 14px; font-weight: 600; }
.scan-tip { font-size: 12px; color: var(--text-muted); }

.scan-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
  max-height: 340px;
  overflow-y: auto;
  padding-right: 4px;
}
.scan-item {
  position: relative;
  aspect-ratio: 16 / 10;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
  background: var(--bg-surface-2);
}
.scan-item:hover { transform: scale(1.03); }
.scan-item.active { border-color: var(--accent); }
.scan-item img, .scan-item video { width: 100%; height: 100%; object-fit: cover; display: block; }
.scan-info {
  position: absolute; bottom: 0; left: 0; right: 0;
  padding: 4px 8px;
  background: linear-gradient(transparent, rgba(0,0,0,0.85));
  display: flex; justify-content: space-between; align-items: center;
}
.scan-name {
  font-size: 10px; color: #e5e7eb;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  max-width: 100px;
}
.scan-type { font-size: 10px; }

.hint-box {
  display: flex; gap: 10px; align-items: flex-start;
  padding: 12px 14px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: 8px;
  font-size: 12px; color: var(--text-secondary);
  line-height: 1.6;
}
.hint-box strong { color: var(--accent); }
.hint-box em { color: var(--accent); font-style: normal; }
</style>
