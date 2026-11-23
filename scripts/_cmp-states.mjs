import fs from 'node:fs'
const read = p => fs.readFileSync(p)
const a = read('test/shots/state-rest.png'), b = read('test/shots/state-frozen.png')
console.log('rest 字节:', a.length, ' frozen 字节:', b.length, ' 完全相同:', a.equals(b))
