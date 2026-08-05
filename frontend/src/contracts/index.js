/**
 * Gaia system contracts index.
 *
 * These modules express the durable boundaries between Gaia's systems in code:
 *   SOUL (identity) · Hindsight (memory) · Hermes (reasoning) ·
 *   Chronicles (knowledge) · MCP (actions) · Gaia Desktop (experience)
 *
 * The client integrates only through these contracts. No layer reaches into
 * another layer's internals.
 *
 * Today the desktop speaks only to the reasoning seam; the other contracts
 * are documented as future seams to be filled in later milestones.
 */
export * from './reasoning';
export * from './hindsight';
export * from './chronicles';
export * from './mcp';
