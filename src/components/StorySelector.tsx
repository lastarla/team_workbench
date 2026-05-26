import { useState, useEffect, useRef } from 'react'
import { Input, Modal } from 'antd'
import { FileTextOutlined, PlusOutlined } from '@ant-design/icons'
import type { Project, Story } from '../types'

interface Props {
  project: Project
  selected: Story | null
  onSelect: (story: Story) => void
  dataVersion?: number
  bumpData?: () => void
}

export default function StorySelector({ project, selected, onSelect, dataVersion, bumpData }: Props) {
  const [open, setOpen] = useState(false)
  const [stories, setStories] = useState<Story[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/projects/${project.name}/requirements`).then(r => r.json()).then(setStories)
  }, [project.name, dataVersion])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const addStory = async () => {
    if (!newName.trim()) return
    const projectId = project.config.projectId || project.name
    const storyId = `${projectId}__${crypto.randomUUID()}`
    const config = { storyId, name: newName, createdAt: new Date().toISOString() }
    const res = await fetch(`/api/projects/${project.name}/requirements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, config })
    })
    const story = await res.json()
    onSelect(story)
    bumpData?.()
    setNewName('')
    setShowAdd(false)
    setOpen(false)
  }

  return (
    <div className="selector-wrapper" ref={ref}>
      <button className="selector-trigger" onClick={() => setOpen(!open)}>
        <FileTextOutlined />
        <span className="selector-trigger-text" title={selected?.name || ''}>
          {selected ? selected.name : '选择需求'}
        </span>
        <span className="selector-trigger-arrow">▾</span>
      </button>
      {open && (
        <div className="selector-dropdown">
          <div className="selector-list">
            {stories.map(s => (
              <div key={s.name} className="selector-item" onClick={() => { onSelect(s); setOpen(false) }} title={s.name}>
                <FileTextOutlined />
                <span className="selector-item-text">{s.name}</span>
              </div>
            ))}
          </div>
          <div className="selector-footer">
            <div className="selector-item add" onClick={() => setShowAdd(true)}><PlusOutlined /> 添加新需求</div>
          </div>
        </div>
      )}
      <Modal
        title="添加新需求"
        open={showAdd}
        onCancel={() => setShowAdd(false)}
        onOk={addStory}
        okText="确定"
        cancelText="取消"
        okButtonProps={{ disabled: !newName.trim() }}
      >
        <Input autoFocus placeholder="需求名称" value={newName} onChange={e => setNewName(e.target.value)} onPressEnter={addStory} />
      </Modal>
    </div>
  )
}
