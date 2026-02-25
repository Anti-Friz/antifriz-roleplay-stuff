/**
 * Defensive FX Service — Orchestration for reactive/persistent effects on tokens.
 *
 * Handles three categories of defensive effects:
 * 1. **Reactive** — one-shot effects on the defender token (shield hit, armor deflect/penetrate)
 * 2. **Persistent Aura** — intro → loop → outro pattern (energy shield, force field)
 * 3. **Sound** — per-event sound playback
 *
 * @module utils/defensiveFxService
 */

import { MODULE_ID, MODULE_LABEL } from '#config';
import { debug } from './logger.mjs';
import { isSequencerAvailable } from './fxRendererSequencer.mjs';
import { emitSocket } from './broadcastService.mjs';
import {
   playBuiltinReactiveEffect,
   playBuiltinAuraActivate,
   playBuiltinAuraDeactivate,
   playBuiltinShieldOverload,
   playBuiltinReactiveAuraFlash
} from './fxRendererBuiltin.mjs';

// ==========================================
// Default config shape
// ==========================================

/**
 * @typedef {Object} DefensiveFxConfig
 * @property {boolean} enabled
 * @property {DefensiveReactiveConfig} onHit - Effect when bearer takes damage through shield
 * @property {DefensiveReactiveConfig} onDeflect - Effect when armor/shield fully deflects
 * @property {DefensiveReactiveConfig} onPenetrate - Effect when armor is penetrated
 * @property {DefensiveAuraConfig} aura - Persistent shield/barrier on token
 */

/**
 * @typedef {Object} DefensiveReactiveConfig
 * @property {boolean} enabled
 * @property {DefensiveEffectSource} effect
 * @property {DefensiveSoundSource} sound
 * @property {number} scale
 */

/**
 * @typedef {Object} DefensiveAuraConfig
 * @property {boolean} enabled
 * @property {DefensiveEffectSource} loop - Looping persistent effect
 * @property {DefensiveEffectSource} intro - Intro effect (played once on activate)
 * @property {DefensiveEffectSource} outro - Outro effect (played once on deactivate)
 * @property {DefensiveSoundSource} activateSound
 * @property {DefensiveSoundSource} deactivateSound
 * @property {number} scale
 */

/**
 * @typedef {Object} DefensiveEffectSource
 * @property {string} source - 'sequencer' | 'custom'
 * @property {string} sequencerPath
 * @property {string} customFile
 */

/**
 * @typedef {Object} DefensiveSoundSource
 * @property {string} path
 * @property {number} volume
 */

/**
 * @typedef {Object} DefensiveEvent
 * @property {string} type - 'shieldHit' | 'armorDeflect' | 'armorPenetrate' | 'auraActivate' | 'auraDeactivate' | 'shieldOverload'
 * @property {Token} token - The defending token
 * @property {Token} [attacker] - The attacking token (for directional effects)
 */

export const DEFAULT_DEFENSIVE_FX = {
   enabled: false,
   onHit: {
      enabled: false,
      effect: { source: 'sequencer', sequencerPath: '', customFile: '' },
      sound: { path: '', volume: 0.8 },
      scale: 1.0
   },
   onDeflect: {
      enabled: false,
      effect: { source: 'sequencer', sequencerPath: '', customFile: '' },
      sound: { path: '', volume: 0.8 },
      scale: 1.0
   },
   onPenetrate: {
      enabled: false,
      effect: { source: 'sequencer', sequencerPath: '', customFile: '' },
      sound: { path: '', volume: 0.8 },
      scale: 1.0
   },
   aura: {
      enabled: false,
      mode: 'permanent',       // 'permanent' | 'rounds' | 'reactive'
      roundsDuration: 3,       // For 'rounds' mode — how many rounds the aura lasts
      loop: { source: 'sequencer', sequencerPath: '', customFile: '' },
      intro: { source: 'sequencer', sequencerPath: '', customFile: '' },
      outro: { source: 'sequencer', sequencerPath: '', customFile: '' },
      overloadEffect: { source: 'sequencer', sequencerPath: '', customFile: '' },
      activateSound: { path: '', volume: 0.8 },
      deactivateSound: { path: '', volume: 0.8 },
      overloadSound: { path: '', volume: 1.0 },
      scale: 1.5
   }
};

// ==========================================
// Config access
// ==========================================

/**
 * Get the merged defensive FX config for an item.
 * @param {Item} item
 * @returns {DefensiveFxConfig|null}
 */
