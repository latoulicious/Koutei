# Module: domain

`internal/domain` — the pure scheduling entities and rules. Numeric and
string-agnostic: operators and stations are reduced to the numeric attributes
the rules read, identified by slice index. No `net/http`, no JSON, no game-name
strings — all naming/parsing stays in the (future) HTTP adapter. The game-model
this implements is [`../domain.md`](../domain.md); this file is the code contract.

## Types

```go
type Operator struct {
	Stamina    float64 // current stamina; drains while assigned
	StaminaMax float64 // ceiling for rest recovery
	DrainBase  float64 // Δ_base stamina lost per slice in a standard slot
	Regen      float64 // stamina recovered per slice while resting
	SkillBonus float64 // additive output bonus for the active recipe
	MoodBonus  float64 // drain-reduction aura emitted while staffing a mood station
}

type Station struct {
	Slots int  // hard capacity: never exceeded
	Mood  bool // mood station: staffing it activates occupants' MoodBonus aura
}
```

The caller (HTTP adapter) maps a game id → index; the engine never sees the id.

## Rules (pure, total, side-effect-free)

| Func | Formula | Notes |
|---|---|---|
| `DrainStamina(stamina, drainBase, moodBonus)` | `stamina − drainBase·(1 − moodBonus)` | `moodBonus` ∈ [0,1] = Mood Nexus drain reduction. May return < 0. |
| `OutputModifier(stamina)` | `0` if `stamina ≤ 0`, else `1` | the zero-stamina penalty; gates pruning. |
| `RoomEfficiency(skillBonuses)` | `1.0 + Σ skillBonus` | empty room = base `1.0`. |
| `RecoverStamina(stamina, regen, max)` | `min(stamina + regen, max)` | rest path; never lowers stamina, so a zero `max` is a no-op. |
| `MoodAura(moodBonuses)` | `clamp(Σ moodBonus, 0, 1)` | slice-wide drain reduction from mood-station occupants; clamp keeps it a valid `DrainStamina` `moodBonus`. |

Each rule has a table test in `rules_test.go` that fails if the math drifts.
Float comparison uses an `epsilon = 1e-9` helper (stdlib `testing` only — no
testify dependency added in Phase 1).

## Not modelled yet (Phase 2)

- **`Level`** — no rule reads it; added when one does.
