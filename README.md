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
    ↓
ReasoningProvider      (the abstraction)
    ↓
HermesProvider         (concrete; OpenAI-compatible)
    ↓
Local Hermes API
```

The desktop depends only on a `ReasoningProvider` contract. Today that contract is fulfilled by `HermesProvider`, talking to a local OpenAI-compatible Hermes. Tomorrow's provider is a config change, not a Gaia change.

SOUL (identity), Hindsight (memory), Chronicles (knowledge), and MCP (actions) are explicit future seams. They are not in this milestone.

## Status

Genesis 🌱 → Speaking 💬

The foundation is complete.
Gaia speaks — through a real, local reasoning engine, with a streaming conversation, presence transitions, and quiet error phrases.

Next: memory that earns trust.
