/**
 * Rework the rail glass to iOS-26 style "clear glass":
 *   - remove the drifting sheen (that white band was the thing moving around);
 *   - much less blur (5px) so the canvas stays visible through it — frosted milk comes from a
 *     heavy blur plus an opaque fill, which is what the previous version did;
 *   - keep a static specular sheet and a 1px refraction rim;
 *   - the "frozen while panning" state now keeps the same tint instead of turning milky.
 */
import fs from 'node:fs'

const css = 'src/client/talk-map.module.css'
let text = fs.readFileSync(css, 'utf8')
const MARK = '/* ==== liquid glass rail ==== */'
const at = text.indexOf(MARK)
if (at < 0) throw new Error('glass block marker missing')
text = text.slice(0, at)

text += `${MARK}
/* Clear glass, not frosted: light blur, saturated backdrop, thin specular rim.
   The canvas behind stays readable through the panel. */
.statusRailPanel {
  background:
    linear-gradient(165deg,
      rgba(255, 255, 255, 0.1) 0%,
      rgba(255, 255, 255, 0.03) 38%,
      rgba(255, 255, 255, 0.07) 100%),
    color-mix(in oklab, var(--dsw-alias-bg-elevated, #14161c) 38%, transparent);
  backdrop-filter: blur(5px) saturate(200%) brightness(1.06);
  -webkit-backdrop-filter: blur(5px) saturate(200%) brightness(1.06);
  border-right: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 0 18px 18px 0;
  box-shadow:
    8px 0 30px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.34),
    inset 1px 0 0 rgba(255, 255, 255, 0.1);
  isolation: isolate;
}

/* Static specular sheet: warm highlight top-left, cooler bounce bottom-right. */
.statusRailPanel::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background:
    radial-gradient(140% 55% at 8% -10%, rgba(255, 255, 255, 0.22), transparent 58%),
    radial-gradient(80% 40% at 96% 108%, rgba(255, 255, 255, 0.1), transparent 60%);
  z-index: 0;
}

/* Refraction rim: 1px ring, brightest along the top and the rounded outer edge. */
.statusRailPanel::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  padding: 1px;
  background: linear-gradient(150deg, rgba(255, 255, 255, 0.65), rgba(255, 255, 255, 0.02) 45%, rgba(255, 255, 255, 0.3));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  z-index: 3;
}

/* Cards: clear tiles with a bright top edge instead of milky panels. */
.statusRailPanel .card {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.02) 46%),
    color-mix(in oklab, var(--dsw-alias-bg-layer-1, #1b1e26) 52%, transparent);
  border-color: rgba(255, 255, 255, 0.16);
  border-radius: 14px;
  box-shadow:
    0 2px 12px rgba(0, 0, 0, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.3),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05);
}

/* Light theme: white glass keeps a little more scrim so the text stays on top. */
:global(body:not([data-ds-dark-theme])) .statusRailPanel {
  background:
    linear-gradient(165deg, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0.22) 40%, rgba(255, 255, 255, 0.42) 100%);
  border-right-color: rgba(15, 23, 42, 0.12);
  box-shadow: 8px 0 26px rgba(15, 23, 42, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

:global(body:not([data-ds-dark-theme])) .statusRailPanel .card {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.42) 46%);
  border-color: rgba(15, 23, 42, 0.1);
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.95);
}

/* Panning: same tint without live sampling, so no milky flash when the drag stops either. */
.statusRail[data-frozen="1"] .statusRailPanel {
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  background:
    linear-gradient(165deg,
      rgba(255, 255, 255, 0.09) 0%,
      rgba(255, 255, 255, 0.03) 38%,
      rgba(255, 255, 255, 0.06) 100%),
    color-mix(in oklab, var(--dsw-alias-bg-elevated, #14161c) 46%, transparent);
}
`
fs.writeFileSync(css, text, 'utf8')
console.log('css: 清透玻璃重写，流动光带已删除')

// markup: drop the sheen span
const tsx = 'src/client/StatusRail.tsx'
let rail = fs.readFileSync(tsx, 'utf8')
const before = "        <span className={styles['railSheen']} aria-hidden=\"true\" />\n"
if (rail.includes(before)) {
  rail = rail.replace(before, '')
  fs.writeFileSync(tsx, rail, 'utf8')
  console.log('tsx: railSheen 元素已移除')
}
if (/railSheen/.test(rail)) throw new Error('railSheen 仍被引用')
