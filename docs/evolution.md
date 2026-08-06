---
title: Gaia — Evolution
document: evolution
version: 1.0.0
status: active
last_updated: 2026-08-05
owner: Gaia Product Foundation
framing: "Gaia is a lifelong personal intelligence designed to grow through understanding."
---

# Gaia — Evolution

> **Gaia is a lifelong personal intelligence designed to grow through understanding.**
>
> Evolution is the story of how Gaia grows. Not a changelog — a record of intent, the trade-offs considered, and the path forward.

---

## Milestone 0 — The Foundation

**Goal.** Establish the durable boundaries that protect Gaia's identity for a lifetime.

**What was built.**

- `/docs` foundation: vision, architecture, personality, design language, UI principles, coding standards, roadmap, lexicon.
- The six-layer architecture: SOUL, Hindsight, Hermes, Chronicles, MCP, Gaia Desktop.
- A first Gaia Desktop skeleton: conversation-first shell, presence engine, composer, welcome moment.
- A Hermes **dev-stub** as a stand-in: a FastAPI service that streamed token deltas, persisted conversations in MongoDB, hosted minimal Hindsight, served uploads, and produced artifacts. It existed so the desktop had something to talk to while the real Hermes matured.

**Architectural reasoning.**

- Provider agnosticism was a hard rule from day one. The desktop must never know which model is answering.
- The dev-stub was deliberately a *stand-in*, not a *target*. Removing it later was always part of the plan.
- SOUL lived in the dev-stub. That was acceptable for a placeholder, but not for a lifelong product — identity belongs to Gaia, not to whoever happens to be running the inference.

**Lessons learned.**

- The desktop's vocabulary was right (presence, conversation, page), but the connection to reasoning was over-engineered. The dev-stub carried a lot — conversation CRUD, Hindsight, uploads, artifacts, tools — that should not have been the desktop's surface.
- "Hermes" was used to mean three different things at once: a local API, a backend service, and a brand. That ambiguity cost clarity.

**Future direction.**

- Connect to a real Hermes. Drop the dev-stub. Introduce a provider abstraction so the next provider switch is invisible.

---

## Milestone 2 — Gaia Speaks *(Phase 3)*

**Goal.** Gaia genuinely speaks for the first time. A typed message produces a real, streamed response from a local Hermes API. The mock dev-stub is gone. SOUL is canonical. Presence reflects the actual shape of the conversation.

**What was implemented.**

- **`ReasoningProvider`** — a thin abstract contract (`health`, `stream`, `chat`). Plain reasoning in, plain text out. No Gaia-flavored events, no presence state, no SOUL — those are desktop concerns, not provider concerns.
- **`HermesProvider`** — a concrete provider that talks to a local OpenAI-compatible `/v1/chat/completions` endpoint with SSE streaming and a `/v1/models` health check. URL, model, and API key are environment-driven.
- **Typed reasoning errors** (`ReasoningUnavailableError`, `ReasoningAbortedError`) translated into Gaia's own language at the presence layer. No HTTP status codes, no provider names, no stack traces ever reach the user.
- **Canonical Foundation Engine** at `foundation/`. The desktop invokes a Node.js build step before start/build to load Gaia's constitution (`soul.md`, `principles.md`, `lexicon.md`) into a single generated `artifact.json`. `foundation/index.ts` in the frontend imports this artifact directly. Identity lives in the repository (`docs/`), not in code, and not in the model.
- **Presence engine** with four states following Gaia's Lexicon: *quiet* (present, waiting), *listening* (paying attention to what the user is composing), *thinking* (composing a response), *speaking* (streaming tokens). The orb breathes; it never flashes.
- **Presence flow** wired end-to-end: a draft in the composer shifts the dock orb to *listening*; sending shifts it to *thinking*; the first delta shifts it to *speaking*; stream completion returns it to *quiet*. Aborts and unreachable errors are handled calmly.
- **`useConversation`** — owns conversations, streaming, and provider health probing. On mount, the provider's `health()` is called and the result is exposed as a calm status. If Hermes is unreachable, a quiet line — a *whisper*, not a banner — appears above the composer. If Hermes is ready, nothing is shown.
- **Desktop UI** simplified to the conversation: composer, presence, welcome, and a threads list. The Memory drawer and the Artifact canvas were removed — Hindsight and artifact tooling are explicit later-milestone concerns.
- The dev-stub backend, its MongoDB persistence, its tool implementations, and its Hindsight/artifact endpoints — all removed. No mock responses remain.
- Jest tests for `ReasoningProvider` and `HermesProvider`: health (ok, unreachable), streaming (delta assembly, `[DONE]`, malformed frames), error mapping, and abort.

