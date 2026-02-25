/**
 * Builtin Fallback Renderer for Weapon FX and Defensive FX.
 * Uses PIXI.Graphics on the Foundry canvas for basic visual effects
 * and HTML Audio for sounds. Used when Sequencer is not installed.
 * @module utils/fxRendererBuiltin
 */

import { debug } from './logger.mjs';
import { pickSound } from './weaponFxService.mjs';

/**
 * Play weapon FX using builtin PIXI renderer.
 * Processes shot events one-by-one with rate-of-fire delays.
 *
 * @param {WeaponFxConfig} config - FX configuration
 * @param {Token} sourceToken - Source token
 * @param {ShotEvent[]} shotEvents - Array of shot events
 * @param {number[]} [pickedSoundIndices] - Pre-picked sound indices (for socket sync)
 */
export async function playWithBuiltin(config, sourceToken, shotEvents, pickedSoundIndices) {
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
            const audio = new Audio(jamSnd.path);
            audio.volume = jamSnd.volume ?? 0.8;
            audio.play().catch(err => console.warn('[ARS] WeaponFX jam sound failed:', err));
         }
         continue;
      }

      // Delay between shots (rate of fire)
      if (playableShotIndex > 0) {
         const shotDelay = event.delay ?? delay;
         const finalDelay = config.rateOfFire.randomizeDelay
            ? shotDelay * (0.7 + Math.random() * 0.6)
            : shotDelay;
         await _wait(finalDelay);
      }
      playableShotIndex++;

      // === Sound ===
      _playShotSound(config, i, pickedSoundIndices);

      // Get positions
      const sourcePos = _getTokenCenter(sourceToken);

      // === Determine projectile target ===
      const projectileTarget = event.type === 'stray' ? event.strayTarget : event.target;
      const targetPos = _getTokenCenter(projectileTarget);

      // === Muzzle Flash (at front edge facing target) ===
      if (config.muzzle.enabled && sourcePos) {
         const muzzlePos = targetPos
            ? _getTokenEdge(sourceToken, targetPos)
            : sourcePos;
         _drawFlash(muzzlePos, _parseColor(config.muzzle.color), 30 * (config.muzzle.scale ?? 0.5), 200);
      }

      // === Projectile ===
      if (config.projectile.enabled && sourcePos && targetPos) {
         // Start from muzzle edge
         const startPos = _getTokenEdge(sourceToken, targetPos);
         let finalTarget = targetPos;

         // Miss: offset the target position randomly
         if (event.type === 'miss') {
            const gridSize = canvas.grid?.size ?? 100;
            finalTarget = {
               x: targetPos.x + (Math.random() - 0.5) * gridSize * 2,
               y: targetPos.y + (Math.random() - 0.5) * gridSize * 2
            };
         } else if (event.type === 'hit' || event.type === 'stray') {
            // Slight random offset on hits too
            finalTarget = _randomizePosition(targetPos, projectileTarget);
         }

         const travelMode = config.projectile.travelMode ?? 'beam';
         _drawProjectile(
            startPos,
            finalTarget,
            _parseColor(config.projectile.color),
            config.projectile.builtinType ?? 'tracer',
            travelMode
         );
      }

      // === Impact (only on hit or stray) ===
      if (config.impact.enabled && (event.type === 'hit' || event.type === 'stray')) {
         const impactTarget = event.type === 'stray' ? event.strayTarget : event.target;
         const impactPos = _getTokenCenter(impactTarget);
         if (impactPos) {
            const randomized = _randomizePosition(impactPos, impactTarget, config.impact.randomOffset ?? 0.3);
            // Small delay for impact to coincide with projectile arrival
            const impactDelay = (config.projectile.travelMode === 'projectile') ? 300 : 150;
            setTimeout(() => {
               _drawFlash(randomized, _parseColor(config.impact.color), 25 * (config.impact.scale ?? 0.5), 250);
            }, impactDelay);
         }
      }

      // === Casing Ejection ===
      if (config.casing?.enabled && sourcePos) {
         const dir = config.casing.ejectDirection ?? 'right';
         const scatter = config.casing.scatter ?? 0.5;
         const projectileTarget2 = event.type === 'stray' ? event.strayTarget : event.target;
         const targetPos2 = _getTokenCenter(projectileTarget2);
         const fireAngle = targetPos2
            ? Math.atan2(targetPos2.y - sourcePos.y, targetPos2.x - sourcePos.x)
            : 0;

         let ejectAngle;
         if (dir === 'random') ejectAngle = Math.random() * Math.PI * 2;
         else if (dir === 'left') ejectAngle = fireAngle - Math.PI / 2;
         else if (dir === 'up') ejectAngle = fireAngle + Math.PI;
         else ejectAngle = fireAngle + Math.PI / 2;

         const dist = 15 + Math.random() * scatter * 30;
         const casingEnd = {
            x: sourcePos.x + Math.cos(ejectAngle) * dist,
            y: sourcePos.y + Math.sin(ejectAngle) * dist
         };
         _drawCasingEject(sourcePos, casingEnd, 0xccaa44, config.casing.persist ? 3000 : 800);
      }
   }

   // === Catastrophic jam visual ===
   // (handled inline above for sound; add visual explosion if configured)
   for (const event of shotEvents) {
      if (event.type === 'jam' && event.catastrophic && config.jam?.catastrophicEffect?.enabled) {
         const pos = _getTokenCenter(sourceToken);
         if (pos) {
            _drawFlash(pos, _parseColor(config.jam?.catastrophicEffect?.color ?? '#ff4400'),
               40 * (config.jam.catastrophicEffect.scale ?? 1.0), 400);
         }
      }
   }

   debug('FxRendererBuiltin | Played', playableShotIndex, 'shots');
}

