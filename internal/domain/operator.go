package domain

// Operator is a unit reduced to the numeric attributes the rules read. The
// caller maps a game id to an index; the engine never sees the id.
type Operator struct {
	Stamina    float64 // current stamina; drains while assigned
	StaminaMax float64 // ceiling for rest recovery
	DrainBase  float64 // Δ_base stamina lost per slice in a standard slot
	Regen      float64 // stamina recovered per slice while resting
	SkillBonus float64 // additive output bonus for the active recipe
}
