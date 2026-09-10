/**
 * Base class of the Movement Ruler speed provider API.
 *
 * Game systems and modules derive this class to tell the ruler how far the
 * dragged token may travel and which colour each range should use.
 *
 * @module utils/movementRuler/SpeedProvider
 */

import { MODULE_ID } from '#config';
import {
   MR_DEFAULT_UNREACHABLE_COLOR,
   mrColorSettingKey,
   mrProviderSettingKey
} from '../../config/movementRuler.mjs';

/**
 * @typedef {object} SpeedProviderColor
 * @property {string} id       Unique colour id within this provider.
 * @property {number} default  Default colour as a 24-bit integer, e.g. `0x00ff00`.
 * @property {string} [name]   Localizable label shown in the configuration app.
 */

/**
 * @typedef {object} SpeedProviderRange
 * @property {number} range  Distance (in grid units) reachable at this speed.
 * @property {string} color  Id of the colour declared in {@link SpeedProvider#colors}.
 */

export class SpeedProvider {
   /**
    * @param {string} id - Fully qualified provider id, e.g. `system.my-system`.
    */
   constructor(id) {
      this.id = id;
   }

   /**
    * Colours offered by this provider, one per speed category.
    * @returns {SpeedProviderColor[]}
    * @abstract
    */
   get colors() {
      throw new Error('A SpeedProvider must implement the `colors` getter');
   }

   /**
    * Distances the given token can reach, one entry per speed category.
    * Return an empty array to leave the ruler uncoloured for this token.
    * @param {Token} token - The dragged token placeable.
    * @returns {SpeedProviderRange[]}
    * @abstract
    */
   // eslint-disable-next-line no-unused-vars
   getRanges(token) {
      throw new Error('A SpeedProvider must implement the `getRanges` method');
   }

   /**
    * Provider specific settings shown in the Movement Ruler configuration app.
    * Each entry uses the shape of `game.settings.register` data plus an `id`.
    * @returns {Array<object>}
    */
   get settings() {
      return [];
   }

   /**
    * Colour used for distances beyond every declared range.
    * @returns {number}
    */
   get defaultUnreachableColor() {
      return MR_DEFAULT_UNREACHABLE_COLOR;
   }

   /**
    * Whether the ruler is shown at all for the given token.
    * @param {Token} token
    * @returns {boolean}
    */
   // eslint-disable-next-line no-unused-vars
   usesRuler(token) {
      return true;
   }

   /**
    * Read one of this provider's registered settings.
    * @param {string} settingId
    * @returns {*}
    */
   getSetting(settingId) {
      try {
         return game.settings.get(MODULE_ID, mrProviderSettingKey(this.id, settingId));
      }
      catch (err) {
         throw new Error(
            `Movement Ruler | "${settingId}" is not a registered setting of provider "${this.id}". ` +
            'Add it to the return value of the provider\'s `settings` getter.',
            { cause: err }
         );
      }
   }

   /**
    * Read the user-configured value of one of this provider's colours.
    * @param {string} colorId
    * @returns {number}
    */
   getColor(colorId) {
      try {
         return game.settings.get(MODULE_ID, mrColorSettingKey(this.id, colorId));
      }
      catch {
         return this.defaultUnreachableColor;
      }
   }
}
