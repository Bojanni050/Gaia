import { ReasoningProvider } from '../ReasoningProvider';

describe('ReasoningProvider (abstract)', () => {
  test('throws if health() is not implemented', async () => {
    const p = new ReasoningProvider();
    await expect(p.health()).rejects.toThrow('health must be implemented');
  });

  test('throws if stream() is not implemented', async () => {
    const p = new ReasoningProvider();
    await expect(p.stream([])).rejects.toThrow('stream must be implemented');
  });

  test('throws if chat() is not implemented', async () => {
    const p = new ReasoningProvider();
    await expect(p.chat([])).rejects.toThrow('chat must be implemented');
  });
});
