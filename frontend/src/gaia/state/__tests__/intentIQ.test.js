import { deriveIntent } from '../intentIQ';

function userMsg(content) {
  return { role: 'user', content };
}

describe('deriveIntent', () => {
  test('defaults to conversation for empty history', () => {
    expect(deriveIntent([])).toEqual({ type: 'conversation' });
  });

  test('defaults to conversation for ordinary chat', () => {
    expect(deriveIntent([userMsg('What theme should I use tonight?')])).toEqual({ type: 'conversation' });
  });

  test('detects technical intent in English', () => {
    expect(deriveIntent([userMsg('Can you help me refactor this component?')])).toEqual({ type: 'technical' });
  });

  test('detects technical intent in Dutch', () => {
    expect(deriveIntent([userMsg('Kun je deze architectuur implementeren?')])).toEqual({ type: 'technical' });
  });

  test('detects self-reflective (gaia) intent in English', () => {
    expect(deriveIntent([userMsg('What are your principles?')])).toEqual({ type: 'gaia' });
  });

  test('detects self-reflective (gaia) intent in Dutch', () => {
    expect(deriveIntent([userMsg('Wat zijn je principes?')])).toEqual({ type: 'gaia' });
  });

  test('does not false-positive on substrings of technical words', () => {
    // "codecs", "decoded", "encoded", "barcode" all contain "code" as a substring
    expect(deriveIntent([userMsg('My decoded barcode scanner stopped working')])).toEqual({ type: 'conversation' });
  });

  test('only considers the recent window, not the whole history', () => {
    const history = [
      userMsg('Can you help me refactor this component?'), // technical, now stale
      { role: 'assistant', content: 'Sure, what does it do?' },
      { role: 'assistant', content: 'Anything else?' },
      { role: 'assistant', content: 'Still there?' },
      userMsg('What theme should I use tonight?'), // recent, plain conversation
    ];
    expect(deriveIntent(history, 1)).toEqual({ type: 'conversation' });
  });

  test('picks up a topic shift within the window', () => {
    const history = [
      userMsg('What theme should I use tonight?'),
      { role: 'assistant', content: 'Dark mode, probably.' },
      userMsg('Actually, can you refactor the theme switcher component?'),
    ];
    expect(deriveIntent(history)).toEqual({ type: 'technical' });
  });

  test('breaks ties toward gaia when both signals score equally', () => {
    expect(deriveIntent([userMsg('What are your principles about code?')]))
      .toEqual({ type: 'gaia' });
  });
});
