import { useState, useEffect } from 'react'
import { Modal, Input, Typography, message } from 'antd'

interface Props {
  project: string
  onClose: () => void
}

export default function ProjectSettings({ project, onClose }: Props) {
  const [localPath, setLocalPath] = useState('')

  useEffect(() => {
    fetch(`/api/projects/${project}/config`).then(r => r.json()).then(c => {
      if (c.localPath) setLocalPath(c.localPath)
    })
  }, [project])

  const save = async () => {
    const res = await fetch(`/api/projects/${project}/local-path`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ localPath })
    })
    if (res.ok) {
      message.success('已保存')
      onClose()
    } else {
      const data = await res.json()
      message.error(data.error || '保存失败')
    }
  }

  return (
    <Modal title={`项目设置 — ${project}`} open onCancel={onClose} onOk={save} okText="保存" cancelText="取消">
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>关联本地目录</Typography.Text>
      <Typography.Paragraph type="secondary" style={{ fontSize: 12, margin: '4px 0 8px' }}>
        指定项目代码所在的本地目录，Claude 将在此目录中读写代码
      </Typography.Paragraph>
      <Input placeholder="/path/to/your/project" value={localPath} onChange={e => setLocalPath(e.target.value)} />
    </Modal>
  )
}
