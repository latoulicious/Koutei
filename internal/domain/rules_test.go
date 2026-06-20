package domain

import (
	"math"
	"testing"
)

const epsilon = 1e-9

func almostEqual(a, b float64) bool { return math.Abs(a-b) <= epsilon }

func TestDrainStamina(t *testing.T) {
	tests := []struct {
		name      string
		stamina   float64
		drainBase float64
		moodBonus float64
		want      float64
	}{
		{"no mood bonus", 100, 10, 0, 90},
		{"half mood bonus halves drain", 100, 10, 0.5, 95},
		{"full mood bonus negates drain", 100, 10, 1, 100},
		{"drain can push below zero", 5, 10, 0, -5},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := DrainStamina(tt.stamina, tt.drainBase, tt.moodBonus)
			if !almostEqual(got, tt.want) {
				t.Errorf("DrainStamina(%v,%v,%v) = %v, want %v", tt.stamina, tt.drainBase, tt.moodBonus, got, tt.want)
			}
		})
	}
}

// Drain compounds across slices — the timeline is repeated application.
func TestDrainStamina_OverHorizon(t *testing.T) {
	stamina := 100.0
	for range 10 {
		stamina = DrainStamina(stamina, 12, 0)
	}
	if want := -20.0; !almostEqual(stamina, want) {
		t.Errorf("after 10 slices = %v, want %v", stamina, want)
	}
}

func TestOutputModifier(t *testing.T) {
	tests := []struct {
		name    string
		stamina float64
		want    float64
	}{
		{"positive stamina is full output", 1, 1},
		{"exactly zero is no output", 0, 0},
		{"negative is no output", -3, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := OutputModifier(tt.stamina); !almostEqual(got, tt.want) {
				t.Errorf("OutputModifier(%v) = %v, want %v", tt.stamina, got, tt.want)
			}
		})
	}
}

func TestRoomEfficiency(t *testing.T) {
	tests := []struct {
		name         string
		skillBonuses []float64
		synergyCombo float64
		want         float64
	}{
		{"empty room is base 1.0", nil, 0, 1.0},
		{"single bonus", []float64{0.2}, 0, 1.2},
		{"bonuses sum plus combo", []float64{0.2, 0.3}, 0.1, 1.6},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := RoomEfficiency(tt.skillBonuses, tt.synergyCombo)
			if !almostEqual(got, tt.want) {
				t.Errorf("RoomEfficiency(%v,%v) = %v, want %v", tt.skillBonuses, tt.synergyCombo, got, tt.want)
			}
		})
	}
}

func TestRecoverStamina(t *testing.T) {
	tests := []struct {
		name    string
		stamina float64
		regen   float64
		max     float64
		want    float64
	}{
		{"recover below cap", 5, 3, 10, 8},
		{"clamp at cap", 8, 5, 10, 10},
		{"already at cap", 10, 5, 10, 10},
		{"zero regen is no-op", 5, 0, 10, 5},
		{"never lowers below current", 50, 0, 0, 50},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := RecoverStamina(tt.stamina, tt.regen, tt.max)
			if !almostEqual(got, tt.want) {
				t.Errorf("RecoverStamina(%v,%v,%v) = %v, want %v", tt.stamina, tt.regen, tt.max, got, tt.want)
			}
		})
	}
}
