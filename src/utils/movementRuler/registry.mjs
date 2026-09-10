/**
 * Registry of Movement Ruler speed providers.
 *
 * @module utils/movementRuler/registry
 */

import { MODULE_ID } from '#config';
import {
   MR_MEASUREMENT_MODES,
   MR_NATIVE_PROVIDER_ID,
   MR_SETTINGS,
   MR_UNREACHABLE_COLOR_ID,
   mrColorSettingKey,
   mrProviderSettingKey
} from '../../config/movementRuler.mjs';
import { error as logError } from '../logger.mjs';
import { GenericSpeedProvider } from './GenericSpeedProvider.mjs';
import { SpeedProvider } from './SpeedProvider.mjs';

/** @type {Map<string, SpeedProvider>} */
const providers = new Map();

/** @type {SpeedProvider|undefined} */
let activeProvider;

/**
 * All registered providers keyed by id.
 * @returns {Map<string, SpeedProvider>}
 */
export function getSpeedProviders() {
   return providers;
}

/**
 * The provider currently selected in the settings.
 * @returns {SpeedProvider|undefined}
 */
export function getActiveSpeedProvider() {
   return activeProvider;
}

/**
 * Provider that is used when the configured one is unavailable.
 * Systems win over modules, modules win over the built-in provider.
 * @returns {string}
 */
export function getDefaultSpeedProviderId() {
   const ids = [...providers.keys()];
   return ids.find((id) => id.startsWith('system.'))
      ?? ids.find((id) => id.startsWith('module.'))
      ?? MR_NATIVE_PROVIDER_ID;
}

/**
 * Re-resolve the active provider from the current setting value.
 */
export function refreshActiveSpeedProvider() {
   const configured = game.settings.get(MODULE_ID, MR_SETTINGS.speedProvider);
   activeProvider = providers.get(configured) ?? providers.get(getDefaultSpeedProviderId());
}

/**
 * Register the colour and provider settings of a provider, then activate it.
 * @param {SpeedProvider} provider
 */
function setupProvider(provider) {
   const unreachable = {
      id: MR_UNREACHABLE_COLOR_ID,
      default: provider.defaultUnreachableColor,
      name: 'MOVEMENTRULER.speeds.Unreachable'
   };

   for (const color of [...provider.colors, unreachable]) {
      game.settings.register(MODULE_ID, mrColorSettingKey(provider.id, color.id), {
         scope: 'client',
         config: false,
         type: Number,
         default: color.default
      });
   }

   for (const setting of provider.settings) {
      game.settings.register(MODULE_ID, mrProviderSettingKey(provider.id, setting.id), {
         ...setting,
         config: false
      });
   }

   providers.set(provider.id, provider);

   const providerSetting = game.settings.settings.get(`${MODULE_ID}.${MR_SETTINGS.speedProvider}`);
   if (providerSetting) providerSetting.default = getDefaultSpeedProviderId();

   refreshActiveSpeedProvider();
}

/**
 * Instantiate and register a provider class.
 * @param {string} id - Fully qualified provider id.
 * @param {typeof SpeedProvider} ProviderClass
 * @returns {boolean} Whether registration succeeded.
 */
function register(id, ProviderClass) {
   if (!(ProviderClass?.prototype instanceof SpeedProvider)) {
      logError(`Movement Ruler | "${id}" tried to register a speed provider that does not extend SpeedProvider.`);
      return false;
   }

   if (providers.has(id)) {
      logError(`Movement Ruler | A speed provider with the id "${id}" is already registered.`);
      return false;
   }

   try {
      setupProvider(new ProviderClass(id));
      return true;
   }
   catch (err) {
      logError(`Movement Ruler | Failed to register the speed provider "${id}".`, err);
      return false;
   }
}

/**
 * Register a speed provider on behalf of the active game system.
 * @param {string} systemId - Must match `game.system.id`.
 * @param {typeof SpeedProvider} ProviderClass
 * @returns {boolean}
 */
export function registerSystemSpeedProvider(systemId, ProviderClass) {
   if (game.system.id !== systemId) {
      logError(
         `Movement Ruler | A speed provider was registered with the system id "${systemId}", ` +
         `but the active system is "${game.system.id}". The registration was ignored.`
      );
      return false;
   }
   return register(`system.${systemId}`, ProviderClass);
}

/**
 * Register a speed provider on behalf of a module.
 * @param {string} moduleId - Must match an active module id.
 * @param {typeof SpeedProvider} ProviderClass
 * @returns {boolean}
 */
export function registerModuleSpeedProvider(moduleId, ProviderClass) {
   if (!game.modules.get(moduleId)?.active) {
      logError(
         `Movement Ruler | A speed provider was registered with the module id "${moduleId}", ` +
         'but no active module with that id exists. The registration was ignored.'
      );
      return false;
   }
   return register(`module.${moduleId}`, ProviderClass);
}

/**
 * Register the built-in generic provider. Called once during `init`.
 */
export function initSpeedProviders() {
   if (providers.has(MR_NATIVE_PROVIDER_ID)) return;
   setupProvider(new GenericSpeedProvider(MR_NATIVE_PROVIDER_ID));
}

/**
 * Resolve the ranges of the active provider for a token, with colours already
 * translated from colour ids into concrete numeric colours.
 * @param {Token} token
 * @returns {Array<{range: number, color: number}>} Ranges sorted ascending.
 */
export function getRangesForToken(token) {
   const provider = activeProvider;
   if (!provider || !token) return [];

   try {
      return provider.getRanges(token)
         .filter((range) => Number.isFinite(range?.range))
         .map((range) => ({ range: range.range, color: provider.getColor(range.color) }))
         .sort((a, b) => a.range - b.range);
   }
   catch (err) {
      logError(`Movement Ruler | The speed provider "${provider.id}" threw while computing ranges.`, err);
      return [];
   }
}

/**
 * Colour used for distances beyond every range of the active provider.
 * @returns {number}
 */
export function getUnreachableColor() {
   return activeProvider?.getColor(MR_UNREACHABLE_COLOR_ID) ?? 0xff0000;
}

/**
 * Pick the colour matching a travelled distance.
 * @param {number} distance
 * @param {Token} token
 * @param {Array<{range: number, color: number}>} [ranges] - Pre-computed ranges.
 * @returns {number|null} The colour, or `null` when no ranges are available.
 */
export function getColorForDistanceAndToken(distance, token, ranges) {
   const speedRanges = ranges ?? getRangesForToken(token);
   if (speedRanges.length === 0) return null;

   const travelled = Math.round(distance * 100) / 100;
   const match = speedRanges.find((range) => travelled <= range.range);
   return match ? match.color : getUnreachableColor();
}

/**
 * The measurement value of a ruler waypoint that ranges are compared against.
 * @param {object} waypoint - A `TokenRulerWaypoint`.
 * @param {string} [mode] - Measurement mode; read from settings when omitted.
 * @returns {number}
 */
export function getWaypointMeasurement(waypoint, mode) {
   const measurementMode = mode ?? game.settings.get(MODULE_ID, MR_SETTINGS.measurement);
   const measurement = waypoint?.measurement ?? {};
   const value = measurementMode === MR_MEASUREMENT_MODES.DISTANCE ? measurement.distance : measurement.cost;
   return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}
