# gaia-hermes-proxy

Internal nginx proxy that fronts the `hermes` container (`nousresearch/hermes-agent`)
and injects its auth token, so the client (`gaia-web`) never needs to know it.
Bound to `127.0.0.1` only on the VPS — never exposed publicly on its own;
`gaia-web`'s own nginx (`/nginx.conf` at the repo root) is what forwards
`/api/hermes/` to it, same-origin from the browser's perspective.

`templates/default.conf.template` uses nginx's built-in envsubst-on-templates
support (official `nginx` image, enabled by default since 1.19): anything in
`/etc/nginx/templates/*.template` is rendered into `/etc/nginx/conf.d/` at
container start, substituting `${VAR}` from the container's actual
environment variables. nginx's own `$host`/`$remote_addr`/etc. are runtime
variables, not environment variables, so they're untouched by this — only
`${HERMES_AUTH_TOKEN}` gets substituted.

**Required env var:** `HERMES_AUTH_TOKEN` — the Hermes API token. Set it in
an untracked `.env` on the VPS (`/root/gaia/proxy/.env`, gitignored, never
committed) and pass it via `env_file` / `--env-file` when running the
container. See `docs/evolution.md` (the amendment on this proxy) for how
it's deployed.

> **Shared secret — rotate in both places.** `gaia-api` talks to
> hermes-agent directly and uses the *same* token (`services/gaia-api/.env`).
> If you rotate it, update **both** `.env` files, then restart
> `gaia-hermes-proxy` and `gaia-api` — otherwise one of them starts getting
> `401` from hermes.
