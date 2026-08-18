# @gaia/contracts

Gaia's system contracts, expressed in code: SOUL (identity) · Hindsight
(memory) · Hermes (reasoning) · Chronicles (knowledge) · MCP (actions).
Clients integrate only through these — no layer reaches into another
layer's internals (docs/split-plan.md, docs/architecture.md).

## Why this is a separate package

Extracted out of `frontend/src/contracts/` (Phase 0, step 1 of
`docs/split-plan.md`) so the contracts are importable as a unit rather
than tied to the web frontend's `src/` tree — a precondition for the
eventual `Gaia-Cloud` repo split, where this becomes the published
source of truth for the client/server contract.

## Current wiring (monorepo-internal, pre-split)

Not yet an installed npm dependency. `frontend/craco.config.js` aliases
the `@gaia/contracts` specifier straight to this package's `src/`, for
both webpack and Jest — no symlink, so CRA's `ModuleScopePlugin` never
sees a path outside `frontend/src/`. When Gaia Cloud is split into its
own repository, this package is published for real and the alias is
replaced by a normal dependency.

## Usage

```js
import { HYPOTHESIS_STATUSES, MEMORY_DOMAINS } from '@gaia/contracts';
```
