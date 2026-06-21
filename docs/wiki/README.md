# Koutei Wiki

Centralized project wiki. Single source for architecture, domain, conventions,
and operational caveats. Koutei (工程) is a local-first operator/shift optimizer
for Arknights: Endfield — a stateless Go constraint solver behind a TypeScript
SPA. **Greenfield**: this wiki is design-intent ahead of the code; entries marked
as placeholders are populated as the build lands.

> **Status: ON HOLD (2026-06-21).** Engine + SPA work end-to-end on *placeholder*
> stamina mechanics. Held pending a reliable source for the four real constants —
> stamina base/max, drain (decay) rate, regen rate, and the mood→stamina decay-
> reduction rate. Sources checked and ruled out below ([`data.md`](data.md)); these
> live only in the encrypted game client. Resumes when that data is found.

## Structure

| Path | Purpose |
|---|---|
| `architecture.md` | system overview — 3-layer boundary (web → HTTP → solver core) |
| `domain.md` | the scheduling domain (operators / stations / timeline / stamina) |
| `conventions.md` | coding + commit conventions, per-language notes |
| `data.md` | static game-data seed (there is **no database** — see below) |
| `known-constraints.md` | hidden contracts the engine must hold |
| `troubleshooting.md` | debugging findings, operational caveats |
| `findings.md` | code-review findings log (paired with `resolutions.md`) |
| `resolutions.md` | how findings were resolved (paired with `findings.md`) |
| `deploy.md` | single-binary VPS + nginx runbook |
| `modules/` | per-component contracts — `solver.md` |
| `sessions/` | append-only session history (`DD-MM-YYYY.md`) |
| `decisions/` | architecture decision records |
| `coderabbit/` | CodeRabbit review session logs |

> No `database.md`: Koutei is stateless and holds no database. Persistence is the
> request payload (engine input), browser `localStorage` (roster state), and a
> static game-data seed — see [`data.md`](data.md).

## Blueprint

The project blueprint lives in the repo root: [`PLAN.md`](../../PLAN.md) — the
consolidated backend engine, frontend visual language, and build phases. Read it
for intent; this wiki tracks what the code actually does.

> Doc rule (from root [`AGENTS.md`](../../AGENTS.md)): code is source of truth;
> note drift, keep notes concise, append session history — never overwrite it.
