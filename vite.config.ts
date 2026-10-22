import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// base 用相对路径：本地调试 / GitHub Pages / Vercel 都能跑，不依赖具体仓库名
export default defineConfig({
  base: './',
  plugins: [vue()],
  server: {
    proxy: {
      // 开发环境代理 LeetCode GraphQL，避免 CORS
      '/leetcode-api': {
        target: 'https://leetcode.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/leetcode-api/, '')
      }
    }
  }
})
