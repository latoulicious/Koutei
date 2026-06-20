# Module: solver core

The pure compute engine. Takes the problem as numeric matrices, returns the optimal
dispatch timeline. Knows nothing about HTTP, JSON, or game-name strings — those stay
in the HTTP adapter. Design-intent contract ahead of the code.

## Responsibility

One job: given roster state, station definitions, a target, and a horizon, find the
assignment of operators to slots per time slice that maximizes cumulative target
output without violating the domain rules ([`domain.md`](../domain.md)).

## Domain types (intended)

```txt
Operator      level, stamina, skill bonuses (numeric)
Station       slots, recipe, output mapping
TimelineState a single slice: assignments + per-operator stamina
ScheduleOutput per-slice dispatch + efficiency + total rating + solve time
```

Names are illustrative — settle them in code (`operator.go`, `station.go`,
`solver.go`) and update this file to match.

## Search

- **Branch-and-bound / DP** over `T` slices. Evaluate candidate assignments per
  slice, score by efficiency, keep the best path.
- **Pruning** is what makes it tractable:
  - zero-stamina-in-production branches are cut immediately;
  - dominated/over-capacity branches are rejected before recursion.
- **Concurrency** — distinct `target_priority` scenarios may run on separate
  goroutines and the best path merged into one response.

## Contract

- **Deterministic** — same input → same output; no wall-clock, no RNG, stable
  tie-break.
- **Pure** — no I/O, no globals, no game strings. Fully unit-testable on raw inputs.
- **Honest output** — report the real efficiency and solve time; do not fabricate a
  timeline when the input is infeasible — surface infeasibility instead.

> Pair every non-trivial rule (drain, synergy, pruning) with a static unit test that
> fails if the math breaks — see [`conventions.md`](../conventions.md).
