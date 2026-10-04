export type Usage = {
  usd: number
  ctxPercent: number | null
  ctxTokens: number | null
  window: number
  limits: { kind: string; percentUsed: number }[]
}

export type Git = {
  branch: string
  ahead: number
  behind: number
  staged: number
  unstaged: number
  untracked: number
  last: string
}

export type Pr = {
  number: number
  base: string
  isDraft: boolean
  pass: number
  fail: number
  pending: number
  unresolved: number
  hasCodex: boolean
}

export type AgentRow = {
  id: string
  description: string
  type: string
  model: string
  startedAt: number
  status: string
  tools: number
}

declare module 'claude-code' {
  interface PluginState {
    devhud: {
      usage: Usage | null
      git: Git | null
      pr: Pr | null
      agents: AgentRow[]
      now: number
    }
  }
}
