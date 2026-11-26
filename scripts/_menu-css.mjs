import fs from 'node:fs'
const f = 'src/client/talk-map.module.css'
let t = fs.readFileSync(f, 'utf8')
if (!t.includes('.railMenu {')) {
  t += `
/* Right-click menu for queue cards (both rails). */
.railMenu {
  position: fixed;
  z-index: 60;
  min-width: 168px;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-2, #23262e) 92%, transparent);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(8px);
}

.railMenuItem {
  display: block;
  width: 100%;
  padding: 6px 10px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 12.5px;
  text-align: left;
  cursor: pointer;
}

.railMenuItem:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.08));
}

.railMenuItem:disabled {
  opacity: 0.5;
  cursor: default;
}

.railMenuItemDanger {
  color: var(--dsw-alias-state-error-primary);
}
`
  fs.writeFileSync(f, t, 'utf8')
  console.log('CSS: railMenu')
}
