package domain

// Station is a facility with a fixed slot count and a synergy term for
// multi-slot rooms. Numeric only; recipe and output naming live in the adapter.
type Station struct {
	Slots        int     // hard capacity: never exceeded
	SynergyCombo float64 // additive bonus when the room's slots cooperate
	Mood         bool    // a mood station: staffing it activates occupants' MoodBonus aura
}
