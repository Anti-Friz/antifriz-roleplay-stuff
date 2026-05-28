/**
 * Image helper utilities for the AntiFriz Roleplay Stuff module.
 * @module utils/imageHelpers
 */

import { DEFAULT_IMAGES, MODULE_ID } from '#config';
import { canUserSee, getPermissionKey, getPermissionPriority } from './permissions.mjs';

/**
 * Gallery category ids.
 * @readonly
 * @enum {string}
 */
export const GALLERY_CATEGORIES = Object.freeze({
   PORTRAITS: 'portraits',
   TOKENS: 'tokens'
});

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

/**
 * Get the document's current image for a gallery category.
 * @param {Actor|Item} document - Foundry document
 * @param {string} category - Gallery category
 * @returns {string|null}
 */
export function getCurrentDocumentImage(document, category = GALLERY_CATEGORIES.PORTRAITS) {
   if (!document) return null;

   if (category === GALLERY_CATEGORIES.TOKENS && document.documentName === 'Actor') {
      return document.prototypeToken?.texture?.src ?? document.img ?? null;
   }

   return document.img ?? null;
}

/**
 * Get gallery flag data with safe defaults.
 * @param {Actor|Item} document - Foundry document
 * @returns {{portraits: object[], tokens: object[]}}
 */
export function getGalleryData(document) {
   return document?.getFlag?.(MODULE_ID, 'gallery') ?? { portraits: [], tokens: [] };
}

/**
 * Get gallery items for a category.
 * @param {Actor|Item} document - Foundry document
 * @param {string} category - Gallery category
 * @returns {object[]}
 */
export function getGalleryCategoryItems(document, category) {
   const data = getGalleryData(document);
   const items = data?.[category];
   return Array.isArray(items) ? items : [];
}

/**
 * Find an active image with the same permission identity.
 * @param {object[]} items - Gallery category items
 * @param {string|object} ownership - Permission value to compare
 * @param {string|null} [excludePath] - Image path to ignore
 * @returns {object|null}
 */
export function findActiveOwnershipConflict(items, ownership, excludePath = null) {
   const permissionKey = getPermissionKey(ownership);

   return (items ?? []).find(item => {
      if (!item?.active) return false;
      if (excludePath && item.path === excludePath) return false;
      return getPermissionKey(item.ownership) === permissionKey;
   }) ?? null;
}

/**
 * Get active gallery images visible to the provided user.
 * @param {Actor|Item} document - Foundry document
 * @param {string} category - Gallery category
 * @param {object} [options] - Lookup options
 * @param {User} [options.user] - User to evaluate visibility for
 * @param {boolean} [options.includeHidden=false] - Include images hidden from the user
 * @returns {object[]}
 */
export function getActiveGalleryItems(document, category, options = {}) {
   const user = options.user ?? globalThis.game?.user;
   const includeHidden = options.includeHidden ?? false;
   const items = getGalleryCategoryItems(document, category);

   return items
      .filter(item => item?.active === true)
      .filter(item => includeHidden || (user ? canUserSee(item.ownership, user, document) : false))
      .sort(compareActiveGalleryItems);
}

/**
 * Get active gallery image entries visible to a user.
 * @param {Actor|Item} document - Foundry document
 * @param {string} category - Gallery category
 * @param {User} [user] - User to evaluate visibility for
 * @returns {object[]}
 */
export function getPerceivedImages(document, category, user = globalThis.game?.user) {
   return getActiveGalleryItems(document, category, { user });
}

/**
 * Get the best single image path visible to a user, falling back to document art.
 * @param {Actor|Item} document - Foundry document
 * @param {string} category - Gallery category
 * @param {User} [user] - User to evaluate visibility for
 * @returns {string|null}
 */
export function getPerceivedImage(document, category, user = globalThis.game?.user) {
   const images = getPerceivedImages(document, category, user);
   if (images[0]?.path) return images[0].path;

   const currentImage = getCurrentDocumentImage(document, category);
   const currentGalleryItem = getGalleryCategoryItems(document, category).find(item => item.path === currentImage);
   if (currentGalleryItem && user && !canUserSee(currentGalleryItem.ownership, user, document)) return null;

   return currentImage;
}

/**
 * Sort active images by permission specificity, then by newest first.
 * @param {object} left - Gallery item
 * @param {object} right - Gallery item
 * @returns {number}
 */
function compareActiveGalleryItems(left, right) {
   const priorityDifference = getPermissionPriority(right.ownership) - getPermissionPriority(left.ownership);
   if (priorityDifference !== 0) return priorityDifference;

   return (Number(right.addedAt) || 0) - (Number(left.addedAt) || 0);
}
