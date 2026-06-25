// One-off avatar fetcher: pulls each seed operator's head icon from the vallov CDN
// into web/public/avatars/<slug>.webp (Vite serves /public at the web root, so the
// SPA references /avatars/<slug>.webp). Re-run after a seed change. See docs/wiki/data.md.
//
// Source: https://reend.vallov.com/characters/ — CDN cdn.vallov.com/characters/<slug>/icon.webp.
// Slugs match seed.json 1:1. Missing icons are skipped; the SPA shows a monogram fallback.
//
// Usage: node tools/seed/avatars.mjs
import { readFile, writeFile, mkdir } from "node:fs/promises";

const CDN = "https://cdn.vallov.com/characters/";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

// CDN slug differs from our seed slug for a few operators.
const ALIAS = { mifu: "mi-fu" };

const seed = JSON.parse(await readFile(new URL("seed.json", import.meta.url)));
const slugs = Object.keys(seed.operators).sort();
const outDir = new URL("../../web/public/avatars/", import.meta.url);
await mkdir(outDir, { recursive: true });

let ok = 0;
const missing = [];
for (const slug of slugs) {
	const res = await fetch(`${CDN}${ALIAS[slug] ?? slug}/icon.webp`, { headers: { "user-agent": UA } });
	if (!res.ok || !res.headers.get("content-type")?.startsWith("image/")) {
		missing.push(slug);
		continue;
	}
	const buf = Buffer.from(await res.arrayBuffer());
	await writeFile(new URL(`${slug}.webp`, outDir), buf);
	ok++;
}

console.log(`wrote ${ok}/${slugs.length} avatars -> ${outDir.pathname}`);
if (missing.length) console.warn(`no icon (monogram fallback): ${missing.join(", ")}`);
