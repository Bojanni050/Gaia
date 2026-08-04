# Gaia — Product Foundation PRD

**Framing:** Gaia is a lifelong personal intelligence designed to grow through understanding.
**Last updated:** 2026-06-01

## Original Problem Statement
Create the foundational documentation set for Gaia — a desktop-first lifelong personal intelligence
built on a strict separation of layers: SOUL (identity), Hindsight (memory), Hermes (reasoning),
Chronicles (knowledge), MCP (actions), Gaia Desktop (experience). Deliver 7 foundation docs under `/docs`.

## Scope Decision (user choices)
- Scope: **Documentation only this pass** (app deferred).
- Open questions: **Take a clear stance + document recommended answers.**
- Tone: **Deep and comprehensive.**
- Format: **Markdown with front-matter metadata.**

## User Personas
- Primary anchor: **Bo** (first deeply personalized user).
- Near-term: thoughtful individuals wanting a private long-term AI companion.
- Long-term: people valuing continuity, calm, trustworthy intelligence over generic AI chat.

## Core Requirements (static)
- Persistent identity independent of reasoning provider (SOUL).
- Reflection/pattern-based long-term memory, not raw logging (Hindsight, storage-abstract).
- Desktop-native conversation-first experience (Gaia Desktop → Hermes streaming API).
- Clear memory vs. structured-knowledge distinction (Hindsight vs. Chronicles).
- Action layer under explicit permission (MCP), operational complexity hidden.
- Model agnosticism; no backend beyond Hermes unless a proven need arises.

## What's Been Implemented (2026-06-01)
- `/docs/vision.md` — what/why/who, philosophy, values, success criteria, anti-goals, differentiation.
- `/docs/architecture.md` — layer boundaries, flows, streaming lifecycle, storage abstraction, model agnosticism, backend-justification stance, offline stance, provenance stance.
- `/docs/design-language.md` — daily feel, visual/spatial/motion/communication philosophy, anti-patterns.
- `/docs/personality.md` — Gaia as presence; style, initiative, boundaries, trust, consistency, growth support.
- `/docs/roadmap.md` — V1(small)→V2→V3→Long-term, MoSCoW, maturity path, trust-gated milestones.
- `/docs/coding-standards.md` — structure, naming, contracts, state, testing, dependency governance, maintainability.
- `/docs/ui-principles.md` — conversation-first, calm, silence, notification philosophy, motion-as-meaning, legible growth.
- `/docs/README.md` — foundation index + resolved open-question summary.

## Resolved Open Questions (stances)
1. Offline-first → network-dependent initially, offline-graceful shell (arch §11).
2. Memory provenance → available on demand, invisible by default (arch §8, ui §9).
3. Proactivity → earned/tiered/reversible, ceiling "never noisy" (personality §2, roadmap §8).
4. Personality variability → stable core, subtle contextual expression (personality §10).
5. Separate backend → only on proven need Hermes can't own (arch §9).

## Backlog / Next Tasks
- P1: Gaia Desktop starter shell (conversation-first React skeleton).
- P1: `/contracts` typed interface stubs for Hermes/Hindsight/Chronicles/MCP.
- P2: Presence-state motion prototype (listening/thinking/speaking/resting).
- P2: Calm opt-in memory/provenance view mock.

## Notes
- This pass is documentation only. No code, services, or integrations were built. Nothing mocked.