/**
 * Play a sound for a single shot.
 */
function _playShotSound(config, shotIndex, pickedSoundIndices) {
   if (!config.sounds?.length) return;

   if (config.soundMode === 'all') {
      // Play ALL sounds simultaneously
      for (const s of config.sounds) {
         const audio = new Audio(s.path);
         audio.volume = s.volume ?? 0.8;
         audio.play().catch(err => console.warn('[ARS] WeaponFX sound failed:', err));
      }
      return;
   }

   let soundIndex;
   if (pickedSoundIndices && pickedSoundIndices[shotIndex] >= 0) {
      soundIndex = pickedSoundIndices[shotIndex];
   } else {
      const { sound } = pickSound(config.sounds, config.soundMode);
      if (!sound) return;
      soundIndex = config.sounds.indexOf(sound);
   }

   const sound = config.sounds[soundIndex];
   if (!sound) return;

   const audio = new Audio(sound.path);
   audio.volume = sound.volume ?? 0.8;
   audio.play().catch(err => console.warn('[ARS] WeaponFX sound failed:', err));
}

/**
 * Draw a projectile based on travel mode.
 * @param {object} source - {x, y}
 * @param {object} target - {x, y}
 * @param {number} color - PIXI color hex
 * @param {string} builtinType - 'tracer' | 'beam' | 'bolt' | 'arrow'
 * @param {string} travelMode - 'beam' | 'projectile' | 'pulse'
 */
function _drawProjectile(source, target, color, builtinType, travelMode) {
   if (travelMode === 'projectile') {
      _drawMovingProjectile(source, target, color, builtinType);
   } else if (travelMode === 'pulse') {
      _drawPulse(source, target, color, builtinType);
   } else {
      _drawTracer(source, target, color, 150, builtinType);
   }
}

/**
 * Draw a moving projectile (small dot/shape that travels from A to B).
 */
