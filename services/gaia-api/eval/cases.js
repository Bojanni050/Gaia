'use strict';

/**
 * IntentIQ v0.1 — synthetic evaluation set.
 *
 * IMPORTANT: every case below is invented to stress-test the "Intent
 * Taxonomy v0.1" design report and this classifier's implementation of it.
 * None of it is real user data — Gaia has very little real conversational
 * history yet. This set exists to check the taxonomy and the classifier
 * against each other, not to train anything, and it must not be used to
 * silently reshape the taxonomy (design report, Phase 8's own rule).
 *
 * Each case: { id, input, context?, expectedIntent, acceptableAlternatives?,
 * expectAmbiguous?, expectUnknown?, notes }. `context` is prior turns
 * (role/content) that precede `input` as the final user message.
 */

const TAXONOMY_VERSION = '0.1.0';

const CASES = [
  // --- obvious: one clean example per taxonomy leaf ----------------------
  { id: 'obv-01', input: 'Why is my website crashing?', expectedIntent: 'inform.explain' },
  { id: 'obv-02', input: 'Write a homepage introduction for me.', expectedIntent: 'create.generate' },
  { id: 'obv-03', input: 'Make this paragraph sound warmer.', expectedIntent: 'create.transform' },
  { id: 'obv-04', input: 'I just need to vent for a second.', expectedIntent: 'converse' },
  { id: 'obv-05', input: 'I don\'t know whether to take the job, should I take it?', expectedIntent: 'decide.support' },
  { id: 'obv-06', input: 'What have you noticed about how I work?', expectedIntent: 'memory.inspect' },
  { id: 'obv-07', input: 'Forget what I told you about my old job.', expectedIntent: 'memory.correct' },
  { id: 'obv-08', input: 'Send Alex the meeting notes.', expectedIntent: 'act.perform' },
  { id: 'obv-09', input: 'Who are you, really?', expectedIntent: 'meta.relational' },

  // --- boundary cases ------------------------------------------------------
  {
    id: 'bnd-01', input: 'What\'s wrong with this code?', expectedIntent: 'inform.explain',
    acceptableAlternatives: ['create.transform'],
    notes: 'Diagnosis reads as explanation unless "fix" is explicit.',
  },
  { id: 'bnd-02', input: 'Fix this code.', expectedIntent: 'create.transform' },
  {
    id: 'bnd-03', input: 'How does Hindsight actually work?', expectedIntent: 'inform.explain',
    notes: 'Technical register, still explanation, not meta.relational.',
  },
  {
    id: 'bnd-04', input: 'Can you look at this and tell me what you\'d do?', expectedIntent: 'decide.support',
    notes: '"what you\'d do" asks for judgment, not a fact.',
  },
  {
    id: 'bnd-05', input: 'You seem different today.', expectedIntent: 'meta.relational',
  },
  {
    id: 'bnd-06', input: 'Do you ever get tired of listening to me?', expectedIntent: 'meta.relational',
    acceptableAlternatives: ['converse'],
    notes: 'Self-deprecating conversational opener vs. a genuine relational question.',
  },
  {
    id: 'bnd-07', input: 'Rewrite this in my own voice, whatever that means.', expectedIntent: 'create.transform',
    notes: '"my own voice" implicitly invokes stored understanding as a source, but the ask is still a transform.',
  },
  {
    id: 'bnd-08', input: 'That\'s not right, I actually prefer mornings.', expectedIntent: 'memory.correct',
  },
  {
    id: 'bnd-09', input: 'Delete everything you know about me.', expectedIntent: 'memory.correct',
  },
  {
    id: 'bnd-10', input: 'You\'re wrong about that.', expectedIntent: 'meta.relational',
    acceptableAlternatives: ['memory.correct'],
    notes: 'Ambiguous by design in the source report — genuinely depends on referent.',
  },

  // --- unknown ---------------------------------------------------------------
  { id: 'unk-01', input: 'asdkfj alkj qzx', expectUnknown: true },
  { id: 'unk-02', input: '', expectUnknown: true },
  { id: 'unk-03', input: 'ok', expectUnknown: true },
  { id: 'unk-04', input: '...', expectUnknown: true },
  { id: 'unk-05', input: 'hmm', expectUnknown: true },
  {
    id: 'unk-06', input: 'Should I say yes or no?', expectUnknown: true,
    acceptableAlternatives: ['decide.support'],
    notes: 'No prior context establishing the referent — missing-referent case from the design report.',
  },

  // --- ambiguous ---------------------------------------------------------------
  {
    id: 'amb-01', input: 'I need you to handle this.', expectAmbiguous: true,
    notes: 'From the taxonomy report itself: both the intent and the referent are unresolved.',
  },
  {
    id: 'amb-02', input: 'Can you explain what\'s wrong with this and fix it?', expectAmbiguous: true,
    acceptableAlternatives: ['inform.explain', 'create.transform'],
  },
  {
    id: 'amb-03', input: 'I think I need to talk to someone about this, but maybe just to you for now.',
    expectedIntent: 'converse', acceptableAlternatives: ['decide.support'], expectAmbiguous: false,
    notes: 'Decision-adjacent but explicitly declines a decision framework — real cases like this test whether the classifier over-triggers decide.support.',
  },

  // --- multi-intent -------------------------------------------------------
  {
    id: 'multi-01', input: 'Draft the email and send it to Sam.', expectAmbiguous: true,
    acceptableAlternatives: ['create.generate', 'act.perform'],
    notes: 'Two co-equal intents; the v0.1 schema cannot hold both as `intent`, so this must surface as ambiguous with both in candidates.',
  },
  {
    id: 'multi-02', input: 'Rewrite this and then post it to the team channel.', expectAmbiguous: true,
    acceptableAlternatives: ['create.transform', 'act.perform'],
  },
  {
    id: 'multi-03', input: 'Explain what happened and add a reminder for tomorrow.', expectAmbiguous: true,
    acceptableAlternatives: ['inform.explain', 'act.perform'],
  },

  // --- follow-up / context-dependent turns --------------------------------
  {
    id: 'ctx-01',
    input: 'En deze dan?',
    context: [
      { role: 'user', content: 'Kun je dit analyseren?' },
      { role: 'assistant', content: 'Ja, ik kijk ernaar.' },
    ],
    expectedIntent: 'inform.explain',
    notes: 'Dutch follow-up with no signal of its own; must inherit the prior turn.',
  },
  {
    id: 'ctx-02',
    input: 'And this one?',
    context: [
      { role: 'user', content: 'Can you shorten this paragraph?' },
      { role: 'assistant', content: 'Sure, here you go.' },
    ],
    expectedIntent: 'create.transform',
  },
  {
    id: 'ctx-03',
    input: 'En deze dan?',
    context: [],
    expectUnknown: true,
    notes: 'No prior turn to inherit from — must not hallucinate an intent.',
  },
  {
    id: 'ctx-04',
    input: 'What about tomorrow instead?',
    context: [
      { role: 'user', content: 'Add this to my calendar for Friday.' },
      { role: 'assistant', content: 'Done.' },
    ],
    expectedIntent: 'act.perform',
  },

  // --- memory / context cases -------------------------------------------
  { id: 'mem-01', input: 'What do you know about me?', expectedIntent: 'memory.inspect' },
  { id: 'mem-02', input: 'Remember what I told you about the database migration?', expectedIntent: 'inform.explain', notes: 'sourceOfTruth should resolve to memory even though the intent is explanation.' },
  { id: 'mem-03', input: 'Why do you think that about me?', expectedIntent: 'memory.inspect' },
  { id: 'mem-04', input: 'I told you this before, weren\'t you listening?', expectAmbiguous: true, acceptableAlternatives: ['meta.relational', 'memory.correct'] },

  // --- technical vs. general ------------------------------------------------
  { id: 'tech-01', input: 'Why does the API return a 500 on this endpoint?', expectedIntent: 'inform.explain' },
  { id: 'tech-02', input: 'Refactor this function to be more readable.', expectedIntent: 'create.transform' },
  { id: 'tech-03', input: 'What\'s the capital of Latvia?', expectedIntent: 'inform.explain' },
  { id: 'tech-04', input: 'How do black holes form?', expectedIntent: 'inform.explain' },

  // --- action vs. planning ----------------------------------------------
  { id: 'act-01', input: 'Turn off the reminder for tomorrow.', expectedIntent: 'act.perform' },
  { id: 'act-02', input: 'Should I schedule the call for Monday or Tuesday?', expectedIntent: 'decide.support' },
  { id: 'act-03', input: 'Schedule the call for Monday.', expectedIntent: 'act.perform' },
  { id: 'act-04', input: 'Post that draft to the team channel.', expectedIntent: 'act.perform' },

  // --- creation vs. transformation -----------------------------------------
  { id: 'cre-01', input: 'Come up with three names for a new coffee brand.', expectedIntent: 'create.generate' },
  { id: 'cre-02', input: 'Translate this into Dutch.', expectedIntent: 'create.transform' },
  { id: 'cre-03', input: 'Draft a short apology email to a client.', expectedIntent: 'create.generate' },
  { id: 'cre-04', input: 'Shorten this to two sentences.', expectedIntent: 'create.transform' },
  { id: 'cre-05', input: 'Write me a lullaby about the sea.', expectedIntent: 'create.generate' },
  { id: 'cre-06', input: 'Clean up the grammar in this email, don\'t change the meaning.', expectedIntent: 'create.transform' },

  // --- converse vs. decide.support (the trickiest documented pair) --------
  { id: 'conv-01', input: 'Long day. Not really looking for advice, just wanted to say it out loud.', expectedIntent: 'converse' },
  { id: 'conv-02', input: 'Talk me out of quitting, or tell me I\'m right to.', expectedIntent: 'decide.support' },
  { id: 'conv-03', input: 'Just checking you\'re still there.', expectedIntent: 'converse' },
  { id: 'conv-04', input: 'What am I missing here?', expectedIntent: 'decide.support', acceptableAlternatives: ['inform.explain'] },

  // --- entities smoke cases (not scored on intent alone) --------------------
  { id: 'ent-01', input: 'Rewrite "the quick fox" to sound more formal.', expectedIntent: 'create.transform', notes: 'entity check: quoted_text' },
  { id: 'ent-02', input: 'Send this to Alex.', expectedIntent: 'act.perform', notes: 'entity check: recipient' },
];

module.exports = { CASES, TAXONOMY_VERSION };
