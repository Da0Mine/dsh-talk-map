import fs from 'node:fs'
const f = 'src/client/reorder.ts'
let t = fs.readFileSync(f, 'utf8')
t = t.replace(
  `    const slots = list.map(rowId => {
      const row = slots.current.get(rowId)
      return row === undefined ? Number.NaN : row.getBoundingClientRect().top
    })`,
  `    // NOTE: must not be called "slots" — that name is the ref above, and shadowing it made the
    // pointerdown handler throw (TDZ), which is why dragging stopped working entirely.
    const slotTops = list.map(rowId => {
      const row = slots.current.get(rowId)
      return row === undefined ? Number.NaN : row.getBoundingClientRect().top
    })`,
)
t = t.replace(
  `    setDrag({ id, index, startY: event.clientY, step: height + gap, centres, slots })`,
  `    setDrag({ id, index, startY: event.clientY, step: height + gap, centres, slots: slotTops })`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('reorder: 修掉 slots 遮蔽')
