# Conventions

Authoritative agent rules: root [`AGENTS.md`](../../AGENTS.md). This file holds
project-specific conventions; populate as patterns settle.

## Languages

- **backend** — Go. Hexagonal: HTTP adapter is the only I/O-aware layer; the solver
  core is pure and string-agnostic (numeric matrices only). Accept interfaces,
  return structs; keep the core free of `net/http` and game-name strings.
- **web** — TypeScript SPA. Local-first; roster/level state in `localStorage`, no
  auth layer. Visual language (Swiss-industrial, monospace telemetry) in [`PLAN.md`](../../PLAN.md) §4.

## Web UI tokens — "silkscreen + register"

Mono throughout (the terminal/control-room look). Three tiers; **color carries meaning,
applied only to values**, never to labels:

- **Section heads** — `UPPERCASE`, wide tracking, `muted`. e.g. `ROSTER SLATE`.
- **Silkscreen labels** — input captions you set a value next to: `UPPERCASE`, `muted`.
  e.g. `SKILL` `DRAIN` `MAX` `SLOTS` `HORIZON`.
- **Register readouts** — computed/derived values: `lower_snake_case` key (matches the
  payload field) in `muted`, value in a semantic color. e.g. `skill_bonus 0.140`.

Semantic colors (the 6-color palette, [`PLAN.md`](../../PLAN.md) §4): `ok` green =
healthy / output / derived; `accent` amber = active / warning / critical; `muted` =
labels, keys, units. The headline metric is the one glyph exception: `η 69.720`.

Rule of thumb: `UPPERCASE` = a thing you set, `snake_case` = a thing the engine computed.

## Commits

Subject-only Conventional Commits (`type: summary`). No body unless the "why" is
non-obvious, no `Co-Authored-By`, no phase tokens. (Atelier-wide standard.)

## Docs

- Code is source of truth; note drift rather than trusting stale docs.
- Append session history to `sessions/DD-MM-YYYY.md` — never overwrite.
- Keep notes concise and operational; no speculative documentation.
- Code-review findings go to `findings.md`, their fixes to `resolutions.md`; the
  two share IDs (`F-NNN` ↔ `R-NNN`) and are never orphaned.
