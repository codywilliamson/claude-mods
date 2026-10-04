import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionMeasureInput } from 'claude-code'

import type { AgentRow, Git, Pr, Usage } from '../types'
import { readGit } from './git'
import { readPr } from './pr'
import { THEME, levelColor } from './theme'

const PANE = 'devhud'
const TITLE = 'HUD'
const RING_SIZE = 72
const BAR_CELLS = 20
const MINI_BAR_CELLS = 10
const MAX_AGENT_ROWS = 4
const REPO_COMMAND = /\bgh pr\b|\bgit (push|commit|switch|checkout)\b/

const usage = atom({ plugin: 'devhud', key: 'usage' } as const, null)
const git = atom({ plugin: 'devhud', key: 'git' } as const, null)
const pr = atom({ plugin: 'devhud', key: 'pr' } as const, null)
const agents = atom({ plugin: 'devhud', key: 'agents' } as const, [])
const now = atom({ plugin: 'devhud', key: 'now' } as const, 0)

const toUsage = (e: SessionMeasureInput): Usage => ({
  usd: e.cost?.usd ?? 0,
  ctxPercent: e.context.percent ?? null,
  ctxTokens: e.context.tokens ?? null,
  window: e.context.window,
  limits: e.rateLimits.map(({ kind, percentUsed }) => ({ kind, percentUsed })),
})

const money = (usd: number) => `$${usd.toFixed(usd < 1 ? 3 : 2)}`
const kilo = (n: number) => `${Math.round(n / 1000)}k`
const dirty = (g: Git) => g.staged + g.unstaged + g.untracked > 0
const shortModel = (model: string) => model.replace(/^claude-/, '')
const isRunning = (a: AgentRow) => a.status === 'running'
const commandOf = (e: object) => ('command' in e && typeof e.command === 'string' ? e.command : '')

const elapsed = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000))
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${String(s % 60).padStart(2, '0')}s`
}

const statusText = (u: Usage | null, g: Git | null) =>
  [
    u && money(u.usd),
    u?.ctxPercent != null && `${u.ctxPercent}% ctx`,
    g && `${g.branch}${dirty(g) ? '*' : ''}`,
  ]
    .filter(Boolean)
    .join(' · ')

const ring = (percent: number) => {
  const r = 30
  const len = 2 * Math.PI * r
  const color = levelColor(percent)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${RING_SIZE}" height="${RING_SIZE}" viewBox="0 0 72 72">
<circle cx="36" cy="36" r="${r}" fill="none" stroke="${THEME.border}" stroke-width="7"/>
<circle cx="36" cy="36" r="${r}" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round"
 stroke-dasharray="${(len * percent) / 100} ${len}" transform="rotate(-90 36 36)"/>
<text x="36" y="41" text-anchor="middle" font-family="ui-monospace,monospace" font-size="15" font-weight="700" fill="${THEME.text}">${percent}%</text>
</svg>`
}

const bar = (percent: number, cells = BAR_CELLS) => {
  const filled = Math.round((percent / 100) * cells)
  return '█'.repeat(filled) + '░'.repeat(cells - filled)
}

const ciColor = (p: Pr) => (p.fail > 0 ? THEME.hot : p.pending > 0 ? THEME.warn : THEME.ok)

async function syncRepo($: EngineInterface) {
  const run = (argv: readonly string[]) => $.process.run(argv)
  const [g, p] = await Promise.all([readGit(run).catch(() => null), readPr(run).catch(() => null)])
  await update($, git, () => g)
  await update($, pr, () => p)
  $.ui.status(statusText(await read($, usage), g) || undefined)
}

