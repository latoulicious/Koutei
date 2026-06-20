package solver

import (
	"cmp"
	"slices"

	"github.com/latoulicious/koutei/internal/domain"
)

// maxNodes caps the branch-and-bound search for operational safety: the per-slice
// assignment space is exponential in roster size, so an adversarial input could
// otherwise hang the solver. The budget counts nodes visited — never wall-clock —
// so the cap stays deterministic and reproducible.
// ponytail: fixed node budget; swap for best-first or beam search if real rosters
// routinely exhaust it.
const maxNodes = 1 << 20

// bnbEpsilon absorbs float noise in the bound, dominance, and incumbent compares.
const bnbEpsilon = 1e-9

// SolveBranchBound returns the cumulative-efficiency-maximizing schedule via
// branch-and-bound, seeded by the greedy Solve as its initial incumbent (lower
// bound). It is proven optimal when the search completes within maxNodes;
// otherwise it returns the best schedule found, which is never worse than greedy.
// Pure and deterministic like Solve: fixed candidate order, index tie-break, and a
// node-count budget rather than a clock.
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
		// Bound: even the unconstrained best for every remaining slice cannot beat
		// the incumbent — cut.
		if acc+float64(horizon-t)*maxSlice <= best.Total+bnbEpsilon {
			return
		}
		// Dominance: a prior node at this depth with at-least-equal stamina
		// everywhere and at-least-equal accumulated efficiency can do at least as
		// well, so this branch adds nothing — cut.
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

// dominated reports whether some recorded node at this depth has at-least-equal
// accumulated efficiency and at-least-equal stamina in every slot. Such a node can
// replicate any future this one could reach and do no worse — value-to-go is
// monotone non-decreasing in stamina — so the current branch is redundant.
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

// candidate is one fully-resolved assignment for a single slice: the placed slots
// with their efficiency, plus the stamina vector that results from draining the
// operators placed and resting the rest.
type candidate struct {
	slice   Slice
	stamina []float64
}

// sliceCandidates enumerates every legal assignment for one slice — each station
// staffed by any subset of the available operators up to its slot capacity,
// including empty (rest the operator instead). Returned best-immediate-efficiency
// first, which sharpens pruning; the stable sort over deterministic generation
// order keeps ties — and the whole search — reproducible.
func sliceCandidates(ops []domain.Operator, stations []domain.Station, stamina []float64) []candidate {
	avail := availableSorted(ops, stamina)

	var out []candidate
	var rec func(s int, pool []int, picks []Assignment, eff float64)
	rec = func(s int, pool []int, picks []Assignment, eff float64) {
		if s == len(stations) {
			out = append(out, finalizeCandidate(ops, stamina, picks, eff))
			return
		}
		for _, subset := range subsetsUpTo(pool, stations[s].Slots) {
			nextPicks, nextEff := picks, eff
			if len(subset) > 0 {
				// Empty rooms add nothing — matches greedy, which skips them.
				nextEff += domain.RoomEfficiency(bonusesOf(ops, subset), stations[s].SynergyCombo)
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

// availableSorted mirrors solveSlice's candidate set: positive-stamina operators,
// highest SkillBonus first, index tie-break. Duplicated rather than shared so the
// greedy path stays untouched by Phase 2.
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

// finalizeCandidate drains every placed operator and rests every other one,
// producing the stamina vector for the next slice. Mirrors solveSlice's drain/rest
// step exactly, on a clone so the caller's vector is untouched.
func finalizeCandidate(ops []domain.Operator, stamina []float64, picks []Assignment, eff float64) candidate {
	next := slices.Clone(stamina)
	assigned := make([]bool, len(ops))
	for _, a := range picks {
		for _, op := range a.Operators {
			assigned[op] = true
			// ponytail: moodBonus fixed at 0 — cross-station Mood Nexus aura is a later Phase-2 item.
			next[op] = domain.DrainStamina(next[op], ops[op].DrainBase, 0)
		}
	}
	for i := range ops {
		if !assigned[i] {
			next[i] = domain.RecoverStamina(next[i], ops[i].Regen, ops[i].StaminaMax)
		}
	}
	return candidate{slice: Slice{Assignments: picks, Efficiency: eff}, stamina: next}
}

// maxSliceEfficiency is an admissible upper bound on any single slice's efficiency:
// every station staffed and the globally highest bonuses placed, ignoring stamina.
// Stamina constraints only ever remove options, so the real per-slice max never
// exceeds this — which is what keeps the branch-and-bound bound valid.
// ponytail: assumes non-negative synergy/bonus (the domain reality); negative
// bonuses are dropped so the estimate stays an over-, never under-, estimate.
func maxSliceEfficiency(ops []domain.Operator, stations []domain.Station) float64 {
	totalSlots := 0
	sum := 0.0
	for _, st := range stations {
		totalSlots += st.Slots
		sum += domain.RoomEfficiency(nil, st.SynergyCombo) // 1.0 + synergyCombo per room
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

// subsetsUpTo returns every subset of pool with size 0..maxSize, each a fresh
// slice, in a fixed order (empty first, then increasing). Size 0 represents
// leaving the station empty and resting those operators.
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
