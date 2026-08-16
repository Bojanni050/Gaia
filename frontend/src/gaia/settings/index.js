/**
 * Settings — local, device-bound preferences.
 *
 * Loaded from and saved to the Rust settings layer. Settings describe this
 * device's behaviour (which server, notifications, audio, capture) and hold
 * nothing cognitive.
 */
import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { isDesktop } from '../server/client';

const DEFAULT_SETTINGS = {
  server: { baseUrl: null, websocketUrl: null, authToken: null },
  notifications: { enabled: true },
  audio: { preferredInput: null },
  capture: { enabledSources: [] },
};

export function getSettings() {
  if (!isDesktop()) return Promise.resolve(DEFAULT_SETTINGS);
  return invoke('settings_get');
}

export function saveSettings(newSettings) {
  if (!isDesktop()) return Promise.reject(new Error('Settings are only available in the desktop shell'));
  return invoke('settings_save', { newSettings });
}

/**
 * Minimal settings hook: load once, save on demand.
 * No derived logic — the UI decides what to show, this only moves data.
 */
export function useSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    getSettings()
      .then((s) => { if (active) setSettings(s); })
      .catch(() => {})
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);

  const save = useCallback(async (next) => {
    const saved = await saveSettings(next);
    setSettings(saved);
    return saved;
  }, []);

  return { settings, loaded, save };
}
