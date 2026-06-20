# Data

Koutei has **no database**. There are three kinds of state, none of them a DB:

- **Request payload** — the full problem (roster + facilities + target) is sent per
  call and discarded after the response. The engine is stateless. As of Phase 3 the
  payload carries **raw numeric** operator/station values, not game-string ids —
  string→number resolution waits on the seed ([`modules/api.md`](modules/api.md),
  [`decisions/0001-numeric-payload.md`](decisions/0001-numeric-payload.md)).
- **Browser `localStorage`** — the user's roster and level breakpoints, so they
  enter them once. Lives in the client, never on the server.
- **Static game-data seed** — operator factory-skill bonuses, scraped once into a
  committed JSON. Read-only; **bundled by the SPA** (not the Go binary) — the client
  resolves ids→numbers and posts the numeric payload, so the backend stays numeric
  ([`decisions/0001-numeric-payload.md`](decisions/0001-numeric-payload.md)).

## Static seed

Game variables are sourced once into a committed JSON via a one-off scraper.

- **Source** — `https://endfieldtools.dev/localdb/optimized/` (its public static
  JSON: `characters/characters-list.json` + `characters/details/<charId>.json`). Not
  HTML — `fetch` + JSON, no `cheerio`. The endpoint 403s a non-browser `User-Agent`,
  so the scraper sends a browser one.
- **Tooling** — `tools/seed/scrape.mjs` (zero-dependency Node ESM, global `fetch`).
  A faithful extractor: it preserves each operator's factory skills
  (`line`/`roomType`/`effectType`/`effect`/`icon` + per-level `value`) and does **not**
  map them to domain numbers — the SPA collapses a skill to one `skill_bonus` per the
  selected recipe/level.
- **Output** — `tools/seed/seed.json`, committed, keyed by slug:
  `{ _meta:{source,fetchedAt,count}, operators:{ <slug>:{ charId, name, rarity,
  profession, factorySkills:[…] } } }`. The SPA bundles it (§ above).
- **Scope** — operators-only. Stamina mechanics (drain/regen/max) and facility data
  (slots/synergy/mood) are **not** in this source — game constants / a separate
  source / user sliders; a facilities seed is a follow-up.

> Build-time, not request-time. Re-run `node tools/seed/scrape.mjs` only when a game
> patch changes the numbers; `_meta.fetchedAt` records when it was last pulled.
