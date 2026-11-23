/**
 * The map's left rail becomes liquid glass:
 *   - translucent panel + backdrop blur/saturation (the old background was 94% opaque, so the
 *     existing blur(10px) was invisible);
 *   - a specular highlight layer and a 1px refraction rim (pseudo-elements);
 *   - a slow drifting sheen for the "liquid" part, disabled under reduced motion;
 *   - rail cards become translucent too, so the layers read as one piece of glass.
 * Everything is scoped: `.card` is shared with the canvas cards.
 */
import fs from 'node:fs'

const css = 'src/client/talk-map.module.css'
let text = fs.readFileSync(css, 'utf8')
const MARK = '/* ==== liquid glass rail ==== */'
if (!text.includes(MARK)) {
  text += `
${MARK}
.statusRailPanel {
  /* Translucent enough that the blur has something to show through. */
  background:
    linear-gradient(158deg,
      color-mix(in oklab, var(--dsw-alias-bg-elevated, #14161c) 58%, transparent) 0%,
      color-mix(in oklab, var(--dsw-alias-bg-elevated, #14161c) 34%, transparent) 44%,
      color-mix(in oklab, var(--dsw-alias-bg-elevated, #14161c) 52%, transparent) 100%);
  backdrop-filter: blur(20px) saturate(180%) brightness(1.06);
  -webkit-backdrop-filter: blur(20px) saturate(180%) brightness(1.06);
  border-right: 1px solid color-mix(in oklab, var(--dsw-alias-border-secondary, #ffffff) 60%, transparent);
  border-radius: 0 14px 14px 0;
  box-shadow:
    8px 0 30px rgba(0, 0, 0, 0.26),
    inset 0 1px 0 rgba(255, 255, 255, 0.22),
    inset 1px 0 0 rgba(255, 255, 255, 0.1),
    inset -1px 0 0 rgba(255, 255, 255, 0.06);
  isolation: isolate;
}

/* Specular: warm highlight from the top left, cooler bounce from the bottom right. */
.statusRailPanel::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background:
    radial-gradient(120% 48% at 10% -6%, rgba(255, 255, 255, 0.3), transparent 62%),
    radial-gradient(100% 42% at 92% 106%, rgba(255, 255, 255, 0.16), transparent 64%);
  mix-blend-mode: screen;
  opacity: 0.85;
  z-index: 0;
}

/* Refraction rim: a 1px ring that only paints on the edge. */
.statusRailPanel::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  padding: 1px;
  background: linear-gradient(155deg, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0.04) 42%, rgba(255, 255, 255, 0.26));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  z-index: 2;
}

/* The "liquid" part: one soft band drifting across the glass. */
.railSheen {
  position: absolute;
  top: -30%;
  bottom: -30%;
  left: 0;
  width: 42%;
  pointer-events: none;
  background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.16), transparent);
  filter: blur(6px);
  mix-blend-mode: screen;
  opacity: 0.5;
  animation: railSheenDrift 9s ease-in-out infinite;
  z-index: 1;
}

@keyframes railSheenDrift {
  0% { transform: translateX(-120%); }
  55% { transform: translateX(240%); }
  100% { transform: translateX(240%); }
}

/* Rail cards take the same glass, one step more opaque so the text stays readable. */
.statusRailPanel .card {
  background: color-mix(in oklab, var(--dsw-alias-bg-layer-1, #1b1e26) 74%, transparent);
  backdrop-filter: blur(6px) saturate(140%);
  -webkit-backdrop-filter: blur(6px) saturate(140%);
  border-color: color-mix(in oklab, var(--dsw-alias-border-l2, #ffffff) 55%, transparent);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

/* Light theme: the same recipe needs a touch more white and a softer shadow. */
:global(body:not([data-ds-dark-theme])) .statusRailPanel {
  background:
    linear-gradient(158deg,
      color-mix(in oklab, #ffffff 62%, transparent) 0%,
      color-mix(in oklab, #ffffff 34%, transparent) 46%,
      color-mix(in oklab, #ffffff 54%, transparent) 100%);
  box-shadow:
    8px 0 26px rgba(15, 23, 42, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.75),
    inset 1px 0 0 rgba(255, 255, 255, 0.5);
}

:global(body:not([data-ds-dark-theme])) .statusRailPanel .card {
  background: color-mix(in oklab, #ffffff 78%, transparent);
  border-color: color-mix(in oklab, #0f172a 12%, transparent);
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

@media (prefers-reduced-motion: reduce) {
  .railSheen { animation: none; opacity: 0.25; }
}
`
  fs.writeFileSync(css, text, 'utf8')
  console.log('css: liquid glass rail 已加入')
}

// markup: the sheen layer inside the panel
const tsx = 'src/client/StatusRail.tsx'
let rail = fs.readFileSync(tsx, 'utf8')
if (!rail.includes("railSheen")) {
  rail = rail.replace(
    '<div className={styles[\'statusRailPanel\']} aria-hidden={!open} ref={panelRef}>',
    '<div className={styles[\'statusRailPanel\']} aria-hidden={!open} ref={panelRef}>\n        <span className={styles[\'railSheen\']} aria-hidden="true" />',
  )
  fs.writeFileSync(tsx, rail, 'utf8')
  console.log('tsx: railSheen 已插入')
}
