package httpadapter

import (
	"encoding/json"
	"log"
	"net/http"
)

// Request-shaping limits; see docs/wiki/modules/api.md for rationale and ceilings.
const (
	maxBodyBytes = 1 << 20 // 1 MiB request cap
	maxHorizon   = 168     // a week of hourly slices
	maxOperators = 32      // ponytail: caps sliceCandidates blow-up; beam search if rosters outgrow it
	maxStations  = 32      // ponytail: same enumeration ceiling
	maxSlots     = 16      // per-station cap; also blocks the negative-slots make() panic
)

// NewRouter wires the versioned optimize endpoint and an unversioned /health probe.
// A path match with the wrong method returns 405 via the mux patterns.
func NewRouter() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/v1/optimize", handleOptimize)
	mux.HandleFunc("GET /health", handleHealth)
	return mux
}

func handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// writeJSON encodes v as the response body with the given status.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("encode response: %v", err)
	}
}

// writeError writes the JSON error envelope {"error": "..."}.
func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
