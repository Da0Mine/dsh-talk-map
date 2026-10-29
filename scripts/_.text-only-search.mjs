/** Search only the conversation text (user + assistant), never tool detail. */
import fs from 'node:fs'

const file = 'lib/index.js'
let source = fs.readFileSync(file, 'utf8')

// ---- search: drop sessions whose best match is not conversation text ----
const oldMap = `				const items = (page?.items ?? []).map((hit) => {
					const best = hit?.bestMatch;
					const snippet = typeof best?.snippet === "string" ? best.snippet.trim() : "";
					const line = snippet.split(/\\r?\\n/).map((part) => part.trim()).find((part) => part !== "") ?? "";
					const header = hit?.header ?? {};
					// A sub-agent session is the one a tool/agent spawned: the header
					// says so (origin) and carries its delegation depth.
					const subagent = header?.origin === "subagent"
						|| typeof header?.delegationDepth === "number"
						|| header?.parentSession !== void 0;
					return {
						sessionId: header?.id ?? hit?.sessionId ?? "",
						blocks: line === "" ? [] : [[line]],
						seqs: [typeof best?.seq === "number" ? best.seq : null],
						agent: subagent ? "subagent" : "main",
						depth: typeof header?.delegationDepth === "number" ? header.delegationDepth : 0
					};
				}).filter((item) => item.sessionId !== "" && item.blocks.length > 0);`
const newMap = `				// Only what the transcript actually shows: your messages and the
				// assistant's answers. Tool arguments, tool output, system/developer
				// envelopes are noise — and skipping them also makes the query cheaper.
				const searchable = new Set(["user/message", "assistant/message"]);
				const items = (page?.items ?? []).map((hit) => {
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
if (!source.includes(oldMap)) {
  console.error('search map block not found')
  process.exit(1)
}
source = source.replace(oldMap, newMap)

// ---- per-session hits: same restriction --------------------------------
source = source.replace(
  'const events = await corpus.searchEvents({ sessionId, query, limit: 6 }, { signal });',
  `const events = await corpus.searchEvents(
					{
						sessionId, query, limit: 6,
						filters: [{ kind: "type", values: ["user/message", "assistant/message"] }]
					},
					{ signal }
				);`,
)

fs.writeFileSync(file, source, 'utf8')
console.log('host: search restricted to conversation text')
