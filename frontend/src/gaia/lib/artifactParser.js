/**
 * Parse Gaia's assistant text into ordered segments of prose and artifacts.
 * Artifact syntax (produced by SOUL system prompt):
 *   【artifact type="code" language="python" title="X"】 ...content... 【/artifact】
 * An unclosed artifact (still streaming) is returned with complete=false.
 */
const OPEN = /【artifact([^】]*)】/;
const CLOSE = '【/artifact】';

function parseMeta(raw) {
  const meta = { type: 'note', language: '', title: 'Artifact' };
  const re = /(\w+)="([^"]*)"/g;
  let m;
  while ((m = re.exec(raw)) !== null) meta[m[1]] = m[2];
  return meta;
}

export function parseSegments(text) {
  const segments = [];
  let rest = text || '';
  let index = 0;
  while (true) {
    const m = OPEN.exec(rest);
    if (!m) {
      if (rest) segments.push({ kind: 'text', value: rest });
      break;
    }
    const before = rest.slice(0, m.index);
    if (before) segments.push({ kind: 'text', value: before });
    const afterOpen = rest.slice(m.index + m[0].length);
    const meta = parseMeta(m[1]);
    const closeAt = afterOpen.indexOf(CLOSE);
    if (closeAt === -1) {
      segments.push({
        kind: 'artifact', id: `art-${index}`, meta,
        content: afterOpen.replace(/^\n/, ''), complete: false,
      });
      break;
    }
    const content = afterOpen.slice(0, closeAt).replace(/^\n/, '').replace(/\n$/, '');
    segments.push({ kind: 'artifact', id: `art-${index}`, meta, content, complete: true });
    rest = afterOpen.slice(closeAt + CLOSE.length);
    index += 1;
  }
  return segments;
}

export function extractArtifacts(text) {
  return parseSegments(text).filter((s) => s.kind === 'artifact');
}
