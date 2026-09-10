/**
 * Renders token-counter overlays as PIXI graphics anchored to a Token object.
 * The overlay is a child of the Token, so it follows the token on move/pan/zoom
 * automatically (no per-frame DOM sync). Rendering is per-client and read-only.
 * @module canvas/TokenCounterOverlay
 */
import { MODULE_ID } from '#config';
import { getEffectiveCounterDefs, readCounterState, resolveCounterValue } from '../utils/tokenCounters/counterState.mjs';
import { layoutCounters } from '../utils/tokenCounters/placement.mjs';

const CONTAINER_KEY = '_afgTokenCounters';
const RING_GAP = 3;
const BASE_MARGIN = 6;
const BADGE_CIRCLE_R = 10;
const BADGE_SQUARE = 18;
const BADGE_POLY_R = 11;
const ICON_SIZE = 20;
const DEG = Math.PI / 180;

/**
 * Rebuild the counter overlay for a token.
 * @param {Token} token
 */
export function refreshTokenCounters(token) {
   if (!token || token.destroyed) return;
   if (!game.settings.get(MODULE_ID, 'enableTokenCounters')) { removeTokenCounters(token); return; }

   const tokenDoc = token.document;
   if (!tokenDoc) { removeTokenCounters(token); return; }

   const defs = getEffectiveCounterDefs(tokenDoc).filter(d => d.kind === 'counter');
   if (!defs.length) { removeTokenCounters(token); return; }

   const container = ensureContainer(token);
   for (const child of container.removeChildren()) child.destroy({ children: true });

   container.position.set(token.w / 2, token.h / 2);
   const baseRadius = Math.max(token.w, token.h) / 2 + BASE_MARGIN;
   const state = readCounterState(tokenDoc);

   for (const item of layoutCounters(defs)) {
      try {
         const { value, max } = resolveCounterValue(tokenDoc, item.def, state);
         if (!isCounterVisible(item.def, token, value)) continue;
         container.addChild(drawCounter(item, value, max, baseRadius));
      }
      catch (err) {
         console.error(`${MODULE_ID} | token counter draw failed`, item?.def?.id, err);
      }
   }
}

/**
 * Ensure the overlay container exists and is attached to the token.
 * @param {Token} token
 * @returns {PIXI.Container}
 */
function ensureContainer(token) {
   const existing = token[CONTAINER_KEY];
   if (existing && !existing.destroyed) return existing;
   const container = new PIXI.Container();
   container.eventMode = 'none';
   container.zIndex = 9999; // keep counters above token art, bars, and border
   token[CONTAINER_KEY] = container;
   token.sortableChildren = true;
   token.addChild(container);
   return container;
}

/**
 * Remove and destroy the overlay container for a token.
 * @param {Token} token
 */
export function removeTokenCounters(token) {
   const container = token?.[CONTAINER_KEY];
   if (container && !container.destroyed) container.destroy({ children: true });
   if (token) token[CONTAINER_KEY] = null;
}

/** Refresh overlays for every placed token on the active scene. */
export function refreshAllTokenCounters() {
   if (!canvas?.ready) return;
   for (const token of canvas.tokens?.placeables ?? []) refreshTokenCounters(token);
}

/** Remove overlays from every placed token (used when the subsystem is disabled). */
export function removeAllTokenCounters() {
   for (const token of canvas.tokens?.placeables ?? []) removeTokenCounters(token);
}

/**
 * Refresh overlays for all active tokens of a given actor.
 * @param {Actor} actor
 */
export function refreshActorTokenCounters(actor) {
   if (!actor || !canvas?.ready) return;
   // No `linked` filter: unlinked tokens (e.g. no-name NPCs) must refresh too.
   for (const token of actor.getActiveTokens?.() ?? []) refreshTokenCounters(token);
}

/* -------------------------------------------- */
/*  Visibility + colour                          */
/* -------------------------------------------- */

/**
 * Whether the current user may see a counter (visibility + visibleWhen).
 * @param {object} def
 * @param {Token} token
 * @param {number} value
 * @returns {boolean}
 */
function isCounterVisible(def, token, value) {
   const actor = token?.actor;
   switch (def.visibility) {
      case 'gm': if (!game.user.isGM) return false; break;
      case 'owners': if (!game.user.isGM && !actor?.isOwner) return false; break;
      default: break; // everyone
   }
   switch (def.visibleWhen) {
      case 'inCombat': if (!game.combat?.started) return false; break;
      case 'valuePositive': if (!(Number(value) > 0)) return false; break;
      default: break;
   }
   return true;
}

/**
 * Convert a #rrggbb string to a PIXI-compatible integer.
 * @param {string} hex
 * @param {number} [fallback]
 * @returns {number}
 */
