export type Kind = 'pr' | 'merge' | 'release' | 'deploy'

export type Entry = {
  at: number
  repo: string
  kind: Kind
  command: string
  output: string
}

const RULES: [Kind, RegExp][] = [
  ['merge', /\bgh pr merge\b/],
  ['release', /\bgh release create\b/],
  ['pr', /\bgh pr create\b/],
  ['deploy', /\bwrangler (pages )?deploy\b|\bdeploy(\.ts|\.sh|\.js)?\b.*--(prod|production|staging)\b|\bvercel --prod\b/],
]

const DAY_MS = 86_400_000
const MAX_COMMAND = 200
const MAX_OUTPUT = 300

export const classify = (command: string): Kind | null =>
  RULES.find(([, rule]) => rule.test(command))?.[0] ?? null

export const toEntry = (at: number, cwd: string, kind: Kind, command: string, output: string): Entry => ({
  at,
  repo: cwd.split(/[\\/]/).filter(Boolean).pop() ?? cwd,
  kind,
  command: command.slice(0, MAX_COMMAND),
  output: output.trim().split('\n').slice(0, 3).join(' ').slice(0, MAX_OUTPUT),
})

export const since = (entries: Entry[], now: number, days: number) =>
  entries.filter(e => e.at >= now - days * DAY_MS)

export const formatLog = (entries: Entry[]) =>
  entries
    .map(e => `${new Date(e.at).toISOString().slice(0, 10)} ${e.repo} ${e.kind}: ${e.output || e.command}`)
    .join('\n')

export const draftPrompt = (log: string, days: number) => `You write build-in-public posts for X for a solo dev who ships with Claude Code.

Here is everything they shipped in the last ${days} days (date, repo, kind, details):
${log}

Write one X post (under 280 chars) and one 3-5 tweet thread. Voice: casual, lowercase, plain words, specific (name repos and what changed), no hype words, no hashtags, no em dashes. Skip dependabot and chore noise unless it's all there is. Output the post, a blank line, then the thread with tweets numbered 1/, 2/ and so on.`
