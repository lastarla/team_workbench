import { promises as fs } from 'fs'
import path from 'path'

export interface PhaseState {
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  artifact?: string
  summary?: Record<string, any>
  gate?: { reviewed_at?: string; result: string }
  completed_at?: string
}

export interface PipelineState {
  pipeline: string
  project: string
  requirement: string
  started_at: string
  updated_at: string
  current_phase: string
  phases: Record<string, PhaseState>
  verdict: any | null
}

const PHASES = ['phase_0', 'phase_1', 'phase_2', 'phase_3', 'phase_4', 'phase_5', 'phase_6', 'phase_7']

export function createInitialState(project: string, requirement: string): PipelineState {
  const now = new Date().toISOString()
  const phases: Record<string, PhaseState> = {}
  PHASES.forEach(p => { phases[p] = { status: 'pending' } })
  return { pipeline: 'prd-pipeline', project, requirement, started_at: now, updated_at: now, current_phase: 'phase_0', phases, verdict: null }
}

export async function writePipelineState(stateDir: string, state: PipelineState) {
  state.updated_at = new Date().toISOString()
  await fs.mkdir(stateDir, { recursive: true })
  await fs.writeFile(path.join(stateDir, 'PIPELINE_STATE.json'), JSON.stringify(state, null, 2))
}

export function advancePhase(state: PipelineState, phase: string, update: Partial<PhaseState>): PipelineState {
  state.phases[phase] = { ...state.phases[phase], ...update }
  if (update.status === 'in_progress') state.current_phase = phase
  return state
}
