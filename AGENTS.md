# Project Agent Instructions

You are working inside **Koutei (工程)** — a local-first operator/shift optimizer
for Arknights: Endfield. A stateless Go constraint solver behind a TypeScript SPA;
no database, no broker, single static binary on a VPS behind nginx.

Your primary role is:

* understanding the existing codebase
* implementing features safely
* debugging issues
* performing targeted refactors
* maintaining architecture consistency
* updating project documentation when needed

Do not immediately generate code from prompt context alone.

Always inspect existing implementation first.

Prioritize **correctness, maintainability, readability, operational safety, small
reviewable diffs** over theoretical purity, unnecessary abstractions, broad rewrites.

---

# Repository Layout

| Path | Component | Stack | Notes |
|---|---|---|---|
| (backend) | API + solver | Go | HTTP adapter + pure solver core; `POST /api/v1/optimize` |
| (web) | Web UI | TypeScript SPA | local-first; roster state in `localStorage` |
| `PLAN.md` | blueprint | — | consolidated backend / frontend / build phases |

Greenfield: code is not written yet. Architecture overview:
`docs/wiki/architecture.md`. Solver contract: `docs/wiki/modules/solver.md`.

---

# Project Wiki

Documentation lives in `docs/wiki`. Read relevant docs before significant work.

```txt
docs/wiki/
  README.md              index
  architecture.md        3-layer boundary (web → HTTP → solver core)
  domain.md              operators / stations / timeline / stamina / synergy
  conventions.md         coding + commit conventions
  data.md                no DB — request payload + localStorage + static seed
  known-constraints.md   hidden contracts (string-agnostic core, determinism)
  troubleshooting.md     debugging findings, operational caveats
  findings.md            code-review findings log (paired with resolutions.md)
  resolutions.md         fixes for findings (same IDs, never orphaned)
  deploy.md              single-binary VPS + nginx runbook
  modules/               per-component contracts
  sessions/              append-only session history (DD-MM-YYYY.md)
  decisions/             architecture decision records
  coderabbit/            CodeRabbit review session logs
```

If documentation conflicts with implementation: **treat code as source of truth**
and mention the drift.

---

# Session Logging

After meaningful implementation changes, append (never overwrite) an entry to
`docs/wiki/sessions/DD-MM-YYYY.md`:

```md
---
time: 08:42 PM
type: feature|fix|refactor|investigation|docs
breaking_change: false
modules:
  - example-module
---

# Summary
# Files Touched
# Previous Behavior
# New Behavior
# Reason For Change
# Risks
# Notes
```

---

# Before Writing Code

1. inspect surrounding code
2. identify existing patterns
3. identify affected components
4. identify hidden contracts
5. identify rollback risk
6. prefer the smallest safe implementation

Do not assume current structure is accidental. The hidden contracts here are real
(see Change Safety below and `docs/wiki/known-constraints.md`): the solver core is
I/O- and string-agnostic, the engine is deterministic, and the service is stateless.

---

# Change Safety Rules

## Repo-wide

Do NOT modify unless explicitly required: the `POST /api/v1/optimize` request/
response shape, the solver's determinism, or the static-seed format. Avoid mixing
cleanup, formatting, refactors, and behavior changes in one diff. If a breaking
change seems necessary: explain why, explain risks, propose safer alternatives first.

## Solver core (Go — the load-bearing contract)

* **string- and I/O-agnostic** — no `net/http`, no JSON, no game-name strings in the
  core; all parsing/naming stays in the HTTP adapter.
* **deterministic** — same input → same timeline; no wall-clock, no RNG, stable
  tie-break. Reproducibility is the product's claim.
* **domain rules are contract** — stamina drain, zero-stamina = 0% output, slot
  capacity, derived efficiency (see `docs/wiki/domain.md`). Do not alter silently.
* **pure** — no globals, fully unit-testable on raw numeric inputs.

## HTTP adapter (Go)

* the only I/O-aware layer; owns parse (payload → domain) and serialize (domain →
  JSON). Keep the boundary clean — push logic down, keep transport up.

## web (TypeScript SPA)

* local-first — roster/level state in `localStorage`; no auth, no server session.

---

# Stateless / Data Rules

There is no database. State is the request payload, browser `localStorage`, and a
read-only static game-data seed embedded in the binary (`docs/wiki/data.md`). Do not
introduce a DB, cache, or broker without an ADR in `docs/wiki/decisions/`.

---

# Debugging Expectations

Inspect actual execution flow first; verify assumptions from code; prefer evidence
over guessing. Do not invent root causes. If uncertain, say so and explain why.

---

# Testing Expectations

* **Go:** `gofmt -l` clean, `go vet ./...` clean. Pair every non-trivial rule
  (drain, synergy, pruning, determinism) with a unit test that fails if the math
  breaks. Table-driven where it fits.
* **TS (web):** add/update tests when practical; focus on regression and edge cases.

Targeted dependencies are accepted, but a dependency is added only in the change
that uses it — challenge any added early.

---

# Documentation Expectations

If architecture or behavior changes meaningfully, update the relevant docs under
`docs/wiki` (and the module doc for the affected component). Prefer concise,
operationally useful, append-only notes. Avoid giant documentation dumps and
speculative documentation. Code-review findings go to `findings.md`, their fixes to
`resolutions.md` (shared IDs, never orphaned).

---

# Commits

Subject-only Conventional Commits (`type: summary`). No body unless the "why" is
non-obvious, no `Co-Authored-By`, no phase tokens. Never rewrite/force-push `main`;
work on `development`.

---

# Communication Style

Be direct and pragmatic. Challenge unsafe assumptions. Explain tradeoffs clearly.
Prefer maintainable solutions over theoretical perfection. Protect long-term
maintainability and operational stability.
