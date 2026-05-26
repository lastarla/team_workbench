import { Router } from 'express'
import db from '../db'
import { v4 as uuid } from 'uuid'

export const storiesRouter = Router()

// POST /api/projects/:id/stories — 创建需求
storiesRouter.post('/:id/stories', (req, res) => {
  const { name, story_id } = req.body
  const project_id = req.params.id
  if (!name) return res.status(400).json({ error: 'name required' })
  const id = story_id || `${project_id}__${uuid()}`
  db.prepare('INSERT INTO stories (story_id, project_id, name) VALUES (?, ?, ?)').run(id, project_id, name)
  db.prepare('UPDATE projects SET version = version + 1, updated_at = datetime("now") WHERE project_id = ?').run(project_id)
  const story = db.prepare('SELECT * FROM stories WHERE story_id = ?').get(id)
  res.status(201).json(story)
})

// GET /api/projects/:id/stories — 获取需求列表
storiesRouter.get('/:id/stories', (req, res) => {
  const stories = db.prepare('SELECT * FROM stories WHERE project_id = ?').all(req.params.id)
  res.json(stories)
})
