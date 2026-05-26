import { useState, useEffect } from 'react'
import { App } from 'antd'
import type { Requirement, Project, Story } from '../types'
import { EditOutlined, AppstoreOutlined, FolderOutlined, CloudOutlined, FileTextOutlined, DeleteOutlined } from '@ant-design/icons'
import Materials from './Materials'
import './Sidebar.css'

interface Props {
  activeReq: Requirement | null
  onSelectReq: (req: Requirement) => void
  onNavigate?: (page: string) => void
  onEditProject?: (project: Project) => void
  onSelectStory?: (project: Project, story: Story) => void
  onStoryDeleted?: (project: Project, storyName: string) => void
  dataVersion?: number
  bumpData?: () => void
}

export default function Sidebar({ activeReq, onSelectReq, onNavigate, onEditProject, onSelectStory, onStoryDeleted, dataVersion, bumpData }: Props) {
  const { modal } = App.useApp()
  const [projects, setProjects] = useState<Project[]>([])
  const [expanded, setExpanded] = useState<Record<string, Story[]>>({})

  useEffect(() => {
    let cancelled = false
    fetch('/api/projects').then(r => r.json()).then(list => {
      if (cancelled) return
      setProjects(list)
      // 同步刷新已展开项目的需求列表
      setExpanded(prev => {
        const projectNames = new Set(list.map((p: Project) => p.name))
        const next: Record<string, Story[]> = {}
        Object.keys(prev).forEach(name => {
          if (projectNames.has(name)) next[name] = prev[name]
        })
        return next
      })
    })
    return () => { cancelled = true }
  }, [dataVersion])

  // 当 dataVersion 变化时,重新加载已展开项目的需求列表
  useEffect(() => {
    Object.keys(expanded).forEach(async (name) => {
      const stories = await fetch(`/api/projects/${name}/requirements`).then(r => r.json())
      setExpanded(prev => prev[name] !== undefined ? { ...prev, [name]: stories } : prev)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVersion])

  const toggleProject = async (project: string) => {
    if (expanded[project]) {
      const next = { ...expanded }
      delete next[project]
      setExpanded(next)
    } else {
      const stories = await fetch(`/api/projects/${project}/requirements`).then(r => r.json())
      setExpanded({ ...expanded, [project]: stories })
    }
  }

  const deleteProject = (e: React.MouseEvent, name: string) => {
    e.stopPropagation()
    modal.confirm({
      title: '删除项目',
      content: `确定删除项目 "${name}" 及其所有需求和资源？`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        await fetch(`/api/projects/${name}`, { method: 'DELETE' })
        bumpData?.()
      }
    })
  }

  const deleteStory = (e: React.MouseEvent, project: Project, storyName: string) => {
    e.stopPropagation()
    modal.confirm({
      title: '删除需求',
      content: `确定删除需求 "${storyName}" 及其所有资源？`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        await fetch(`/api/projects/${project.name}/requirements/${storyName}`, { method: 'DELETE' })
        onStoryDeleted?.(project, storyName)
        bumpData?.()
      }
    })
  }

  return (
    <div className="sidebar">
      <div className="sidebar-nav">
        <button className="nav-item" onClick={() => onNavigate?.('chat')}><EditOutlined /> 新对话</button>
        <button className="nav-item" onClick={() => onNavigate?.('plugins')}><AppstoreOutlined /> 插件</button>
      </div>

      <div className="sidebar-section">
        <div className="section-header">
          <span>项目</span>
        </div>
        {projects.map(p => (
          <div key={p.name}>
            <div className="project-item" onClick={() => toggleProject(p.name)}>
              <span className="item-label">
                {p.config.type === 'cloud' ? <CloudOutlined /> : <FolderOutlined />}
                <span className="item-name" title={p.name}>{p.name}</span>
              </span>
              <span className="project-actions">
                <EditOutlined onClick={e => { e.stopPropagation(); onEditProject?.(p) }} />
                <DeleteOutlined onClick={e => deleteProject(e, p.name)} />
              </span>
            </div>
            {expanded[p.name]?.map(s => (
              <div
                key={s.name}
                className={`req-item ${activeReq?.project === p.name && activeReq?.name === s.name ? 'active' : ''}`}
                onClick={() => onSelectStory?.(p, s)}
              >
                <FileTextOutlined />
                <span className="item-name" title={s.name}>{s.name}</span>
                <DeleteOutlined className="delete-icon" onClick={e => deleteStory(e, p, s.name)} />
              </div>
            ))}
          </div>
        ))}
      </div>

      {activeReq && <Materials activeReq={activeReq} />}
    </div>
  )
}
