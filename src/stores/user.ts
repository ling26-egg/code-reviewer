import { defineStore } from 'pinia'

/**
 * 用户信息 store —— localStorage 持久化
 * 头像存压缩后的 base64 dataURL（128px，足够小）
 */
const KEY = 'code-reviewer-user'

interface UserState {
  nickname: string
  avatar: string       // base64 dataURL，空字符串表示用默认头像
  bio: string          // 个性签名
}

function load(): UserState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { nickname: '学习者', avatar: '', bio: '每天进步一点点 ✨', ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return { nickname: '学习者', avatar: '', bio: '每天进步一点点 ✨' }
}

// 预设头像（emoji + 渐变色背景），用户可直接选用
export const PRESET_AVATARS: { emoji: string; bg: string }[] = [
  { emoji: '🧑‍💻', bg: 'linear-gradient(135deg,#4f46e5,#7c3aed)' },
  { emoji: '🦊', bg: 'linear-gradient(135deg,#f59e0b,#ef4444)' },
  { emoji: '🐼', bg: 'linear-gradient(135deg,#10b981,#06b6d4)' },
  { emoji: '🐱', bg: 'linear-gradient(135deg,#ec4899,#f43f5e)' },
  { emoji: '🦉', bg: 'linear-gradient(135deg,#8b5cf6,#6366f1)' },
  { emoji: '🐯', bg: 'linear-gradient(135deg,#f97316,#eab308)' },
  { emoji: '🚀', bg: 'linear-gradient(135deg,#3b82f6,#8b5cf6)' },
  { emoji: '🌟', bg: 'linear-gradient(135deg,#fbbf24,#f97316)' }
]

export const useUserStore = defineStore('user', {
  state: (): UserState => load(),
  actions: {
    save() {
      const { nickname, avatar, bio } = this
      localStorage.setItem(KEY, JSON.stringify({ nickname, avatar, bio }))
    },
    setNickname(name: string) {
      this.nickname = name.trim() || '学习者'
      this.save()
    },
    setBio(b: string) {
      this.bio = b
      this.save()
    },
    setAvatar(dataUrl: string) {
      this.avatar = dataUrl
      this.save()
    },
    clearAvatar() {
      this.avatar = ''
      this.save()
    }
  }
})

/** 把本地图片文件压缩成 128x128 的 base64 dataURL */
export async function compressImage(file: File, size = 128): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')!
      // 居中裁剪正方形
      const s = Math.min(img.width, img.height)
      const sx = (img.width - s) / 2
      const sy = (img.height - s) / 2
      ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}
