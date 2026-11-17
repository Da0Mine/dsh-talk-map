import fs from 'node:fs'
const file = 'src/client/SidebarQueue.tsx'
let t = fs.readFileSync(file, 'utf8')
t = t.replace(
  "import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'",
  "import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'",
)
t = t.replace(
  "  const askedRef = { current: new Set<string>() } as { current: Set<string> }",
  "  const askedRef = useRef<Set<string>>(new Set())",
)
fs.writeFileSync(file, t, 'utf8')
console.log('useRef fixed')
