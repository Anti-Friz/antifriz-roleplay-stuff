/**
 * Token Counters subsystem constants.
 * Frozen enums describing how a counter is sourced, drawn, and gated.
 * @module config/tokenCounters
 */

/**
 * Flag keys used to persist counter data on Actor/Token documents.
 * `definitions` lives on the actor (shared) and/or token (override);
 * `state` (turn anchors, manual values) is always per-token.
 * @type {Readonly<{definitions: string, state: string}>}
 */
export const TC_FLAGS = Object.freeze({
   definitions: 'tokenCounters',
   state: 'tokenCounterState'
});

/**
 * Where a counter's value comes from.
 * @enum {{id: string, label: string}}
 */
export const COUNTER_TYPES = Object.freeze({
   system: { id: 'system', label: 'TOKENCOUNTERS.type.system' },
   turns:  { id: 'turns',  label: 'TOKENCOUNTERS.type.turns' },
   manual: { id: 'manual', label: 'TOKENCOUNTERS.type.manual' },
   script: { id: 'script', label: 'TOKENCOUNTERS.type.script' }
});

/**
 * Rendered shape for a counter.
 * @enum {{id: string, label: string}}
 */
export const SHAPES = Object.freeze({
   ring:    { id: 'ring',    label: 'TOKENCOUNTERS.shape.ring' },
   arc:     { id: 'arc',     label: 'TOKENCOUNTERS.shape.arc' },
   circle:  { id: 'circle',  label: 'TOKENCOUNTERS.shape.circle' },
   square:  { id: 'square',  label: 'TOKENCOUNTERS.shape.square' },
   polygon: { id: 'polygon', label: 'TOKENCOUNTERS.shape.polygon' },
   icon:    { id: 'icon',    label: 'TOKENCOUNTERS.shape.icon' }
});

/**
 * How a shape fills to represent value/max.
 * @enum {{id: string, label: string}}
 */
export const FILL_MODES = Object.freeze({
   depleteClockwise: { id: 'depleteClockwise', label: 'TOKENCOUNTERS.fill.depleteClockwise' },
   fillUp:           { id: 'fillUp',           label: 'TOKENCOUNTERS.fill.fillUp' },
   fixed:            { id: 'fixed',            label: 'TOKENCOUNTERS.fill.fixed' }
});

/**
 * Who can see a counter on the canvas.
 * @enum {{id: string, label: string}}
 */
export const VISIBILITY = Object.freeze({
   everyone: { id: 'everyone', label: 'TOKENCOUNTERS.visibility.everyone' },
   owners:   { id: 'owners',   label: 'TOKENCOUNTERS.visibility.owners' },
   gm:       { id: 'gm',       label: 'TOKENCOUNTERS.visibility.gm' }
});

/**
 * When interactive HUD elements (buttons/dropdowns) are shown.
 * @enum {{id: string, label: string}}
 */
export const HUD_MODES = Object.freeze({
   always:   { id: 'always',   label: 'TOKENCOUNTERS.hud.always' },
   onSelect: { id: 'onSelect', label: 'TOKENCOUNTERS.hud.onSelect' },
   onHover:  { id: 'onHover',  label: 'TOKENCOUNTERS.hud.onHover' }
});

/**
 * Optional predicate controlling whether a counter renders at all.
 * @enum {{id: string, label: string}}
 */
export const VISIBLE_WHEN = Object.freeze({
   always:        { id: 'always',        label: 'TOKENCOUNTERS.visibleWhen.always' },
   inCombat:      { id: 'inCombat',      label: 'TOKENCOUNTERS.visibleWhen.inCombat' },
   valuePositive: { id: 'valuePositive', label: 'TOKENCOUNTERS.visibleWhen.valuePositive' }
});

/**
 * Interactive element kinds bound to macros.
 * @enum {{id: string, label: string}}
 */
export const ELEMENT_TYPES = Object.freeze({
   button:   { id: 'button',   label: 'TOKENCOUNTERS.element.button' },
   dropdown: { id: 'dropdown', label: 'TOKENCOUNTERS.element.dropdown' }
});

/**
 * Default field values applied to a newly created counter definition.
 * @type {Readonly<object>}
 */
export const COUNTER_DEFAULTS = Object.freeze({
   type: COUNTER_TYPES.manual.id,
   shape: SHAPES.ring.id,
   fillMode: FILL_MODES.depleteClockwise.id,
   visibility: VISIBILITY.owners.id,
   visibleWhen: VISIBLE_WHEN.always.id
});
