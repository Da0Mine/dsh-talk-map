import fs from 'node:fs'
const file = 'src/client/MapCanvas.tsx'
let text = fs.readFileSync(file, 'utf8')

// 1) 引入读文本的 helper
text = text.replace(
  "import { draftWatch } from './draft-watch.ts'",
  "import { draftWatch, readDraftTexts } from './draft-watch.ts'",
)

// 2) 草稿文本快照：跟随 draftWatch 的刷新节拍（1.5s）重读，只有内容变化才 setState
text = text.replace(
  "  const draftSessions = useSyncExternalStore(draftWatch.subscribe, draftWatch.getSnapshot)",
  `  const draftSessions = useSyncExternalStore(draftWatch.subscribe, draftWatch.getSnapshot)
  // 待发送时卡片正文显示"将要发出去的那句话"，而不是上一句已发送的。
  const [draftTexts, setDraftTexts] = useState<Record<string, string>>(() => readDraftTexts())`,
)
fs.writeFileSync(file, text, 'utf8')
console.log('MapCanvas: import + state added')
