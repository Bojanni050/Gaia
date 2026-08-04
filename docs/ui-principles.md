---
title: Gaia — UI Principles
document: ui-principles
version: 1.0.0
status: foundation
last_updated: 2026-06-01
owner: Gaia Product Foundation
framing: "Gaia is a lifelong personal intelligence designed to grow through understanding."
---

# Gaia — UI Principles

> **Gaia is a lifelong personal intelligence designed to grow through understanding.**
>
> These principles translate Gaia's design language into concrete UX rules. They exist to keep the experience **conversation-first, calm, trustworthy, and non-intrusive** — and to make Gaia's growing understanding feel **helpful and legible**, never like surveillance.

---

## 1. Conversation-First UX Principles

- **The conversation is the product.** It occupies the center of the screen and the center of attention. It is present immediately on open — no setup, no dashboard, no gate.
- **Everything else is secondary and summoned.** Memory, knowledge, actions, and settings are available on demand and recede when done. Nothing permanently competes with the conversation.
- **Resume, don't restart.** Opening Gaia feels like continuing a relationship, not beginning a new session. Continuity is visible in tone and context, not in a wall of history.
- **The input is always ready.** The place to think and speak to Gaia is obvious and immediate.
- **Reading is comfortable.** Generous line-height, humane measure, calm contrast. The conversation is a place to read and think, not to scan.

---

## 2. Focus & Calm Interaction Rules

- **One primary focus at a time.** Never present competing focal points. Secondary surfaces open deliberately and close cleanly.
- **Space is a feature.** Default to generous negative space (roughly 2–3× "normal"). Density is a deliberate exception, never the norm.
- **Stable geometry.** The layout does not rearrange itself beneath the user. Predictability is calm.
- **No visual noise.** No counters, badges, streaks, or metrics. Nothing blinks for attention.
- **Calm defaults everywhere.** When a design choice is ambiguous, choose the quieter option.

---

## 3. Notification Philosophy

- **Notification is the exception, not the mechanism.** Gaia does not use notifications to drive engagement. Ever.
- **No manufactured urgency.** No red dots, no unread counts, no "you haven't opened me" nudges.
- **Tiered and justified.** Ambient presence < gentle suggestion < genuine interruption. Higher tiers require stronger, user-serving justification.
- **Always dismissible, always tunable.** Any proactive signal can be waved off instantly and dialed down permanently.
- **Respect flow state.** Non-urgent signals wait for a natural pause; Gaia does not break deep work.

---

## 4. Silence & Restraint Principles

- **Silence is a valid, often preferable response.** Not responding, not suggesting, not notifying are first-class behaviors.
- **Say less by default.** Brevity respects attention. Length is earned by the moment.
- **Do the minimum that helps.** Avoid extra confirmations, redundant summaries, and unrequested elaboration.
- **Absence over clutter.** An empty, quiet screen is preferable to a helpful-looking but noisy one.
- **Gaia never fills silence to seem busy.** Stillness communicates confidence.

---

## 5. Transparency Without Implementation Leakage

- **Legible, not exposed.** The user can always understand *what* Gaia is doing and *why* — never the internal *how*.
- **Never surface architecture.** No provider names, model versions, tool chains, orchestration steps, or system internals appear in normal use.
- **Intent, not mechanics.** When Gaia acts, she shows intent ("I can update your calendar — want me to?") and asks permission — she never shows the tool-chain plumbing.
- **Context on request.** If the user asks what Gaia is drawing on, she can show relevant context and provenance — plainly, without leaking storage or provider details.
- **Honesty about limits.** When Gaia can't do something or is offline, she says so calmly and clearly.

---

## 6. Motion as Meaning

- **Motion means state, never decoration.** It communicates readiness, listening, transition, and confidence — nothing else.
- **Presence breathes.** Listening/thinking/speaking/resting are conveyed through soft, living motion — a sign of presence, not a loading spinner.
- **Slow, soft, specific.** Gentle easing, calm durations; animate opacity/transform deliberately, never everything at once.
- **Transitions preserve continuity.** Surfaces settle and fade rather than pop; the space feels continuous across states.
- **Stillness is a valid state.** When nothing is happening, nothing moves. Idle calm is the resting state.

---

## 7. Cognitive Load Management

- **The interface lowers load; it never adds to it.** Every element must reduce what the user has to hold in their head, or it does not belong.
- **Progressive disclosure.** Depth (memory, knowledge, actions, provenance) is available but hidden until wanted.
- **Sensible, learned defaults over configuration.** Gaia deepens through understanding, not through settings the user must tune.
- **One decision at a time.** Never present a wall of choices; guide gently toward the next meaningful step.
- **No maintenance burden.** The user should never feel they must "manage" Gaia to keep her useful.

---

## 8. Intentionality & Trust-Building Interaction Rules

- **Every element earns its place.** If it isn't clearly useful, it is removed. Restraint reads as care.
- **Reversibility builds trust.** Actions are legible and, wherever possible, undoable. The user never fears the interface.
- **Permission is explicit and calm.** Actions with external effect require clear, unhurried consent — never dark patterns, never pre-checked defaults.
- **Consistency is a promise.** Stable layout, stable voice, stable behavior. Surprises erode trust; consistency compounds it.
- **The user is always in control.** Of memory, of proactivity, of actions. Control is discoverable and honored immediately.

---

## 9. UX for Making Growth in Understanding Helpful, Legible & Non-Intrusive

Growth must be **felt as helpfulness**, **legible on request**, and **never experienced as surveillance**.

- **Show understanding through relevance, not announcements.** Gaia surfaces the right past detail at the right moment. She does not say "I remember that you…"; she simply demonstrates understanding in how she helps.
- **A calm, opt-in memory view.** The user can, at any time, open a quiet view of what Gaia has come to understand — inspect it, see its provenance, edit it, and forget it. This view is discoverable, never omnipresent, and never part of the everyday conversational clutter.
- **Provenance on demand.** For anything Gaia recalls, the user can ask "why do you think that?" and receive a plain, honest answer — without exposing storage or providers.
- **Legible, not loud.** Understanding is presented as understanding, never as a log, a score, a level, or a progress bar. No gamification of the relationship.
- **Forgetting is real and immediate.** When the user asks Gaia to forget something, it is honored fully and visibly. This is central to trust.
- **Maturing behavior signals growth.** As Gaia becomes more personalized and (later) more proactive, the *change in her behavior* communicates deepening understanding — calmly, and always within the "never noisy" ceiling.
- **Never make the user feel watched.** If any understanding-related surface would create the sensation of surveillance, it is redesigned toward on-demand legibility and invisibility-by-default.

**The test for every understanding-related UI decision:** does it make the user feel *understood and in control* — or *watched and managed*? Only the former ships.
