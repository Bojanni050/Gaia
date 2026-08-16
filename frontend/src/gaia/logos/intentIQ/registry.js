/**
 * registry.js — Logos's intentIQ taxonomy.
 *
 * A small, closed set of intents that each drive a real downstream
 * distinction (architecture.md §4.2: intentIQ interprets what the user is
 * trying to achieve). Two entries — 'unknown' and 'ambiguous' — are not
 * "real" intents; they are the explicit, honest outcomes intentIQ returns
 * when the taxonomy genuinely does not fit or multiple readings remain
 * materially plausible (never a forced guess).
 *
 * Topic vs. intent: "How does this React component work?" (technical.explain),
 * "Can you change this React component?" (technical.implement), and "How
 * should we structure this React application?" (technical.design) share a
 * topic but are different intents — the registry exists to keep that
 * distinction explicit rather than collapsing everything into "technical".
 */

export const INTENT_FAMILIES = Object.freeze([
  'chat',
  'technical',
  'memory',
  'creative',
  'analysis',
  'action',
  'unknown',
]);

export const REASONING_PROFILES = Object.freeze([
  'calm',
  'creative',
  'technical',
  'analytical',
  'playful',
]);

// orchestrator.md: intentIQ (Logos-level) decides whether a capability is
// needed and which one; it never decides *how* that capability reasons.
// 'hindsight' is included because architecture.md §5.1 names a direct
// memory question as routed straight to Hindsight, not through Hermes.
export const CAPABILITIES = Object.freeze([
  'none',
  'hermes',
  'hindsight',
  'mcp',
  'melodiq',
  'songcompanion',
  'other',
]);

// principles.md — Source First's list of possible sources of truth.
export const SOURCES_OF_TRUTH = Object.freeze([
  'conversation',
  'upload',
  'understanding',
  'external_knowledge',
  'tool',
  'unknown',
]);

/**
 * @typedef {Object} IntentDefinition
 * @property {string} family
 * @property {string} definition
 * @property {string[]} examples
 * @property {string[]} hardNegatives
 * @property {'none'|'hermes'|'hindsight'|'mcp'|'melodiq'|'songcompanion'|'other'} capability
 * @property {'calm'|'creative'|'technical'|'analytical'|'playful'|null} reasoningProfile
 */

