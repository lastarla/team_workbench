import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import path from 'path'
import { projectsRouter } from './routes/projects.js'
import { materialsRouter } from './routes/materials.js'
import { hookConfigRouter } from './routes/hook-config.js'
import { gateRouter } from './routes/gate.js'
import { pluginsRouter } from './routes/plugins.js'
import { cloudSyncRouter } from './routes/cloud-sync.js'
import { setupPtyWebSocket } from './pty-manager.js'
import { setupPipelineWatcher } from './pipeline-watcher.js'

export function startServer(port?: number) {
  const app = express()
  app.use(cors())
  app.use(express.json())

  app.use('/api/projects', projectsRouter)
  app.use('/api/materials', materialsRouter)
  app.use('/api/hook-config', hookConfigRouter)
  app.use('/api/pipeline', gateRouter)
  app.use('/api/plugins', pluginsRouter)
  app.use('/api/cloud', cloudSyncRouter)

  // 生产模式下服务前端静态文件
  const distPath = path.join(__dirname, '../dist')
  app.use(express.static(distPath))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })

  const server = createServer(app)
  const wss = new WebSocketServer({ server, path: '/ws' })

  setupPtyWebSocket(wss)
  setupPipelineWatcher(wss)

  const finalPort = port || parseInt(process.env.PORT || '9527')
  server.listen(finalPort, () => {
    console.log(`Team Workbench running on http://localhost:${finalPort}`)
  })

  return server
}

// 直接运行时启动
if (require.main === module) {
  startServer()
}