function _drawMovingProjectile(source, target, color, builtinType) {
   if (!canvas.stage) return;

   const graphics = new PIXI.Graphics();
   const size = builtinType === 'beam' ? 5 : builtinType === 'bolt' ? 3 : 4;

   graphics.beginFill(color, 1);
   graphics.drawCircle(0, 0, size);
   graphics.endFill();

   // Glow
   graphics.beginFill(color, 0.3);
   graphics.drawCircle(0, 0, size * 2.5);
   graphics.endFill();

   graphics.x = source.x;
   graphics.y = source.y;
   canvas.stage.addChild(graphics);

   const dx = target.x - source.x;
   const dy = target.y - source.y;
   const dist = Math.sqrt(dx * dx + dy * dy);
   const duration = Math.max(150, Math.min(dist * 0.6, 500));
   const startTime = performance.now();

   const animate = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out quad
      const t = 1 - (1 - progress) * (1 - progress);
      graphics.x = source.x + dx * t;
      graphics.y = source.y + dy * t;
      graphics.alpha = progress > 0.9 ? 1 - (progress - 0.9) * 10 : 1;

      if (progress < 1) {
         requestAnimationFrame(animate);
      } else {
         canvas.stage.removeChild(graphics);
         graphics.destroy();
      }
   };
   requestAnimationFrame(animate);
}

/**
 * Draw a pulse effect (short line segment that travels from A to B).
 */
function _drawPulse(source, target, color, builtinType) {
   if (!canvas.stage) return;

   const dx = target.x - source.x;
   const dy = target.y - source.y;
   const dist = Math.sqrt(dx * dx + dy * dy);
   const pulseLength = Math.min(40, dist * 0.15);
   const duration = Math.max(100, Math.min(dist * 0.5, 400));
   const lineWidth = builtinType === 'beam' ? 3 : 2;
   const startTime = performance.now();

   const graphics = new PIXI.Graphics();
   canvas.stage.addChild(graphics);

   const animate = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const t = 1 - (1 - progress) * (1 - progress); // ease out

      graphics.clear();
      graphics.lineStyle(lineWidth, color, 1);

      const headT = t;
      const tailT = Math.max(0, t - pulseLength / dist);
      const hx = source.x + dx * headT;
      const hy = source.y + dy * headT;
      const tx = source.x + dx * tailT;
      const ty = source.y + dy * tailT;

      graphics.moveTo(tx, ty);
      graphics.lineTo(hx, hy);

      // Glow
      graphics.lineStyle(lineWidth * 3, color, 0.2);
      graphics.moveTo(tx, ty);
      graphics.lineTo(hx, hy);

      graphics.alpha = progress > 0.85 ? 1 - (progress - 0.85) * 6.67 : 1;

      if (progress < 1) {
         requestAnimationFrame(animate);
      } else {
         canvas.stage.removeChild(graphics);
         graphics.destroy();
      }
   };
   requestAnimationFrame(animate);
}

/**
 * Draw a tracer/beam line from source to target (instant, then fades).
 * @param {object} source - {x, y}
 * @param {object} target - {x, y}
 * @param {number} color - PIXI color hex
 * @param {number} duration - ms
 * @param {string} type - 'tracer' | 'beam' | 'bolt' | 'arrow'
 */
function _drawTracer(source, target, color, duration, type) {
   if (!canvas.stage) return;

   const graphics = new PIXI.Graphics();
   const lineWidth = type === 'beam' ? 4 : type === 'bolt' ? 1.5 : 2;

   graphics.lineStyle(lineWidth, color, 1);
   graphics.moveTo(source.x, source.y);

   if (type === 'bolt') {
      // Dashed line effect
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const segments = Math.max(4, Math.floor(dist / 20));
      for (let s = 0; s <= segments; s++) {
         const t = s / segments;
         const px = source.x + dx * t;
         const py = source.y + dy * t;
         if (s % 2 === 0) graphics.moveTo(px, py);
         else graphics.lineTo(px, py);
      }
   } else {
      graphics.lineTo(target.x, target.y);
   }

   // Arrow head
   if (type === 'arrow') {
      const angle = Math.atan2(target.y - source.y, target.x - source.x);
      const headLen = 10;
      graphics.moveTo(target.x, target.y);
      graphics.lineTo(
         target.x - headLen * Math.cos(angle - Math.PI / 6),
         target.y - headLen * Math.sin(angle - Math.PI / 6)
      );
      graphics.moveTo(target.x, target.y);
      graphics.lineTo(
         target.x - headLen * Math.cos(angle + Math.PI / 6),
         target.y - headLen * Math.sin(angle + Math.PI / 6)
      );
   }

   // Beam glow (wider translucent underline)
   if (type === 'beam') {
      graphics.lineStyle(8, color, 0.3);
      graphics.moveTo(source.x, source.y);
      graphics.lineTo(target.x, target.y);
   }

   canvas.stage.addChild(graphics);

   // Animate fade-out
   const startTime = performance.now();
   const animate = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      graphics.alpha = 1 - progress;

      if (progress < 1) {
         requestAnimationFrame(animate);
      } else {
         canvas.stage.removeChild(graphics);
         graphics.destroy();
      }
   };
   requestAnimationFrame(animate);
}

