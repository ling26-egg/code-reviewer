import { defineStore } from 'pinia'
import { idbSet, idbGet, idbDel } from '../utils/idb'

/** 壁纸来源类型 */
export type WallpaperType = 'none' | 'custom' | 'folder'
/** 壁纸媒体类型 */
export type MediaType = 'image' | 'video'

const SETTINGS_KEY = 'wallpaper-settings'
const MEDIA_KEY = 'wallpaper-media'

interface WallpaperSettings {
  type: WallpaperType
  mediaType: MediaType
  blur: number
  brightness: number
  opacity: number
  muted: boolean       // 视频是否静音
}

const DEFAULTS: WallpaperSettings = {
  type: 'none',
  mediaType: 'image',
  blur: 0,
  brightness: 0.55,
  opacity: 1,
  muted: true
}

export interface WallpaperItem {
  /** blob 地址，用于 <img> / <video> 显示 */
  url: string
  mediaType: MediaType
  /** 文件名 */
  name: string
  /** 文件大小（字节） */
  size: number
}

export const useWallpaperStore = defineStore('wallpaper', {
  state: () => ({
    ...DEFAULTS,
    /** 当前选中的壁纸 */
    current: null as WallpaperItem | null,
    /** 上次扫描到的 Wallpaper Engine 文件夹列表（缩略图） */
    scanned: [] as WallpaperItem[],
    loaded: false
  }),

  getters: {
    activeUrl: (s) => s.current?.url || '',
    isVideo: (s) => s.current?.mediaType === 'video'
  },

  actions: {
    /** 启动时恢复 */
    async init() {
      const saved = localStorage.getItem(SETTINGS_KEY)
      if (saved) {
        try { Object.assign(this, JSON.parse(saved)) } catch { /* 忽略 */ }
      }
      // 恢复壁纸 blob（图片或视频都存 IndexedDB）
      if (this.type !== 'none') {
        const blob = await idbGet<Blob>(MEDIA_KEY)
        if (blob) {
          const url = URL.createObjectURL(blob)
          const type: MediaType = blob.type.startsWith('video') ? 'video' : 'image'
          this.current = {
            url,
            mediaType: type,
            name: 'current',
            size: blob.size
          }
          this.mediaType = type
        } else {
          this.type = 'none'
        }
      }
      this.loaded = true
    },

    persist() {
      const o = {
        type: this.type, mediaType: this.mediaType,
        blur: this.blur, brightness: this.brightness,
        opacity: this.opacity, muted: this.muted
      }
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(o))
    },

    /** 把任意 File/Blob 设为壁纸（图片或视频自动识别） */
    async setFromBlob(blob: Blob, name = '') {
      // 释放旧的 blob URL
      if (this.current?.url.startsWith('blob:')) URL.revokeObjectURL(this.current.url)

      await idbSet(MEDIA_KEY, blob)
      const mediaType: MediaType = blob.type.startsWith('video') ? 'video' : 'image'
      this.current = {
        url: URL.createObjectURL(blob),
        mediaType,
        name,
        size: blob.size
      }
      this.type = blob.type.startsWith('video') ? 'folder' : 'custom'
      this.mediaType = mediaType
      this.persist()
    },

    /** 扫描一个文件夹，返回可用的壁纸列表 */
    async scanFolder(handle: FileSystemDirectoryHandle): Promise<WallpaperItem[]> {
      const items: WallpaperItem[] = []
      const files = await collectFiles(handle, 3) // 最多深入 3 层
      for (const file of files) {
        const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(file.name)
        const isVideo = /\.(mp4|webm|mkv|mov|avi)$/i.test(file.name)
        if (!isImage && !isVideo) continue
        try {
          const blob = await file.getFile()
          items.push({
            url: URL.createObjectURL(blob),
            mediaType: isVideo ? 'video' : 'image',
            name: file.name,
            size: blob.size
          })
        } catch { /* 跳过读不了的 */ }
      }
      // 视频排后面，图片优先
      items.sort((a, b) => a.mediaType.localeCompare(b.mediaType))
      this.scanned = items
      return items
    },

    /** 恢复默认 */
    async clear() {
      if (this.current?.url.startsWith('blob:')) URL.revokeObjectURL(this.current.url)
      this.scanned.forEach(i => { if (i.url.startsWith('blob:')) URL.revokeObjectURL(i.url) })
      await idbDel(MEDIA_KEY)
      this.current = null
      this.scanned = []
      Object.assign(this, DEFAULTS)
      localStorage.removeItem(SETTINGS_KEY)
    },

    /** 调节显示效果 */
    setEffects(effects: Partial<WallpaperSettings>) {
      Object.assign(this, effects)
      this.persist()
    }
  }
})

/** 递归收集文件夹中的文件（带深度限制） */
async function collectFiles(
  handle: FileSystemDirectoryHandle,
  maxDepth: number,
  depth = 0
): Promise<FileSystemFileHandle[]> {
  if (depth > maxDepth) return []
  const files: FileSystemFileHandle[] = []
  for await (const entry of handle.values()) {
    if (entry.kind === 'file') {
      files.push(entry as FileSystemFileHandle)
    } else if (entry.kind === 'directory') {
      files.push(...await collectFiles(entry as FileSystemDirectoryHandle, maxDepth, depth + 1))
    }
  }
  return files
}
