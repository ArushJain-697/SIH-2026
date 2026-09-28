# SIH 26163 — Six Gemini Deep Research Briefs
### Purpose: replace the unverified "Bible" with a ground-truthed assessment plan

**Generated:** 2026-09-28
**Target:** `github.com/koala73/worldmonitor` (verified live, 87.5k ★, 13.3k forks, 7,881 commits, AGPL-3.0-only, author Elie Habib / @koala73, last commit 2026-09-28)

---

## PART 0 — What I verified, and what the Bible got wrong

I scraped the live repo, its **published security advisory index (both pages)**, and its **SECURITY.md**. Findings:

### 0.1 The fatal problem: the Bible's hypothesis register is mostly prior art

The maintainer runs an unusually disciplined self-disclosure program. **Eleven advisories are already published**, authored by the maintainer himself, plus one draft:

| GHSA | Title | Severity | Published |
| --- | --- | --- | --- |
| GHSA-r649-4cqj-w93h | Unauthenticated cross-tenant read of all users' alert rules via public Convex query `getByEnabled` | **High** | 2026-07-04 |
| GHSA-2x6r-qq54-mmhr | Windows command injection in Tauri `open_url` IPC (`cmd /c start`) — user-assisted desktop RCE | **High** | 2026-07-04 |
| GHSA-5458-hq84-hcr5 | Desktop trusted windows could read the full secret cache and local API token | **High** | 2026-07-24 |
| GHSA-c267-988w-7pq7 | Abuse-control / rate-limit bypass via spoofable `cf-connecting-ip` header | Moderate | 2026-07-04 |
| GHSA-hcq5-jm84-2395 | MCP daily **cost-cap bypass**: quota slot refunded after the tool already executed | Moderate | 2026-07-04 |
| GHSA-9m4c-824h-m4xw | Slack and Discord OAuth state consumption is non-atomic and fail-open | Moderate | 2026-08-01 |
| GHSA-cmj5-cfhr-w964 | Generated API runtime validation is disabled | Moderate | 2026-08-01 |
| GHSA-5j39-mmw6-cqw6 | MCP SSE replay is not bound to the authenticated owner | Moderate | 2026-09-04 |
| GHSA-9gp4-366w-pcq3 | Weak (FNV-1a 52-bit) cache key in `buildSummaryCacheKey` allows unauthenticated poisoning of the shared summary/translation cache | Moderate | 2026-09-04 |
| GHSA-gxj5-54wh-7vgr | Browser sessions can poison shared temporal baselines | Moderate | 2026-09-04 |
| GHSA-f6gj-3v7v-j75q | OAuth refresh-token reuse not contained: no family revocation on detected reuse | Low | 2026-07-04 |
| GHSA-887j-p88r-qmm9 | DNS-rebinding resolve-vs-connect residual (MCP proxy) | *draft, access restricted* | — |

Plus a **Security Acknowledgments** section crediting **Cody Richard** (2026) for three findings: IPC command exposure, renderer-to-sidecar trust boundary, and fetch-patch credential injection.

**Now map the Bible's hypotheses onto that list:**

| Bible hypothesis | Reality |
| --- | --- |
| H1 Denial-of-wallet | **Already disclosed** as GHSA-hcq5-jm84-2395 (MCP cost-cap bypass). *And* SECURITY.md declares DoS out of scope. |
| H2 DNS-rebinding SSRF | **Vendor-documented accepted residual**, cited in SECURITY.md itself (GHSA-887j-p88r-qmm9). |
| H3 Authz / cross-tenant | **Already disclosed** as GHSA-r649-4cqj-w93h (High) — exactly the public-Convex-query class. |
| H5 Session / OAuth | **Already disclosed** twice (GHSA-9m4c-824h-m4xw, GHSA-f6gj-3v7v-j75q). |
| H9 XFF rate-limit spoofing | **Already disclosed** as GHSA-c267-988w-7pq7 (and the real header is `cf-connecting-ip`). |
| H10 Tauri IPC / desktop | **Already disclosed** twice (GHSA-2x6r-qq54-mmhr, GHSA-5458-hq84-hcr5) + all three Cody Richard findings. |

