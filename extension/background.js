/**
 * 浏览器插件后台脚本 (Service Worker)
 * 负责：创建右键菜单、处理点击事件、暂存选中内容
 */

const APP_URL = 'http://localhost:5173' // 主应用地址，部署后改为你的 GitHub Pages 地址

/**
 * 将数据编码到 URL hash 中传递给主应用
 * 使用 base64 编码避免特殊字符问题
 */
function buildImportUrl(payload) {
  const json = JSON.stringify(payload)
  const base64 = btoa(unescape(encodeURIComponent(json)))
  return `${APP_URL}/extension-import#${base64}`
}

// 安装时创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-to-codereview',
    title: '保存到 CodeReview',
    contexts: ['selection']
  })
})

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'save-to-codereview' && info.selectionText) {
    const payload = {
      text: info.selectionText,
      url: info.pageUrl,
      title: tab?.title || '',
      timestamp: Date.now()
    }
    chrome.tabs.create({ url: buildImportUrl(payload) })
  }
})

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'SAVE_SELECTION') {
    const payload = {
      text: msg.text,
      url: msg.url,
      title: msg.title,
      timestamp: Date.now()
    }
    chrome.tabs.create({ url: buildImportUrl(payload) }, () => {
      sendResponse({ success: true })
    })
    return true
  }
})
