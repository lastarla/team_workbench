import { Router } from 'express'
import { createCloudProject, createCloudStory, joinCloudProject, getCloudStories } from '../cloud-client'

export const cloudSyncRouter = Router()

// POST /api/cloud/projects — 同步创建云端项目
cloudSyncRouter.post('/projects', async (req, res) => {
  try {
    const { projectId, name, creatorId } = req.body
    const result = await createCloudProject(projectId, name, creatorId)
    res.json(result)
  } catch (e: any) {
    res.status(502).json({ error: e.message })
  }
})

// POST /api/cloud/projects/:id/stories — 同步创建云端需求
cloudSyncRouter.post('/projects/:id/stories', async (req, res) => {
  try {
    const { storyId, name } = req.body
    const result = await createCloudStory(req.params.id, storyId, name)
    res.json(result)
  } catch (e: any) {
    res.status(502).json({ error: e.message })
  }
})

// POST /api/cloud/join — 通过 ID 加入云端项目
cloudSyncRouter.post('/join', async (req, res) => {
  try {
    const { projectId } = req.body
    const result = await joinCloudProject(projectId)
    res.json(result)
  } catch (e: any) {
    res.status(502).json({ error: e.message })
  }
})

// GET /api/cloud/projects/:id/stories — 获取云端需求列表
cloudSyncRouter.get('/projects/:id/stories', async (req, res) => {
  try {
    const result = await getCloudStories(req.params.id)
    res.json(result)
  } catch (e: any) {
    res.status(502).json({ error: e.message })
  }
})

// POST /api/cloud/projects/:id/stories/:storyId/materials/upload — 上传资源到云端
cloudSyncRouter.post('/projects/:id/stories/:storyId/materials/upload', async (req, res) => {
  try {
    const CLOUD_SERVER_URL = process.env.CLOUD_SERVER_URL || 'http://localhost:9528'
    const url = `${CLOUD_SERVER_URL}/api/projects/${req.params.id}/stories/${req.params.storyId}/materials`
    // 转发 multipart 请求
    const response = await fetch(url, { method: 'POST', body: req.body, headers: { 'Content-Type': req.headers['content-type'] || '' } })
    const result = await response.json()
    res.json(result)
  } catch (e: any) {
    res.status(502).json({ error: e.message })
  }
})

// GET /api/cloud/projects/:id/stories/:storyId/materials — 获取云端资源列表
cloudSyncRouter.get('/projects/:id/stories/:storyId/materials', async (req, res) => {
  try {
    const CLOUD_SERVER_URL = process.env.CLOUD_SERVER_URL || 'http://localhost:9528'
    const url = `${CLOUD_SERVER_URL}/api/projects/${req.params.id}/stories/${req.params.storyId}/materials`
    const response = await fetch(url)
    const result = await response.json()
    res.json(result)
  } catch (e: any) {
    res.status(502).json({ error: e.message })
  }
})
