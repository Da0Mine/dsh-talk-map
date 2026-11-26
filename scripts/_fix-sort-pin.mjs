import fs from 'node:fs'

// ---------- 1) 冻结行位置，消除让位抽搐 ----------
{
  const f = 'src/client/reorder.ts'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(
    `interface DragState {
  id: string
  index: number
  startY: number
  /** Row height + gap, measured at the press. */
  step: number
}`,
    `interface DragState {
  id: string
  index: number
  startY: number
  /** Row height + gap, measured at the press. */
  step: number
  /** Row centres captured ONCE at the press: re-measuring while rows slide is what made the
   *  neighbours jitter back and forth (the measurement fed the shift that changed it). */
  centres: number[]
}`,
  )
  t = t.replace(
    `    setDrag({ id, index, startY: event.clientY, step: height + gap })`,
    `    const centres = list.map(rowId => {
      const row = slots.current.get(rowId)
      if (row === undefined) return Number.NaN
      const rect = row.getBoundingClientRect()
      return rect.top + rect.height / 2
    })
    setDrag({ id, index, startY: event.clientY, step: height + gap, centres })`,
  )
  t = t.replace(
    `    const onMove = (event: PointerEvent): void => {
      setOffsetY(event.clientY - drag.startY)
      const list = idsRef.current
      let target = drag.index
      let bestDistance = Number.POSITIVE_INFINITY
      list.forEach((id, index) => {
        const element = slots.current.get(id)
        if (element === undefined) return
        const rect = element.getBoundingClientRect()
        const distance = Math.abs(event.clientY - (rect.top + rect.height / 2))
        if (distance < bestDistance) {
          bestDistance = distance
          target = index
        }
      })
      setHover(target)
    }`,
    `    const onMove = (event: PointerEvent): void => {
      setOffsetY(event.clientY - drag.startY)
      // Pick the row whose captured centre is nearest — measured positions never move, so the
      // target index is stable while the rows animate.
      let target = drag.index
      let bestDistance = Number.POSITIVE_INFINITY
      drag.centres.forEach((centre, index) => {
        if (Number.isNaN(centre)) return
        const distance = Math.abs(event.clientY - centre)
        if (distance < bestDistance) {
          bestDistance = distance
          target = index
        }
      })
      setHover(target)
    }`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('reorder: 按下时冻结行中心')
}

// ---------- 2) 查看摘要不再被父组件卸载 ----------
{
  const f = 'src/client/rail-menu.tsx'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(
    `      .then((result) => {
        setDigest({ title: props.target.title, digest: result.digest })
        props.onClose()
      })`,
    `      .then((result) => {
        // Keep this component mounted: the dialog is rendered by it, and closing the menu here
        // unmounted the dialog with it (that is why 查看摘要 looked like a no-op).
        setDigest({ title: props.target.title, digest: result.digest })
      })`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('rail-menu: 摘要弹窗保持挂载')
}

// ---------- 3) 置顶要能看出效果：置顶卡排到最前 ----------
{
  const f = 'src/client/queue-order.ts'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(
    `export function queueRank(lamp: CardGlow | undefined, draft: boolean): number {`,
    `export function queueRank(lamp: CardGlow | undefined, draft: boolean, pinned = false): number {
  // Pinned first: otherwise flipping 置顶 changed nothing visible in a rail.
  if (pinned) return -1`,
  )
  t = t.replace(
    `export interface QueueSortable {
  lamp?: CardGlow
  draft?: boolean`,
    `export interface QueueSortable {
  lamp?: CardGlow
  draft?: boolean
  pinned?: boolean`,
  )
  t = t.replace(
    `  const byRank = queueRank(a.lamp, a.draft === true) - queueRank(b.lamp, b.draft === true)`,
    `  const byRank = queueRank(a.lamp, a.draft === true, a.pinned === true) - queueRank(b.lamp, b.draft === true, b.pinned === true)`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('queue-order: 置顶排最前')
}
