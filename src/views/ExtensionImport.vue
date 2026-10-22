<template>
  <div class="ext-import fade-in">
    <div class="import-card" v-if="payload">
      <div class="import-head">
        <el-icon :size="24" color="#f59e0b"><Link /></el-icon>
        <h2>来自浏览器插件的内容</h2>
      </div>

      <div class="source-info">
        <span class="source-label">来源：</span>
        <a :href="payload.url" target="_blank" class="source-link">{{ payload.title || payload.url }}</a>
      </div>

      <div class="content-box">
        <pre>{{ payload.text }}</pre>
      </div>

      <div class="form-group">
        <label>标题</label>
        <el-input v-model="title" placeholder="请输入知识点标题" size="large" />
      </div>

      <div class="form-group">
        <label>分类</label>
        <el-select v-model="category" size="large" style="width: 100%">
          <el-option label="前端" value="前端" />
          <el-option label="Java" value="Java" />
          <el-option label="算法" value="算法" />
          <el-option label="网络" value="网络" />
          <el-option label="数据库" value="数据库" />
          <el-option label="其他" value="其他" />
        </el-select>
      </div>

      <div class="actions">
        <el-button @click="$router.push('/library')">取消</el-button>
        <el-button type="primary" @click="handleImport">
          <el-icon><Plus /></el-icon>
          导入到知识库
        </el-button>
      </div>
    </div>

    <div class="empty-state" v-else>
      <el-icon :size="48" color="#6b7280"><Document /></el-icon>
      <p>没有待导入的内容</p>
      <p class="hint">使用浏览器插件选中网页内容后，会自动跳转到这里</p>
      <el-button @click="$router.push('/library')">返回知识库</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Link, Plus, Document } from '@element-plus/icons-vue'
import { db, seedDb, type Card } from '../utils/db'
import { createInitialFsrs } from '../utils/fsrs'

const router = useRouter()
const payload = ref<{ text: string; url: string; title: string } | null>(null)
const title = ref('')
const category = ref('其他')

onMounted(() => {
  // 从 URL hash 解析扩展传来的数据
  const hash = window.location.hash.slice(1)
  if (hash) {
    try {
      const json = decodeURIComponent(escape(atob(hash)))
      payload.value = JSON.parse(json)
      // 自动取文本前 30 字作为标题
      title.value = payload.value!.text.slice(0, 30).trim() + (payload.value!.text.length > 30 ? '...' : '')
    } catch (e) {
      console.error('解析扩展数据失败:', e)
    }
  }
})

async function handleImport() {
  if (!payload.value || !title.value.trim()) {
    ElMessage.warning('请填写标题')
    return
  }
  await seedDb()
  // 构建卡片并写入 Dexie + 初始化 FSRS 记录
  const now = Date.now()
  const card: Card = {
    title: title.value.trim(),
    category: category.value,
    content: `> 来源：${payload.value.url}\n> 标题：${payload.value.title || ''}\n\n${payload.value.text}`,
    tags: ['插件导入'],
    status: 'new',
    createdAt: now,
    updatedAt: now
  }
  const id = await db.cards.add(card)
  await createInitialFsrs(id)
  ElMessage.success('导入成功！已加入知识库')
  router.push('/library')
}
</script>

<style scoped>
.ext-import {
  max-width: 720px;
  margin: 0 auto;
  padding-top: 20px;
}
.import-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.import-head {
  display: flex;
  align-items: center;
  gap: 12px;
}
.import-head h2 {
  font-size: 20px;
  font-weight: 600;
}
.source-info {
  display: flex;
  gap: 8px;
  font-size: 13px;
}
.source-label { color: var(--text-muted); }
.source-link {
  color: var(--accent);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 500px;
}
.source-link:hover { text-decoration: underline; }
.content-box {
  background: var(--bg-base);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px;
  max-height: 240px;
  overflow-y: auto;
}
.content-box pre {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-word;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.form-group label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.empty-state p { color: var(--text-secondary); font-size: 15px; }
.empty-state .hint { color: var(--text-muted); font-size: 13px; }
</style>