**Six of eleven hypotheses — including the Bible's declared "single best bet" — are re-discoveries of publicly fixed issues.** If the team presents these as original findings to an NTRO judge who opens the advisory tab, the project is over. This is the single most important thing the research must fix.

### 0.2 Factual errors in the Bible

- **"Preact + Vite SPA"** — wrong. The README states **Vanilla TypeScript, Vite**, globe.gl + Three.js, deck.gl + MapLibre GL. Any finding written against "Preact" or `dangerouslySetInnerHTML` is fabricated.
- **"v2.10.0"** — unverified; the repo has 60 tags and commits landed today. Treat as stale.
- **"a security team"** — it is one author plus contributors.
- **Dodo Payments** — unverified by me; Pro tier confirmed (`worldmonitor.app/pro`), payment processor not.

### 0.3 Things the Bible never mentions that are the real opportunity

- **MCP server** at `worldmonitor.app/mcp` (Streamable HTTP), **public `tools/list`**, `tools/call` auth via `X-WorldMonitor-Key` or OAuth; publishes **Agent Skills** through the draft `io.modelcontextprotocol/skills` extension (`skills/list`, `skills/get`, `skill://` reads); `mcp-grant.html`.
- **Published packages = supply-chain surface**: npm `worldmonitor`, PyPI `worldmonitor-sdk`, RubyGems `worldmonitor`, Go module. Four registries.
- **Separate REST API** host `api.worldmonitor.app` + public `openapi.yaml`.
- **Railway relay** (`Dockerfile.relay`), **Cloudflare `workers/`**, `server/`, `cli/`, `blog-site/`, `consumer-prices-core/`, self-hosted **Umami** analytics, an **`.audit/`** directory, `.agents/skills`.
- **Six site variants** (world/tech/finance/commodity/happy/energy) from one codebase — config-drift surface.
- Agent discovery files: `llms.txt`, `.well-known/agent-skills/index.json`, `.well-known/api-catalog`.

### 0.4 Two SECURITY.md clauses that break the Bible's plan

1. **"Denial of service attacks"** → **out of scope.** The Bible's entire thesis rests on denial-of-wallet. That needs a rigorous economic-vs-availability distinction or it dies to one judge question.
2. **"Issues in forked copies of the repository"** → **out of scope.** The Bible's method is "test a local self-hosted instance." Needs an explicit answer (unmodified code at pinned commit ≠ fork divergence).

Also: **CSP restricts `script-src` to `'self'`, no unsafe-inline/eval** — this materially downgrades the Bible's XSS impact reasoning, which ignores CSP entirely. And **"No sensitive data is stored in localStorage"** contradicts the Bible's H5 framing.

---

## PART 1 — How to use these six briefs

Each brief below is **paste-ready** into Gemini Deep Research, one at a time. They are deliberately **outward-facing**: Deep Research is good at synthesising the public record, standards, precedent and platform-specific vulnerability classes. It is *bad* at finding bugs in a private clone — that is local work for me and you.

Run them in this order. **Brief 1 is non-negotiable and comes first** — everything else depends on knowing what is already public.

| # | Brief | Answers |
| --- | --- | --- |
| 1 | Prior-art & novelty firewall | What is already known? Where is the unexplored adjacent variant? |
| 2 | Stack-specific attack classes | What breaks in *this* platform combination specifically? |
| 3 | MCP & agentic attack surface | The 2026 frontier nobody else at SIH will touch |
| 4 | Denial-of-wallet formalisation | How to score and defend it despite the out-of-scope clause |
| 5 | Report craft & standard of care | What a professional deliverable actually looks like |
| 6 | Indian legal framework + SIH/NTRO judging meta | How to stay legal and how to win |

Each brief ends with an instruction to flag uncertainty. Keep that — it is what makes the output usable as evidence.

---

# BRIEF 1 — Prior-Art & Novelty Firewall

> Paste everything below into Gemini Deep Research.

---

You are a vulnerability-research analyst building a **prior-art exclusion list**. I am conducting an authorized security assessment of the open-source application **World Monitor** (`github.com/koala73/worldmonitor`, author Elie Habib / @koala73, AGPL-3.0-only, ~87.5k GitHub stars, real-time global-intelligence dashboard, live at `worldmonitor.app`). My assessment will be judged by professional security assessors, so **any finding I present that is already publicly known is worse than no finding at all**. Your job is to make sure I know everything that is already public.

