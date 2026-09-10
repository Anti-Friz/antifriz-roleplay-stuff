/**
 * Movement Ruler barrel export.
 * @module utils/movementRuler
 */

import { GenericSpeedProvider } from './GenericSpeedProvider.mjs';
import { SpeedProvider } from './SpeedProvider.mjs';
import {
   getActiveSpeedProvider,
   getColorForDistanceAndToken,
   getRangesForToken,
   getSpeedProviders,
   getUnreachableColor,
   registerModuleSpeedProvider,
   registerSystemSpeedProvider
} from './registry.mjs';

export * from './registry.mjs';
export * from './colors.mjs';
export { SpeedProvider } from './SpeedProvider.mjs';
export { GenericSpeedProvider } from './GenericSpeedProvider.mjs';

/**
 * Build the public API surface exposed as
 * `game.modules.get('antifriz-roleplay-stuff').api.movementRuler`.
 * @returns {object}
 */
export function createMovementRulerApi() {
   return {
      SpeedProvider,
      GenericSpeedProvider,
      registerSystem: registerSystemSpeedProvider,
      registerModule: registerModuleSpeedProvider,
      getRangesForToken,
      getColorForDistanceAndToken,
      getUnreachableColor,
      get providers() { return getSpeedProviders(); },
      get activeProvider() { return getActiveSpeedProvider(); }
   };
}
