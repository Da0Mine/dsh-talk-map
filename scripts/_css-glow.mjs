import fs from 'node:fs'
const f = 'src/client/talk-map.module.css'
let t = fs.readFileSync(f, 'utf8')
if (!t.includes('harmony glow')) {
  t += `
/* ==== harmony glow (ported from echo-liquid-glass) ==== */
[data-liquid-glow="1"] {
  position: relative;
}

[data-liquid-glow="1"]::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 0;
  background: radial-gradient(circle var(--glow-radius, 170px) at var(--glow-x, 80%) var(--glow-y, 80%),
    var(--glow-color, rgba(255, 255, 255, 0.95)) 0%,
    color-mix(in srgb, var(--glow-color, #ffffff) 80%, transparent) 8%,
    color-mix(in srgb, var(--glow-color, #ffffff) 50%, transparent) 20%,
    color-mix(in srgb, var(--glow-color, #ffffff) 20%, transparent) 40%,
    color-mix(in srgb, var(--glow-color, #ffffff) 5%, transparent) 60%,
    transparent 80%);
  mix-blend-mode: plus-lighter;
  opacity: 0;
  transition: opacity 0.28s ease;
}

[data-liquid-glow="1"]:hover::after { opacity: 0.3; }
[data-liquid-glow="1"]:active::after { opacity: 0.42; }

[data-liquid-glow="1"]::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 2;
  box-shadow: inset 0 0 0 2px var(--glow-color, rgba(255, 255, 255, 0.95));
  filter: brightness(1.6);
  -webkit-mask: radial-gradient(circle var(--border-glow-radius, 120px) at var(--glow-x, 80%) var(--glow-y, 80%),
    #000 0%, #000 8%, rgba(0, 0, 0, 0.4) 20%, rgba(0, 0, 0, 0.08) 35%, transparent 50%);
  mask: radial-gradient(circle var(--border-glow-radius, 120px) at var(--glow-x, 80%) var(--glow-y, 80%),
    #000 0%, #000 8%, rgba(0, 0, 0, 0.4) 20%, rgba(0, 0, 0, 0.08) 35%, transparent 50%);
  opacity: 0;
  transition: opacity 0.28s ease;
}

[data-liquid-glow="1"]:hover::before { opacity: 0.5; }

/* Top bar takes the same material, so the two surfaces read as one system. */
.header {
  background: color-mix(in oklab, var(--dsw-alias-bg-layer-1, #1b1e26) 46%, transparent);
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 0 0 16px 0;
}
`
  fs.writeFileSync(f, t, 'utf8')
  console.log('CSS: 光效与顶部条已加')
}
