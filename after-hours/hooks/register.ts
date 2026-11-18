import type { Register, ThemeColor, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'

// a quiet desk after the house has gone to sleep: graphite, ivory, a brass lamp
const GRAPHITE = '#111418'
const SIDEBAR = '#0d1014'
const CHARCOAL = '#1a1f26'
const MENU = '#1b2028'
const IVORY = '#e7e4de'
const SLATE = '#9ca6b3'
const SLATE_MUTED = '#8a94a1'
const BRASS = '#b99a68'
const STEEL = '#7d93ad'
const MIDNIGHT_EDGE = '#0e1421'

const { theme, problems } = makeColors({
  label: 'After hours',
  only: 'dark',
  roles: {
    // brass carries actions, selection and focus rings; keywords pick it up quietly
    accent: BRASS,
    danger: '#c0776a',
    success: '#94ac83',
    warning: '#c9a46a',
    // steel blue for literals, the one cool note in code
    pro: STEEL,
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': SIDEBAR,
        'surface-1': GRAPHITE,
        'surface-2': CHARCOAL,
        'surface-3': MENU,
        'text-primary': IVORY,
        'text-secondary': SLATE,
        'text-muted': SLATE_MUTED,
      },
    },
    git: { added: '#94ac83', removed: '#c0776a', modified: '#c9a46a', merged: STEEL },
  },
})

// graphite in the middle, drifting a hair toward midnight blue at the edges
const EDGE_STOPS: readonly { at: number; color: ThemeColor }[] = [
  { at: 0, color: GRAPHITE },
  { at: 0.55, color: GRAPHITE },
  { at: 1, color: MIDNIGHT_EDGE },
]

const LOOK: ThemeSetArgs = {
  colors: theme,
  backdrop: { gradient: { shape: 'radial', stops: EDGE_STOPS } },
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))

    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }
    const set = await $.theme.set(LOOK)

    if (!set.isDrawn) {
      $.ui.status(set.reason)
    }

    return next(e)
  })
}
