import fs from 'node:fs'
const f = 'src/client/SidebarQueue.tsx'
let t = fs.readFileSync(f, 'utf8')
t = t.replace(
  `import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'`,
  `import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'`,
)
fs.writeFileSync(f, t, 'utf8')
console.log('SidebarQueue: 补 useCallback')