function colorToNumber(hex, fallback = 0xffffff) {
   if (typeof hex !== 'string') return fallback;
   const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
   return m ? parseInt(m[1], 16) : fallback;
}

/**
 * Pick a colour from thresholds based on the current value/fraction.
 * @param {object} def
 * @param {number} value
 * @param {number|null} max
 * @returns {number}
 */
function pickColor(def, value, max) {
   const visual = def.visual ?? {};
   const base = colorToNumber(visual.color);
   const thresholds = visual.thresholds ?? [];
   if (!thresholds.length) return base;
   const metric = (max && max > 0) ? value / max : value;
   let chosen = visual.color;
   let best = -Infinity;
   for (const t of thresholds) {
      if (metric >= t.at && t.at > best) { best = t.at; chosen = t.color; }
   }
   return colorToNumber(chosen, base);
}

/** @param {string} s @returns {boolean} */
function isImagePath(s) {
   return typeof s === 'string' && /\.(png|jpe?g|webp|svg|gif|bmp)$/i.test(s);
}

/* -------------------------------------------- */
/*  PIXI v7 / v8 drawing shims                   */
/* -------------------------------------------- */

/** @param {PIXI.Graphics} g @returns {boolean} True on PIXI v7 (legacy Graphics API). */
function isLegacyGraphics(g) {
   return typeof g.lineStyle === 'function';
}

/**
 * Stroke a path built by `build`. PIXI v7 sets style first; v8 strokes after the path.
 * @param {PIXI.Graphics} g
 * @param {(g: PIXI.Graphics) => void} build
 * @param {{width: number, color: number, alpha?: number, cap?: string}} style
 */
function strokePath(g, build, style) {
   if (isLegacyGraphics(g)) {
      g.lineStyle({ width: style.width, color: style.color, alpha: style.alpha ?? 1, cap: style.cap ?? 'butt' });
      build(g);
   }
   else {
      build(g);
      g.stroke({ width: style.width, color: style.color, alpha: style.alpha ?? 1, cap: style.cap ?? 'butt' });
   }
}

/**
 * Fill a path built by `build`, on both PIXI v7 and v8.
 * @param {PIXI.Graphics} g
 * @param {(g: PIXI.Graphics) => void} build
 * @param {{color: number, alpha?: number}} style
 */
function fillPath(g, build, style) {
   if (typeof g.beginFill === 'function') {
      g.beginFill(style.color, style.alpha ?? 1);
      build(g);
      g.endFill();
   }
   else {
      build(g);
      g.fill({ color: style.color, alpha: style.alpha ?? 1 });
   }
}

/** @param {PIXI.Graphics} g */
function rectPath(g, x, y, w, h) {
   (typeof g.drawRect === 'function' ? g.drawRect : g.rect).call(g, x, y, w, h);
}

/** @param {PIXI.Graphics} g */
function circlePath(g, x, y, r) {
   (typeof g.drawCircle === 'function' ? g.drawCircle : g.circle).call(g, x, y, r);
}

/** @param {PIXI.Graphics} g */
function polyPath(g, pts) {
   (typeof g.drawPolygon === 'function' ? g.drawPolygon : g.poly).call(g, pts);
}

/** @param {string} label @returns {PIXI.Text} */
function makeText(label) {
   const major = Number(String(PIXI.VERSION ?? '7').split('.')[0]) || 7;
   const style = {
      fontFamily: 'Signika, sans-serif',
      fontSize: 12,
      fill: 0xffffff,
      align: 'center',
      // v8 expects stroke:{color,width}; v7 uses stroke + strokeThickness.
      ...(major >= 8 ? { stroke: { color: 0x000000, width: 3 } } : { stroke: 0x000000, strokeThickness: 3 })
   };
   const text = major >= 8 ? new PIXI.Text({ text: label, style }) : new PIXI.Text(label, style);
   text.anchor.set(0.5);
   text.resolution = 2;
   return text;
}

/* -------------------------------------------- */
/*  Drawing                                      */
/* -------------------------------------------- */

/**
 * Draw a single counter into a container positioned at the token centre.
 * @param {{def: object, isRing: boolean, ringIndex: number, angleCenterDeg: number, arcSpanDeg: number}} item
 * @param {number} value
 * @param {number|null} max
 * @param {number} baseRadius
 * @returns {PIXI.Container}
 */
