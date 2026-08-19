# gaia-api

The Gaia API — the server-side seam every first-class client (Desktop,
later Web) talks to. This is where Gaia's server-side turn orchestration
begins: it loads SOUL (identity), calls Hermes (reasoning), and returns a
plain reply. Clients never see a model name, a provider, or a status code
they didn't cause themselves.

## Contract

Kept in lockstep with the desktop's seam (`desktop/src/state/contract.js`):

| Method | Path                | Auth | Body / Result |
|--------|---------------------|------|---------------|
| GET    | `/health` (and `/`) | none | `{ ok: true, soulVersion: string }` |
| GET    | `/soul`             | none | `{ version: string }` — identity version only, no prompt content |
| POST   | `/conversation/turn`| Bearer | in: `{ messages: [{ role, content }] }` → out: `{ reply: string }` |

Non-streaming in this phase. The streaming variant grows behind the same
path (SSE/WebSocket) — clients were built with that seam ready.

Separately, an **operator-only admin surface** (never part of the client
contract above, never reachable from Gaia Desktop or Gaia Web in the
normal sense — see `adminRoutes.js`):

| Method | Path                          | Auth   | Body / Result |
|--------|-------------------------------|--------|----------------|
| GET    | `/admin`                      | none   | the static ReasonIQ model-config page (`public/admin.html`) |
| GET    | `/admin/api/reasoniq/config`  | Bearer | masked config: `{ provider, baseUrl, model, hasApiKey, maskedApiKey, updatedAt }` |
| PUT    | `/admin/api/reasoniq/config`  | Bearer | in: `{ provider?, baseUrl?, model?, apiKey? }` → out: masked config |
| GET    | `/admin/api/reasoniq/models`  | Bearer | `{ models: [{ id, name, contextLength, pricing }] }`, fetched live from OpenRouter using the saved key |

## Boundaries

- **Identity is server-side, and owned here.** SOUL is loaded from this
  service's own canonical `identity/soul.md` (baked into the image;
  `SOUL_PATH` overrides) — centralized out of the web client in
  `e200903` (see `docs/evolution.md`). It carries a `version` field
  (currently `1.1.0`) that `/health` and `/soul` surface, so clients can
  observe which identity they're talking to. No SOUL, no start.
- **No provider leakage.** Hermes' URL, model and token live in this
  service's environment. Error responses are calm sentences, not stack
  traces or upstream status codes.
- **Fail closed.** Without `GAIA_API_TOKEN` every authenticated route
  returns 503; wrong tokens get 401.

## Logos.IntentIQ (v0.1)

`src/logos/intentIQ.js` — Gaia's first real IntentIQ, living in Gaia Cloud
per architecture.md rather than as a client-side heuristic. It answers
exactly one question, "what is the user trying to achieve?", against the
approved Intent Taxonomy v0.1 (`src/logos/intentTaxonomy.js`), and returns
a structured `IntentDecision` (`schemaVersion: "intentiq.v1"`). It never
calls Hermes, chooses a model/provider, executes a capability, or writes
memory — see `test/intentIQ.test.js`'s boundary tests, which assert this
directly rather than just documenting it.

Wired into `performStreamingTurn` (turn.js) as an **observe-and-log seam
only** — every streaming turn is classified and the decision is dev-logged
(`src/logos/intentLog.js`), but nothing about document selection, recall,
or the Hermes call changes based on it yet. This matches how Logos's
earlier client-side intentIQ/reasonIQ were introduced (evolution.md,
Milestone 7b) — establish the seam, observe it, wire it into a real
decision later once there's a Gaia-side decision layer to consume it.

Run the synthetic evaluation set: `npm run eval:intent` (see `eval/README.md`).

## Logos.ReasonIQ (v0.1)

`src/logos/reasonIQ.js` — Gaia's first ReasonIQ: "what does this mean,
what follows, what hypotheses are plausible, how certain are we?"
Consumes an `IntentDecision` from IntentIQ (never re-derives intent),
reasons over explicitly-supplied text/context/evidence only (no memory,
no database, no tool access), and returns a structured `ReasoningResult`
(`schemaVersion: "reasoniq.v1"`) distinguishing fact / inference /
hypothesis / unknown, with Stash-inspired evidence verdicts
(`supports`/`weakens`/`contradicts`/`irrelevant`) per hypothesis — see
`src/logos/reasonModels.js` for the full vocabulary and
`docs/` design research for how those verdicts were chosen.

ReasonIQ has its **own, independently configurable reasoning model**
(`src/logos/reasoningModelClient.js`, `REASONIQ_MODEL_*` env vars) —
deliberately not Hermes, not a Gaia capability, and never selected by
Gaia. It decides per turn whether that model is even worth calling
(`decideReasoningDepth`); with no model configured, or on an unreachable/
malformed response, it degrades to an honest, low-confidence result
rather than guessing or throwing into the turn.

**Out of scope this phase** (see the ReasonIQ v0.1 implementation
report): Hermes, Hindsight, MCP, tool execution, capability routing, and
persistence of any kind. `src/logos/index.js`'s `runLogos()` composes
IntentIQ → ReasonIQ for testing that handoff, but is **not** wired into
`turn.js` — there's no Gaia-side decision yet to hand a `ReasoningResult`
to.

Run the synthetic evaluation set: `npm run eval:reason` (see
`eval/README.md` — it runs against a labeled non-LLM stub, not a real
model; read that file before trusting the pass rate).

## Run (dev)

```bash
cd services/gaia-api
GAIA_API_TOKEN=dev-token HERMES_BASE_URL=http://localhost:11434/v1 \
HERMES_MODEL=llama3 npm start
```

## Deploy (VPS)

Same posture as Hindsight and gaia-cognition: Tailscale-only binding
(`100.64.144.93:8891`), token auth, `.env` untracked on the host.

```bash
cp .env.example .env   # fill in
docker compose up -d --build
```

Desktop clients then configure (Settings → Gaia Cloud):

- **Server URL:** `http://100.64.144.93:8891`
- **Auth token:** one of the `GAIA_API_TOKEN` values

## Reaching Hermes

`HERMES_BASE_URL` must point at hermes-agent **by container name**
(`http://hermes:8642/v1`). hermes-agent binds only to its own docker
network (`hermes-agent_default`); this service joins that network in
`docker-compose.yml` exactly like `gaia-hermes-proxy` does. The Tailscale
IP does **not** expose Hermes — don't use `100.64.144.93:8642`.

> **Shared secret — rotate in both places.** `HERMES_AUTH_TOKEN` is the
> same token `gaia-hermes-proxy` injects when *it* talks to hermes-agent
> (`proxy/templates/default.conf.template`). It lives untracked in two
> `.env` files on the VPS: `proxy/.env` and this service's `.env`. If you
> rotate it, update **both**, then restart `gaia-hermes-proxy` and
> `gaia-api` — otherwise one of them starts getting `401` from hermes.
