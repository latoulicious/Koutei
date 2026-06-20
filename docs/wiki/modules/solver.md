# Module: solver core

`internal/solver` — the compute engine. Takes the problem as numeric domain
([`domain.md`](domain.md)) values, returns the dispatch timeline. Knows nothing
about HTTP, JSON, or game-name strings.

## Responsibility

Given roster state, station definitions, and a horizon, find the assignment of
operators to slots per slice that maximizes cumulative efficiency without
violating the domain rules.

## Output types

```go
type Assignment struct { Station int; Operators []int } // a station's filled slots, by operator index
type Slice      struct { Assignments []Assignment; Efficiency float64 } // one time block
type Schedule   struct { Slices []Slice; Total float64 } // full timeline + cumulative efficiency
```

Output lives in `solver`, not `domain`: it is produced here, and keeping it out
of `domain` leaves that package as entities + rules only.

## Phase 1 — greedy (`Solve`)

Per slice, in order:

1. **Available** = operators with `OutputModifier(stamina) > 0`, sorted by
   `SkillBonus` descending. The sort is **stable over index-ordered input**, so
   bonus ties break by operator index — the fixed tie-break behind determinism.
2. **Fill** stations in index order, up to `Slots` each, best bonus first (slot
   capacity is hard).
3. **Score** the room via `RoomEfficiency`; accumulate into `Slice.Efficiency`.
4. **Drain** the operators placed (`moodBonus = 0` this phase); **rest** the rest
   — every unassigned operator recovers via `RecoverStamina`, so a drained
   operator can rotate back into production a later slice.
5. Zero-stamina operators are excluded in step 1 → never enter a production slot
   (the prune invariant). No available operators → empty slice, `0` efficiency:
   honest infeasibility, never a fabricated timeline.

`Solve` never mutates its `ops` input — stamina is tracked in a local copy, so
the call is pure and repeatable.

## Contract

- **Deterministic** — same input → same `Schedule`; no wall-clock, no RNG, ties
  broken by index.
- **Pure** — no I/O, no globals, no game strings. Unit-testable on raw inputs
  (`solver_test.go`: slot capacity, zero-stamina prune, determinism, efficiency).

## Deferred (Phase 2 — see [`../../PLAN.md`](../../PLAN.md) §5)

- **Branch-and-bound / DP** with dominated-branch pruning replaces the per-slice
  greedy choice. Output types and domain rules stay.
- **Mood Nexus aura** — wire `moodBonus` from a staffed mood station into
  `DrainStamina` (currently `0`).
- **`target_priority` / recipe matching** — greedy maximizes generic efficiency
  for now; per-target scenarios run concurrently and merge later.
