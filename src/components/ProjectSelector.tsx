import { useState, useEffect, useRef } from 'react'
import { App, Modal, Input } from 'antd'
import { FolderOutlined, CloudOutlined, PlusOutlined, LinkOutlined } from '@ant-design/icons'
import type { Project } from '../types'

interface Props {
  selected: Project | null
  onSelect: (project: Project) => void
  dataVersion?: number
  bumpData?: () => void
}

// 调后端拉起系统原生目录对话框；用户取消返回 null
async function pickDirectory(): Promise<{ path: string; name: string } | null> {
  const res = await fetch('/api/projects/pick-directory', { method: 'POST' })
  if (res.status === 204) return null // 用户取消
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || '选择目录失败')
  }
  return res.json()
}

export default function ProjectSelector({ selected, onSelect, dataVersion, bumpData }: Props) {
  const { message } = App.useApp()
  const [open, setOpen] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [search, setSearch] = useState('')
  const [showJoin, setShowJoin] = useState(false)
  const [joinId, setJoinId] = useState('')
  const [picking, setPicking] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(setProjects)
  }, [dataVersion])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  const handleSelect = (p: Project) => {
    onSelect(p)
    setOpen(false)
  }

  // 创建项目并选中（local / cloud 共用）
  const createProject = async (name: string, config: Project['config']) => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, config })
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || '创建失败')
    }
    return res.json() as Promise<Project>
  }

  // 添加本地项目：选目录 → 创建
  const addLocalProject = async () => {
    if (picking) return
    setPicking(true)
    try {
      const picked = await pickDirectory()
      if (!picked) return // 用户取消，静默
      const project = await createProject(picked.name, { type: 'local', localPath: picked.path })
      onSelect(project)
      bumpData?.()
      setOpen(false)
    } catch (e: any) {
      message.error(e?.message || '操作失败')
    } finally {
      setPicking(false)
    }
  }

  // 添加云端项目：选目录 → 创建本地项目记录 → 注册到云端
  const addCloudProject = async () => {
    if (picking) return
    setPicking(true)
    try {
      const picked = await pickDirectory()
      if (!picked) return
      const projectId = crypto.randomUUID()
      const config = {
        type: 'cloud' as const,
        projectId,
        localPath: picked.path,
        creatorId: 'local-user'
      }
      const project = await createProject(picked.name, config)
      // 云端特有：注册到云服务（失败不阻塞本地创建）
      fetch('/api/cloud/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, name: picked.name, creatorId: 'local-user' })
      }).catch(() => {})
      onSelect(project)
      bumpData?.()
      setOpen(false)
    } catch (e: any) {
      message.error(e?.message || '操作失败')
    } finally {
      setPicking(false)
    }
  }

  // 通过 ID 加入云项目：取云端项目元信息 → 选本地目录 → 创建本地关联
  const joinProject = async () => {
    const id = joinId.trim()
    if (!id) return
    if (picking) return
    let cloudProject: { name: string; projectId: string; creatorId?: string }
    try {
      const res = await fetch('/api/cloud/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: id })
      })
      if (!res.ok) throw new Error('not found')
      const data = await res.json()
      cloudProject = data.project
    } catch {
      return message.error('项目未找到，请检查 ID')
    }

    // 关闭加入弹窗，开始选择本地目录
    setShowJoin(false)
    setPicking(true)
    try {
      message.info('请选择本地目录以关联此云项目')
      const picked = await pickDirectory()
      if (!picked) return // 用户取消
      const config = {
        type: 'cloud' as const,
        projectId: cloudProject.projectId || id,
        localPath: picked.path,
        creatorId: cloudProject.creatorId || 'local-user'
      }
      // 加入流程使用云端项目名（非本地目录名），保持与云端一致
      const project = await createProject(cloudProject.name, config)
      onSelect(project)
      bumpData?.()
      setJoinId('')
      setOpen(false)
    } catch (e: any) {
      message.error(e?.message || '加入失败')
    } finally {
      setPicking(false)
    }
  }

  return (
    <div className="selector-wrapper" ref={ref}>
      <button className="selector-trigger" onClick={() => setOpen(!open)}>
        <FolderOutlined />
        <span className="selector-trigger-text" title={selected?.name || ''}>
          {selected ? selected.name : '选择项目'}
        </span>
        <span className="selector-trigger-arrow">▾</span>
      </button>

      {open && (
        <div className="selector-dropdown">
          <input
            className="selector-search"
            placeholder="搜索项目"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          <div className="selector-list">
            {filtered.map(p => (
              <div key={p.name} className="selector-item" onClick={() => handleSelect(p)} title={p.name}>
                {p.config.type === 'cloud' ? <CloudOutlined /> : <FolderOutlined />}
                <span className="selector-item-text">{p.name}</span>
              </div>
            ))}
          </div>
          <div className="selector-footer">
            <div className="selector-item add" onClick={addLocalProject}>
              <PlusOutlined /> 添加本地项目
            </div>
            <div className="selector-item add" onClick={addCloudProject}>
              <CloudOutlined /> 添加云端项目
            </div>
            <div className="selector-item add" onClick={() => { setJoinId(''); setShowJoin(true) }}>
              <LinkOutlined /> 通过ID加入项目
            </div>
          </div>
        </div>
      )}

      <Modal
        title="通过 ID 加入项目"
        open={showJoin}
        onCancel={() => { setShowJoin(false); setJoinId('') }}
        onOk={joinProject}
        okText="加入"
        cancelText="取消"
        okButtonProps={{ disabled: !joinId.trim() }}
        destroyOnClose
      >
        <Input
          autoFocus
          placeholder="输入 PROJECT_ID"
          value={joinId}
          onChange={e => setJoinId(e.target.value)}
          onPressEnter={joinProject}
        />
      </Modal>

      {picking && <div className="picker-mask" />}
    </div>
  )
}
