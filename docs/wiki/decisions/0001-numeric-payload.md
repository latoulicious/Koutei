# ADR 0001 — Numeric request payload for `POST /api/v1/optimize`

- **Status:** accepted
- **Date:** 2026-06-20
- **Context:** Phase 3 (HTTP adapter)

## Context

[`PLAN.md`](../../../PLAN.md) §53 documents the optimize request as a **game-string**
payload (`id`, `base_skills`, `active_recipe`, `target_priority`). Resolving those
strings to the solver's numeric domain (`SkillBonus`, `DrainBase`, `MoodBonus`,
…) requires the static game-data seed. That seed does not exist — PLAN itself says
"run the scraper before Phase 3/4 when real numbers are needed," and [`AGENTS.md`](../../../AGENTS.md)
forbids fabricating seed data and broad changes.

## Decision

Phase 3 ships a **numeric-domain payload**: the client sends raw numbers, the
adapter maps them straight to `domain.Operator`/`domain.Station`. `target_priority`
is accepted but ignored (recipe matching is still solver-deferred). Shape and rules:
[`../modules/api.md`](../modules/api.md).

## Consequences

- **Unblocks Phase 3** without inventing data and keeps the diff small.
- **Solver core stays string-/I/O-agnostic** — the load-bearing contract holds.
- **Drift from PLAN §53:** the documented string payload is not yet the wire
  format. Code is the source of truth; the string-id + seed resolution becomes a
  thin layer *on top of* this numeric contract when the scraper lands.

## Alternatives rejected

- **String payload + build the seed now** — needs real scraped data we don't have
  (fabrication risk) and pulls recipe/target matching forward; not a smallest-safe
  change.
- **Hybrid (ids + numbers inline)** — redundant fields, messier contract for no
  gain while the seed is absent.
