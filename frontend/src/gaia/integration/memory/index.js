/**
 * Memory integration — the only place Gaia Desktop reaches Hindsight.
 *
 * Returns a single, lazily-built provider. Today that is HindsightProvider;
 * tomorrow it could be swapped without any caller knowing (architecture §7).
 */
import { HindsightProvider } from './HindsightProvider';
import { MemoryProvider } from './MemoryProvider';
import { MemoryUnavailableError, MemoryNotFoundError } from './errors';

let _provider = null;

export function getMemoryProvider() {
  if (_provider) return _provider;
  _provider = createProvider();
  return _provider;
}

export function createProvider() {
  return new HindsightProvider();
}

export function resetProvider() {
  _provider = null;
}

export {
  MemoryProvider,
  HindsightProvider,
  MemoryUnavailableError,
  MemoryNotFoundError,
};
