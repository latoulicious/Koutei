# Findings

Code-review findings log. Paired with [`resolutions.md`](resolutions.md) — every
finding that gets fixed must have a matching resolution entry; the two are
interconnected and must not be orphaned.

Format per finding:

```md
## F-NNN <short title>
- date:
- source: <review tool / PR / manual>
- severity: low | medium | high
- location: path:line
- problem:
- status: open | resolved (→ R-NNN)
```

## F-001 solver.md Phase-1 drain still says moodBonus = 0
- date: 2026-06-21
- source: CodeRabbit (Track A review)
- severity: low (CodeRabbit: critical) — doc accuracy only, no code impact
- location: docs/wiki/modules/solver.md:34
- problem: Phase-1 Drain step stated `moodBonus = 0 this phase`, but `solveSlice`
  now applies `domain.MoodAura` to greedy drain (commit `1768801`); contradicted the
  Mood Nexus aura section (lines 66-75) and the code. Pre-existing drift, unrelated
  to Track A.
- status: resolved (→ R-001)

## F-002 stamina/mood mechanics are placeholder constants — no known data source
- date: 2026-06-23
- source: manual (project blocker — parked the project 2026-06-21)
- severity: high — solver runs on guessed fatigue numbers; only relative behaviour
  (rotation order) is trustworthy, not absolute timing
- location: web/src/state.ts:37 (`DEFAULTS = 100/100/20/15`)
- problem: the optimizer needs four real constants — stamina base/max, drain
  (decay) rate, regen rate, and the mood→stamina decay-reduction rate — that the SPA
  fakes with placeholders. Searched 2026-06-21 and found nothing: endfieldtools.dev
  localdb (operators + mfg recipes only), daydreamer-json/ak-endfield-api-archive
  (raw encrypted Unity VFS chunks), awesome-arknights-endfield planners (recipe
  layer), guides (relative % only). Conclusion at the time: datamine-only, blocked.
  Root cause of the dead-end: the resource is **Physical Strength (PS / 体力)**, not
  "mood/stamina" — every search used the wrong term (see R-002).
- status: resolved (→ R-002)

## F-003 RoomEfficiency synergyCombo models a mechanic absent from the game
- date: 2026-06-25
- source: manual (user domain knowledge)
- severity: medium — solver adds a phantom per-room bonus; absolute efficiency is
  inflated by a term with no in-game basis (relative rotation order still sound)
- location: internal/domain/rules.go:23 (`RoomEfficiency` `synergyCombo`),
  internal/domain/station.go:7 (`Station.SynergyCombo`), PLAN.md:80 (rule 3)
- problem: PLAN §2 rule-3 "synergy evaluator" baked a per-room additive term
  (`+ synergyCombo`, "additive bonus when the room's slots cooperate") into the domain
  at Phase 1. Endfield has no operator co-placement / room-cooperation bonus — confirmed
  by the user (game knowledge). It was a design assumption, never validated. Only the
  `+ synergyCombo` tail is fabricated; `1.0 + Σ skillBonus` is real.
- status: resolved (→ R-003)