**Why this architecture was chosen.**

The milestone asked for a `ReasoningProvider → HermesProvider → Hermes API` chain. The temptation was to put the abstraction at the boundary between the desktop and "the outside world", with a fat `HermesProvider` that already understood presence, personas, and error phrasing. We resisted that. The provider speaks only reasoning — messages in, text out, errors as typed exceptions. Gaia-flavored behavior is layered on at the desktop. This is the only way the next provider swap stays invisible.

Equally, we resisted adding a backend. A backend is the *easy* place to put conversation CRUD, persistence, and retries — and the milestone says no new backends are introduced without a proven need. Today the only proven need is "stream from Hermes." The desktop now owns that need directly. When persistence, memory, or knowledge bring a real proven need, the architecture will earn a backend then.

The canonical SOUL document is the same discipline applied to identity. The temptation was to keep the system prompt as a string in `identity/soul.js` — close to the code, easy to edit. We resisted that too. SOUL is a *constitution*, not a prompt; it is meant to evolve deliberately, to be reviewed like law, and to outlive every reasoning provider. A markdown file in the repository, loaded at build time, makes that review possible. The code does not own Gaia's voice; the repository does.

**Trade-offs considered.**

- *In-memory conversations.* A backend would have given us persistence for free. We chose not to add a backend; the trade is that closing the desktop loses threads. This is the right trade for this milestone: it keeps boundaries clean and trusts the user to be present with Gaia in the moment.
- *No tool calls, no artifacts, no uploads, no Hindsight.* The dev-stub offered all of these. Removing them was a deliberate narrowing. Each belongs to a later milestone, paired with its own trust guardrail.
- *OpenAI-compatibility assumption.* We assume Hermes is OpenAI-shaped. If it is not, only `HermesProvider` needs to change — the rest of Gaia does not.
- *No retry/edit on the desktop.* These features were tied to backend persistence. They are out of scope for "Gaia Speaks" and will return with memory.
- *Build-time SOUL loading.* The canonical document is imported at build time. Editing SOUL requires a rebuild. This is the right trade: identity should change deliberately, not at runtime. A future desktop build can revisit this with hot-reload, but for the web app today, build-time is the most Gaia-aligned choice.
- *Health whisper vs. status badge.* We could have shown a persistent "connected / disconnected" indicator. We chose instead to surface health only when it is wrong — a quiet line, not a status panel. Gaia does not advertise her connectivity; she either speaks or she explains why she cannot.

**Lessons learned.**

- The provider must not know Gaia. When the provider started speaking in presence states, Gaia was already being re-absorbed into a generic chat client.
- A typed error is a *promise*. By committing to `ReasoningUnavailableError` and `ReasoningAbortedError` (and nothing else), the desktop can phrase calm messages with full confidence the user will never see a 500.
- "Streaming naturally" is a small implementation effort and a large experience win. Once the desktop transitions to *speaking* on the first delta, Gaia stops feeling like a tool and starts feeling like a presence.
- *Quiet* and *listening* are not the same state. The default is *quiet* — present, waiting, not demanding attention. The moment the user begins to type, the orb shifts to *listening* — Gaia is paying attention. The difference is small in the code and large in the relationship.
- Loading SOUL from a canonical document changed how identity changes feel. A string in a `.js` file is a code change. A markdown document in `docs/` is a *constitutional* change. The friction of editing a `.md` file is itself a feature.

**Future integration points.**

- Hindsight (long-term memory) returns in a later milestone. When it does, it will reach reasoning through its own contract, not by coupling to the provider.
- Chronicles (structured knowledge) has the same shape: its own contract, its own time, its own trust gate.
- MCP (actions) sits behind intent + permission; the reasoning provider will receive an MCP-capable variant only when the action surface is real.
- A second reasoning provider (local model A, local model B, remote model) becomes a config change — the desktop never learns which one answered.

**Next milestone.**

The next milestone introduces the first reflective layer: Hindsight. Gaia will begin to remember what matters — not everything, not in a log, but as patterns the user can see, edit, and let go of. The trust guardrail is provenance-on-demand and full user control from day one.

---

## Milestone 3 — Gaia Arrives *(Phase 3.5)*

