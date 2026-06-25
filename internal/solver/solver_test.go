package solver

import (
	"reflect"
	"slices"
	"testing"

	"github.com/latoulicious/koutei/internal/domain"
)

// Highest bonus fills first; the third operator idles when slots run out.
func TestSolve_SlotCapacity(t *testing.T) {
	ops := []domain.Operator{
		{Stamina: 100, SkillBonus: 0.3},
		{Stamina: 100, SkillBonus: 0.2},
		{Stamina: 100, SkillBonus: 0.1},
	}
	stations := []domain.Station{{Slots: 2}}

	got := Solve(ops, stations, 1)
	if len(got.Slices) != 1 {
		t.Fatalf("slices = %d, want 1", len(got.Slices))
	}
	picked := got.Slices[0].Assignments[0].Operators
	if want := []int{0, 1}; !slices.Equal(picked, want) {
		t.Errorf("picked = %v, want %v (best bonus first, capacity 2)", picked, want)
	}
}

// An operator that drains to zero is excluded from the next slice.
func TestSolve_ZeroStaminaPruned(t *testing.T) {
	ops := []domain.Operator{{Stamina: 10, DrainBase: 10, SkillBonus: 0.5}}
	stations := []domain.Station{{Slots: 1}}

	got := Solve(ops, stations, 2)
	if n := len(got.Slices[0].Assignments); n != 1 {
		t.Errorf("slice 0 assignments = %d, want 1", n)
	}
	if n := len(got.Slices[1].Assignments); n != 0 {
		t.Errorf("slice 1 assignments = %d, want 0 (operator pruned at zero stamina)", n)
	}
}

// Same input twice yields an identical schedule, including under bonus ties.
func TestSolve_Deterministic(t *testing.T) {
	ops := []domain.Operator{
		{Stamina: 50, DrainBase: 5, SkillBonus: 0.2},
		{Stamina: 50, DrainBase: 5, SkillBonus: 0.2}, // tie — index breaks it
		{Stamina: 30, DrainBase: 8, SkillBonus: 0.4},
	}
	stations := []domain.Station{{Slots: 2}}

	a := Solve(ops, stations, 5)
	b := Solve(ops, stations, 5)
	if !reflect.DeepEqual(a, b) {
		t.Errorf("non-deterministic:\n a = %+v\n b = %+v", a, b)
	}
}

// Efficiency is RoomEfficiency over the placed operator: 1.0 + 0.25.
func TestSolve_Efficiency(t *testing.T) {
	ops := []domain.Operator{{Stamina: 100, DrainBase: 1, SkillBonus: 0.25}}
	stations := []domain.Station{{Slots: 1}}

	got := Solve(ops, stations, 1)
	if want := 1.25; got.Total != want {
		t.Errorf("Total = %v, want %v", got.Total, want)
	}
}

// A mood operator staffing a mood station halves the worker's drain, so it keeps
// producing slice 1 instead of draining out in slice 0 and being pruned.
func TestSolve_MoodAura(t *testing.T) {
	ops := []domain.Operator{
		{Stamina: 10, DrainBase: 10, SkillBonus: 0.5}, // worker
		{Stamina: 100, MoodBonus: 0.5},                // mood provider
	}
	stations := []domain.Station{{Slots: 1}, {Slots: 1, Mood: true}}

	got := Solve(ops, stations, 2)
	for s := range 2 {
		if !workerInStation(got.Slices[s], 0, 0) {
			t.Errorf("slice %d: worker missing from station 0 (aura should keep it producing)", s)
		}
	}
}

// workerInStation reports whether op is placed in the given station in the slice.
func workerInStation(slice Slice, station, op int) bool {
	for _, a := range slice.Assignments {
		if a.Station == station && slices.Contains(a.Operators, op) {
			return true
		}
	}
	return false
}

// A drained operator rests, recovers, and rotates back in while a second operator
// covers the slot meanwhile. Without recovery the schedule would idle after {0}.
func TestSolve_RestRecovery(t *testing.T) {
	ops := []domain.Operator{
		{Stamina: 10, StaminaMax: 10, DrainBase: 10, Regen: 5, SkillBonus: 0.5},
		{Stamina: 10, StaminaMax: 10, DrainBase: 10, Regen: 5, SkillBonus: 0.3},
	}
	stations := []domain.Station{{Slots: 1}}

	got := Solve(ops, stations, 4)
	want := [][]int{{0}, {1}, {0}, {1}}
	for i, slice := range got.Slices {
		if len(slice.Assignments) != 1 {
			t.Fatalf("slice %d: assignments = %d, want 1", i, len(slice.Assignments))
		}
		if op := slice.Assignments[0].Operators; !slices.Equal(op, want[i]) {
			t.Errorf("slice %d: operators = %v, want %v", i, op, want[i])
		}
	}
}
