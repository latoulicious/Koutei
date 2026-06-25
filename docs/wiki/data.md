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
  (slots/mood) are **not** in this source — game constants / a separate source / user
  sliders; a facilities seed is a follow-up.

> Build-time, not request-time. Re-run `node tools/seed/scrape.mjs` only when a game
> patch changes the numbers; `_meta.fetchedAt` records when it was last pulled.

### Operator avatars

Head icons live in `web/public/avatars/<slug>.webp` (Vite serves `public/` at the web
root, so the SPA loads `/avatars/<slug>.webp`). Bundled, not hot-linked — keeps the app
local-first/offline. Source: **vallov CDN** (`cdn.vallov.com/characters/<slug>/icon.webp`,
from [reend.vallov.com](https://reend.vallov.com/characters/)); slugs match `seed.json`
1:1 except a small `ALIAS` map (e.g. `mifu` → `mi-fu`). Fetched by `tools/seed/avatars.mjs`
— re-run on a roster change. A missing icon falls back to a rarity-tinted initial in the
SPA, so coverage gaps never break the UI.

## Stamina/PS constants — RESOLVED 2026-06-24 (was the project blocker)

The four numbers the optimizer needs are **PS (Physical Strength / 体力)**, modelled
on the **Spaceship** system (our seed skills are `facskill_spaceship_*`) — not
"mood/stamina." Every 2026-06-21 search used the wrong term, which is why it
dead-ended (see [`resolutions.md`](resolutions.md) R-002). Found and wired from
`Niesc-F/EndfieldTableCfg` (`TableCfg/SpaceshipConst.json`):

| Domain field | Meaning | Real value | Source key |
|---|---|---|---|
| `StaminaMax` | PS base / max capacity | **10000** | `maxPhysicalStrength` |
| `DrainBase` | PS decay per slice in a standard slot | **12** | `basePhysicalStrengthCostRate` |
| `Regen` | PS recovered per slice while resting | **20** | `basePhysicalStrengthRecoveryRate` |
| `MoodBonus` | PS decay-reduction / recovery aura | user-picked `physical_power` skill | `SpaceshipSkillTable` (0.12/0.16) |

Wired in `web/src/state.ts` `DEFAULTS` (per-operator editable) and `web/src/payload.ts`
`moodSkillLine` (new operators default their mood line to the `physical_power` aura).

**Time unit — adopted per-minute (inferred, 2026-06-24).** The desc id
`-2816445264583474700` reads *"…grant all operators' Mood Regen +12%"* — a percentage,
**not** a unit (so the R-002 item-4 desc route was a dead end). `SpaceshipConst` has no
explicit unit field, but sibling durations there are in **seconds**
(`spaceshipGuestRoomInformationExchangeDuration = 86400` = 1 day). Of the candidates,
per-minute is the only plausible fit: drain 10000÷12 ≈ 13.9 h, regen 10000÷20 ≈ 8.3 h
(a multi-hour shift); per-second drains in ~14 min, per-hour leaves fatigue inert over
24 h. `DEFAULTS` therefore store the rates **per 1-hour slice = source per-minute ×60**
(`drainBase 720`, `regen 1200`); solver correctness is unit-independent (rates scale
together), only absolute timing depended on this. Inference is **unconfirmed** — an
authoritative settle-interval would live in game logic, not this table dump.

Source raw-URL pattern:
`https://raw.githubusercontent.com/Niesc-F/EndfieldTableCfg/main/TableCfg/<Table>.json`

> Earlier (2026-06-21) sources ruled out — endfieldtools.dev localdb (operators + mfg
> recipes only), daydreamer-json/ak-endfield-api-archive (raw encrypted Unity VFS
> chunks), awesome-arknights-endfield planners (recipe layer), community guides
> (relative % only). The dead-end was the naming mismatch above, not a missing source.
