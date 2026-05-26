type MessageHandler = (msg: any) => void

export class WsClient {
  private ws: WebSocket | null = null
  private handlers: MessageHandler[] = []

  connect(sessionId: string) {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${location.host}/ws?session=${sessionId}`
    this.ws = new WebSocket(url)
    this.ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      this.handlers.forEach(h => h(msg))
    }
    this.ws.onclose = () => { this.ws = null }
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
