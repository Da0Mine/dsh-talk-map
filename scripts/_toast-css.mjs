import fs from 'node:fs'
const f = 'src/client/talk-map.module.css'
let t = fs.readFileSync(f, 'utf8')
if (!t.includes('.railMenuToast')) {
  t += `
/* Outcome of a card-menu action, shown in-app: console-only errors were invisible. */
.railMenuToast {
  position: fixed;
  left: 50%;
  bottom: 28px;
  transform: translateX(-50%);
  z-index: 10000;
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 12.5px;
  color: var(--dsw-alias-label-primary);
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-3, #2b2f38) 96%, transparent);
  border: 1px solid var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.12));
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
  pointer-events: none;
}
`
  fs.writeFileSync(f, t, 'utf8')
  console.log('CSS: railMenuToast')
}
