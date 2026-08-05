/**
 * Storage + value resolution for token counters.
 * Definitions live on the actor (shared) merged with per-token override flags.
 * Runtime state (turn anchors, manual values) is per-token so unlinked tokens
 * (e.g. no-name NPCs sharing one sheet) each track independently.
 * @module utils/tokenCounters/counterState
 */
import { MODULE_ID, TC_FLAGS, COUNTER_TYPES } from '#config';
import { normalizeCounter } from './counterModel.mjs';
import { readSystemValue } from './reflection.mjs';

/**
 * Read + normalise an actor's counter definitions.
 * @param {Actor} actor
 * @returns {object[]}
 */
export function getActorCounterDefs(actor) {
   const raw = actor?.getFlag?.(MODULE_ID, TC_FLAGS.definitions);
   return Array.isArray(raw) ? raw.map(normalizeCounter) : [];
}

/**
 * Read + normalise a token's override counter definitions.
 * @param {TokenDocument} tokenDoc
 * @returns {object[]}
 */
export function getTokenCounterDefs(tokenDoc) {
   const raw = tokenDoc?.getFlag?.(MODULE_ID, TC_FLAGS.definitions);
   return Array.isArray(raw) ? raw.map(normalizeCounter) : [];
}

/**
 * Effective definitions for a placed token: actor defs overlaid by token overrides.
 * A token override with the same id replaces the actor def; `disabled` removes it;
 * new ids are appended. Reads actor defs from tokenDoc.actor so unlinked tokens
 * inherit the base actor's definitions.
 * @param {TokenDocument} tokenDoc
 * @returns {object[]}
 */
export function getEffectiveCounterDefs(tokenDoc) {
   const actorDefs = getActorCounterDefs(tokenDoc?.actor ?? null);
   const tokenDefs = getTokenCounterDefs(tokenDoc);
   if (!tokenDefs.length) return actorDefs.filter(d => !d.disabled);

   const byId = new Map(actorDefs.map(d => [d.id, d]));
   for (const def of tokenDefs) {
      if (def.disabled) byId.delete(def.id);
      else byId.set(def.id, def);
   }
   return [...byId.values()];
}

/**
 * Read the per-token runtime state map.
 * @param {TokenDocument} tokenDoc
 * @returns {object}
 */
export function readCounterState(tokenDoc) {
   return tokenDoc?.getFlag?.(MODULE_ID, TC_FLAGS.state) ?? {};
}

/**
 * Write runtime state for a single counter. GM-authoritative for turn anchors.
 * @param {TokenDocument} tokenDoc
 * @param {string} counterId
 * @param {object|null} patch - Merged into the existing entry; null clears it.
 * @returns {Promise<void>}
 */
export async function writeCounterState(tokenDoc, counterId, patch) {
   if (!tokenDoc || !counterId) return;
   const key = `${TC_FLAGS.state}.${counterId}`;
   if (patch === null) {
      await tokenDoc.unsetFlag(MODULE_ID, key);
      return;
   }
   const current = readCounterState(tokenDoc)[counterId] ?? {};
   await tokenDoc.setFlag(MODULE_ID, key, { ...current, ...patch });
}

/**
 * Resolve the current value/max for a counter on a token.
 * @param {TokenDocument} tokenDoc
 * @param {object} def - Normalised counter definition.
 * @param {object} [state] - Optional pre-read state map.
 * @returns {{value: number, max: number|null, started: boolean}}
 */
export function resolveCounterValue(tokenDoc, def, state) {
   const entry = (state ?? readCounterState(tokenDoc))[def.id] ?? null;

   switch (def.type) {
      case COUNTER_TYPES.system.id: {
         const { value, max } = readSystemValue(tokenDoc?.actor, def.binding);
         return { value, max, started: true };
      }
      case COUNTER_TYPES.turns.id:
         return deriveTurnValue(def, entry);
      case COUNTER_TYPES.manual.id:
      case COUNTER_TYPES.script.id:
      default:
         return { value: Number(entry?.value ?? def.value ?? 0), max: def.max ?? null, started: true };
   }
}

/**
 * Derive a turn counter's value from its anchor and the active combat.
 * Stores only an anchor round; the value is computed on read (no per-tick writes).
 * @param {object} def
 * @param {object|null} anchor - { startRound } or null if not started.
 * @returns {{value: number, max: number|null, started: boolean}}
 */
export function deriveTurnValue(def, anchor) {
   const t = def.turns ?? {};
   const start = Number(t.start ?? 0);
   if (!anchor || !game.combat) {
      return { value: start, max: t.end ?? null, started: false };
   }
   const round = game.combat.round ?? 0;
   const elapsed = Math.max(0, round - Number(anchor.startRound ?? round));
   let value = t.direction === 'up' ? start + elapsed : start - elapsed;
   if (t.end != null) {
      value = t.direction === 'up' ? Math.min(value, t.end) : Math.max(value, t.end);
   }
   return { value, max: t.end ?? null, started: true };
}
