<template>
  <div class="settings fade-in">
    <h1 class="page-title">设置</h1>
    <p class="page-desc">个性化你的学习体验</p>

    <div class="settings-list">
      <div class="setting-section">
        <h3>壁纸</h3>
        <WallpaperSettings />
      </div>

      <div class="setting-section">
        <h3>复习</h3>
        <div class="setting-item">
          <div>
            <span class="setting-name">每日复习上限</span>
            <span class="setting-desc">每天最多复习的卡片数量，立即生效</span>
          </div>
          <el-input-number v-model="settings.dailyLimit" :min="5" :max="100" :step="5" @change="settings.save()" />
        </div>
        <div class="setting-item">
          <div>
            <span class="setting-name">新卡片每日上限</span>
            <span class="setting-desc">每天学习的新知识点数量</span>
          </div>
          <el-input-number v-model="settings.newLimit" :min="1" :max="50" @change="settings.save()" />
        </div>
      </div>

      <div class="setting-section">
        <h3>数据</h3>
        <div class="setting-item">
          <div>
            <span class="setting-name">导出数据</span>
            <span class="setting-desc">知识点 + 复习进度 + 复习日志打包为 JSON 下载</span>
          </div>
          <el-button type="primary" plain :loading="exporting" @click="handleExport">导出</el-button>
        </div>
        <div class="setting-item">
          <div>
            <span class="setting-name">导入数据</span>
            <span class="setting-desc">从备份 JSON 导入，同标题卡片自动跳过</span>
          </div>
          <el-button :loading="importing" @click="fileInput?.click()">导入</el-button>
        </div>
        <div class="setting-item">
          <div>
            <span class="setting-name danger">清空全部数据</span>
            <span class="setting-desc">删除所有知识点和复习记录，不可恢复</span>
          </div>
          <el-button type="danger" plain @click="handleClear">清空</el-button>
        </div>
        <input
          ref="fileInput"
          type="file"
          accept="application/json,.json"
          style="display: none"
          @change="handleFile"
        />
      </div>

      <div class="setting-section">
        <h3>AI 助手</h3>
        <div class="setting-item">
          <div>
            <span class="setting-name">API Key</span>
            <span class="setting-desc">仅保存在你的浏览器本地，不会上传</span>
          </div>
          <el-input v-model="settings.apiKey" type="password" placeholder="sk-..." style="width: 320px" show-password @change="settings.save()" />
        </div>
        <div class="setting-item">
          <div>
            <span class="setting-name">模型选择</span>
            <span class="setting-desc">OpenAI 兼容接口均可使用（支持自定义模型）</span>
          </div>
          <el-select v-model="settings.modelId" style="width: 260px" @change="settings.save()">
            <el-option-group label="🚀 常用">
              <el-option
                v-for="m in settings.allModels.filter(x => x.builtin && ['deepseek','deepseek-r1','qwen-plus'].includes(x.id))"
                :key="m.id"
                :label="`${m.label}  · ${m.desc || ''}`"
                :value="m.id"
              />
            </el-option-group>
            <el-option-group label="🏢 其他内置">
              <el-option
                v-for="m in settings.allModels.filter(x => x.builtin && !['deepseek','deepseek-r1','qwen-plus'].includes(x.id))"
                :key="m.id"
                :label="`${m.label}  · ${m.desc || ''}`"
                :value="m.id"
              />
            </el-option-group>
            <el-option-group v-if="settings.customModels.length" label="⭐ 我的自定义">
              <el-option
                v-for="m in settings.customModels"
                :key="m.id"
                :label="`${m.label}  · ${m.model}`"
                :value="m.id"
              />
            </el-option-group>
          </el-select>
          <button class="btn-add-model" @click="addModelDialog = true">+ 自定义模型</button>
        </div>
        <!-- 自定义模型列表 -->
        <div v-if="settings.customModels.length" class="custom-model-list">
          <div v-for="m in settings.customModels" :key="m.id" class="cm-item">
            <div class="cm-info">
              <strong>{{ m.label }}</strong>
              <span class="cm-sub">{{ m.model }}</span>
              <span class="cm-sub cm-url">{{ m.baseUrl }}</span>
            </div>
            <button class="cm-del" @click="removeModel(m.id)">删除</button>
          </div>
        </div>
      </div>

      <!-- 新增自定义模型弹窗 -->
      <el-dialog v-model="addModelDialog" title="添加自定义模型" width="480px">
        <div class="model-form">
          <div class="mf-field">
            <label>显示名称</label>
            <el-input v-model="newModel.label" placeholder="例如：Ollama 本地" />
          </div>
          <div class="mf-field">
            <label>Model 名</label>
            <el-input v-model="newModel.model" placeholder="例如：llama3" />
          </div>
          <div class="mf-field">
            <label>Base URL</label>
            <el-input v-model="newModel.baseUrl" placeholder="例如：http://localhost:11434/v1" />
          </div>
          <p class="mf-tip">
            只需支持 OpenAI 兼容接口（/chat/completions）即可。
            Ollama、LM Studio、One API 等都可以。
          </p>
        </div>
        <template #footer>
          <el-button @click="addModelDialog = false">取消</el-button>
          <el-button type="primary" @click="confirmAddModel">添加并选中</el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import WallpaperSettings from '../components/WallpaperSettings.vue'
