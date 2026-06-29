// One-off recipe/yield scraper: pulls Spaceship manufacture + grow-cabin formulas from
// EndfieldTableCfg (same repo as the PS constants) into recipes.json. Faithful extractor
// — no throughput math (that step is inferred and lives in the resolver). Re-run on a
// game patch. See docs/wiki/data.md § "Recipe/yield tables".
//
// Usage: node tools/seed/recipes.mjs
import { writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

const BASE = "https://raw.githubusercontent.com/Niesc-F/EndfieldTableCfg/main/TableCfg/";

async function get(file) {
	const res = await fetch(BASE + file);
	if (!res.ok) throw new Error(`GET ${file} -> HTTP ${res.status}`);
	return res.json();
}

// roomAttrType -> target slug. Every manufacture attrType is room_produce_rate; the number
// only distinguishes the produced item class, so it doubles as the target_priority key.
const TARGET = {
	16: "exp",
	17: "weapon_exp",
	3: "char_material",
	4: "skill_material",
	5: "weapon_material",
};

const [mfg, grow] = await Promise.all([
	get("SpaceshipManufactureFormulaTable.json"),
	get("SpaceshipGrowCabinFormulaTable.json"),
]);

const recipes = {};
for (const r of Object.values(mfg)) {
	recipes[r.id] = {
		id: r.id, roomType: "manufacture", attrType: r.roomAttrType,
		target: TARGET[r.roomAttrType] ?? String(r.roomAttrType),
		level: r.level, outItem: r.outcomeItemId, out: r.perCapacity, progress: r.totalProgress,
	};
}
for (const r of Object.values(grow)) {
	recipes[r.id] = {
		id: r.id, roomType: "grow", attrType: r.roomAttrType,
		target: TARGET[r.roomAttrType] ?? String(r.roomAttrType),
		level: r.level, outItem: r.outcomeItemId, out: r.outcomeItemCount, progress: r.totalProgress,
		seedItem: r.seedItemId, seedCount: r.seedItemCount,
	};
}

const data = {
	_meta: { source: BASE, fetchedAt: new Date().toISOString(), count: Object.keys(recipes).length },
	recipes,
};
const out = new URL("recipes.json", import.meta.url);
await writeFile(out, JSON.stringify(data, null, "\t") + "\n");
console.log(`wrote ${data._meta.count} recipes -> ${out.pathname}`);

// Self-check: regression guard on values verified live at build time.
assert(data._meta.count >= 23, `expected >=23 recipes, got ${data._meta.count}`);
const w = Object.values(recipes).find((r) => r.target === "weapon_exp" && r.out === 1);
assert(w && /weapon_expcard/.test(w.outItem), `weapon_exp recipe missing or wrong: ${JSON.stringify(w)}`);
const targets = [...new Set(Object.values(recipes).map((r) => r.target))].sort();
assert(targets.length === 5, `expected 5 targets, got ${targets}`);
console.log(`self-check passed; targets: ${targets.join(", ")}`);
