import { WebSocketServer, WebSocket } from 'ws'
import * as pty from 'node-pty'
import { promises as fs } from 'fs'
import path from 'path'

interface PtySession {
  proc: pty.IPty
  // Ring buffer（用 chunk 数组 + 总长度计数实现，避免每次输出都 O(N) 复制整段字符串）。
  // 累积 PTY 全部输出（含 ANSI 控制序列），总字节数上限 MAX_BUFFER。
  // ws 连接时整段 replay，xterm 拿到完整字节流后会自行重建终端画面，
  // 包括滚动历史 —— 这就是"切回需求看到之前 claude 聊天记录"的实现机制。
  chunks: string[]
  totalLen: number
}

const sessions = new Map<string, PtySession>()
// 1 MB：约 200+ 轮 Claude Code 对话足够装下；同时给重连 replay 设置上限，
// 避免长时间 dev 进程（npm run dev、tail -f 等）让单会话占内存无限增长。
const MAX_BUFFER = 1024 * 1024
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

      session = { proc, chunks: [], totalLen: 0 }
      sessions.set(sessionId, session)

      // 永久 onData：所有 PTY 输出推入 chunks 数组、累加总长度，超过 MAX_BUFFER
      // 时从队首丢弃最早的 chunk。push/shift 都是 O(1)，避免每次拷贝整段字符串。
      // 同时这是修复 StrictMode 下 ws 重连导致初始 prompt 丢失的关键 —— 即便
      // 所有 ws 都在 shell 启动时关掉了，启动输出也被 buffer 捕获。
      proc.onData((data) => {
        session!.chunks.push(data)
        session!.totalLen += data.length
        while (session!.totalLen > MAX_BUFFER && session!.chunks.length > 1) {
          const oldest = session!.chunks.shift()!
          session!.totalLen -= oldest.length
        }
      })

      proc.onExit(() => {
        sessions.delete(sessionId)
      })
    }

    // ws 连接时把当前 buffer replay 给它。注意：这里 *不* 清空 buffer。
    // 原因：StrictMode 双重 mount 下，第一次 mount 的 ws 在 server 端 OPEN 时
    // replay 成功（server 视角），但 client 端已 close() —— 它收不到这条消息。
    // 如果此时清空 buffer，第二次 mount 的 ws 就 replay 不到任何内容（白屏）。
    // 不清空也让用户切回需求时能看到之前的 claude 聊天历史（≤ MAX_BUFFER）。
    if (session.totalLen > 0) {
      ws.send(JSON.stringify({ type: 'output', data: session.chunks.join('') }))
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
