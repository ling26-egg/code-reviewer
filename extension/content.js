/**
 * 内容脚本：注入到所有网页
 * 功能：监听文字选中，显示浮动"保存"按钮
 */

let saveBtn = null

// 创建浮动保存按钮
function createSaveButton() {
  if (saveBtn) return
  saveBtn = document.createElement('div')
  saveBtn.id = 'codereview-save-btn'
  saveBtn.innerHTML = '📥 保存到 CodeReview'
  Object.assign(saveBtn.style, {
    position: 'fixed',
    zIndex: '2147483647',
    padding: '8px 16px',
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    color: '#0a0e1a',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    display: 'none',
    fontFamily: 'system-ui, sans-serif',
    transition: 'transform 0.15s, opacity 0.15s'
  })
  document.body.appendChild(saveBtn)

  saveBtn.addEventListener('click', () => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim()) {
      chrome.runtime.sendMessage({
        type: 'SAVE_SELECTION',
        text: selection.toString(),
        url: window.location.href,
        title: document.title
      }, (res) => {
        if (res?.success) {
          saveBtn.textContent = '✅ 已保存！'
          setTimeout(() => hideButton(), 1000)
        }
      })
    }
  })
}

function showButton(x, y) {
  if (!saveBtn) createSaveButton()
  saveBtn.style.left = x + 'px'
  saveBtn.style.top = (y + 20) + 'px'
  saveBtn.style.display = 'block'
  saveBtn.style.opacity = '1'
  saveBtn.textContent = '📥 保存到 CodeReview'
}

function hideButton() {
  if (saveBtn) {
    saveBtn.style.opacity = '0'
    setTimeout(() => {
      if (saveBtn) saveBtn.style.display = 'none'
    }, 150)
  }
}

// 监听文字选中
document.addEventListener('mouseup', (e) => {
  setTimeout(() => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim().length > 0) {
      showButton(e.clientX, e.clientY)
    } else {
      hideButton()
    }
  }, 10)
})

// 点击其他地方隐藏
document.addEventListener('mousedown', (e) => {
  if (saveBtn && !saveBtn.contains(e.target)) {
    // 延迟隐藏，让点击选中生效
    setTimeout(() => {
      const selection = window.getSelection()
      if (!selection || !selection.toString().trim()) {
        hideButton()
      }
    }, 50)
  }
})

// 监听来自 popup 的获取选中文本请求
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_SELECTION') {
    const selection = window.getSelection()
    sendResponse({
      text: selection ? selection.toString() : '',
      url: window.location.href,
      title: document.title
    })
  }
  return true
})
