import fs from 'node:fs'
const f = 'src/client/index.ts'
let t = fs.readFileSync(f, 'utf8')
// dsh-meme（宿主上已工作的插件）给 settings.section 传的是字符串 label；函数只在
// sidebar.footer.action 上验证过。改成字符串，避免设置页导航读到函数渲染空白。
t = t.replace("      label: () => t('remote.section'),", "      label: t('remote.section'),")
fs.writeFileSync(f, t, 'utf8')
console.log('settings.section label -> string')
