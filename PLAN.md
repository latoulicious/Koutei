# Koutei — Project Blueprint

> Consolidated from the original `plan 1.md` (backend engine), `plan 2.md`
> (frontend visual language), and `plan 3.md` (combined picture + action plan).
> Single source of intent. The wiki under `docs/wiki/` tracks what the code
> actually does; this file is the design target.

## Philosophy

**Koutei (工程)** — in Japanese industrial engineering, the manufacturing process:
the routing of materials and the strict sequence of operations for peak efficiency,
the elimination of *Muda* (waste). The software does not guess an assignment; it
proves the mathematically optimal path. The aesthetic mirrors that: stripped of
gaming-dashboard clutter, a clean high-contrast wayfinding look inspired by
industrial control rooms.

A local-first, high-performance optimizer for the multi-station operator rotation
problem on the OMV Dijiang and surface outposts in Arknights: Endfield.

---

## 1. System Architecture & Boundaries

```txt
            Browser (TypeScript / Web UI)
              - input:  roster state + target priority
              - render: best-placement timeline
                       │
                       ▼  [JSON over HTTP]
            ─────────────────────────────────────────────
            Go performance backend
              ┌────────────────────────┐   ┌──────────────────────────┐
              │ HTTP API router         │   │ Constraint solver core   │
              │ parsers → domain model  │──►│ - branch-and-bound / DP  │
              └────────────────────────┘   │ - state-tree pruning     │
                                           └──────────────────────────┘
```

**Core design philosophy**

- **Stateless & local-first** — no database or infra on the VPS. The request
  carries the current state; the response is the timeline.
- **Strict separation of concerns** — the calculation engine has zero awareness of
  HTTP or game-specific naming strings. It runs purely on raw numeric matrices.

---

## 2. Mathematical Domain & Optimization Model

The engine models a **multi-resource constrained assignment problem** over a
discretized timeline (`T` slices of, e.g., 1-hour blocks).

### API payload

**Request** — `POST /api/v1/optimize`

```json
{
  "target_priority": "weapon_exp",
  "time_horizon_hours": 24,
  "roster": [
    { "id": "perlica", "level": 40, "current_stamina": 100, "base_skills": ["aic_weapon_exp_20"] },
    { "id": "snowshine", "level": 40, "current_stamina": 80, "base_skills": ["mood_nexus_12"] },
    { "id": "chen_qianyu", "level": 35, "current_stamina": 50, "base_skills": ["growth_chamber_20"] }
  ],
  "facilities": [
    { "id": "aic_manufacturing", "slots": 2, "active_recipe": "weapon_exp_set" },
    { "id": "mood_nexus", "slots": 1, "active_recipe": "stamina_regen_aura" },
    { "id": "growth_chamber", "slots": 1, "active_recipe": "mineral_growth" }
  ]
}
```

### Rules engine (backend constraints)

1. **Stamina drain** — while in a standard slot, stamina decays linearly per slice:
   `stamina_{t+1} = stamina_t − (Δ_base × (1 − MoodNexusBonus))`
2. **Zero-stamina penalty** — at `stamina ≤ 0` the operator's output modifier drops
   to `0%` immediately.
3. **Synergy evaluator** — multi-slot room (e.g. AIC Manufacturing) efficiency:
   `efficiency_total = 1.0 + Σ(operatorSkillBonus) + synergyCombo`

---

## 3. Data Sourcing Strategy

Endfield has no public developer API. Source game variables once into clean JSON.

### Approach A — community wiki scraping (automated seeding)

- **Sources** — community data sheets and open-source fan-wiki companions
  (operator base passives at level 40/60/80, station recipes, yields).
- **Implementation** — a ~20-line TS/Node script (axios + cheerio) extracts table
  rows matching operator names + base skill text, saving static JSON configs into
  the Go storage layer (embedded). One-off seeding, not a runtime dependency.

### Approach B — local user data injection (no auth needed)

1. **JSON sandbox UI** — sliders + character cards to set up the current roster
   state without typing code.
2. **localStorage persistence** — the unlocked roster + level breakpoints live in
   the browser, entered once.

---

## 4. Frontend Visual Blueprint

Swiss Minimalism + industrial grid systems. Lightweight, snappy, backend-first.

### Color palette — "Control Room Minimal"

| Element | Hex | Purpose |
|---|---|---|
| Primary background | `#121416` | matte charcoal — non-glare canvas |
| Surface / cards | `#1A1D20` | light charcoal — isolates panels |
| Borders & grids | `#2B3036` | steel slate — structural lines |
| Primary accent | `#F2A900` | warning amber — warnings, critical stats, active |
| Success / optimal | `#00B388` | safe energy green — full stamina, peak output |
| Muted text | `#8A94A0` | conduit gray — labels, units, meta |

### Typography & form

- Monospace for telemetry numbers (JetBrains Mono / SF Mono); a neutral
  neo-grotesque sans for UI labels (Inter / Helvetica Neue).
- Sharp corners (0–2px radius). No gradients, no organic shadows. Solid 1px slate
  separators — physical terminal panels.

### Layout — three columns (Input → Processing → Output)

1. **Roster slate** — vertical scannable operator list; blocky stamina bars
   (`[██████░░░░]`) shifting green → amber as they drain; hovering an operator
   highlights the station slots where their passives trigger a multiplier.
2. **Station matrix** — grid of OMV Dijiang rooms + outposts; each card shows input
   requirement, output product, empty slots; master toggle for target priority.
3. **Gantt timeline (the showpiece)** — the solver output as a vertical, scrollable
   step-by-step dispatch timeline in hour blocks; rotation swaps draw a connection
   line; a floating badge shows total efficiency rating + solver execution time
   (e.g. `Executed in 0.84ms`).

---

## 5. Build Phases

| Phase | Goal | Stack |
|---|---|---|
| 1 | Core domain & types — `Operator`, `Station`, `TimelineState`, `ScheduleOutput`; encode the 3 rules; unit tests on static cases (drain over N hours, zero-stamina prune, synergy). Greedy solver + local CLI to get numbers flowing. | Go |
| 2 | Solver search engine — greedy state-eval loop, then branch-and-bound with pruning (reject zero-stamina-in-production and dominated branches). | Go |
| 3 | API & hosting — wrap the solver in an HTTP router (`POST /api/v1/optimize`); deploy the binary on the VPS behind nginx; surface execution-time logs. | Go + nginx |
| 4 | Interface — three-column matte grid (Tailwind); fetch client → VPS endpoint; render the timeline dynamically. | TypeScript |

> Data seeding (§3) is a build-time concern, not a phase: Phase 1 needs only 2–3
> hardcoded operators for tests; run the scraper before Phase 3/4 when real numbers
> are needed.

> **ON HOLD (2026-06-21).** Phases 1–4 ship end-to-end, but on *placeholder* stamina
> mechanics. The four real constants — stamina base/max, drain (decay) rate, regen
> rate, mood→stamina decay-reduction rate — are not in any reliable source (they live
> in the encrypted game client). Held until that data is found. Sources searched and
> ruled out: `docs/wiki/data.md` § "Blocking data gap".

### Implementation recommendation

Build the core in Go to use native concurrency: split the scheduling look-ahead
across goroutines (e.g. `weapon_exp` vs `operator_exp` priorities as separate
scenarios) and merge the optimal paths into one unified timeline response.
