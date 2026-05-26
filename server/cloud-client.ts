/**
 * cloud-client.ts — 本地 server 调用云端 server 的代理模块
 */

const CLOUD_SERVER_URL = process.env.CLOUD_SERVER_URL || 'http://localhost:9528'

async function cloudFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${CLOUD_SERVER_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers }
  })
  if (!res.ok) throw new Error(`Cloud API error: ${res.status}`)
  return res.json()
}

export async function createCloudProject(projectId: string, name: string, creatorId: string) {
  return cloudFetch('/api/projects', {
    method: 'POST',
    body: JSON.stringify({ project_id: projectId, name, creator_id: creatorId })
  })
}

export async function createCloudStory(projectId: string, storyId: string, name: string) {
  return cloudFetch(`/api/projects/${projectId}/stories`, {
    method: 'POST',
    body: JSON.stringify({ story_id: storyId, name })
  })
}

export async function joinCloudProject(projectId: string) {
  return cloudFetch('/api/projects/join', {
    method: 'POST',
    body: JSON.stringify({ project_id: projectId })
  })
}

export async function getCloudProjectVersion(projectId: string) {
  return cloudFetch(`/api/projects/${projectId}/version`)
}

export async function getCloudStories(projectId: string) {
  return cloudFetch(`/api/projects/${projectId}/stories`)
}
