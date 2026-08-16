---
title: Gaia — Repository Split Plan
document: split-plan
version: 1.0.0
status: proposed
last_updated: 2026-08-16
owner: Gaia Product Foundation
framing: "Gaia is a lifelong personal intelligence designed to grow through understanding."
---

# Gaia — Repository Split Plan

> **Desktop = presence, interface and local capabilities.**
> **Server = cognition, memory, reasoning and agency.**
> **This split moves code between repositories. It must not move any responsibility across that line.**

This document records the current monorepo boundaries and the plan for splitting them into three independent repositories — **Gaia-Cloud**, **Gaia-Web** and **Gaia-Desktop** — with two hard constraints:

1. **Gaia Web must remain fully functional** — including the live path on higaia.nl (real Hermes streams, recall and reflection in the same turn).
2. **Gaia Desktop must remain a first-class client of the same Gaia Cloud backend** — same contracts, same gateway, no forked API.

---

## 1. Current Inventory (what lives where today)

| Path | App | Role |
|---|---|---|
| `frontend/` | Web + Desktop | CRA/craco React app; the entire shared UI (conversation, presence, Logos, providers) |
| `foundation/` (root) | Web + Desktop | Build-time tool: reads `docs/` + `frontend/src/gaia/identity/`, writes `artifact.json` (the system prompt dictionary) |
| `docs/` | Web + Desktop (build input) + Cloud (constitution) | Gaia's foundation documents — the source of the foundation artifact |
| `Dockerfile` + `nginx.conf` | Cloud + Web | Builds the `gaia-web` image; nginx doubles as the *de facto* API gateway (same-origin proxies) |
| `services/cognition/` | Cloud | Express + Postgres: patterns & hypotheses (Tailscale-only, :8890) |
| `proxy/` | Cloud | `gaia-hermes-proxy` config (token injection + `Origin` strip toward hermes-agent) |
| `src-tauri/` | Desktop | Rust/Tauri shell: communication, capture, audio, notifications, settings, presence |
| `frontend/src/gaia/{server,capture,settings}` + `ServerStatus.jsx` | Desktop-only (inside the web codebase) | Desktop modules behind the `isDesktop()` guard; `@tauri-apps/api` dependency |
| `memory/` | none | Documentation only (`PRD.md`) |
| root `package.json` | Web + Desktop | Orchestration: `dev:web` / `dev:desktop` / `build:web` / `build:desktop` |

**Key structural finding: there is no uniform Gaia Cloud API yet.** "Gaia Cloud" is today a deployment topology on the VPS (hermes-agent, gaia-hermes-proxy, Hindsight, gaia-cognition) that clients reach **directly** through three same-origin proxy paths. `nginx.conf` is the only shared API surface. The client orchestrates reasoning itself (Logos runs client-side — explicitly flagged as interim in `frontend/src/gaia/logos/index.js`).

## 2. Exact Coupling Points

1. **The frontend is 100% shared** — Desktop wraps the web build (`tauri.conf.json`: `frontendDist: "../frontend/build"`). Desktop-only code lives *inside* the web codebase, guarded by `isDesktop()`.
2. **Foundation chain** — `foundation/index.ts` resolves `docs/` and `frontend/src/gaia/identity/` via hard-coded repo-root-relative paths. Both web and desktop builds depend on `docs/` being present.
3. **Build orchestration** — the root `package.json` chains foundation → frontend → tauri (`build:desktop` = foundation + `tauri build`).
4. **Proxy configuration in two tools** — `frontend/craco.config.js` (dev server) and `nginx.conf` (production) duplicate the same routing knowledge toward Hindsight and cognition; Hermes differs per environment (direct localhost in dev, `gaia-hermes-proxy` in prod).
5. **Environment contract** — `REACT_APP_REASON_ENGINE_URL` (default `/api/hermes/v1`), `REACT_APP_HINDSIGHT_URL`, `REACT_APP_COGNITION_URL`, `REACT_APP_HINDSIGHT_BANK_ID`; baked at build time (CRA).
6. **Contracts** — `frontend/src/contracts/` (reasoning, hindsight, chronicles, mcp) is the intended shared API language, but lives client-side only.

## 3. API Contracts (current, exact)

| Backend | Endpoints | Notes |
|---|---|---|
| Hermes (via `gaia-hermes-proxy`) | OpenAI-compatible `POST /v1/chat/completions` (SSE), `GET /v1/models` | Token injected by the proxy; `Origin` header stripped (hermes-agent 403s any `Origin` otherwise) |
| Hindsight | `/v1/default/banks/gaia/memories` (retain), `.../recall`, history/curate, `/documents/{id}`, `/health` | Third-party image; **no CORS** — reachable only via same-origin proxy |
| Cognition | `/v1/banks/:bankId/hypotheses` (lifecycle `proposed → testing → confirmed/rejected`), `/v1/banks/:bankId/patterns`, `/health` | Own service, Postgres, Tailscale-only |
| Desktop `ServerLink` (new) | Generic `ServerRequest` envelope; `POST capture` (seam) | **No server implementation yet** — forward-looking seam for the uniform Gaia API |

## 4. Migration Plan — Three Repositories

### Phase 0 — Preparation inside the monorepo (no functional change)