/**
 * Draw a flash/burst effect at a position.
 * @param {object} position - {x, y}
 * @param {number} color - PIXI color hex
 * @param {number} radius - Base radius
 * @param {number} duration - ms
 */
function _drawFlash(position, color, radius, duration) {
   if (!canvas.stage) return;

   const graphics = new PIXI.Graphics();
   graphics.beginFill(color, 0.8);
   graphics.drawCircle(position.x, position.y, radius);
   graphics.endFill();

   canvas.stage.addChild(graphics);

   const startTime = performance.now();
   const animate = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      graphics.alpha = 1 - progress;
      graphics.scale.set(1 + progress * 0.5);

      if (progress < 1) {
         requestAnimationFrame(animate);
      } else {
         canvas.stage.removeChild(graphics);
         graphics.destroy();
      }
   };
   requestAnimationFrame(animate);
}

/**
 * Get the center position of a token on the canvas.
 * @param {Token} token
 * @returns {{x: number, y: number}|null}
 */
function _getTokenCenter(token) {
   if (!token) return null;
   return {
      x: token.x + (token.w ?? token.hitArea?.width ?? 0) / 2,
      y: token.y + (token.h ?? token.hitArea?.height ?? 0) / 2
   };
}

/**
 * Get the front edge position of a token facing toward a target position.
 * @param {Token} token - Source token
 * @param {{x: number, y: number}} targetPos - Target center position
 * @returns {{x: number, y: number}}
 */
function _getTokenEdge(token, targetPos) {
   if (!token) return targetPos;
   const w = token.w ?? token.hitArea?.width ?? canvas.grid?.size ?? 100;
   const h = token.h ?? token.hitArea?.height ?? canvas.grid?.size ?? 100;
   const cx = token.x + w / 2;
   const cy = token.y + h / 2;
   const angle = Math.atan2(targetPos.y - cy, targetPos.x - cx);
   const edgeRadius = Math.min(w, h) / 2;
   return {
      x: cx + Math.cos(angle) * edgeRadius,
      y: cy + Math.sin(angle) * edgeRadius
   };
}

/**
 * Add a small random offset to a position (for impact scatter).
 * @param {{x: number, y: number}} pos - Base position
 * @param {Token} [token] - Token to size the offset relative to
 * @param {number} [factor=0.3] - Offset factor (0-1, fraction of token size)
 * @returns {{x: number, y: number}}
 */
function _randomizePosition(pos, token, factor = 0.3) {
   const size = token
      ? (token.w ?? token.hitArea?.width ?? canvas.grid?.size ?? 100)
      : (canvas.grid?.size ?? 100);
   return {
      x: pos.x + (Math.random() - 0.5) * size * factor,
      y: pos.y + (Math.random() - 0.5) * size * factor
   };
}

/**
 * Parse a hex color string to a PIXI-compatible integer.
 * @param {string} hex - e.g. '#ffaa00'
 * @returns {number}
 */
function _parseColor(hex) {
   if (!hex) return 0xffaa00;
   return parseInt(hex.replace('#', ''), 16);
}

