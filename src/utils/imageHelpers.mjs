/**
 * Image helper utilities for the AntiFriz Roleplay Stuff module.
 * @module utils/imageHelpers
 */

import { DEFAULT_IMAGES } from '#config';

/**
 * Check if an image path is a default Foundry placeholder image.
 * @param {string|null|undefined} imagePath - The image path to check
 * @returns {boolean} True if the image is a default/placeholder
 */
export function isDefaultImage(imagePath) {
   if (!imagePath) return true;
   
   // Check against known defaults
   if (DEFAULT_IMAGES.includes(imagePath)) return true;
   
   // Check if it's an icons/svg path (most Foundry defaults)
   if (imagePath.startsWith('icons/svg/')) return true;
   
   return false;
}

/**
 * Check if an image path is a custom (non-default) image.
 * @param {string|null|undefined} imagePath - The image path to check
 * @returns {boolean} True if the image is custom/user-provided
 */
export function isCustomImage(imagePath) {
   return !isDefaultImage(imagePath);
}

/**
 * Extract filename from a path without extension.
 * @param {string} path - File path
 * @returns {string} Filename without extension
 */
export function getImageName(path) {
   if (!path) return '';
   return path.split('/').pop()?.replace(/\.[^/.]+$/, '') ?? '';
}
