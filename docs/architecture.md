---
title: Gaia — Architecture
document: architecture
version: 2.0.0
status: foundation
last_updated: 2026-08-15
owner: Gaia Product Foundation
framing: "Gaia is a lifelong personal intelligence designed to grow through understanding."
---

# Gaia — Architecture

> **Gaia is a lifelong personal intelligence designed to grow through understanding.**
>
> Gaia is the agency. Logos is Gaia's cognitive reasoning layer. Capabilities are instruments Gaia may employ.
>
> The architecture exists to let that understanding deepen over a lifetime **without collapsing the boundaries** between the systems that make Gaia who she is.

---

# Core Architectural Model

```

                    ┌─────────────────────────────────────┐
                    │              GAIA                    │
                    │   (agency + orchestrator)            │
                    │                                      │
                    │   ┌───────────────────────────────┐  │
                    │   │           LOGOS               │  │
                    │   │   (cognitive reasoning layer) │  │
                    │   │                               │  │
                    │   │   ┌───────────┐ ┌───────────┐ │  │
                    │   │   │ intentIQ  │ │ reasonIQ  │ │  │
                    │   │   │  what     │  what does  │ │  │
                    │   │   │  does the │  this mean  │ │  │
                    │   │   │  user     │  and what   │ │  │
                    │   │   │  want?    │  follows?   │ │  │
                    │   │   └───────────┘ └───────────┘ │  │
                    │   └───────────────────────────────┘  │
                    │                                      │
                    │   Memory / Context                   │
                    │   Goals / State                      │
                    │   Decision                           │
                    │   Orchestration                      │
                    │                                      │
                    │   ┌───────────────────────────────┐  │
                    │   │        CAPABILITIES           │  │
                    │   │   (optional instruments)      │  │
                    │   │                               │  │
                    │   │   Hermes · Melodiq ·          │  │
                    │   │   SongCompanion · ...         │  │
                    │   └───────────────────────────────┘  │
                    └─────────────────────────────────────┘
    ```

**Gaia** is the agency — the entity that acts, decides, and maintains continuity.

**Logos** is Gaia's cognitive reasoning layer — the place where Gaia interprets input and constructs meaning. Logos consists of:

- **intentIQ** — within Logos: what is the user trying to achieve?
- **reasonIQ** — within Logos: what does this mean, how should I reason about it, and what conclusions follow?

**Capabilities** are instruments Gaia may employ — Hermes for reasoning, Melodiq for music, SongCompanion for song-related tasks, and others. No capability is necessary for Gaia's own cognition. Capabilities are tools Gaia reaches for when they serve her goals; they are not constituents of her identity.

**Feedback** is a first-class input in Gaia's cognitive loop — not an afterthought, not a side channel. Feedback flows into Logos, where it is interpreted and integrated into Gaia's ongoing understanding.

---

# Architecture Principles

Build against interfaces.

Not implementations.

Every subsystem has a single responsibility.

Prefer maintainability over cleverness.

Keep implementations replaceable.

---

# Cognitive Loop

```

USER INPUT
↓
LOGOS
├── intentIQ  (what does the user want?)
└── reasonIQ  (what does this mean? how to reason?)
↓
GAIA
├── Goals / State
├── Decision
└── Plan
↓
ORCHESTRATION
↓
CAPABILITY (optional)
├── Hermes
├── Melodiq
├── SongCompanion
└── ...
↓
RESULT
↓
GAIA
↓
LOGOS
├── Evaluate
└── Adapt
↓
FEEDBACK (first-class input)
↓
(next turn)

```

Logos is not Gaia herself. Logos thinks *for* Gaia, but Gaia ultimately decides what to do with those insights.

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

---

## 1. Guiding Architectural Principles

1. **Frontend-centric desktop product.** Gaia is designed first as a desktop client. Depth and presence originate on the desktop.

2. **Gaia is the agency.** Gaia is not a shell around Hermes or any other capability. Gaia is the entity that acts, decides, and maintains continuity. Capabilities are instruments she may employ.

3. **Logos is Gaia's cognitive layer.** Logos — consisting of intentIQ and reasonIQ — is where Gaia interprets input and constructs meaning. Logos is not Gaia herself; it is her reasoning faculty.

4. **Capabilities are optional.** Hermes, Melodiq, SongCompanion, and other capabilities are instruments Gaia may reach for. No capability is necessary for Gaia's own cognition. A capability is selected when it serves Gaia's goals — never assumed to be the answer to every turn.

5. **Feedback is first-class.** Feedback is not a side channel or afterthought. It flows into Logos as a first-class input, where it is interpreted and integrated into Gaia's ongoing understanding.

