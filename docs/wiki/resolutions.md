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
- files: data-level resolution documented here; **wiring landed 2026-06-24** —
  `web/src/state.ts` (`DEFAULTS` → real PS values), `web/src/payload.ts`
  (`moodSkillLine` helper), `web/src/main.ts` (`addOperator` defaults mood line),
  `web/src/payload.test.ts` (test). On-hold notes flipped to active in README.md /
  data.md / PLAN.md / `koutei-next-step` memory.
- verification: values read straight from `SpaceshipConst.json`; `physical_power`→PS
  mapping cross-checked against `SpaceshipSkillTable.json` skill ids + params and the
  `SpaceshipRoomAttrTypeTable.json` attr types. Mechanic matches `internal/domain/rules.go`.
- constraints honored: docs-only; no code/contract change; no fabrication (every
  number traced to a source key).

### Wiring (DONE 2026-06-24)
1. ✅ `web/src/state.ts` — `DEFAULTS` → `stamina/staminaMax:10000, drainBase:12,
   regen:20`; comment cites `SpaceshipConst`.
2. ✅ `web/src/payload.ts` `moodSkillLine` + `web/src/main.ts` `addOperator` — new
   operators default `moodLine` to their `physical_power` line; test added.
3. ✅ Flipped ON HOLD → active: README.md, data.md, PLAN.md, `koutei-next-step` +
   `MEMORY.md`; session entry `sessions/24-06-2026.md`.
4. ✅ Resolved-by-decision (2026-06-24): desc id `-2816445264583474700` =
   *"…Mood Regen +12%"* — a percentage, **not** a unit; the desc route was a dead end.
   `SpaceshipConst` sibling durations are in seconds (`...InformationExchangeDuration
   = 86400` = 1 day); only per-minute fits the PS timescale (drain ≈13.9 h, regen
   ≈8.3 h). Adopted **per-minute (inferred, unconfirmed)** and stored per 1-hour slice
   = ×60 in `DEFAULTS` (`drainBase 720`, `regen 1200`). Solver unaffected (rates scale
   together). Full evidence: data.md § "Stamina/PS constants".
5. Optional (NOT done — separate task): this dump could replace the scraper source
   entirely (`CharacterConst`, all `Spaceship*` tables). Don't fold into the wiring.

Source raw-URL pattern:
`https://raw.githubusercontent.com/Niesc-F/EndfieldTableCfg/main/TableCfg/<Table>.json`
