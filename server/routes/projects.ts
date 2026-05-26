import { Router } from 'express'
import { promises as fs } from 'fs'
import path from 'path'
import { exec } from 'child_process'

export const projectsRouter = Router()

const VAULT_ROOT = process.env.VAULT_ROOT || path.join(process.cwd(), 'vault')

// POST /api/projects/pick-directory — 调用系统原生目录选择器，返回绝对路径
// macOS: osascript "choose folder"
// Linux: zenity --file-selection --directory (需安装 zenity)
// Windows: PowerShell FolderBrowserDialog
projectsRouter.post('/pick-directory', async (_req, res) => {
  const platform = process.platform
  let cmd: string

  if (platform === 'darwin') {
    // 用 -e 多行参数；POSIX path 把 HFS 路径转成 /Users/... 形式
    cmd = `osascript -e 'tell application "System Events" to activate' -e 'POSIX path of (choose folder with prompt "选择项目目录")'`
  } else if (platform === 'linux') {
    cmd = `zenity --file-selection --directory --title="选择项目目录"`
  } else if (platform === 'win32') {
    // PowerShell：避免 STA 问题用 -STA
    const ps = `Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.Description = '选择项目目录'; if ($f.ShowDialog() -eq 'OK') { Write-Output $f.SelectedPath }`
    cmd = `powershell -NoProfile -STA -Command "${ps.replace(/"/g, '\\"')}"`
  } else {
    return res.status(400).json({ error: `unsupported platform: ${platform}` })
  }

  exec(cmd, { maxBuffer: 1024 * 64 }, (err, stdout, stderr) => {
    if (err) {
      // 用户取消：macOS osascript 错误码 -128；其他平台匹配关键字
      const text = (stderr || err.message || '').toString()
      if (/-128|User canceled|cancelled|canceled|已取消|已取消/i.test(text)) {
        return res.status(204).end()
      }
      // Linux zenity 取消时退出码 1 且无 stderr
      if (platform === 'linux' && !text.trim()) {
        return res.status(204).end()
      }
      return res.status(500).json({ error: text.trim() || '调用系统目录对话框失败' })
    }
    const dir = (stdout || '').trim().replace(/\/+$/, '')
    if (!dir) return res.status(204).end()
    if (!path.isAbsolute(dir)) {
      return res.status(500).json({ error: `返回路径不是绝对路径: ${dir}` })
    }
    res.json({ path: dir, name: path.basename(dir) })
  })
})

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true })
}

async function readJson(filePath: string) {
  try { return JSON.parse(await fs.readFile(filePath, 'utf-8')) } catch { return {} }
}

// GET /api/projects — 列出所有项目（含 config）
projectsRouter.get('/', async (_req, res) => {
  await ensureDir(VAULT_ROOT)
  const entries = await fs.readdir(VAULT_ROOT, { withFileTypes: true })
  const projects = await Promise.all(
    entries
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .map(async e => {
        const config = await readJson(path.join(VAULT_ROOT, e.name, 'config.json'))
        return { name: e.name, config: { type: 'local', ...config } }
      })
  )
  res.json(projects)
})

// POST /api/projects — 创建项目
projectsRouter.post('/', async (req, res) => {
  const { name, config } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  const dir = path.join(VAULT_ROOT, name)
  await ensureDir(dir)
  if (config) {
    await fs.writeFile(path.join(dir, 'config.json'), JSON.stringify(config, null, 2))
  }
  res.status(201).json({ name, config: config || { type: 'local' } })
})

// GET /api/projects/:project/requirements — 列出需求（含 config）
projectsRouter.get('/:project/requirements', async (req, res) => {
  const dir = path.join(VAULT_ROOT, req.params.project)
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const reqs = await Promise.all(
      entries
        .filter(e => e.isDirectory() && !e.name.startsWith('.'))
        .map(async e => {
          const config = await readJson(path.join(dir, e.name, 'config.json'))
          return { name: e.name, config }
        })
    )
    res.json(reqs)
  } catch {
    res.json([])
  }
})

