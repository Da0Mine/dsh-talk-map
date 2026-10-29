import fs from 'node:fs'

const file = 'lib/index.js'
let source = fs.readFileSync(file, 'utf8')

const oldBlock = `			runtime.search = async (query) => {
				const corpus = runtime.sessionQuery;
				if (corpus === void 0) throw new Error("sessionQuery unavailable");
				const page = await corpus.searchSessions(
					{ query, limit: 20 },
					{ signal: new AbortController().signal }
				);
				const items = (page?.items ?? []).map((hit) => ({
					sessionId: hit?.header?.id ?? hit?.sessionId ?? "",
					snippet: hit?.bestMatch?.snippet ?? ""
				})).filter((item) => item.sessionId !== "");
				return { items, hasMore: page?.nextCursor !== void 0 };
			};`

const newBlock = `			/**
			 * Full-text search grouped BY CONVERSATION: one entry per session, each
			 * carrying every matched line (up to SEARCH_LINES_PER_SESSION). The session
			 * page first says which conversations matched; searchEvents then collects
			 * the individual hits inside each of them.
			 */
			runtime.search = async (query) => {
				const corpus = runtime.sessionQuery;
				if (corpus === void 0) throw new Error("sessionQuery unavailable");
				const signal = new AbortController().signal;
				const page = await corpus.searchSessions({ query, limit: 12 }, { signal });
				const sessions = (page?.items ?? []).map((hit) => hit?.header?.id ?? hit?.sessionId ?? "").filter((id) => id !== "");
				const items = [];
				for (const sessionId of sessions) {
					const lines = [];
					try {
						const events = await corpus.searchEvents({ sessionId, query, limit: 5 }, { signal });
						for (const event of events?.items ?? []) {
							const snippet = typeof event?.snippet === "string" ? event.snippet.trim() : "";
							if (snippet !== "" && !lines.includes(snippet)) lines.push(snippet);
						}
					} catch {}
					if (lines.length === 0) {
						const best = (page.items ?? []).find((hit) => (hit?.header?.id ?? hit?.sessionId) === sessionId);
						const snippet = best?.bestMatch?.snippet;
						if (typeof snippet === "string" && snippet.trim() !== "") lines.push(snippet.trim());
					}
					if (lines.length > 0) items.push({ sessionId, lines });
				}
				return { items, hasMore: page?.nextCursor !== void 0 };
			};`

if (!source.includes(oldBlock)) {
  console.error('host search block not found')
  process.exit(1)
}
source = source.replace(oldBlock, newBlock)
fs.writeFileSync(file, source, 'utf8')
console.log('host search groups lines per session')
