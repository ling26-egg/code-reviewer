import { defineStore } from 'pinia'

/** AI 会话类型：自由问答 / 模拟面试 / 生成面试题 */
export type SessionType = 'qa' | 'interview' | 'generate'

export interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  loading?: boolean // 是否正在流式输出
}

export const useAiStore = defineStore('ai', {
  state: () => ({
    /** 悬浮面板是否打开 */
    open: false,
    /** 当前激活的会话 tab */
    session: 'qa' as SessionType,
    /** 三种会话各自的消息历史 */
    messages: {
      qa: [] as AIMessage[],
      interview: [] as AIMessage[],
      generate: [] as AIMessage[]
    },
    /** 模拟面试方向 */
    direction: '前端'
  }),

  actions: {
    toggle() { this.open = !this.open },
    setOpen(v: boolean) { this.open = v },
    setSession(s: SessionType) { this.session = s },
    setDirection(d: string) { this.direction = d },

    /** 往指定会话追加一条消息 */
    push(session: SessionType, msg: AIMessage) {
      this.messages[session].push(msg)
    },
    /** 更新最后一条助手消息的内容（流式拼接） */
    appendLast(session: SessionType, delta: string) {
      const list = this.messages[session]
      if (list.length && list[list.length - 1].role === 'assistant') {
        list[list.length - 1].content += delta
      }
    },
    /** 流式结束，标记不再 loading */
    doneLast(session: SessionType) {
      const list = this.messages[session]
      if (list.length) list[list.length - 1].loading = false
    },
    /** 清空某个会话 */
    clear(session: SessionType) {
      this.messages[session] = []
    },
    /** 清空全部 */
    clearAll() {
      this.messages.qa = []
      this.messages.interview = []
      this.messages.generate = []
    }
  }
})
