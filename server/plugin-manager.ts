import { promises as fs } from 'fs'
import path from 'path'

export interface GateContext {
  project: string
  phase: string
  artifact: string
  artifactContent: string
}

export interface GateResult {
  result: 'APPROVED' | 'REJECTED'
  feedback?: string
}

export interface PluginMeta {
  name: string
  description?: string
  builtin: boolean
  enabled: boolean
  projects: string[] // empty = all projects
}

interface GatePlugin {
  name: string
  onGate(ctx: GateContext): Promise<GateResult | null>
}

const PLUGINS_DIR = path.join(__dirname, '..', 'plugins')
const CONFIG_FILE = path.join(PLUGINS_DIR, '.plugins-config.json')

// In-memory plugin config
let pluginConfigs: Record<string, { enabled: boolean; projects: string[] }> = {}

async function ensurePluginsDir() {
  await fs.mkdir(PLUGINS_DIR, { recursive: true })
}

async function loadConfig() {
  try {
    const raw = await fs.readFile(CONFIG_FILE, 'utf-8')
    pluginConfigs = JSON.parse(raw)
  } catch {
    pluginConfigs = {}
  }
}

async function saveConfig() {
  await ensurePluginsDir()
  await fs.writeFile(CONFIG_FILE, JSON.stringify(pluginConfigs, null, 2))
}

export async function listPlugins(): Promise<PluginMeta[]> {
  await ensurePluginsDir()
  await loadConfig()
  const entries = await fs.readdir(PLUGINS_DIR, { withFileTypes: true })
  const plugins: PluginMeta[] = []

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue
    const metaPath = path.join(PLUGINS_DIR, entry.name, 'plugin.json')
    try {
      const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'))
      const cfg = pluginConfigs[entry.name] || { enabled: true, projects: [] }
      plugins.push({
        name: meta.name || entry.name,
        description: meta.description || '',
        builtin: !!meta.builtin,
        enabled: cfg.enabled !== false,
        projects: cfg.projects || []
      })
    } catch {
      // skip invalid plugins
    }
  }
  return plugins
}

export async function setPluginEnabled(name: string, enabled: boolean) {
  await loadConfig()
  if (!pluginConfigs[name]) pluginConfigs[name] = { enabled: true, projects: [] }
  pluginConfigs[name].enabled = enabled
  await saveConfig()
}

export async function setPluginProjects(name: string, projects: string[]) {
  await loadConfig()
  if (!pluginConfigs[name]) pluginConfigs[name] = { enabled: true, projects: [] }
  pluginConfigs[name].projects = projects
  await saveConfig()
}

export async function deletePlugin(name: string): Promise<boolean> {
  const metaPath = path.join(PLUGINS_DIR, name, 'plugin.json')
  try {
    const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'))
    if (meta.builtin) return false
  } catch {
    return false
  }
  await fs.rm(path.join(PLUGINS_DIR, name), { recursive: true })
  await loadConfig()
  delete pluginConfigs[name]
  await saveConfig()
  return true
}

export async function runGatePlugins(ctx: GateContext): Promise<GateResult> {
  await loadConfig()
  await ensurePluginsDir()

  let entries: { name: string; isDirectory(): boolean }[]
  try {
    entries = await fs.readdir(PLUGINS_DIR, { withFileTypes: true })
  } catch {
    return { result: 'APPROVED' }
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue
    const cfg = pluginConfigs[entry.name] || { enabled: true, projects: [] }
    if (!cfg.enabled) continue
    if (cfg.projects.length > 0 && !cfg.projects.includes(ctx.project)) continue

    try {
      const pluginPath = path.join(PLUGINS_DIR, entry.name, 'index.js')
      await fs.access(pluginPath)
      // Clear require cache for hot-reload
      delete require.cache[require.resolve(pluginPath)]
      const plugin: GatePlugin = require(pluginPath)
      const result = await plugin.onGate(ctx)
      if (result) return result
    } catch {
      // skip broken plugins
    }
  }

  return { result: 'APPROVED' }
}

export function getPluginsDir() {
  return PLUGINS_DIR
}
