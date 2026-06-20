# Deploy

Single static Go binary on a VPS, behind an nginx reverse proxy. No database, no
secrets, no broker — the game-data seed is embedded and the engine is stateless, so
deploy is copy-binary + restart. Design-time runbook; tighten when the binary
exists.

## Topology

```txt
client → nginx (one hostname) →
  /            → SPA (static build)
  /api/v1/*    → 127.0.0.1:<port>  (Go engine, single origin, no CORS)
  /health      → 127.0.0.1:<port>  (ops; unauthenticated)
```

## Steps

1. Build the static binary (`CGO_ENABLED=0 go build`) and the SPA (`vite build`).
2. Copy the binary to the VPS; run it under a process supervisor (systemd unit) so
   it restarts on crash/reboot. Bind it to localhost only — nginx is the edge.
3. Serve the SPA build as static files from nginx; proxy `/api` to the engine port.
4. Point one hostname at nginx (TLS at the edge / via tunnel).

## Acceptance

- [ ] Hostname serves the SPA; `…/api/v1/optimize` returns a timeline JSON (not SPA
      HTML) for a sample roster.
- [ ] `/health` returns 200.
- [ ] Same request twice → byte-identical timeline (determinism holds in prod).
- [ ] Solver execution time reported in the response and visibly sub-second.

> Placeholder — fill exact port, systemd unit, and nginx config once the services
> are built.
