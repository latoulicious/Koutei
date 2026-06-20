// Package solver runs the greedy scheduling search over the numeric domain.
// Pure and deterministic; algorithm and Phase-2 path: docs/wiki/modules/solver.md.
package solver

import (
	"cmp"
	"slices"

	"github.com/latoulicious/koutei/internal/domain"
)

// Assignment is one station's filled slots for a single slice, by operator index.
type Assignment struct {
	Station   int
	Operators []int
}

// Slice is a single time block: who works where, and the summed room efficiency.
type Slice struct {
	Assignments []Assignment
	Efficiency  float64
}

// Schedule is the solver's full output: one Slice per horizon block plus the
// cumulative efficiency. Honest by construction — an infeasible slice records
// empty assignments and 0 efficiency, never a fabricated timeline.
type Schedule struct {
	Slices []Slice
	Total  float64
}

// Solve greedily assigns operators to station slots across horizon slices to
// maximize cumulative efficiency. It never mutates ops: stamina is tracked in a
// local copy, so the call is pure and repeatable.
func Solve(ops []domain.Operator, stations []domain.Station, horizon int) Schedule {
	stamina := make([]float64, len(ops))
	for i, op := range ops {
		stamina[i] = op.Stamina
	}

	schedule := Schedule{Slices: make([]Slice, 0, horizon)}
	for range horizon {
		slice := solveSlice(ops, stations, stamina)
		schedule.Slices = append(schedule.Slices, slice)
		schedule.Total += slice.Efficiency
	}
	return schedule
}

// solveSlice assigns one slice and drains the operators it placed. stamina is
// mutated in place — it is the working copy owned by Solve.
func solveSlice(ops []domain.Operator, stations []domain.Station, stamina []float64) Slice {
	// Available = positive-stamina operators, best bonus first. Stable sort over
	// index-ordered input breaks ties by index — the fixed tie-break that keeps
	// the search deterministic.
	avail := make([]int, 0, len(ops))
	for i := range ops {
		if domain.OutputModifier(stamina[i]) > 0 {
			avail = append(avail, i)
		}
	}
	slices.SortStableFunc(avail, func(a, b int) int {
		return cmp.Compare(ops[b].SkillBonus, ops[a].SkillBonus)
	})

	slice := Slice{Assignments: make([]Assignment, 0, len(stations))}
	assigned := make([]bool, len(ops))
	next := 0 // cursor into avail
	for s, station := range stations {
		picked := make([]int, 0, station.Slots)
		bonuses := make([]float64, 0, station.Slots)
		for len(picked) < station.Slots && next < len(avail) {
			op := avail[next]
			picked = append(picked, op)
			bonuses = append(bonuses, ops[op].SkillBonus)
			next++
		}
		if len(picked) == 0 {
			continue
		}
		slice.Assignments = append(slice.Assignments, Assignment{Station: s, Operators: picked})
		slice.Efficiency += domain.RoomEfficiency(bonuses, station.SynergyCombo)
		for _, op := range picked {
			assigned[op] = true
			// ponytail: moodBonus fixed at 0 — cross-station Mood Nexus aura is Phase 2.
			stamina[op] = domain.DrainStamina(stamina[op], ops[op].DrainBase, 0)
		}
	}
	// Unassigned operators rest and recover — the rotation that lets a drained
	// operator return to production a later slice.
	for i := range ops {
		if !assigned[i] {
			stamina[i] = domain.RecoverStamina(stamina[i], ops[i].Regen, ops[i].StaminaMax)
		}
	}
	return slice
}
