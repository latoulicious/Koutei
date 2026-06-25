package httpadapter

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/latoulicious/koutei/internal/domain"
	"github.com/latoulicious/koutei/internal/solver"
)

func doRequest(t *testing.T, method, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	rec := httptest.NewRecorder()
	NewRouter().ServeHTTP(rec, req)
	return rec
}

// TestOptimize_HappyPath cross-checks the mapping: the handler's total must equal
// a direct solver call on the same inputs, and execution_ms must be present.
func TestOptimize_HappyPath(t *testing.T) {
	body := `{
		"time_horizon": 3,
		"operators": [
			{"stamina":100,"stamina_max":100,"drain_base":20,"regen":15,"skill_bonus":0.5,"mood_bonus":0},
			{"stamina":100,"stamina_max":100,"drain_base":20,"regen":15,"skill_bonus":0.3,"mood_bonus":0}
		],
		"stations": [ {"slots":1,"mood":false} ]
	}`
	rec := doRequest(t, http.MethodPost, "/api/v1/optimize", body)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", rec.Code, rec.Body.String())
	}

	var resp optimizeResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	ops := []domain.Operator{
		{Stamina: 100, StaminaMax: 100, DrainBase: 20, Regen: 15, SkillBonus: 0.5},
		{Stamina: 100, StaminaMax: 100, DrainBase: 20, Regen: 15, SkillBonus: 0.3},
	}
	want := solver.SolveBranchBound(ops, []domain.Station{{Slots: 1}}, 3)
	if resp.TotalEfficiency != want.Total {
		t.Errorf("total_efficiency = %v, want %v", resp.TotalEfficiency, want.Total)
	}
	if len(resp.Slices) != len(want.Slices) {
		t.Errorf("slices = %d, want %d", len(resp.Slices), len(want.Slices))
	}
	if resp.ExecutionMs < 0 {
		t.Errorf("execution_ms = %v, want >= 0", resp.ExecutionMs)
	}
}

// TestOptimize_BadRequests covers the boundary guards: decode failure, the
// horizon/slots bounds that would otherwise panic the solver, and method mismatch.
func TestOptimize_BadRequests(t *testing.T) {
	tests := []struct {
		name   string
		method string
		path   string
		body   string
		want   int
	}{
		{"bad json", http.MethodPost, "/api/v1/optimize", `{not json`, http.StatusBadRequest},
		{"zero horizon", http.MethodPost, "/api/v1/optimize", `{"time_horizon":0,"operators":[],"stations":[]}`, http.StatusBadRequest},
		{"negative slots", http.MethodPost, "/api/v1/optimize", `{"time_horizon":1,"operators":[],"stations":[{"slots":-1}]}`, http.StatusBadRequest},
		{"wrong method", http.MethodGet, "/api/v1/optimize", "", http.StatusMethodNotAllowed},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := doRequest(t, tt.method, tt.path, tt.body)
			if rec.Code != tt.want {
				t.Errorf("status = %d, want %d; body=%s", rec.Code, tt.want, rec.Body.String())
			}
		})
	}
}

func TestHealth(t *testing.T) {
	rec := doRequest(t, http.MethodGet, "/health", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
}