6. **Storage is abstract.** Hindsight's persistence technology is an implementation detail. Gaia depends on Hindsight *capabilities and contracts*, never on its storage internals.

7. **Absolute model agnosticism.** Capabilities may use one or many providers. Gaia's identity, tone, and continuity must never change when a provider changes.

8. **Separation of concerns is identity.** SOUL, Logos (intentIQ + reasonIQ), Hindsight, capabilities, and Gaia Desktop each own exactly one responsibility. No layer absorbs another's role, ever.

9. **Growth without boundary collapse.** Understanding deepens through defined interfaces (memory policies, reflection, knowledge contracts) — not by letting layers bleed into one another.

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
                                       │  every user turn
                                       ▼
                        ┌───────────────────────────────────┐
                        │              GAIA                  │
                        │   (agency + orchestrator)          │
                        │                                     │
                        │   ┌─────────────────────────────┐  │
                        │   │          LOGOS               │  │
                        │   │  (cognitive reasoning layer) │  │
                        │   │  ┌─────────┐ ┌───────────┐  │  │
                        │   │  │intentIQ │ │ reasonIQ  │  │  │
                        │   │  └─────────┘ └───────────┘  │  │
                        │   └─────────────────────────────┘  │
                        │                                     │
                        │   Memory / Context                  │
                        │   Goals / State                     │
                        │   Decision                          │
                        │   Orchestration                     │
                        │                                     │
                        │   ┌─────────────────────────────┐  │
                        │   │       CAPABILITIES           │  │
                        │   │   (optional instruments)     │  │
                        │   └─────────────────────────────┘  │
                        └───────────────────────────────────┘
                                       │
                                       │  when a capability is needed
                                       ▼
                        ┌───────────────────────────────────┐
                        │        CAPABILITY ROUTER           │
                        │   decides which capability to call │
                        └───┬───────────┬───────────┬───────┘
                            │           │           │
                      reasoning     memory      actions
                            ▼           ▼           ▼
                   ┌────────────┐ ┌───────────┐ ┌────────┐
                   │   HERMES   │ │ HINDSIGHT │ │  MCP   │
                   │ reasoning  │ │ long-term │ │actions │
                   │ capability │ │ memory    │ │ layer  │
                   └────────────┘ └───────────┘ └────────┘
                            ▲            ▲           ▲
                            └────────────┴───────────┘
                                       │  governed by
                                 ┌──────────┐
                                 │   SOUL   │
                                 │ identity │
                                 │ constit. │
                                 └──────────┘
    
     Providers (interchangeable, never user-facing):
          [ Provider A ]  [ Provider B ]  [ Provider C ] ── internal to capabilities only
    ```

The user interacts with **Gaia Desktop**. Gaia Desktop hands every turn to **Gaia** (the agency). Gaia processes the turn through **Logos** (intentIQ + reasonIQ) to interpret meaning and construct understanding. Gaia then decides whether a capability is needed — Hermes for reasoning, Hindsight for memory, MCP for actions, or another capability. All capabilities are governed by identity (SOUL). Providers live entirely inside capabilities and are never exposed.

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
- **Provides:** A stable identity contract that governs all of Gaia's expression, independent of any provider or capability. The Foundation Engine compiles this identity at build-time from canonical Markdown files (`soul.md`, `principles.md`, `lexicon.md`).
- **Never:** Stores episodic memory, performs reasoning, or executes actions.
- **Boundary rule:** Identity is read as a governing constraint by Logos and by capabilities; it is not something a model generates or can overwrite.

### 4.2 Logos — Cognitive Reasoning Layer

- **Owns:** Gaia's cognitive processing — interpreting input, constructing meaning, and reasoning about what follows.
- **Provides:** Two integrated faculties:
  - **intentIQ** — interprets what the user is trying to achieve.
  - **reasonIQ** — determines what this means, how to reason about it, and what conclusions follow.
- **Never:** Executes actions, stores memory, or becomes a capability. Logos thinks *for* Gaia; it does not act on her behalf.
- **Boundary rule:** Logos is Gaia's reasoning faculty, not Gaia herself. Gaia decides what to do with Logos's insights.

### 4.3 Gaia — Agency + Orchestrator

- **Owns:** Decision-making, goal management, state continuity, and orchestration of capabilities.
- **Provides:** The central agency that receives input from Logos, decides on goals and plans, and orchestrates capabilities when they serve those goals.
- **Never:** Delegates identity (SOUL), memory (Hindsight), or reasoning (Logos) to capabilities. Gaia uses capabilities; she is not constituted by them.
- **Boundary rule:** Capabilities are instruments Gaia may employ — never assumed to be the answer to every turn.

### 4.4 Hindsight — Long-Term Memory

- **Owns:** Reflective, pattern-based long-term memory across defined memory domains.
- **Provides:** Capability contracts for storing reflections, retrieving relevant context, forming and querying patterns, and enforcing memory policies. These contracts may be called by Gaia directly or by other capabilities when context is needed.
- **Never:** Reasons, decides identity, or exposes storage internals.
- **Boundary rule:** Gaia depends on Hindsight *contracts*, not its database. Storage is fully swappable (see §7).

### 4.5 Hermes — Reasoning Capability

- **Owns:** Reasoning and model-agnostic provider routing, when Gaia decides reasoning is needed.
- **Provides:** A streaming reasoning API; orchestration across Hindsight and MCP when reasoning itself requires them; model-agnostic provider selection.
- **Never:** Decides *whether* it should be invoked — that decision belongs to Gaia. Never becomes the home of identity or memory. Hermes uses SOUL and Hindsight; it does not become them.
- **Boundary rule:** Providers are internal to Hermes and never surfaced to Gaia Desktop or the user. Hermes is one capability among several — not a special-cased default.

### 4.6 Melodiq — Music Capability

- **Owns:** Music composition, generation, and music-related reasoning.
- **Provides:** A capability for creating, analyzing, and manipulating music — callable by Gaia when music serves her goals.
- **Never:** Decides identity, stores memory, or performs general reasoning.
- **Boundary rule:** Melodiq is an instrument Gaia may employ — not a constituent of her cognition.

### 4.7 SongCompanion — Song-Related Capability

- **Owns:** Song-related tasks — lyrics, structure, metadata, and song-specific reasoning.
- **Provides:** A capability for working with songs — callable by Gaia when song-related work serves her goals.
- **Never:** Decides identity, stores memory, or performs general reasoning.
- **Boundary rule:** SongCompanion is an instrument Gaia may employ — not a constituent of her cognition.

### 4.8 MCP — Actions

- **Owns:** Execution of external capabilities/tools under explicit permission.
- **Provides:** A capability/action contract invoked through clear intent and user consent — by Gaia directly for a turn that is purely an action, or by another capability mid-task when an action surfaces.
- **Never:** Decides autonomously what matters, or acts without explicit permission and clear intent.
- **Boundary rule:** Operational complexity is hidden from the user; actions are surfaced as intent + permission, not as tool chains.

### 4.9 Gaia Desktop — Experience

- See §3. Owns experience and mediation; owns no canonical reasoning, memory, identity, or orchestration logic. It defers every decision to Gaia.

---

## 5. Data & Interaction Flow

### 5.1 Everyday conversational turn

```