**Verified starting facts (do not contradict these; extend them):** the repository publishes at least eleven security advisories authored by the maintainer himself, with these identifiers — GHSA-r649-4cqj-w93h, GHSA-2x6r-qq54-mmhr, GHSA-5458-hq84-hcr5, GHSA-c267-988w-7pq7, GHSA-hcq5-jm84-2395, GHSA-9m4c-824h-m4xw, GHSA-cmj5-cfhr-w964, GHSA-5j39-mmw6-cqw6, GHSA-9gp4-366w-pcq3, GHSA-gxj5-54wh-7vgr, GHSA-f6gj-3v7v-j75q — plus a restricted draft GHSA-887j-p88r-qmm9 concerning a DNS-rebinding resolve-versus-connect residual in its MCP proxy on Vercel Edge. The README credits researcher **Cody Richard** (2026) for three findings covering IPC command exposure, renderer-to-sidecar trust boundary analysis, and fetch-patch credential injection.

Research and deliver the following.

**1. Complete advisory dossier.** For every published advisory above (and any I have missed), retrieve and report: full title, GHSA ID, any CVE, severity and CVSS vector as published, affected component and file paths named in the advisory, the technical root cause in your own words, the patch or mitigation described, the fixing commit or release if identifiable, and the date. Present as one row per advisory in a table, then a short technical paragraph each. If an advisory page is inaccessible, say so explicitly rather than inferring its content.

**2. The adjacent-variant analysis — this is the most valuable part.** For each advisory, answer: *where else in an application of this architecture would the same root-cause class plausibly still exist?* For example, if one weak non-cryptographic cache key was found in a summary cache, what other shared-cache or key-derivation paths would a researcher check next? If one Convex query was publicly readable, what does that imply about the authorization model for the rest of the function surface? If a quota slot was refunded after execution in one place, where else does check-then-act ordering around metered work appear? Be concrete and mechanism-level. Rank these adjacent variants by how likely an incomplete fix or an unpatched sibling is.

**3. Wider public record.** Search beyond the advisory index for: Cody Richard's own writeups, blog posts or conference material on these findings; any HackerOne, Huntr, or bug-bounty disclosure referencing World Monitor; Hacker News, Reddit, X/Twitter, Lobsters threads discussing its security, architecture or incidents; any security advisories filed against its **published packages** (npm `worldmonitor`, PyPI `worldmonitor-sdk`, RubyGems `worldmonitor`, the Go module `github.com/koala73/worldmonitor/sdk/go`); CHANGELOG entries that read as security fixes; and closed GitHub issues or pull requests with security-related labels or titles. For each, give the URL, date, claim, and whether it was confirmed by the maintainer.

**4. The maintainer's own threat model.** The repository contains numerous CI enforcement scripts (patterns like `scripts/enforce-*.mjs` and `scripts/check-*.mjs`) and an `.audit/` directory. Research what is publicly visible or documented about these, and what each one's existence implies the maintainer has previously been burned by. A linter exists because a bug happened.

**5. Output an explicit NOVELTY EXCLUSION LIST**: a plain, scannable list of vulnerability classes and specific mechanisms that I must **not** present as original discoveries, each with its public reference. Then a second list: **credibly unexplored territory** — classes that this architecture exposes and that the public record shows no one has yet examined.

**Rules:** cite a primary source URL for every factual claim. Distinguish clearly between *verified from a primary source*, *reported secondhand*, and *your inference*. Where you cannot find something, state "no public record found" rather than speculating. Do not pad with generic web-security background — I only want what is specific to this target.

---

# BRIEF 2 — Stack-Specific Attack Classes

> Paste everything below into Gemini Deep Research.

---

You are a platform-security researcher. I am conducting an authorized security assessment of an application with an unusual and specific technology stack, and I need the **published, real vulnerability classes and misconfiguration patterns for this exact combination** — not generic OWASP material, which I already have.

