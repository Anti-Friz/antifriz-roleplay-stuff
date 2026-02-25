/**
 * Target Resolution for Weapon FX
 * Resolves source token and target tokens for FX playback.
 * @module utils/targetResolver
 */

import { debug } from './logger.mjs';

/**
 * Resolve target tokens for a weapon FX effect.
 *
 * Priority chain:
 * 1. Explicit targets (from API call or macro)
 * 2. Provider-specific target resolution (getTargets)
 * 3. Standard Foundry targeting (game.user.targets)
 * 4. No targets — source-only effects
 *
 * @param {object} context
 * @param {Token} [context.sourceToken] - The attacking token
 * @param {Item} context.item - The weapon/item being used
 * @param {Token[]} [context.explicitTargets] - Targets passed directly
 * @param {Function} [context.providerGetTargets] - Provider's custom target resolver
 * @param {object} [context.systemContext] - System-specific data
 * @returns {Token[]}
 */
export function resolveTargets(context) {
   const { sourceToken, item, explicitTargets, providerGetTargets, systemContext } = context;

   // 1. Explicit targets (from API call or macro)
   if (explicitTargets?.length) {
      debug('TargetResolver | Using explicit targets:', explicitTargets.length);
      return explicitTargets;
   }

   // 2. Provider-specific target resolution
   if (providerGetTargets) {
      try {
         const providerTargets = providerGetTargets(item, systemContext);
         if (providerTargets?.length) {
            debug('TargetResolver | Using provider targets:', providerTargets.length);
            return providerTargets;
         }
      } catch (err) {
         console.warn('[ARS] WeaponFX: Provider getTargets() failed:', err);
      }
   }

   // 3. Standard Foundry targeting (game.user.targets)
   const standardTargets = Array.from(game.user.targets)
      .filter(t => t.id !== sourceToken?.id);
   if (standardTargets.length) {
      debug('TargetResolver | Using game.user.targets:', standardTargets.length);
      return standardTargets;
   }

   // 4. No targets — play only source effects (muzzle flash + sound, no projectile)
   debug('TargetResolver | No targets found');
   return [];
}

/**
 * Resolve the source token (who fires the weapon).
 *
 * Priority:
 * 1. Explicitly passed sourceToken
 * 2. Single controlled token on canvas
 * 3. Token matching the item's parent actor
 *
 * @param {Item} item - The item being used
 * @param {Token} [explicitSource] - Explicitly provided source token
 * @returns {Token|null}
 */
export function resolveSourceToken(item, explicitSource) {
   // 1. Explicit source
   if (explicitSource) return explicitSource;

   // 2. Single controlled token
   const controlled = canvas.tokens?.controlled;
   if (controlled?.length === 1) return controlled[0];

   // 3. Token matching the item's parent actor
   const actor = item?.parent;
   if (actor) {
      const actorTokens = actor.getActiveTokens?.(true) ?? [];
      if (actorTokens.length === 1) return actorTokens[0];
   }

   debug('TargetResolver | Could not resolve source token');
   return null;
}