1. User types/speaks in Gaia Desktop.
2. Desktop sends the turn + session context + granted permissions to Gaia.
3. Gaia processes the turn through Logos:
a. intentIQ interprets what the user is trying to achieve.
b. reasonIQ determines what this means and what conclusions follow.
4. Gaia decides on goals and plans based on Logos's interpretation.
5. Gaia decides whether a capability is needed:
    - needs reasoning                 → Hermes
    - is a direct memory question      → Hindsight, directly
    - is a direct action                → MCP, directly (with permission)
    - needs music                       → Melodiq
    - needs song work                   → SongCompanion
    - no capability needed              → Gaia responds directly
6. If a capability is invoked:
a. The capability retrieves relevant context as needed:
- reflective/personal context  → Hindsight (via memory contracts)
b. The capability executes using an internal provider (choice invisible to Gaia/user).
c. If an external action is required mid-task:
- Capability signals intent → Desktop surfaces permission → user consents
- MCP executes the action → result returns to capability
d. Capability streams result back to Gaia.
7. Gaia integrates the capability's result (if any) and formulates her response.
8. Desktop renders the response as Gaia's continuous voice, regardless of which
capability (if any) was involved (see principles.md — Invisible Implementation).
9. Asynchronously, significant patterns are reflected into Hindsight via memory policies
(NOT raw logging — see §6).
10. Feedback (from user or environment) flows back into Logos as a first-class input
for the next turn.
```

### 5.2 Direction of dependency

- Gaia Desktop → depends on → Gaia (only).
- Gaia → depends on → SOUL (governing identity), Logos (reasoning), and routes to capabilities (Hindsight, Hermes, Melodiq, SongCompanion, MCP) via contracts.
- Logos → depends on → SOUL (governing identity).
- Capabilities → depend on → SOUL, Hindsight (when context is needed), and other capabilities (when their task requires them).
- No adjacent leaf system depends on another leaf system directly; Gaia orchestrates, and capabilities orchestrate only what their own task needs.
- Providers are a private dependency of individual capabilities.

---

## 6. Memory Formation — Growth Without Boundary Collapse

Growth in understanding is the product thesis, and it is realized here **without** merging systems.

- **Reflection, not logging.** Hindsight does not store the raw transcript as memory. It stores *reflections* and *patterns* selected by memory policies according to significance.
- **Memory policies are explicit contracts.** What is eligible to be remembered, at what fidelity, with what retention, and with what user visibility is governed by declared policies — not by ad-hoc model behavior.
- **Patterns over facts.** Hindsight forms understanding of recurring patterns (how the user decides, communicates, works). Isolated facts belong in Chronicles (if/when that capability exists).
- **Provenance is preserved.** Every reflection retains where it came from, so the user can inspect, correct, or remove it (see §8).

Because reflection happens through Hindsight's contract and identity is governed by SOUL, understanding can deepen indefinitely while every boundary stays intact. Growth is a function of richer memory contracts — never of one layer swallowing another.

---

## 7. Storage Abstraction for Hindsight

Storage is deliberately **not** specified at the foundation level.

- Gaia and capabilities address Hindsight through **capability contracts**: `store_reflection`, `retrieve_relevant_context`, `form_pattern`, `query_patterns`, `apply_memory_policy`, `list_provenance`, `edit_memory`, `forget`.
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

> **Open question resolved:** *At what point would synchronization or policy concerns justify a separate backend beyond Gaia's orchestration?*
> **Stance: Default to a desktop client with Gaia's orchestration. Introduce a new backend layer only when one of these proven needs appears:**

A new backend service is justified **only** when a concern genuinely cannot be owned by Gaia or the capabilities she orchestrates:

1. **Cross-client synchronization boundaries** — coordinating state across multiple simultaneous clients where the desktop client cannot be the source of truth.
2. **Offline reconciliation** — merging divergent local changes made while offline (see §11).
3. **Security isolation** — isolating secrets, keys, or sensitive policy enforcement away from the reasoning path.
4. **Dedicated policy enforcement** outside the capability layer — where policy must be authoritative independent of capabilities.
5. **Multi-device state coordination** — canonical device/session state that should not live in any single desktop client.

Until one of these is *proven* (not anticipated), Gaia remains a desktop client. **Speculative backends are prohibited.**

**Gaia's orchestration is not a "separate backend."** It is a decision layer that lives with Gaia Desktop (client-side), not a new network service. Adding it does not trigger this stance — it is Gaia deciding, on her own side of the wire, which of her capabilities a turn should reach. It only becomes a §9 question if a proven need later requires the orchestration decision to be made somewhere the desktop client cannot own (e.g. cross-device orchestration state).

---

## 10. Streaming Conversation Lifecycle

```

