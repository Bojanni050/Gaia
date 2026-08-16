# Gaia
A lifelong personal intelligence.

Gaia is a conversation-first personal intelligence built around identity, understanding and continuity rather than a single AI model.

> **This repository is the dev version of Gaia Cloud.** It currently also contains her frontend (`frontend/`, deployed as `gaia-web`). That frontend will later be moved out into a separate `gaia-desktop` client, once Gaia Cloud has its own proper service boundary (see `docs/evolution.md` for the current, explicitly-flagged interim state — e.g. Logos's `intentIQ`/`reasonIQ` still executing client-side).

## Core Principles

- Identity is permanent.
- Understanding is earned.
- Conversation is home.
- Technology should disappear behind experience.

## Architecture

```
Gaia Desktop
    ↓                           ↓
ReasoningProvider          MemoryProvider      (the abstractions)
    ↓                           ↓
HermesProvider              HindsightProvider  (concrete)
    ↓                           ↓
Local Hermes API            Gaia's Hindsight bank (Gaia Cloud)
```

The desktop depends only on contracts — `ReasoningProvider` and `MemoryProvider` — never on a concrete provider. Today those contracts are fulfilled by `HermesProvider` (a local OpenAI-compatible Hermes) and `HindsightProvider` (Gaia's own bank on a real Hindsight instance, plus `services/cognition` for patterns and hypotheses — a Hindsight-adjacent sidecar for the epistemic content Hindsight itself has no place for). Tomorrow's provider is a config change, not a Gaia change.

SOUL (identity), Chronicles (knowledge), and MCP (actions) are explicit future seams. They are not in this milestone.

## Status

Genesis 🌱 → Speaking 💬 → Remembering 🌿

The foundation is complete.
Gaia speaks — through a real, local reasoning engine, with a streaming conversation, presence transitions, and quiet error phrases.
Gaia has her own connection to Hindsight — a dedicated memory bank, not shared with any other assistant — and can now hold patterns and hypotheses (confidence, evidence, a `proposed → testing → confirmed/rejected` lifecycle) via `services/cognition`. The desktop now reflects and recalls through it: every turn is informed by relevant memory (best-effort — a slow or unreachable Hindsight never blocks or breaks the conversation) and, once a response completes, the exchange is reflected into Hindsight asynchronously.

Next: hypothesis/pattern reasoning itself (Logos's side of §6.2) — nothing forms or tests a hypothesis automatically yet. Also still missing: the opt-in memory view (architecture §8).
