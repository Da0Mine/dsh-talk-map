import fs from 'node:fs'
const file = 'src/client/StatusRail.tsx'
let text = fs.readFileSync(file, 'utf8')

// Module-level open store: survives a remount and does not depend on a local setState
// landing (which is what silently kept the rail shut).
text = text.replace(
  "function readOpen(): boolean {",
  "let openState: boolean | undefined\nconst openListeners = new Set<() => void>()\n\nfunction subscribeOpen(listener: () => void): () => void {\n  openListeners.add(listener)\n  return () => { openListeners.delete(listener) }\n}\n\nfunction openSnapshot(): boolean {\n  if (openState === undefined) openState = readOpen()\n  return openState\n}\n\nfunction setOpenState(next: boolean): void {\n  openState = next\n  writeOpen(next)\n  for (const listener of openListeners) listener()\n}\n\nfunction readOpen(): boolean {"
)

text = text.replace(
  "  const [open, setOpen] = useState<boolean>(() => readOpen())\n",
  "  const open = useSyncExternalStore(subscribeOpen, openSnapshot, openSnapshot)\n",
)
text = text.replace(
  "  const toggle = useCallback(() => {\n    setOpen((current) => {\n      writeOpen(!current)\n      return current\n    })\n  }, [])",
  "  const toggle = useCallback(() => {\n    setOpenState(!openSnapshot())\n  }, [])",
)
text = text.replace(
  "import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'",
  "import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'",
)
fs.writeFileSync(file, text, 'utf8')
console.log('open state moved to a module store')
