import { Router } from 'express'
import { promises as fs } from 'fs'
import path from 'path'
import { listPlugins, setPluginEnabled, setPluginProjects, deletePlugin, getPluginsDir } from '../plugin-manager.js'

export const pluginsRouter = Router()

// GET /api/plugins — list all plugins
pluginsRouter.get('/', async (_req, res) => {
  const plugins = await listPlugins()
  res.json(plugins)
})

// PUT /api/plugins/:name/enabled — toggle plugin
pluginsRouter.put('/:name/enabled', async (req, res) => {
  const { enabled } = req.body
  await setPluginEnabled(req.params.name, !!enabled)
  res.json({ ok: true })
})

// PUT /api/plugins/:name/projects — set applicable projects
pluginsRouter.put('/:name/projects', async (req, res) => {
  const { projects } = req.body
  await setPluginProjects(req.params.name, projects || [])
  res.json({ ok: true })
})

// DELETE /api/plugins/:name — delete user plugin
pluginsRouter.delete('/:name', async (req, res) => {
  const ok = await deletePlugin(req.params.name)
  if (!ok) return res.status(403).json({ error: '预设插件不可删除' })
  res.json({ ok: true })
})

// POST /api/plugins/upload — upload a plugin (expects JSON body with name, description, code)
pluginsRouter.post('/upload', async (req, res) => {
  const { name, description, code } = req.body
  if (!name || !code) return res.status(400).json({ error: 'name and code required' })

  const pluginDir = path.join(getPluginsDir(), name)
  await fs.mkdir(pluginDir, { recursive: true })

  const meta = { name, description: description || '', builtin: false }
  await fs.writeFile(path.join(pluginDir, 'plugin.json'), JSON.stringify(meta, null, 2))
  await fs.writeFile(path.join(pluginDir, 'index.js'), code)

  res.status(201).json({ ok: true, name })
})
