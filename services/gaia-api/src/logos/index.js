'use strict';

/**
 * Logos — composes IntentIQ and ReasonIQ for one turn.
 *
 * Not wired into turn.js in this phase. This module exists to give the
 * IntentIQ -> ReasonIQ handoff a real, testable seam (per the ReasonIQ
 * v0.1 implementation brief, §19) without touching the live conversation
 * path — turn.js's own integration decision belongs to whichever phase
 * gives Gaia an actual decision to make with a ReasoningResult (tools/
 * capabilities are explicitly out of scope right now). Calling this from
 * turn.js today would just be a second dev-log-only seam with nothing
 * downstream to consume it, which is not what was asked for.
 */

const { classify } = require('./intentIQ');
const reasonIQ = require('./reasonIQ');

/**
 * @param {Array<{role: string, content: string}>} messages
 * @param {{
 *   evidence?: Array<{content: string, source?: string}>,
 *   contextId?: string,
 *   reasoningModel?: object,
 *   silent?: boolean,
 *   logger?: Function,
 * }} [options]
 * @returns {Promise<{ intentDecision: object, reasoningResult: object }>}
 */
async function runLogos(messages, options = {}) {
  const intentDecision = classify(messages, { contextId: options.contextId, silent: options.silent, logger: options.logger });

  const text = latestUserText(messages);
  const reasoningResult = await reasonIQ.evaluate(
    {
      text,
      intentDecision,
      conversationContext: messages,
      evidence: options.evidence || [],
      contextId: options.contextId,
    },
    { reasoningModel: options.reasoningModel, silent: options.silent, logger: options.logger }
  );

  return { intentDecision, reasoningResult };
}

function latestUserText(messages) {
  for (let i = (messages || []).length - 1; i >= 0; i -= 1) {
    if (messages[i] && messages[i].role === 'user') return messages[i].content || '';
  }
  return '';
}

module.exports = { runLogos };
