import type { Pr } from '../types'

type Run = (argv: readonly string[]) => Promise<{ exitCode: number; stdout: string }>
type Check = { conclusion?: string; status?: string; state?: string }

const PASSED = ['SUCCESS', 'NEUTRAL', 'SKIPPED']
const FAILED = ['FAILURE', 'TIMED_OUT', 'CANCELLED', 'ACTION_REQUIRED', 'ERROR', 'STARTUP_FAILURE']
const CODEX = /codex/i
const THREADS_QUERY =
  'query($owner:String!,$name:String!,$n:Int!){repository(owner:$owner,name:$name){pullRequest(number:$n){reviewThreads(first:100){nodes{isResolved}}}}}'

const outcome = (c: Check) => c.conclusion || c.state || ''

const countUnresolved = async (run: Run, n: number) => {
  const r = await run(['gh', 'api', 'graphql', '-F', 'owner={owner}', '-F', 'name={repo}', '-F', `n=${n}`, '-f', `query=${THREADS_QUERY}`])
  if (r.exitCode !== 0) return 0
  const nodes: { isResolved: boolean }[] =
    JSON.parse(r.stdout).data?.repository?.pullRequest?.reviewThreads?.nodes ?? []
  return nodes.filter(t => !t.isResolved).length
}

export const readPr = async (run: Run): Promise<Pr | null> => {
  const r = await run(['gh', 'pr', 'view', '--json', 'number,baseRefName,isDraft,state,statusCheckRollup,reviews'])
  if (r.exitCode !== 0) return null
  const pr = JSON.parse(r.stdout)
  if (pr.state !== 'OPEN') return null
  const checks: Check[] = pr.statusCheckRollup ?? []
  const pass = checks.filter(c => PASSED.includes(outcome(c))).length
  const fail = checks.filter(c => FAILED.includes(outcome(c))).length
  return {
    number: pr.number,
    base: pr.baseRefName,
    isDraft: pr.isDraft,
    pass,
    fail,
    pending: checks.length - pass - fail,
    unresolved: await countUnresolved(run, pr.number),
    hasCodex: (pr.reviews ?? []).some((v: { author?: { login?: string } }) => CODEX.test(v.author?.login ?? '')),
  }
}
