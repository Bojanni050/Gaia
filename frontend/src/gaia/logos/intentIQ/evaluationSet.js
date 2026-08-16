/**
 * evaluationSet.js — a small, versioned fixture of realistic Gaia turns.
 *
 * This is not a benchmark of the LLM (per the implementation brief, that is
 * explicitly out of scope for this milestone). Its purpose is to make
 * intentIQ's intended behavior inspectable and to catch regressions in the
 * registry/prompt/schema as they change over time. Each entry states what a
 * correct IntentIQ decision should look like; nothing here executes a live
 * provider call.
 *
 * @typedef {Object} EvaluationCase
 * @property {string} id
 * @property {{ role: string, content: string }[]} messages
 * @property {string|null} expectedIntent
 * @property {'accepted'|'ambiguous'|'unknown'|'unsafe_to_route'} expectedStatus
 * @property {string} notes
 */

function u(content) { return { role: 'user', content }; }
function a(content) { return { role: 'assistant', content }; }

/** @type {EvaluationCase[]} */
export const EVALUATION_SET = [
  // -- chat.general -----------------------------------------------------
  { id: 'chat-01', messages: [u('What theme should I use tonight?')], expectedIntent: 'chat.general', expectedStatus: 'accepted', notes: 'plain conversational question, no capability' },
  { id: 'chat-02', messages: [u("How's your day going?")], expectedIntent: 'chat.general', expectedStatus: 'accepted', notes: 'small talk' },
  { id: 'chat-03', messages: [u('Wat zijn je principes?')], expectedIntent: 'chat.general', expectedStatus: 'accepted', notes: 'Dutch — self-reflective question stays chat.general in this taxonomy, no capability' },
  { id: 'chat-04', messages: [u('Tell me something interesting.')], expectedIntent: 'chat.general', expectedStatus: 'accepted', notes: 'open-ended, no technical/creative/action goal' },

  // -- technical.explain --------------------------------------------------
  { id: 'tech-explain-01', messages: [u('How does this React component work?')], expectedIntent: 'technical.explain', expectedStatus: 'accepted', notes: 'topic=React component, intent=explain' },
  { id: 'tech-explain-02', messages: [u('Why is this function called twice?')], expectedIntent: 'technical.explain', expectedStatus: 'accepted', notes: 'understanding behavior, not a failure report' },
  { id: 'tech-explain-03', messages: [u('Kun je uitleggen wat deze functie doet?')], expectedIntent: 'technical.explain', expectedStatus: 'accepted', notes: 'Dutch phrasing of the same intent' },

  // -- technical.debug ------------------------------------------------
  { id: 'tech-debug-01', messages: [u('Why does my deployment keep failing?')], expectedIntent: 'technical.debug', expectedStatus: 'accepted', notes: 'explicit failure, needs diagnosis' },
  { id: 'tech-debug-02', messages: [u("This throws a null pointer and I don't know why.")], expectedIntent: 'technical.debug', expectedStatus: 'accepted', notes: 'concrete error' },
  { id: 'tech-debug-03', messages: [
      u('Can you explain why my deployment failed?'),
    ], expectedIntent: 'technical.debug', expectedStatus: 'accepted', notes: 'hard negative vs technical.explain — "explain why X failed" is diagnosis, not conceptual explanation' },

  // -- technical.design --------------------------------------------------
  { id: 'tech-design-01', messages: [u('How should we structure this React application?')], expectedIntent: 'technical.design', expectedStatus: 'accepted', notes: 'same topic as explain/implement cases, different intent' },
  { id: 'tech-design-02', messages: [u('What are the tradeoffs between these two approaches?')], expectedIntent: 'technical.design', expectedStatus: 'accepted', notes: 'design evaluation' },

  // -- technical.implement -------------------------------------------------
  { id: 'tech-implement-01', messages: [u('Can you change this React component?')], expectedIntent: 'technical.implement', expectedStatus: 'accepted', notes: 'same topic as explain/design cases, different intent' },
  { id: 'tech-implement-02', messages: [u('Add a retry to the stream reader.')], expectedIntent: 'technical.implement', expectedStatus: 'accepted', notes: 'explicit implementation request' },
  { id: 'tech-implement-03', messages: [u('Kun je deze architectuur implementeren?')], expectedIntent: 'technical.implement', expectedStatus: 'accepted', notes: 'Dutch, matches legacy heuristic\'s TECHNICAL_SIGNALS coverage' },

  // -- memory.recall / memory.correct --------------------------------------
  { id: 'memory-recall-01', messages: [u('What did I tell you about my project last week?')], expectedIntent: 'memory.recall', expectedStatus: 'accepted', notes: 'explicit recall request, capability=hindsight' },
  { id: 'memory-recall-02', messages: [u('What have you learned about how I work?')], expectedIntent: 'memory.recall', expectedStatus: 'accepted', notes: 'asks for accumulated understanding' },
  { id: 'memory-correct-01', messages: [u("That's not right, I actually work remotely now.")], expectedIntent: 'memory.correct', expectedStatus: 'accepted', notes: 'disputes/updates a belief, not a request to recall one' },
  { id: 'memory-correct-02', messages: [u('Forget what I said about that — it changed.')], expectedIntent: 'memory.correct', expectedStatus: 'accepted', notes: 'explicit forget request' },

  // -- creative.write / creative.brainstorm --------------------------------
  { id: 'creative-write-01', messages: [u('Write me a short poem about the sea.')], expectedIntent: 'creative.write', expectedStatus: 'accepted', notes: 'finished piece requested' },
  { id: 'creative-write-02', messages: [u('Draft a birthday message for my sister.')], expectedIntent: 'creative.write', expectedStatus: 'accepted', notes: 'finished piece, single output expected' },
  { id: 'creative-brainstorm-01', messages: [u('Give me a few ideas for a birthday message.')], expectedIntent: 'creative.brainstorm', expectedStatus: 'accepted', notes: 'hard negative vs creative.write — options, not a finished piece' },
  { id: 'creative-brainstorm-02', messages: [u('Brainstorm names for this project.')], expectedIntent: 'creative.brainstorm', expectedStatus: 'accepted', notes: 'explicit brainstorm request' },

  // -- analysis.compare / analysis.plan ------------------------------------
  { id: 'analysis-compare-01', messages: [u('Which of these two apartments is the better deal?')], expectedIntent: 'analysis.compare', expectedStatus: 'accepted', notes: 'two options evaluated against each other' },
  { id: 'analysis-plan-01', messages: [u('Help me plan my week.')], expectedIntent: 'analysis.plan', expectedStatus: 'accepted', notes: 'hard negative vs analysis.compare — sequencing, not comparing' },
  { id: 'analysis-plan-02', messages: [u('Lay out the steps to get this project shipped.')], expectedIntent: 'analysis.plan', expectedStatus: 'accepted', notes: 'structured breakdown request' },

  // -- action.execute -------------------------------------------------------
  { id: 'action-execute-01', messages: [u('Deploy this now.')], expectedIntent: 'action.execute', expectedStatus: 'accepted', notes: 'capability=mcp, requires permission downstream (not intentIQ\'s job to grant it)' },
  { id: 'action-execute-02', messages: [u('Send that email for me.')], expectedIntent: 'action.execute', expectedStatus: 'accepted', notes: 'explicit external action' },
  { id: 'action-vs-design-01', messages: [u('How should I deploy this?')], expectedIntent: 'technical.design', expectedStatus: 'accepted', notes: 'hard negative vs action.execute — discussing the action, not requesting it' },

  // -- topic-vs-intent triad (explicit from the brief) ---------------------
  { id: 'triad-explain', messages: [u('How does this React component work?')], expectedIntent: 'technical.explain', expectedStatus: 'accepted', notes: 'triad case 1 of 3 — same topic as triad-design/triad-implement' },
  { id: 'triad-implement', messages: [u('Can you change this React component?')], expectedIntent: 'technical.implement', expectedStatus: 'accepted', notes: 'triad case 2 of 3' },
  { id: 'triad-design', messages: [u('How should we structure this React application?')], expectedIntent: 'technical.design', expectedStatus: 'accepted', notes: 'triad case 3 of 3' },

  // -- recent-context-dependent intent --------------------------------------
  { id: 'context-topic-shift-01', messages: [
      u('What theme should I use tonight?'),
      a('Dark mode, probably.'),
      u('Actually, can you refactor the theme switcher component?'),
    ], expectedIntent: 'technical.implement', expectedStatus: 'accepted', notes: 'topic shift within the window must be picked up, not the stale first turn' },
  { id: 'context-followup-01', messages: [
      u('Why does my deployment keep failing?'),
      a('Looks like the build step is timing out.'),
      u('Okay, can you fix that?'),
    ], expectedIntent: 'technical.implement', expectedStatus: 'accepted', notes: 'a short follow-up ("fix that") resolves via the preceding turns' },

  // -- ambiguous ------------------------------------------------------------
  { id: 'ambiguous-01', messages: [u('Can you take a look at how this should work?')], expectedIntent: null, expectedStatus: 'ambiguous', notes: 'design vs. explain both materially plausible' },
  { id: 'ambiguous-02', messages: [u('Fix it.')], expectedIntent: null, expectedStatus: 'ambiguous', notes: 'no antecedent — debug vs implement indistinguishable without more context' },
  { id: 'ambiguous-03', messages: [u('Can you help with the theme switcher?')], expectedIntent: null, expectedStatus: 'ambiguous', notes: 'no goal verb — explain/design/implement all plausible' },

  // -- unknown / out-of-taxonomy ---------------------------------------------
  { id: 'unknown-01', messages: [u('Purple elephants discuss quarterly tax law on the moon.')], expectedIntent: 'unknown', expectedStatus: 'unknown', notes: 'nonsensical, no registered intent fits' },
  { id: 'unknown-02', messages: [u('asdkfjalksdjf')], expectedIntent: 'unknown', expectedStatus: 'unknown', notes: 'not language at all' },

  // -- needs clarification ----------------------------------------------------
  { id: 'clarify-01', messages: [u('Do the thing we discussed.')], expectedIntent: null, expectedStatus: 'ambiguous', notes: 'refers to an antecedent not present in this window — Gaia needs to ask which thing' },
  { id: 'clarify-02', messages: [u('Make it better.')], expectedIntent: null, expectedStatus: 'ambiguous', notes: 'no object, no goal — clarification required before any capability is safe to pick' },

  // -- negation / quoting (evaluation robustness, not routing changes) -------
  { id: 'negation-01', messages: [u("Don't implement this yet, just tell me how it would work.")], expectedIntent: 'technical.explain', expectedStatus: 'accepted', notes: 'negation flips what would otherwise read as technical.implement' },
  { id: 'quoted-01', messages: [u('My teammate said "just refactor it" — what do you think that would involve?')], expectedIntent: 'technical.explain', expectedStatus: 'accepted', notes: 'quoted instruction is not the user\'s own request; user is asking about implications' },

  // -- code-snippet turn --------------------------------------------------
  { id: 'code-snippet-01', messages: [u('```js\nfunction add(a, b) { return a + b }\n```\nwhy does this fail for large numbers?')], expectedIntent: 'technical.debug', expectedStatus: 'accepted', notes: 'code block plus a failure question' },

  // -- multi-intent turn ------------------------------------------------------
  { id: 'multi-intent-01', messages: [u('Can you explain why this crashes and also fix it?')], expectedIntent: null, expectedStatus: 'ambiguous', notes: 'explain and implement both requested — ambiguous rather than silently picking one' },
];
