<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useAiStore } from '../stores/ai'

const ai = useAiStore()
const pos = ref({ x: 0, y: 0 })

// 从 localStorage 恢复位置
const POS_KEY = 'ai-ball-pos'
onMounted(() => {
  try {
    const raw = localStorage.getItem(POS_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      pos.value = clamp(p.x, p.y)
    } else {
      // 默认右下角
      pos.value = clamp(window.innerWidth - 80, window.innerHeight - 120)
    }
  } catch { /* ignore */ }
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => window.removeEventListener('resize', onResize))

function clamp(x: number, y: number) {
  const w = window.innerWidth, h = window.innerHeight
  return {
    x: Math.min(Math.max(8, x), w - 64),
    y: Math.min(Math.max(8, y), h - 64)
  }
}
function onResize() {
  pos.value = clamp(pos.value.x, pos.value.y)
}

// 拖动逻辑（pointer 事件），点击切换单独用 click 事件，避免冲突
let dragging = false
let startX = 0, startY = 0, origX = 0, origY = 0, moved = false

function onDown(e: PointerEvent) {
  dragging = true
  moved = false
  startX = e.clientX
  startY = e.clientY
  origX = pos.value.x
  origY = pos.value.y
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
}
function onMove(e: PointerEvent) {
  if (!dragging) return
  const dx = e.clientX - startX
  const dy = e.clientY - startY
  if (Math.abs(dx) + Math.abs(dy) > 3) moved = true
  pos.value = clamp(origX + dx, origY + dy)
}
function onUp() {
  if (!dragging) return
  dragging = false
  try { localStorage.setItem(POS_KEY, JSON.stringify(pos.value)) } catch { /* ignore */ }
}
function onClick() {
  // 只有真正的点击（非拖动）才切换面板
  if (!moved) ai.toggle()
}
</script>

<template>
  <div
      class="ai-ball"
      :style="{ left: pos.x + 'px', top: pos.y + 'px' }"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @click="onClick"
      :title="ai.open ? '收起助手' : 'AI 助手（Ctrl+I）'"
    >
    <span class="ball-icon">
      <svg viewBox="0 0 24 24" width="30" height="30" fill="none">
        <!-- 天线 -->
        <line x1="12" y1="2" x2="12" y2="5" stroke="white" stroke-width="2" stroke-linecap="round"/>
        <circle cx="12" cy="1.5" r="1.5" fill="white"/>
        <!-- 头部 -->
        <rect x="4" y="5" width="16" height="13" rx="4" fill="rgba(255,255,255,0.15)" stroke="white" stroke-width="1.8"/>
        <!-- 眼睛 -->
        <circle cx="9" cy="11" r="1.8" fill="white"/>
        <circle cx="15" cy="11" r="1.8" fill="white"/>
        <!-- 嘴 -->
        <path d="M9 15 Q12 17.5 15 15" stroke="white" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        <!-- 耳朵 -->
        <circle cx="3.5" cy="11.5" r="1.5" fill="white"/>
        <circle cx="20.5" cy="11.5" r="1.5" fill="white"/>
      </svg>
    </span>
    <span v-if="!ai.open" class="ball-pulse"></span>
  </div>
</template>

<style scoped>
.ai-ball {
  position: fixed;
  width: 56px; height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  display: flex; align-items: center; justify-content: center;
  cursor: grab;
  z-index: 9999;
  box-shadow: 0 8px 24px rgba(124, 58, 237, 0.45);
  transition: transform 0.2s, box-shadow 0.2s;
  user-select: none;
  touch-action: none;
}
.ai-ball:active { cursor: grabbing; }
.ai-ball:hover {
  transform: scale(1.08);
  box-shadow: 0 10px 28px rgba(124, 58, 237, 0.6);
}
.ball-icon {
  display: flex; align-items: center; justify-content: center;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
}
.ball-pulse {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid #7c3aed;
  opacity: 0.6;
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(1.6); opacity: 0; }
}
</style>
