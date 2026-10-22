# 🧠 代码复习助手 (Code Reviewer)

> 用 **FSRS 间隔复习算法** 把代码知识真正记进脑子里 · AI 模拟面试陪练 · 数据本地隔离零后端

![Vue](https://img.shields.io/badge/Vue-3-42b883?logo=vue.js&logoColor=fff)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=fff)
![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=fff)
![ElementPlus](https://img.shields.io/badge/Element%2B-FC6679?logo=element-plus&logoColor=fff)
![Dexie](https://img.shields.io/badge/Dexie-IndexedDB-10b981?logo=indexeddb&logoColor=fff)
![FSRS](https://img.shields.io/badge/FSRS-algorithm-8b5cf6)

---

## ✨ 核心特性

| | |
|--|--|
| 🧠 **FSRS 科学复习** | 不是简单翻牌，是基于遗忘曲线的真实记忆调度——每张卡片有独立的难度、稳定性、可回忆概率 |
| 🤖 **AI 模拟面试** | 选方向（前端 / Java / 算法 / 网络…），AI 当面试官逐题提问 + 点评 + 出下一题 |
| 📝 **AI 智能出题** | 一键生成结构化面试题（题目 / 参考答案 / 难度 / 标签），支持折叠答案 |
| 💬 **AI 自由问答** | 悬浮球随时唤起，多轮上下文对话，支持流式逐字输出 |
| 📚 **Markdown 知识库** | 代码块高亮 + 标签分类 + 全文搜索 + 详情页完整阅读 |
| 📊 **真实数据统计** | 记忆曲线（FSRS 遗忘公式现算）· 分类掌握度 · 连续打卡热力图 |
| 🏅 **成就系统** | 青铜→王者 段位 + 12 枚勋章，EXP 纯推导不存状态 |
| 🔒 **数据本地隔离** | 每人独立 IndexedDB，不同账号零串数据；账号包导出/导入换设备迁移 |
| 🌙 **暗色主题 + 壁纸** | 自上传图片/视频作壁纸，支持模糊/亮度/透明度调节 |
| 🧩 **浏览器插件** | 选中网页文字一键导入为知识点 |

## 🎯 谁适合用

- 💻 **应届生 / 转行者**：面试前系统过一遍八股文，AI 帮你查漏补缺
- 👨‍💻 **在职开发者**：把学过的技术点做成卡片，用间隔复习对抗遗忘
- 📖 **终身学习者**：不止代码，任何需要长期记忆的知识点都能用

## 🛠 技术栈

```
前端框架    Vue 3 + TypeScript + Vite 5
UI 组件库   Element Plus（暗色主题）
状态管理    Pinia + 持久化
数据库      IndexedDB（Dexie 封装）· 按用户名隔离
路由        Vue Router（Hash 模式，GitHub Pages 零配置）
FSRS 算法   ts-fsrs 官方实现
AI 流式     Fetch + SSE（OpenAI 兼容接口）
Markdown    marked + DOMPurify + 代码块高亮
部署        GitHub Pages（GitHub Actions 自动发布）
```

## 🚀 在线体验

> 部署后填入你的 API Key 即可使用 AI 功能（不填 Key 也能正常使用知识库和复习）

登录页选「注册」创建账号，每个用户独立数据库，数据永远保存在你自己的浏览器里。

## 💻 本地运行

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 生产构建
npm run build
# 产物在 dist/ 目录
```

## 🔑 AI 模型配置

打开「设置 → AI 助手」：

| 类型 | 说明 |
|------|------|
| **API Key** | 支持 DeepSeek / Moonshot / DashScope / 智谱 / 豆包 / OpenAI 等 OpenAI 兼容接口 |
| **内置模型** | 8 个常用模型预置，直接选 |
| **自定义模型** | Ollama / LM Studio / One API / 自建代理 → 填 label + model + baseUrl 即可 |

> API Key 仅保存在你自己的浏览器 localStorage 里，**不会上传任何服务器**。


## 🗂 浏览器插件

项目根目录 `extension/` 文件夹包含一个 Manifest V3 Chrome 扩展：

- 选中网页文字 → 右键「保存到代码复习助手」→ 自动跳转应用创建知识点
- 在 `chrome://extensions` 开启开发者模式 → 加载已解压扩展 → 选 `extension/` 目录

## 🏗 项目结构

```
code-reviewer/
├── src/
│   ├── components/          # 悬浮球 / AI 面板 / Sidebar / 壁纸设置
│   ├── layouts/             # DefaultLayout（左侧栏 + 顶栏 + 主内容）
│   ├── views/               # 6 个页面：Login / Dashboard / Library / Review / Stats / Settings / Achievements / ExtensionImport
│   ├── stores/              # Pinia stores：auth / ai / user / settings / wallpaper / notice / achievement / app
│   ├── utils/               # db.ts（Dexie）/ fsrs.ts（算法封装）/ ai.ts（流式调用）/ stats.ts（统计聚合）/ backup.ts（账号包）/ leetcode.ts / idb.ts
│   ├── router/index.ts      # Vue Router + 登录守卫
│   ├── App.vue              # 根组件
│   └── main.ts
├── extension/               # 浏览器插件源码
├── docs/                    # 架构图文档
└── .github/workflows/       # 自动部署 Actions
```

## ⚠️ 注意事项

1. **纯前端零后端**：登录系统是演示级安全（密码哈希存 localStorage），不要用真实密码
2. **数据本地隔离**：每个浏览器/设备的 IndexedDB 独立，换设备用「设置 → 导出账号包」迁移
3. **浏览器直调限制**：OpenAI GPT-4o 浏览器直调可能被 CORS 拦截，建议用 DeepSeek / Moonshot / DashScope

## 📝 License

MIT — 随便改、随便用、随便发 PR。

---

**如果这个项目帮到你，点个 ⭐ 吧！**