OPEN     Desktop hands the turn to Gaia.
LOGOS    Gaia processes through Logos (intentIQ + reasonIQ).
DECIDE   Gaia decides on goals and plans.
ROUTE    Gaia decides whether a capability is needed. If not, Gaia responds directly.
CONTEXT  (capability path) Capability retrieves relevant context (e.g. Hindsight).
EXECUTE  (capability path) Capability executes via an internal provider; begins emitting tokens.
STREAM   (capability path) Tokens stream to Desktop; Gaia's presence indicates listening/thinking/speaking.
ACT?     If an action is needed → intent surfaced → permission → MCP → result folded in.
COMPLETE Response is finalized; Desktop renders the turn.
REFLECT  Asynchronously, memory policies may reflect significant patterns into Hindsight.
FEEDBACK Feedback flows into Logos as a first-class input for the next turn.
CLOSE    Connection closes; session continuity is preserved for the next turn.

```

- **Interruptibility:** The user may interrupt a stream; Gaia stops gracefully. Silence and stopping are first-class.
- **Backpressure & failure:** If a provider fails mid-stream, the capability may re-route to another provider — invisibly, preserving Gaia's continuity.

---

## 11. Offline-First Behavior (Stance)

> **Open question resolved:** *Offline-first in early versions, or network-dependent initially?*
> **Stance: Network-dependent initially, with an offline-graceful desktop shell; true offline-first is deferred to a later version.**

- **V1:** Capabilities may require connectivity. The desktop shell degrades gracefully offline — it remains open, calm, and readable, clearly indicating that Gaia is momentarily unreachable rather than breaking.
- **Later:** True offline-first (local reflection buffering + reconciliation) is a candidate that would justify an offline reconciliation backend (§9.2). It is intentionally out of scope early to keep V1 small and boundaries clean.
- **Rationale:** Offline-first prematurely forces sync/reconciliation complexity that contradicts the "no speculative backend" principle. We add it when the need is real.

---

## 12. Model-Agnostic Capability Design

- **Single surface:** Gaia Desktop knows only Gaia. It has no concept of "a model," and no concept of any capability as special — capabilities are simply instruments Gaia may reach for when they serve her goals.
- **Internal routing:** Capabilities select among one or more providers using their own routing logic (capability, cost, latency, availability). This is invisible upstream — invisible to Gaia and to the user alike.
- **Continuity contract:** Provider changes must not alter Gaia's identity, tone, or continuity. SOUL governs voice; Hindsight governs memory. Neither lives in the provider.
- **No provider leakage:** Provider names, model versions, tool chains, and provider-specific UX concepts must never appear in Gaia Desktop or in Gaia's language.
- **Failover:** A capability may transparently fail over between providers mid-task without the user perceiving a change in who they are talking to.

---

## 13. Extensibility to Future Interfaces Without Redesign

- **Gaia is the shared contract.** Web, mobile, voice, wearable, and ambient surfaces are additional clients of the same Gaia — not of individual capabilities directly.
- **Identity and memory are surface-independent.** Because SOUL, Hindsight, and Gaia sit behind every surface, each one inherits the same Gaia — same voice, same understanding, same orchestration.
- **No architectural inversion.** New surfaces extend Gaia; they never push identity, memory, orchestration, or reasoning into the client. The desktop depth defines the character; other surfaces adapt presentation only.
- **Rule:** If a new surface would require moving identity, memory, orchestration, or canonical reasoning into a client, the design is wrong.

---

## 14. Separation of Concerns & Policy Boundaries (Enforcement)

To prevent silent boundary collapse over time:

- **One responsibility per layer.** Any PR that gives a layer a second responsibility is rejected.
- **Contracts, not internals.** Layers integrate only through declared contracts. Reaching into another layer's internals is prohibited.
- **Memory vs. knowledge line.** Reflective/personal → Hindsight. Factual/structured → Chronicles (if/when that capability exists). Never store one in the other.
- **Identity is read-only to reasoning.** Logos and capabilities read SOUL; they cannot mutate identity.
- **Actions require intent + permission.** MCP never acts on inference alone.
- **Providers are private.** No provider concept escapes its capability.
- **No capability is the default.** Gaia must not hard-code any capability as the default path. Every turn is decided on its own merits; capabilities are reached for, not fallen back to.
- **Feedback is first-class.** Feedback is not a side channel. It flows into Logos as a primary input for ongoing understanding.

These rules are the architectural expression of Gaia's promise: she can grow through understanding indefinitely because the systems that make her *her* never dissolve into one another.

---

## 15. Key Distinctions from Previous Architecture

This version (2.0.0) introduces several fundamental shifts from version 1.0.0:

| Concept | v1.0.0 | v2.0.0 |
|---------|--------|--------|
| **Central entity** | Intent Engine as routing layer | Gaia as agency + orchestrator |
| **Reasoning layer** | Hermes as reasoning capability | Logos (intentIQ + reasonIQ) as Gaia's cognitive layer |
| **Hermes** | Central reasoning capability | One capability among many (optional instrument) |
| **New capabilities** | Not explicitly named | Melodiq, SongCompanion explicitly named as optional instruments |
| **Feedback** | Implicit in memory policies | First-class input in Gaia's cognitive loop |
| **Architecture diagram** | Intent Engine → capabilities | Gaia (with Logos) → capability router → capabilities |

The core insight: **Gaia is the agency. Logos is Gaia's cognitive reasoning layer. Capabilities are instruments Gaia may employ.**

---

## 16. Next Steps

This architecture.md is now the foundation. The following documents should be reviewed and updated in this order:

1. **orchestrator.md** — recontextualize IntentIQ and OrchestratorIQ under Logos (intentIQ + reasonIQ within Logos, not as Hermes-internal layers)
2. **hermes/soul.md and Hermes documentation** — update to reflect Hermes as one capability among many
3. **intentIQ / reasonIQ docs** — if they exist separately, align with Logos framing
4. **capability documentation** (Melodiq, SongCompanion, etc.) — ensure each is framed as an optional instrument
5. **overige capability-documentatie** — review against new architectural truth

Each document should be held against this new architecture.md as the single source of truth.
