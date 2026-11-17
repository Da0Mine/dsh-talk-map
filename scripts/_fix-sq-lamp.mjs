import fs from 'node:fs'
// 1) 导出 LAMP_CLASS
const sc = 'src/client/SessionCard.tsx'
let s = fs.readFileSync(sc, 'utf8')
s = s.replace('const LAMP_CLASS: Record<CardGlow, string> = {', 'export const LAMP_CLASS: Record<CardGlow, string> = {')
fs.writeFileSync(sc, s, 'utf8')

// 2) SidebarQueue 用真正的 LAMP_CLASS（cardLamp*），删掉自造的那张表
const f = 'src/client/SidebarQueue.tsx'
let t = fs.readFileSync(f, 'utf8')
t = t.replace(
  `/** Matches the rail's mapping of a lamp to its card class. */
const LAMP_CLASS: Record<CardGlow, string> = {
  running: 'cardGlowRunning',
  waiting: 'cardGlowWaiting',
  done: 'cardGlowDone',
  error: 'cardGlowError',
}

`,
  '',
)
t = t.replace(
  "import { LAMP_CHIP, relativeTime } from './SessionCard.tsx'",
  "import { LAMP_CHIP, LAMP_CLASS, relativeTime } from './SessionCard.tsx'",
)
fs.writeFileSync(f, t, 'utf8')
console.log('LAMP_CLASS exported and reused')
