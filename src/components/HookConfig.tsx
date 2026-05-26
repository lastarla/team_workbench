import { useState, useEffect } from 'react'
import { Modal, Switch, Button, Typography, Space } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'

interface PhaseConfig {
  review_gate: { enabled: boolean }
  post_hooks: { type: string; destination: Record<string, string> }[]
}

interface Config {
  phases: Record<string, PhaseConfig>
}

const PHASES = ['phase_1', 'phase_2', 'phase_3', 'phase_4', 'phase_5']
const PHASE_NAMES: Record<string, string> = {
  phase_1: 'SPEC 规约', phase_2: 'VALIDATION 合约', phase_3: 'TASKS 分解',
  phase_4: '代码生成', phase_5: '里程碑验证'
}

export default function HookConfig({ onClose }: { onClose: () => void }) {
  const [config, setConfig] = useState<Config>({ phases: {} })

  useEffect(() => {
    fetch('/api/hook-config').then(r => r.json()).then(setConfig).catch(() => {})
  }, [])

  const toggleGate = (phase: string) => {
    setConfig(prev => {
      const phases = { ...prev.phases }
      const p = phases[phase] || { review_gate: { enabled: false }, post_hooks: [] }
      phases[phase] = { ...p, review_gate: { enabled: !p.review_gate.enabled } }
      return { phases }
    })
  }

  const addHook = (phase: string) => {
    setConfig(prev => {
      const phases = { ...prev.phases }
      const p = phases[phase] || { review_gate: { enabled: false }, post_hooks: [] }
      phases[phase] = { ...p, post_hooks: [...p.post_hooks, { type: 'slack', destination: { webhook_url: '' } }] }
      return { phases }
    })
  }

  const removeHook = (phase: string, idx: number) => {
    setConfig(prev => {
      const phases = { ...prev.phases }
      const p = phases[phase]
      if (p) p.post_hooks = p.post_hooks.filter((_, i) => i !== idx)
      return { phases }
    })
  }

  const save = async () => {
    await fetch('/api/hook-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    })
    onClose()
  }

  return (
    <Modal title="Pipeline Hook 配置" open onCancel={onClose} onOk={save} okText="保存配置" cancelText="取消" width={480}>
      <Space direction="vertical" style={{ width: '100%' }} size={16}>
        {PHASES.map(phase => {
          const pc = config.phases[phase] || { review_gate: { enabled: false }, post_hooks: [] }
          return (
            <div key={phase}>
              <Typography.Text strong>{PHASE_NAMES[phase]}</Typography.Text>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Switch size="small" checked={pc.review_gate.enabled} onChange={() => toggleGate(phase)} />
                <Typography.Text style={{ fontSize: 12 }}>人工审核门控</Typography.Text>
              </div>
              {pc.post_hooks.map((hook, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>{hook.type}</Typography.Text>
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => removeHook(phase, i)} />
                </div>
              ))}
              <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => addHook(phase)} style={{ padding: 0, marginTop: 4 }}>
                添加转发
              </Button>
            </div>
          )
        })}
      </Space>
    </Modal>
  )
}
