/**
 * Weapon FX Service — Main orchestration layer.
 * Reads FX config from item flags, resolves targets, generates shot events,
 * picks sounds, and delegates to the appropriate renderer.
 * @module utils/weaponFxService
 */

import { MODULE_ID } from '#config';
import { debug } from './logger.mjs';
import { resolveTargets, resolveSourceToken } from './targetResolver.mjs';
import { playWithSequencer, isSequencerAvailable } from './fxRendererSequencer.mjs';
import { playWithBuiltin } from './fxRendererBuiltin.mjs';
import { emitSocket } from './broadcastService.mjs';

/**
 * Default FX config shape (used for merging with saved data)
 */
const DEFAULT_WEAPON_FX = {
   enabled: false,
   fxType: 'ranged',
   sounds: [],
   soundMode: 'random',
   jam: {
      sound: { path: '', volume: 0.8 },
      catastrophicSound: { path: '', volume: 1.0 },
      catastrophicEffect: {
         enabled: false,
         source: 'sequencer',
         sequencerPath: '',
         customFile: '',
         scale: 1.0
      }
   },
   rateOfFire: {
      mode: 'single',
      burstCount: 3,
      autoCount: 5,
      delayBetweenShots: 100,
      randomizeDelay: true
   },
   projectile: {
      enabled: false,
      source: 'sequencer',
      sequencerPath: '',
      customFile: '',
      builtinType: 'tracer',
      travelMode: 'beam',
      color: '#ffaa00',
      scale: 1.0,
      speed: 1.0,
      scatter: 0.3,
      randomizeMirrorY: false
   },
   impact: {
      enabled: false,
      source: 'sequencer',
      sequencerPath: '',
      customFile: '',
      builtinType: 'flash',
      color: '#ff4400',
      scale: 0.5,
      randomOffset: 0.3
   },
   muzzle: {
      enabled: false,
      source: 'sequencer',
      sequencerPath: '',
      customFile: '',
      builtinType: 'flash',
      color: '#ffff00',
      scale: 0.5
   },
   casing: {
      enabled: false,
      source: 'sequencer',
      sequencerPath: '',
      customFile: '',
      scale: 0.3,
      persist: true,
      duration: 0,
      scatter: 0.5,
      ejectDirection: 'right'
   }
};

/**
 * Get the merged FX configuration for an item.
 * @param {Item} item
 * @returns {WeaponFxConfig|null} - null if not configured or disabled
 */
export function getWeaponFxConfig(item) {
   if (!item) return null;
   const saved = item.getFlag(MODULE_ID, 'weaponFx');
   if (!saved?.enabled) return null;
   return {
      ...DEFAULT_WEAPON_FX,
      ...saved,
      rateOfFire: { ...DEFAULT_WEAPON_FX.rateOfFire, ...(saved.rateOfFire ?? {}) },
      projectile: { ...DEFAULT_WEAPON_FX.projectile, ...(saved.projectile ?? {}) },
      impact: { ...DEFAULT_WEAPON_FX.impact, ...(saved.impact ?? {}) },
      muzzle: { ...DEFAULT_WEAPON_FX.muzzle, ...(saved.muzzle ?? {}) },
      casing: { ...DEFAULT_WEAPON_FX.casing, ...(saved.casing ?? {}) },
      jam: {
         ...DEFAULT_WEAPON_FX.jam,
         ...(saved.jam ?? {}),
         sound: { ...DEFAULT_WEAPON_FX.jam.sound, ...(saved.jam?.sound ?? {}) },
         catastrophicSound: { ...DEFAULT_WEAPON_FX.jam.catastrophicSound, ...(saved.jam?.catastrophicSound ?? {}) },
         catastrophicEffect: { ...DEFAULT_WEAPON_FX.jam.catastrophicEffect, ...(saved.jam?.catastrophicEffect ?? {}) }
      }
   };
}

/**
 * Determine shot count from rate-of-fire config.
 * @param {WeaponFxRateOfFire} rof
 * @returns {number}
 */
function getShotCount(rof) {
   switch (rof.mode) {
      case 'burst': return rof.burstCount ?? 3;
      case 'auto': return rof.autoCount ?? 5;
      default: return 1; // single, semi
   }
}

