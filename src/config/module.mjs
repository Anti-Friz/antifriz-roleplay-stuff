/**
 * Main module constants.
 * @type {{moduleId: string, moduleLabel: string}}
 */
export const constants = {
   moduleId: 'antifriz-roleplay-stuff',
   moduleLabel: 'Antifriz Roleplay Stuff',
};

/**
 * Default/placeholder images used by Foundry VTT.
 * Used to detect if an actor/item has a custom image.
 * @type {string[]}
 */
export const DEFAULT_IMAGES = [
   // Actor defaults
   'icons/svg/mystery-man.svg',
   'icons/svg/cowled.svg',
   // Item defaults
   'icons/svg/item-bag.svg',
   'icons/svg/chest.svg',
   'icons/svg/book.svg',
   'icons/svg/combat.svg',
   'icons/svg/dice-target.svg',
   'icons/svg/lightning.svg',
   'icons/svg/sun.svg',
   'icons/svg/tower.svg',
   // Common placeholders
   'icons/svg/hazard.svg',
   'icons/svg/skull.svg',
   'icons/svg/statue.svg',
   'icons/svg/village.svg',
   'icons/svg/blood.svg',
   'icons/svg/acid.svg',
   'icons/svg/eye.svg',
   // Empty/null cases
   '',
   null,
   undefined
];

/**
 * Foundry game setting keys.
 * @type {ESSettingConstants}
 */
export const settings = {
   showMusicButton: 'showMusicButton',
   showGalleryButton: 'showGalleryButton',
   showItemMusicButton: 'showItemMusicButton',
   showItemGalleryButton: 'showItemGalleryButton',
   debugMode: 'debugMode'
};

/**
 * @typedef {object} ESSettingConstants
 * @property {string} showMusicButton - Show music button on actor sheets
 * @property {string} showGalleryButton - Show gallery button on actor sheets
 * @property {string} showItemMusicButton - Show music button on item sheets
 * @property {string} showItemGalleryButton - Show gallery button on item sheets
 * @property {string} debugMode - Enable debug logging
 */
