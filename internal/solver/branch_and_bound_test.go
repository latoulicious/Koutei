package solver

import (
	"math"
	"reflect"
	"testing"

	"github.com/latoulicious/koutei/internal/domain"
)

func almostEqual(a, b float64) bool { return math.Abs(a-b) <= bnbEpsilon }

// Greedy burns both high-bonus operators in slice 0, leaving only the weak
// operator for slice 1. Branch-and-bound spreads them — one strong operator per
// slice, the weak one filling the second slot each time — for a higher total.
func TestSolveBranchBound_BeatsGreedy(t *testing.T) {
	ops := []domain.Operator{
		{Stamina: 10, StaminaMax: 10, DrainBase: 10, SkillBonus: 0.9}, // one-shot
		{Stamina: 10, StaminaMax: 10, DrainBase: 10, SkillBonus: 0.8}, // one-shot
		{Stamina: 20, StaminaMax: 20, DrainBase: 10, SkillBonus: 0.1}, // two-shot
	}
	stations := []domain.Station{{Slots: 2}}

	greedy := Solve(ops, stations, 2)
	if want := 3.8; !almostEqual(greedy.Total, want) {
		t.Fatalf("greedy Total = %v, want %v (sanity)", greedy.Total, want)
	}

	got := SolveBranchBound(ops, stations, 2)
	if want := 3.9; !almostEqual(got.Total, want) {
		t.Errorf("B&B Total = %v, want %v (optimal spread)", got.Total, want)
	}
	if got.Total <= greedy.Total {
		t.Errorf("B&B Total %v not better than greedy %v", got.Total, greedy.Total)
	}
}

// B&B is never worse than greedy on a spread of inputs (the incumbent floor).
func TestSolveBranchBound_NeverWorseThanGreedy(t *testing.T) {
	cases := []struct {
		name     string
		ops      []domain.Operator
		stations []domain.Station
		horizon  int
	}{
		{
			"single op single slot",
			[]domain.Operator{{Stamina: 100, DrainBase: 1, SkillBonus: 0.25}},
			[]domain.Station{{Slots: 1}}, 3,
		},
		{
			"rotation with recovery",
			[]domain.Operator{
				{Stamina: 10, StaminaMax: 10, DrainBase: 10, Regen: 5, SkillBonus: 0.5},
				{Stamina: 10, StaminaMax: 10, DrainBase: 10, Regen: 5, SkillBonus: 0.3},
			},
			[]domain.Station{{Slots: 1}}, 4,
		},
		{
			"two stations with synergy",
			[]domain.Operator{
				{Stamina: 30, StaminaMax: 30, DrainBase: 10, Regen: 4, SkillBonus: 0.6},
				{Stamina: 30, StaminaMax: 30, DrainBase: 10, Regen: 4, SkillBonus: 0.4},
				{Stamina: 30, StaminaMax: 30, DrainBase: 10, Regen: 4, SkillBonus: 0.2},
			},
			[]domain.Station{{Slots: 2, SynergyCombo: 0.1}, {Slots: 1}}, 3,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			greedy := Solve(tc.ops, tc.stations, tc.horizon)
			bnb := SolveBranchBound(tc.ops, tc.stations, tc.horizon)
			if bnb.Total+bnbEpsilon < greedy.Total {
				t.Errorf("B&B Total %v worse than greedy %v", bnb.Total, greedy.Total)
			}
		})
	}
}

// Same input twice yields an identical schedule, ties included.
func TestSolveBranchBound_Deterministic(t *testing.T) {
	ops := []domain.Operator{
		{Stamina: 50, StaminaMax: 50, DrainBase: 5, Regen: 3, SkillBonus: 0.2},
		{Stamina: 50, StaminaMax: 50, DrainBase: 5, Regen: 3, SkillBonus: 0.2}, // tie
		{Stamina: 30, StaminaMax: 30, DrainBase: 8, Regen: 3, SkillBonus: 0.4},
	}
	stations := []domain.Station{{Slots: 2, SynergyCombo: 0.1}}

	a := SolveBranchBound(ops, stations, 4)
	b := SolveBranchBound(ops, stations, 4)
	if !reflect.DeepEqual(a, b) {
		t.Errorf("non-deterministic:\n a = %+v\n b = %+v", a, b)
	}
}

// Slot capacity stays hard: no station ever holds more than its slots.
func TestSolveBranchBound_SlotCapacity(t *testing.T) {
	ops := []domain.Operator{
		{Stamina: 100, DrainBase: 1, SkillBonus: 0.5},
		{Stamina: 100, DrainBase: 1, SkillBonus: 0.3},
		{Stamina: 100, DrainBase: 1, SkillBonus: 0.2},
	}
	stations := []domain.Station{{Slots: 2}}

	got := SolveBranchBound(ops, stations, 2)
	for s, slice := range got.Slices {
		for _, a := range slice.Assignments {
			if len(a.Operators) > stations[a.Station].Slots {
				t.Errorf("slice %d station %d: %d operators exceed %d slots",
					s, a.Station, len(a.Operators), stations[a.Station].Slots)
			}
		}
	}
}

// An operator that drains to zero cannot be re-placed: greedy seeds the incumbent
// by working it in slice 0, and no resting variant beats that, so slice 1 is empty.
func TestSolveBranchBound_ZeroStaminaPruned(t *testing.T) {
	ops := []domain.Operator{{Stamina: 10, DrainBase: 10, SkillBonus: 0.5}}
	stations := []domain.Station{{Slots: 1}}

	got := SolveBranchBound(ops, stations, 2)
	if n := len(got.Slices[0].Assignments); n != 1 {
		t.Errorf("slice 0 assignments = %d, want 1", n)
	}
	if n := len(got.Slices[1].Assignments); n != 0 {
		t.Errorf("slice 1 assignments = %d, want 0 (operator pruned at zero stamina)", n)
	}
}
