/**
 * Sequencer-based Renderer for Weapon FX.
 * Uses the Sequencer module API to play high-quality animations.
 * Handles hit, miss, jam, and stray shot events with rate-of-fire delays.
 * @module utils/fxRendererSequencer
 */

import { debug } from './logger.mjs';
import { pickSound } from './weaponFxService.mjs';
import { MODULE_LABEL } from '#config';
/**
 * Check if Sequencer is available and active.
 * @returns {boolean}
 */
export function isSequencerAvailable() {
   return typeof Sequencer !== 'undefined'
       && game.modules.get('sequencer')?.active === true;
}

/**
 * Check if Sequencer Database has entries (JB2A or similar).
 * @returns {boolean}
 */
export function hasSequencerDatabase() {
   if (!isSequencerAvailable()) return false;
   try {
      return Sequencer.Database.entryCount > 0;
   } catch {
      return false;
   }
}

/**
 * Resolve the file path or Sequencer DB path for an effect config.
 * @param {object} effectConfig - Projectile, muzzle, or impact config
 * @returns {string|null}
 */
function resolveEffectFile(effectConfig) {
   switch (effectConfig.source) {
      case 'sequencer':
         return effectConfig.sequencerPath || null;
      case 'custom':
         return effectConfig.customFile || null;
      default:
         return null;
   }
}

/**
 * Compute muzzle flash position at the front edge of the source token facing the target.
 * @param {Token} sourceToken
 * @param {Token|{x: number, y: number}} target - Target token or position
 * @returns {{x: number, y: number}}
 */
function _muzzleEdgePosition(sourceToken, target) {
   const sw = sourceToken.w ?? sourceToken.hitArea?.width ?? canvas.grid?.size ?? 100;
   const sh = sourceToken.h ?? sourceToken.hitArea?.height ?? canvas.grid?.size ?? 100;
   const sx = sourceToken.x + sw / 2;
   const sy = sourceToken.y + sh / 2;

   const { tx, ty } = _targetCenter(target);
   if (tx === null) return { x: sx, y: sy };

   const angle = Math.atan2(ty - sy, tx - sx);
   const edgeRadius = Math.min(sw, sh) / 2;
   return {
      x: sx + Math.cos(angle) * edgeRadius,
      y: sy + Math.sin(angle) * edgeRadius
   };
}

/**
 * Get the center coordinates of a target (token or raw position).
 * @param {Token|{x: number, y: number}|null} target
 * @returns {{tx: number|null, ty: number|null}}
 */
function _targetCenter(target) {
   if (!target) return { tx: null, ty: null };
   if (target.x !== undefined && target.y !== undefined && target.w === undefined) {
      return { tx: target.x, ty: target.y };
   }
   const tw = target.w ?? target.hitArea?.width ?? canvas.grid?.size ?? 100;
   const th = target.h ?? target.hitArea?.height ?? canvas.grid?.size ?? 100;
   return { tx: target.x + tw / 2, ty: target.y + th / 2 };
}

/**
 * Compute the firing angle from source token toward a target.
 * Falls back to token rotation if no target is available.
 * @param {Token} sourceToken
 * @param {Token|{x: number, y: number}|null} target
 * @returns {number} Angle in radians
 */
function _firingAngle(sourceToken, target) {
   const sw = sourceToken.w ?? sourceToken.hitArea?.width ?? canvas.grid?.size ?? 100;
   const sh = sourceToken.h ?? sourceToken.hitArea?.height ?? canvas.grid?.size ?? 100;
   const sx = sourceToken.x + sw / 2;
   const sy = sourceToken.y + sh / 2;

   const { tx, ty } = _targetCenter(target);
   if (tx !== null) {
      return Math.atan2(ty - sy, tx - sx);
   }

   // No target — use token's own rotation (degrees → radians, Foundry 0° = south)
   const rotDeg = sourceToken.document?.rotation ?? sourceToken.rotation ?? 0;
   return (rotDeg - 90) * (Math.PI / 180);
}

/**
 * Play weapon FX using Sequencer.
 * Processes shot events one-by-one with rate-of-fire delay.
 *
 * @param {WeaponFxConfig} config - FX configuration
 * @param {Token} sourceToken - Source token
 * @param {ShotEvent[]} shotEvents - Array of shot events (hit/miss/jam/stray)
 */
