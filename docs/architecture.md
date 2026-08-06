---
title: Gaia — Architecture
document: architecture
version: 1.0.0
status: foundation
last_updated: 2026-06-01
owner: Gaia Product Foundation
framing: "Gaia is a lifelong personal intelligence designed to grow through understanding."
---

# Gaia — Architecture

> **Gaia is a lifelong personal intelligence designed to grow through understanding.**
>
> The architecture exists to let that understanding deepen over a lifetime **without collapsing the boundaries** between the systems that make Gaia who she is.

---

# Architecture Principles

Build against interfaces.

Not implementations.

Every subsystem has a single responsibility.

Prefer maintainability over cleverness.

Keep implementations replaceable.

---

# Reasoning Pipeline

Intent

↓

Source Resolver

↓

Reasoning Profile

↓

Model Router

↓

Reasoning Model

↓

Gaia Personality Filter

↓

Response

---

# Platform Independence

Gaia is the application.

Desktop, browser and mobile are delivery platforms.

The platform should never define Gaia's identity.

---

# Provider Independence

Reasoning providers are interchangeable.

Memory providers are interchangeable.

Action providers are interchangeable.

Gaia depends on capabilities.

Never on specific products.

## 1. Guiding Architectural Principles

1. **Frontend-centric desktop product.** Gaia is designed first as a desktop client that communicates with **Hermes Agent** through its streaming API. Depth and presence originate on the desktop.
2. **No new backend services by default.** Hermes Agent is the orchestration entry point. New backend layers are introduced only when a clear architectural problem cannot be appropriately owned by Hermes (see §9).
3. **Storage is abstract.** Hindsight's persistence technology is an implementation detail. Gaia depends on Hindsight *capabilities and contracts*, never on its storage internals.
4. **Absolute model agnosticism.** Hermes may use one or many providers. Gaia's identity, tone, and continuity must never change when a provider changes.
5. **Separation of concerns is identity.** SOUL, Hindsight, Hermes, Chronicles, MCP, and Gaia Desktop each own exactly one responsibility. No layer absorbs another's role, ever.
6. **Growth without boundary collapse.** Understanding deepens through defined interfaces (memory policies, reflection, knowledge contracts) — not by letting layers bleed into one another.

---

## 2. System Overview

```
                        ┌───────────────────────────────────┐
                        │           GAIA DESKTOP              │
                        │   (primary experience & shell)      │
                        │                                     │
                        │   Conversation-first UX             │
                        │   Presence, continuity, calm        │
                        └──────────────┬──────────────────────┘
                                       │  streaming API (SSE/stream)
                                       │  intents · permissions · context
                                       ▼
                        ┌───────────────────────────────────┐
                        │           HERMES AGENT              │
                        │   reasoning · orchestration entry   │
                        │   model-agnostic provider routing   │
                        └───┬───────────┬───────────┬────────┘
                            │           │           │
              memory        │ knowledge │  actions  │  identity
              contracts     │ contracts │ contracts │  (constitution)
                            ▼           ▼           ▼           ▲
                   ┌────────────┐ ┌───────────┐ ┌───────┐ ┌────────┐
                   │ HINDSIGHT  │ │ CHRONICLES│ │  MCP  │ │  SOUL  │
                   │ long-term  │ │ structured│ │actions│ │identity│
                   │  memory    │ │ knowledge │ │ layer │ │constit.│
                   │ (storage-  │ │           │ │       │ │        │
                   │  abstract) │ │           │ │       │ │        │
                   └────────────┘ └───────────┘ └───────┘ └────────┘

     Providers (interchangeable, never user-facing):
          [ Provider A ]  [ Provider B ]  [ Provider C ] ── internal to Hermes only
```

The user interacts with **Gaia Desktop**. Gaia Desktop talks to **Hermes**. Hermes orchestrates memory (Hindsight), knowledge (Chronicles), actions (MCP), and is governed by identity (SOUL). Reasoning providers live entirely inside Hermes and are never exposed.

