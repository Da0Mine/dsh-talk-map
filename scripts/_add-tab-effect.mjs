import fs from 'node:fs'
const f = 'src/client/StatusRail.tsx'
const lines = fs.readFileSync(f, 'utf8').split('\n')
const at = lines.findIndex(l => l.trim() === 'const tabRef = useRef<HTMLButtonElement | null>(null)')
if (at < 0) throw new Error('tabRef not found')
if (!lines.some(l => l.includes('radius: 14'))) {
  lines.splice(at + 1, 0,
    '',
    '  // The handle that opens the rail is glass too.',
    '  useEffect(() => {',
    '    const element = tabRef.current',
    '    if (element === null) return undefined',
    '    return installLiquidGlass(element, { radius: 14, bezel: 14, thickness: 44, ior: 2.2, scale: 8, specular: 0.26 })',
    '  }, [])',
  )
  fs.writeFileSync(f, lines.join('\n'), 'utf8')
  console.log('tab effect 已插入')
}
