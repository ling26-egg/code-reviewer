/**
 * 大模型 API 封装（OpenAI 兼容接口）
 * 支持流式输出，调用用户在设置里填的 API Key
 * 模型配置从 settings store 动态读取（内置 + 自定义）
 */
import { useSettingsStore } from '../stores/settings'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface StreamOptions {
  messages: ChatMessage[]
  onChunk: (delta: string) => void
  signal?: AbortSignal
}

/** 流式调用：onChunk 接收每次增量的文本 */
export async function streamChat({ messages, onChunk, signal }: StreamOptions): Promise<string> {
  const settings = useSettingsStore()
  const model = settings.currentModel

  if (!settings.apiKey) {
    throw new Error('请先在「设置」里填写 API Key')
  }

  const resp = await fetch(`${model.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: model.model,
      messages,
      stream: true,
      temperature: 0.7
    }),
    signal
  })

  if (!resp.ok) {
    const txt = await resp.text()
    let msg = `API 错误 ${resp.status}`
    if (resp.status === 401) msg = 'API Key 无效或已过期，请检查设置'
    else if (resp.status === 404) msg = '模型不存在或 base URL 错误'
    else if (resp.status === 429) msg = 'API 调用次数超限，请稍后再试'
    else if (resp.status === 0) msg = '网络请求被拦截（可能是 CORS 跨域限制）'
    throw new Error(`${msg}：${txt.slice(0, 80)}`)
  }

  const reader = resp.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    // SSE 按双换行分割
    const lines = buffer.split('\n\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') continue
      try {
        const json = JSON.parse(data)
        const delta = json.choices?.[0]?.delta?.content
        if (delta) {
          full += delta
          onChunk(delta)
        }
      } catch { /* 忽略解析失败的片段 */ }
    }
  }
  return full
}

/** 非流式调用：返回完整文本（用于需要结构化解析的场景） */
export async function chat(messages: ChatMessage[], signal?: AbortSignal): Promise<string> {
  // 复用流式，只是不处理增量
  let full = ''
  await streamChat({ messages, onChunk: d => { full += d }, signal })
  return full
}

// ===== 三种模式的 system prompt =====

/** 自由问答：助手设定 */
export const QA_SYSTEM: ChatMessage = {
  role: 'system',
  content: '你是「代码复习助手」，专门帮助程序员学习和复习编程知识。回答要简洁、结构清晰，多用代码示例和关键点列表。对不确定的内容坦诚说明。'
}

/** 模拟面试：根据方向扮演面试官 */
export function interviewSystem(direction: string): ChatMessage {
  return {
    role: 'system',
    content: `你是一位资深 ${direction} 面试官，正在进行技术面试。
规则：
1. 每次只问一道题，等用户回答后再问下一道
2. 用户回答后，先简短点评（指出亮点/不足），然后给出参考答案要点，最后提出下一道相关题目
3. 难度循序渐进，由浅入深
4. 用中文交流，代码用对应语言
开始时先用一句话问候并出第一道题。`
  }
}

/** 生成面试题：返回结构化题目 */
export function generatePrompt(direction: string, count: number): ChatMessage[] {
  return [
    {
      role: 'system',
      content: `你是 ${direction} 面试题库出题专家。请严格输出 JSON 数组，不要任何额外文字。
格式：[{"question":"题目","answer":"参考答案（含关键点）","difficulty":"简单/中等/困难","tags":["标签1"]}]
共生成 ${count} 道题。`
    }
  ]
}
