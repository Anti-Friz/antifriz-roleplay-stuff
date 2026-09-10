/**
 * Token ruler mixin that colours the native Foundry V14 drag ruler by the
 * distance the dragged token has travelled.
 *
 * The mixin wraps whatever class is currently configured in
 * `CONFIG.Token.rulerClass`, so a system-provided ruler keeps working.
 *
 * Token size needs no special handling: the core ruler already measures the
 * path for the token's own footprint and reports every occupied grid offset.
 *
 * @module canvas/AFTokenRuler
 */

import { MODULE_ID } from '#config';
import { MR_MEASUREMENT_MODES, MR_SETTINGS } from '../config/movementRuler.mjs';
import {
   getActiveSpeedProvider,
   getColorForDistanceAndToken,
   getRangesForToken,
   getUnreachableColor,
   getWaypointMeasurement
} from '../utils/movementRuler/registry.mjs';

/**
 * Snapshot of the settings the ruler reads while drawing, so `game.settings`
 * is not queried once per grid space.
 * @returns {{enabled: boolean, highlightGrid: boolean, colorWaypoints: boolean, observerOnly: boolean, measurement: string}}
 */
function readOptions() {
   try {
      return {
         enabled: game.settings.get(MODULE_ID, MR_SETTINGS.enabled) === true,
         highlightGrid: game.settings.get(MODULE_ID, MR_SETTINGS.highlightGrid) === true,
         colorWaypoints: game.settings.get(MODULE_ID, MR_SETTINGS.colorWaypoints) === true,
         observerOnly: game.settings.get(MODULE_ID, MR_SETTINGS.observerOnly) === true,
         measurement: game.settings.get(MODULE_ID, MR_SETTINGS.measurement)
      };
   }
   catch {
      return {
         enabled: false, highlightGrid: false, colorWaypoints: false, observerOnly: true,
         measurement: MR_MEASUREMENT_MODES.COST
      };
   }
}

/**
 * Extend a Token ruler class with distance based segment colouring.
 * @param {typeof foundry.canvas.placeables.tokens.BaseTokenRuler} BaseRuler
 * @returns {typeof foundry.canvas.placeables.tokens.BaseTokenRuler}
 */
export function AFTokenRulerMixin(BaseRuler) {
   return class AFTokenRuler extends BaseRuler {
      /**
       * Settings and provider ranges, cached for the duration of one refresh.
       * @type {{options: object, ranges: Array<{range: number, color: number}>}|undefined}
       */
      #cache;

      /** @inheritdoc */
      get isVisible() {
         const provider = getActiveSpeedProvider();
         if (provider && readOptions().enabled && !provider.usesRuler(this.token)) return false;
         return super.isVisible;
      }

      /** @inheritdoc */
      refresh(rulerData) {
         this.#cache = void 0;
         super.refresh(rulerData);
      }

      /** @inheritdoc */
      clear() {
         this.#cache = void 0;
         super.clear();
      }

      /**
       * Lazily build the per-refresh cache.
       * @returns {{options: object, ranges: Array<{range: number, color: number}>}}
       */
      #getCache() {
         if (this.#cache) return this.#cache;

         const options = readOptions();
         const token = this.token;
         const actor = token?.actor;

         let ranges = [];
         if (options.enabled && actor) {
            const visible = !options.observerOnly || actor.testUserPermission(game.user, 'OBSERVER');
            if (visible) ranges = getRangesForToken(token);
         }

         this.#cache = { options, ranges };
         return this.#cache;
      }

      /**
       * Resolve the speed colour for a ruler waypoint.
       * @param {object} waypoint - A `TokenRulerWaypoint`.
       * @returns {number|null} The colour, or `null` to keep the default style.
       */
      #getSpeedColor(waypoint) {
         const { options, ranges } = this.#getCache();
         if (ranges.length === 0) return null;
         if (waypoint?.unreachable) return getUnreachableColor();
         const travelled = getWaypointMeasurement(waypoint, options.measurement);
         return getColorForDistanceAndToken(travelled, this.token, ranges);
      }

      /** @inheritdoc */
      _getSegmentStyle(waypoint) {
         const style = super._getSegmentStyle(waypoint);
         const color = this.#getSpeedColor(waypoint);
         if (color !== null) style.color = color;
         return style;
      }

      /** @inheritdoc */
      _getGridHighlightStyle(waypoint, offset) {
         const style = super._getGridHighlightStyle(waypoint, offset);
         if (!this.#getCache().options.highlightGrid) return style;
         const color = this.#getSpeedColor(waypoint);
         if (color !== null) style.color = color;
         return style;
      }

      /** @inheritdoc */
      _getWaypointStyle(waypoint) {
         const style = super._getWaypointStyle(waypoint);
         if (!this.#getCache().options.colorWaypoints) return style;
         const color = this.#getSpeedColor(waypoint);
         if (color !== null) style.color = color;
         return style;
      }
   };
}

/**
 * Install the mixin over the currently configured Token ruler class.
 * Called once during `setup`, after systems have set their own class.
 */
export function installMovementRuler() {
   const BaseRuler = CONFIG.Token.rulerClass ?? foundry.canvas.placeables.tokens.TokenRuler;
   CONFIG.Token.rulerClass = AFTokenRulerMixin(BaseRuler);
}