export async function playWithSequencer(config, sourceToken, shotEvents) {
   if (!isSequencerAvailable()) {
      console.warn('[ARS] WeaponFX: Sequencer not available, cannot play');
      return;
   }

   const seq = new Sequence({ moduleName: MODULE_LABEL });

   const delay = config.rateOfFire.delayBetweenShots;
   let playableShotIndex = 0;

   for (let i = 0; i < shotEvents.length; i++) {
      const event = shotEvents[i];

      // JAM: play jam sound (+ catastrophic explosion if flagged)
      if (event.type === 'jam') {
         const isCatastrophic = event.catastrophic === true;
         const jamSnd = isCatastrophic
            ? (config.jam?.catastrophicSound ?? config.jam?.sound)
            : config.jam?.sound;

         if (jamSnd?.path) {
            const jamSection = seq.sound()
               .file(jamSnd.path)
               .volume(jamSnd.volume ?? 0.8);
            if (sourceToken) jamSection.atLocation(sourceToken);
         }

         // Catastrophic: play explosion effect at source token
         if (isCatastrophic && config.jam?.catastrophicEffect?.enabled && sourceToken) {
            const effectFile = resolveEffectFile(config.jam.catastrophicEffect);
            if (effectFile) {
               seq.effect()
                  .file(effectFile)
                  .atLocation(sourceToken)
                  .scaleToObject(config.jam.catastrophicEffect.scale ?? 1.0)
                  .fadeIn(100)
                  .fadeOut(500)
                  .zIndex(20);
            }
         }
         continue;
      }

      // Delay between shots (rate of fire)
      if (playableShotIndex > 0) {
         const shotDelay = event.delay ?? delay;
         const finalDelay = config.rateOfFire.randomizeDelay
            ? shotDelay * (0.7 + Math.random() * 0.6) // ±30%
            : shotDelay;
         seq.wait(finalDelay);
      }
      playableShotIndex++;

      // === Sound (pick per shot) ===
      if (config.soundMode === 'all') {
         // Play ALL sounds simultaneously
         for (const s of config.sounds) {
            const soundSection = seq.sound()
               .file(s.path)
               .volume(s.volume ?? 0.8);
            if (sourceToken) soundSection.atLocation(sourceToken);
         }
      } else {
         const { sound } = pickSound(config.sounds, config.soundMode);
         if (sound) {
            const soundSection = seq.sound()
               .file(sound.path)
               .volume(sound.volume ?? 0.8);
            if (sourceToken) soundSection.atLocation(sourceToken);
         }
      }

      // === Determine projectile target ===
      const projectileTarget = event.type === 'stray' ? event.strayTarget : event.target;

      // === Muzzle Flash (at front edge of source, facing target) ===
      if (config.muzzle.enabled && sourceToken) {
         const muzzleFile = resolveEffectFile(config.muzzle);
         if (muzzleFile) {
            const muzzlePos = projectileTarget
               ? _muzzleEdgePosition(sourceToken, projectileTarget)
               : null;

            const muzzleEffect = seq.effect()
               .file(muzzleFile)
               .scaleToObject(config.muzzle.scale ?? 0.5)
               .fadeIn(100)
               .fadeOut(200);

            if (muzzlePos) {
               muzzleEffect.atLocation(muzzlePos);
            } else {
               muzzleEffect.atLocation(sourceToken);
            }
         }
      }

      // === Projectile (source → target) ===
      // All modes use .stretchTo() — JB2A files have built-in travel animation
      // (see: advanced-fire-bolt guide — ".stretchTo() is used instead of .moveTowards()
      //  because JB2A projectiles have built-in movement animation within the effect file")
      // travelMode controls playbackRate only:
      //   beam       — normal speed (continuous laser/beam)
      //   pulse      — 3× speed (fast flash bolt)
      //   projectile — normal speed (same as beam; visual comes from the animation file)
      if (config.projectile.enabled && projectileTarget && sourceToken) {
         const projectileFile = resolveEffectFile(config.projectile);
         if (projectileFile) {
            const travelMode = config.projectile.travelMode ?? 'beam';
            const baseSpeed = config.projectile.speed ?? 1.0;
            const speed = travelMode === 'pulse' ? baseSpeed * 3 : baseSpeed;

            // Follow the fire-bolt pattern: .file() → .atLocation() → .stretchTo() → .missed()
            // No .scale() — stretchTo() calculates proper X scale automatically
            // randomOffset on stretchTo scatters the destination so shots don't all hit dead center
            const scatter = config.projectile.scatter ?? 0.3;

            const effect = seq.effect()
               .file(projectileFile)
               .atLocation(sourceToken)
               .stretchTo(projectileTarget, { randomOffset: scatter })
               .playbackRate(speed)
               .zIndex(10);

             if (config.projectile.randomizeMirrorY) {
                effect.randomizeMirrorY();
             }

            if (event.type === 'miss') {
               effect.missed();
            }
         }
      }

      // === Casing Ejection (at source, ejected relative to firing direction) ===
      if (config.casing?.enabled && sourceToken) {
         const casingFile = resolveEffectFile(config.casing);
         if (casingFile) {
            const scatter = config.casing.scatter ?? 0.5;
            const dir = config.casing.ejectDirection ?? 'right';

            // Get firing angle toward target (or token rotation if no target)
            const fireAngle = _firingAngle(sourceToken, projectileTarget);

            // Compute eject angle relative to firing direction:
            //   right = +90° (perpendicular clockwise from barrel)
            //   left  = -90° (perpendicular counter-clockwise)
            //   up    = +180° (backward from barrel)
            let ejectAngle;
            if (dir === 'random') {
               ejectAngle = Math.random() * Math.PI * 2;
            } else if (dir === 'left') {
               ejectAngle = fireAngle - Math.PI / 2;
            } else if (dir === 'up') {
               ejectAngle = fireAngle + Math.PI;
            } else {
               // 'right' (default)
               ejectAngle = fireAngle + Math.PI / 2;
            }

            // Base distance + scatter randomness, in grid units
            const dist = 0.3 + Math.random() * scatter;
            const perpSpread = (Math.random() - 0.5) * scatter * 0.4;

            // Main eject direction + slight perpendicular spread
            const ox = Math.cos(ejectAngle) * dist + Math.cos(ejectAngle + Math.PI / 2) * perpSpread;
            const oy = Math.sin(ejectAngle) * dist + Math.sin(ejectAngle + Math.PI / 2) * perpSpread;

            const casingEffect = seq.effect()
               .file(casingFile)
               .atLocation(sourceToken, { offset: { x: ox, y: oy }, gridUnits: true })
               .scale(config.casing.scale ?? 0.3)
               .randomRotation()
               .zIndex(1)
               .belowTokens();

            if (config.casing.persist && !config.casing.duration) {
               // Permanent — stays on canvas until manually cleared via Effect Manager
               casingEffect.persist();
            } else if (config.casing.duration > 0) {
               // Timed — show for N seconds then fade out
               // Use .duration() NOT .persist() — persist has no auto-expiry
               casingEffect
                  .duration(config.casing.duration * 1000)
                  .fadeOut(Math.min(1000, config.casing.duration * 500));
            } else {
               // Non-persistent — show briefly then fade
               casingEffect
                  .duration(3000)
                  .fadeOut(1500);
            }
         }
      }

      // === Impact (only on hit or stray, NOT on miss) ===
      if (config.impact.enabled && (event.type === 'hit' || event.type === 'stray')) {
         const impactTarget = event.type === 'stray' ? event.strayTarget : event.target;
         if (impactTarget) {
            const impactFile = resolveEffectFile(config.impact);
            if (impactFile) {
               // Use the same scatter as projectile for consistent spread
               const scatter = config.projectile?.scatter ?? config.impact.randomOffset ?? 0.3;

               seq.effect()
                  .file(impactFile)
                  .atLocation(impactTarget, { randomOffset: scatter })
                  .scaleToObject(config.impact.scale ?? 0.5)
                  .fadeIn(50)
                  .fadeOut(300);
            }
         }
      }
   }

   debug('FxRendererSequencer | Playing sequence with', playableShotIndex, 'shots');
   await seq.play();
}
