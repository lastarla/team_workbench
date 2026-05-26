import { useEffect, useRef, useState } from 'react'
import { Dropdown, App } from 'antd'
import { CodeOutlined, FolderOpenOutlined, DownOutlined } from '@ant-design/icons'
import type { Requirement, Project, Story } from '../types'
import { wsClient } from '../services/websocket'
import ProjectSelector from './ProjectSelector'
import StorySelector from './StorySelector'
import '@xterm/xterm/css/xterm.css'
import './ChatPanel.css'

interface Props {
  activeReq: Requirement | null
  preselectedProject?: Project | null
  preselectedStory?: Story | null
  dataVersion?: number
  bumpData?: () => void
  resetKey?: number
}

export default function ChatPanel({ activeReq, preselectedProject, preselectedStory, dataVersion, bumpData, resetKey }: Props) {
  const { message } = App.useApp()
  const [selectedProject, setSelectedProject] = useState<Project | null>(preselectedProject || null)
  const [selectedStory, setSelectedStory] = useState<Story | null>(preselectedStory || null)
  const termRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<any>(null)

  // 同步外部 preselected 到本地状态(包括清空)
  useEffect(() => {
    setSelectedProject(preselectedProject || null)
  }, [preselectedProject])
  useEffect(() => {
    setSelectedStory(preselectedStory || null)
  }, [preselectedStory])

  // resetKey 变化(点击"新对话")时强制清空本地选择,即使 preselected 一直为 null
  useEffect(() => {
    if (resetKey === undefined || resetKey === 0) return
    setSelectedProject(null)
    setSelectedStory(null)
  }, [resetKey])

  const hasSession = !!(activeReq || (selectedProject && selectedStory))

  useEffect(() => {
    const sessionProject = activeReq?.project || selectedProject?.name
    const sessionStory = activeReq?.name || selectedStory?.name
    if (!sessionProject || !sessionStory) return

    const sessionId = `${sessionProject}/${sessionStory}`
    wsClient.connect(sessionId)

    let cancelled = false
    let xterm: any
    let fitAddon: any
    let resizeObserver: ResizeObserver | null = null
    const pending: string[] = [] // xterm 就绪前到达的输出缓存

    const initTerminal = async () => {
      const { Terminal } = await import('@xterm/xterm')
      const { FitAddon } = await import('@xterm/addon-fit')
      // StrictMode 下首次 mount 会立刻被 unmount —— 此时若不取消，会创建第二个 xterm，
      // 导致两个 onData 监听都向同一个 ws 发输入（即"输入重复 / 连键"）
      if (cancelled) return

      xterm = new Terminal({
        fontSize: 13,
        fontFamily: 'Menlo, monospace',
        cursorBlink: true,
        theme: { background: '#ffffff', foreground: '#1e1e1e', cursor: '#1e1e1e', selectionBackground: '#d0d0d0' }
      })
      fitAddon = new FitAddon()
      xterm.loadAddon(fitAddon)

      if (termRef.current) {
        termRef.current.innerHTML = ''
        xterm.open(termRef.current)
        fitAddon.fit()
        xterm.focus()
      }

      xterm.onData((data: string) => {
        wsClient.send({ type: 'input', data })
      })

      xterm.onResize(({ cols, rows }: { cols: number; rows: number }) => {
        wsClient.send({ type: 'resize', cols, rows })
      })

      if (termRef.current) {
        resizeObserver = new ResizeObserver(() => { fitAddon?.fit() })
        resizeObserver.observe(termRef.current)
      }

      xtermRef.current = xterm

      // flush 在 xterm 就绪前到达的输出（解决"首次进入看不到 prompt"）
      if (pending.length) {
        for (const d of pending) xterm.write(d)
        pending.length = 0
      }
    }

    initTerminal()

    const unsub = wsClient.onMessage((msg) => {
      if (msg.type !== 'output') return
      if (xterm) xterm.write(msg.data)
      else pending.push(msg.data)
    })

    return () => {
      cancelled = true
      unsub()
      resizeObserver?.disconnect()
      xterm?.dispose()
      wsClient.disconnect()
    }
  }, [activeReq, selectedProject, selectedStory])

  // 新对话页：只显示提示 + 选择器，无输入框无消息列表
  if (!hasSession) {
    return (
      <div className="main">
        <div className="welcome">
          <h1>我们该做什么？</h1>
          <div className="selectors-row">
            <ProjectSelector
              selected={selectedProject}
              onSelect={setSelectedProject}
              dataVersion={dataVersion}
              bumpData={bumpData}
            />
            {selectedProject && (
              <StorySelector
                project={selectedProject}
                selected={selectedStory}
                onSelect={setSelectedStory}
                dataVersion={dataVersion}
                bumpData={bumpData}
              />
            )}
          </div>
        </div>
      </div>
    )
  }

  // 选好需求后：显示终端
  const title = activeReq?.name || selectedStory?.name || ''
  const projectName = activeReq?.project || selectedProject?.name || ''

  const openWith = async (tool: string) => {
    try {
      const res = await fetch(`/api/projects/${projectName}/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        message.error(data.error || `打开失败 (${res.status})`)
      }
    } catch (e: any) {
      message.error(e?.message || '打开失败')
    }
  }

  const openMenuItems = [
    { key: 'vscode', icon: <CodeOutlined />, label: 'VS Code', onClick: () => openWith('vscode') },
    { key: 'cursor', icon: <CodeOutlined />, label: 'Cursor', onClick: () => openWith('cursor') },
    { key: 'finder', icon: <FolderOpenOutlined />, label: 'Finder', onClick: () => openWith('finder') },
  ]

  return (
    <div className="main">
      <div className="chat-header">
        <span>{title}</span>
        <Dropdown menu={{ items: openMenuItems }} trigger={['click']}>
          <span className="open-in-btn"><FolderOpenOutlined /> 打开 <DownOutlined style={{ fontSize: 10 }} /></span>
        </Dropdown>
      </div>
      <div className="terminal-container" ref={termRef} onClick={() => xtermRef.current?.focus()} />
    </div>
  )
}
