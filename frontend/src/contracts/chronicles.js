/**
 * Chronicles contract — structured knowledge (facts, entities, relationships).
 *
 * Distinct from Hindsight: Chronicles holds structured FACTS, not reflective
 * personal memory. The line between the two must never blur.
 *
 * @typedef {Object} Entity
 * @property {string} id
 * @property {string} type
 * @property {string} name
 * @property {Object} attributes
 *
 * @typedef {Object} Relation
 * @property {string} from        // entity id
 * @property {string} to          // entity id
 * @property {string} kind
 *
 * Capabilities (contract only — not yet implemented):
 *   upsertEntity(Entity)
 *   getEntity(id) -> Entity
 *   queryEntities(filter) -> Entity[]
 *   relate(Relation)
 *   neighbors(entityId) -> Entity[]
 */
export const CHRONICLES_CAPABILITIES = Object.freeze([
  'upsertEntity', 'getEntity', 'queryEntities', 'relate', 'neighbors',
]);