1. Extract `frontend/src/contracts/` + provider contracts into a package namespace (e.g. `@gaia/contracts`) — still inside this repo, but importable as a unit.
2. Make `foundation/` path-independent (configurable input/output paths instead of hard-coded repo-root paths) so it can run in any repo context.
3. Move desktop-only modules (`gaia/server`, `gaia/capture`, `gaia/settings`, `ServerStatus.jsx`, the `@tauri-apps/api` dependency) into a clearly marked tree (e.g. `frontend/src/desktop/`) so they migrate in one move later.
4. Pin the cut-over: tag the monorepo (`monorepo-final`).

### Phase 1 — `Gaia-Cloud`

**Moves:** `services/cognition/`, `proxy/`, `nginx.conf` (API gateway config), deployment compose/docs, and `docs/` (the constitution — identity belongs to Gaia herself, not to a client).

**Recommended decision:** define the `/api/*` surface in `nginx.conf` explicitly as *the Gaia Cloud API gateway* and document its routes as the contract. Publish from CI:

- `@gaia/contracts` (npm package; source of truth = server side),
- `foundation-artifact.json` (built from `docs/`) for client builds.

This keeps current behavior 1:1 while creating the single place where the future uniform Gaia API (with auth, and the `capture` endpoint Desktop already offers toward) will land.

### Phase 2 — `Gaia-Web`

**Moves:** `frontend/` (without desktop modules), `foundation/`, `Dockerfile`.

- `foundation/` consumes the published `foundation-artifact.json` (or a pinned git subtree of `Gaia-Cloud/docs/` as a transition period — decision recorded below under risks).
- The `Dockerfile` keeps building the `gaia-web` image; deployed into the same VPS Docker network as `gaia-hermes-proxy`.
- **Acceptance gate:** live on higaia.nl — a real message gets a real streamed Hermes response, with recall and reflection firing in the same turn (the exact verification path from the proxy amendment in `evolution.md`).

### Phase 3 — `Gaia-Desktop`

**Moves:** `src-tauri/` + the desktop frontend modules (prepared in Phase 0).

**Recommended structure:** the web frontend stays the *single source* of the shared UI; Desktop consumes it as a **git submodule / pinned tag** and overlays the desktop modules during the build:

```
Gaia-Desktop/
├── src-tauri/                     # Rust shell: communication, capture, audio, …
├── web/                           # submodule → Gaia-Web @ tag
├── overlay/frontend/src/desktop/  # server/, capture/, settings/, ServerStatus
└── build script: merge overlay into web/ → frontendDist
```

This prevents frontend duplication and keeps Web free of Tauri code. `tauri.conf.json` points at the merged build.

**Open point the migration *must* resolve — desktop production networking:** in a built Tauri app the webview origin is `tauri://localhost`, so relative `/api/*` calls and browser-fetches to higaia.nl are cross-origin — and the cloud gateway sends no CORS headers today. Two routes (combinable):

- (a) the gateway gains CORS support for the Tauri origin, or
- (b) the frontend, in desktop mode, routes server traffic through the Rust `ServerLink` layer (`server_request`), where CORS does not exist — exactly what that abstraction was built for.

Both are configuration-level choices via the settings module, not refactors. Decide before the first desktop release build.

### Phase 4 — Wrap-up

- The root repo becomes an archive/redirect; the VPS checkout (`/root/gaia`) splits into three checkouts; the shared Docker network stays.
- Logos (intentIQ/reasonIQ) remains client-side in Gaia-Web for now — moving it to Gaia-Cloud is a *later, functional* project (`logos/index.js` itself calls it "a relocation, not a rewrite"); the split must not force it.

## 5. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| `docs/` drift between Cloud and clients | Single source (Cloud repo) + published artifact; clients never build against a loose docs copy again |
| `artifact.json` going stale | CI publishes the artifact on every docs change; client builds pin a version |
| Web breaking during the split | Phase order: Cloud first (published package + unchanged gateway), Web second with the live acceptance gate, Desktop only after Web is green |
| CORS / desktop production | Resolve the choice above explicitly in Phase 3, before the first desktop release build |
| Duplicated proxy knowledge (craco + nginx) | Move to the Cloud repo as documented gateway config; the craco dev proxy in the Web repo points at the gateway |

## 6. Guardrails (what this split must never do)

- No cognitive logic moves into a client as part of the reorganization — the split moves *code between repositories*, not *responsibilities between layers*.
- No model-specific assumptions enter any client; provider swaps remain a config change.
- Web is not degraded to make Desktop easier, and Desktop is not a fork — both are clients of the same Gaia Cloud contracts.

---

## Addendum — Milestone 8 (2026-08-16): Desktop no longer wraps Gaia Web

Coupling point 1 below ("the frontend is 100% shared") is resolved. Gaia Desktop now has its own UI (`desktop/`, Vite + React) served by its own Tauri build; `tauri.conf.json` points at `desktop/dist`, and the desktop-only modules that had lived inside `frontend/src/gaia/` moved into the desktop tree. Desktop conversations go through the Rust `ServerLink` seam (`conversation/turn` envelope) — never through Gaia Web. Gaia Web is unchanged and independent. Phase 0, step 3 of this plan is thereby completed; the overlay strategy in Phase 3 is no longer needed — Desktop carries its own frontend outright. See evolution.md, Milestone 8.
