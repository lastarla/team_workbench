import { WebSocketServer, WebSocket } from 'ws'
import * as pty from 'node-pty'
import { promises as fs } from 'fs'
import path from 'path'

interface PtySession {
  proc: pty.IPty
  buffer: string[]
}

const sessions = new Map<string, PtySession>()
const MAX_BUFFER = 200
const VAULT_ROOT = process.env.VAULT_ROOT || path.join(process.cwd(), 'vault')

async function getProjectCwd(sessionId: string): Promise<string> {
  const project = sessionId.split('/')[0]
  if (!project) return process.cwd()
  try {
    const configPath = path.join(VAULT_ROOT, project, 'config.json')
    const config = JSON.parse(await fs.readFile(configPath, 'utf-8'))
    if (config.localPath) return config.localPath
  } catch {}
  return process.cwd()
}

export function setupPtyWebSocket(wss: WebSocketServer) {
  wss.on('connection', async (ws: WebSocket, req) => {
    const url = new URL(req.url || '', 'http://localhost')
    if (url.pathname !== '/ws') return

    const sessionId = url.searchParams.get('session') || 'default'
    let session = sessions.get(sessionId)

    if (!session) {
      const cwd = await getProjectCwd(sessionId)
      const shell = process.platform === 'darwin' ? '/bin/zsh' : '/bin/bash'
      const proc = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd,
        env: process.env as { [key: string]: string }
      })

      session = { proc, buffer: [] }
      sessions.set(sessionId, session)

      proc.onData((data) => {
        session!.buffer.push(data)
        if (session!.buffer.length > MAX_BUFFER) session!.buffer.shift()
      })

      proc.onExit(() => {
        sessions.delete(sessionId)
      })
    }

    // 回放历史输出
    if (session.buffer.length > 0) {
      ws.send(JSON.stringify({ type: 'output', data: session.buffer.join('') }))
    }

    // 实时转发 pty → WebSocket
    const dataHandler = session.proc.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'output', data }))
      }
    })

    // WebSocket → pty
    ws.on('message', (msg: Buffer) => {
      try {
        const parsed = JSON.parse(msg.toString())
        if (parsed.type === 'input') {
          session!.proc.write(parsed.data)
        } else if (parsed.type === 'resize' && parsed.cols && parsed.rows) {
          session!.proc.resize(parsed.cols, parsed.rows)
        }
      } catch {}
    })

    ws.on('close', () => {
      dataHandler.dispose()
    })
  })
}