export function getDefensiveFxConfig(item) {
   if (!item) return null;
   const saved = item.getFlag(MODULE_ID, 'defensiveFx');
   if (!saved?.enabled) return null;

   const d = DEFAULT_DEFENSIVE_FX;
   return {
      ...d,
      ...saved,
      onHit: {
         ...d.onHit, ...(saved.onHit ?? {}),
         effect: { ...d.onHit.effect, ...(saved.onHit?.effect ?? {}) },
         sound: { ...d.onHit.sound, ...(saved.onHit?.sound ?? {}) }
      },
      onDeflect: {
         ...d.onDeflect, ...(saved.onDeflect ?? {}),
         effect: { ...d.onDeflect.effect, ...(saved.onDeflect?.effect ?? {}) },
         sound: { ...d.onDeflect.sound, ...(saved.onDeflect?.sound ?? {}) }
      },
      onPenetrate: {
         ...d.onPenetrate, ...(saved.onPenetrate ?? {}),
         effect: { ...d.onPenetrate.effect, ...(saved.onPenetrate?.effect ?? {}) },
         sound: { ...d.onPenetrate.sound, ...(saved.onPenetrate?.sound ?? {}) }
      },
      aura: {
         ...d.aura, ...(saved.aura ?? {}),
         loop: { ...d.aura.loop, ...(saved.aura?.loop ?? {}) },
         intro: { ...d.aura.intro, ...(saved.aura?.intro ?? {}) },
         outro: { ...d.aura.outro, ...(saved.aura?.outro ?? {}) },
         overloadEffect: { ...d.aura.overloadEffect, ...(saved.aura?.overloadEffect ?? {}) },
         activateSound: { ...d.aura.activateSound, ...(saved.aura?.activateSound ?? {}) },
         deactivateSound: { ...d.aura.deactivateSound, ...(saved.aura?.deactivateSound ?? {}) },
         overloadSound: { ...d.aura.overloadSound, ...(saved.aura?.overloadSound ?? {}) }
      }
   };
}

// ==========================================
// Main entry point
// ==========================================

/**
 * Play defensive FX on a token.
 *
 * @param {Item} item - The defensive item (armor, shield, force field)
 * @param {DefensiveEvent} event - What happened
 * @returns {Promise<void>}
 */
export async function playDefensiveFx(item, event) {
   const config = getDefensiveFxConfig(item);
   if (!config) {
      debug('DefensiveFxService | FX not configured or disabled for item:', item?.name);
      return;
   }

   const { type, token } = event;
   if (!token) {
      debug('DefensiveFxService | No token provided, cannot play');
      return;
   }

   debug('DefensiveFxService | Playing', type, 'on', token.name);

   if (!isSequencerAvailable()) {
      await _playDefensiveBuiltin(config, event, item);
      // Broadcast to other clients (builtin renderer doesn't auto-sync)
      _broadcastDefensiveFx(item, event);
      return;
   }

   switch (type) {
      case 'shieldHit':
         await _playReactiveEffect(config.onHit, token, event.attacker);
         // In reactive mode, play a brief flash of the aura loop as well
         if (config.aura?.enabled && config.aura?.mode === 'reactive') {
            await _playReactiveAuraFlash(config.aura, token, event.attacker);
         }
         break;
      case 'armorDeflect':
         await _playReactiveEffect(config.onDeflect, token, event.attacker);
         break;
      case 'armorPenetrate':
         await _playReactiveEffect(config.onPenetrate, token, event.attacker);
         break;
      case 'auraActivate':
         await _playAuraActivate(config.aura, token, item);
         break;
      case 'auraDeactivate':
         await _playAuraDeactivate(config.aura, token, item);
         break;
      case 'shieldOverload':
         await _playShieldOverload(config.aura, token, item);
         break;
      default:
         debug('DefensiveFxService | Unknown event type:', type);
   }
}

// ==========================================
// Reactive effects (one-shot)
// ==========================================

/**
 * Play a one-shot reactive effect on a token (shield hit, deflect, penetrate).
 * @param {DefensiveReactiveConfig} reactiveConfig
 * @param {Token} token
 * @param {Token} [attacker] - For directional effects
 */
