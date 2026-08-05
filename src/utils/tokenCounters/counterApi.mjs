/**
 * Public API for the Token Counters subsystem.
 * Exposed at `game.modules.get(MODULE_ID).api.tokenCounters`.
 * @module utils/tokenCounters/counterApi
 */
import {
   MODULE_ID, TC_FLAGS,
   COUNTER_TYPES, SHAPES, FILL_MODES, VISIBILITY, HUD_MODES, VISIBLE_WHEN, ELEMENT_TYPES
} from '#config';
import { normalizeCounter } from './counterModel.mjs';
import {
   getActorCounterDefs, getEffectiveCounterDefs, resolveCounterValue, writeCounterState
} from './counterState.mjs';
import { refreshAllTokenCounters } from '../../canvas/TokenCounterOverlay.mjs';

const LOG_PREFIX = 'Antifriz Roleplay Stuff | tokenCounters';

/**
 * Resolve a target (Actor | Token | TokenDocument) to its TokenDocument, if any.
 * @param {*} target
 * @returns {TokenDocument|null}
 */
function asTokenDoc(target) {
   if (!target) return null;
   if (target.documentName === 'Token') return target;
   if (target.document?.documentName === 'Token') return target.document;
   return null;
}

/**
 * Resolve a target to its Actor, if any.
 * @param {*} target
 * @returns {Actor|null}
 */
function asActor(target) {
   if (!target) return null;
   if (target.documentName === 'Actor') return target;
   return asTokenDoc(target)?.actor ?? target.actor ?? null;
}

/**
 * Choose which document stores a definition.
 * `auto`: a Token/TokenDocument writes per-token; an Actor writes actor-wide.
 * @param {*} target
 * @param {'auto'|'actor'|'token'} scope
 * @returns {Actor|TokenDocument|null}
 */
function pickStore(target, scope) {
   if (scope === 'actor') return asActor(target);
   const tokenDoc = asTokenDoc(target);
   if (scope === 'token') return tokenDoc;
   if (tokenDoc && target.documentName !== 'Actor') return tokenDoc;
   return asActor(target);
}

/**
 * Read the raw (unnormalised) definition array from a document.
 * @param {Actor|TokenDocument} doc
 * @returns {object[]}
 */
function readDefs(doc) {
   const raw = doc?.getFlag?.(MODULE_ID, TC_FLAGS.definitions);
   return Array.isArray(raw) ? raw : [];
}

/**
 * @param {Actor|TokenDocument} doc
 * @param {object[]} defs
 * @returns {Promise<void>}
 */
async function writeDefs(doc, defs) {
   await doc.setFlag(MODULE_ID, TC_FLAGS.definitions, defs);
}

/**
 * Build the Token Counters public API object.
 * @returns {object} API namespace
 */
export function createTokenCountersApi() {
   return {
      version: 1,
      // Enum ids exposed so macro authors can build definitions without magic strings.
      config: Object.freeze({
         COUNTER_TYPES, SHAPES, FILL_MODES, VISIBILITY, HUD_MODES, VISIBLE_WHEN, ELEMENT_TYPES
      }),

      /** Redraw every token-counter overlay on the active scene (per-client). */
      refresh() { refreshAllTokenCounters(); },

      /**
       * Add a counter/element definition to an actor or token.
       * @param {Actor|Token|TokenDocument} target
       * @param {object} [definition] - Partial definition (normalised automatically).
       * @param {{scope?: 'auto'|'actor'|'token'}} [options]
       * @returns {Promise<object|null>} The stored definition, or null if no valid target.
       */
      async add(target, definition = {}, { scope = 'auto' } = {}) {
         const doc = pickStore(target, scope);
         if (!doc) { console.warn(`${LOG_PREFIX}.add(): no actor/token target`); return null; }
         const def = normalizeCounter(definition);
         await writeDefs(doc, [...readDefs(doc), def]);
         return def;
      },

      /**
       * Update an existing definition by id.
       * @param {Actor|Token|TokenDocument} target
       * @param {string} id
       * @param {object} [patch]
       * @param {{scope?: 'auto'|'actor'|'token'}} [options]
       * @returns {Promise<object|null>}
       */
      async update(target, id, patch = {}, { scope = 'auto' } = {}) {
         const doc = pickStore(target, scope);
         if (!doc) return null;
         const defs = readDefs(doc);
         const idx = defs.findIndex(d => d.id === id);
         if (idx === -1) return null;
         const merged = normalizeCounter({ ...defs[idx], ...patch, id });
         const next = defs.slice();
         next[idx] = merged;
         await writeDefs(doc, next);
         return merged;
      },

      /**
       * Remove a definition by id.
       * @param {Actor|Token|TokenDocument} target
       * @param {string} id
       * @param {{scope?: 'auto'|'actor'|'token'}} [options]
       * @returns {Promise<boolean>}
       */
      async remove(target, id, { scope = 'auto' } = {}) {
         const doc = pickStore(target, scope);
         if (!doc) return false;
         const defs = readDefs(doc);
         const next = defs.filter(d => d.id !== id);
         if (next.length === defs.length) return false;
         await writeDefs(doc, next);
         return true;
      },

      /**
       * Get effective definitions, with resolved values when a token is supplied.
       * @param {Actor|Token|TokenDocument} target
       * @returns {Array<{definition: object, value: number|null, max: number|null}>}
       */
      get(target) {
         const tokenDoc = asTokenDoc(target);
         if (tokenDoc) {
            const state = tokenDoc.getFlag(MODULE_ID, TC_FLAGS.state) ?? {};
            return getEffectiveCounterDefs(tokenDoc).map(def => {
               const { value, max } = resolveCounterValue(tokenDoc, def, state);
               return { definition: def, value, max };
            });
         }
         return getActorCounterDefs(asActor(target)).map(def => ({ definition: def, value: null, max: null }));
      },

      /**
       * Set a manual counter's value (stored per-token).
       * @param {Token|TokenDocument} target
       * @param {string} id
       * @param {number} value
       * @returns {Promise<boolean>}
       */
      async setValue(target, id, value) {
         const tokenDoc = asTokenDoc(target);
         if (!tokenDoc) { console.warn(`${LOG_PREFIX}.setValue(): requires a token target`); return false; }
         await writeCounterState(tokenDoc, id, { value: Number(value) || 0 });
         return true;
      },

      /** @todo P7 — register a custom counter type. */
      registerType() { console.warn(`${LOG_PREFIX}.registerType() is not implemented yet`); },

      /** @todo P7 — register a custom visibility condition. */
      registerCondition() { console.warn(`${LOG_PREFIX}.registerCondition() is not implemented yet`); }
   };
}
