/**
 * Gaia Server client — the frontend's single seam to Gaia Server.
 *
 * Thin by design: every call is forwarded to the Rust communication layer,
 * which owns the actual transport (REST today, WebSocket later). This module
 * contains no business logic, no model assumptions and no interpretation —
 * cognition lives on the server.
 *
 * Outside the desktop shell (plain web builds) the bridge is unavailable and
 * calls resolve to a clear unavailable result instead of throwing.
 */
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export function isDesktop() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

const unavailable = () => Promise.reject(new Error('Gaia Server bridge is only available in the desktop shell'));

export function createGaiaServerClient() {
  const bridge = isDesktop()
    ? {
        getConfig: () => invoke('server_get_config'),
        applyConfig: (config) => invoke('server_set_config', { config }),
        getStatus: () => invoke('server_get_status'),
        testConnection: () => invoke('server_test_connection'),
        request: (request) => invoke('server_request', { request }),
        onStatus: (handler) => listen('server://status', (event) => handler(event.payload)),
      }
    : {
        getConfig: unavailable,
        applyConfig: unavailable,
        getStatus: () => Promise.resolve({ status: 'notConfigured', serverUrl: null }),
        testConnection: unavailable,
        request: unavailable,
        onStatus: () => Promise.resolve(() => {}),
      };

  return bridge;
}
