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

## Blocking data gap — stamina/mood constants (project ON HOLD, 2026-06-21)

The optimizer needs four real numbers it currently fakes with placeholders
(`web/src/state.ts` `DEFAULTS` `100/100/20/15`). The project is **on hold** until a
reliable source is found:

| Domain field | Meaning | Placeholder |
|---|---|---|
| `StaminaMax` | stamina base / max capacity | 100 |
| `DrainBase` | stamina decay per slice in a standard slot | 20 |
| `Regen` | stamina recovered per slice while resting | 15 |
| `MoodBonus` | mood→stamina decay-reduction rate (aura) | user-picked skill value |

In game terms this is the **Mood/Control-Nexus fatigue layer**, distinct from the
manufacturing-recipe layer. Sources searched 2026-06-21 and **ruled out**:

- **endfieldtools.dev localdb** (our seed source) — operators (combat + factory-skill
  bonuses) and `factory-browse-data.json` (15 mfg buildings, 168 items/recipes) only;
  no mood/drain/regen keys.
- **daydreamer-json/ak-endfield-api-archive** — a CDN/launcher mirror of **raw
  encrypted Unity VFS chunks** (`.blc`/`.chk`, hashed names); only the manifest is
  decrypted. Constants need a full asset datamine (out of scope).
- **awesome-arknights-endfield tools** (factoriolab fork, jei-web, yituliu, …) — all
  model the manufacturing-recipe layer, not operator fatigue.
- **Community guides** (e.g. endfieldhub Control Nexus) — qualitative + *relative*
  percentages only (+12–16% regen auras, −14–18% mood-drop), no absolute base/rate.

**Unblock path:** datamine the client assets (decrypt the VFS chunks → extract the
building/mood config table) or a published gamedata dump that includes the fatigue
constants. Until then, drain/regen/max stay editable placeholders and only *relative*
behaviour (rotation order, who tires first) is trustworthy, not absolute timing.
