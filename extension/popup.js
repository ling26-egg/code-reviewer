/**
 * 弹窗逻辑
 */
const APP_URL = 'http://localhost:5173' // 主应用地址

// 打开主应用
document.getElementById('open-app').addEventListener('click', () => {
  chrome.tabs.create({ url: APP_URL })
})

// 保存当前页选中内容
document.getElementById('save-current').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab) return

  // 向 content script 请求选中内容
  chrome.tabs.sendMessage(tab.id, { type: 'GET_SELECTION' }, (res) => {
    if (res?.text) {
      const payload = {
        text: res.text,
        url: tab.url,
        title: tab.title,
        timestamp: Date.now()
      }
      const json = JSON.stringify(payload)
      const base64 = btoa(unescape(encodeURIComponent(json)))
      chrome.tabs.create({ url: `${APP_URL}/extension-import#${base64}` })
    } else {
      alert('请先在页面上选中要保存的文字')
    }
  })
})
