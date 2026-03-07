/**
 * FX Trigger Manager — Provider registry and public API.
 * Manages the registration of trigger providers from external systems
 * and exposes the public API surface on game.modules.
 * @module utils/fxTriggerManager
 */

import { MODULE_ID } from '#config';
import { debug } from './logger.mjs';
import { playWeaponFx, getWeaponFxConfig } from './weaponFxService.mjs';
import { playDefensiveFx, getDefensiveFxConfig } from './defensiveFxService.mjs';
import { isSequencerAvailable } from './fxRendererSequencer.mjs';

/**
 * Registered providers map.
 * @type {Map<string, FxTriggerProvider>}
 */
const providers = new Map();

/**
 * Whether the manager has been initialized.
 * @type {boolean}
 */
let initialized = false;

/**
 * Initialize the FX Trigger Manager.
 * Sets up the public API and fires the provider registration hook.
 * Should be called during Hooks.once('ready') if enableWeaponFx is true.
 */
export function initFxTriggerManager() {
   if (initialized) return;
   initialized = true;

   // Expose public API
   const moduleData = game.modules.get(MODULE_ID);
   if (moduleData) {
      moduleData.api = {
         ...moduleData.api,
         // Core methods
         playWeaponFx: _apiPlayWeaponFx,
         playDefensiveFx: _apiPlayDefensiveFx,
         registerFxProvider: _apiRegisterProvider,
         unregisterFxProvider: _apiUnregisterProvider,
         isSequencerAvailable,
         getWeaponFxConfig,
         getDefensiveFxConfig,

         // Convenience shorthands for defensive FX
         shieldHit: (item, token, attacker) => _apiPlayDefensiveFx(item, { type: 'shieldHit', token, attacker }),
         armorDeflect: (item, token, attacker) => _apiPlayDefensiveFx(item, { type: 'armorDeflect', token, attacker }),
         armorPenetrate: (item, token, attacker) => _apiPlayDefensiveFx(item, { type: 'armorPenetrate', token, attacker }),
         auraActivate: (item, token) => _apiPlayDefensiveFx(item, { type: 'auraActivate', token }),
         auraDeactivate: (item, token) => _apiPlayDefensiveFx(item, { type: 'auraDeactivate', token }),
         shieldOverload: (item, token) => _apiPlayDefensiveFx(item, { type: 'shieldOverload', token })
      };
   }

   debug('FxTriggerManager | Initialized, firing registerProviders hook');

   // Fire hook so external systems can register providers
   Hooks.callAll(`${MODULE_ID}.registerProviders`, moduleData?.api);
}

/**
 * Tear down the manager and all providers.
 */
export function destroyFxTriggerManager() {
   for (const [id, provider] of providers) {
      try {
         provider.destroy?.();
      } catch (err) {
         console.warn(`[ARS] WeaponFX: Error destroying provider '${id}':`, err);
      }
   }
   providers.clear();
   initialized = false;
   debug('FxTriggerManager | Destroyed');
}

// ==========================================
// Public API methods
// ==========================================

/**
 * Determine if the current user is the "primary trigger" for FX on this item.
 * Prevents duplicate FX when provider hooks fire on ALL connected clients
 * (each client would create its own Sequencer sequence / builtin playback,
 *  causing N sounds to play simultaneously instead of one).
 *
 * Priority:
 * 1. User has the actor's token controlled → primary (handles macros where GM controls a player's token)
 * 2. Non-GM user who owns the actor → primary
 * 3. GM when no active player owner exists → primary (NPCs, offline players)
 *
 * @param {Item} item - The item being used
 * @returns {boolean}
 */
