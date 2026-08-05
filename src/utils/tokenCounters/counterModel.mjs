/**
 * Normalisation + defaults for token-counter definitions.
 * Tolerant of partial input from macros, presets, and the config UI so the rest
 * of the subsystem can assume a complete, valid shape.
 * @module utils/tokenCounters/counterModel
 */
import {
   COUNTER_TYPES, SHAPES, FILL_MODES, VISIBILITY, VISIBLE_WHEN, HUD_MODES,
   ELEMENT_TYPES, COUNTER_DEFAULTS
} from '#config';

const VALID_TYPES = new Set(Object.values(COUNTER_TYPES).map(t => t.id));
const VALID_SHAPES = new Set(Object.values(SHAPES).map(s => s.id));
const VALID_FILL = new Set(Object.values(FILL_MODES).map(f => f.id));
const VALID_VIS = new Set(Object.values(VISIBILITY).map(v => v.id));
const VALID_WHEN = new Set(Object.values(VISIBLE_WHEN).map(v => v.id));
const VALID_HUD = new Set(Object.values(HUD_MODES).map(h => h.id));
const KINDS = new Set(['counter', 'button', 'dropdown']);

/**
 * Coerce a value to a finite number, else fallback.
 * @param {*} v
 * @param {number|null} [fallback]
 * @returns {number|null}
 */
function num(v, fallback = 0) {
   const n = Number(v);
   return Number.isFinite(n) ? n : fallback;
}

/**
 * Return `v` if it is a member of `set`, else `fallback`.
 * @param {Set<string>} set
 * @param {*} v
 * @param {string} fallback
 * @returns {string}
 */
function pick(set, v, fallback) {
   return set.has(v) ? v : fallback;
}

/**
 * Normalise a raw counter/element definition into a complete, valid object.
 * @param {object} [raw] - Partial definition.
 * @returns {object} Normalised definition.
 */
export function normalizeCounter(raw = {}) {
   const kind = KINDS.has(raw.kind) ? raw.kind : 'counter';
   const base = {
      id: typeof raw.id === 'string' && raw.id ? raw.id : foundry.utils.randomID(),
      kind,
      label: typeof raw.label === 'string' ? raw.label : '',
      disabled: raw.disabled === true,
      visibility: pick(VALID_VIS, raw.visibility, COUNTER_DEFAULTS.visibility),
      placement: normalizePlacement(raw.placement)
   };

   if (kind === 'counter') return { ...base, ...normalizeCounterBody(raw) };
   return { ...base, ...normalizeElement(raw, kind) };
}

/**
 * @param {object} [p]
 * @returns {{auto: boolean, angle: number, arcSpan: number, ring: number}}
 */
function normalizePlacement(p = {}) {
   return {
      auto: p.auto !== false,
      angle: num(p.angle, 0),
      arcSpan: num(p.arcSpan, 90),
      ring: Math.max(0, Math.trunc(num(p.ring, 0)))
   };
}

/**
 * @param {object} raw
 * @returns {object}
 */
function normalizeCounterBody(raw) {
   const visual = raw.visual ?? {};
   return {
      type: pick(VALID_TYPES, raw.type, COUNTER_DEFAULTS.type),
      binding: {
         valuePath: typeof raw.binding?.valuePath === 'string' ? raw.binding.valuePath : '',
         maxPath: typeof raw.binding?.maxPath === 'string' ? raw.binding.maxPath : null
      },
      value: num(raw.value, 0),
      min: raw.min == null ? null : num(raw.min, 0),
      max: raw.max == null ? null : num(raw.max, null),
      turns: normalizeTurns(raw.turns),
      visual: {
         shape: pick(VALID_SHAPES, visual.shape, COUNTER_DEFAULTS.shape),
         fillMode: pick(VALID_FILL, visual.fillMode, COUNTER_DEFAULTS.fillMode),
         color: typeof visual.color === 'string' ? visual.color : '#4caf50',
         thresholds: Array.isArray(visual.thresholds)
            ? visual.thresholds.map(t => ({ at: num(t.at), color: String(t.color ?? '#ffffff') }))
            : [],
         icon: typeof visual.icon === 'string' ? visual.icon : null,
         thickness: num(visual.thickness, 4),
         showText: visual.showText !== false
      },
      visibleWhen: pick(VALID_WHEN, raw.visibleWhen, COUNTER_DEFAULTS.visibleWhen)
   };
}

/**
 * @param {object} [t]
 * @returns {object}
 */
function normalizeTurns(t = {}) {
   return {
      direction: t.direction === 'up' ? 'up' : 'down',
      tickOn: t.tickOn === 'turn' ? 'turn' : 'round',
      start: num(t.start, 0),
      end: t.end == null ? null : num(t.end, null),
      expire: ['hide', 'keep', 'remove'].includes(t.expire) ? t.expire : 'hide',
      // Reserved for P7 advanced scripting; stored now, executed later.
      startEffect: t.startEffect ?? null,
      endEffect: t.endEffect ?? null
   };
}

/**
 * @param {object} raw
 * @param {string} kind - 'button' | 'dropdown'
 * @returns {object}
 */
function normalizeElement(raw, kind) {
   const el = {
      elementType: pick(new Set(Object.values(ELEMENT_TYPES).map(e => e.id)), kind, ELEMENT_TYPES.button.id),
      icon: typeof raw.icon === 'string' ? raw.icon : 'fas fa-bolt',
      color: typeof raw.color === 'string' ? raw.color : '#3f51b5',
      hudMode: pick(VALID_HUD, raw.hudMode, HUD_MODES.onSelect.id)
   };
   if (kind === 'dropdown') {
      el.options = Array.isArray(raw.options)
         ? raw.options.map(o => ({ label: String(o.label ?? ''), macro: o.macro ?? null }))
         : [];
   }
   else {
      el.macro = raw.macro ?? null;
   }
   return el;
}
