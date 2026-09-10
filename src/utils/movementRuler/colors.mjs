/**
 * Colour conversion helpers for the Movement Ruler settings UI.
 * @module utils/movementRuler/colors
 */

/**
 * Convert a 24-bit colour integer into a `#rrggbb` string.
 * @param {number} value
 * @returns {string}
 */
export function colorNumberToHex(value) {
   const int = Number.isFinite(value) ? Math.trunc(value) & 0xffffff : 0;
   return `#${int.toString(16).padStart(6, '0')}`;
}

/**
 * Convert a `#rrggbb` string into a 24-bit colour integer.
 * @param {string} hex
 * @returns {number}
 */
export function colorHexToNumber(hex) {
   const parsed = Number.parseInt(String(hex).replace('#', ''), 16);
   return Number.isFinite(parsed) ? parsed & 0xffffff : 0;
}