function _isPrimaryTrigger(item) {
   const actor = item?.parent;
   if (!actor) return true;

   // If the user has the actor's token currently controlled (selected), they are the trigger.
   // This covers macros where a GM selects a player's token and fires manually.
   const controlled = canvas.tokens?.controlled ?? [];
   if (controlled.length > 0) {
      const actorTokens = actor.getActiveTokens?.(true) ?? [];
      if (actorTokens.some(t => controlled.some(c => c.id === t.id))) {
         return true;
      }
   }

   // Non-GM user who owns the actor is always the primary trigger
   if (!game.user.isGM && actor.isOwner) return true;

   // GM triggers only when no active player owner is online
   // (if the owning player is connected, their client handles the trigger
   //  and Sequencer / socket broadcast delivers FX to everyone else)
   if (game.user.isGM) {
      const hasActivePlayerOwner = game.users.some(
         u => u.active && !u.isGM && actor.testUserPermission(u, 'OWNER')
      );
      return !hasActivePlayerOwner;
   }

   return false;
}

/**
 * API: Play weapon FX for an item.
 * @param {Item} item - The item to play FX for
 * @param {object} [options] - See weaponFxService.playWeaponFx for options
 * @returns {Promise<void>}
 */
async function _apiPlayWeaponFx(item, options = {}) {
   if (!game.settings.get(MODULE_ID, 'enableWeaponFx')) {
      debug('FxTriggerManager | Subsystem disabled, ignoring playWeaponFx call');
      return;
   }
   if (!_isPrimaryTrigger(item)) {
      debug('FxTriggerManager | Skipping FX — deferring to primary owner client');
      return;
   }
   return playWeaponFx(item, options);
}

/**
 * API: Play defensive FX on a token.
 * @param {Item} item - The defensive item (armor, shield, force field)
 * @param {DefensiveEvent} event - { type, token, attacker? }
 * @returns {Promise<void>}
 */
async function _apiPlayDefensiveFx(item, event = {}) {
   if (!game.settings.get(MODULE_ID, 'enableWeaponFx')) {
      debug('FxTriggerManager | Subsystem disabled, ignoring playDefensiveFx call');
      return;
   }
   if (!_isPrimaryTrigger(item)) {
      debug('FxTriggerManager | Skipping defensive FX — deferring to primary owner client');
      return;
   }
   return playDefensiveFx(item, event);
}

/**
 * API: Register a trigger provider.
 * @param {FxTriggerProvider} provider
 */
function _apiRegisterProvider(provider) {
   if (!provider?.id) {
      console.error('[ARS] WeaponFX: Cannot register provider without id');
      return;
   }

   // Check system filter
   if (provider.systemId && provider.systemId !== '*' && provider.systemId !== game.system?.id) {
      debug(`FxTriggerManager | Skipping provider '${provider.id}' (system '${provider.systemId}' != '${game.system?.id}')`);
      return;
   }

   if (providers.has(provider.id)) {
      console.warn(`[ARS] WeaponFX: Provider '${provider.id}' already registered, replacing`);
      try {
         providers.get(provider.id).destroy?.();
      } catch (err) {
         console.warn(`[ARS] WeaponFX: Error destroying old provider '${provider.id}':`, err);
      }
   }

   providers.set(provider.id, provider);
   debug(`FxTriggerManager | Registered provider '${provider.id}' (${provider.label})`);

   // Initialize the provider
   try {
      provider.init?.();
   } catch (err) {
      console.error(`[ARS] WeaponFX: Provider '${provider.id}' init() failed:`, err);
   }
}

/**
 * API: Unregister a trigger provider.
 * @param {string} providerId
 */
function _apiUnregisterProvider(providerId) {
   const provider = providers.get(providerId);
   if (!provider) return;

   try {
      provider.destroy?.();
   } catch (err) {
      console.warn(`[ARS] WeaponFX: Error destroying provider '${providerId}':`, err);
   }

   providers.delete(providerId);
   debug(`FxTriggerManager | Unregistered provider '${providerId}'`);
}

/**
 * Get a registered provider by ID.
 * @param {string} id
 * @returns {FxTriggerProvider|undefined}
 */
export function getProvider(id) {
   return providers.get(id);
}

/**
 * Get all registered provider IDs.
 * @returns {string[]}
 */
export function getProviderIds() {
   return Array.from(providers.keys());
}
