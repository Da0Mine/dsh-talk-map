/** Host: each hit becomes a 3-line context window (one line above/below). */
import fs from 'node:fs'

const file = 'lib/index.js'
const lines = fs.readFileSync(file, 'utf8').split('\n')
const start = lines.findIndex(line => line.includes('runtime.search = async (query) => {'))
if (start < 0) {
  console.error('start not found')
  process.exit(1)
}
// back up to the jsdoc comment that introduces it
let blockStart = start
while (blockStart > 0 && lines[blockStart - 1].trim().startsWith('*')) blockStart -= 1
while (blockStart > 0 && lines[blockStart - 1].trim() === '/**') blockStart -= 1
let end = start
while (end < lines.length && !lines[end].trim().startsWith('};')) end += 1
if (end >= lines.length) {
  console.error('end not found')
  process.exit(1)
}

const block = `\t\t\t/**
\t\t\t * Full-text search grouped BY CONVERSATION. Each hit carries the matched
\t\t\t * line PLUS one line above and below it: a snippet alone is too little to
\t\t\t * recognise the passage.
\t\t\t */
\t\t\truntime.search = async (query) => {
\t\t\t\tconst corpus = runtime.sessionQuery;
\t\t\t\tif (corpus === void 0) throw new Error("sessionQuery unavailable");
\t\t\t\tconst signal = new AbortController().signal;
\t\t\t\t// The matched line plus its neighbours, capped around the match itself.
\t\t\t\tconst contextLines = (text, needle) => {
\t\t\t\t\tconst trimmed = String(text ?? "").trim();
\t\t\t\t\tif (trimmed === "") return [];
\t\t\t\t\tconst lines = trimmed.split(/\\r?\\n/);
\t\t\t\t\tconst wanted = needle.toLowerCase();
\t\t\t\t\tlet index = lines.findIndex((line) => line.toLowerCase().includes(wanted));
\t\t\t\t\tif (index < 0) index = 0;
\t\t\t\t\tconst from = Math.max(0, index - 1);
\t\t\t\t\tconst to = Math.min(lines.length - 1, index + 1);
\t\t\t\t\treturn lines.slice(from, to + 1).map((line) => {
\t\t\t\t\t\tconst value = line.trim();
\t\t\t\t\t\tif (value.length <= 200) return value;
\t\t\t\t\t\tconst at = Math.max(0, value.toLowerCase().indexOf(wanted));
\t\t\t\t\t\treturn (at > 90 ? "…" : "") + value.slice(Math.max(0, at - 90), at + 110) + "…";
\t\t\t\t\t}).filter((line) => line !== "");
\t\t\t\t};
\t\t\t\tconst page = await corpus.searchSessions({ query, limit: 12 }, { signal });
\t\t\t\tconst matched = (page?.items ?? [])
\t\t\t\t\t.map((hit) => ({ id: hit?.header?.id ?? hit?.sessionId ?? "", best: hit?.bestMatch?.snippet ?? "" }))
\t\t\t\t\t.filter((entry) => entry.id !== "");
\t\t\t\tconst items = [];
\t\t\t\tfor (const entry of matched) {
\t\t\t\t\tconst blocks = [];
\t\t\t\t\ttry {
\t\t\t\t\t\tconst events = await corpus.searchEvents({ sessionId: entry.id, query, limit: 4 }, { signal });
\t\t\t\t\t\tfor (const hit of events?.items ?? []) {
\t\t\t\t\t\t\tlet text = "";
\t\t\t\t\t\t\ttry {
\t\t\t\t\t\t\t\tconst window = await corpus.readEvent({ sessionId: entry.id, seq: hit.seq }, signal);
\t\t\t\t\t\t\t\ttext = textOfBlocks(window?.target?.data?.message?.content ?? []);
\t\t\t\t\t\t\t} catch {}
\t\t\t\t\t\t\tif (text === "") text = String(hit.snippet ?? "");
\t\t\t\t\t\t\tconst block = contextLines(text, query);
\t\t\t\t\t\t\tif (block.length > 0) blocks.push(block);
\t\t\t\t\t\t}
\t\t\t\t\t} catch {}
\t\t\t\t\tif (blocks.length === 0 && typeof entry.best === "string" && entry.best.trim() !== "") {
\t\t\t\t\t\tblocks.push([entry.best.trim()]);
\t\t\t\t\t}
\t\t\t\t\tif (blocks.length > 0) items.push({ sessionId: entry.id, blocks });
\t\t\t\t}
\t\t\t\treturn { items, hasMore: page?.nextCursor !== void 0 };
\t\t\t};`

const next = [...lines.slice(0, blockStart), block, ...lines.slice(end + 1)]
fs.writeFileSync(file, next.join('\n'), 'utf8')
console.log(`replaced lines ${blockStart + 1}..${end + 1}`)
