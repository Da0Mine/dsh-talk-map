/**
 * Match the reference (iOS 26 liquid-glass pill): the material is a CLEAR dark scrim plus a
 * thick specular bezel — not a white fill. The milky look came from the alpha-white gradient
 * layers; those are gone and only narrow edge bands remain.
 *
 * Also fixes the inverted-looking states: the blur is now 3px, so the resting and panning
 * renders are visually the same and nothing "milks up" when the drag stops.
 */
import fs from 'node:fs'

const css = 'src/client/talk-map.module.css'
let text = fs.readFileSync(css, 'utf8')
const MARK = '/* ==== liquid glass rail ==== */'
const at = text.indexOf(MARK)
if (at < 0) throw new Error('marker missing')
text = text.slice(0, at)

text += `${MARK}
/* Reference look: nearly clear, thick bright bezel, dark scrim only enough for text contrast. */
.statusRailPanel {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.01) 26%, rgba(0, 0, 0, 0.12) 100%),
    rgba(8, 10, 14, 0.28);
  backdrop-filter: blur(3px) saturate(180%) brightness(1.02);
  -webkit-backdrop-filter: blur(3px) saturate(180%) brightness(1.02);
  border-radius: 0 22px 22px 0;
  /* Bezel: light rim, dark separation ring, bright top/side edges, darker interior corners. */
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.22),
    inset 0 0 0 2px rgba(0, 0, 0, 0.3),
    inset 0 1.5px 0 rgba(255, 255, 255, 0.5),
    inset 1.5px 0 0 rgba(255, 255, 255, 0.3),
    inset 0 -1px 0 rgba(255, 255, 255, 0.1),
    inset 0 0 26px rgba(0, 0, 0, 0.26),
    10px 0 38px rgba(0, 0, 0, 0.34);
  isolation: isolate;
}

/* Edge-only sheen: a narrow band along the top and the outer rounded edge. */
.statusRailPanel::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.16), transparent 9%),
    linear-gradient(270deg, rgba(255, 255, 255, 0.12), transparent 6%);
  z-index: 0;
}

/* Refraction rim: thin bright line hugging the outline. */
.statusRailPanel::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  padding: 1px;
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.75), rgba(255, 255, 255, 0.04) 42%, rgba(255, 255, 255, 0.4));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  z-index: 3;
}

/* Cards: clear tiles — a scrim, a bright top edge, no white fill. */
.statusRailPanel .card {
  background: rgba(10, 12, 16, 0.34);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 16px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.4),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05),
    inset 0 0 18px rgba(0, 0, 0, 0.18),
    0 1px 2px rgba(0, 0, 0, 0.4),
    0 10px 26px -14px rgba(0, 0, 0, 0.55);
}

/* Light theme: white glass keeps a clear (not milky) scrim. */
:global(body:not([data-ds-dark-theme])) .statusRailPanel {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.12) 30%, rgba(0, 0, 0, 0.04) 100%),
    rgba(255, 255, 255, 0.28);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.9),
    inset 0 1.5px 0 rgba(255, 255, 255, 1),
    inset 0 0 26px rgba(15, 23, 42, 0.06),
    10px 0 34px rgba(15, 23, 42, 0.16);
}

:global(body:not([data-ds-dark-theme])) .statusRailPanel .card {
  background: rgba(255, 255, 255, 0.42);
  border-color: rgba(15, 23, 42, 0.1);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 1),
    inset 0 0 0 1px rgba(255, 255, 255, 0.6),
    0 1px 2px rgba(15, 23, 42, 0.12),
    0 10px 24px -16px rgba(15, 23, 42, 0.3);
}

/* Panning: same colour, no live sampling — at 3px the difference is invisible anyway. */
.statusRail[data-frozen="1"] .statusRailPanel {
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.01) 26%, rgba(0, 0, 0, 0.13) 100%),
    rgba(8, 10, 14, 0.32);
}
`
fs.writeFileSync(css, text, 'utf8')
console.log('css: 按参考图重做（清透 + 厚亮边），模糊 3px')
