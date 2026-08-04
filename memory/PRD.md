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

## Update — 2026-06-01 (Iteration 2: Gaia Desktop app + refinements)
- Built Gaia Desktop (React) as a Hermes dev-stub client: streaming conversation, markdown, code blocks, image display, file uploads (object storage), retry, edit-and-resend, real tool cards (calculate, get_current_time), thinking/presence indicator, and artifacts in a dynamic companion canvas.
- Backend server.py = Hermes dev-stub: SSE streaming via emergentintegrations LlmChat -> gpt-5.6-terra (reasoning_effort=none for tool support), model-agnostic to the frontend. Object storage wired for uploads. Conversations/messages persisted in Mongo.
- System contracts added under src/contracts (hermes live; hindsight/chronicles/mcp typed boundaries).
- Testing agent iteration_1: backend 12/12 pass, frontend 100%, no bugs, model-agnosticism confirmed.
- Refinements: evolving personal greeting (first-arrival vs returning, time-aware, name=Bo); meditative Presence Engine (4 states, slow sinusoidal breathing, dual halo); renamed "New conversation" -> "New page" (book-like), default thread title -> "Untitled".

## Deferred / Backlog
- Memory View (Hindsight provenance/edit/forget UI) — not yet, per user.
- Gaia's own language for more UI terms (evolve over time).
- Interactive artifact editing (collaborative canvas) — future.

## Update — 2026-06-01 (Iteration 3: Lexicon, Arrival, Living Canvas, Quiet Memory)
- Gaia's Lexicon: centralized language (src/gaia/lib/lexicon.js) — "Begin a page", "What I understand", "Reconsider/Revise/Keep a copy", "Untitled page".
- Arrival Moment: shell fade-in on load + staggered welcome (presence -> greeting -> sub) so opening feels like arriving.
- Living Canvas: artifacts editable in the companion canvas; edits persist via PATCH /api/hermes/conversations/{cid}/messages/{mid}/artifact (replace_nth_artifact).
- Quiet Memory (real minimal Hindsight): POST /api/hindsight/reflect extracts durable understandings (domains: preferences/patterns/context/relationships) with provenance + dedup; GET list; DELETE forget. Opt-in MemoryDrawer ("What I understand"), grouped by domain, "Let go" to forget; auto-refreshes when open.
- Testing agent iteration_2: backend 18/18 pass, frontend 100%, model-agnosticism confirmed. No bugs.

## Deferred / Backlog (updated)
- Realtime collaborative artifact editing (currently edit + save/persist; live co-editing is future).
- Split server.py into modules (storage/tools/hermes/hindsight/artifacts) once it grows further.
- Index reflections.summary; surface reflect model-failure vs nothing-durable.
- Continue evolving Gaia's own language for more surfaces.
