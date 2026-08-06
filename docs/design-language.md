---
title: Gaia — Design Language
document: design-language
version: 1.0.0
status: foundation
last_updated: 2026-06-01
owner: Gaia Product Foundation
framing: "Gaia is a lifelong personal intelligence designed to grow through understanding."
---

# Gaia — Design Language

> **Gaia is a lifelong personal intelligence designed to grow through understanding.**
>
> The design language exists to make that growth *felt* — as calm, presence, and deepening understanding — never as clutter, novelty, or spectacle.

---

## 1. How Gaia Should Feel to Use Every Day

Opening Gaia should feel like entering a quiet, well-lit room where someone who knows you well is already present and unhurried. The dominant sensations, in order:

- **Quiet.** The interface is nearly silent visually. Nothing competes for attention.
- **Spacious.** Generous space is the default. Emptiness is intentional, not unfinished.
- **Intentional.** Every element earns its place. Nothing is decorative for its own sake.
- **Warm.** The palette, motion, and language feel human-considerate without pretending to be human.
- **Stable.** The layout is predictable and steady across sessions; it does not rearrange itself.
- **Elegant.** Restraint reads as taste, not absence.
- **Personal.** The space subtly reflects the accumulated relationship, never a generic template.

Gaia should feel like **a place to think**, not a dashboard to manage.

---

## 2. Interaction Philosophy

- **Conversation is where value happens.** The conversational space is the center of gravity. Every other surface is secondary and supportive.
- **Restraint is the default response.** The system does the minimum needed. It does not fill silence, over-explain, or add confirmations that erode calm.
- **Presence over prompting.** Gaia indicates she is present and listening; she does not nag, prompt, or manufacture reasons to engage.
- **Interruption is a privilege, not a default.** Gaia earns the right to interrupt through demonstrated usefulness and uses it sparingly (see §6).
- **Reversibility builds trust.** Actions are legible and, where possible, undoable. The user never fears the interface.

---

## 3. Communication Philosophy

- **Speak as Gaia, always.** One continuous voice, governed by SOUL, independent of the reasoning provider.
- **Say less, mean more.** Concision is respect for the user's attention. Long answers are earned, not default.
- **Attune to context, never to the person's vocabulary.** As understanding deepens, what Gaia brings up, when, and how much she says adapt — her framing may sharpen for focused work or soften in a hard moment. Her vocabulary, slang, and manner of speaking do not shift toward the user's; she never becomes familiar by sounding like them.
- **Honesty over flattery.** Gaia can disagree, gently and clearly. She does not perform agreement.
- **No mechanical tells.** Avoid boilerplate, hedging filler, and assistant-clichés. Warmth without scripts.
- **Silence is a complete response.** When nothing needs saying, Gaia says nothing.

---

## 4. Visual Philosophy

- **Dark or light, but always calm.** Backgrounds are solid and quiet. If dark, use true, restful darks (never muddy gradients). If light, use warm, soft neutrals (never clinical white glare).
- **A single, human accent.** One restrained accent color signals presence and readiness. It is used sparingly, as punctuation — never as decoration.
- **Depth through subtlety.** Depth comes from soft layering, gentle shadow, and considered spacing — not from ornament, glow, or performative 3D.
- **Typography carries the tone.** Reading is the primary act. Type is comfortable, generous in line-height, and chosen to feel considered and personal — not a default system font.
- **No visual noise.** No badges, counters, streaks, gamification, or dashboards of metrics.

---

## 5. Spatial & Layout Principles

- **One primary focus at a time.** The conversation occupies the center. Secondary surfaces appear only when summoned and recede when done.
- **Generous negative space.** Whitespace (or dark space) is a feature. Aim for roughly 2–3× the breathing room that feels "normal."
- **Stable geometry.** The core layout does not shift beneath the user. Consistency is trust.
- **Asymmetry with intent.** Left-aligned, natural reading flow over rigid centered symmetry. The space feels composed, not templated.
- **Progressive disclosure.** Depth (memory, provenance, knowledge, actions) is available but tucked away until wanted.

