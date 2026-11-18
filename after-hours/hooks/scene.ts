// the backdrop: lamplight pooling at the lower left, rain on a dark window at the
// upper right, a few dust motes in the light. everything stays near the edges,
// away from the words in the middle and the composer at the foot.

const GRAPHITE = '#111418'
const MIDNIGHT_EDGE = '#0e1421'
const BRASS = '#b99a68'
const STEEL = '#7d93ad'
const RAIN = '#9fb3c9'
const MOTE = '#d9bf8f'

// [x, length, seconds, delay] for each streak, in the window's own 480x300 box
const STREAKS: readonly (readonly [number, number, number, number])[] = [
  [196, 34, 7.5, 0.0], [214, 52, 9.8, 3.1], [238, 28, 6.9, 5.4], [259, 44, 11.2, 1.7],
  [281, 36, 8.4, 6.6], [302, 58, 10.6, 2.4], [327, 30, 7.2, 8.1], [349, 46, 9.1, 4.8],
  [371, 26, 6.6, 0.9], [392, 50, 12.0, 7.3], [414, 38, 8.8, 3.9], [437, 32, 7.9, 9.5],
  [456, 42, 10.1, 5.9],
]

// [x, y, radius, opacity, seconds, delay] for each mote, in the lamp's 320x650 box
const MOTES: readonly (readonly [number, number, number, number, number, number])[] = [
  [42, 610, 1.4, 0.28, 52, 0], [88, 640, 1.0, 0.22, 64, 11], [131, 590, 1.7, 0.2, 47, 23],
  [64, 560, 1.1, 0.26, 70, 34], [176, 630, 1.3, 0.18, 58, 6], [112, 650, 0.9, 0.24, 61, 41],
  [205, 600, 1.2, 0.16, 55, 17], [28, 645, 1.5, 0.2, 67, 29], [150, 620, 1.0, 0.22, 49, 45],
]

const streaks = STREAKS.map(
  ([x, len, s, d]) =>
    `<line class="drop" x1="${x}" y1="0" x2="${x}" y2="${len}" style="animation-duration:${s}s;animation-delay:-${d}s"/>`,
).join('')

const motes = MOTES.map(
  ([x, y, r, o, s, d]) =>
    `<circle class="mote" cx="${x}" cy="${y}" r="${r}" fill-opacity="${o}" style="animation-duration:${s}s;animation-delay:-${d}s"/>`,
).join('')

export const SCENE = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
<defs>
<radialGradient id="ground" cx="50%" cy="45%" r="75%">
<stop offset="0" stop-color="${GRAPHITE}"/><stop offset="0.55" stop-color="${GRAPHITE}"/><stop offset="1" stop-color="${MIDNIGHT_EDGE}"/>
</radialGradient>
<radialGradient id="lamp" cx="0" cy="0.88" r="0.62">
<stop offset="0" stop-color="${BRASS}" stop-opacity="0.085"/><stop offset="0.45" stop-color="${BRASS}" stop-opacity="0.03"/><stop offset="1" stop-color="${BRASS}" stop-opacity="0"/>
</radialGradient>
<linearGradient id="pane" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="${STEEL}" stop-opacity="0.045"/><stop offset="1" stop-color="${STEEL}" stop-opacity="0"/>
</linearGradient>
<clipPath id="glass"><rect x="180" y="-10" width="290" height="270" rx="3"/></clipPath>
</defs>
<style>
.lamp{transform-box:fill-box;transform-origin:0% 88%;animation:lamp 46s ease-in-out infinite alternate}
@keyframes lamp{from{opacity:.82;transform:scale(1)}to{opacity:1;transform:scale(1.07) translate(1.5%,-1%)}}
.drop{stroke:${RAIN};stroke-opacity:.07;stroke-width:1;stroke-linecap:round;animation:fall linear infinite}
@keyframes fall{from{transform:translateY(-70px)}to{transform:translateY(300px)}}
.mote{fill:${MOTE};opacity:0;animation:rise linear infinite}
@keyframes rise{0%{transform:translate(0,0);opacity:0}18%{opacity:1}82%{opacity:1}100%{transform:translate(26px,-440px);opacity:0}}
@media (prefers-reduced-motion:reduce){.lamp,.drop,.mote{animation:none}.mote{opacity:1}}
</style>
<rect width="100%" height="100%" fill="url(#ground)"/>
<rect class="lamp" width="100%" height="100%" fill="url(#lamp)"/>
<svg x="58%" y="0" width="42%" height="48%" viewBox="0 0 480 300" preserveAspectRatio="xMaxYMin slice">
<rect x="180" y="-10" width="290" height="270" rx="3" fill="url(#pane)"/>
<g stroke="${STEEL}" stroke-opacity="0.035" stroke-width="1" fill="none">
<rect x="180.5" y="-10" width="289" height="270" rx="3"/><line x1="325" y1="-10" x2="325" y2="260"/><line x1="180" y1="125" x2="470" y2="125"/>
</g>
<g clip-path="url(#glass)">${streaks}</g>
</svg>
<svg x="0" y="34%" width="30%" height="66%" viewBox="0 0 320 650" preserveAspectRatio="xMinYMax slice">${motes}</svg>
</svg>`
