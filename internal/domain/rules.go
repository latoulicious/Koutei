package domain

// The three scheduling rules as pure, total, side-effect-free functions.
// Formulas and rationale: docs/wiki/modules/domain.md.

// DrainStamina returns stamina after one slice in a standard slot. moodBonus is
// the Mood Nexus drain reduction in [0,1].
func DrainStamina(stamina, drainBase, moodBonus float64) float64 {
	return stamina - drainBase*(1-moodBonus)
}

// OutputModifier is the zero-stamina penalty: 0 at or below zero stamina, else
// 1. A production slot holding a zero-output operator is pruned by the solver.
func OutputModifier(stamina float64) float64 {
	if stamina <= 0 {
		return 0
	}
	return 1
}

// RoomEfficiency sums the operator bonuses present in the room this slice over a
// base of 1.0. Empty room = base 1.0.
func RoomEfficiency(skillBonuses []float64) float64 {
	efficiency := 1.0
	for _, bonus := range skillBonuses {
		efficiency += bonus
	}
	return efficiency
}

// MoodAura is the slice-wide drain reduction from mood-station occupants: their
// MoodBonus summed and clamped to [0,1], so DrainStamina's moodBonus stays in range.
func MoodAura(moodBonuses []float64) float64 {
	aura := 0.0
	for _, b := range moodBonuses {
		aura += b
	}
	if aura > 1 {
		return 1
	}
	if aura < 0 {
		return 0
	}
	return aura
}

// RecoverStamina returns stamina after one slice of rest, capped at max. Rest
// never lowers stamina, so an unset (zero) max is a no-op rather than a drain.
func RecoverStamina(stamina, regen, max float64) float64 {
	s := stamina + regen
	if s > max {
		s = max
	}
	if s < stamina {
		return stamina
	}
	return s
}
