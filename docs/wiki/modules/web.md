# Module: web (TypeScript SPA)

`web/` — the Phase-4 interface. A local-first, dependency-light SPA (Vite +
TypeScript, no JS framework) that bundles the game-data seed, builds the numeric
optimize payload client-side, posts it to the engine, and renders the returned
timeline. The backend stays numeric and string-agnostic — all id→number
resolution lives here ([`../data.md`](../data.md),
[`../decisions/0001-numeric-payload.md`](../decisions/0001-numeric-payload.md)).

## Stack

Vanilla TS + Vite + Tailwind v4 (`@tailwindcss/vite`, CSS `@theme` palette — no
`tailwind.config.js`). Zero runtime dependencies; the bundle is ~23 kB JS / ~7 kB
CSS. State held in a plain object, columns re-render on change (`replaceChildren`).

## Layout

```txt
web/
  index.html, vite.config.ts, tsconfig.json, package.json
  src/
    main.ts        controller: owns state + Ctx actions + re-render
    state.ts       AppState, localStorage load/save, placeholder constants
    seed.ts        imports ../../tools/seed/seed.json + types
    payload.ts     buildPayload(state) → numeric OptimizeRequest  (the mapping)
    api.ts         optimize() fetch client + response types
    context.ts     Ctx — the action surface columns call
    dom.ts         el() element builder
    ui/roster.ts   col 1 · ROSTER SLATE
    ui/stations.ts col 2 · STATION MATRIX
    ui/timeline.ts col 3 · GANTT TIMELINE
    ui/widgets.ts  shared column head / labeled row / number+select inputs
    payload.test.ts  vitest: mapping + array-order stability
```

## Three columns (PLAN §4)

1. **Roster slate** — operators picked from the seed; per operator a factory-skill
   line + level (→ `skill_bonus`), an optional mood-skill line (→ `mood_bonus`),
   a stamina slider with a blocky `[██████░░░░]` bar (green >50%, amber below), and
   editable drain/regen/max.
2. **Station matrix** — user-defined rooms (name, slots, mood toggle);
   seeded with PLAN's three defaults. Seed carries no facility data, so stations
   are entirely user input.
3. **Gantt timeline** — the solver response as vertical hour blocks; per-station
   operator chips, per-slice efficiency, a `↻` mark when an operator's station
   changed from the prior slice, and a badge with total efficiency + `Executed in
   N ms`.

## Contract held

- **Array order is the index contract.** Response `assignments[].operators` /
  `.station` are indices into the request arrays; `buildPayload` emits operators
  and stations in `state.roster` / `state.stations` order, and the timeline maps
  indices back through the same arrays. Stable end-to-end.
- **Local-first.** `roster`, `stations`, `horizon`, `targetPriority` persist to
  `localStorage` (`koutei.state.v1`); the transient solve `result` never does.
- **`target_priority`** is sent but the backend ignores it ([`api.md`](api.md)).

## Seed → numeric mapping (`payload.ts`)

- `skill_bonus` = selected factory-skill line's value at the chosen level index
  (clamped); `0` if the line/operator is absent. A new operator defaults its skill
  line to `manufacture_efficiency` (`primarySkillLine`) — the one unambiguous
  effect→`skill_bonus` mapping — falling back to the first line; user overrides.
- `mood_bonus` = the optional mood-line value, else `0`. **No automatic
  roomType/effectType → domain classification** — that semantic table is not in the
  wiki and is not invented; the user picks which skill is the mood aura.
- `stamina` (slider) + `stamina_max`/`drain_base`/`regen` come from
  `state.DEFAULTS` placeholder game constants (`100/100/20/15`), editable per
  operator — the seed is operators-only and carries no stamina mechanics
  ([`../data.md`](../data.md)).

## Build / dev

- `npm run dev` — Vite dev server; `server.proxy` forwards `/api` →
  `http://localhost:8080` (run `go run ./cmd/koutei` alongside).
- `npm run build` — `tsc --noEmit` typecheck then `vite build` → `dist/` (nginx
  static, [`../deploy.md`](../deploy.md)). `server.fs.allow: ['..']` lets the build
  import the committed seed without a copy.
- `VITE_API_BASE` overrides the API origin; defaults to same-origin (prod nginx).
- `npm run test` — vitest on the payload mapping.

## Deferred

- Real stamina-mechanics source (drain/regen/max are placeholder constants).
- Facility seed (stations are hand-entered).
- `target_priority` has no effect until recipe matching lands (solver work).
- Rotation shown as a `↻` mark, not the bezier connection line PLAN §4 describes.