async function _playReactiveEffect(reactiveConfig, token, attacker) {
   if (!reactiveConfig?.enabled) return;

   const seq = new Sequence({ moduleName: MODULE_LABEL });

   // Sound
   if (reactiveConfig.sound?.path) {
      seq.sound()
         .file(reactiveConfig.sound.path)
         .volume(reactiveConfig.sound.volume ?? 0.8)
         .atLocation(token);
   }

   // Visual effect
   const file = _resolveFile(reactiveConfig.effect);
   if (file) {
      const effect = seq.effect()
         .file(file)
         .attachTo(token)
         .scaleToObject(reactiveConfig.scale ?? 1.0)
         .fadeIn(100)
         .fadeOut(300)
         .zIndex(15);

      // If we have an attacker, rotate toward them for directional shields
      if (attacker) {
         effect.rotateTowards(attacker);
      }
   }

   await seq.play();
}

// ==========================================
// Persistent aura (intro → loop → outro)
// ==========================================

/**
 * Activate a persistent aura on a token (intro → loop).
 * @param {DefensiveAuraConfig} auraConfig
 * @param {Token} token
 * @param {Item} item - For unique naming
 */
async function _playAuraActivate(auraConfig, token, item) {
   if (!auraConfig?.enabled) return;

   const auraName = `ars-aura-${token.id}-${item.id}`;
   const seq = new Sequence({ moduleName: MODULE_LABEL });

   // Activation sound
   if (auraConfig.activateSound?.path) {
      seq.sound()
         .file(auraConfig.activateSound.path)
         .volume(auraConfig.activateSound.volume ?? 0.8)
         .atLocation(token);
   }

   // Intro effect (play once, then chain into loop)
   const introFile = _resolveFile(auraConfig.intro);
   if (introFile) {
      seq.effect()
         .file(introFile)
         .attachTo(token)
         .scaleToObject(auraConfig.scale ?? 1.5)
         .waitUntilFinished(-500)
         .zIndex(5);
   }

   // Loop effect (persistent)
   const loopFile = _resolveFile(auraConfig.loop);
   if (loopFile) {
      seq.effect()
         .file(loopFile)
         .attachTo(token)
         .scaleToObject(auraConfig.scale ?? 1.5)
         .persist()
         .name(auraName)
         .origin(item.uuid)
         .fadeIn(300)
         .fadeOut(300)
         .extraEndDuration(800)
         .zIndex(5);
   }

   await seq.play();
   debug('DefensiveFxService | Aura activated:', auraName);
}

/**
 * Deactivate a persistent aura on a token (end loop → outro).
 * @param {DefensiveAuraConfig} auraConfig
 * @param {Token} token
 * @param {Item} item
 */
async function _playAuraDeactivate(auraConfig, token, item) {
   if (!auraConfig?.enabled) return;

   const auraName = `ars-aura-${token.id}-${item.id}`;

   // End the persistent loop effect
   try {
      Sequencer.EffectManager.endEffects({ name: auraName, object: token });
   } catch (err) {
      console.warn('[ARS] DefensiveFX: Error ending aura effect:', err);
   }

   const seq = new Sequence({ moduleName: MODULE_LABEL });

   // Deactivation sound
   if (auraConfig.deactivateSound?.path) {
      seq.sound()
         .file(auraConfig.deactivateSound.path)
         .volume(auraConfig.deactivateSound.volume ?? 0.8)
         .atLocation(token);
   }

   // Outro effect
   const outroFile = _resolveFile(auraConfig.outro);
   if (outroFile) {
      seq.effect()
         .file(outroFile)
         .attachTo(token)
         .scaleToObject(auraConfig.scale ?? 1.5)
         .zIndex(5);
   }

   await seq.play();
   debug('DefensiveFxService | Aura deactivated:', auraName);
}

/**
 * Play a brief aura flash in reactive mode (shield appears only on hit, then fades).
 * @param {DefensiveAuraConfig} auraConfig
 * @param {Token} token
 * @param {Token} [attacker]
 */
async function _playReactiveAuraFlash(auraConfig, token, attacker) {
   const loopFile = _resolveFile(auraConfig.loop);
   if (!loopFile) return;

   const seq = new Sequence({ moduleName: MODULE_LABEL });

   const effect = seq.effect()
      .file(loopFile)
      .attachTo(token)
      .scaleToObject(auraConfig.scale ?? 1.5)
      .duration(1500)
      .fadeIn(100)
      .fadeOut(800)
      .zIndex(5);

   if (attacker) {
      effect.rotateTowards(attacker);
   }

   await seq.play();
}

