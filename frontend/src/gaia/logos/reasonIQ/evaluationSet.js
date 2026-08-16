/**
 * evaluationSet.js — a small, versioned fixture of realistic Gaia
 * interactions for reasonIQ.
 *
 * Same purpose and same caveat as intentIQ's evaluationSet.js: this is not
 * a live-LLM benchmark. It makes reasonIQ's intended behavior inspectable
 * and prevents regressions in the contract/prompt over time. Each case
 * states an IntentDecision (as intentIQ would hand it off) plus optional
 * memory/hypothesis context, and what a correct ReasoningResult should
 * demonstrate — not exact wording.
 *
 * @typedef {Object} ReasonEvaluationCase
 * @property {string} id
 * @property {import('../intentIQ/schema').IntentDecisionSchema} intentDecision
 * @property {{ role: string, content: string }[]} messages
 * @property {{ recalledMemory?: object[], existingHypotheses?: object[] }} [context]
 * @property {string} expectation plain-language description of what a correct ReasoningResult should show
 */

function u(content) { return { role: 'user', content }; }
function a(content) { return { role: 'assistant', content }; }

function intent(overrides) {
  return {
    intent: 'technical.debug',
    intentFamily: 'technical',
    status: 'accepted',
    confidence: 0.9,
    candidates: [{ intent: 'technical.debug', confidence: 0.9 }],
    entities: [],
    sourceOfTruth: 'conversation',
    capability: 'hermes',
    reasoningProfile: 'technical',
    needsClarification: false,
    ...overrides,
  };
}

/** @type {ReasonEvaluationCase[]} */
export const EVALUATION_SET = [
  {
    id: 'straightforward-01',
    intentDecision: intent({ intent: 'technical.explain', intentFamily: 'technical', reasoningProfile: 'technical' }),
    messages: [u('How does the useConversation hook manage streaming state?')],
    expectation: 'Obvious intent, straightforward reasoning — high confidence, no contradictions, no clarification needed.',
  },
  {
    id: 'non-trivial-reasoning-01',
    intentDecision: intent({ intent: 'technical.debug' }),
    messages: [
      u('The stream stalls after the first chunk sometimes but not always.'),
    ],
    expectation: 'Correct intent (debug), but the reasoning itself is non-trivial: intermittent failures should produce multiple candidate inferences/hypotheses rather than one confident conclusion.',
  },
  {
    id: 'incomplete-evidence-01',
    intentDecision: intent({ intent: 'technical.debug' }),
    messages: [u('It broke again.')],
    expectation: 'Evidence is too thin to reason concretely — missingInformation should be non-empty (what broke, when, what changed) and confidence should stay low.',
  },
  {
    id: 'conflicting-memory-01',
    intentDecision: intent({ intent: 'technical.debug', sourceOfTruth: 'understanding' }),
    messages: [u('Why does the database connection fail now?')],
    context: { recalledMemory: [
      { id: 'r1', summary: 'The project database is PostgreSQL.', confidence: 0.9 },
      { id: 'r2', summary: 'The project database was migrated to MySQL last month.', confidence: 0.6 },
    ] },
    expectation: 'Two recalled memories disagree — contradictions must name the conflict explicitly, not silently prefer the higher-confidence one.',
  },
  {
    id: 'tempting-unconfirmed-hypothesis-01',
    intentDecision: intent({ intent: 'technical.debug' }),
    messages: [
      u('Every time I deploy late at night it seems to fail more.'),
    ],
    expectation: 'A pattern is suggestive but not established from one data point — a hypothesis with modest confidence (not a fact), with a verification plan, is the correct output; treating it as settled would be wrong.',
  },
  {
    id: 'correct-conclusion-is-uncertainty-01',
    intentDecision: intent({ intent: 'technical.debug', confidence: 0.4, status: 'ambiguous', candidates: [
      { intent: 'technical.debug', confidence: 0.42 },
      { intent: 'technical.implement', confidence: 0.4 },
    ], needsClarification: true }),
    messages: [u('Can you take a look at the deploy thing?')],
    expectation: 'The honest conclusion is "not enough to go on" — high uncertainty, clarificationRecommended: true, low overall confidence, not a forced diagnosis.',
  },
  {
    id: 'no-capability-needed-01',
    intentDecision: intent({ intent: 'chat.general', intentFamily: 'chat', capability: 'none', reasoningProfile: 'calm' }),
    messages: [u("How's your day going?")],
    expectation: 'Ordinary conversation — capabilityImplication.suggested should be "none".',
  },
  {
    id: 'capability-may-be-useful-01',
    intentDecision: intent({ intent: 'memory.recall', intentFamily: 'memory', capability: 'hindsight', reasoningProfile: 'calm' }),
    messages: [u('What did I tell you about my database setup a while back?')],
    expectation: 'No memory was retrieved yet for this evaluation case (context omitted) — capabilityImplication should suggest "hindsight" as potentially useful, not fabricate an answer from nothing.',
  },
  {
    id: 'feedback-changes-interpretation-01',
    intentDecision: intent({ intent: 'technical.debug' }),
    messages: [
      u('Why does my deployment keep failing?'),
      a('It looks like the build step is timing out.'),
      u("No, that's not it — I already checked the build logs and they're clean."),
    ],
    expectation: "The user's correction is feedback that should shift the interpretation away from the previously assumed cause — the prior 'build step timeout' framing should not be restated as settled; missingInformation or a revised hypothesis should reflect the correction.",
  },
  {
    id: 'reconsider-earlier-assumption-01',
    intentDecision: intent({ intent: 'technical.debug' }),
    messages: [
      u('The deployment fails because of the database connection, right?'),
      a('That does seem likely given what you described.'),
      u('Actually I just noticed the database was never even reachable in this environment — there is no DB configured here at all.'),
    ],
    context: { existingHypotheses: [
      { statement: 'The deployment fails due to a database connection issue.', confidence: 0.6, status: 'testing' },
    ] },
    expectation: 'New evidence undercuts the existing hypothesis — reasonIQ should lower its confidence or move its status toward rejected, not leave it unchanged or silently drop it.',
  },
];
