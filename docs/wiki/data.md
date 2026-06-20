# Data

Koutei has **no database**. There are three kinds of state, none of them a DB:

- **Request payload** — the full problem (roster + facilities + target) is sent per
  call and discarded after the response. The engine is stateless.
- **Browser `localStorage`** — the user's roster and level breakpoints, so they
  enter them once. Lives in the client, never on the server.
- **Static game-data seed** — operator base passives, station/recipe tables, drain
  rates. Read-only, embedded in the binary.

## Static seed

Endfield has no public developer API, so game variables are sourced once into a
clean JSON config:

- **Source** — community data sheets / open-source fan wikis (operator base
  passives at level 40/60/80, station recipes, yields).
- **Tooling** — a small TS/Node utility (e.g. `cheerio`) parses the sheets into
  `roster_template.json` and station/recipe configs. One-off seeding, not a runtime
  dependency.
- **Storage** — the JSON is committed and embedded in the Go binary (`embed`); the
  solver loads it at startup into the numeric tables the core runs on.

> Seed is a build-time concern, not a request-time one. Re-run the scraper only
> when the game patches the underlying numbers; record the source + date when you
> do. Placeholder — fill the exact file layout and source URLs when the seeding
> utility lands.