---

## 3. Gaia Desktop — The Primary Experience Layer

Gaia Desktop is the product the user lives in. Its responsibilities:

- **Own the conversational experience.** The conversation space is central, immediate, and calm.
- **Present Gaia's continuity.** Voice, tone, presence, and relationship state are rendered here consistently across sessions.
- **Manage local session and interaction state.** Draft input, streaming render, scroll/attention state, and ephemeral UI state.
- **Mediate permissions and intent.** When an action is needed, the desktop surfaces clear intent and explicit permission before MCP is invoked.
- **Expose legible controls for understanding.** Memory provenance, editing, and steering controls (see §8) live here.

Gaia Desktop **does not**: perform reasoning, decide what to remember, hold the canonical long-term memory, or contain provider-specific logic. It is a client — a rich, careful one — not a brain.

---

## 4. System Responsibilities & Boundaries

### 4.1 SOUL — Identity
- **Owns:** Gaia's constitution — who she is, her values, tone, boundaries, and continuity rules.
- **Provides:** A stable identity contract that governs all of Gaia's expression, independent of any provider. The Foundation Engine compiles this identity at build-time from canonical Markdown files (`soul.md`, `principles.md`, `lexicon.md`).
- **Never:** Stores episodic memory, performs reasoning, or executes actions.
- **Boundary rule:** Identity is read as a governing constraint by Hermes; it is not something a model generates or can overwrite.

### 4.2 Hindsight — Long-Term Memory
- **Owns:** Reflective, pattern-based long-term memory across defined memory domains.
- **Provides:** Capability contracts for storing reflections, retrieving relevant context, forming and querying patterns, and enforcing memory policies.
- **Never:** Reasons, decides identity, or exposes storage internals.
- **Boundary rule:** Gaia depends on Hindsight *contracts*, not its database. Storage is fully swappable (see §7).

### 4.3 Hermes — Reasoning
- **Owns:** Reasoning, orchestration, and provider routing. It is the single API surface Gaia Desktop talks to.
- **Provides:** A streaming conversational API; orchestration across Hindsight, Chronicles, and MCP; model-agnostic provider selection.
- **Never:** Becomes the home of identity or memory. Hermes uses SOUL and Hindsight; it does not become them.
- **Boundary rule:** Providers are internal to Hermes and never surfaced to Gaia Desktop or the user.

### 4.4 Chronicles — Structured Knowledge
- **Owns:** Structured, factual knowledge — entities, attributes, and relationships.
- **Provides:** Query/update contracts for durable structured facts distinct from personal memory.
- **Never:** Stores reflective/emotional memory (that is Hindsight) or performs reasoning.
- **Boundary rule:** The line between *personal memory* (Hindsight) and *structured knowledge* (Chronicles) is explicit and must not blur. Memory is about the person's patterns and reflections; knowledge is about facts and structure.

### 4.5 MCP — Actions
- **Owns:** Execution of external capabilities/tools under explicit permission.
- **Provides:** A capability/action contract invoked through clear intent and user consent.
- **Never:** Decides autonomously what matters, or acts without explicit permission and clear intent.
- **Boundary rule:** Operational complexity is hidden from the user; actions are surfaced as intent + permission, not as tool chains.

### 4.6 Gaia Desktop — Experience
- See §3. Owns experience and mediation; owns no canonical reasoning, memory, or identity.

---

## 5. Data & Interaction Flow

### 5.1 Everyday conversational turn

```
1. User types/speaks in Gaia Desktop.
2. Desktop sends the turn + session context + granted permissions to Hermes (streaming API).
3. Hermes loads governing identity from SOUL.
4. Hermes retrieves relevant context:
      - reflective/personal context  → Hindsight (via memory contracts)
      - structured facts              → Chronicles (via knowledge contracts)
5. Hermes reasons using an internal provider (choice invisible to Gaia/user).
6. If an external action is required:
      - Hermes signals intent → Desktop surfaces permission → user consents
      - MCP executes the action → result returns to Hermes
7. Hermes streams Gaia's response back to Desktop, token by token.
8. Desktop renders the response as Gaia's continuous voice.
9. Asynchronously, significant patterns are reflected into Hindsight via memory policies
   (NOT raw logging — see §6).
```

