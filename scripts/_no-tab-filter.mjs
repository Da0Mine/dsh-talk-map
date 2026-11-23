import fs from 'node:fs'
const f = 'src/client/StatusRail.tsx'
let t = fs.readFileSync(f, 'utf8')
// 删除把手玻璃 effect
const start = t.indexOf('  // The handle only carries its own glass while the rail is closed.')
if (start >= 0) {
  const end = t.indexOf('  }, [open])', start)
  if (end < 0) throw new Error('tab effect end missing')
  t = t.slice(0, start) + t.slice(end + '  }, [open])'.length + 1)
}
t = t.replace("      ref={tabRef}\n", '')
t = t.replace('  const tabRef = useRef<HTMLButtonElement | null>(null)\n', '')
fs.writeFileSync(f, t, 'utf8')
console.log('把手：滤镜整体移除（只留图标）')
