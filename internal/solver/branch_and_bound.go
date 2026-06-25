package solver

import (
	"cmp"
	"slices"

	"github.com/latoulicious/koutei/internal/domain"
)

// maxNodes caps the search: the per-slice assignment space is exponential, so an
// adversarial input could otherwise hang it. Counts nodes, not wall-clock, for determinism.
// ponytail: fixed node budget; swap for best-first or beam search if rosters exhaust it.
const maxNodes = 1 << 20

// bnbEpsilon absorbs float noise in the bound, dominance, and incumbent compares.
const bnbEpsilon = 1e-9

// SolveBranchBound maximizes cumulative efficiency via branch-and-bound, seeded by
// greedy Solve as the incumbent. Proven optimal within maxNodes, else best-found
// (never worse than greedy). Deterministic and pure like Solve.
func SolveBranchBound(ops []domain.Operator, stations []domain.Station, horizon int) Schedule {
	stamina := make([]float64, len(ops))
	for i, op := range ops {
		stamina[i] = op.Stamina
	}

	best := Solve(ops, stations, horizon) // greedy lower bound
	maxSlice := maxSliceEfficiency(ops, stations)
	frontier := make([][]frontierNode, horizon) // dominance memo, one entry per depth
	nodes := 0

	var dfs func(t int, stamina []float64, acc float64, partial []Slice)
	dfs = func(t int, stamina []float64, acc float64, partial []Slice) {
		if nodes >= maxNodes {
			return
		}
		nodes++

		if t == horizon {
			if acc > best.Total+bnbEpsilon {
				best = Schedule{Slices: slices.Clone(partial), Total: acc}
			}
			return
		}
		// Bound: best possible over the remaining slices can't beat the incumbent — cut.
		if acc+float64(horizon-t)*maxSlice <= best.Total+bnbEpsilon {
			return
		}
		// Dominance: a prior node here with >= stamina and >= acc does no worse — cut.
		if dominated(frontier[t], stamina, acc) {
			return
		}
		frontier[t] = append(frontier[t], frontierNode{stamina: slices.Clone(stamina), acc: acc})

		for _, c := range sliceCandidates(ops, stations, stamina) {
			dfs(t+1, c.stamina, acc+c.slice.Efficiency, append(slices.Clone(partial), c.slice))
		}
	}
	dfs(0, stamina, 0, nil)
	return best
}

// frontierNode is one explored state at a fixed depth: the working stamina vector
// and the efficiency accumulated to reach it. Used only for dominance pruning.
type frontierNode struct {
	stamina []float64
	acc     float64
}

// dominated reports whether a recorded node here has >= acc and >= stamina everywhere.
// Sound because value-to-go is monotone in stamina, so such a node does no worse — prune.
func dominated(frontier []frontierNode, stamina []float64, acc float64) bool {
	for _, f := range frontier {
		if f.acc+bnbEpsilon < acc {
			continue // less accumulated efficiency — cannot dominate
		}
		dominates := true
		for i := range stamina {
			if f.stamina[i]+bnbEpsilon < stamina[i] {
				dominates = false
				break
			}
		}
		if dominates {
			return true
		}
	}
	return false
}

// candidate is one slice's resolved assignment: the placed slots with their
// efficiency, plus the stamina vector after draining the placed and resting the rest.
type candidate struct {
	slice   Slice
	stamina []float64
}

// sliceCandidates enumerates every legal slice assignment (each station any subset
// up to its slots, empty = rest), best-efficiency first; stable order keeps it deterministic.
func sliceCandidates(ops []domain.Operator, stations []domain.Station, stamina []float64) []candidate {
	avail := availableSorted(ops, stamina)

	var out []candidate
	var rec func(s int, pool []int, picks []Assignment, eff float64)
	rec = func(s int, pool []int, picks []Assignment, eff float64) {
		if s == len(stations) {
			out = append(out, finalizeCandidate(ops, stations, stamina, picks, eff))
			return
		}
		for _, subset := range subsetsUpTo(pool, stations[s].Slots) {
			nextPicks, nextEff := picks, eff
			if len(subset) > 0 {
				// Empty rooms add nothing — matches greedy, which skips them.
				nextEff += domain.RoomEfficiency(bonusesOf(ops, subset))
				nextPicks = append(slices.Clone(picks), Assignment{Station: s, Operators: subset})
			}
			rec(s+1, removeAll(pool, subset), nextPicks, nextEff)
		}
	}
	rec(0, avail, nil, 0)

	slices.SortStableFunc(out, func(a, b candidate) int {
		return cmp.Compare(b.slice.Efficiency, a.slice.Efficiency)
	})
	return out
}