### 5.2 Direction of dependency

- Gaia Desktop → depends on → Hermes (only).
- Hermes → depends on → SOUL, Hindsight, Chronicles, MCP (via contracts).
- No adjacent leaf system depends on another leaf system directly; Hermes orchestrates.
- Providers are a private dependency of Hermes.

---

## 6. Memory Formation — Growth Without Boundary Collapse

Growth in understanding is the product thesis, and it is realized here **without** merging systems.

- **Reflection, not logging.** Hindsight does not store the raw transcript as memory. It stores *reflections* and *patterns* selected by memory policies according to significance.
- **Memory policies are explicit contracts.** What is eligible to be remembered, at what fidelity, with what retention, and with what user visibility is governed by declared policies — not by ad-hoc model behavior.
- **Patterns over facts.** Hindsight forms understanding of recurring patterns (how the user decides, communicates, works). Isolated facts belong in Chronicles.
- **Provenance is preserved.** Every reflection retains where it came from, so the user can inspect, correct, or remove it (see §8).

Because reflection happens through Hindsight's contract and identity is governed by SOUL, understanding can deepen indefinitely while every boundary stays intact. Growth is a function of richer memory contracts — never of one layer swallowing another.

---

## 7. Storage Abstraction for Hindsight

Storage is deliberately **not** specified at the foundation level.

- Gaia and Hermes address Hindsight through **capability contracts**: `store_reflection`, `retrieve_relevant_context`, `form_pattern`, `query_patterns`, `apply_memory_policy`, `list_provenance`, `edit_memory`, `forget`.
- The architecture specifies **memory domains, policies, and interfaces** — never a database choice.
- Any persistence technology (document store, vector store, graph, hybrid, or future technology) may back Hindsight, and may change over time, with **zero** impact on Gaia's identity or contracts.
- **Rule:** No component outside Hindsight may reference storage internals, schemas, or query dialects. Violating this couples Gaia to a persistence choice and breaks the abstraction.

---

## 8. Memory Provenance & User Control (Stance)

> **Open question resolved:** *How visible should memory provenance and editing controls be?*
> **Stance: Provenance is always available on demand, never in the user's face.**

- Every stored reflection carries provenance (source turn/date/context) retrievable through Hindsight's `list_provenance` contract.
- Gaia Desktop exposes a **calm, opt-in memory view**: the user can, at any time, see what Gaia has come to understand, inspect why, edit it, or forget it.
- This view is **not** part of the everyday conversational surface — it does not clutter the primary experience. It is discoverable and trustworthy, not omnipresent.
- **Rationale:** Legibility builds trust; omnipresence creates the surveillance feeling Gaia must avoid. Control on demand, invisibility by default.

---

## 9. When a Separate Backend Is Justified (Stance)

> **Open question resolved:** *At what point would synchronization or policy concerns justify a separate backend beyond Hermes?*
> **Stance: Default to Hermes-only. Introduce a new backend layer only when one of these proven needs appears:**

A new backend service is justified **only** when a concern genuinely cannot be owned by Hermes:

1. **Cross-client synchronization boundaries** — coordinating state across multiple simultaneous clients where the desktop client cannot be the source of truth.
2. **Offline reconciliation** — merging divergent local changes made while offline (see §11).
3. **Security isolation** — isolating secrets, keys, or sensitive policy enforcement away from the reasoning path.
4. **Dedicated policy enforcement** outside the reasoning layer — where policy must be authoritative independent of reasoning.
5. **Multi-device state coordination** — canonical device/session state that should not live in any single desktop client.

