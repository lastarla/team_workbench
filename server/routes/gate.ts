import { Router } from 'express'
import { promises as fs } from 'fs'
import path from 'path'
import { runGatePlugins } from '../plugin-manager.js'

export const gateRouter = Router()

const VAULT_ROOT = process.env.VAULT_ROOT || path.join(process.cwd(), 'vault')

// POST /api/pipeline/gate
gateRouter.post('/gate', async (req, res) => {
  const { project, phase, artifact } = req.body
  if (!project || !phase) {
    return res.status(400).json({ error: 'project and phase required' })
  }

  // Read artifact content if available
  let artifactContent = ''
  if (artifact) {
    try {
      // Try reading from project's local path
      const configPath = path.join(VAULT_ROOT, project, 'config.json')
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'))
      if (config.localPath) {
        const fullPath = path.isAbsolute(artifact)
          ? artifact
          : path.join(config.localPath, artifact)
        artifactContent = await fs.readFile(fullPath, 'utf-8')
      }
    } catch {
      // artifact content unavailable, proceed anyway
    }
  }

  const result = await runGatePlugins({ project, phase, artifact: artifact || '', artifactContent })
  res.json(result)
})