function drawCounter(item, value, max, baseRadius) {
   const { def, isRing, ringIndex, angleCenterDeg, arcSpanDeg } = item;
   const visual = def.visual ?? {};
   const color = pickColor(def, value, max);
   const fraction = (max && max > 0) ? Math.clamp(value / max, 0, 1) : (value > 0 ? 1 : 0);
   const thickness = Math.max(2, visual.thickness ?? 4);
   const radius = baseRadius + ringIndex * (thickness + RING_GAP);
   const label = max != null ? `${value}/${max}` : `${value}`;

   const node = new PIXI.Container();
   const g = new PIXI.Graphics();
   node.addChild(g);

   if (isRing || visual.shape === 'arc') {
      drawArc(g, color, fraction, radius, thickness, isRing ? 360 : arcSpanDeg, angleCenterDeg);
      if (visual.showText) {
         const a = angleCenterDeg * DEG;
         const text = makeText(label);
         text.position.set(Math.cos(a) * radius, Math.sin(a) * radius);
         node.addChild(text);
      }
   }
   else {
      drawBadge(node, g, def, color, fraction, radius, angleCenterDeg);
      if (visual.showText) node.addChild(makeText(label));
   }
   return node;
}

/**
 * Draw a stroked arc (full ring or partial segment) with a faint background track.
 * @param {PIXI.Graphics} g
 * @param {number} color
 * @param {number} fraction 0..1
 * @param {number} radius
 * @param {number} thickness
 * @param {number} spanDeg
 * @param {number} centerDeg
 */
function drawArc(g, color, fraction, radius, thickness, spanDeg, centerDeg) {
   const full = spanDeg >= 360;
   const spanRad = (full ? 360 : spanDeg) * DEG;
   // Full rings start at 12 o'clock; partial arcs are centred on their angle.
   const start = full ? (-Math.PI / 2) : (centerDeg * DEG - spanRad / 2);
   const at = (a) => [Math.cos(a) * radius, Math.sin(a) * radius];

   strokePath(g, (gg) => {
      const [bx, by] = at(start);
      gg.moveTo(bx, by);
      gg.arc(0, 0, radius, start, start + spanRad);
   }, { width: thickness, color: 0x000000, alpha: 0.35, cap: 'round' });

   if (fraction > 0) {
      const end = start + spanRad * Math.clamp(fraction, 0, 1);
      strokePath(g, (gg) => {
         const [fx, fy] = at(start);
         gg.moveTo(fx, fy);
         gg.arc(0, 0, radius, start, end);
      }, { width: thickness, color, alpha: 1, cap: 'round' });
   }
}

/**
 * Draw a badge shape (circle/square/polygon/icon) at an angular position.
 * Square fills bottom-up by fraction (hourglass-like); others show a solid badge.
 * @param {PIXI.Container} node
 * @param {PIXI.Graphics} g
 * @param {object} def
 * @param {number} color
 * @param {number} fraction 0..1
 * @param {number} radius
 * @param {number} centerDeg
 */
function drawBadge(node, g, def, color, fraction, radius, centerDeg) {
   const a = centerDeg * DEG;
   node.position.set(Math.cos(a) * radius, Math.sin(a) * radius);
   const shape = def.visual?.shape;

   if (shape === 'square') {
      const s = BADGE_SQUARE;
      fillPath(g, (gg) => rectPath(gg, -s / 2, -s / 2, s, s), { color: 0x000000, alpha: 0.4 });
      const fh = s * fraction;
      if (fh > 0) fillPath(g, (gg) => rectPath(gg, -s / 2, s / 2 - fh, s, fh), { color, alpha: 0.9 });
      strokePath(g, (gg) => rectPath(gg, -s / 2, -s / 2, s, s), { width: 1.5, color, alpha: 1 });
      return;
   }

   if (shape === 'polygon') {
      const pts = [];
      const sides = 6;
      for (let i = 0; i < sides; i++) {
         const ang = -Math.PI / 2 + i * (2 * Math.PI / sides);
         pts.push(Math.cos(ang) * BADGE_POLY_R, Math.sin(ang) * BADGE_POLY_R);
      }
      fillPath(g, (gg) => polyPath(gg, pts), { color, alpha: 0.85 });
      strokePath(g, (gg) => polyPath(gg, pts), { width: 1.5, color: 0x000000, alpha: 0.5 });
      return;
   }

   if (shape === 'icon' && isImagePath(def.visual?.icon)) {
      const sprite = PIXI.Sprite.from(def.visual.icon);
      sprite.anchor.set(0.5);
      sprite.width = ICON_SIZE;
      sprite.height = ICON_SIZE;
      node.addChild(sprite);
      return;
   }

   // circle (also icon fallback when icon is a font-glyph class)
   fillPath(g, (gg) => circlePath(gg, 0, 0, BADGE_CIRCLE_R), { color, alpha: 0.85 });
   strokePath(g, (gg) => circlePath(gg, 0, 0, BADGE_CIRCLE_R), { width: 1.5, color: 0x000000, alpha: 0.5 });
}
