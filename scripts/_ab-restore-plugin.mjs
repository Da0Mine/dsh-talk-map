import fs from 'node:fs'
const prof = process.env.USERPROFILE + '\\.dsh\\profiles\\desktop'
const backups = fs.readdirSync(prof).filter(n => n.startsWith('package.json.bak-ab-')).sort()
if (backups.length === 0) throw new Error('没有 A/B 备份')
const latest = backups[backups.length - 1]
fs.copyFileSync(`${prof}\\${latest}`, `${prof}\\package.json`)
const text = fs.readFileSync(`${prof}\\package.json`, 'utf8')
console.log('已从', latest, '恢复；包含 dsh-talk-map:', text.includes('dsh-talk-map'))
