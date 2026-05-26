import { useState } from 'react'
import { Input, Button, Typography, Card, Tabs } from 'antd'
import { GlobalOutlined } from '@ant-design/icons'
import type { Requirement } from '../types'
import './ToolPanel.css'

interface Props {
  activeReq: Requirement | null
}

interface BrowserTab {
  key: string
  label: string
  url: string
}

const BROWSER_TAB_LABEL = '浏览器'

export default function ToolPanel({ activeReq: _activeReq }: Props) {
  const [tabs, setTabs] = useState<BrowserTab[]>([])
  const [activeKey, setActiveKey] = useState<string | undefined>(undefined)
  const [urlInput, setUrlInput] = useState('')

  const addBrowserTab = () => {
    const key = Date.now().toString()
    const newTab: BrowserTab = { key, label: BROWSER_TAB_LABEL, url: '' }
    setTabs([...tabs, newTab])
    setActiveKey(key)
  }

  const openUrl = (key: string) => {
    if (!urlInput.trim()) return
    let url = urlInput.trim()
    if (!url.startsWith('http')) url = 'https://' + url
    setTabs(tabs.map(t => t.key === key ? { ...t, url } : t))
    setUrlInput('')
  }

  const removeTab = (targetKey: string) => {
    const newTabs = tabs.filter(t => t.key !== targetKey)
    setTabs(newTabs)
    if (activeKey === targetKey) {
      setActiveKey(newTabs.length > 0 ? newTabs[newTabs.length - 1].key : undefined)
    }
  }

  // 无标签时显示功能卡片
  if (tabs.length === 0 || !activeKey) {
    return (
      <div className="panel">
        <div className="tool-grid">
          <Card size="small" hoverable className="tool-card" onClick={addBrowserTab}>
            <div className="tool-card-inner">
              <GlobalOutlined style={{ fontSize: 24 }} />
              <Typography.Text strong>浏览器</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>打开网站</Typography.Text>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  const activeTab = tabs.find(t => t.key === activeKey)

  return (
    <div className="panel panel-tabs">
      <Tabs
        type="editable-card"
        activeKey={activeKey}
        onChange={setActiveKey}
        onEdit={(targetKey, action) => {
          if (action === 'add') addBrowserTab()
          if (action === 'remove') removeTab(targetKey as string)
        }}
        size="small"
        className="browser-tabs"
        items={tabs.map(t => ({
          key: t.key,
          label: t.label,
          closable: true,
        }))}
      />
      <div className="tab-content">
        {activeTab && !activeTab.url ? (
          <div className="browser-input-area">
            <Input
              placeholder="输入网址，回车打开"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onPressEnter={() => openUrl(activeKey!)}
              autoFocus
            />
            <Button onClick={() => openUrl(activeKey!)} className="browser-open-btn">打开</Button>
          </div>
        ) : activeTab?.url ? (
          <iframe src={activeTab.url} className="iframe-content" title={activeTab.label} sandbox="allow-same-origin allow-scripts allow-forms allow-popups" />
        ) : null}
      </div>
    </div>
  )
}