/**
 * Simple wait utility.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function _wait(ms) {
   return new Promise(resolve => setTimeout(resolve, ms));
}

// ==========================================
// Casing ejection primitive
// ==========================================

/**
 * Draw a small casing dot that flies from source to eject position and fades.
 */
function _drawCasingEject(source, target, color, duration) {
   if (!canvas.stage) return;

   const graphics = new PIXI.Graphics();
   graphics.beginFill(color, 0.9);
   graphics.drawRect(-1.5, -1.5, 3, 3);
   graphics.endFill();

   graphics.x = source.x;
   graphics.y = source.y;
   canvas.stage.addChild(graphics);

   const dx = target.x - source.x;
   const dy = target.y - source.y;
   const travelTime = 150;
   const startTime = performance.now();

   const animate = (time) => {
      const elapsed = time - startTime;

      if (elapsed < travelTime) {
         const t = elapsed / travelTime;
         const ease = 1 - (1 - t) * (1 - t);
         graphics.x = source.x + dx * ease;
         graphics.y = source.y + dy * ease - Math.sin(t * Math.PI) * 8; // slight arc
         graphics.alpha = 1;
      } else {
         graphics.x = target.x;
         graphics.y = target.y;
         const fadeProgress = Math.min((elapsed - travelTime) / (duration - travelTime), 1);
         graphics.alpha = 1 - fadeProgress;
      }

      if (elapsed < duration) {
         requestAnimationFrame(animate);
      } else {
         canvas.stage.removeChild(graphics);
         graphics.destroy();
      }
   };
   requestAnimationFrame(animate);
}

// ==========================================
// Defensive FX — Builtin PIXI rendering
// ==========================================

/**
 * Active aura loops tracked by name → animation handle.
 * @type {Map<string, {graphics: PIXI.Graphics, cancel: Function}>}
 */
const _activeAuras = new Map();

/**
 * Play a defensive reactive effect using builtin PIXI renderer.
 * @param {DefensiveReactiveConfig} reactiveConfig
 * @param {Token} token
 * @param {Token} [attacker]
 */
export function playBuiltinReactiveEffect(reactiveConfig, token, attacker) {
   if (!reactiveConfig?.enabled) return;

   // Sound
   if (reactiveConfig.sound?.path) {
      const audio = new Audio(reactiveConfig.sound.path);
      audio.volume = reactiveConfig.sound.volume ?? 0.8;
      audio.play().catch(err => console.warn('[ARS] DefensiveFX sound failed:', err));
   }

   const pos = _getTokenCenter(token);
   if (!pos) return;

   const scale = reactiveConfig.scale ?? 1.0;
   const gridSize = canvas.grid?.size ?? 100;
   const radius = gridSize * 0.4 * scale;

   // Draw a directional shield arc if attacker, otherwise full circle
   if (attacker) {
      const attackerPos = _getTokenCenter(attacker);
      if (attackerPos) {
         _drawShieldArc(pos, attackerPos, radius, 0x3399ff, 350);
         return;
      }
   }
   _drawShieldFlash(pos, radius, 0x3399ff, 350);
}

/**
 * Play an aura activation using builtin PIXI renderer.
 * @param {DefensiveAuraConfig} auraConfig
 * @param {Token} token
 * @param {Item} item
 */
export function playBuiltinAuraActivate(auraConfig, token, item) {
   if (!auraConfig?.enabled) return;

   // Sound
   if (auraConfig.activateSound?.path) {
      const audio = new Audio(auraConfig.activateSound.path);
      audio.volume = auraConfig.activateSound.volume ?? 0.8;
      audio.play().catch(err => console.warn('[ARS] DefensiveFX sound failed:', err));
   }

   const pos = _getTokenCenter(token);
   if (!pos) return;

   const scale = auraConfig.scale ?? 1.5;
   const gridSize = canvas.grid?.size ?? 100;
   const radius = gridSize * 0.5 * scale;
   const auraName = `ars-aura-${token.id}-${item.id}`;

   // Intro flash
   _drawShieldFlash(pos, radius * 1.2, 0x44aaff, 400);

   // Persistent pulsing ring
   _startAuraLoop(auraName, token, radius, 0x3399ff);
}

