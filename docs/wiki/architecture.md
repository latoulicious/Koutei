# Architecture

Koutei is a stateless, local-first shift optimizer. It proves the mathematically
optimal operator-to-station assignment over a discretized timeline rather than
guessing one. Three layers, one boundary that matters: the solver core knows
nothing about HTTP or game strings — it runs on raw numeric matrices.

```txt
            Browser (TypeScript / Web UI)
              - input:  roster state + target priority
              - state:  localStorage (roster, level breakpoints)
              - render: Gantt dispatch timeline + telemetry
                       │
                       ▼  POST /api/v1/optimize   [JSON over HTTP]
            ─────────────────────────────────────────────────
            Go backend (single binary, behind nginx)
              ┌────────────────────┐   ┌──────────────────────────┐
              │ HTTP adapter        │   │ Solver core (pure)       │
              │ - parse → domain    │──►│ - branch-and-bound / DP  │
              │ - domain → JSON     │◄──│ - state-tree pruning     │
              └────────────────────┘   │ - goroutine scenarios    │
                                       └──────────────────────────┘
            ─────────────────────────────────────────────────
            Static game-data seed (embedded JSON) — see data.md
```

## Components

- **web** (TypeScript SPA) — three-column UI: roster input → station definitions →
  optimized timeline. Local-first: roster/level state lives in `localStorage`, no
  auth, no server session. Posts the current state to the engine and renders the
  returned timeline (visual language: [`PLAN.md`](../../PLAN.md) §4).
- **api / HTTP adapter** (Go) — the only I/O-aware layer. Parses the request
  payload into the domain model, calls the solver, serializes the timeline back.
  Single route: `POST /api/v1/optimize`. Owns no state between requests.
- **solver core** (Go) — pure compute. Models the problem as a multi-resource
  constrained assignment over `T` time slices and searches for the optimal
  schedule (branch-and-bound with stamina/zero-output pruning). Contract:
  [`modules/solver.md`](modules/solver.md).
- **game-data seed** — static JSON (operator base passives, stations, recipes),
  scraped once and embedded; the source of the numeric matrices. See
  [`data.md`](data.md).

## Why stateless

No database, no broker, no cache. The request carries the entire problem state and
the response carries the whole answer; nothing survives a request. This keeps the
VPS footprint near zero and makes every call reproducible — the same input always
yields the same timeline (see [`known-constraints.md`](known-constraints.md)).

## Language

Go for the backend (concurrent scenario search via goroutines; single static
binary deploy). Rust is named only as an alternative in [`PLAN.md`](../../PLAN.md); if it is ever
chosen, record the switch as an ADR in [`decisions/`](decisions/).