/**
 * Generate implicit shot events when provider doesn't supply them.
 * All shots are treated as 'hit' against resolved targets.
 * @param {number} count - Number of shots
 * @param {Token[]} targets - Resolved target tokens
 * @returns {ShotEvent[]}
 */
function generateImplicitShotEvents(count, targets) {
   const events = [];
   for (let i = 0; i < count; i++) {
      // Distribute shots across targets (round-robin)
      const target = targets.length > 0 ? targets[i % targets.length] : undefined;
      events.push({ type: 'hit', target });
   }
   return events;
}

/**
 * Pick a sound from the sounds array based on the sound mode.
 * @param {WeaponFxSound[]} sounds
 * @param {string} mode - 'random' | 'sequential' | 'all'
 * @param {number} [sequenceIndex] - Current index for sequential mode
 * @returns {{ sound: WeaponFxSound|null, nextIndex: number }}
 */
const _sequenceIndices = new Map();
export function pickSound(sounds, mode, sequenceIndex, itemId) {
   if (!sounds?.length) return { sound: null, nextIndex: 0 };

   switch (mode) {
      case 'sequential': {
         const key = itemId ?? '__global__';
         const current = sequenceIndex ?? (_sequenceIndices.get(key) ?? 0);
         const idx = current % sounds.length;
         _sequenceIndices.set(key, idx + 1);
         return { sound: sounds[idx], nextIndex: idx + 1 };
      }
      case 'all':
         // 'all' mode is handled at a higher level (play all sounds)
         return { sound: sounds[0], nextIndex: 0 };
      case 'random':
      default: {
         // Weighted random selection
         const totalWeight = sounds.reduce((sum, s) => sum + (s.weight ?? 1), 0);
         let roll = Math.random() * totalWeight;
         for (const s of sounds) {
            roll -= (s.weight ?? 1);
            if (roll <= 0) return { sound: s, nextIndex: 0 };
         }
         return { sound: sounds[0], nextIndex: 0 };
      }
   }
}

/**
 * Main entry point — play weapon FX for an item.
 *
 * @param {Item} item - The item to play FX for
 * @param {object} [options]
 * @param {Token} [options.sourceToken] - Override source token
 * @param {Token[]} [options.targets] - Override targets
 * @param {ShotEvent[]} [options.shotEvents] - Per-shot event data
 * @param {boolean} [options.soundOnly] - Only play sound, no visual
 * @param {object} [options.systemContext] - System-specific data for target resolution
 * @param {Function} [options.providerGetTargets] - Provider's custom target resolver
 * @returns {Promise<void>}
 */
export async function playWeaponFx(item, options = {}) {
   const config = getWeaponFxConfig(item);
   if (!config) {
      debug('WeaponFxService | FX not configured or disabled for item:', item?.name);
      return;
   }

   // Resolve source token
   const sourceToken = resolveSourceToken(item, options.sourceToken);
   debug('WeaponFxService | Source token:', sourceToken?.name ?? 'none');

   // Determine shot events
   let shotEvents;
   if (options.shotEvents?.length) {
      // Provider-supplied shot events (overrides everything)
      shotEvents = options.shotEvents;
      debug('WeaponFxService | Using provider shotEvents:', shotEvents.length);
   } else {
      // Resolve targets, then generate implicit hit events
      const targets = resolveTargets({
         sourceToken,
         item,
         explicitTargets: options.targets,
         providerGetTargets: options.providerGetTargets,
         systemContext: options.systemContext
      });

      const count = getShotCount(config.rateOfFire);
      shotEvents = generateImplicitShotEvents(count, targets);
      debug('WeaponFxService | Generated implicit shotEvents:', shotEvents.length, 'targets:', targets.length);
   }

   // If all events are jams, still play jam sounds but skip visual FX
   const hasPlayable = shotEvents.some(e => e.type !== 'jam');
   if (!hasPlayable) {
      debug('WeaponFxService | All shots jammed, playing jam sounds only');
      await _playSoundsOnly(config, shotEvents, sourceToken);
      return;
   }

   // Play effects
   if (options.soundOnly) {
      await _playSoundsOnly(config, shotEvents, sourceToken);
   } else if (isSequencerAvailable()) {
      await playWithSequencer(config, sourceToken, shotEvents);
   } else {
      await playWithBuiltin(config, sourceToken, shotEvents);
      // Broadcast to other clients (builtin renderer doesn't auto-sync)
      _broadcastFx(item, config, sourceToken, shotEvents);
   }
}

