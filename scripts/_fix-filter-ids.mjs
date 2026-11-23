import fs from 'node:fs'
// 1) liquid-glass.ts：每个实例独立 id
{
  const f = 'src/client/liquid-glass.ts'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(
    `const FILTER_ID = 'dsh-talk-map-liquid-glass'
const SVG_ID = 'dsh-talk-map-liquid-glass-svg'`,
    `const BASE_ID = 'dsh-talk-map-liquid-glass'
/** Each install gets its own id: sharing one made the later filter shadow the earlier one. */
let instanceSeq = 0`,
  )
  t = t.replace(
    `function supportsRefraction(): boolean {
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return false
  return CSS.supports('backdrop-filter', \`url(#\${FILTER_ID})\`) || CSS.supports('-webkit-backdrop-filter', \`url(#\${FILTER_ID})\`)
}`,
    `function supportsRefraction(): boolean {
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return false
  return CSS.supports('backdrop-filter', \`url(#\${BASE_ID})\`) || CSS.supports('-webkit-backdrop-filter', \`url(#\${BASE_ID})\`)
}`,
  )
  t = t.replace(
    `  let svg: SVGSVGElement | undefined
  let frame = 0`,
    `  instanceSeq += 1
  const filterId = \`\${BASE_ID}-\${instanceSeq}\`
  const svgId = \`\${BASE_ID}-svg-\${instanceSeq}\`

  let svg: SVGSVGElement | undefined
  let frame = 0`,
  )
  t = t.replace('svg.setAttribute(\'id\', SVG_ID)', "svg.setAttribute('id', svgId)")
  t = t.replace('filterMarkup(FILTER_ID, geometry', 'filterMarkup(filterId, geometry')
  t = t.replace("const filters = [`url(#${FILTER_ID})`]", "const filters = [`url(#${filterId})`]")
  fs.writeFileSync(f, t, 'utf8')
  console.log('liquid-glass: 独立 id')
}
// 2) StatusRail：只在画布内起手才冻结 + 看门狗
{
  const f = 'src/client/StatusRail.tsx'
  let t = fs.readFileSync(f, 'utf8')
  t = t.replace(
    `    const onDown = (): void => { railFrozen.freeze() }`,
    `    // Only a press that starts inside the map area freezes the glass; a press anywhere else
    // (host sidebar, buttons) would otherwise leave the rail stuck without refraction.
    const onDown = (event: PointerEvent): void => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('[class*="canvas"]') === null && target.closest('.react-flow') === null) return
      railFrozen.freeze()
      // Watchdog: a lost pointerup must not cost the refraction until the next click.
      railFrozen.thaw(4000)
    }`,
  )
  fs.writeFileSync(f, t, 'utf8')
  console.log('StatusRail: 冻结范围与看门狗')
}
