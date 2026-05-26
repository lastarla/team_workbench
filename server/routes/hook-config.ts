import { Router } from 'express'
import { promises as fs } from 'fs'
import path from 'path'

export const hookConfigRouter = Router()
const CONFIG_PATH = path.join(process.cwd(), 'PIPELINE_CONFIG.json')

// GET /api/hook-config
hookConfigRouter.get('/', async (_req, res) => {
  try {
    const content = await fs.readFile(CONFIG_PATH, 'utf-8')
    res.json(JSON.parse(content))
  } catch {
    res.json({ phases: {} })
  }
})

// PUT /api/hook-config
hookConfigRouter.put('/', async (req, res) => {
  await fs.writeFile(CONFIG_PATH, JSON.stringify(req.body, null, 2))
  res.json({ ok: true })
})
