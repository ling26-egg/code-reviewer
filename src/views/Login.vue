<template>
  <div class="login-page">
    <!-- 背景装饰 -->
    <div class="bg-grid"></div>
    <div class="bg-glow bg-glow-1"></div>
    <div class="bg-glow bg-glow-2"></div>

    <!-- 左侧品牌区（大屏显示，窄屏隐藏） -->
    <aside class="brand-panel">
      <div class="brand-top">
        <div class="brand-logo">
          <svg width="40" height="40" viewBox="0 0 36 36" fill="none">
            <rect x="2" y="2" width="32" height="32" rx="8" fill="url(#g)"/>
            <path d="M10 20l4-4 3 3 5-6" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="36" y2="36">
                <stop stop-color="#4f46e5"/>
                <stop offset="1" stop-color="#7c3aed"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <span class="brand-name">代码复习助手</span>
      </div>

      <div class="brand-main">
        <h1 class="slogan">
          用<span class="hl">间隔复习</span><br />
          把代码知识<br />
          真正记进脑子里
        </h1>
        <p class="slogan-sub">
          基于 FSRS 记忆算法的编程知识管理工具<br />
          AI 模拟面试 · 智能出题 · 数据本地隔离
        </p>

        <!-- 特性卡片 -->
        <div class="feature-grid">
          <div class="feature">
            <div class="f-icon">🧠</div>
            <div class="f-title">FSRS 算法</div>
            <div class="f-desc">按遗忘曲线安排复习</div>
          </div>
          <div class="feature">
            <div class="f-icon">🤖</div>
            <div class="f-title">AI 面试官</div>
            <div class="f-desc">模拟真实技术面试</div>
          </div>
          <div class="feature">
            <div class="f-icon">📚</div>
            <div class="f-title">知识沉淀</div>
            <div class="f-desc">Markdown + 代码块</div>
          </div>
          <div class="feature">
            <div class="f-icon">🔒</div>
            <div class="f-title">数据隔离</div>
            <div class="f-desc">每人独立本地数据库</div>
          </div>
        </div>
      </div>

      <div class="brand-foot">
        <span class="dot-live"></span>
        数据全部保存在你的浏览器本地，不上传任何服务器
      </div>
    </aside>

    <!-- 右侧表单区 -->
    <section class="form-panel">
      <div class="login-card">
        <!-- 窄屏时才显示的 logo -->
        <div class="mobile-brand">
          <div class="brand-logo">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect x="2" y="2" width="32" height="32" rx="8" fill="url(#g2)"/>
              <path d="M10 20l4-4 3 3 5-6" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              <defs>
                <linearGradient id="g2" x1="0" y1="0" x2="36" y2="36">
                  <stop stop-color="#4f46e5"/>
                  <stop offset="1" stop-color="#7c3aed"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h2 class="mobile-title">代码复习助手</h2>
        </div>

        <div class="card-head">
          <h2>{{ mode === 'login' ? '欢迎回来' : '创建账号' }}</h2>
          <p>{{ mode === 'login' ? '登录后继续你的复习计划' : '30 秒开始你的知识管理' }}</p>
        </div>

        <!-- 切换 tab -->
        <div class="tab-bar">
          <button class="tab" :class="{ active: mode === 'login' }" @click="mode = 'login'">登录</button>
          <button class="tab" :class="{ active: mode === 'register' }" @click="mode = 'register'">注册</button>
        </div>

        <!-- 表单 -->
        <form class="login-form" @submit.prevent="handleSubmit">
          <div class="field">
            <label>用户名</label>
            <input
              v-model="form.username" type="text"
              placeholder="你的用户名"
              autocomplete="username"
              required minlength="2"
            />
          </div>
          <div class="field">
            <label>密码</label>
            <input
              v-model="form.password" type="password"
              placeholder="至少 4 位"
              autocomplete="current-password"
              required minlength="4"
            />
          </div>

          <div v-if="errMsg" class="err-tip">⚠️ {{ errMsg }}</div>

          <button type="submit" class="btn-submit" :disabled="loading">
            <span v-if="!loading">{{ mode === 'login' ? '登录' : '注册并登录' }}</span>
            <span v-else>处理中...</span>
          </button>
        </form>

        <p class="foot-tip">
          💡 换设备？登录后在「设置 → 导出账号包」迁移数据
        </p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { setCurrentUser } from '../utils/db'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const mode = ref<'login' | 'register'>('login')
const form = ref({ username: '', password: '' })
const errMsg = ref('')
const loading = ref(false)

async function handleSubmit() {
  errMsg.value = ''
  loading.value = true

  if (mode.value === 'register') {
    const r = auth.register(form.value.username, form.value.password)
    if (!r.ok) { errMsg.value = r.msg; loading.value = false; return }
  }

  const r = auth.login(form.value.username, form.value.password)
  loading.value = false
  if (!r.ok) { errMsg.value = r.msg; return }

  // 激活该用户的数据库
  setCurrentUser(auth.username)

  // 登录前想访问什么页面，现在跳过去
  const redirect = (route.query.redirect as string) || '/dashboard'
  router.replace(redirect)
}
</script>

<style scoped>
/* ===== 整体：左右分栏 ===== */
.login-page {
  min-height: 100vh;
  width: 100%;
  display: flex;
  background: #0a0e1a;
  position: relative;
  overflow: hidden;
  font-family: 'Sora', -apple-system, sans-serif;
}

