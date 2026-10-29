/** Confirm each hit against the VISIBLE transcript (user text + assistant text). */
import fs from 'node:fs'

const file = 'lib/index.js'
let source = fs.readFileSync(file, 'utf8')

const anchor = `				const page = await corpus.searchSessions(`
if (!source.includes(anchor)) {
  console.error('searchSessions call not found')
  process.exit(1)
}

// insert the excerpt helper right before the search assignment
const helper = `			/** ±80/120 chars around the match, elided like a transcript snippet. */
			const excerptAround = (text, at, length) => {
				const start = Math.max(0, at - 80);
				const end = Math.min(text.length, at + length + 120);
				return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
			};
			/**
			 * Only the text the transcript actually shows: your own messages and the
			 * assistant's answers. Tool arguments and tool output are dropped, so a
			 * conversation that matched only inside a command's stdout disappears.
			 */
			const visibleMatch = async (sessionId, query) => {
				const docs = await corpus.filterEvents(sessionId, [
					{ kind: "type", values: ["user/message", "assistant/message"] },
					{ kind: "text", text: query }
				]);
				const needle = query.toLowerCase();
				for (const doc of docs ?? []) {
					const text = typeof doc?.text === "string" ? doc.text : "";
					const at = text.toLowerCase().indexOf(needle);
					if (at < 0) continue;
					return {
						line: excerptAround(text, at, query.length),
						seq: typeof doc.seq === "number" ? doc.seq : null
					};
				}
				return null;
			};
`
source = source.replace('			runtime.search = async (query, cwd) => {', helper + '			runtime.search = async (query, cwd) => {')

// replace the mapping body with verify-then-accept
const oldBody = `				const items = (page?.items ?? []).map((hit) => {
					const best = hit?.bestMatch;
					if (best !== void 0 && typeof best?.type === "string" && !searchable.has(best.type)) return null;
					const snippet = typeof best?.snippet === "string" ? best.snippet.trim() : "";
					const line = snippet.split(/\\r?\\n/).map((part) => part.trim()).find((part) => part !== "") ?? "";
					const header = hit?.header ?? {};
					return {
						sessionId: header?.id ?? hit?.sessionId ?? "",
						blocks: line === "" ? [] : [[line]],
						seqs: [typeof best?.seq === "number" ? best.seq : null]
					};
				}).filter((item) => item !== null && item.sessionId !== "" && item.blocks.length > 0);`
const newBody = `				const candidates = (page?.items ?? []).map((hit) => {
					const best = hit?.bestMatch;
					const snippet = typeof best?.snippet === "string" ? best.snippet.trim() : "";
					const line = snippet.split(/\\r?\\n/).map((part) => part.trim()).find((part) => part !== "") ?? "";
					return {
						sessionId: hit?.header?.id ?? hit?.sessionId ?? "",
						type: typeof best?.type === "string" ? best.type : "",
						line,
						seq: typeof best?.seq === "number" ? best.seq : null
					};
				}).filter((entry) => entry.sessionId !== "");
				// Verify the strongest hits against the visible transcript (in parallel,
				// capped) and take the snippet from there.
				const verified = await Promise.all(candidates.slice(0, 6).map(async (entry) => {
					if (entry.type !== "" && !searchable.has(entry.type)) return null;
					try {
						const match = await visibleMatch(entry.sessionId, query);
						if (match === null) return null;
						return { sessionId: entry.sessionId, blocks: [[match.line]], seqs: [match.seq] };
					} catch {
						return entry.line === "" ? null : { sessionId: entry.sessionId, blocks: [[entry.line]], seqs: [entry.seq] };
					}
				}));
				const items = verified.filter((item) => item !== null);`
if (!source.includes(oldBody)) {
  console.error('search body not found')
  process.exit(1)
}
source = source.replace(oldBody, newBody)

fs.writeFileSync(file, source, 'utf8')
console.log('host: hits verified against the visible transcript')
