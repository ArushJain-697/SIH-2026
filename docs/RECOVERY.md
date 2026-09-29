# Recovery — when something doesn't come up clean

Build-map-advanced ticket #G2. This is the honest troubleshooting doc for
someone who didn't build this platform and just wants it to run. If your
problem isn't here, `npm test`'s output tells you exactly which step failed
and why — nothing in this project swallows an error silently.

---

## "The target instance won't start" (`npm run instance:up` hangs or exits)

1. Confirm the source is actually fetched: `bash lab/fetch-target-source.sh` (re-run is safe — it does a `git fetch` + `reset --hard` if `.cache/worldmonitor-src` already exists).
2. Confirm dependencies installed: `npm run instance:install` (this is a real `npm install` of ~1700 packages inside `.cache/worldmonitor-src` — it takes a few minutes, it isn't stuck).
3. Check the target's own Node requirement: `cat .cache/worldmonitor-src/.nvmrc`. This project's scripts run fine on Node ≥18, but the target itself may want a specific major version — install it with `nvm install $(cat .cache/worldmonitor-src/.nvmrc)` if `npm run dev` inside the target errors on startup.
4. **Do not run the target's full `npm run build`** — it chains `security:vite-env-secrets`, blog/pro/corpus/sitemap builds, and `tsc`, none of which this lab needs. Only `npm run dev` (the plain Vite dev server) is required.
5. Missing upstream API keys are expected and fine — the app is designed to degrade gracefully. `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` returning `200` is the only thing that matters for this lab; individual panels going inert without a key is normal, not a failure.
6. If port `3000` is already in use by something else on your machine, stop that process first — the target's dev server doesn't have a `--port` flag exposed through this project's scripts (it isn't a dependency worth adding for a lab-only local instance).

## "Static scanners fail with `ENOENT .cache/worldmonitor-src`"

You ran `npm run scan:*` before fetching the source. Run `bash lab/fetch-target-source.sh` first — every static scanner takes the source path as its first argument and needs it to exist.

## "`scan:authz-access` fails / can't find `typescript`"

The AST-based authorization scanner (`engine/scanners/authz-access.mjs`) is the one place this project uses a real dependency (the TypeScript Compiler API), deliberately isolated so the core engine stays zero-dependency by default. Install its sub-package once: `cd engine/scanners/ast-tools && npm install`.

## "The report app won't build / `vite: command not found`"

The React report app (`report-app/`) is its own sub-project with its own `package.json`. Install its dependencies once: `npm --prefix report-app install` (or `npm --prefix report-app ci` if you want the exact locked versions). Then `npm run report-app:build` from the repo root.

## "EPSS lookups fail / no internet"

`engine/core/epss.mjs` queries the real public FIRST API (`api.first.org`). With no internet, or if the API is down, every EPSS call returns an honest `unavailable` record — this is by design, never a fabricated number. The rest of the pipeline (CVSS scoring, scanners, report) doesn't depend on EPSS succeeding, so nothing else breaks. A disk cache (`.cache/epss/`) means a value fetched once stays available offline afterward.

## "I'm on a fresh machine — what's the actual one-command path?"

```bash
npm install --prefix report-app         # report app deps (one-time)
cd engine/scanners/ast-tools && npm install && cd ../../..  # AST scanner dep (one-time)
bash lab/fetch-target-source.sh         # clone the real target's public source
npm run instance:install                # npm install inside the target (~2-4 min)
npm run instance:up &                   # start it on localhost:3000
npm run assess                          # run every scanner + regenerate every doc + build the report
```

`npm test` alone (no target needed) proves the offline half of the platform — unit tests, safety tests, schema validation, the regression harness — in under 15 seconds.

## "GitHub Actions run failed"

The workflow (`.github/workflows/assess.yml`) does exactly the sequence above inside a fresh Ubuntu runner every time — nothing it does depends on local machine state. If a run fails, open the failed step's log; it's one of the exact same commands listed above, so the same fixes apply. If the target instance specifically never becomes ready (`wait-for-target` step logs a warning rather than failing the whole job), the run still completes with static-only coverage rather than aborting — check `/tmp/instance.log` in that step's log output for why the dev server didn't come up.

## "GitHub Pages shows a 404 / old content"

Confirm **Settings → Pages → Build and deployment → Source** is set to **"GitHub Actions"**, not "Deploy from a branch" — this is a one-time manual toggle GitHub doesn't let a workflow set for you. After that, every successful run of `assess.yml` republishes automatically.

---

## What's intentionally NOT automatically recoverable

- **EPSS freshness** degrades honestly (see above) rather than being "fixed" — a stale or missing EPSS value is reported as exactly that, not silently defaulted.
- **`.cache/worldmonitor-src`** is gitignored and disposable by design (~2.3GB with `node_modules`) — this project does not try to make that install faster or cache it between runs beyond what `npm ci`/Actions' own dependency caching already does, since re-fetching guarantees you're always testing against a real, current commit rather than a stale local copy.
- **WM-012's `CANDIDATE-UNCONFIRMED` status** has no "fix" here — it's an honest open question (is a specific transitive dependency function actually reachable at runtime), not a broken build. Forcing it to a definite verdict without the deeper call-graph analysis it needs would be exactly the kind of overclaim this project's whole discipline exists to avoid.
