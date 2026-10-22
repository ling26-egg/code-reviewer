import { defineStore } from 'pinia'

/**
 * 纯前端登录系统
 * 账号密码存 localStorage（加密不现实，纯装饰——真安全需要后端）
 * 登录状态存 sessionStorage，刷新不掉但关标签页丢
 */

interface Account {
  username: string
  // 密码用简单哈希（非加密，仅避免明文显示）
  hash: string
  createdAt: number
}

const ACC_KEY = 'code-reviewer-accounts'
const SESSION_KEY = 'code-reviewer-session'

function simpleHash(s: string): string {
  // 不是真加密，只是不存明文
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return 'h_' + Math.abs(h).toString(36) + '_' + s.length.toString(36)
}

function loadAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(ACC_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveAccounts(list: Account[]) {
  localStorage.setItem(ACC_KEY, JSON.stringify(list))
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    username: '' as string,
    loggedIn: false as boolean
  }),
  actions: {
    init() {
      try {
        const raw = sessionStorage.getItem(SESSION_KEY)
        if (raw) {
          const { username } = JSON.parse(raw)
          const accounts = loadAccounts()
          if (accounts.some(a => a.username === username)) {
            this.username = username
            this.loggedIn = true
          }
        }
      } catch { /* ignore */ }
    },

    register(username: string, password: string): { ok: boolean; msg: string } {
      username = username.trim()
      if (!username || !password) return { ok: false, msg: '用户名和密码不能为空' }
      if (username.length < 2) return { ok: false, msg: '用户名至少 2 个字符' }
      if (password.length < 4) return { ok: false, msg: '密码至少 4 个字符' }

      const accounts = loadAccounts()
      if (accounts.some(a => a.username === username)) {
        return { ok: false, msg: '该用户名已被占用' }
      }
      accounts.push({ username, hash: simpleHash(password), createdAt: Date.now() })
      saveAccounts(accounts)
      return { ok: true, msg: '注册成功' }
    },

    login(username: string, password: string): { ok: boolean; msg: string } {
      username = username.trim()
      const accounts = loadAccounts()
      const found = accounts.find(a => a.username === username)
      if (!found) return { ok: false, msg: '用户名不存在，请先注册' }
      if (found.hash !== simpleHash(password)) return { ok: false, msg: '密码错误' }

      this.username = username
      this.loggedIn = true
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ username }))
      return { ok: true, msg: '登录成功' }
    },

    logout() {
      this.username = ''
      this.loggedIn = false
      sessionStorage.removeItem(SESSION_KEY)
    },

    changePassword(oldPwd: string, newPwd: string): { ok: boolean; msg: string } {
      const accounts = loadAccounts()
      const idx = accounts.findIndex(a => a.username === this.username)
      if (idx === -1) return { ok: false, msg: '账号不存在' }
      if (accounts[idx].hash !== simpleHash(oldPwd)) return { ok: false, msg: '原密码错误' }
      if (newPwd.length < 4) return { ok: false, msg: '新密码至少 4 个字符' }
      accounts[idx].hash = simpleHash(newPwd)
      saveAccounts(accounts)
      return { ok: true, msg: '密码已更新' }
    },

    deleteAccount(password: string): { ok: boolean; msg: string } {
      const accounts = loadAccounts()
      const idx = accounts.findIndex(a => a.username === this.username)
      if (idx === -1) return { ok: false, msg: '账号不存在' }
      if (accounts[idx].hash !== simpleHash(password)) return { ok: false, msg: '密码错误' }
      accounts.splice(idx, 1)
      saveAccounts(accounts)
      this.logout()
      return { ok: true, msg: '账号已删除' }
    }
  }
})