/**
 * Play an aura deactivation using builtin PIXI renderer.
 * @param {DefensiveAuraConfig} auraConfig
 * @param {Token} token
 * @param {Item} item
 */
export function playBuiltinAuraDeactivate(auraConfig, token, item) {
   if (!auraConfig?.enabled) return;

   if (auraConfig.deactivateSound?.path) {
      const audio = new Audio(auraConfig.deactivateSound.path);
      audio.volume = auraConfig.deactivateSound.volume ?? 0.8;
      audio.play().catch(err => console.warn('[ARS] DefensiveFX sound failed:', err));
   }

   const auraName = `ars-aura-${token.id}-${item.id}`;
   _stopAuraLoop(auraName);

   // Outro flash
   const pos = _getTokenCenter(token);
   if (pos) {
      const radius = (canvas.grid?.size ?? 100) * 0.5 * (auraConfig.scale ?? 1.5);
      _drawShieldFlash(pos, radius, 0x3399ff, 300);
   }
}

/**
 * Play a shield overload using builtin PIXI renderer.
 * @param {DefensiveAuraConfig} auraConfig
 * @param {Token} token
 * @param {Item} item
 */
export function playBuiltinShieldOverload(auraConfig, token, item) {
   if (!auraConfig?.enabled) return;

   const overloadSnd = auraConfig.overloadSound?.path
      ? auraConfig.overloadSound
      : auraConfig.deactivateSound;
   if (overloadSnd?.path) {
      const audio = new Audio(overloadSnd.path);
      audio.volume = overloadSnd.volume ?? 1.0;
      audio.play().catch(err => console.warn('[ARS] DefensiveFX sound failed:', err));
   }

   const auraName = `ars-aura-${token.id}-${item.id}`;
   _stopAuraLoop(auraName);

   const pos = _getTokenCenter(token);
   if (pos) {
      const scale = (auraConfig.scale ?? 1.5) * 1.3;
      const radius = (canvas.grid?.size ?? 100) * 0.5 * scale;
      _drawExplosion(pos, radius, 0xff4400, 500);
   }
}

/**
 * Play a reactive aura flash (brief shield flash without persistent loop).
 * @param {DefensiveAuraConfig} auraConfig
 * @param {Token} token
 * @param {Token} [attacker]
 */
export function playBuiltinReactiveAuraFlash(auraConfig, token, attacker) {
   const pos = _getTokenCenter(token);
   if (!pos) return;

   const scale = auraConfig.scale ?? 1.5;
   const radius = (canvas.grid?.size ?? 100) * 0.5 * scale;

   if (attacker) {
      const attackerPos = _getTokenCenter(attacker);
      if (attackerPos) {
         _drawShieldArc(pos, attackerPos, radius, 0x44aaff, 600);
         return;
      }
   }
   _drawShieldFlash(pos, radius, 0x44aaff, 600);
}

// ==========================================
// Defensive PIXI primitives
// ==========================================

/**
 * Draw a shield arc facing toward an attacker.
 */
function _drawShieldArc(center, attackerPos, radius, color, duration) {
   if (!canvas.stage) return;

   const angle = Math.atan2(attackerPos.y - center.y, attackerPos.x - center.x);
   const arcSpan = Math.PI * 0.8; // 144° arc

   const graphics = new PIXI.Graphics();

   // Inner bright arc
   graphics.lineStyle(3, color, 0.9);
   graphics.arc(center.x, center.y, radius, angle - arcSpan / 2, angle + arcSpan / 2);

   // Outer glow arc
   graphics.lineStyle(8, color, 0.25);
   graphics.arc(center.x, center.y, radius + 2, angle - arcSpan / 2, angle + arcSpan / 2);

   canvas.stage.addChild(graphics);
   _animateFadeOut(graphics, duration);
}

