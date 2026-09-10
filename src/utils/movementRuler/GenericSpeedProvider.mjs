/**
 * Built-in speed provider that reads a configurable attribute path from the
 * dragged token. Used when no system or module provider is available.
 *
 * @module utils/movementRuler/GenericSpeedProvider
 */

import { SpeedProvider } from './SpeedProvider.mjs';
import { MR_DEFAULT_DASH_MULTIPLIER, MR_GENERIC_COLORS } from '../../config/movementRuler.mjs';

export class GenericSpeedProvider extends SpeedProvider {
   /** @inheritdoc */
   get colors() {
      return [
         { id: 'walk', default: MR_GENERIC_COLORS.WALK, name: 'MOVEMENTRULER.speeds.Walk' },
         { id: 'dash', default: MR_GENERIC_COLORS.DASH, name: 'MOVEMENTRULER.speeds.Dash' }
      ];
   }

   /** @inheritdoc */
   get settings() {
      return [
         {
            id: 'speedAttribute',
            name: 'MOVEMENTRULER.generic.speedAttribute.Name',
            hint: 'MOVEMENTRULER.generic.speedAttribute.Hint',
            scope: 'world',
            type: String,
            default: ''
         },
         {
            id: 'dashMultiplier',
            name: 'MOVEMENTRULER.generic.dashMultiplier.Name',
            hint: 'MOVEMENTRULER.generic.dashMultiplier.Hint',
            scope: 'world',
            type: Number,
            default: MR_DEFAULT_DASH_MULTIPLIER
         }
      ];
   }

   /** @inheritdoc */
   getRanges(token) {
      const attribute = this.getSetting('speedAttribute');
      if (!attribute) return [];

      const speed = Number(foundry.utils.getProperty(token, attribute));
      if (!Number.isFinite(speed) || speed <= 0) return [];

      const ranges = [{ range: speed, color: 'walk' }];

      const dashMultiplier = Number(this.getSetting('dashMultiplier'));
      if (Number.isFinite(dashMultiplier) && dashMultiplier > 1) {
         ranges.push({ range: speed * dashMultiplier, color: 'dash' });
      }

      return ranges;
   }
}
