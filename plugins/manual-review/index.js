/**
 * manual-review — 人工审核插件
 * Gate 触发时通知前端弹出审核 UI，等待用户操作（超时 5 分钟自动通过）
 */

// 存储待审核请求的 resolve 回调
const pendingReviews = new Map()

module.exports = {
  name: 'manual-review',

  // 供后端 WebSocket 调用：用户在 UI 上做出决定后调用此方法
  resolve(project, phase, result) {
    const key = `${project}:${phase}`
    const cb = pendingReviews.get(key)
    if (cb) {
      cb(result)
      pendingReviews.delete(key)
    }
  },

  async onGate(ctx) {
    const key = `${ctx.project}:${ctx.phase}`

    // 如果已有同一 key 的待审核，直接通过（避免重复阻塞）
    if (pendingReviews.has(key)) return null

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        pendingReviews.delete(key)
        resolve(null) // 超时自动通过
      }, 5 * 60 * 1000)

      pendingReviews.set(key, (result) => {
        clearTimeout(timeout)
        resolve(result)
      })
    })
  }
}