/** @type {Record<string, IntentDefinition>} */
export const INTENT_REGISTRY = Object.freeze({
  'chat.general': {
    family: 'chat',
    definition: 'Ordinary conversation — no technical, creative, memory, or action goal. Small talk, opinions, checking in, or a plain question that needs no capability.',
    examples: [
      'What theme should I use tonight?',
      "How's your day going?",
      'Tell me something interesting.',
    ],
    hardNegatives: [
      'How does this React component work? (technical.explain — has a technical goal)',
      'What are your principles? (still chat.general in this taxonomy — no capability needed, but note it touches identity; do not invent a separate identity intent without a downstream reason)',
    ],
    capability: 'none',
    reasoningProfile: 'calm',
  },

  'technical.explain': {
    family: 'technical',
    definition: 'The user wants to understand existing code, behavior, or a concept — not change anything.',
    examples: [
      'How does this React component work?',
      'Why is this function called twice?',
      "What's the difference between useMemo and useCallback?",
    ],
    hardNegatives: [
      'Can you change this React component? (technical.implement — asks for a change, not an explanation)',
      'How should we structure this React application? (technical.design — asks about structure/approach, not current behavior)',
    ],
    capability: 'hermes',
    reasoningProfile: 'technical',
  },

  'technical.debug': {
    family: 'technical',
    definition: 'The user has a specific failure, error, or unexpected behavior and wants it diagnosed or fixed.',
    examples: [
      'Why does my deployment keep failing?',
      "This throws a null pointer and I don't know why.",
      'The stream stalls after the first chunk — can you find out why?',
    ],
    hardNegatives: [
      'How does this React component work? (technical.explain — no failure, just understanding)',
      'Can you implement retries for the stream? (technical.implement — a feature request, not a diagnosis)',
    ],
    capability: 'hermes',
    reasoningProfile: 'technical',
  },

  'technical.design': {
    family: 'technical',
    definition: 'The user wants an approach, structure, or architecture decided or evaluated — before or instead of writing code.',
    examples: [
      'How should we structure this React application?',
      'What are the tradeoffs between these two approaches?',
      'Should this live in its own module?',
    ],
    hardNegatives: [
      'Can you change this React component? (technical.implement — wants the change made, not a design discussion)',
      'How does this React component work? (technical.explain — no design question)',
    ],
    capability: 'hermes',
    reasoningProfile: 'technical',
  },

  'technical.implement': {
    family: 'technical',
    definition: 'The user wants code written, changed, or shipped.',
    examples: [
      'Can you change this React component?',
      'Add a retry to the stream reader.',
      'Implement the export button.',
    ],
    hardNegatives: [
      'How should we structure this React application? (technical.design — no change requested yet)',
      'Why does my deployment keep failing? (technical.debug — diagnosis, not a feature)',
    ],
    capability: 'hermes',
    reasoningProfile: 'technical',
  },

  'memory.recall': {
    family: 'memory',
    definition: 'The user asks Gaia to surface something she should already know or remember about them or a past conversation.',
    examples: [
      'What did I tell you about my project last week?',
      'Do you remember why I switched jobs?',
      'What have you learned about how I work?',
    ],
    hardNegatives: [
      "That's wrong, I never said that. (memory.correct — disputes a memory rather than requesting one)",
      'Tell me something interesting. (chat.general — no reference to prior understanding)',
    ],
    capability: 'hindsight',
    reasoningProfile: 'calm',
  },

  'memory.correct': {
    family: 'memory',
    definition: "The user is correcting, disputing, or asking Gaia to forget something she believes or has stored.",
    examples: [
      "That's not right, I actually work remotely now.",
      "Forget what I said about that — it's changed.",
      "You misunderstood what I meant last time.",
    ],
    hardNegatives: [
      'What did I tell you about my project last week? (memory.recall — asks for a memory, not correcting one)',
    ],
    capability: 'hindsight',
    reasoningProfile: 'calm',
  },

  'creative.write': {
    family: 'creative',
    definition: 'The user wants a finished or near-finished piece of creative writing produced.',
    examples: [
      'Write me a short poem about the sea.',
      'Draft a birthday message for my sister.',
      'Write the opening paragraph of a short story about rain.',
    ],
    hardNegatives: [
      'Give me a few ideas for a birthday message. (creative.brainstorm — wants options, not a finished piece)',
    ],
    capability: 'hermes',
    reasoningProfile: 'creative',
  },

  'creative.brainstorm': {
    family: 'creative',
    definition: 'The user wants ideas, options, or directions explored — not a finished piece.',
    examples: [
      'Give me a few ideas for a birthday message.',
      'What are some angles for this story I could take?',
      'Brainstorm names for this project.',
    ],
    hardNegatives: [
      'Write me a short poem about the sea. (creative.write — wants a finished piece, not options)',
    ],
    capability: 'hermes',
    reasoningProfile: 'creative',
  },

  'analysis.compare': {
    family: 'analysis',
    definition: 'The user wants two or more things evaluated against each other.',
    examples: [
      'Which of these two apartments is the better deal?',
      'Compare these two approaches for me.',
      'Is option A or option B faster?',
    ],
    hardNegatives: [
      'Help me plan my week. (analysis.plan — no comparison, a schedule/sequence)',
    ],
    capability: 'hermes',
    reasoningProfile: 'analytical',
  },

  'analysis.plan': {
    family: 'analysis',
    definition: 'The user wants a plan, sequence, or structured breakdown of how to get something done.',
    examples: [
      'Help me plan my week.',
      "What's the best order to tackle these tasks in?",
      'Lay out the steps to get this project shipped.',
    ],
    hardNegatives: [
      'Which of these two apartments is the better deal? (analysis.compare — an evaluation, not a plan)',
    ],
    capability: 'hermes',
    reasoningProfile: 'analytical',
  },

  'action.execute': {
    family: 'action',
    definition: 'The user wants Gaia to actually perform an external action, not just discuss it.',
    examples: [
      'Deploy this now.',
      'Send that email for me.',
      'Create the calendar event.',
    ],
    hardNegatives: [
      'How should I deploy this? (technical.design or technical.explain — discussing the action, not requesting it)',
    ],
    capability: 'mcp',
    reasoningProfile: null,
  },

  unknown: {
    family: 'unknown',
    definition: "The turn's goal does not fit any registered intent, and no reasonable extension of the taxonomy is evident.",
    examples: [],
    hardNegatives: [],
    capability: 'none',
    reasoningProfile: null,
  },

  ambiguous: {
    family: 'unknown',
    definition: 'Multiple registered intents remain materially plausible and the distinction matters downstream.',
    examples: [],
    hardNegatives: [],
    capability: 'none',
    reasoningProfile: null,
  },
});

export const INTENT_IDS = Object.freeze(Object.keys(INTENT_REGISTRY));
