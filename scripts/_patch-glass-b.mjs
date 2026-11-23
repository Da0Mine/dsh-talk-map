/**
 * Final glass pass: variant B (clear, bright rim, real translucency). Replaces the block from
 * the marker to EOF so the file keeps one authoritative definition.
 */
import fs from 'node:fs'

const css = 'src/client/talk-map.module.css'
let text = fs.readFileSync(css, 'utf8')
const MARK = '/* ==== liquid glass rail ==== */'
const at = text.indexOf(MARK)
if (at < 0) throw new Error('marker missing')
text = text.slice(0, at)

text += `${MARK}
/* Clear glass in the iOS-26 sense: the canvas reads through the panel, the rim carries the
   material, and nothing is milked out by a heavy blur. */
.statusRailPanel {
  background:
    linear-gradient(165deg,
      rgba(255, 255, 255, 0.2) 0%,
      rgba(255, 255, 255, 0.07) 40%,
      rgba(255, 255, 255, 0.14) 100%),
    color-mix(in oklab, var(--dsw-alias-bg-elevated, #14161c) 20%, transparent);
  backdrop-filter: blur(10px) saturate(240%) brightness(1.14);
  -webkit-backdrop-filter: blur(10px) saturate(240%) brightness(1.14);
  border-right: 1.5px solid rgba(255, 255, 255, 0.42);
  border-radius: 0 18px 18px 0;
  box-shadow:
    8px 0 34px rgba(0, 0, 0, 0.3),
    0 0 60px rgba(255, 255, 255, 0.07),
    inset 0 2px 0 rgba(255, 255, 255, 0.55),
    inset 0 -2px 0 rgba(255, 255, 255, 0.12),
    inset 0 30px 50px -40px rgba(255, 255, 255, 0.35);
  isolation: isolate;
}

/* Static specular sheet: bright top-left, cool bounce from the rounded edge. */
.statusRailPanel::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background:
    radial-gradient(150% 58% at 6% -12%, rgba(255, 255, 255, 0.34), transparent 60%),
    radial-gradient(90% 44% at 98% 106%, rgba(255, 255, 255, 0.16), transparent 62%);
  z-index: 0;
}

/* Refraction rim: 1px ring, brightest along the top and the outer edge. */
.statusRailPanel::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  padding: 1px;
  background: linear-gradient(150deg, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.03) 45%, rgba(255, 255, 255, 0.36));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  z-index: 3;
}

/* Cards: glass tiles. The bright top edge and the ring do the work, the fill stays light. */
.statusRailPanel .card {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.03) 48%),
    color-mix(in oklab, var(--dsw-alias-bg-layer-1, #1b1e26) 30%, transparent);
  border-color: rgba(255, 255, 255, 0.22);
  border-radius: 14px;
  box-shadow:
    0 3px 14px rgba(0, 0, 0, 0.24),
    inset 0 1.5px 0 rgba(255, 255, 255, 0.5),
    inset 0 0 0 1px rgba(255, 255, 255, 0.1);
}

/* Light theme: the same recipe on white, a touch more scrim for text contrast. */
:global(body:not([data-ds-dark-theme])) .statusRailPanel {
  background:
    linear-gradient(165deg, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0.4) 42%, rgba(255, 255, 255, 0.6) 100%);
  border-right-color: rgba(255, 255, 255, 0.85);
  box-shadow: 8px 0 30px rgba(15, 23, 42, 0.16), inset 0 2px 0 rgba(255, 255, 255, 0.95);
}

:global(body:not([data-ds-dark-theme])) .statusRailPanel .card {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(255, 255, 255, 0.6) 48%);
  border-color: rgba(15, 23, 42, 0.1);
  box-shadow: 0 2px 12px rgba(15, 23, 42, 0.1), inset 0 1px 0 rgba(255, 255, 255, 1);
}

/* Panning: keep the tint, drop the live sampling (no milk flash when the drag stops). */
.statusRail[data-frozen="1"] .statusRailPanel {
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  background:
    linear-gradient(165deg,
      rgba(255, 255, 255, 0.18) 0%,
      rgba(255, 255, 255, 0.07) 40%,
      rgba(255, 255, 255, 0.13) 100%),
    color-mix(in oklab, var(--dsw-alias-bg-elevated, #14161c) 28%, transparent);
}
`
fs.writeFileSync(css, text, 'utf8')
console.log('css: 采用 B 档清透玻璃')
