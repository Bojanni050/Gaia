/**
 * Gaia Server event topics.
 *
 * The desktop relays and displays; it never interprets. Payload semantics
 * are defined by Gaia Server, not by this client.
 */
export const SERVER_EVENTS = {
  /** Connection status changed. Payload: ConnectionStatus (camelCase). */
  STATUS: 'server://status',
};

/** Local presence changed on this device. Payload: DesktopPresence. */
export const PRESENCE_EVENTS = {
  CHANGED: 'presence://changed',
};
