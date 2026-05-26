import { WebSocketServer, WebSocket } from 'ws'
import * as pty from 'node-pty'
import { promises as fs } from 'fs'
import path from 'path'

interface PtySession {
  proc: pty.IPty
  // 断线/初始化期间累积 PTY 输出（ring buffer，限制大小避免无限增长）。
  // 每次 ws connect 时把当前 buffer 一次性 replay 给新 ws 后清空，
  // 这样既能保证首次连接看到 startup prompt（即便 ws 重连有时序竞争），
  // 又不会出现"切走再切回时重复显示之前内容"的问题。
  buffer: string
}

const sessions = new Map<string, PtySession>()
const MAX_BUFFER = 8192 // 大致一屏 ~80*100 字符
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
      // 用 -l 启动 login shell：加载 ~/.zprofile / ~/.bash_profile / /etc/paths.d 等。
      // 否则用户在 .zprofile 里设的 PATH（nvm、claude、brew 等）会缺失，
      // 导致命令找不到（Terminal.app 默认起 login shell，需要保持一致）。
      const proc = pty.spawn(shell, ['-l'], {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd,
        env: process.env as { [key: string]: string }
      })

      session = { proc, buffer: '' }
      sessions.set(sessionId, session)

      // 永久 onData：把所有 PTY 输出累积到 ring buffer（不论是否有 ws 连接）。
      // 这是修复 StrictMode 下 ws 重连导致初始 prompt 丢失的关键 —— 即便所有 ws
      // 都在 shell 启动时关掉了，启动输出也被 buffer 捕获，下个 ws 连上时回放。
      proc.onData((data) => {
        session!.buffer = (session!.buffer + data).slice(-MAX_BUFFER)
      })

      proc.onExit(() => {
        sessions.delete(sessionId)
      })
    }

    // ws 连接时把当前 buffer replay 给它。注意：这里 *不* 清空 buffer。
    // 原因：StrictMode 双重 mount 下，第一次 mount 的 ws 在 server 端 OPEN 时
    // replay 成功（server 视角），但 client 端已 close() —— 它收不到这条消息。
    // 如果此时清空 buffer，第二次 mount 的 ws 就 replay 不到任何内容（白屏）。
    // 不清空的副作用：用户切走再切回会看到"最近一屏"的内容（≤MAX_BUFFER），
    // 这其实就是 PTY 当前的屏幕状态，符合 tmux attach 的直觉，且大小有界。
    if (session.buffer) {
      ws.send(JSON.stringify({ type: 'output', data: session.buffer }))
    }

    // 实时转发 pty → 当前这个 ws（每个 ws 连接一份订阅，断开时 dispose）。
    // 注意：永久 onData（上面那个）继续把所有数据写入 buffer —— 这里的实时转发
    // 与 buffer 累积并行，互不干扰。buffer 受 MAX_BUFFER 限制不会无限增长。
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
