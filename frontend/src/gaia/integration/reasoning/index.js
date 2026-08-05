/**
 * Reasoning integration — the only place Gaia Desktop reaches reasoning.
 *
 * Returns a single, lazily-built provider. Today that is HermesProvider;
 * tomorrow it could be swapped without any caller knowing.
 */
import { HermesProvider } from './HermesProvider';
import { ReasoningProvider } from './ReasoningProvider';
import {
  ReasoningUnavailableError,
  ReasoningAbortedError,
} from './errors';

let _provider = null;

export function getReasoningProvider() {
  if (_provider) return _provider;
  _provider = createProvider();
  return _provider;
}

export function createProvider() {
  return new HermesProvider();
}

export function resetProvider() {
  _provider = null;
}

export {
  ReasoningProvider,
  HermesProvider,
  ReasoningUnavailableError,
  ReasoningAbortedError,
};
