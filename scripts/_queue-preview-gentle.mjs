import fs from 'node:fs'
const f = 'src/client/SidebarQueue.tsx'
let t = fs.readFileSync(f, 'utf8')

// 1) 初始正文直接用缓存（重启后立即有字）
if (!t.includes('readPreviewTexts')) {
  t = t.replace(
    `import { sessionActivity } from './session-activity.ts'`,
    `import { readPreviewTexts } from './preview-cache.ts'\nimport { sessionActivity } from './session-activity.ts'`,
  )
  t = t.replace(
    /const \[previews, setPreviews\] = useState<Record<string, string>>\(\{\}\)/,
    `const [previews, setPreviews] = useState<Record<string, string>>(readPreviewTexts)`,
  )
}

// 2) 一次最多 5 张、分两次请求，别把宿主一次压 24 个会话表面
t = t.replace(
  `    const wanted = [...pick(rows, PREVIEW_LIMIT), ...pick(recentRows, 10)]`,
  `    const wanted = [...pick(rows, PREVIEW_PAGE), ...pick(recentRows, PREVIEW_PAGE)].slice(0, PREVIEW_PAGE * 2)`,
)
if (!t.includes('PREVIEW_PAGE')) {
  t = t.replace(
    `const PREVIEW_LIMIT = 14`,
    `const PREVIEW_LIMIT = 14
/** Reads are expensive (one session surface each): ask for a few, then the next effect pass. */
const PREVIEW_PAGE = 5`,
  )
}
fs.writeFileSync(f, t, 'utf8')
console.log('SidebarQueue: 缓存播种 + 每次 5 张')
