import { defineStore } from 'pinia'

/**
 * 应用设置 —— localStorage 持久化
 * AI Key 只存本地浏览器，不上传任何服务器
 */
const KEY = 'code-reviewer-settings'

/** 模型来源 */
export interface AiModel {
  id: string           // 唯一标识（内置的是 deepseek/kimi 等，自定义的是 custom-xxx）
  label: string        // 显示名（"DeepSeek V3"）
  model: string        // API 里的 model 字段值
  baseUrl: string      // API 地址
  builtin?: boolean    // 是否内置（内置不可删）
  desc?: string        // 简短说明
}

/** 内置模型（OpenAI 兼容接口，浏览器直调） */
export const BUILTIN_MODELS: AiModel[] = [
  {
    id: 'deepseek', label: 'DeepSeek V3',
    model: 'deepseek-chat', baseUrl: 'https://api.deepseek.com/v1',
    builtin: true, desc: '便宜、稳定、中文强'
  },
  {
    id: 'deepseek-r1', label: 'DeepSeek R1（推理）',
    model: 'deepseek-reasoner', baseUrl: 'https://api.deepseek.com/v1',
    builtin: true, desc: '深度思考、推理能力强，贵一点'
  },
  {
    id: 'kimi', label: 'Kimi Moonshot',
    model: 'moonshot-v1-8k', baseUrl: 'https://api.moonshot.cn/v1',
    builtin: true, desc: '长上下文、浏览器直调可用'
  },
  {
    id: 'qwen-plus', label: '通义千问 Plus',
    model: 'qwen-plus', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    builtin: true, desc: '阿里 DashScope 兼容模式'
  },
  {
    id: 'qwen-turbo', label: '通义千问 Turbo',
    model: 'qwen-turbo', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    builtin: true, desc: '快、便宜'
  },
  {
    id: 'doubao-4', label: '豆包 4 Pro',
    model: 'doubao-pro-4k', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    builtin: true, desc: '火山引擎方舟'
  },
  {
    id: 'glm-4', label: '智谱 GLM-4',
    model: 'glm-4-flash', baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    builtin: true, desc: '智谱清言'
  },
  {
    id: 'gpt-4o', label: 'GPT-4o',
    model: 'gpt-4o', baseUrl: 'https://api.openai.com/v1',
    builtin: true, desc: '最强（国内浏览器直调可能被 CORS 拦）'
  }
]

interface SettingsState {
  dailyLimit: number
  newLimit: number
  apiKey: string
  modelId: string          // 当前选中的模型 id
  customModels: AiModel[]  // 用户自定义模型
}

function load(): SettingsState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        dailyLimit: 30, newLimit: 10, apiKey: '',
        modelId: 'deepseek', customModels: [],
        ...parsed
      }
    }
  } catch { /* ignore */ }
  return { dailyLimit: 30, newLimit: 10, apiKey: '', modelId: 'deepseek', customModels: [] }
}

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => load(),
  getters: {
    /** 当前选中的完整模型配置 */
    currentModel: (s): AiModel => {
      const all = [...BUILTIN_MODELS, ...s.customModels]
      return all.find(m => m.id === s.modelId) || BUILTIN_MODELS[0]
    },
    /** 所有可用模型（内置 + 自定义） */
    allModels: (s): AiModel[] => [...BUILTIN_MODELS, ...s.customModels]
  },
  actions: {
    save() {
      const { dailyLimit, newLimit, apiKey, modelId, customModels } = this
      localStorage.setItem(KEY, JSON.stringify({ dailyLimit, newLimit, apiKey, modelId, customModels }))
    },
    /** 新增自定义模型 */
    addCustomModel(model: Omit<AiModel, 'id' | 'builtin'>) {
      const id = 'custom-' + Date.now()
      this.customModels.push({ ...model, id, builtin: false })
      this.modelId = id
      this.save()
    },
    /** 删除自定义模型 */
    removeCustomModel(id: string) {
      this.customModels = this.customModels.filter(m => m.id !== id)
      if (this.modelId === id) {
        this.modelId = 'deepseek'
      }
      this.save()
    }
  }
})
