/**
 * Movement Ruler subsystem constants.
 *
 * Colours the native Foundry V14 Token drag ruler (`CONFIG.Token.rulerClass`)
 * according to how far the dragged token may still move.
 *
 * @module config/movementRuler
 */

/** Foundry setting keys owned by this subsystem. */
export const MR_SETTINGS = Object.freeze({
   enabled: 'enableMovementRuler',
   speedProvider: 'movementRulerSpeedProvider',
   measurement: 'movementRulerMeasurement',
   highlightGrid: 'movementRulerHighlightGrid',
   colorWaypoints: 'movementRulerColorWaypoints',
   observerOnly: 'movementRulerObserverOnly'
});

/** Id of the built-in provider that reads a configurable actor attribute. */
export const MR_NATIVE_PROVIDER_ID = 'native';

/** Reserved colour id used for distances beyond every declared range. */
export const MR_UNREACHABLE_COLOR_ID = 'unreachable';

/**
 * Hook fired once during `init` so game systems and modules can register their
 * own speed providers. Listeners must be attached at top-level script scope.
 */
export const MR_READY_HOOK = 'antifriz-roleplay-stuff.movementRulerReady';

/** Which value of `waypoint.measurement` is compared against provider ranges. */
export const MR_MEASUREMENT_MODES = Object.freeze({
   COST: 'cost',
   DISTANCE: 'distance'
});

/** Default colour of ranges that no provider range covers. */
export const MR_DEFAULT_UNREACHABLE_COLOR = 0xff0000;

/** Default palette of the built-in generic provider. */
export const MR_GENERIC_COLORS = Object.freeze({
   WALK: 0x00ff00,
   DASH: 0xffff00
});

/** Default dash multiplier of the built-in generic provider. */
export const MR_DEFAULT_DASH_MULTIPLIER = 2;

/**
 * Build the setting key that stores a provider colour.
 * @param {string} providerId
 * @param {string} colorId
 * @returns {string}
 */
export function mrColorSettingKey(providerId, colorId) {
   return `movementRuler.${providerId}.color.${colorId}`;
}

/**
 * Build the setting key that stores a provider-specific setting.
 * @param {string} providerId
 * @param {string} settingId
 * @returns {string}
 */
export function mrProviderSettingKey(providerId, settingId) {
   return `movementRuler.${providerId}.setting.${settingId}`;
}
