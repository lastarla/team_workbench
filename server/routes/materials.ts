import { Router } from 'express'
import { promises as fs } from 'fs'
import path from 'path'
import { createWriteStream } from 'fs'

export const materialsRouter = Router()
const VAULT_ROOT = process.env.VAULT_ROOT || path.join(process.cwd(), 'vault')

// GET /api/materials/:project/:requirement — 列出需求下的资料
materialsRouter.get('/:project/:requirement', async (req, res) => {
  const dir = path.join(VAULT_ROOT, req.params.project, req.params.requirement, 'materials')
  try {
    const entries = await fs.readdir(dir)
    res.json(entries)
  } catch {
    res.json([])
  }
})

// POST /api/materials/:project/:requirement — 上传资料（raw body）
materialsRouter.post('/:project/:requirement', async (req, res) => {
  const filename = req.headers['x-filename'] as string
  if (!filename) return res.status(400).json({ error: 'x-filename header required' })
  const dir = path.join(VAULT_ROOT, req.params.project, req.params.requirement, 'materials')
  await fs.mkdir(dir, { recursive: true })
  const filePath = path.join(dir, filename)
  const ws = createWriteStream(filePath)
  req.pipe(ws)
  ws.on('finish', () => res.status(201).json({ filename }))
  ws.on('error', () => res.status(500).json({ error: 'write failed' }))
})

// DELETE /api/materials/:project/:requirement/:filename
materialsRouter.delete('/:project/:requirement/:filename', async (req, res) => {
  const filePath = path.join(VAULT_ROOT, req.params.project, req.params.requirement, 'materials', req.params.filename)
  try {
    await fs.unlink(filePath)
    res.json({ ok: true })
  } catch {
    res.status(404).json({ error: 'not found' })
  }
})