// availableSorted mirrors solveSlice's candidate set: positive stamina, highest
// SkillBonus first, index tie-break. Duplicated to keep the greedy path untouched.
func availableSorted(ops []domain.Operator, stamina []float64) []int {
	avail := make([]int, 0, len(ops))
	for i := range ops {
		if domain.OutputModifier(stamina[i]) > 0 {
			avail = append(avail, i)
		}
	}
	slices.SortStableFunc(avail, func(a, b int) int {
		return cmp.Compare(ops[b].SkillBonus, ops[a].SkillBonus)
	})
	return avail
}

// finalizeCandidate drains the placed operators (minus the slice's mood aura) and
// rests the rest, returning the next stamina vector. Mirrors solveSlice, on a clone.
func finalizeCandidate(ops []domain.Operator, stations []domain.Station, stamina []float64, picks []Assignment, eff float64) candidate {
	next := slices.Clone(stamina)
	assigned := make([]bool, len(ops))
	moodBonuses := make([]float64, 0, len(ops))
	for _, a := range picks {
		for _, op := range a.Operators {
			assigned[op] = true
			if stations[a.Station].Mood {
				moodBonuses = append(moodBonuses, ops[op].MoodBonus)
			}
		}
	}
	mood := domain.MoodAura(moodBonuses)
	for i := range ops {
		if assigned[i] {
			next[i] = domain.DrainStamina(next[i], ops[i].DrainBase, mood)
		} else {
			next[i] = domain.RecoverStamina(next[i], ops[i].Regen, ops[i].StaminaMax)
		}
	}
	return candidate{slice: Slice{Assignments: picks, Efficiency: eff}, stamina: next}
}

// maxSliceEfficiency is an admissible upper bound on one slice: every station staffed
// with the globally highest bonuses, ignoring stamina. Stamina only removes options,
// so the real max never exceeds this — which keeps the B&B bound valid.
// ponytail: assumes non-negative bonus; negatives dropped to stay an over-estimate.
func maxSliceEfficiency(ops []domain.Operator, stations []domain.Station) float64 {
	totalSlots := 0
	sum := 0.0
	for _, st := range stations {
		totalSlots += st.Slots
		sum += domain.RoomEfficiency(nil) // base 1.0 per room
	}
	bonuses := make([]float64, 0, len(ops))
	for _, op := range ops {
		if op.SkillBonus > 0 {
			bonuses = append(bonuses, op.SkillBonus)
		}
	}
	slices.SortFunc(bonuses, func(a, b float64) int { return cmp.Compare(b, a) })
	if len(bonuses) > totalSlots {
		bonuses = bonuses[:totalSlots]
	}
	for _, b := range bonuses {
		sum += b
	}
	return sum
}

// bonusesOf collects the SkillBonus of each operator in the subset, order preserved.
func bonusesOf(ops []domain.Operator, subset []int) []float64 {
	out := make([]float64, len(subset))
	for i, op := range subset {
		out[i] = ops[op].SkillBonus
	}
	return out
}

// subsetsUpTo returns every subset of pool sized 0..maxSize, each fresh, in fixed
// order (empty first). Size 0 = leave the station empty, resting those operators.
func subsetsUpTo(pool []int, maxSize int) [][]int {
	var res [][]int
	var rec func(start int, cur []int)
	rec = func(start int, cur []int) {
		res = append(res, slices.Clone(cur))
		if len(cur) == maxSize {
			return
		}
		for i := start; i < len(pool); i++ {
			rec(i+1, append(slices.Clone(cur), pool[i]))
		}
	}
	rec(0, nil)
	return res
}

// removeAll returns pool without any element present in subset, order preserved.
func removeAll(pool, subset []int) []int {
	drop := make(map[int]bool, len(subset))
	for _, x := range subset {
		drop[x] = true
	}
	out := make([]int, 0, len(pool))
	for _, x := range pool {
		if !drop[x] {
			out = append(out, x)
		}
	}
	return out
}
