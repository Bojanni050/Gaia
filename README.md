# Gaia
A lifelong personal intelligence.

Gaia is a conversation-first personal intelligence built around identity, understanding and continuity rather than a single AI model.

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

The desktop depends only on contracts — `ReasoningProvider` and `MemoryProvider` — never on a concrete provider. Today those contracts are fulfilled by `HermesProvider` (a local OpenAI-compatible Hermes) and `HindsightProvider` (Gaia's own bank on a real Hindsight instance). Tomorrow's provider is a config change, not a Gaia change.

SOUL (identity), Chronicles (knowledge), and MCP (actions) are explicit future seams. They are not in this milestone.

## Status

Genesis 🌱 → Speaking 💬 → Remembering 🌿

The foundation is complete.
Gaia speaks — through a real, local reasoning engine, with a streaming conversation, presence transitions, and quiet error phrases.
Gaia has her own connection to Hindsight — a dedicated memory bank, not shared with any other assistant — though nothing in the desktop UI reads from it yet.

Next: wire the desktop to actually reflect and recall through it.