/**
 * Play sounds only (no visual effects).
 * @param {WeaponFxConfig} config
 * @param {ShotEvent[]} shotEvents
 * @param {Token} sourceToken
 */
async function _playSoundsOnly(config, shotEvents, sourceToken) {
   const delay = config.rateOfFire.delayBetweenShots;

   for (let i = 0; i < shotEvents.length; i++) {
      const event = shotEvents[i];
      if (event.type === 'jam') {
         const isCatastrophic = event.catastrophic === true;
         const jamSnd = isCatastrophic
            ? (config.jam?.catastrophicSound ?? config.jam?.sound)
            : config.jam?.sound;

         if (jamSnd?.path) {
            const audio = new Audio(jamSnd.path);
            audio.volume = jamSnd.volume ?? 0.8;
            audio.play().catch(err => console.warn('[ARS] WeaponFX jam sound failed:', err));
         }
         continue;
      }

      if (i > 0) {
         const shotDelay = event.delay ?? delay;
         const finalDelay = config.rateOfFire.randomizeDelay
            ? shotDelay * (0.7 + Math.random() * 0.6)
            : shotDelay;
         await _wait(finalDelay);
      }

      if (config.soundMode === 'all') {
         for (const s of config.sounds) {
            const audio = new Audio(s.path);
            audio.volume = s.volume ?? 0.8;
            audio.play().catch(err => console.warn('[ARS] WeaponFX sound failed:', err));
         }
      } else {
         const { sound } = pickSound(config.sounds, config.soundMode);
         if (sound) {
            const audio = new Audio(sound.path);
            audio.volume = sound.volume ?? 0.8;
            audio.play().catch(err => console.warn('[ARS] WeaponFX sound failed:', err));
         }
      }
   }
}

/**
 * Broadcast FX to other clients via socket (for builtin renderer only).
 * Sequencer handles its own sync natively.
 * @param {Item} item
 * @param {WeaponFxConfig} config
 * @param {Token} sourceToken
 * @param {ShotEvent[]} shotEvents
 */
function _broadcastFx(item, config, sourceToken, shotEvents) {
   if (!sourceToken) return;

   // Serialize shot events (Token → ID)
   const serializedEvents = shotEvents.map(e => ({
      type: e.type,
      targetId: e.target?.id ?? null,
      strayTargetId: e.strayTarget?.id ?? null,
      delay: e.delay
   }));

   // Pre-pick sound indices so all clients play the same sounds
   const pickedSoundIndices = shotEvents.map(e => {
      if (e.type === 'jam') return -1;
      if (!config.sounds.length) return -1;
      return Math.floor(Math.random() * config.sounds.length);
   });

   emitSocket('playWeaponFx', {
      itemUuid: item.uuid,
      fxConfig: config,
      sourceTokenId: sourceToken.id,
      sceneId: canvas.scene?.id,
      shotEvents: serializedEvents,
      pickedSoundIndices
   });
}

/**
 * Handle incoming socket message for weapon FX (builtin renderer).
 * Called on remote clients.
 * @param {object} data - Socket message data
 */
export async function handlePlayWeaponFxSocket(data) {
   const { fxConfig, sourceTokenId, sceneId, shotEvents: serializedEvents, pickedSoundIndices } = data;

   // Only play on the same scene
   if (canvas.scene?.id !== sceneId) return;

   const sourceToken = canvas.tokens?.get(sourceTokenId);
   if (!sourceToken) return;

   // Deserialize shot events (ID → Token)
   const shotEvents = serializedEvents.map((e, i) => ({
      type: e.type,
      target: e.targetId ? canvas.tokens.get(e.targetId) : undefined,
      strayTarget: e.strayTargetId ? canvas.tokens.get(e.strayTargetId) : undefined,
      delay: e.delay,
      _pickedSoundIndex: pickedSoundIndices?.[i] ?? -1
   }));

   await playWithBuiltin(fxConfig, sourceToken, shotEvents, pickedSoundIndices);
}

/**
 * Simple wait utility.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function _wait(ms) {
   return new Promise(resolve => setTimeout(resolve, ms));
}
