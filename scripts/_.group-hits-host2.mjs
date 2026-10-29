import fs from 'node:fs'

const file = 'lib/index.js'
const lines = fs.readFileSync(file, 'utf8').split('\n')
const start = lines.findIndex(line => line.includes('runtime.search = async (query) => {'))
if (start < 0) {
  console.error('start not found')
  process.exit(1)
}
// find the closing "};" of the assignment
let end = start
while (end < lines.length && !lines[end].trim().startsWith('};')) end += 1
if (end >= lines.length) {
  console.error('end not found')
  process.exit(1)
}
const block = `\t\t\t/**
\t\t\t * Full-text search grouped BY CONVERSATION: one entry per session, each
\t\t\t * carrying every matched line. The session page first says which
\t\t\t * conversations matched; searchEvents then collects the hits inside each.
\t\t\t */
\t\t\truntime.search = async (query) => {
\t\t\t\tconst corpus = runtime.sessionQuery;
\t\t\t\tif (corpus === void 0) throw new Error("sessionQuery unavailable");
\t\t\t\tconst signal = new AbortController().signal;
\t\t\t\tconst page = await corpus.searchSessions({ query, limit: 12 }, { signal });
\t\t\t\tconst matched = (page?.items ?? [])
\t\t\t\t\t.map((hit) => ({ id: hit?.header?.id ?? hit?.sessionId ?? "", best: hit?.bestMatch?.snippet ?? "" }))
\t\t\t\t\t.filter((entry) => entry.id !== "");
\t\t\t\tconst items = [];
\t\t\t\tfor (const entry of matched) {
\t\t\t\t\tconst lines = [];
\t\t\t\t\ttry {
\t\t\t\t\t\tconst events = await corpus.searchEvents({ sessionId: entry.id, query, limit: 5 }, { signal });
\t\t\t\t\t\tfor (const event of events?.items ?? []) {
\t\t\t\t\t\t\tconst snippet = typeof event?.snippet === "string" ? event.snippet.trim() : "";
\t\t\t\t\t\t\tif (snippet !== "" && !lines.includes(snippet)) lines.push(snippet);
\t\t\t\t\t\t}
\t\t\t\t\t} catch {}
\t\t\t\t\tif (lines.length === 0 && typeof entry.best === "string" && entry.best.trim() !== "") {
\t\t\t\t\t\tlines.push(entry.best.trim());
\t\t\t\t\t}
\t\t\t\t\tif (lines.length > 0) items.push({ sessionId: entry.id, lines });
\t\t\t\t}
\t\t\t\treturn { items, hasMore: page?.nextCursor !== void 0 };
\t\t\t};`
const next = [...lines.slice(0, start), block, ...lines.slice(end + 1)]
fs.writeFileSync(file, next.join('\n'), 'utf8')
console.log(`replaced lines ${start + 1}..${end + 1}`)