// POST /api/projects/:project/requirements — 创建需求
projectsRouter.post('/:project/requirements', async (req, res) => {
  const { name, config } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  const dir = path.join(VAULT_ROOT, req.params.project, name)
  await ensureDir(dir)
  if (config) {
    await fs.writeFile(path.join(dir, 'config.json'), JSON.stringify(config, null, 2))
  }
  res.status(201).json({ name, config })
})

// GET /api/projects/:project/config — 获取项目配置
projectsRouter.get('/:project/config', async (req, res) => {
  const config = await readJson(path.join(VAULT_ROOT, req.params.project, 'config.json'))
  res.json(config)
})

// PUT /api/projects/:project/config — 更新项目配置
projectsRouter.put('/:project/config', async (req, res) => {
  const configPath = path.join(VAULT_ROOT, req.params.project, 'config.json')
  const existing = await readJson(configPath)
  const updated = { ...existing, ...req.body }
  await fs.writeFile(configPath, JSON.stringify(updated, null, 2))
  res.json(updated)
})

// PUT /api/projects/:project/local-path — 设置关联本地目录
projectsRouter.put('/:project/local-path', async (req, res) => {
  const { localPath } = req.body
  if (!localPath) return res.status(400).json({ error: 'localPath required' })
  try {
    const stat = await fs.stat(localPath)
    if (!stat.isDirectory()) return res.status(400).json({ error: 'path is not a directory' })
  } catch {
    return res.status(400).json({ error: 'directory does not exist' })
  }
  const configPath = path.join(VAULT_ROOT, req.params.project, 'config.json')
  const config = await readJson(configPath)
  config.localPath = localPath
  await fs.writeFile(configPath, JSON.stringify(config, null, 2))
  res.json({ localPath })
})

// POST /api/projects/:project/open — 用编辑器/Finder打开项目目录
projectsRouter.post('/:project/open', async (req, res) => {
  const { tool } = req.body // 'vscode' | 'cursor' | 'finder'
  const config = await readJson(path.join(VAULT_ROOT, req.params.project, 'config.json'))
  const dir = config.localPath
  if (!dir) return res.status(400).json({ error: '该项目未设置本地目录,请先在项目设置中关联本地目录' })
  if (!path.isAbsolute(dir)) return res.status(400).json({ error: `本地目录不是绝对路径: "${dir}",请在项目设置中改为绝对路径` })
  try {
    const stat = await fs.stat(dir)
    if (!stat.isDirectory()) return res.status(400).json({ error: `路径不是目录: ${dir}` })
  } catch {
    return res.status(400).json({ error: `本地目录不存在: ${dir}` })
  }

  const { exec } = await import('child_process')
  const cmds: Record<string, { cmd: string; args: string[] }> = {
    vscode: { cmd: 'code', args: [dir] },
    cursor: { cmd: 'cursor', args: [dir] },
    finder: { cmd: 'open', args: [dir] }
  }
  const entry = cmds[tool]
  if (!entry) return res.status(400).json({ error: 'unknown tool' })

  // 用 shell 转义防注入
  const shellEscape = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`
  const cmdLine = `${entry.cmd} ${entry.args.map(shellEscape).join(' ')}`

  exec(cmdLine, (err) => {
    if (err) {
      const msg = err.message.includes('not found') || err.message.includes('command not found')
        ? `${entry.cmd} 命令未安装或不在 PATH 中`
        : err.message
      return res.status(500).json({ error: msg })
    }
    res.json({ ok: true })
  })
})

// DELETE /api/projects/:project — 删除项目（含所有子级）
projectsRouter.delete('/:project', async (req, res) => {
  const dir = path.join(VAULT_ROOT, req.params.project)
  try {
    await fs.rm(dir, { recursive: true, force: true })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'delete failed' })
  }
})

// DELETE /api/projects/:project/requirements/:requirement — 删除需求（含资源）
projectsRouter.delete('/:project/requirements/:requirement', async (req, res) => {
  const dir = path.join(VAULT_ROOT, req.params.project, req.params.requirement)
  try {
    await fs.rm(dir, { recursive: true, force: true })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'delete failed' })
  }
})
