/**
 * Reflection over an actor's data model to discover bindable numeric properties.
 * Used by the config UI (property picker) and by system-bound counters.
 * @module utils/tokenCounters/reflection
 */

const MAX_DEPTH = 5;

/**
 * Discover bindable properties on an actor's system data.
 * Objects exposing numeric `value` + `max` become "bar" bindings (value + max);
 * remaining numeric leaves become plain "value" bindings.
 * Pass `token.actor` so unlinked tokens reflect their own (delta) data.
 * @param {Actor} actor
 * @returns {Array<{valuePath: string, maxPath: string|null, label: string, hasMax: boolean}>}
 */
export function getBindableProperties(actor) {
   const system = actor?.system;
   if (!system || typeof system !== 'object') return [];

   const bars = [];
   const values = [];
   const covered = new Set();

   const walk = (obj, prefix, depth) => {
      if (depth > MAX_DEPTH || obj == null || typeof obj !== 'object') return;
      for (const [key, val] of Object.entries(obj)) {
         const path = prefix ? `${prefix}.${key}` : key;
         if (typeof val === 'number') {
            values.push(path);
         }
         else if (val && typeof val === 'object' && !Array.isArray(val)) {
            if (typeof val.value === 'number' && typeof val.max === 'number') {
               bars.push(path);
               covered.add(`${path}.value`);
               covered.add(`${path}.max`);
            }
            walk(val, path, depth + 1);
         }
      }
   };
   walk(system, '', 0);

   const out = [];
   for (const p of bars) {
      out.push({ valuePath: `${p}.value`, maxPath: `${p}.max`, label: p, hasMax: true });
   }
   for (const p of values) {
      if (covered.has(p)) continue;
      out.push({ valuePath: p, maxPath: null, label: p, hasMax: false });
   }
   out.sort((a, b) => a.label.localeCompare(b.label));
   return out;
}

/**
 * Read a bound value (and optional max) from an actor's system data.
 * @param {Actor} actor - Use token.actor for correct per-token (unlinked) values.
 * @param {{valuePath: string, maxPath: string|null}} binding
 * @returns {{value: number, max: number|null}}
 */
export function readSystemValue(actor, binding) {
   if (!actor?.system || !binding?.valuePath) return { value: 0, max: null };
   const value = Number(foundry.utils.getProperty(actor.system, binding.valuePath)) || 0;
   let max = null;
   if (binding.maxPath) {
      const raw = Number(foundry.utils.getProperty(actor.system, binding.maxPath));
      max = Number.isFinite(raw) ? raw : null;
   }
   return { value, max };
}
