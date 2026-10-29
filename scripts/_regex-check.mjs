/** Scratch: does the inline regex match a code span, and in what order? */
const INLINE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(__[^_]+__)|(\*[^*]+\*)|(_[^_]+_)|(~~[^~]+~~)|(\[[^\]]+\]\([^)]+\))/g
const text = '用 **物理参数** 换算，见 `PX_PER_M` 与 [文档](https://x)'
for (const m of text.matchAll(INLINE)) {
  console.log(JSON.stringify(m[0]), 'at', m.index)
}
