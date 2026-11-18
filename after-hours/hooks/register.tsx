import type { Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { SCENE } from './scene'

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

// a still ground can't move, so the backdrop is a scene drawn below
const SCENE_NAME = 'after-hours'

const LOOK: ThemeSetArgs = {
  colors: theme,
  // panels stay solid: no frosted glass over the scene
  backdrop: { scene: SCENE_NAME, glass: false },
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))

    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }

    try {
      const set = await $.theme.set(LOOK)

      if (!set.isDrawn) {
        $.ui.status(set.reason)
      }
    } catch {
      // headless sessions (claude -p) have no theme to set
    }

    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)

    return (
      <Svg
        source={SCENE}
        alt="Lamplight at the lower left, faint rain on a dark window at the upper right"
        isInteractive
      />
    )
  })
}
