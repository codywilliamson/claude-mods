import type { Git } from '../types'

type Run = (argv: readonly string[]) => Promise<{ exitCode: number; stdout: string }>

export const parseStatus = (porcelain: string): Omit<Git, 'last'> => {
  const git = { branch: '?', ahead: 0, behind: 0, staged: 0, unstaged: 0, untracked: 0 }
  for (const line of porcelain.split('\n')) {
    if (line.startsWith('# branch.head ')) git.branch = line.slice(14)
    else if (line.startsWith('# branch.ab ')) {
      const [, ahead, behind] = line.match(/\+(\d+) -(\d+)/) ?? []
      git.ahead = Number(ahead ?? 0)
      git.behind = Number(behind ?? 0)
    } else if (line.startsWith('? ')) git.untracked += 1
    else if (/^[12u] /.test(line)) {
      const [x, y] = line.slice(2, 4)
      if (x !== '.') git.staged += 1
      if (y !== '.') git.unstaged += 1
    }
  }
  return git
}

export const readGit = async (run: Run): Promise<Git | null> => {
  const status = await run(['git', 'status', '--porcelain=v2', '--branch'])
  if (status.exitCode !== 0) return null
  const log = await run(['git', 'log', '-1', '--format=%h %s'])
  return { ...parseStatus(status.stdout), last: log.exitCode === 0 ? log.stdout.trim() : '' }
}
