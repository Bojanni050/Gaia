/**
 * Capture interface — the frontend's view on the desktop's capture subsystem.
 *
 * Capture collects local context and offers it to Gaia Server verbatim. What
 * that context means is decided by Gaia, never here. Phase 1 ships no
 * concrete capture sources, so `list()` returns an empty list inside the
 * desktop shell and an error outside it.
 */
import { invoke } from '@tauri-apps/api/core';
import { isDesktop } from '../server/client';

export function listCaptureSources() {
  if (!isDesktop()) return Promise.reject(new Error('Capture is only available in the desktop shell'));
  return invoke('capture_list_sources');
}

export function requestCapture(sourceId, options = null) {
  if (!isDesktop()) return Promise.reject(new Error('Capture is only available in the desktop shell'));
  return invoke('capture_now', { sourceId, options });
}

export function submitCapture(item) {
  if (!isDesktop()) return Promise.reject(new Error('Capture is only available in the desktop shell'));
  return invoke('capture_submit', { item });
}
