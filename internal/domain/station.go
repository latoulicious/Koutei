package domain

// Station is a facility with a fixed slot count. Numeric only; recipe and output
// naming live in the adapter.
type Station struct {
	Slots int  // hard capacity: never exceeded
	Mood  bool // a mood station: staffing it activates occupants' MoodBonus aura
}
