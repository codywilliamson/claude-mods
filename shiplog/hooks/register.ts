import type { Register } from 'claude-code'

import { classify, draftPrompt, formatLog, since, toEntry } from './ship'
import type { Entry } from './ship'

const STORE_KEY = 'entries'
const MAX_ENTRIES = 1000
const DEFAULT_DAYS = 7
const DRAFT_MODEL = 'sonnet'

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'shipped',
      description: 'Show what you shipped and draft an X post (optional: days, default 7)',
    })
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    const command = 'command' in e && typeof e.command === 'string' ? e.command : ''
    const kind = command && classify(command)
    if (!kind || ran.deny !== undefined || ran.isError) return ran

    const entry = toEntry(await $.clock.now(), await $.session.cwd(), kind, command, ran.text ?? '')
    const entries = ((await $.store.get(STORE_KEY)) as Entry[] | undefined) ?? []
    await $.store.set(STORE_KEY, [...entries, entry].slice(-MAX_ENTRIES))
    $.ui.toast(`shiplog: ${kind} in ${entry.repo}`)
    return ran
  })

  on('command.run', { command: 'shipped' }, async ($, e) => {
    const days = Number(e.args.trim()) || DEFAULT_DAYS
    const entries = ((await $.store.get(STORE_KEY)) as Entry[] | undefined) ?? []
    const recent = since(entries, await $.clock.now(), days)
    if (recent.length === 0) return { text: `Nothing logged in the last ${days} days yet.` }

    const log = formatLog(recent)
    const draft = await $.model.complete({ model: DRAFT_MODEL, prompt: draftPrompt(log, days) })
    const post = draft.isAnswered ? draft.text : `(draft failed: ${draft.reason})`
    return { text: `Shipped in the last ${days} days:\n${log}\n\n--- draft ---\n${post}` }
  })
}
