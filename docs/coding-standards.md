---
title: Gaia — Coding Standards
document: coding-standards
version: 1.0.0
status: foundation
last_updated: 2026-06-01
owner: Gaia Product Foundation
framing: "Gaia is a lifelong personal intelligence designed to grow through understanding."
---

# Gaia — Coding Standards

> **Gaia is a lifelong personal intelligence designed to grow through understanding.**
>
> These standards exist to protect **long-term maintainability** and the **strict separation of concerns** (SOUL, Logos, Hindsight, Gaia's capabilities — Hermes among them — and Gaia Desktop) that make Gaia who she is. Code is written to be read and maintained for years.

---

## 1. Core Engineering Values

- **Boundaries are load-bearing.** The architectural separation of layers is a hard constraint in code, not a suggestion. No module may take on a second layer's responsibility.
- **Contracts over internals.** Layers integrate only through declared contracts. Reaching into another layer's internals is a defect.
- **Simplicity over cleverness.** The simplest solution that satisfies the requirement wins. Clever code is a liability over a lifelong product.
- **Least surprise.** Code should behave the way a careful reader expects. Consistency beats local optimization.
- **Delete-friendly.** Prefer designs that are easy to remove or replace. Coupling is the enemy of a decade-long product.

---

## 2. Project Structure

Gaia Desktop is the primary surface; integration layers are thin clients of Hermes and adjacent contracts. A representative structure:

```
/gaia-desktop
  /src
    /app                # shell composition, routing, top-level layout
    /conversation       # the primary conversational experience (the center)
    /presence           # Gaia presence states & motion (listening/thinking/...)
    /memory-view        # calm, opt-in view of what Gaia understands (provenance/edit)
    /knowledge-view     # structured-knowledge surfaces (Chronicles), summoned
    /actions            # intent + permission UX for MCP (no tool-chain leakage)
    /integration        # clients for Hermes + adjacent contracts (see /contracts)
      /hermes           # streaming conversation client (the ONLY reasoning surface)
      /hindsight        # memory capability client (storage-abstract)
      /chronicles       # structured knowledge client
      /mcp              # actions capability client
    /identity           # SOUL-governed identity presentation (read-only to client)
    /state              # client state management (session/UI/ephemeral only)
    /ui                 # shared, calm, reusable presentation primitives
    /lib                # pure utilities (no layer knowledge)
  /contracts            # typed interface definitions for Hermes & adjacent systems
  /docs                 # this foundation set
  /tests
```

**Structure rules:**
- One directory per responsibility; directory names map to product concepts, not tech.
- The `/integration` clients are the **only** place that knows how to talk to external systems. UI and conversation code depend on those clients, never on transport details.
- `/contracts` holds the typed boundaries. If a shape crosses a layer, it is defined here.
- No cross-imports that violate layer direction: Desktop → Hermes only; adjacent systems are reached through Hermes-facing contracts, not peer-to-peer.

---

## 3. Naming Conventions

- **Names describe product meaning, not mechanism.** `conversationStream`, not `sseHandler`; `memoryReflection`, not `dbRecord`.
- **No provider or model names anywhere in the codebase's public surface.** Provider details are confined to Hermes internals; they must never appear in Gaia Desktop identifiers, comments, or UI strings.
- **Layers own their vocabulary:** `hindsight.*` for memory, `chronicles.*` for knowledge, `mcp.*` for actions, `soul.*` for identity, `hermes.*` for reasoning transport.
- **Files:** kebab-case for files/directories; PascalCase for components; camelCase for functions/variables; SCREAMING_SNAKE for true constants.
- **Booleans read as questions:** `isListening`, `hasProvenance`, `canAct`.
- **No abbreviations** unless universally understood. Clarity outlives keystrokes.

---

## 4. Component & Module Philosophy

- **Small and single-purpose.** Components stay small (aim < 50 lines of logic); modules do one thing.
- **Presentation vs. behavior.** Separate calm presentation primitives from behavior/state. UI primitives know nothing about layers.
- **Conversation is privileged, not special-cased.** The conversation surface follows the same composition rules as everything else; it earns its centrality through design, not through hacks.
- **No god modules.** If a module knows about more than one layer, split it. A module that touches both Hindsight and Chronicles concerns is a boundary violation.
- **Composition over configuration.** Prefer composing small pieces to adding flags and options.

---

## 5. State Management Philosophy (Client)

- **The client owns only client state.** Session, UI, ephemeral interaction, and streaming render state. Canonical memory lives in Hindsight; canonical knowledge in Chronicles; identity in SOUL. The client never becomes the source of truth for these.
- **Server (Hermes/adjacent) state is fetched through contracts, cached deliberately, and never mutated locally as if authoritative.**
- **Explicit, minimal, and local-first.** Keep state as local as possible; lift only when genuinely shared. Avoid a sprawling global store.
- **Streaming state is first-class.** Model listening/thinking/speaking/resting explicitly; presence is derived from it.
- **No hidden persistence.** Anything persisted client-side is deliberate, documented, and never a shadow copy of Hindsight.

---

## 6. API Contract Philosophy (Hermes & Adjacent Systems)

- **Hermes is the single reasoning surface.** Gaia Desktop makes reasoning/conversation requests only to Hermes. It never talks to a provider.
- **Contracts are explicit and typed.** Every interface (Hermes streaming, Hindsight capabilities, Chronicles queries, MCP actions) is defined in `/contracts` with clear inputs, outputs, and error shapes.
- **Capability contracts, not implementation coupling.** Depend on *what* a system can do (e.g., `hindsight.retrieveRelevantContext`), never *how* it stores or computes it.
- **Storage-abstract by rule.** No contract may leak Hindsight persistence details (schemas, query dialects, storage types). Violations are rejected in review.
- **Model-agnostic by rule.** No contract may carry provider/model identifiers to the client.
- **Actions require intent + permission in the contract shape itself.** MCP calls must carry explicit intent and consent; a contract that allows silent action is invalid.
- **Versioned and backward-compatible.** Contracts change additively where possible; breaking changes are versioned and migration is documented.
- **Streaming is designed for interruption and failover.** Contracts account for user interruption and transparent provider failover without surfacing either as a broken experience.

---

## 7. Testing Philosophy

- **Test behavior and boundaries, not internals.** Tests assert product behavior and contract adherence, not implementation details.
- **Boundary tests are mandatory.** Each layer has tests proving it does not exceed its responsibility (e.g., the client never persists canonical memory; no provider name leaks to the UI).
- **Contract tests at every seam.** Hermes, Hindsight, Chronicles, and MCP integrations are tested against their `/contracts` definitions with fakes, so storage/provider changes cannot silently break Gaia.
- **Calm-experience tests.** Key UX guarantees are tested: interruptibility, non-intrusion defaults, provenance availability, graceful offline shell.
- **Determinism where it matters.** Reasoning outputs are non-deterministic; tests target the contract and the experience around it, not exact model text.
- **Fast feedback.** The core suite runs quickly and is expected to pass before merge.

---

## 8. Documentation Culture

- **Docs are part of the definition of done.** A change that alters a contract, boundary, or product behavior updates the relevant `/docs` file in the same change.
- **This foundation set is authoritative.** `vision`, `architecture`, `design-language`, `personality`, `roadmap`, `coding-standards`, `ui-principles` govern decisions. When in doubt, defer to them.
- **In-code comments are sparse and purposeful.** Default to self-explanatory code. One short line where intent is non-obvious; no multi-paragraph docstrings, no decorative comment blocks.
- **Contracts are self-documenting.** `/contracts` carries the canonical description of each seam.
- **No stale docs.** Outdated documentation is treated as a defect.

---

## 9. Refactoring Rules

- **Refactor toward boundaries.** The best refactors strengthen separation of concerns. The best time to refactor is when a boundary is being violated.
- **Scoped and intentional.** Refactor only what the task requires. A bug fix does not license surrounding cleanup; a small feature does not license architectural churn.
- **Never mix refactor and behavior change silently.** Keep refactors and behavior changes separable and reviewable.
- **Delete boldly.** Removing coupling, dead code, and speculative abstractions is encouraged. A lifelong product stays maintainable by staying lean.
- **No speculative generality.** Do not build for hypothetical futures. Add abstraction when a second real caller exists, not before.

---

## 10. Dependency Governance

- **Dependencies are long-term liabilities.** Every dependency must be justified by clear, current value that we could not reasonably build small.
- **Prefer stable, well-maintained, boundary-respecting libraries.** Avoid dependencies that would couple Gaia to a provider, a storage technology, or a transient trend.
- **No dependency may cross a boundary for us.** A library must not smuggle provider or storage assumptions into the client.
- **Pin and review.** Dependencies are pinned; upgrades are deliberate and tested against contract tests.
- **Minimize surface area.** Fewer, well-understood dependencies over many convenient ones.

---

## 11. Long-Term Maintainability Rules

1. **Protect the boundaries above all.** SOUL, Logos, Hindsight, Gaia's capabilities (Hermes among them), Desktop — no layer absorbs another, ever. This is the single most important rule.
2. **Keep the client thin and honest.** Cognition and orchestration live in Gaia and Logos; reasoning, memory, and identity live behind capability contracts — not in Gaia Desktop. Gaia Desktop knows only Gaia.
3. **Stay storage-abstract and model-agnostic.** These are not V1 conveniences; they are permanent invariants.
4. **Optimize for readability and deletion.** Code will be read and changed far more than it is written.
5. **Resist feature accretion.** Depth of understanding, not breadth of features, is the product. Say no by default.
6. **Every change asks: does this preserve calm, trust, and continuity?** If not, it does not ship.

These standards are the code-level expression of Gaia's promise: she can grow through understanding for a lifetime because her boundaries, contracts, and calm are protected in every commit.
