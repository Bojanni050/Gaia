---
title: Gaia — IntentIQ & OrchestratorIQ
document: orchestrator
version: 1.1.0
status: active
last_updated: 2026-08-16
owner: Gaia Product Foundation
framing: "Gaia is a lifelong personal intelligence designed to grow through understanding."
---

# Gaia — IntentIQ & OrchestratorIQ

> **Gaia never thinks in terms of "censored" or "uncensored."** She thinks in terms of *which reasoning approach best matches the user's intent.* IntentIQ and OrchestratorIQ are the two judgment layers that make that possible without ever compromising who she is.

---

## Why This Document Exists

This document describes a reasoning pipeline that runs **inside Hermes**, once Hermes has been chosen as the capability for a turn:

```
Intent → Source Resolver → Reasoning Profile → Model Router → Reasoning Model → Gaia Personality Filter → Response
```

This document names the two layers of *judgment* that sit inside that pipeline, and draws the line between them precisely — because that line is easy to blur later. Without a clear split, "which model should answer this" and "is this actually Gaia talking" collapse into the same decision, and the [Character Before Model](./principles.md) principle stops being enforceable in practice.

**A note on scope, since two things are now named "Intent."** [architecture.md §4.2–4.3](./architecture.md#4-system-responsibilities--boundaries) name **Logos's `intentIQ`** and **Gaia** herself as the layer that decides *which capability* (Hermes, Melodiq, SongCompanion, MCP, or none) a turn needs at all — that decision happens at Gaia's level, in her [Cognitive Loop](./architecture.md#cognitive-loop), before any capability is invoked. **IntentIQ**, described below, is a different, later, and more narrowly-scoped judgment despite the similar name: it only runs *after* Gaia has already routed a turn to Hermes specifically, and it decides *how Hermes should reason* about that turn — never whether Hermes should be involved in the first place. Logos's `intentIQ` asks "does this turn need a capability, and which one?"; this document's IntentIQ, running inside Hermes, asks "given that Hermes was chosen, what kind of thinking does it need?" Confusing the two re-creates exactly the problem this document exists to prevent — a single, unnamed judgment quietly doing two jobs.

**Implementation note.** Logos's `intentIQ` — the "does this turn need a capability, and which one" judgment named above — now has a first real implementation at `frontend/src/gaia/logos/intentIQ` (see `docs/evolution.md`). It produces a validated `IntentDecision` (intent, status, confidence, candidates, entities, source of truth, capability, reasoning profile) through a dedicated prompt and the same generic reasoning-provider abstraction the rest of Gaia Desktop uses — not a Hermes-specific call. This milestone establishes the seam only: the decision is currently dev-logged for inspection and does not yet drive capability routing or Foundation selection, so nothing about *this* document's IntentIQ/OrchestratorIQ pipeline (still Hermes-internal, still downstream of Logos's decision) changes.

---

## The Two Layers

**IntentIQ** understands. **OrchestratorIQ** decides and guards.

```
                    ┌─────────────────────────────┐
                    │           IntentIQ            │
                    │  Intent · Source · Reasoning  │
                    │            Profile            │
                    └───────────────┬───────────────┘
                                    │  reasoning profile
                                    ▼
                    ┌─────────────────────────────┐
                    │        OrchestratorIQ         │
                    │  Model Router · Provider Call  │
                    │   · Gaia Personality Filter    │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                              Gaia's Response
```

### IntentIQ — What does the user actually want?

**Owns:** Intent recognition, source resolution, and reasoning-profile selection.

IntentIQ reads the user's turn and asks, in order:

1. **What is the source of truth?** (see [principles.md — Source First](./principles.md)) — current conversation, an upload, understanding, external knowledge, or a tool.
2. **What is the user actually asking for?** Humor, creative writing, technical explanation, emotional support, analysis — intent, not surface wording.
3. **Which reasoning profile fits that intent?** A small, named set of profiles — e.g. *Calm*, *Creative*, *Technical*, *Analytical*, *Playful* — each describing a style of reasoning, not a content policy.

IntentIQ never decides *which provider* answers, and it never decides *whether* a generated response is allowed to reach the user. It hands off a reasoning profile — a description of the kind of thinking the moment calls for — and stops.

**Never:** Routes to a model. Filters output. Judges content.

### OrchestratorIQ — Who reasons, and does the result sound like Gaia?

**Owns:** Model routing, provider execution, and the Gaia Personality Filter.

OrchestratorIQ receives a reasoning profile from IntentIQ and:

1. **Routes.** Selects which provider is best suited to that profile — Hermes, GPT, Venice, DeepSeek, or any future provider — invisibly, per [architecture.md §12](./architecture.md). The provider is chosen for its reasoning strength on that profile, never surfaced, never named to the user (see [principles.md — Invisible Implementation](./principles.md)).
2. **Executes.** Calls the chosen provider and receives back raw reasoning — ideas, a draft, a concept.
3. **Filters.** Passes that raw reasoning through SOUL before anything is returned. This is the enforcement point for [Character Before Model](./principles.md): *a model may generate ideas; Gaia decides whether those ideas become part of her response.*

The Personality Filter is not a profanity list and not a second censor stacked on top of the provider's own. It asks three questions:

- Does this fit Gaia's character? (see [soul.md — Character](./soul.md))
- Is this in service of the user's actual intent, as IntentIQ understood it?
- Would this erode trust or dignity — the user's or Gaia's own — if it were said?

A pitch-black joke that is clearly humor, in response to a request for humor, passes. Gratuitous cruelty dressed as humor does not — not because a model refused it, but because it fails Gaia's own character test. The distinction is never "which model produced this," only "does this sound like her."

**Never:** Re-interprets intent. Owns identity. Lets a provider's raw output reach the user unfiltered.

---

## The Principle

> **Intent Determines Reasoning.**
>
> Gaia selects the reasoning profile that best matches the user's intent. Humor is treated as humor. Creative writing is treated as creativity. Technical discussion is treated as technical discussion. The reasoning approach fits the purpose of the conversation; it is never imposed uniformly on every interaction.

> **Character Before Model.** *(already established in [principles.md](./principles.md))*
>
> Models provide reasoning. Gaia provides character. No model defines Gaia's personality — including the choice of *which* model reasoned.

These two principles are why the layers cannot merge. IntentIQ makes Gaia responsive to what the moment actually calls for, instead of applying one flattened style — or one blanket restriction — to every conversation. OrchestratorIQ makes that responsiveness safe, because whatever a provider generates still has to pass through Gaia before it is hers.

---

## Why the Split Matters

- **A provider can change without Gaia changing.** If Venice is replaced by a better model tomorrow, only OrchestratorIQ's routing table changes. IntentIQ's understanding of the user, and the Personality Filter's understanding of Gaia, are untouched.
- **"Uncensored" stops being a mode.** There is no user-facing toggle that turns Gaia's judgment off. A more permissive provider is a routing option for certain reasoning profiles, not a different Gaia.
- **The filter is centralized, not duplicated.** Every provider's output passes through one Personality Filter, in one place, regardless of which provider produced it. Providers do not each need their own bespoke Gaia-shaping logic — that would mean re-deriving her character per provider, which is exactly what SOUL exists to prevent.
- **Intent and identity stay separable and auditable.** If Gaia ever says something that doesn't sound like her, the question "did IntentIQ misread the moment, or did OrchestratorIQ let something through?" has one clear answer, in one clear place.

---

## Boundary Rules

- IntentIQ never talks to a provider. It only ever produces a reasoning profile.
- OrchestratorIQ never re-interprets the user's intent. It routes and filters; it does not decide what the user wanted.
- The Personality Filter is mandatory and unconditional. No reasoning profile, no provider, and no routing decision may bypass it.
- Provider identity never leaks past OrchestratorIQ. Gaia Desktop and the user see one voice, per [architecture.md §12](./architecture.md) and [principles.md — Invisible Implementation](./principles.md).
- Reasoning profiles describe *style of thinking*, never *content permissions*. A profile is not a workaround for the Personality Filter.

---

## Relationship to Gaia's Structure

IntentIQ and OrchestratorIQ are not additional layers alongside SOUL, Logos, Hindsight, Gaia's capabilities, and Gaia Desktop (see [architecture.md §1](./architecture.md)). They are the internal judgment structure of the **reasoning pipeline that runs inside Hermes-the-capability, once Gaia has already decided, through Logos's `intentIQ`, that Hermes is the capability this turn needs** — the mechanism by which Hermes stays model-agnostic while still being governed by SOUL. IntentIQ and OrchestratorIQ do not own a responsibility SOUL, Logos, or Hermes doesn't already own; they are how Hermes's own responsibility is actually carried out, turn by turn, after Gaia has decided Hermes is the right capability at all.

---

## The Promise

The model thinks. Gaia speaks. IntentIQ makes sure Gaia understands what's actually being asked before anything reasons. OrchestratorIQ makes sure that whatever reasons, only what genuinely belongs to Gaia ever reaches the user.
