import { useState, useEffect } from 'react'
import { Card, Switch, Button, Modal, Input, Select, Tag, Typography, Space, Row, Col, Empty } from 'antd'
import { ApiOutlined, ReloadOutlined, PlusOutlined, SettingOutlined, DeleteOutlined } from '@ant-design/icons'
import type { Project } from '../types'
import './PluginManager.css'

interface PluginMeta {
  name: string
  description?: string
  builtin: boolean
  enabled: boolean
  projects: string[]
}

interface PluginForm {
  name: string
  description: string
  code: string
  projects: string[]
}

const emptyForm: PluginForm = { name: '', description: '', code: '', projects: [] }

export default function PluginManager() {
  const [plugins, setPlugins] = useState<PluginMeta[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPlugin, setEditingPlugin] = useState<string | null>(null) // null = 添加模式
  const [form, setForm] = useState<PluginForm>(emptyForm)

  const load = () => {
    fetch('/api/plugins').then(r => r.json()).then(setPlugins)
    fetch('/api/projects').then(r => r.json()).then(setProjects)
  }

  useEffect(load, [])

  const toggleEnabled = async (name: string, enabled: boolean) => {
    await fetch(`/api/plugins/${name}/enabled`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    })
    load()
  }

  const handleDelete = (name: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定删除插件 "${name}"？此操作不可恢复。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        const res = await fetch(`/api/plugins/${name}`, { method: 'DELETE' })
        if (res.ok) load()
      }
    })
  }

  const openAdd = () => {
    setEditingPlugin(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (p: PluginMeta) => {
    setEditingPlugin(p.name)
    setForm({ name: p.name, description: p.description || '', code: '', projects: p.projects })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (editingPlugin) {
      // 编辑模式：保存描述和项目配置
      await fetch(`/api/plugins/${editingPlugin}/projects`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projects: form.projects })
      })
    } else {
      // 添加模式
      if (!form.name.trim() || !form.code.trim()) return
      await fetch('/api/plugins/upload', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, description: form.description, code: form.code, projects: form.projects })
      })
    }
    setModalOpen(false)
    load()
  }

  const addProject = (value: string) => {
    if (value && !form.projects.includes(value)) {
      setForm({ ...form, projects: [...form.projects, value] })
    }
  }

  const removeProject = (p: string) => {
    setForm({ ...form, projects: form.projects.filter(x => x !== p) })
  }

  return (
    <div className="plugin-page">
      <div className="plugin-header">
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>插件</Typography.Title>
          <Typography.Text type="secondary">扩展工作台能力，自定义 Gate 审核流程</Typography.Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>新插件</Button>
        </Space>
      </div>

      <Typography.Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>已安装</Typography.Text>

      <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
        {plugins.map(p => (
          <Col key={p.name} xs={24} md={12}>
            <Card size="small" className={!p.enabled ? 'plugin-card-disabled' : ''}>
              <div className="plugin-card-content">
                <div className="plugin-card-icon-wrap">
                  <ApiOutlined style={{ fontSize: 20 }} />
                </div>
                <div className="plugin-card-body">
                  <Space size={4}>
                    <Typography.Text strong>{p.name}</Typography.Text>
                    {p.builtin && <Tag color="default" style={{ fontSize: 10 }}>内置</Tag>}
                  </Space>
                  <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                    {p.description || '无描述'}
                  </Typography.Text>
                </div>
                <Space size={4}>
                  <Switch size="small" checked={p.enabled} onChange={v => toggleEnabled(p.name, v)} />
                  <Button type="text" size="small" icon={<SettingOutlined />} onClick={() => openEdit(p)} />
                  {!p.builtin && (
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(p.name)} />
                  )}
                </Space>
              </div>
            </Card>
          </Col>
        ))}
        {plugins.length === 0 && (
          <Col span={24}><Empty description="暂无插件" /></Col>
        )}
      </Row>

      <Modal
        title={editingPlugin ? `编辑插件 — ${editingPlugin}` : '添加插件'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        okText={editingPlugin ? '保存' : '添加'}
        cancelText="取消"
        okButtonProps={{ disabled: !editingPlugin && (!form.name.trim() || !form.code.trim()) }}
        width={560}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>名称</Typography.Text>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="my-plugin" disabled={!!editingPlugin} />
          </div>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>描述</Typography.Text>
            <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="插件功能描述" />
          </div>
          {!editingPlugin && (
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>代码 (index.js)</Typography.Text>
              <Input.TextArea value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} rows={8} placeholder={`module.exports = {\n  name: 'my-plugin',\n  async onGate(ctx) {\n    return null\n  }\n}`} style={{ fontFamily: 'monospace', fontSize: 12 }} />
            </div>
          )}
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>适用项目（留空 = 全部项目，配置仅本地生效）</Typography.Text>
            <div style={{ margin: '8px 0' }}>
              {form.projects.length === 0 && <Tag>全部项目</Tag>}
              {form.projects.map(p => (
                <Tag key={p} closable onClose={() => removeProject(p)}>{p}</Tag>
              ))}
            </div>
            <Select
              style={{ width: '100%' }}
              placeholder="选择项目添加"
              value={undefined}
              onChange={addProject}
              options={projects.filter(p => !form.projects.includes(p.name)).map(p => ({ label: `${p.config.type === 'cloud' ? '☁️' : '📁'} ${p.name}`, value: p.name }))}
            />
          </div>
        </Space>
      </Modal>
    </div>
  )
}
