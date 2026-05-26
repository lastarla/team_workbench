import { WebSocketServer, WebSocket } from 'ws'
import chokidar from 'chokidar'
import { promises as fs } from 'fs'
import path from 'path'

const VAULT_ROOT = process.env.VAULT_ROOT || path.join(process.cwd(), 'vault')

export function setupPipelineWatcher(wss: WebSocketServer) {
  const watcher = chokidar.watch('**/PIPELINE_STATE.json', {
    cwd: VAULT_ROOT,
    ignoreInitial: true
  })

  watcher.on('change', async (filePath: string) => {
    try {
      const full = path.join(VAULT_ROOT, filePath)
      const content = await fs.readFile(full, 'utf-8')
      const state = JSON.parse(content)
      const msg = JSON.stringify({ type: 'pipeline_state', path: filePath, state })
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(msg)
        }
      })
    } catch {}
  })
}
