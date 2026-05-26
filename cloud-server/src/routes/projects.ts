import { Router } from 'express'
import db from '../db'
import { v4 as uuid } from 'uuid'

export const projectsRouter = Router()

// POST /api/projects — 创建云端项目
projectsRouter.post('/', (req, res) => {
  const { name, creator_id, project_id } = req.body
  if (!name || !creator_id) return res.status(400).json({ error: 'name and creator_id required' })
  const id = project_id || uuid()
  db.prepare('INSERT INTO projects (project_id, name, creator_id) VALUES (?, ?, ?)').run(id, name, creator_id)
  const project = db.prepare('SELECT * FROM projects WHERE project_id = ?').get(id)
  res.status(201).json(project)
})

// GET /api/projects/:id — 获取项目详情
projectsRouter.get('/:id', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE project_id = ?').get(req.params.id)
  if (!project) return res.status(404).json({ error: 'not found' })
  res.json(project)
})

// GET /api/projects/:id/version — 获取版本号（轮询用）
projectsRouter.get('/:id/version', (req, res) => {
  const row = db.prepare('SELECT version FROM projects WHERE project_id = ?').get(req.params.id) as any
  if (!row) return res.status(404).json({ error: 'not found' })
  res.json({ version: row.version })
})

// POST /api/projects/join — 通过 ID 加入项目
projectsRouter.post('/join', (req, res) => {
  const { project_id } = req.body
  if (!project_id) return res.status(400).json({ error: 'project_id required' })
  const project = db.prepare('SELECT * FROM projects WHERE project_id = ?').get(project_id)
  if (!project) return res.status(404).json({ error: 'project not found' })
  const stories = db.prepare('SELECT * FROM stories WHERE project_id = ?').all(project_id)
  res.json({ project, stories })
})
