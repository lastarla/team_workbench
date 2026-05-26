import { useState, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import ChatPanel from './components/ChatPanel'
import ToolPanel from './components/ToolPanel'
import PluginManager from './components/PluginManager'
import type { Requirement, Project, Story } from './types'

export type { Requirement }

export default function App() {
  const [activeReq, setActiveReq] = useState<Requirement | null>(null)
  const [page, setPage] = useState<string>('chat')
  const [preselectedProject, setPreselectedProject] = useState<Project | null>(null)
  const [preselectedStory, setPreselectedStory] = useState<Story | null>(null)
  const [dataVersion, setDataVersion] = useState(0)
  const [chatResetKey, setChatResetKey] = useState(0)

  const bumpData = useCallback(() => setDataVersion(v => v + 1), [])

  const handleSelectReq = (req: Requirement) => {
    setActiveReq(req)
    setPreselectedProject(null)
    setPreselectedStory(null)
    setPage('chat')
  }

  const handleEditProject = (project: Project) => {
    setActiveReq(null)
    setPreselectedProject(project)
    setPreselectedStory(null)
    setPage('chat')
  }

  const handleSelectStory = (project: Project, story: Story) => {
    setActiveReq(null)
    setPreselectedProject(project)
    setPreselectedStory(story)
    setPage('chat')
  }

  const handleNewChat = () => {
    setActiveReq(null)
    setPreselectedProject(null)
    setPreselectedStory(null)
    setChatResetKey(k => k + 1)
    setPage('chat')
  }

  const handleNavigate = (target: string) => {
    if (target === 'chat') handleNewChat()
    else setPage(target)
  }

  return (
    <div className="layout">
      <Sidebar
        activeReq={activeReq}
        onSelectReq={handleSelectReq}
        onNavigate={handleNavigate}
        onEditProject={handleEditProject}
        onSelectStory={handleSelectStory}
        dataVersion={dataVersion}
        bumpData={bumpData}
      />
      {page === 'plugins' ? (
        <div className="main-content"><PluginManager /></div>
      ) : (
        <>
          <ChatPanel
            activeReq={activeReq}
            preselectedProject={preselectedProject}
            preselectedStory={preselectedStory}
            dataVersion={dataVersion}
            bumpData={bumpData}
            resetKey={chatResetKey}
          />
          <ToolPanel activeReq={activeReq} />
        </>
      )}
    </div>
  )
}
