# Known Constraints

Hidden contracts the implementation must hold. These are design intent ahead of the
code — they become binding as components land. Component-specific contracts live in
[`modules/solver.md`](modules/solver.md). Code is the source of truth.

## Cross-cutting

- **Solver core is I/O- and string-agnostic.** It runs on numeric matrices only —
  no `net/http`, no game-name strings, no JSON. All naming/parsing stays in the HTTP
  adapter. Breaking this couples the engine to transport and makes it untestable in
  isolation.
- **Deterministic.** Same request → same timeline, every time. No wall-clock, no RNG
  in the search; ties broken by a fixed rule. This is what lets the UI claim "proven
  optimal" and what makes results reproducible without persistence.
- **Stateless.** Nothing survives a request. No DB, no cache, no broker. The payload
  is the whole input; the response is the whole answer (see [`data.md`](data.md)).
- **Single route.** `POST /api/v1/optimize` is the only business endpoint. Ops
  endpoints (`/health`) stay at root, unversioned.

## Domain invariants (DB-equivalent — exact rules, not enum strings)

- **Zero-stamina output is `0%`.** At `stamina ≤ 0` an operator produces nothing;
  the search must prune branches that leave one in a production slot.
- **Slot capacity is hard.** A station never holds more operators than its `slots`.
- **Stamina is monotonic non-increasing while assigned** (linear drain); rest is the
  only way back up. The drain formula in [`domain.md`](domain.md) is the contract.
- **Efficiency is computed, never stored.** Room efficiency is derived per slice
  from operators present + synergy; it is not carried across slices as a counter.

## Operational

- **One static binary.** No external services to provision; the game-data seed is
  embedded. Deploy is copy-binary + restart (see [`deploy.md`](deploy.md)).
- **Seed freshness is manual.** Game-data numbers are scraped once; a game patch
  silently invalidates them until re-seeded. No automatic refresh by design.
