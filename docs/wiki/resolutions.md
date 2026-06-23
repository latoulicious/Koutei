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

## R-002 real PS (stamina) constants found — source + mapping  (resolves F-002)
- date: 2026-06-23
- change: blocker resolved at the **data** level — the constants exist and are
  decoded. Found via `Niesc-F/EndfieldTableCfg` (a full Unity table dump, 631
  `TableCfg/*.json`), starred in `github.com/stars/Tsuk1ko/lists/data`. The dead-end
  was a naming mismatch: the resource is **Physical Strength (PS / 体力)**, modelled
  on the **Spaceship** system (our seed skills are `facskill_spaceship_*`), not
  "mood/stamina."

  Real constants (`TableCfg/SpaceshipConst.json`) → our domain (`web/src/state.ts`):
  | domain field | placeholder | real value | source key |
  |---|---|---|---|
  | `StaminaMax` | 100 | **10000** | `maxPhysicalStrength` |
  | `DrainBase` | 20 | **12** | `basePhysicalStrengthCostRate` |
  | `Regen` | 15 | **20** | `basePhysicalStrengthRecoveryRate` |

  Effect→knob mapping (now sourced, not fabricated):
  - `manufacture_efficiency` → `skill_bonus` (room attr type 2 `room_produce_rate`).
  - `physical_power` → `MoodBonus` — confirmed: these skills are named
    `spaceship_skill_acc_all_ps_recovery*`, params = **0.12 / 0.16** = the guide's
    "+12–16% recovery auras". Room attr type 0 = `ps_recovery_rate`, type 1 =
    `room_ps_cost_rate` (the drain reduction). Matches `rules.go` 1:1.
  - Other seed effects (`guestroom_*`, `plant_*`, `*_power_consume`) are dimensions
    the 2-knob solver doesn't model — leave user-driven / ignored.
- files: docs only so far — findings.md (F-002), resolutions.md (this), and the
  on-hold notes in README.md / data.md / PLAN.md / koutei-next-step memory still say
  "blocked/datamine-only" and are now WRONG (flip them when wiring). **No code yet.**
- verification: values read straight from `SpaceshipConst.json`; `physical_power`→PS
  mapping cross-checked against `SpaceshipSkillTable.json` skill ids + params and the
  `SpaceshipRoomAttrTypeTable.json` attr types. Mechanic matches `internal/domain/rules.go`.
- constraints honored: docs-only; no code/contract change; no fabrication (every
  number traced to a source key).

### Next-session wiring (NOT done — needs approval before code)
1. `web/src/state.ts` — `DEFAULTS` → `staminaMax:10000, stamina:10000, drainBase:12,
   regen:20`. Update the placeholder comment to cite `SpaceshipConst`.
2. `web/src/main.ts` `addOperator` + a `payload.ts` helper — default `moodLine` to
   the operator's `physical_power` line (mirror `primarySkillLine`); add a test.
3. Flip ON HOLD → active: README.md banner, data.md § "Blocking data gap", PLAN.md
   note, `koutei-next-step` + `MEMORY.md`. Add a new session entry.
4. **Confirm before trusting absolute timing:** the rate's real-time unit (per-min
   vs per-tick) is NOT yet pinned — desc text is i18n-id only. Grep
   `TableCfg/I18nTextTable_*.json` for desc id `-2816445264583474700` (pelica PS
   skill) to get the unit wording. Cosmetic — affects only the SPA hour labels, not
   solver correctness.
5. Optional: this dump could replace the scraper source entirely (`CharacterConst`,
   all `Spaceship*` tables) — separate task, don't fold into the wiring.

Source raw-URL pattern:
`https://raw.githubusercontent.com/Niesc-F/EndfieldTableCfg/main/TableCfg/<Table>.json`
