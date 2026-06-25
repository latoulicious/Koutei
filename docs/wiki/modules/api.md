# Module: HTTP adapter

`internal/interfaces/http` (package `httpadapter`) — the only I/O-aware layer. It
parses the numeric request payload into the solver domain ([`domain.md`](../domain.md)),
calls the optimal solver ([`solver.md`](solver.md)), and serializes the timeline
back. Entry point: `cmd/koutei`. No game strings, no JSON, no `net/http` leak into
the core — the boundary stays clean.

> Package name `httpadapter` ≠ directory `http` deliberately: it avoids colliding
> with the `net/http` identifier inside the package.

## Routes

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/optimize` | the only business endpoint — solve a schedule |
| `GET` | `/health` | liveness probe (unversioned, at root per [`known-constraints.md`](../known-constraints.md)) |

A path match with the wrong method returns `405` automatically (Go 1.22 `ServeMux`
method patterns).

## Request — `POST /api/v1/optimize`

Numeric payload: the client sends raw domain numbers, the adapter maps them
straight across (`optimizeRequest.toDomain`). No seed lookup, no string parsing.

```json
{
  "time_horizon": 24,
  "target_priority": "weapon_exp",
  "operators": [
    { "stamina": 100, "stamina_max": 100, "drain_base": 20, "regen": 15, "skill_bonus": 0.5, "mood_bonus": 0 }
  ],
  "stations": [
    { "slots": 2, "mood": false }
  ]
}
```

- `operators[i]` ↔ `domain.Operator`; `stations[i]` ↔ `domain.Station` (field-for-field).
- `target_priority` is **accepted but ignored** — recipe matching is still
  solver-deferred ([`solver.md`](solver.md) Deferred). Decoded for forward
  compatibility; it has no effect on the result yet.
- Why numeric and not the game-string payload in [`PLAN.md`](../../../PLAN.md) §53:
  that needs the static seed, which does not exist yet. See
  [`../decisions/0001-numeric-payload.md`](../decisions/0001-numeric-payload.md).

### Validation (boundary guards)

`400` with `{"error": "..."}` on any failure. The bounds exist to stop inputs that
would otherwise panic or hang the solver:

| Rule | Why |
|---|---|
| `time_horizon ∈ [1, 168]` | `<1` panics `make([]Slice, 0, horizon)`; cap bounds B&B depth + response size |
| `len(operators) ≤ 32` | bounds `sliceCandidates`' subset enumeration (materialized before `maxNodes` can trip) |
| `len(stations) ≤ 32` | same enumeration ceiling |
| `stations[i].slots ∈ [0, 16]` | `<0` panics `make([]int, 0, slots)` in the solver |

Request body is capped at **1 MiB** (`http.MaxBytesReader`) against memory-DoS.
Operator stamina/bonus values are unbounded — the domain rules handle any float
(e.g. negative stamina just prunes to zero output).

## Response

Mirrors `solver.Schedule`. Assignment indices reference the request arrays (the
client owns its own ordering).

```json
{
  "total_efficiency": 4.5,
  "execution_ms": 0.004334,
  "slices": [
    { "efficiency": 1.5, "assignments": [ { "station": 0, "operators": [0] } ] }
  ]
}
```

- `execution_ms` is **envelope-only telemetry** (wall-clock solve duration, also
  logged). It is *not* part of the deterministic schedule: same input → same
  `total_efficiency`/`slices`; only this timing field varies. Determinism contract
  ([`known-constraints.md`](../known-constraints.md)) is held.

## Contract

- **Stateless** — nothing survives a request; the payload is the whole input.
- **String-/I/O-agnostic core preserved** — all parse/serialize lives here.
- **Solver** — calls `solver.SolveBranchBound` (proven-optimal under the node
  budget, never worse than greedy).

## Deferred

- **String-id payload + embedded seed** — resolve `id`/`base_skills`/
  `active_recipe` → numbers once the scraper lands; wraps on top of this numeric
  layer.
- **`target_priority` / recipe matching** — per-target concurrent scenarios merge
  later (solver work, [`solver.md`](solver.md)).
- **Graceful-shutdown tuning, Postman collection** — follow-ups.
