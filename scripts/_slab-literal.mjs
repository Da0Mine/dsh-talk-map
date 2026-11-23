import fs from 'node:fs'
const f = 'src/client/talk-map.module.css'
let t = fs.readFileSync(f, 'utf8')
const at = t.indexOf('/* One continuous slab:')
if (at < 0) throw new Error('slab block missing')
t = t.slice(0, at)
t += `/* One continuous slab. The dark theme's own border tokens are near-black on dark, and
   --dsw-alias-border-secondary does not exist in the host at all (the plugin invented it), so the
   outline uses an explicit light stroke instead of a token that resolves to nothing. */
.statusRailPanel {
  border-right: none;
  border-top: 1px solid rgba(255, 255, 255, 0.16);
  border-bottom: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 0 20px 20px 0;
  box-shadow: none;
}

/* Same stroke continues around the handle: top, right and bottom only, so the seam between the
   two elements stays open and the pair reads as one piece of glass with a tab on its right. */
.statusRailTab {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-left: none;
  border-radius: 0 20px 20px 0;
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}
`
fs.writeFileSync(f, t, 'utf8')
console.log('边框改用字面值 rgba(255,255,255,.16)')
