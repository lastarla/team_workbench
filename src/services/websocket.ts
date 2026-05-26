type MessageHandler = (msg: any) => void

export class WsClient {
  private ws: WebSocket | null = null
  private handlers: MessageHandler[] = []

  connect(sessionId: string) {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${location.host}/ws?session=${sessionId}`
    const ws = new WebSocket(url)
    this.ws = ws
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      this.handlers.forEach(h => h(msg))
    }
    // 只在 this.ws 仍指向这个 ws 时才置 null —— 否则在 StrictMode 双重 mount 下，
    // 旧 ws 关闭时会把已经被 reassign 的新 ws 引用一起擦掉，导致输入无法发送。
    ws.onclose = () => {
      if (this.ws === ws) this.ws = null
    }
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  onMessage(handler: MessageHandler) {
    this.handlers.push(handler)
    return () => { this.handlers = this.handlers.filter(h => h !== handler) }
  }

  disconnect() {
    this.ws?.close()
    this.ws = null
    this.handlers = []
  }
}

export const wsClient = new WsClient()
