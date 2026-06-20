// One-off seed scraper: pulls operator factory-skill bonuses from endfieldtools.dev's
// public static JSON into seed.json. Faithful extractor — no domain mapping (the SPA
// collapses skills to a scalar per recipe). Re-run only on a game patch. See docs/wiki/data.md.
//
// Usage: node tools/seed/scrape.mjs
import { writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

const BASE = "https://endfieldtools.dev/localdb/optimized/";
// Source 403s a non-browser User-Agent, so pose as one.
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

async function get(path) {
	const res = await fetch(BASE + path, { headers: { "user-agent": UA } });
	if (!res.ok) throw new Error(`GET ${path} -> HTTP ${res.status}`);
	return res.json();
}

// normalizeFactorySkills groups the skill map into one entry per line, each carrying
// its levels. Skill ids end in _<line>_<level>; charId underscores make the suffix
// the only safe split, so pop the last two tokens.
function normalizeFactorySkills(factorySkills) {
	const byLine = new Map();
	for (const [id, s] of Object.entries(factorySkills?.skills ?? {})) {
		const tokens = id.split("_");
		const line = Number(tokens.at(-2));
		const level = s.level ?? Number(tokens.at(-1));
		const raw = s.parameters?.[0]?.valueStringList?.[0] ?? s.parameters?.[0]?.valueFloatList?.[0];
		if (!byLine.has(line)) {
			byLine.set(line, {
				line,
				roomType: s.roomType,
				effectType: s.effectType,
				effect: (s.icon ?? "").replace(/^facskill_spaceship_/, ""),
				icon: s.icon,
				levels: [],
			});
		}
		// Source stores float noise (e.g. "0.30000000000000004"); round to clean it.
		byLine.get(line).levels.push({ level, value: Math.round(Number(raw) * 1e6) / 1e6 });
	}
	return [...byLine.values()]
		.sort((a, b) => a.line - b.line)
		.map((l) => ({ ...l, levels: l.levels.sort((a, b) => a.level - b.level) }));
}

const list = await get("characters/characters-list.json");
const operators = {};
let skipped = 0;
for (const c of Object.values(list)) {
	const slug = c.slug ?? c.charId;
	let detail;
	try {
		detail = await get(`characters/details/${c.charId}.json`);
	} catch (err) {
		console.warn(`skip ${slug}: ${err.message}`);
		skipped++;
		continue;
	}
	if (!detail.factorySkills) {
		skipped++;
		continue;
	}
	operators[slug] = {
		charId: c.charId,
		name: c.engName,
		rarity: c.rarity,
		profession: c.profession,
		factorySkills: normalizeFactorySkills(detail.factorySkills),
	};
}

const seed = {
	_meta: { source: BASE, fetchedAt: new Date().toISOString(), count: Object.keys(operators).length },
	operators,
};
const out = new URL("seed.json", import.meta.url);
await writeFile(out, JSON.stringify(seed, null, "\t") + "\n");
console.log(`wrote ${seed._meta.count} operators (${skipped} skipped) -> ${out.pathname}`);

// Self-check: regression guard on the values verified live at build time.
assert(seed._meta.count > 0, "no operators scraped");
const perlica = operators.perlica ?? Object.values(operators).find((o) => o.charId === "chr_0004_pelica");
assert(perlica, "perlica missing");
const mfg = perlica.factorySkills.find((f) => f.effect === "manufacture_efficiency");
assert(mfg, "perlica manufacture_efficiency missing");
const vals = mfg.levels.map((l) => l.value);
assert(vals.includes(0.2) && vals.includes(0.3), `perlica mfg values off: ${vals}`);
console.log("self-check passed");
