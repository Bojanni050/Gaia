# Gaia Cognition Service

Holds two kinds of epistemic content Hindsight itself has no place for:
**patterns** and **hypotheses** (architecture.md §6.1). It is a Hindsight-adjacent
sidecar, not a fork or reimplementation of Hindsight — Hindsight remains the
canonical store for memories, facts, and recall. This service exists only
because Hindsight's real API has no hypothesis/pattern objects, and its
`PATCH` can't even touch tags, so status transitions can't be faked on top
of it either.

Runs in Gaia Cloud, next to Hindsight — never client-side (architecture.md §9,
"No client hosts Gaia").

**This service only ever persists.** It never forms a hypothesis or pattern,
judges evidence relevance, tests, confirms, rejects, or refines one, or
revises a confidence score on its own initiative — every one of those
judgments is Logos's, always (architecture.md §6.2, "Hindsight persists;
Logos reasons"). Everything this service's HTTP API does is storage: take
what Logos already decided, keep it, and hand it back on request.

The `hypothesis` design (fields, status lifecycle, confirm-promotes-to-fact)
is adapted from [Stash](https://github.com/alash3al/stash)'s `internal/brain`
package — the *concept*, not the code or the binary. This service does not
depend on Stash, embed it, or run it. Source/evidence references point at
Hindsight memory IDs (UUID strings), not Stash's own fact tables, because
Hindsight is Gaia's actual memory — this service only tracks confidence and
lifecycle on top of it.

## Scope (this pass)

- CRUD + lifecycle for hypotheses: `propose → testing → confirmed | rejected`,
  matching architecture.md §6.1 exactly.
- CRUD for patterns (no lifecycle — patterns don't have one in the
  architecture; they're formed and later superseded, not confirmed/rejected).
- Confirming a hypothesis retains it into Hindsight as a real memory
  (`confirmed_document_id` — Hindsight's retain endpoint never returns a
  memory unit ID, so we set and store our own `document_id` instead), per
  architecture.md §6.1 ("a confirmed hypothesis promotes into a fact through
  the normal memory-policy path").

## Explicitly not in this pass

- Automatic hypothesis testing (Stash runs an LLM comparison of new facts
  against open hypotheses during its consolidation loop, auto-confirming or
  auto-rejecting past a confidence threshold). This service exposes the
  lifecycle endpoints; nothing calls them automatically yet. Gaia (via Logos)
  is expected to be the thing that proposes hypotheses and later decides to
  test/confirm/reject them — this service does not reason on its own.
- Pattern formation logic (clustering facts into an abstraction). This
  service just stores whatever pattern content it's given; forming that
  content from raw facts is Logos's job, not this service's.

## Running locally

```
cp .env.example .env      # set DATABASE_URL
npm install
npm run migrate
npm start                 # listens on PORT (default 8890)
```

## API

All routes are scoped to a `bank_id` (matches the Hindsight bank they're
conceptually attached to — Gaia's is `gaia`).

- `GET /health`
- `POST /v1/banks/:bank_id/patterns`
- `GET /v1/banks/:bank_id/patterns`
- `GET /v1/banks/:bank_id/patterns/:id`
- `PATCH /v1/banks/:bank_id/patterns/:id`
- `DELETE /v1/banks/:bank_id/patterns/:id` (soft delete)
- `POST /v1/banks/:bank_id/hypotheses` (propose; status starts `proposed`)
- `GET /v1/banks/:bank_id/hypotheses` (`?status=` filter)
- `GET /v1/banks/:bank_id/hypotheses/:id`
- `PATCH /v1/banks/:bank_id/hypotheses/:id` (statement/confidence/verification_plan; resets to `proposed` if called from `testing`, mirroring a refine)
- `POST /v1/banks/:bank_id/hypotheses/:id/test` (`proposed → testing`)
- `POST /v1/banks/:bank_id/hypotheses/:id/confirm` (`→ confirmed`; retains into Hindsight)
- `POST /v1/banks/:bank_id/hypotheses/:id/reject` (`→ rejected`; body: `{ reason }`)
- `DELETE /v1/banks/:bank_id/hypotheses/:id` (soft delete)
