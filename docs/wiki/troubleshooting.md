# Troubleshooting

Operational caveats and debugging findings. Append as they surface; prefer evidence
over guesses.

Known starting points (design-time):

- **Non-deterministic output** — if the same request yields different timelines,
  suspect map iteration order, a wall-clock/RNG leak into the search, or an unstable
  tie-break. The solver must be deterministic (see
  [`known-constraints.md`](known-constraints.md)).
- **Wrong/zero efficiency** — usually a stale game-data seed (patched numbers) or a
  stamina-drain mismatch vs [`domain.md`](domain.md). Check the seed source/date
  before suspecting the solver.
- **Slow solve / blow-up** — branch-and-bound without effective pruning explodes
  with operator/slot count; check that zero-stamina and dominated branches are cut.

> Placeholder — extend with concrete findings as they occur.