**Goal.** Give Gaia a permanent home on the desktop. The browser version continues to work unchanged; the desktop version wraps the same frontend in a native window. Nothing about Gaia's identity, reasoning, or presence changes — only where she lives.

**What was built.**

- **Tauri shell** at `src-tauri/`. Rust-backed, webview-fronted. The shell is intentionally thin: it opens a window, restores its last size and position, and loads the existing React frontend. It knows nothing about SOUL, Hermes, presence, or any of Gaia's layers.
- **Root `package.json`** with `dev:web` and `dev:desktop` scripts. The browser workflow (`yarn dev:web` → `cd frontend && yarn start`) is unchanged. The desktop workflow (`yarn dev:desktop` → `tauri dev`) is additive, not a replacement.
- **Window state persistence** via `tauri-plugin-window-state`. Gaia remembers her window size, position, and maximized state across launches — without a single line of frontend code.
- **Window constraints** chosen for Gaia's multi-panel interface: minimum 820×560 (sidebar 264px + comfortable conversation area), native title bar, resizable, maximizable, centered on first launch.
- **Capability surface** at `src-tauri/capabilities/default.json` limited to `core:default` and `window-state:default`. The shell can manage its own window; it cannot reach the filesystem, the network, or the OS beyond what the webview already does. The frontend's fetch to the local reason engine continues to work through the webview's normal network stack.
- **Icons** generated for the shell. A calm gold orb on Gaia's near-black, matching the in-app presence aesthetic. The icons are placeholders in the right shape — the visual identity can deepen later without touching the shell.
- **`.gitignore`** updated for Tauri build artifacts (`src-tauri/target/`, generated schemas).

**Why Tauri.**

Three options were on the table: Electron, Tauri, and a hand-rolled webview wrapper. We chose Tauri for three reasons.

1. *Footprint.* Tauri uses the system's webview (WebView2 on Windows, WebKit on macOS, WebKitGTK on Linux) instead of bundling Chromium. Gaia's installer stays small, starts fast, and respects the user's machine. Electron would have added ~150MB of duplicated browser to every install.
2. *Boundary discipline.* Tauri's Rust backend and capabilities model make it natural to keep the shell thin. The default capability set is deliberately restrictive; opening it up to filesystem, tray, or global shortcuts is a deliberate, reviewable decision — not a default that quietly grew.
3. *Memory and reasoning live in the frontend.* The architecture already placed identity in SOUL, memory in Hindsight, and reasoning in Hermes — all behind the React app. Tauri does not compete with any of those layers. The shell is a window, nothing more.

**Architectural decisions.**

- *The frontend is unaware it is in Tauri.* No `tauri-apps/api` imports, no `window.__TAURI__` checks, no desktop-specific branches in React. The same `build/` directory that the browser would serve is what Tauri bundles. If Tauri were removed tomorrow, the browser version would be unchanged.
- *The shell is unaware of Gaia.* `src-tauri/src/lib.rs` does not mention identity, memory, reasoning, or presence. It registers the window-state plugin and launches. Any future native capability (tray, notifications, global shortcuts) enters through new Rust commands behind new capabilities — never by reaching into the frontend's concerns.
- *Dev workflow is additive.* `yarn dev:web` still works exactly as before. `yarn dev:desktop` is a new target. The two do not share state; the user picks one at a time.
- *Environment variables are unchanged.* `REACT_APP_REASON_ENGINE_URL`, `REACT_APP_REASON_ENGINE_MODEL`, and `REACT_APP_REASON_ENGINE_API_KEY` work identically in browser and desktop. The webview's origin in dev is `http://localhost:3000` (same as the browser), so the reason engine's CORS config that already allows the browser also allows the Tauri dev window.

**Trade-offs considered.**

- *CORS in production.* In a built Tauri app, the webview's origin is `tauri://localhost` (or a custom protocol), not `http://localhost:3000`. The reason engine's CORS config will need to allow this origin for production. In dev, the origin is the dev server URL, so the existing config suffices. This is a deployment consideration, not a code change.
- *No auto-updater yet.* Tauri supports one. Adding it later is a capability decision, not an architectural one.
- *No code signing.* The first desktop builds will trigger OS warnings (Windows SmartScreen, macOS Gatekeeper). This is acceptable for a personal-use first release; code signing is a deliberate later step.
- *Single window.* Gaia is one window today. Multi-window (e.g., a detached canvas) is a future capability, not a current need.

**Lessons learned.**

