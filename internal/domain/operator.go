// Package domain holds Koutei's pure scheduling entities and rules. Numeric and
// string-agnostic by contract — see docs/wiki/modules/domain.md.
package domain

// Operator is a unit reduced to the numeric attributes the rules read. The
// caller maps a game id to an index; the engine never sees the id.
type Operator struct {
	Stamina    float64 // current stamina; drains while assigned
	DrainBase  float64 // Δ_base stamina lost per slice in a standard slot
	SkillBonus float64 // additive output bonus for the active recipe
}
