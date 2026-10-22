import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { setCurrentUser, seedDb } from '../utils/db'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/Login.vue'),
      meta: { public: true }
    },
    {
      path: '/extension-import',
      name: 'ExtensionImport',
      component: () => import('../views/ExtensionImport.vue')
    },
    {
      path: '/',
      component: () => import('../layouts/DefaultLayout.vue'),
      redirect: '/dashboard',
      children: [
        { path: 'dashboard', name: 'Dashboard', component: () => import('../views/Dashboard.vue'), meta: { title: '工作台' } },
        { path: 'library', name: 'Library', component: () => import('../views/Library.vue'), meta: { title: '知识库' } },
        { path: 'review', name: 'Review', component: () => import('../views/Review.vue'), meta: { title: '复习' } },
        { path: 'stats', name: 'Stats', component: () => import('../views/Stats.vue'), meta: { title: '统计' } },
        { path: 'achievements', name: 'Achievements', component: () => import('../views/Achievements.vue'), meta: { title: '成就' } },
        { path: 'settings', name: 'Settings', component: () => import('../views/Settings.vue'), meta: { title: '设置' } }
      ]
    }
  ]
})

// ===== 路由守卫 =====
router.beforeEach(async (to, _from, next) => {
  const auth = useAuthStore()

  // 恢复登录状态（sessionStorage 持久，刷新不掉）
  if (!auth.loggedIn) auth.init()

  // 未登录且访问受保护页面 → 跳登录
  const isPublic = to.meta.public || to.path === '/login' || to.path === '/extension-import'
  if (!auth.loggedIn && !isPublic) {
    return next({ path: '/login', query: { redirect: to.fullPath } })
  }

  // 已登录 → 激活该用户的数据库 + 首次种子注入
  if (auth.loggedIn) {
    setCurrentUser(auth.username)
    await seedDb()
  }

  // 已登录访问 /login → 跳首页
  if (auth.loggedIn && to.path === '/login') {
    return next('/dashboard')
  }

  next()
})

export default router