async function syncAgents($: EngineInterface) {
  const rows = await read($, agents)
  if (!rows.some(isRunning)) return
  const live = await $.agent.list()
  await update($, agents, list =>
    list.map(a => ({ ...a, status: live.find(l => l.id === a.id)?.status ?? a.status })),
  )
  const t = await $.clock.now()
  await update($, now, () => t)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'hud', description: 'Open the cost, context and git HUD' })
    void syncRepo($)
    return next(e)
  })

  on('command.run', { command: 'hud' }, async $ => {
    await $.ui.open({ id: PANE, title: TITLE })
    return { text: 'HUD opened.' }
  })

  on('session.measure', async ($, e, next) => {
    const u = toUsage(e)
    await update($, usage, () => u)
    $.ui.status(statusText(u, await read($, git)) || undefined)
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    await syncAgents($)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    void syncRepo($)
    await syncAgents($)
    return next(e)
  })

  on('agent.spawn', async ($, e, next) => {
    const spawned = await next(e)
    if (spawned.agentId) {
      const t = await $.clock.now()
      const row: AgentRow = {
        id: spawned.agentId,
        description: e.description,
        type: e.subagentType,
        model: shortModel(spawned.model),
        startedAt: t,
        status: 'running',
        tools: 0,
      }
      await update($, agents, list => [...list, row])
      await update($, now, () => t)
    }
    return spawned
  })

  on('tool.call', async ($, e, next) => {
    if (e.agentId) {
      await update($, agents, list => list.map(a => (a.id === e.agentId ? { ...a, tools: a.tools + 1 } : a)))
      await syncAgents($)
    }
    const ran = await next(e)
    if (e.tool === 'Agent') await syncAgents($)
    if (REPO_COMMAND.test(commandOf(e))) void syncRepo($)
    return ran
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    const u = await read($, usage)
    const g = await read($, git)
    const p = await read($, pr)
    const rows = await read($, agents)
    const t = await read($, now)
    const pct = u?.ctxPercent ?? null
    const running = rows.filter(isRunning)
    const done = rows.length - running.length
    const sep = <Text color={THEME.border}> │ </Text>

    return (
      <Box flexDirection="column" paddingX={1} backgroundColor={THEME.panel}>
        <Box>
          <Text bold color={THEME.accent}>
            {money(u?.usd ?? 0)}
          </Text>
          {sep}
          {pct === null ? (
            <Text color={THEME.muted}>ctx --</Text>
          ) : (
            <Text color={levelColor(pct)}>
              {bar(pct, MINI_BAR_CELLS)} {pct}%
            </Text>
          )}
          {sep}
          {g === null ? (
            <Text color={THEME.muted}>no repo</Text>
          ) : (
            <Text color={dirty(g) ? THEME.warn : THEME.ok}>
              {g.branch}
              {g.ahead > 0 && ` ↑${g.ahead}`}
              {g.behind > 0 && ` ↓${g.behind}`}
              {dirty(g) && ` +${g.staged} ~${g.unstaged} ?${g.untracked}`}
            </Text>
          )}
          {p && (
            <>
              {sep}
              <Text bold color={THEME.text}>
                #{p.number}
              </Text>
              <Text color={THEME.muted}> → {p.base}</Text>
              {p.isDraft && <Text color={THEME.muted}> draft</Text>}
              <Text color={ciColor(p)}>
                {'  '}ci ✓{p.pass}
                {p.fail > 0 && ` ✗${p.fail}`}
                {p.pending > 0 && ` ⋯${p.pending}`}
              </Text>
              <Text color={p.unresolved > 0 ? THEME.warn : THEME.muted}>
                {'  '}💬{p.unresolved}
              </Text>
              {p.hasCodex && <Text color={THEME.ok}>{'  '}codex ✓</Text>}
            </>
          )}
        </Box>
        {running.slice(0, MAX_AGENT_ROWS).map(a => (
          <Box>
            <Text color={THEME.accent}>◐ </Text>
            <Text color={THEME.text} wrap="truncate-end">
              {a.description}
            </Text>
            <Text color={THEME.muted}>
              {'  '}
              {a.type} · {a.model} · {elapsed(t - a.startedAt)} · {a.tools} tools
            </Text>
          </Box>
        ))}
        {running.length > 0 && (running.length > MAX_AGENT_ROWS || done > 0) && (
          <Text color={THEME.muted}>
            {running.length > MAX_AGENT_ROWS && `+${running.length - MAX_AGENT_ROWS} more running  `}
            {done > 0 && `${done} done`}
          </Text>
        )}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const els = $.ui.resolve(e)
    const { Box, Text } = els
    const u = await read($, usage)
    const g = await read($, git)
    const pct = u?.ctxPercent ?? null
    const label = (text: string) => <Text color={THEME.muted}>{text}</Text>

    const gauge =
      pct === null ? (
        <Text color={THEME.muted}>waiting for first response</Text>
      ) : 'Svg' in els ? (
        <els.Svg source={ring(pct)} alt={`context ${pct}% full`} width={RING_SIZE} height={RING_SIZE} />
      ) : (
        <Text color={levelColor(pct)}>
          {bar(pct)} {pct}%
        </Text>
      )

    return (
      <Box flexDirection="column" gap={1} padding={1} backgroundColor={THEME.bg}>
        <Box flexDirection="column" padding={1} borderStyle="round" borderColor={THEME.border} backgroundColor={THEME.panel}>
          {label('SESSION COST')}
          <Text bold color={THEME.accent}>
            {money(u?.usd ?? 0)}
          </Text>
          {u?.limits.map(l => (
            <Text color={levelColor(l.percentUsed)}>
              {l.kind} {l.percentUsed}%
            </Text>
          ))}
        </Box>
        <Box flexDirection="column" padding={1} borderStyle="round" borderColor={THEME.border} backgroundColor={THEME.panel}>
          {label('CONTEXT')}
          {gauge}
          {u?.ctxTokens != null && (
            <Text color={THEME.muted}>
              {kilo(u.ctxTokens)} / {kilo(u.window)} tokens
            </Text>
          )}
        </Box>
        <Box flexDirection="column" padding={1} borderStyle="round" borderColor={THEME.border} backgroundColor={THEME.panel}>
          {label('GIT')}
          {g === null ? (
            <Text color={THEME.muted}>not a git repo</Text>
          ) : (
            <>
              <Text bold color={dirty(g) ? THEME.warn : THEME.ok}>
                {g.branch}
                {g.ahead > 0 && ` ↑${g.ahead}`}
                {g.behind > 0 && ` ↓${g.behind}`}
              </Text>
              <Text color={THEME.text}>
                +{g.staged} staged · ~{g.unstaged} changed · ?{g.untracked} new
              </Text>
              {g.last && <Text color={THEME.muted} wrap="truncate-end">{g.last}</Text>}
            </>
          )}
        </Box>
      </Box>
    )
  })
}
