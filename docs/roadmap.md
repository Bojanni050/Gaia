---
title: Gaia — Roadmap
document: roadmap
version: 1.0.0
status: foundation
last_updated: 2026-06-01
owner: Gaia Product Foundation
framing: "Gaia is a lifelong personal intelligence designed to grow through understanding."
---

# Gaia — Roadmap

> **Gaia is a lifelong personal intelligence designed to grow through understanding.**
>
> The roadmap prioritizes **depth of understanding and trust** over feature count. V1 is intentionally small. Every milestone increases Gaia's understanding without overreaching the user's trust.

---

## 0. Roadmap Philosophy

- **Small, then deep.** Start with the smallest thing that is genuinely useful and calm. Expand depth before breadth.
- **Trust is the pacing function.** New proactivity or memory capabilities ship only after trust supports them.
- **Boundaries never regress.** No milestone collapses the separation between SOUL, Logos, Hindsight, Gaia's capabilities (Hermes among them), and Desktop.
- **No speculative infrastructure beyond Gaia Cloud.** Gaia Cloud itself (Gaia, Logos, Hindsight, capabilities) is the proven baseline from V1 — not something to earn. Additional infrastructure beyond that single runtime appears only when a proven need arises (architecture §9).
- **Metrics we ignore:** engagement minutes, message volume, feature count. **Metrics we watch:** relevance of recall, welcomeness of proactivity, felt continuity, user-described trust.

---

## 1. Version Overview

| Version | Theme | Relationship Phase | Essence |
|---------|-------|--------------------|---------|
| **V1** | Present & Continuous | Early (careful, observant) | A calm desktop conversation with Gaia that remembers what matters |
| **V2** | Understanding & Reflection | Middle (personalized) | Gaia forms patterns and personalizes language and recall |
| **V3** | Proactive & Multi-Surface | Mature (proactive, trusted) | Welcome initiative + Gaia extends beyond desktop |
| **Long-term** | Lifelong Intelligence | Lifelong | Understanding compounds across years and surfaces |

---

## 2. Version 1 — Present & Continuous *(intentionally small)*

**Goal:** A single user can have a calm, continuous conversation with Gaia on the desktop, and Gaia carries meaningful context forward across sessions. Nothing more.

**Relationship phase:** Early — careful, observant, conservative in assumptions.

### Must Have
- Gaia Desktop shell: conversation-first, calm, spacious, stable.
- Streaming conversation with Hermes (model-agnostic; no provider ever surfaced).
- Persistent Gaia identity governed by SOUL — consistent voice across sessions.
- Basic Hindsight integration via memory contracts: reflection-based continuity across sessions (not raw logging).
- Session continuity: reopening Gaia feels like resuming, not restarting.
- Graceful offline behavior of the shell (Gaia runs in Gaia Cloud, so every client is network-dependent to reach her; see architecture §11).

### Should Have
- Calm, opt-in memory view: see what Gaia has come to understand (read-only in V1 acceptable).
- Presence states (listening / thinking / speaking / resting) as quiet motion.
- Interruptible streaming.

### Could Have
- Minimal Chronicles read integration for a few durable facts.
- Light personalization of greeting/tone.
- **Capability router skeleton** (architecture §2, §9): the seam inside Gaia's own orchestration that will let her decide which capability a turn needs, introduced now with Hermes as its only routed capability. This is the skeleton, not new capabilities — it exists so V2/V3 can add Melodiq, SongCompanion, direct-Hindsight, and MCP routing without re-architecting how Gaia dispatches a turn.

### Explicitly NOT in V1
- Proactive initiative of any kind.
- Actions/MCP.
- Multi-surface (web/mobile/voice).
- Offline-first / sync.
- Memory editing/forgetting UI (view-only is enough for V1).
- Non-Hermes capability routing targets (the skeleton may exist; only Hermes is actually wired to it).

---

## 3. Version 2 — Understanding & Reflection

**Goal:** Gaia moves from remembering to *understanding* — forming patterns and personalizing how she communicates and recalls.

**Relationship phase:** Middle — more personalized in language, framing, and recall.

### Must Have
- Pattern formation in Hindsight via memory policies (how the user decides, communicates, works).
- Personalized language: framing, timing, and depth adapt to the user over time — never vocabulary or manner of speaking (personality §10).
- Full memory provenance + control: inspect, edit, and forget (architecture §8).
- Clear separation surfaced: personal memory (Hindsight) vs. structured knowledge (Chronicles).

### Should Have
- Chronicles read/write for structured knowledge the user maintains.
- Relevance-driven recall: the right past detail at the right moment, quietly.
- Tunable memory policies (what Gaia is eligible to reflect on).

