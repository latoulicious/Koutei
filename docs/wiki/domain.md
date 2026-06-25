# Domain

Koutei schedules operators across the OMV Dijiang and surface outposts in
Arknights: Endfield. The problem is a **multi-resource constrained assignment**
over a discretized timeline: place operators into facility slots, hour by hour, to
maximize a chosen production target without violating stamina or slot limits.

## Core entities

- **Operator** — a unit with `level`, `current_stamina`, and `base_skills` (passive
  bonuses keyed to facility recipes). Identified by a stable string id; the engine
  never reads the id, only the numeric attributes it maps to.
- **Station / Facility** — a room (e.g. AIC Manufacturing, Mood Nexus, Growth
  Chamber) with `slots`, an `active_recipe`, and an output product.
- **Timeline** — the horizon discretized into `T` equal slices (e.g. 1-hour
  blocks). Each slice is one assignment of operators to slots.
- **Schedule output** — the per-slice dispatch the solver returns: who works
  where, when a rotation/rest happens, and the resulting efficiency.

## Rules engine

1. **Stamina drain** — while assigned to a standard slot, stamina decays linearly
   per slice: `stamina_{t+1} = stamina_t − (Δ_base × (1 − MoodNexusBonus))`.
2. **Zero-stamina penalty** — at `stamina ≤ 0` the operator's output modifier drops
   to `0%` immediately. A branch that keeps a zero-stamina operator in a production
   slot is pruned.
3. **Room efficiency** — room efficiency is
   `efficiency_total = 1.0 + Σ(operatorSkillBonus)`.

## Target optimization

The caller sets a `target_priority` (e.g. `weapon_exp`, `outpost_prosperity`) and a
`time_horizon_hours`. The solver maximizes cumulative output for that target across
the horizon. Distinct priorities can be searched concurrently and the best path
returned (see [`modules/solver.md`](modules/solver.md)).

> The exact attribute tables (per-level base passives, recipe yields, drain rates)
> come from the static seed — see [`data.md`](data.md). This file is the model;
> the numbers live in data.
