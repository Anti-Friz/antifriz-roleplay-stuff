/**
 * Movement Ruler subsystem: settings, provider bootstrapping and installation
 * of the coloured Token ruler.
 *
 * @module hooks/movementRuler
 */

import { MODULE_ID } from '#config';
import {
   MR_MEASUREMENT_MODES,
   MR_NATIVE_PROVIDER_ID,
   MR_READY_HOOK,
   MR_SETTINGS
} from '../config/movementRuler.mjs';
import { installMovementRuler } from '../canvas/AFTokenRuler.mjs';
import {
   createMovementRulerApi,
   initSpeedProviders,
   refreshActiveSpeedProvider
} from '../utils/movementRuler/_module.mjs';
import { MovementRulerApp } from '../apps/settings/MovementRulerApp.mjs';

/**
 * Opens the Svelte configuration app; `registerMenu` requires an
 * ApplicationV2 (or FormApplication) subclass, which TRL's SvelteApp is not.
 */
class MovementRulerMenuProxy extends foundry.applications.api.ApplicationV2 {
   static DEFAULT_OPTIONS = { id: 'movement-ruler-menu-proxy' };

   /** @inheritdoc */
   async render() {
      MovementRulerApp.open();
      return this;
   }
}

/**
 * Register all Movement Ruler settings. Must run before providers are created.
 */
export function registerMovementRulerSettings() {
   game.settings.register(MODULE_ID, MR_SETTINGS.enabled, {
      name: 'SETTINGS.enableMovementRuler.Name',
      hint: 'SETTINGS.enableMovementRuler.Hint',
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      restricted: true
   });

   game.settings.register(MODULE_ID, MR_SETTINGS.speedProvider, {
      scope: 'world',
      config: false,
      type: String,
      default: MR_NATIVE_PROVIDER_ID,
      onChange: () => refreshActiveSpeedProvider()
   });

   game.settings.register(MODULE_ID, MR_SETTINGS.measurement, {
      scope: 'world',
      config: false,
      type: String,
      choices: {
         [MR_MEASUREMENT_MODES.COST]: 'MOVEMENTRULER.measurement.Cost',
         [MR_MEASUREMENT_MODES.DISTANCE]: 'MOVEMENTRULER.measurement.Distance'
      },
      default: MR_MEASUREMENT_MODES.COST
   });

   game.settings.register(MODULE_ID, MR_SETTINGS.observerOnly, {
      scope: 'world',
      config: false,
      type: Boolean,
      default: true
   });

   game.settings.register(MODULE_ID, MR_SETTINGS.highlightGrid, {
      scope: 'client',
      config: false,
      type: Boolean,
      default: true
   });

   game.settings.register(MODULE_ID, MR_SETTINGS.colorWaypoints, {
      scope: 'client',
      config: false,
      type: Boolean,
      default: true
   });

   game.settings.registerMenu(MODULE_ID, 'movementRulerMenu', {
      name: 'SETTINGS.movementRulerMenu.Name',
      label: 'SETTINGS.movementRulerMenu.Label',
      hint: 'SETTINGS.movementRulerMenu.Hint',
      icon: 'fas fa-ruler',
      type: MovementRulerMenuProxy,
      restricted: false
   });
}

/**
 * Bootstrap the subsystem during `init`: create the built-in provider, expose
 * the public API and let systems/modules register their own providers.
 */
export function registerMovementRulerHooks() {
   initSpeedProviders();

   const api = createMovementRulerApi();
   const mod = game.modules.get(MODULE_ID);
   if (mod) mod.api = { ...(mod.api ?? {}), movementRuler: api };

   // Fired during `init` so listeners must be registered at top-level scope.
   Hooks.callAll(MR_READY_HOOK, api);

   // Deferred to `setup` so a system-provided ruler class is wrapped, not replaced.
   Hooks.once('setup', () => installMovementRuler());
}
