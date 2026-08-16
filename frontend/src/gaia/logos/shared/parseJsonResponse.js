/**
 * parseJsonResponse.js — tolerant JSON extraction from a reasoning
 * provider's text response.
 *
 * Shared by intentIQ and reasonIQ: both faculties require the provider to
 * return JSON only, but some providers wrap it in a markdown code fence
 * despite instructions. This does not validate the *shape* of the result —
 * each faculty's own schema does that; this only recovers a parseable
 * object (or undefined) from raw text.
 */

/**
 * @param {string} text
 * @returns {unknown|undefined} parsed object, or undefined if unparsable
 */
export function parseJsonResponse(text) {
  if (typeof text !== 'string' || !text.trim()) return undefined;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return undefined;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch (_) {
    return undefined;
  }
}