- *A desktop shell is a boundary, not a feature.* The temptation in a desktop milestone is to add native capabilities. We resisted. The success criterion was "Gaia launches as a native desktop application" — not "Gaia has a tray icon." Boundaries are load-bearing; the shell's job is to hold the window, nothing more.
- *The frontend should not know its host.* The moment React imports a Tauri API, Gaia becomes coupled to a shell. Keeping the frontend shell-agnostic means the browser version stays a first-class target, and future shells (a different webview, a kiosk mode, a CLI) are additive, not invasive.
- *Window state is a UX detail that compounds.* Remembering size and position is a small implementation — one plugin — and a large felt difference. Gaia feels like a permanent presence when she remembers where she was.

**Future native capabilities (prepared, not implemented).**

The capability system and Rust shell are ready to host:

- **System tray** — quiet presence when the window is closed.
- **Notifications** — for reflections, never for chatter.
- **Global shortcuts** — a way to summon Gaia from anywhere.
- **Local filesystem access** — for future Chronicles and Hindsight persistence, behind explicit intent and permission.
- **Multi-window** — for a detached canvas or a memory view.

Each will arrive as a new capability grant and a new Rust command, never as a frontend concern.

**Next milestone.**

The next milestone introduces the first reflective layer: Hindsight. Gaia will begin to remember what matters — not everything, not in a log, but as patterns the user can see, edit, and let go of. The trust guardrail is provenance-on-demand and full user control from day one.

**Prerequisites for desktop development.**

- [Rust](https://rustup.rs/) (stable toolchain).
- [Tauri CLI](https://tauri.app/start/prerequisites/) — install with `cargo install tauri-cli` or use the npm version included as a dev dependency at the repo root.
- Run `yarn install` at the repo root, then `yarn dev:desktop` to launch the desktop window.

## Milestone 4 — Complete Core Chat Experience

**Goal.** Elevate Gaia's conversational interface to a production-ready, highly interactive personal chat environment. Build complete media attachment flows, advanced markdown formatting (including tables, LaTeX equations, and Mermaid diagrams), and full control over the conversational flow (message editing, deletion, response regeneration, and retrying).

**What was built.**
- **LaTeX Math support**: Integrated `remark-math` and `rehype-katex` with global KaTeX styles. In-line and display equations render natively in responses.
- **Mermaid Diagrams**: Created a modular `<MermaidBlock>` component rendering block code with language `mermaid` into interactive SVG diagrams styled in Gaia's dark theme.
- **Rich Input Attachments**: Added multi-file picker, image/file previews, and delete-before-sending capabilities inside `<Composer>`.
- **Drag & Drop and Paste Integration**: Added HTML5 drop zone and clipboard paste listeners. Files dragged over the composer or images pasted (Ctrl+V) instantly attach with previews. Fully compatible with native Tauri and desktop environments.
- **Message Operations**: Implemented editing for user messages, deletion for any message in a thread, response regeneration, and retrying of failed streaming responses.
- **Auto-scroll with Manual Lock**: Added scroll position checking. Auto-scroll stays active when the user is at the bottom, but locks immediately if the user scrolls up to read past messages, avoiding jarring jump-backs.
- **Failing State Resilience**: Handled failed streams cleanly, providing visual indicator of unreachability, saving error states on the message level, and offering a robust "Retry" action.

**Architectural reasoning.**
- Attachments are stored as light-weight client-side structures containing local `blob:` URLs. Text translation for the Hermes API remains text-only, separating the user history aesthetic from the reasoning provider's format.
- Keeping LaTeX and Mermaid parsing purely frontend-centric follows our framework-agnostic goal.
- State-altering operations (edit, regenerate, retry) truncate the conversation thread synchronously in memory, ensuring that subsequent assistant tokens are generated contextually and without old-state pollution.

**Lessons learned.**
- Preventing unwanted auto-scroll when a user reads history during streaming is key to a calm UX. A simple scroll threshold (80px) is highly effective.
- Disabling strict SSL check in Yarn (`yarn config set strict-ssl false`) resolved local environment certification errors during package installations.

---

## How to Read This Document

Each milestone records:

- The **goal** — what we were trying to make possible.
- The **architecture** — the choices we made, and the ones we rejected.
- The **trade-offs** — what we gave up to keep Gaia calm and coherent.
- The **lessons** — what we want future-us (and future-contributors) to remember.
- The **next milestone** — what unlocks next, and what guardrail protects it.

If a future change contradicts something here, the change should be deliberate — and Evolution should be updated alongside it.
