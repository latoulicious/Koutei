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
