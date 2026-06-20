# Resolutions

How findings were resolved. Paired with [`findings.md`](findings.md) — each entry
resolves a specific finding and must reference it; neither file is orphaned.

Format per resolution:

```md
## R-NNN <short title>  (resolves F-NNN)
- date:
- change: <what was done>
- files:
- verification: <how it was confirmed>
- constraints honored: <Do-Not rules respected>
```

## R-001 solver.md Phase-1 drain wording  (resolves F-001)
- date: 2026-06-21
- change: line 34 parenthetical "`moodBonus = 0` this phase" → "minus the Mood Nexus
  aura — see below", matching `solveSlice` and the aura section.
- files: docs/wiki/modules/solver.md
- verification: cross-checked against `solver.go` `solveSlice` (computes
  `domain.MoodAura`, applies to drain) and solver.md lines 66-75.
- constraints honored: docs-only; committed separately from Track A (no unrelated
  cleanup mixed into the feature diff); no code/contract change.
