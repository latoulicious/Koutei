// Package httpadapter is the I/O-aware boundary between the numeric payload and
// the solver domain. Contract and payload shapes: docs/wiki/modules/api.md.
package httpadapter

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/latoulicious/koutei/internal/domain"
	"github.com/latoulicious/koutei/internal/solver"
)

// optimizeRequest is the numeric problem statement. target_priority is accepted
// but ignored — recipe matching is still solver-deferred.
type optimizeRequest struct {
	TimeHorizon    int           `json:"time_horizon"`
	TargetPriority string        `json:"target_priority,omitempty"`
	Operators      []operatorDTO `json:"operators"`
	Stations       []stationDTO  `json:"stations"`
}

// operatorDTO mirrors domain.Operator on the wire.
type operatorDTO struct {
	Stamina    float64 `json:"stamina"`
	StaminaMax float64 `json:"stamina_max"`
	DrainBase  float64 `json:"drain_base"`
	Regen      float64 `json:"regen"`
	SkillBonus float64 `json:"skill_bonus"`
	MoodBonus  float64 `json:"mood_bonus"`
}

// stationDTO mirrors domain.Station on the wire.
type stationDTO struct {
	Slots        int     `json:"slots"`
	SynergyCombo float64 `json:"synergy_combo"`
	Mood         bool    `json:"mood"`
}

// optimizeResponse mirrors solver.Schedule. execution_ms is envelope-only
// telemetry, never part of the deterministic schedule.
type optimizeResponse struct {
	TotalEfficiency float64    `json:"total_efficiency"`
	ExecutionMs     float64    `json:"execution_ms"`
	Slices          []sliceDTO `json:"slices"`
}

// sliceDTO is one time block.
type sliceDTO struct {
	Efficiency  float64         `json:"efficiency"`
	Assignments []assignmentDTO `json:"assignments"`
}

// assignmentDTO is a station's filled slots, by operator index into the request.
type assignmentDTO struct {
	Station   int   `json:"station"`
	Operators []int `json:"operators"`
}

// validate guards the boundary against inputs that would panic the solver's make
// caps (negative slots/horizon) or blow up its candidate enumeration.
func (req optimizeRequest) validate() error {
	if req.TimeHorizon < 1 || req.TimeHorizon > maxHorizon {
		return fmt.Errorf("time_horizon must be in [1, %d]", maxHorizon)
	}
	if len(req.Operators) > maxOperators {
		return fmt.Errorf("operators must be <= %d", maxOperators)
	}
	if len(req.Stations) > maxStations {
		return fmt.Errorf("stations must be <= %d", maxStations)
	}
	for i, s := range req.Stations {
		if s.Slots < 0 || s.Slots > maxSlots {
			return fmt.Errorf("stations[%d].slots must be in [0, %d]", i, maxSlots)
		}
	}
	return nil
}

// toDomain copies the numeric payload straight into the solver domain — no seed
// lookup, no string parsing.
func (req optimizeRequest) toDomain() ([]domain.Operator, []domain.Station) {
	ops := make([]domain.Operator, len(req.Operators))
	for i, o := range req.Operators {
		ops[i] = domain.Operator{
			Stamina:    o.Stamina,
			StaminaMax: o.StaminaMax,
			DrainBase:  o.DrainBase,
			Regen:      o.Regen,
			SkillBonus: o.SkillBonus,
			MoodBonus:  o.MoodBonus,
		}
	}
	stations := make([]domain.Station, len(req.Stations))
	for i, s := range req.Stations {
		stations[i] = domain.Station{
			Slots:        s.Slots,
			SynergyCombo: s.SynergyCombo,
			Mood:         s.Mood,
		}
	}
	return ops, stations
}

// toResponse serializes the schedule, stamping the measured solve duration in ms.
func toResponse(s solver.Schedule, elapsed time.Duration) optimizeResponse {
	resp := optimizeResponse{
		TotalEfficiency: s.Total,
		ExecutionMs:     float64(elapsed.Nanoseconds()) / 1e6,
		Slices:          make([]sliceDTO, len(s.Slices)),
	}
	for i, sl := range s.Slices {
		assigns := make([]assignmentDTO, len(sl.Assignments))
		for j, a := range sl.Assignments {
			assigns[j] = assignmentDTO{Station: a.Station, Operators: a.Operators}
		}
		resp.Slices[i] = sliceDTO{Efficiency: sl.Efficiency, Assignments: assigns}
	}
	return resp
}

// handleOptimize parses the payload, runs the optimal solver, logs solve time,
// and returns the timeline. 400 on any decode or validation failure.
func handleOptimize(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
	var req optimizeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}
	if err := req.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	ops, stations := req.toDomain()
	start := time.Now()
	schedule := solver.SolveBranchBound(ops, stations, req.TimeHorizon)
	elapsed := time.Since(start)

	log.Printf("optimize: horizon=%d operators=%d stations=%d total=%.4f in %s",
		req.TimeHorizon, len(ops), len(stations), schedule.Total, elapsed)
	writeJSON(w, http.StatusOK, toResponse(schedule, elapsed))
}
