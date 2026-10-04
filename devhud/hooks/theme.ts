// ember palette, used by every hud element
export const THEME = {
  bg: '#16110e',
  panel: '#211915',
  border: '#3a2c24',
  text: '#f2e8e0',
  muted: '#8a7a70',
  accent: '#ff7a3d',
  ok: '#7bd88f',
  warn: '#ffcc66',
  hot: '#ff5c5c',
} as const

const WARN_AT = 60
const HOT_AT = 85

export const levelColor = (percent: number) =>
  percent >= HOT_AT ? THEME.hot : percent >= WARN_AT ? THEME.warn : THEME.ok