/**
 * Shield overload — dramatic collapse of the shield (end aura + explosion + sound).
 * @param {DefensiveAuraConfig} auraConfig
 * @param {Token} token
 * @param {Item} item
 */
async function _playShieldOverload(auraConfig, token, item) {
   if (!auraConfig?.enabled) return;

   const auraName = `ars-aura-${token.id}-${item.id}`;

   // End persistent aura
   try {
      Sequencer.EffectManager.endEffects({ name: auraName, object: token });
   } catch (err) {
      console.warn('[ARS] DefensiveFX: Error ending aura on overload:', err);
   }

   const seq = new Sequence({ moduleName: MODULE_LABEL });

   // Overload sound (falls back to deactivate sound)
   const overloadSnd = auraConfig.overloadSound?.path
      ? auraConfig.overloadSound
      : auraConfig.deactivateSound;
   if (overloadSnd?.path) {
      seq.sound()
         .file(overloadSnd.path)
         .volume(overloadSnd.volume ?? 1.0)
         .atLocation(token);
   }

   // Overload visual (falls back to outro)
   const overloadFile = _resolveFile(auraConfig.overloadEffect) || _resolveFile(auraConfig.outro);
   if (overloadFile) {
      seq.effect()
         .file(overloadFile)
         .attachTo(token)
         .scaleToObject((auraConfig.scale ?? 1.5) * 1.3)
         .fadeIn(50)
         .fadeOut(500)
         .zIndex(20);
   }

   await seq.play();
   debug('DefensiveFxService | Shield overloaded:', auraName);
}

// ==========================================
// Fallback: builtin PIXI renderer
// ==========================================

/**
 * Play defensive FX using builtin PIXI renderer (no Sequencer).
 * @param {DefensiveFxConfig} config
 * @param {DefensiveEvent} event
 * @param {Item} item
 */
async function _playDefensiveBuiltin(config, event, item) {
   const { type, token, attacker } = event;

   switch (type) {
      case 'shieldHit':
         playBuiltinReactiveEffect(config.onHit, token, attacker);
         if (config.aura?.enabled && config.aura?.mode === 'reactive') {
            playBuiltinReactiveAuraFlash(config.aura, token, attacker);
         }
         break;
      case 'armorDeflect':
         playBuiltinReactiveEffect(config.onDeflect, token, attacker);
         break;
      case 'armorPenetrate':
         playBuiltinReactiveEffect(config.onPenetrate, token, attacker);
         break;
      case 'auraActivate':
         playBuiltinAuraActivate(config.aura, token, item);
         break;
      case 'auraDeactivate':
         playBuiltinAuraDeactivate(config.aura, token, item);
         break;
      case 'shieldOverload':
         playBuiltinShieldOverload(config.aura, token, item);
         break;
   }
}

// ==========================================
// Helpers
// ==========================================

/**
 * Resolve effect file from a source config.
 * @param {DefensiveEffectSource} effectSource
 * @returns {string|null}
 */
function _resolveFile(effectSource) {
   if (!effectSource) return null;
   switch (effectSource.source) {
      case 'sequencer': return effectSource.sequencerPath || null;
      case 'custom': return effectSource.customFile || null;
      default: return null;
   }
}

// ==========================================
// Socket broadcast (builtin renderer only)
// ==========================================

/**
 * Broadcast defensive FX to other clients via socket.
 * @param {Item} item
 * @param {DefensiveEvent} event
 */
function _broadcastDefensiveFx(item, event) {
   if (!event.token) return;

   emitSocket('playDefensiveFx', {
      itemUuid: item.uuid,
      sceneId: canvas.scene?.id,
      tokenId: event.token.id,
      attackerId: event.attacker?.id ?? null,
      type: event.type
   });
}

/**
 * Handle incoming socket message for defensive FX (builtin renderer).
 * Called on remote clients.
 * @param {object} data
 */
export async function handlePlayDefensiveFxSocket(data) {
   const { itemUuid, sceneId, tokenId, attackerId, type } = data;

   if (canvas.scene?.id !== sceneId) return;

   const item = await fromUuid(itemUuid);
   if (!item) return;

   const token = canvas.tokens?.get(tokenId);
   if (!token) return;

   const attacker = attackerId ? canvas.tokens?.get(attackerId) : undefined;

   const config = getDefensiveFxConfig(item);
   if (!config) return;

   await _playDefensiveBuiltin(config, { type, token, attacker }, item);
}