/**
 * Draw a full circular shield flash.
 */
function _drawShieldFlash(center, radius, color, duration) {
   if (!canvas.stage) return;

   const graphics = new PIXI.Graphics();

   // Ring
   graphics.lineStyle(2, color, 0.8);
   graphics.drawCircle(center.x, center.y, radius);

   // Glow
   graphics.lineStyle(6, color, 0.2);
   graphics.drawCircle(center.x, center.y, radius);

   // Inner fill
   graphics.beginFill(color, 0.1);
   graphics.drawCircle(center.x, center.y, radius);
   graphics.endFill();

   canvas.stage.addChild(graphics);
   _animateFadeOut(graphics, duration, true);
}

/**
 * Draw an explosion burst (for overload).
 */
function _drawExplosion(center, radius, color, duration) {
   if (!canvas.stage) return;

   const graphics = new PIXI.Graphics();

   // Core
   graphics.beginFill(0xffffff, 0.9);
   graphics.drawCircle(center.x, center.y, radius * 0.3);
   graphics.endFill();

   // Ring
   graphics.beginFill(color, 0.6);
   graphics.drawCircle(center.x, center.y, radius * 0.6);
   graphics.endFill();

   // Outer glow
   graphics.beginFill(color, 0.2);
   graphics.drawCircle(center.x, center.y, radius);
   graphics.endFill();

   canvas.stage.addChild(graphics);

   const startTime = performance.now();
   const animate = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      graphics.alpha = 1 - progress;
      graphics.scale.set(1 + progress * 0.8);

      if (progress < 1) {
         requestAnimationFrame(animate);
      } else {
         canvas.stage.removeChild(graphics);
         graphics.destroy();
      }
   };
   requestAnimationFrame(animate);
}

/**
 * Start a persistent pulsing aura ring on a token.
 */
function _startAuraLoop(auraName, token, radius, color) {
   _stopAuraLoop(auraName);

   if (!canvas.stage) return;

   const graphics = new PIXI.Graphics();
   canvas.stage.addChild(graphics);
   let cancelled = false;
   const startTime = performance.now();

   const animate = (time) => {
      if (cancelled) {
         canvas.stage.removeChild(graphics);
         graphics.destroy();
         return;
      }

      const elapsed = time - startTime;
      const pulse = 0.7 + 0.3 * Math.sin(elapsed * 0.003);
      const pos = _getTokenCenter(token);
      if (!pos) {
         canvas.stage.removeChild(graphics);
         graphics.destroy();
         _activeAuras.delete(auraName);
         return;
      }

      graphics.clear();

      // Outer glow ring
      graphics.lineStyle(5, color, 0.15 * pulse);
      graphics.drawCircle(pos.x, pos.y, radius + 3);

      // Main ring
      graphics.lineStyle(2, color, 0.5 * pulse);
      graphics.drawCircle(pos.x, pos.y, radius);

      // Inner shimmer
      graphics.beginFill(color, 0.04 * pulse);
      graphics.drawCircle(pos.x, pos.y, radius);
      graphics.endFill();

      requestAnimationFrame(animate);
   };

   requestAnimationFrame(animate);

   _activeAuras.set(auraName, {
      graphics,
      cancel: () => { cancelled = true; }
   });
}

/**
 * Stop a persistent aura loop.
 */
function _stopAuraLoop(auraName) {
   const existing = _activeAuras.get(auraName);
   if (existing) {
      existing.cancel();
      _activeAuras.delete(auraName);
   }
}

/**
 * Animate a PIXI graphics object with fade-out + optional scale.
 */
function _animateFadeOut(graphics, duration, scale = false) {
   const startTime = performance.now();
   const animate = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      graphics.alpha = 1 - progress;
      if (scale) graphics.scale.set(1 + progress * 0.3);

      if (progress < 1) {
         requestAnimationFrame(animate);
      } else {
         canvas.stage.removeChild(graphics);
         graphics.destroy();
      }
   };
   requestAnimationFrame(animate);
}
