import fs from 'node:fs'

// 1) 地图卡片改用共享组件（渲染完全一致）
{
  const f = 'src/client/SessionCard.tsx'
  let t = fs.readFileSync(f, 'utf8')
  const start = t.indexOf(`              <span className={styles['cardPin']}`)
  const end = t.indexOf(`              </span>\n            )`, start)
  if (start < 0 || end < 0) throw new Error('map pin block not found')
  const block = t.slice(start, end + `              </span>\n`.length)
  t = t.replace(block, '              <PinMark />\n')
  t = t.replace(`import { t } from './i18n.ts'`, `import { PinMark } from './PinMark.tsx'\nimport { t } from './i18n.ts'`)
  fs.writeFileSync(f, t, 'utf8')
  console.log('SessionCard: 使用 PinMark')
}

// 2) 两侧栏：📌 → PinMark（放在标题前，与地图一致）
{
  for (const f of ['src/client/StatusRail.tsx', 'src/client/SidebarQueue.tsx']) {
    let t = fs.readFileSync(f, 'utf8')
    t = t.replace(/import \{ isPinnedSession, localPins \} from '\.\/pins\.ts'/,
      `import { PinMark } from './PinMark.tsx'\nimport { isPinnedSession, localPins } from './pins.ts'`)
    // 标题前插入
    t = t.replace(
      /<span className=\{styles\['cardTitle'\]\}>\{([a-zA-Z.]+)\}<\/span>\n(\s*)\{isPinnedSession\(localPinSet, ([a-zA-Z.]+)\.sessionId\)\n\s*\? <span className=\{styles\['cardPinIcon'\]\} title="已置顶" aria-hidden="true">📌<\/span>\n\s*: null\}/g,
      `<span className={styles['cardTitle']}>{$1}</span>`,
    )
    // 通用：把标题所在 div 改成"图标 + 标题"
    t = t.replace(
      /<span className=\{styles\['cardTitle'\]\}>\{([a-zA-Z.]+)\}<\/span>/g,
      `<>\n        {isPinnedSession(localPinSet, $1 === ${JSON.stringify('')} ? '' : $1) ? <PinMark /> : null}\n        <span className={styles['cardTitle']}>{$1}</span>\n      </>`,
    )
    fs.writeFileSync(f, t, 'utf8')
  }
  console.log('两侧栏: PinMark')
}