/* 背景网格 */
.bg-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(79,70,229,0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(79,70,229,0.06) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse at center, black 30%, transparent 85%);
  pointer-events: none;
}
.bg-glow {
  position: absolute; border-radius: 50%;
  filter: blur(100px); pointer-events: none;
}
.bg-glow-1 {
  width: 700px; height: 700px; top: -25%; left: -10%;
  background: radial-gradient(circle, rgba(124,58,237,0.22) 0%, transparent 70%);
}
.bg-glow-2 {
  width: 600px; height: 600px; bottom: -25%; right: -5%;
  background: radial-gradient(circle, rgba(79,70,229,0.18) 0%, transparent 70%);
}

/* ===== 左侧品牌区 ===== */
.brand-panel {
  position: relative; z-index: 1;
  flex: 1 1 58%;
  max-width: 58%;
  display: flex; flex-direction: column;
  justify-content: space-between;
  padding: 56px 72px;
}
.brand-top { display: flex; align-items: center; gap: 14px; }
.brand-logo {
  width: 44px; height: 44px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.brand-name { font-size: 18px; font-weight: 700; color: #fff; letter-spacing: 0.2px; }

.brand-main { max-width: 640px; }
.slogan {
  font-size: clamp(32px, 3.4vw, 54px);
  line-height: 1.25; font-weight: 800;
  color: #fff; margin: 0 0 20px 0;
  letter-spacing: -0.5px;
}
.slogan .hl {
  background: linear-gradient(120deg, #a78bfa, #7c3aed);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.slogan-sub {
  font-size: 15px; line-height: 1.9; color: #9ca3af; margin: 0 0 40px 0;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px; max-width: 560px;
}
.feature {
  padding: 18px 20px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(124,58,237,0.18);
  border-radius: 14px;
  transition: all 0.25s;
}
.feature:hover {
  background: rgba(124,58,237,0.1);
  border-color: rgba(124,58,237,0.4);
  transform: translateY(-2px);
}
.f-icon { font-size: 20px; margin-bottom: 8px; }
.f-title { font-size: 14px; font-weight: 600; color: #e5e7eb; margin-bottom: 4px; }
.f-desc { font-size: 12px; color: #6b7280; line-height: 1.5; }

.brand-foot {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; color: #4b5563;
}
.dot-live {
  width: 6px; height: 6px; border-radius: 50%;
  background: #10b981; box-shadow: 0 0 8px #10b981;
}

/* ===== 右侧表单区 ===== */
.form-panel {
  position: relative; z-index: 1;
  flex: 1 1 42%;
  min-width: 420px;
  display: flex; align-items: center; justify-content: center;
  padding: 40px 56px;
  border-left: 1px solid rgba(124,58,237,0.12);
  background: rgba(15,18,30,0.55);
  backdrop-filter: blur(12px);
}

.login-card {
  width: 100%;
  max-width: 400px;
}
.mobile-brand { display: none; }

.card-head { margin-bottom: 26px; }
.card-head h2 { font-size: 26px; font-weight: 700; color: #fff; margin: 0 0 6px 0; }
.card-head p { font-size: 13px; color: #6b7280; margin: 0; }

.tab-bar {
  display: flex; background: rgba(255,255,255,0.05);
  border-radius: 10px; padding: 4px; margin-bottom: 24px;
}
.tab {
  flex: 1; padding: 10px; border: none; background: transparent;
  color: #9ca3af; font-size: 14px; font-weight: 500;
  cursor: pointer; border-radius: 7px; transition: all 0.2s;
  font-family: inherit;
}
.tab.active {
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #fff; box-shadow: 0 4px 12px rgba(124,58,237,0.4);
}

.login-form { display: flex; flex-direction: column; gap: 16px; }
.field label { display: block; font-size: 12px; color: #9ca3af; margin-bottom: 6px; }
.field input {
  width: 100%; padding: 13px 15px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px; color: #fff; font-size: 14px;
  outline: none; transition: border-color 0.2s;
  font-family: inherit; box-sizing: border-box;
}
.field input:focus { border-color: #7c3aed; background: rgba(124,58,237,0.06); }
.field input::placeholder { color: #4b5563; }

.err-tip {
  padding: 8px 12px; background: rgba(239,68,68,0.1);
  border: 1px solid rgba(239,68,68,0.3); border-radius: 8px;
  color: #fca5a5; font-size: 13px;
}

.btn-submit {
  padding: 14px; border: none; border-radius: 10px;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #fff; font-size: 15px; font-weight: 600;
  cursor: pointer; transition: transform 0.15s, box-shadow 0.15s;
  font-family: inherit;
  box-shadow: 0 8px 24px rgba(124,58,237,0.35);
}
.btn-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 12px 28px rgba(124,58,237,0.5); }
.btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

.foot-tip {
  margin-top: 22px; font-size: 12px; color: #4b5563;
  text-align: center; line-height: 1.6;
}

/* ===== 响应式：窄屏收起左侧品牌区 ===== */
@media (max-width: 1024px) {
  .brand-panel { padding: 40px; }
  .slogan { font-size: 32px; }
  .feature-grid { gap: 10px; }
  .form-panel { min-width: 360px; padding: 32px; }
}

@media (max-width: 820px) {
  .login-page { display: block; }
  .brand-panel { display: none; }
  .form-panel {
    min-height: 100vh; min-width: 0;
    border-left: none; padding: 32px 24px;
    background: transparent; backdrop-filter: none;
  }
  .mobile-brand {
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 32px;
  }
  .mobile-title { font-size: 17px; font-weight: 700; color: #fff; margin: 0; }
}
</style>
