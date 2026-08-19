'use strict';

/**
 * ReasonIQ v0.1 — synthetic evaluation set.
 *
 * IMPORTANT: every case below is invented to stress-test ReasonIQ's
 * pipeline (prompting, parsing, validation, depth-gating, degradation)
 * against the reasoningModelStub.js stand-in described in eval/README.md
 * — this repository has no live reasoning-model credential to score
 * against a real LLM. None of this is real user data.
 *
 * Each case: { id, input: {text, evidence?, intentDecision?, conversationContext?},
 * expect: { reasoningDepth?, minHypotheses?, expectSufficient?, expectGap?,
 * expectContradiction?, expectVerdict? }, notes }.
 */

const CASES = [
  // --- cases where no deep reasoning is necessary --------------------------
  { id: 'shallow-01', input: { text: 'ok' }, expect: { reasoningDepth: 'shallow' }, notes: 'filler-length input' },
  { id: 'shallow-02', input: { text: 'thanks, that helps' }, expect: { reasoningDepth: 'shallow' } },
  {
    id: 'shallow-03',
    input: { text: 'I just need to vent for a second, it has been a long week honestly', intentDecision: { intent: 'converse', status: 'accepted' } },
    expect: { reasoningDepth: 'shallow' },
    notes: 'presence-seeking turn with nothing to weigh',
  },
  {
    id: 'shallow-04',
    input: { text: 'asdkfj alkj qzx', intentDecision: { intent: null, status: 'unknown' } },
    expect: { reasoningDepth: 'shallow' },
  },

  // --- simple reasoning / factual interpretation ----------------------------
  {
    id: 'simple-01',
    input: { text: 'What is the capital of Latvia?', intentDecision: { intent: 'inform.explain', status: 'accepted' } },
    expect: { reasoningDepth: 'deep', expectSufficient: false },
    notes: 'no evidence supplied — stub should report a gap, not fabricate the answer',
  },
  {
    id: 'simple-02',
    input: {
      text: 'Why is my website crashing?',
      evidence: [{ content: 'server logs show repeated out-of-memory errors before each crash' }],
      intentDecision: { intent: 'inform.explain', status: 'accepted' },
    },
    expect: { reasoningDepth: 'deep', minHypotheses: 1, expectVerdict: 'supports' },
  },

  // --- inference ------------------------------------------------------------
  {
    id: 'infer-01',
    input: {
      text: 'The build has failed three times this week, always right after a dependency update.',
      evidence: [{ content: 'CI logs show the failure occurs immediately after `npm install` completes' }],
    },
    expect: { reasoningDepth: 'deep', minHypotheses: 1 },
  },

  // --- hypothesis formation & evidence verdicts -----------------------------
  {
    id: 'hyp-support-01',
    input: {
      text: 'I think the outages are caused by the new caching layer.',
      evidence: [{ content: 'outages started the same day the new caching layer was deployed' }],
    },
    expect: { reasoningDepth: 'deep', minHypotheses: 1, expectVerdict: 'supports' },
  },
  {
    id: 'hyp-weaken-01',
    input: {
      text: 'I think the outages are caused by the new caching layer.',
      evidence: [{ content: 'outages sometimes happen even when the caching layer is disabled' }],
    },
    expect: { reasoningDepth: 'deep', minHypotheses: 1, expectVerdict: 'weakens' },
  },
  {
    id: 'hyp-contradict-01',
    input: {
      text: 'I think the outages are caused by the new caching layer.',
      evidence: [{ content: 'the caching layer was not deployed until after the outages had already started' }],
    },
    expect: { reasoningDepth: 'deep', minHypotheses: 1, expectVerdict: 'contradicts' },
  },
  {
    id: 'hyp-irrelevant-01',
    input: {
      text: 'I think the outages are caused by the new caching layer.',
      evidence: [{ content: 'the marketing team renamed the product last quarter' }],
    },
    expect: { reasoningDepth: 'deep', minHypotheses: 1, expectVerdict: 'irrelevant' },
  },

  // --- competing hypotheses --------------------------------------------------
  {
    id: 'compete-01',
    input: {
      text: 'The checkout page is slow. Maybe it is the database, or maybe it is the new image loader.',
      evidence: [
        { content: 'database query time has not changed in the monitoring dashboard' },
        { content: 'the image loader was added the same week the slowness started' },
      ],
    },
    expect: { reasoningDepth: 'deep', minHypotheses: 1 },
    notes: 'a real reasoning model should surface both candidate explanations; the stub is not expected to do this well — see eval/README.md',
  },

  // --- insufficient information ----------------------------------------------
  {
    id: 'insufficient-01',
    input: { text: 'Should I say yes or no?', evidence: [] },
    expect: { reasoningDepth: 'deep', expectSufficient: false, expectGap: true },
  },
  {
    id: 'insufficient-02',
    input: { text: 'Is this a good idea?', evidence: [{ content: 'placeholder, no real detail' }] },
    expect: { reasoningDepth: 'deep' },
  },

  // --- uncertainty / ambiguous context ---------------------------------------
  {
    id: 'ambiguous-01',
    input: {
      text: 'It broke again.',
      conversationContext: [
        { role: 'user', content: 'Can you look at the checkout flow?' },
        { role: 'assistant', content: 'Sure, what happened?' },
      ],
      evidence: [{ content: 'no specific error was reported by the user' }],
    },
    expect: { reasoningDepth: 'deep' },
    notes: 'ambiguous referent ("it") — a real reasoning model should flag this as an information gap',
  },

  // --- confidence revision ----------------------------------------------------
  {
    id: 'revise-01',
    input: {
      text: 'I suspect the user prefers async communication.',
      evidence: [{ content: 'the user has replied to every message within minutes for the last two weeks' }],
    },
    expect: { reasoningDepth: 'deep', minHypotheses: 1, expectVerdict: 'contradicts' },
    notes: 'fast, consistent replies weaken/contradict an "async preference" hypothesis — tests whether revision direction is sane',
  },

  // --- technical reasoning ------------------------------------------------
  {
    id: 'tech-01',
    input: {
      text: 'Why does the API return a 500 on the checkout endpoint sometimes?',
      evidence: [{ content: 'the 500s only occur when the request payload exceeds 1MB' }],
      intentDecision: { intent: 'inform.explain', status: 'accepted' },
    },
    expect: { reasoningDepth: 'deep', minHypotheses: 1, expectVerdict: 'supports' },
  },
  {
    id: 'tech-02',
    input: {
      text: 'Refactor this function to be more readable.',
      intentDecision: { intent: 'create.transform', status: 'accepted' },
    },
    expect: { reasoningDepth: 'deep', expectSufficient: false },
    notes: 'a transform request with no supplied code to transform — should surface as an information gap, not be guessed',
  },

  // --- planning / decision reasoning -----------------------------------------
  {
    id: 'plan-01',
    input: {
      text: 'I don\'t know whether to take the job — it pays more but the commute is much longer.',
      evidence: [{ content: 'the user has said in the past that they value time with family highly' }],
      intentDecision: { intent: 'decide.support', status: 'accepted' },
    },
    expect: { reasoningDepth: 'deep', minHypotheses: 1 },
  },

  // --- creative reasoning (light touch — ReasonIQ interprets, doesn't generate) --
  {
    id: 'creative-01',
    input: {
      text: 'Write a homepage introduction for me.',
      intentDecision: { intent: 'create.generate', status: 'accepted' },
    },
    expect: { reasoningDepth: 'deep', expectSufficient: false },
    notes: 'ReasonIQ interprets the request; it does not draft the copy itself — no evidence supplied about the product means a real gap',
  },

  // --- contradictions across supplied evidence --------------------------------
  {
    id: 'contradiction-01',
    input: {
      text: 'What is our deployment schedule?',
      evidence: [
        { content: 'the runbook says deployments happen every Friday at 5pm' },
        { content: 'the team lead said deployments now happen every Tuesday morning' },
      ],
    },
    expect: { reasoningDepth: 'deep' },
    notes: 'two supplied facts conflict directly — a real reasoning model should surface this in contradictions, not silently pick one',
  },

  // --- multi-evidence, mixed verdicts -----------------------------------------
  {
    id: 'mixed-01',
    input: {
      text: 'I think the user is disengaging from the project.',
      evidence: [
        { content: 'the user has not opened the app in five days' },
        { content: 'the user mentioned last week they were traveling for work' },
      ],
    },
    expect: { reasoningDepth: 'deep', minHypotheses: 1 },
    notes: 'one fact supports the hypothesis, one weakens it — tests whether both get distinct verdicts',
  },

  // --- short but evidence-bearing (depth gate should still go deep) ---------
  {
    id: 'short-evidence-01',
    input: { text: 'why?', evidence: [{ content: 'the deploy failed after 40 seconds with no error message' }] },
    expect: { reasoningDepth: 'deep' },
    notes: 'text alone is trivial-length, but supplied evidence must still force deep reasoning',
  },

  // --- more evidence-verdict coverage ------------------------------------
  {
    id: 'hyp-support-02',
    input: {
      text: 'Maybe the user prefers written updates over calls.',
      evidence: [{ content: 'the user has declined the last three scheduled calls but replies promptly to written summaries' }],
    },
    expect: { reasoningDepth: 'deep', minHypotheses: 1, expectVerdict: 'supports' },
  },
  {
    id: 'hyp-irrelevant-02',
    input: {
      text: 'Maybe the user prefers written updates over calls.',
      evidence: [{ content: 'the office coffee machine was replaced last month' }],
    },
    expect: { reasoningDepth: 'deep', minHypotheses: 1, expectVerdict: 'irrelevant' },
  },

  // --- more insufficient information ------------------------------------
  {
    id: 'insufficient-03',
    input: { text: 'What should I do about it?', evidence: [] },
    expect: { reasoningDepth: 'deep', expectSufficient: false },
    notes: 'no referent for "it" and no evidence — should not be answered with confidence',
  },
  {
    id: 'insufficient-04',
    input: { text: 'Is that a problem?', evidence: [] },
    expect: { reasoningDepth: 'deep', expectSufficient: false },
  },

  // --- more ambiguous context ---------------------------------------------
  {
    id: 'ambiguous-02',
    input: {
      text: 'And this one?',
      conversationContext: [
        { role: 'user', content: 'Can you analyze this?' },
        { role: 'assistant', content: 'Sure, looking at it now.' },
      ],
      evidence: [{ content: 'no attachment or prior artifact was actually supplied in this evaluation case' }],
    },
    expect: { reasoningDepth: 'deep' },
    notes: 'mirrors the IntentIQ follow-up example ("En deze dan?") — tests whether ReasonIQ notices the referent is still unresolved',
  },

  // --- more technical reasoning --------------------------------------------
  {
    id: 'tech-03',
    input: {
      text: 'Is this database schema change backward compatible?',
      evidence: [{ content: 'the change adds a NOT NULL column with no default value to a table with existing rows' }],
    },
    expect: { reasoningDepth: 'deep', minHypotheses: 1, expectVerdict: 'contradicts' },
    notes: 'the evidence directly undermines a "yes, compatible" hypothesis — checks the verdict points the right direction',
  },

  // --- more planning / decision reasoning ----------------------------------
  {
    id: 'plan-02',
    input: {
      text: 'Should we ship the feature now or wait for the next release?',
      evidence: [{ content: 'three beta users reported the feature crashes on large inputs' }],
      intentDecision: { intent: 'decide.support', status: 'accepted' },
    },
    expect: { reasoningDepth: 'deep', minHypotheses: 1, expectVerdict: 'contradicts' },
  },

  // --- more creative-adjacent interpretation --------------------------------
  {
    id: 'creative-02',
    input: {
      text: 'Make this paragraph sound warmer.',
      evidence: [{ content: 'the paragraph in question was not actually included in this evaluation case' }],
      intentDecision: { intent: 'create.transform', status: 'accepted' },
    },
    expect: { reasoningDepth: 'deep' },
    notes: 'transform target missing — a good reasoning result should flag this rather than inventing paragraph content',
  },

  // --- multiple contradictions ------------------------------------------
  {
    id: 'contradiction-02',
    input: {
      text: 'What time zone should the meeting be scheduled in?',
      evidence: [
        { content: 'the calendar invite draft says UTC' },
        { content: 'the client explicitly requested Eastern Time in their last email' },
      ],
    },
    expect: { reasoningDepth: 'deep' },
  },

  // --- mixed verdicts, second case -----------------------------------------
  {
    id: 'mixed-02',
    input: {
      text: 'I think the regression was introduced by yesterday\'s dependency bump.',
      evidence: [
        { content: 'the failing test started failing in the exact commit that bumped the dependency' },
        { content: 'the same dependency version passed all tests in a separate, unrelated project' },
      ],
    },
    expect: { reasoningDepth: 'deep', minHypotheses: 1 },
  },

  // --- unknown / low-signal deep cases (status unknown but evidence forces depth) --
  {
    id: 'unknown-deep-01',
    input: {
      text: 'I need you to handle this.',
      evidence: [{ content: 'no further detail was given about what "this" refers to' }],
      intentDecision: { intent: null, status: 'ambiguous' },
    },
    expect: { reasoningDepth: 'deep', expectSufficient: false },
    notes: 'mirrors the IntentIQ taxonomy\'s own flagship ambiguous example — ReasonIQ should not invent a task to reason about',
  },
];

module.exports = { CASES };