Until one of these is *proven* (not anticipated), Gaia remains a desktop client talking to Hermes. **Speculative backends are prohibited.**

---

## 10. Streaming Conversation Lifecycle

```
OPEN     Desktop opens a streaming connection to Hermes for a turn.
CONTEXT  Hermes assembles identity (SOUL) + memory (Hindsight) + knowledge (Chronicles).
REASON   Hermes reasons via an internal provider; begins emitting tokens.
STREAM   Tokens stream to Desktop; Gaia's presence indicates listening/thinking/speaking.
ACT?     If an action is needed → intent surfaced → permission → MCP → result folded in.
COMPLETE Stream ends; Desktop finalizes the rendered turn.
REFLECT  Asynchronously, memory policies may reflect significant patterns into Hindsight.
CLOSE    Connection closes; session continuity is preserved for the next turn.
```

- **Interruptibility:** The user may interrupt a stream; Gaia stops gracefully. Silence and stopping are first-class.
- **Backpressure & failure:** If a provider fails mid-stream, Hermes may re-route to another provider — invisibly, preserving Gaia's continuity.

---

## 11. Offline-First Behavior (Stance)

> **Open question resolved:** *Offline-first in early versions, or network-dependent initially?*
> **Stance: Network-dependent initially, with an offline-graceful desktop shell; true offline-first is deferred to a later version.**

- **V1:** Reasoning requires Hermes connectivity. The desktop shell degrades gracefully offline — it remains open, calm, and readable, clearly indicating that Gaia is momentarily unreachable rather than breaking.
- **Later:** True offline-first (local reflection buffering + reconciliation) is a candidate that would justify an offline reconciliation backend (§9.2). It is intentionally out of scope early to keep V1 small and boundaries clean.
- **Rationale:** Offline-first prematurely forces sync/reconciliation complexity that contradicts the "no speculative backend" principle. We add it when the need is real.

---

## 12. Model-Agnostic Reasoning Design

- **Single surface:** Gaia Desktop knows only Hermes. It has no concept of "a model."
- **Internal routing:** Hermes selects among one or more providers using its own routing logic (capability, cost, latency, availability). This is invisible upstream.
- **Continuity contract:** Provider changes must not alter Gaia's identity, tone, or continuity. SOUL governs voice; Hindsight governs memory. Neither lives in the provider.
- **No provider leakage:** Provider names, model versions, tool chains, and provider-specific UX concepts must never appear in Gaia Desktop or in Gaia's language.
- **Failover:** Hermes may transparently fail over between providers mid-conversation without the user perceiving a change in who they are talking to.

---

## 13. Extensibility to Future Interfaces Without Redesign

- **Hermes is the shared contract.** Web, mobile, voice, wearable, and ambient surfaces are additional clients of the same Hermes streaming API.
- **Identity and memory are surface-independent.** Because SOUL and Hindsight sit behind Hermes, every surface inherits the same Gaia — same voice, same understanding.
- **No architectural inversion.** New surfaces extend Gaia; they never push identity, memory, or reasoning into the client. The desktop depth defines the character; other surfaces adapt presentation only.
- **Rule:** If a new surface would require moving identity, memory, or canonical reasoning into a client, the design is wrong.

---

## 14. Separation of Concerns & Policy Boundaries (Enforcement)

To prevent silent boundary collapse over time:

- **One responsibility per layer.** Any PR that gives a layer a second responsibility is rejected.
- **Contracts, not internals.** Layers integrate only through declared contracts. Reaching into another layer's internals is prohibited.
- **Memory vs. knowledge line.** Reflective/personal → Hindsight. Factual/structured → Chronicles. Never store one in the other.
- **Identity is read-only to reasoning.** Hermes reads SOUL; it cannot mutate identity.
- **Actions require intent + permission.** MCP never acts on inference alone.
- **Providers are private.** No provider concept escapes Hermes.

These rules are the architectural expression of Gaia's promise: she can grow through understanding indefinitely because the systems that make her *her* never dissolve into one another.
