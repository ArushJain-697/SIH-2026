# [WM-007] Client-side storage content - empirically confirmed clean on the real instance

- **Status:** `VERIFIED-SECURE`
- **Control tested:** full-content dump (not key-name sampling) of every real `localStorage` key on the running app, plus `sessionStorage` and cookies, each value scanned against four credential-shaped regex patterns.
- **CWE:** CWE-922 (Insecure Storage of Sensitive Information) · **WSTG:** WSTG-CLNT-09
- **PS scope areas:** 5 (Client-side security) **and** 7 (Data storage & privacy) - this one dynamic check produces real evidence for both simultaneously.
- **Trust boundary:** 7

## The claim under test

[`docs/ground-truth.md`](../../docs/ground-truth.md) records `SECURITY.md`'s own stated control: *"No sensitive data is stored in localStorage or sessionStorage."* A documentation claim is not evidence. This finding checks it against the real, running app.

## Method

With the real instance loaded at `localhost:3000` in the built-in browser (unauthenticated session - no account created, per [`docs/ROE.md`](../../docs/ROE.md)):

```js
for (const k of Object.keys(localStorage)) { /* dump full value, not just the key name */ }
```

Every value was scanned for: a JWT shape (`eyJ...`), the target's own documented API-key format (`wm_<40-hex>`, per `api/a2a.ts`'s own comment describing it), a `Bearer` token, and a generic `secret`/`password`/`token`/`api_key` assignment pattern.

## Result - real, complete, zero hits

**27 of 27** real localStorage keys captured in full. Every single value is one of: a UI layout/panel preference, a feature-flag `"done"` marker, or **cached public data** - Country Instability Index scores, theater posture, disabled-feed source-name lists (all of it the same public OSINT the app itself displays). **Zero** credential-shaped hits across all 27 values. `sessionStorage` held exactly one benign entry (a viewed-panel tracker, `["live-news"]`). **No cookies were set** for this session at all.

Full captured dump: [`evidence/localstorage-full-dump.json`](./evidence/localstorage-full-dump.json).

## Honest scope limitation

Only the **anonymous, unauthenticated** session was tested - no account was created (consistent with `docs/ROE.md`'s prohibition on creating accounts on external services). It is plausible, though unverified here, that a signed-in Pro session stores different state. This is named as a specific, bounded gap rather than silently generalized into "the app never stores anything sensitive anywhere."

## Reproduce

```bash
bash findings/WM-007/reproduce.sh
```
This check reads real browser DOM storage APIs, so it needs an actual browser (the built-in browser tool, or any browser's devtools console) - there is no CLI-only automation for it in this project. That is a deliberate choice: adding a Playwright/Puppeteer dependency purely for this one check would break the engine's zero-external-dependency design (see `package.json`). The script prints the exact reproduction steps.

## Verdict

**The documentation claim holds, empirically, for the anonymous session.** A real, complete, pattern-matched dump found nothing credential-shaped across 27 real keys - this is dynamic evidence, not an assumption carried over from reading `SECURITY.md`.