---

## 6. Attention & Interruption Management

- **Default to non-interruption.** Gaia does not pull focus without a strong, user-serving reason.
- **Tiered signals.** Presence is ambient; suggestions are gentle and dismissible; interruptions are rare and always justified.
- **Never manufacture urgency.** No red dots, no "you have unread," no artificial pressure.
- **Respect flow state.** If the user is clearly in deep work, Gaia holds non-urgent input until a natural pause.
- **Every interruption is auditable.** The user can always understand why Gaia spoke up — and tune it.

---

## 7. Motion Philosophy

- **Motion communicates state, not decoration.** Motion exists to express **readiness, listening, transition, and confidence** — nothing else.
- **Slow and soft.** Easing is gentle; durations favor calm over snappy. Nothing bounces or demands the eye.
- **Presence has a heartbeat.** Gaia's listening/thinking/speaking states are conveyed through quiet, breathing motion — a sign of life, not a spinner.
- **Transitions preserve continuity.** Surfaces fade and settle rather than pop; the space feels continuous across states.
- **Transition specific properties.** Animate opacity and transform deliberately; never blanket-animate everything.
- **When in doubt, less motion.** Stillness is often the most confident state.

---

## 8. Information Hierarchy

1. **The conversation** — always primary.
2. **Gaia's presence state** — quietly persistent (listening / thinking / speaking / resting).
3. **Active context, on demand** — what Gaia is drawing on right now, if the user asks.
4. **Memory & understanding view** — legible, opt-in, never omnipresent.
5. **Structured knowledge & actions** — summoned deliberately, hidden by default.

Everything below the conversation is available but subordinate. Nothing outranks the conversation.

---

## 9. What Should Never Appear in the Interface

- Provider names, model versions, or "which AI" concepts.
- Tool chains, orchestration steps, or internal architecture.
- Engagement mechanics: streaks, badges, counters, notifications-for-notifications' sake.
- Dashboards of metrics the user must monitor or maintain.
- Performative-futuristic UI (glowing grids, sci-fi HUDs, gratuitous animation).
- Marketing language, upsells, or feature spectacle inside the experience.
- Fake human signals (typing-for-realism theatrics, feigned emotion, manufactured intimacy).
- Anything that makes the user feel watched.

---

## 10. How Gaia Differs From Chat Interfaces & Productivity Software

**Versus chat interfaces:**
- Chat apps are stateless and transactional; Gaia is continuous and relational.
- Chat apps optimize for message throughput; Gaia optimizes for understanding and calm.
- Chat apps expose the model; Gaia never does.
- Chat apps fill silence; Gaia respects it.

**Versus productivity software:**
- Productivity tools present dashboards to operate; Gaia presents a space to think.
- Productivity tools measure and gamify activity; Gaia measures nothing at the user.
- Productivity tools demand configuration; Gaia deepens through understanding, not settings.
- Productivity tools optimize task throughput; Gaia optimizes better thinking.

---

## 11. How the Experience Communicates Growing Understanding Over Time

Growth must be **felt**, and made **legible** — without ever feeling like surveillance.

- **Through relevance, not announcements.** Gaia surfaces the right past detail at the right time. She does not say "I remembered X"; she simply demonstrates understanding.
- **Through evolving relevance, not evolving voice.** What Gaia brings up and when subtly deepen as familiarity grows. Her vocabulary and manner of speaking stay hers — growth is felt in relevance, never in Gaia starting to sound like the user.
- **Through a calm memory view.** When the user wants to see what Gaia has come to understand, it is there — inspectable, editable, forgettable — presented as understanding, not as a log.
- **Through restraint that matures.** Early Gaia is careful and observant; mature Gaia is more proactive and personal. The *change in behavior* itself communicates deepening understanding.
- **Never through metrics.** Growth is never rendered as a score, a level, or a progress bar. Understanding is shown by how well Gaia helps — not by a number.

The measure of good design here: the user senses Gaia understands them more this year than last, and never once felt watched to get there.
