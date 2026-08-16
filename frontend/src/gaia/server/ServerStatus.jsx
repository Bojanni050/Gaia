/**
 * Server status indicator — Gaia's local presence in the shell.
 *
 * Displays only connectivity to Gaia Server, as reported by the Rust
 * communication layer. Says nothing about models, cognition or state.
 * Renders nothing outside the desktop shell.
 */
import React, { useEffect, useState } from 'react';
import { createGaiaServerClient, isDesktop } from './client';

const STATUS_LABELS = {
  notConfigured: 'local',
  connecting: 'connecting',
  online: 'online',
  offline: 'offline',
};

const STATUS_COLORS = {
  notConfigured: '#8a8f98',
  connecting: '#e2b714',
  online: '#4caf7d',
  offline: '#e05252',
};

export default function ServerStatus() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!isDesktop()) return undefined;
    const client = createGaiaServerClient();
    let unlisten;
    let active = true;
    client.getStatus().then((s) => { if (active) setStatus(s.status); }).catch(() => {});
    client
      .onStatus((s) => setStatus(s))
      .then((unlistenFn) => { unlisten = unlistenFn; })
      .catch(() => {});
    return () => {
      active = false;
      if (unlisten) unlisten();
    };
  }, []);

  if (!isDesktop() || !status) return null;

  return (
    <div className="server-status" data-testid="server-status" title={`Gaia Server: ${status}`}>
      <span
        className="server-status-dot"
        style={{ backgroundColor: STATUS_COLORS[status] || '#8a8f98' }}
      />
      <span className="server-status-label">{STATUS_LABELS[status] || status}</span>
    </div>
  );
}
