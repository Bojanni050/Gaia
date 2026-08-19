---
title: Gaia — Hermes's Internal Reasoning Pipeline (IntentIQ & OrchestratorIQ)
document: orchestrator
version: 1.3.0
status: active
last_updated: 2026-08-19
owner: Gaia Product Foundation
framing: "Gaia is a lifelong personal intelligence designed to grow through understanding."
---

# Gaia — Hermes's Internal Reasoning Pipeline (IntentIQ & OrchestratorIQ)

> **Hermes is a capability Gaia may call — nothing more.** Like any capability, what happens once she calls it is Hermes's own concern. This document describes that internal concern for the record; it is not part of Gaia's own cognition and has no connection to Logos.

---

## Why This Document Exists

Hermes is one of Gaia's capabilities (architecture.md §4.5) — an instrument she reaches for, through her own orchestration, when a turn needs reasoning. What happens *inside* Hermes once she has made that call is Hermes's own internal shape, not Gaia's. This document records that internal shape, purely so it's understood and reviewable — the same way any capability's internals might be documented — not because Gaia's own reasoning depends on it.

Inside Hermes, once invoked, a pipeline runs:

```
Intent → Source Resolver → Reasoning Profile → Model Router → Reasoning Model → Gaia Personality Filter → Response
```

This document names the two layers of *judgment* inside that pipeline, and draws the line between them precisely — because that line is easy to blur later. Without a clear split, "which model should answer this" and "is this actually Gaia talking" collapse into the same decision, and the [Character Before Model](./principles.md) principle stops being enforceable in practice.

**No connection to Logos.** Gaia's own cognition — Logos, with its `intentIQ` and `reasonIQ` faculties (`frontend/src/gaia/logos/`, see architecture.md §4.2) — is what decides, at Gaia's level, whether a turn needs a capability at all, and which one. That decision is made and finished *before* Hermes is ever called. Everything in this document happens only after that decision, entirely inside Hermes, using a name (**IntentIQ**) that resembles Logos's `intentIQ` only by coincidence of language — a naming collision worth flagging, not an architectural relationship. Hermes does not know Logos exists. Logos does not know or care what Hermes does internally. Neither one calls, informs, or depends on the other.

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

1. **Routes.** Selects which reasoning provider is best suited to that profile — invisibly, per [architecture.md §12](./architecture.md). The provider is chosen for its reasoning strength on that profile, never surfaced, never named to the user (see [principles.md — Invisible Implementation](./principles.md)). No specific provider or model brand is ever hardcoded here — that is what keeps Hermes model-agnostic.
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

IntentIQ and OrchestratorIQ are not additional layers alongside SOUL, Logos, Hindsight, Gaia's capabilities, and Gaia Desktop (see [architecture.md §1](./architecture.md)). They are not layers at all from Gaia's perspective — they are the internal judgment structure of **Hermes's own reasoning pipeline**, private to Hermes, the mechanism by which Hermes stays model-agnostic while still being governed by SOUL once Gaia has called it. They do not own a responsibility SOUL, Logos, or Hermes-the-capability doesn't already own; they are how Hermes carries out its own responsibility, turn by turn, entirely after and independent of whatever led Gaia to call Hermes in the first place.

**Hermes is a tool Gaia can use — nothing more.** She calls it when a turn needs reasoning and ignores it otherwise (architecture.md §5.1). She never depends on its internals, and neither does Logos. If Hermes were replaced by a different reasoning capability tomorrow, this entire document would be replaced with it; nothing about Logos, SOUL, or any other part of Gaia would need to change.

---

## The Promise

The model thinks. Gaia speaks. IntentIQ makes sure Gaia understands what's actually being asked before anything reasons. OrchestratorIQ makes sure that whatever reasons, only what genuinely belongs to Gaia ever reaches the user.
