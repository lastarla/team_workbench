import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import db from '../db'
import { v4 as uuid } from 'uuid'

const UPLOADS_ROOT = path.join(__dirname, '..', '..', 'uploads')

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = path.join(UPLOADS_ROOT, req.params.id as string, req.params.storyId as string)
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (_req, file, cb) => {
    cb(null, file.originalname)
  }
})

const upload = multer({ storage })

export const materialsRouter = Router()

// POST /api/projects/:id/stories/:storyId/materials — 上传资源
materialsRouter.post('/:id/stories/:storyId/materials', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file required' })
  const id = uuid()
  const filePath = path.join(req.params.id as string, req.params.storyId as string, req.file.originalname)
  db.prepare('INSERT INTO materials (material_id, story_id, project_id, filename, file_path, size) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, req.params.storyId, req.params.id, req.file.originalname, filePath, req.file.size)
  db.prepare('UPDATE projects SET version = version + 1, updated_at = datetime("now") WHERE project_id = ?').run(req.params.id)
  res.status(201).json({ material_id: id, filename: req.file.originalname, size: req.file.size })
})

// GET /api/projects/:id/stories/:storyId/materials — 获取资源列表
materialsRouter.get('/:id/stories/:storyId/materials', (req, res) => {
  const materials = db.prepare('SELECT * FROM materials WHERE project_id = ? AND story_id = ?').all(req.params.id, req.params.storyId)
  res.json(materials)
})

// GET /api/projects/:id/stories/:storyId/materials/:materialId/download — 下载资源
materialsRouter.get('/:id/stories/:storyId/materials/:materialId/download', (req, res) => {
  const material = db.prepare('SELECT * FROM materials WHERE material_id = ?').get(req.params.materialId) as any
  if (!material) return res.status(404).json({ error: 'not found' })
  const filePath = path.join(UPLOADS_ROOT, material.file_path)
  res.download(filePath, material.filename)
})