### Could Have
- Gentle, dismissible suggestions at natural pauses (first taste of initiative, tightly bounded).
- Early MCP actions behind explicit permission + clear intent, for a small set of trusted capabilities.

### Explicitly NOT in V2
- Autonomous or unprompted proactivity beyond gentle suggestions.
- Multi-device sync.

---

## 4. Version 3 — Proactive & Multi-Surface

**Goal:** Gaia offers welcome initiative and extends beyond the desktop without redefining her identity.

**Relationship phase:** Mature — proactive with timing, reminders, perspective, and creative support, without becoming noisy or overconfident.

### Must Have
- Tiered, earned proactivity (personality §2): reminders, timing, perspective — always dismissible, always tunable.
- MCP action layer generalized: external capabilities under explicit permission, operational complexity hidden.
- Second client (web or mobile) as an additional representation of the same Gaia Cloud — same Gaia, same memory, same voice, no per-client re-implementation.

### Should Have
- Attention/interruption management matured (tiered signals, flow-state respect).
- Creative support workflows (thinking, drafting, deciding) built on accumulated understanding.

### Could Have
- Voice surface.
- Introduce infrastructure **beyond the baseline Gaia Cloud runtime** only if a proven need appears (offline reconciliation, security isolation, policy enforcement, independent capability scaling — architecture §9).

### Explicitly NOT in V3
- Ambient/wearable surfaces (long-term).
- Any proactivity that creates noise or pressure.

---

## 5. Long-Term Vision

**Goal:** Gaia is a lifelong personal intelligence whose usefulness compounds because her understanding has compounded.

**Relationship phase:** Lifelong.

- Understanding that spans years: how the user's thinking has evolved, which past decisions aged well, what patterns precede good/bad outcomes.
- Ambient and wearable surfaces that extend presence without demanding attention.
- True offline-first with reconciliation, if and when the need is proven (would justify an offline reconciliation backend).
- Optional, privacy-preserving multi-user support — always with each relationship kept deeply personal and separate.
- Continuity across provider generations: Gaia remains recognizably herself across a decade of model change.

---

## 6. MoSCoW Summary (Across Versions)

**Must Have (V1–V3 core):**
- Calm desktop conversation · SOUL-governed identity · streaming via Hermes · reflection-based memory · pattern formation · provenance & control · tiered earned proactivity · MCP actions under permission · second surface.

**Should Have:**
- Memory view & controls · relevance-driven recall · Chronicles read/write · matured attention management · creative workflows.

**Could Have:**
- Early gentle suggestions · voice surface · infrastructure beyond baseline Gaia Cloud (only if proven) · light personalization.

**Future:**
- Ambient/wearable surfaces · true offline-first + reconciliation · optional multi-user · multi-decade continuity.

---

## 7. Product Maturity Path — From Useful Assistant to Trusted Companion

```
V1  Present        → Gaia is useful and continuous. Trust: "she remembers what matters."
V2  Understanding  → Gaia understands patterns. Trust: "she gets how I think."
V3  Proactive      → Gaia helps unprompted, welcomely. Trust: "her initiative is helpful, never noisy."
LT  Lifelong       → Gaia compounds. Trust: "she's understood me for years, and never made me feel watched."
```

Each step is gated by the previous step's trust being genuinely established.

---

## 8. Milestones for Depth of Understanding Without Overreaching Trust

Each milestone pairs a **capability** with a **trust guardrail**. Capability ships only when the guardrail holds.

| Milestone | Capability | Trust Guardrail |
|-----------|-----------|-----------------|
| M1 | Cross-session continuity | Recall is relevant, never exhaustive; nothing feels logged |
| M2 | Pattern formation | User can inspect and correct patterns; provenance always available |
| M3 | Personalized language | Adaptation is subtle and reversible; core voice stays stable |
| M4 | Memory editing/forgetting | Forgetting is honored fully and immediately |
| M5 | Gentle suggestions | Suggestions are dismissible and tunable; opt-out is instant |
| M6 | MCP actions | Every action requires explicit permission + clear intent |
| M7 | Proactive initiative | Initiative respects flow state; ceiling is "never noisy" |
| M8 | Second surface | Identity/memory stay in Gaia Cloud, behind the Gaia API; no architectural inversion |
| M9 | Multi-year understanding | User remains fully in control of the accumulated model of them |

**Rule for every milestone:** if delivering the capability would make the user feel watched, managed, or crowded, the milestone is not ready — regardless of technical readiness.
