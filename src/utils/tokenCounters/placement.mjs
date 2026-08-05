/**
 * 360-degree layout for token counters.
 * Full "ring" counters stack into concentric rings; other shapes are distributed
 * as badges/segments around the token, sibling-aware.
 * @module utils/tokenCounters/placement
 */

const TOP_DEG = -90; // 12 o'clock

/**
 * Assign a ring index and angular position to each counter definition.
 * @param {object[]} defs - Normalised counter definitions (kind === 'counter').
 * @returns {Array<{def: object, isRing: boolean, ringIndex: number, angleCenterDeg: number, arcSpanDeg: number}>}
 */
export function layoutCounters(defs) {
   const rings = [];
   const badges = [];
   for (const def of defs) {
      if (def.visual?.shape === 'ring') rings.push(def);
      else badges.push(def);
   }

   const out = [];
   rings.forEach((def, i) => {
      out.push({ def, isRing: true, ringIndex: i, angleCenterDeg: TOP_DEG, arcSpanDeg: 360 });
   });

   const autoBadges = badges.filter(d => d.placement?.auto !== false);
   const manualBadges = badges.filter(d => d.placement?.auto === false);

   const step = autoBadges.length ? 360 / autoBadges.length : 0;
   autoBadges.forEach((def, i) => {
      const isArc = def.visual?.shape === 'arc';
      out.push({
         def,
         isRing: false,
         ringIndex: 0,
         angleCenterDeg: TOP_DEG + i * step,
         arcSpanDeg: isArc ? Math.min(def.placement?.arcSpan ?? step, step) : (def.placement?.arcSpan ?? 40)
      });
   });

   for (const def of manualBadges) {
      out.push({
         def,
         isRing: false,
         ringIndex: Math.max(0, def.placement?.ring ?? 0),
         angleCenterDeg: def.placement?.angle ?? TOP_DEG,
         arcSpanDeg: def.placement?.arcSpan ?? 40
      });
   }
   return out;
}
