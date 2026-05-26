export interface ProjectConfig {
  localPath?: string
  type: 'local' | 'cloud'
  projectId?: string       // UUID, 云端项目必有
  creatorId?: string       // 本机用户标识
  cloudServerUrl?: string  // 云端项目才有
}

export interface StoryConfig {
  storyId: string          // 格式: {PROJECT_ID}__{STORY_ID}
  name: string
  createdAt: string        // ISO timestamp
}

export interface Project {
  name: string
  config: ProjectConfig
}

export interface Story {
  name: string
  config: StoryConfig
}

export interface Requirement {
  project: string
  name: string
}
