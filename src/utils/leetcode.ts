/**
 * LeetCode 题目导入工具
 * 支持通过题号或题目链接导入题目为知识点卡片
 */

export interface LeetCodeProblem {
  id: string
  title: string
  titleSlug: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  content: string        // 题目描述（HTML）
  topics: string[]       // 标签
  codeSnippets: { lang: string; code: string }[]
  url: string
}

// 难度对应的颜色
export const DIFFICULTY_COLOR: Record<string, string> = {
  Easy: '#10b981',
  Medium: '#f59e0b',
  Hard: '#ef4444'
}

/**
 * 从用户输入解析题目标题 slug
 * 支持：
 *  - 完整 URL: https://leetcode.cn/problems/two-sum/
 *  - 标题 slug: two-sum
 */
export function parseSlug(input: string): string {
  const trimmed = input.trim()
  // 如果是 URL，提取 slug
  const urlMatch = trimmed.match(/problems\/([^/]+)/)
  if (urlMatch) return urlMatch[1]
  // 否则当作 slug
  return trimmed
}

/**
 * 从 LeetCode 官方 GraphQL API 获取题目详情
 * - 开发环境：通过 Vite proxy 代理到 https://leetcode.cn/graphql/
 * - 生产环境：通过 CORS 代理 corsproxy.io 转发请求
 */
export async function fetchLeetCodeProblem(slug: string): Promise<LeetCodeProblem> {
  const query = `
    query questionData($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        questionId
        title
        titleSlug
        content
        difficulty
        topicTags { name }
        codeSnippets { lang code }
      }
    }
  `

  // 开发环境走 Vite proxy，生产环境走 CORS 代理
  const isDev = import.meta.env.DEV
  const apiUrl = isDev
    ? '/leetcode-api/graphql/'
    : `https://corsproxy.io/?url=${encodeURIComponent('https://leetcode.cn/graphql/')}`

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Referer': 'https://leetcode.cn/'
    },
    body: JSON.stringify({
      query,
      variables: { titleSlug: slug }
    })
  })

  if (!res.ok) {
    throw new Error(`请求失败: ${res.status}，请检查题号是否正确`)
  }

  const json = await res.json()
  const q = json?.data?.question

  if (!q || !q.title) {
    throw new Error('未找到该题目，请检查输入的 slug 是否正确')
  }

  return {
    id: q.questionId,
    title: q.title,
    titleSlug: slug,
    difficulty: q.difficulty,
    content: q.content || '',
    topics: q.topicTags?.map((t: { name: string }) => t.name) || [],
    codeSnippets: q.codeSnippets || [],
    url: `https://leetcode.cn/problems/${slug}/`
  }
}

/**
 * 将 HTML 内容转为纯文本（简单处理）
 */
export function htmlToText(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
}

/**
 * 从题目生成 Markdown 格式的知识点内容
 */
export function problemToMarkdown(p: LeetCodeProblem): string {
  const text = htmlToText(p.content)
  const codeSnippet = p.codeSnippets.find(s => s.lang === 'JavaScript') || p.codeSnippets[0]

  return `## ${p.title}

**难度**: ${p.difficulty} ｜ **题号**: ${p.id} ｜ **标签**: ${p.topics.join(', ') || '无'}

### 题目描述

${text}

### 示例代码

\`\`\`${codeSnippet?.lang || 'javascript'}
${codeSnippet?.code || '// 在此编写代码'}
\`\`\`

> 来源: [LeetCode](${p.url})
`
}
