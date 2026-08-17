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
| GET    | `/health` (and `/`) | none | `{ ok: true }` |
| POST   | `/conversation/turn`| Bearer | in: `{ messages: [{ role, content }] }` → out: `{ reply: string }` |

Non-streaming in this phase. The streaming variant grows behind the same
path (SSE/WebSocket) — clients were built with that seam ready.

## Boundaries

- **Identity is server-side.** SOUL is loaded from the repository's
  canonical `frontend/src/gaia/identity/soul.md` (baked into the image;
  `SOUL_PATH` overrides). No SOUL, no start.
- **No provider leakage.** Hermes' URL, model and token live in this
  service's environment. Error responses are calm sentences, not stack
  traces or upstream status codes.
- **Fail closed.** Without `GAIA_API_TOKEN` every authenticated route
  returns 503; wrong tokens get 401.

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
