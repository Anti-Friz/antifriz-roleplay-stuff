/**
 * Token Counters subsystem hook registration.
 * @module hooks/tokenCounters
 */
import { MODULE_ID } from '#config';
import {
   refreshTokenCounters, removeTokenCounters,
   refreshAllTokenCounters, refreshActorTokenCounters
} from '../canvas/TokenCounterOverlay.mjs';

let hooksRegistered = false;

/** @returns {boolean} Whether the subsystem is enabled. */
function enabled() {
   return game.settings.get(MODULE_ID, 'enableTokenCounters');
}

/**
 * Register hooks for the Token Counters subsystem.
 * Hooks are always registered at `init`; each handler is gated by the setting.
 */
export function registerTokenCounterHooks() {
   if (hooksRegistered) return;
   hooksRegistered = true;

   Hooks.on('drawToken', token => { if (enabled()) refreshTokenCounters(token); });
   Hooks.on('destroyToken', token => removeTokenCounters(token));
   Hooks.on('canvasReady', () => { if (enabled()) refreshAllTokenCounters(); });
   Hooks.on('updateToken', tokenDoc => {
      if (!enabled()) return;
      const token = tokenDoc.object;
      if (token) refreshTokenCounters(token);
   });
   Hooks.on('updateActor', actor => { if (enabled()) refreshActorTokenCounters(actor); });
}

/**
 * Initialise the Token Counters subsystem when enabled.
 * Invoked from `ready` only when the `enableTokenCounters` setting is on.
 */
export function initTokenCounters() {
   console.log(`${MODULE_ID} | Token Counters subsystem enabled`);
   refreshAllTokenCounters();
}