**The verified stack:**
- **Frontend:** Vanilla TypeScript (no framework), Vite build, globe.gl + Three.js, deck.gl + MapLibre GL. PWA with a service worker.
- **Backend:** Vercel Edge Functions (`api/` directory), serving domain RPCs through **Sebuf** — a Protocol-Buffers-first RPC framework with HTTP annotations.
- **Data / state:** Upstash Redis (KV and rate-limit state, accessed over its REST API), Cloudflare R2 (objects) and Cloudflare KV, **Convex** (application data, auth, payments), Cloudflare Workers.
- **Additional runtime:** a **Railway-hosted relay** service that re-checks an RSS domain allowlist on redirect hops; self-hosted Umami analytics; multiple Docker images.
- **Desktop:** **Tauri 2** (Rust) with a **Node.js sidecar**, secrets in the OS keychain, a per-session CSPRNG `LOCAL_API_TOKEN` authenticating renderer-to-sidecar requests, a global fetch interceptor that injects that token with a 5-minute TTL, IPC origin validation gating sensitive commands to trusted windows, and capability isolation for an untrusted YouTube-login window.
- **Declared controls:** Content-Security-Policy with `script-src 'self'` and no `unsafe-inline` or `unsafe-eval`; DOMPurify sanitisation of third-party RSS/news content; per-function CORS; rate limiting and circuit breakers; six site variants built from one codebase.

For **each** of the following, research and report the published attack classes, known CVEs, security advisories, vendor security documentation, conference talks and credible researcher writeups — with primary-source URLs and dates.

**1. Vercel Edge Functions / Edge runtime.** What are the documented security limitations of the Edge runtime versus Node runtime? Specifically: the inability to pin a socket to a pre-resolved IP address and its consequences for SSRF and DNS-rebinding defence; how client IP is derived and which inbound headers are and are not trustworthy at the edge (including `x-forwarded-for`, `x-real-ip`, `cf-connecting-ip`, `x-vercel-forwarded-for`); how edge middleware matchers and public-path allowlists have been bypassed in the wild (path normalisation, encoding, trailing slashes, case, `.well-known` handling); cold-start and in-memory-state assumptions that break rate limiting; and any documented Vercel platform-level advisories.

**2. Convex.** Explain Convex's authorization model precisely: public versus internal functions, `query`/`mutation`/`action` semantics, argument validators, and how authentication context reaches a function. Then: what is the documented failure mode where a query is exposed publicly without an ownership check? What does Convex's own security guidance and documentation say about this? Are there published incidents, advisories, or writeups of Convex authorization failures? What tooling or lint rules exist to detect publicly-callable functions lacking authorization?

**3. Upstash Redis over REST.** Token scoping and read-only tokens; what happens when a REST token leaks; key-namespace collision and ownership-verification patterns; atomicity limits of the REST interface versus native Redis (specifically: which check-then-act and quota-accounting patterns are unsafe without Lua or transactions); published advisories.

**4. Cloudflare R2, KV and Workers.** Object-level authorization patterns and how public-bucket or presigned-URL misconfiguration is exploited; KV eventual consistency and its security consequences for auth or quota state; Workers isolate boundaries; and the documented trust relationship between a Cloudflare edge and an origin regarding `cf-connecting-ip`.

**5. Protobuf / Sebuf-style RPC over HTTP.** Research the `sebuf` framework specifically if any public material exists; otherwise cover the general class: what breaks when generated runtime validation is disabled, unknown-field handling, proto3 default-value ambiguity (the inability to distinguish absent from zero/false and its authorization consequences), JSON-versus-binary transcoding mismatches, and field-mask or partial-update authorization bypasses.

**6. Tauri 2 desktop.** The v2 capability and permission model and how over-broad capabilities are exploited; published Tauri CVEs and advisories; IPC command exposure patterns; the security posture of a Node.js sidecar architecture and renderer-to-sidecar authentication; shell/opener plugin command-injection history (especially Windows `cmd /c start` argument handling); updater signature-verification requirements and known failures; and webview CSP enforcement differences across platforms.

**7. CSP bypass under `script-src 'self'`.** This is important to me. Given a strict `script-src 'self'` with no `unsafe-inline` and no `unsafe-eval`, what are the published, realistic bypass techniques? Cover script gadgets, same-origin JSON or JSONP-like endpoints returning attacker-influenced content with a script-compatible content type, open redirects on the same origin, path-traversal to same-origin uploaded content, service-worker abuse, `base-uri` and `object-src` omissions, DOM-clobbering-driven gadgets, and