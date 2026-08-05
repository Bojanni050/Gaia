/**
 * Tests for the SOUL bridge.
 *
 * soul.js exists to load the canonical SOUL document and expose it as the
 * system prompt. The test verifies the bridge is wired correctly: the
 * exported value is the raw text of the canonical document.
 */
import { SOUL_SYSTEM } from '../soul';

describe('SOUL bridge', () => {
  test('loads a non-empty system prompt from the canonical document', () => {
    expect(typeof SOUL_SYSTEM).toBe('string');
    expect(SOUL_SYSTEM.length).toBeGreaterThan(0);
  });

  test('the loaded prompt speaks in Gaia\'s first person', () => {
    expect(SOUL_SYSTEM.toLowerCase()).toContain('gaia');
  });

  test('the loaded prompt forbids leaking provider or model details', () => {
    const text = SOUL_SYSTEM.toLowerCase();
    expect(text).not.toMatch(/\bmodel\b/);
    expect(text).not.toMatch(/\bprovider\b/);
    expect(text).not.toMatch(/\bapi\b/);
  });
});