import { useSettingsStore } from '../stores/settings'
import { exportAll, importAll, clearAllData } from '../utils/backup'
import { seedDb } from '../utils/db'

const settings = useSettingsStore()
const exporting = ref(false)
const importing = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

// 自定义模型
const addModelDialog = ref(false)
const newModel = ref({ label: '', model: '', baseUrl: '' })

function confirmAddModel() {
  const { label, model, baseUrl } = newModel.value
  if (!label.trim() || !model.trim() || !baseUrl.trim()) {
    ElMessage.warning('请填写完整信息')
    return
  }
  settings.addCustomModel({
    label: label.trim(),
    model: model.trim(),
    baseUrl: baseUrl.trim()
  })
  newModel.value = { label: '', model: '', baseUrl: '' }
  addModelDialog.value = false
  ElMessage.success('已添加并选中新模型')
}

function removeModel(id: string) {
  ElMessageBox.confirm('删除此自定义模型？', '提示', { type: 'warning' })
    .then(() => { settings.removeCustomModel(id); ElMessage.success('已删除') })
    .catch(() => {})
}

// ===== 导出 =====
async function handleExport() {
  exporting.value = true
  try {
    await exportAll()
    ElMessage.success('已导出备份文件到下载目录')
  } catch (e: any) {
    ElMessage.error(e.message || '导出失败')
  } finally {
    exporting.value = false
  }
}

// ===== 导入 =====
async function handleFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  ;(e.target as HTMLInputElement).value = '' // 允许重复选同一文件
  if (!file) return
  importing.value = true
  try {
    const text = await file.text()
    const { added, skipped } = await importAll(text)
    ElMessage.success(`导入完成：新增 ${added} 个，跳过重复 ${skipped} 个`)
  } catch (err: any) {
    ElMessage.error(err.message || '导入失败')
  } finally {
    importing.value = false
  }
}

// ===== 清空 =====
async function handleClear() {
  try {
    await ElMessageBox.confirm(
      '将删除所有知识点、复习进度和日志，且无法恢复。确定继续？',
      '危险操作',
      { type: 'error', confirmButtonText: '全部删除', cancelButtonText: '取消' }
    )
  } catch { return }
  await clearAllData()
  await seedDb() // 重新注入种子数据，避免页面全空
  ElMessage.success('已清空并重置为示例数据')
}
</script>

<style scoped>
.settings { display: flex; flex-direction: column; gap: 20px; max-width: 800px; }
.page-title { font-size: 24px; font-weight: 700; }
.page-desc { color: var(--text-muted); font-size: 13px; margin-bottom: 4px; }

.settings-list { display: flex; flex-direction: column; gap: 16px; }
.setting-section {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 20px 24px;
}
.setting-section h3 {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}
.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
}
.setting-item + .setting-item { border-top: 1px solid var(--border); }
.setting-name { display: block; font-size: 14px; font-weight: 500; margin-bottom: 3px; }
.setting-name.danger { color: var(--danger, #ef4444); }
.setting-desc { display: block; font-size: 12px; color: var(--text-muted); }

/* 自定义模型按钮 + 列表 */
.btn-add-model {
  margin-left: 10px; padding: 8px 14px; border-radius: 8px;
  border: 1px dashed var(--accent); color: var(--accent);
  background: transparent; font-size: 13px; cursor: pointer;
  transition: all 0.2s; font-family: var(--font-sans);
}
.btn-add-model:hover { background: rgba(245, 158, 11, 0.1); }
.custom-model-list {
  margin-top: 12px; display: flex; flex-direction: column; gap: 8px;
}
.cm-item {
  display: flex; align-items: center; justify-content: space-between;
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: 10px; padding: 12px 16px;
}
.cm-info { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.cm-info strong { font-size: 14px; color: var(--text-primary); }
.cm-sub { font-size: 12px; color: var(--text-muted); background: var(--bg-surface); padding: 2px 8px; border-radius: 6px; }
.cm-url { font-family: var(--font-mono); }
.cm-del {
  padding: 5px 12px; border-radius: 6px; border: 1px solid var(--danger, #ef4444);
  background: transparent; color: var(--danger, #ef4444); font-size: 12px;
  cursor: pointer; transition: all 0.2s;
}
.cm-del:hover { background: var(--danger, #ef4444); color: #fff; }

/* 自定义模型弹窗表单 */
.model-form { display: flex; flex-direction: column; gap: 14px; }
.mf-field label { display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 6px; }
.mf-tip { font-size: 12px; color: var(--text-muted); margin: 0; padding: 10px; background: var(--bg-card); border-radius: 8px; }
</style>
