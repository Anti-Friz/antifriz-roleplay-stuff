/**
 * Init submodules barrel export.
 * @module config
 */
import { constants } from './module.mjs';
export * as moduleConfig from './module.mjs';

export { constants, DEFAULT_IMAGES } from './module.mjs';
export { WEAPON_FX_PRESETS, getPresetCategories, getPresetsByCategory, getPresetById } from './weaponFxPresets.mjs';

export * as tokenCountersConfig from './tokenCounters.mjs';
export {
   TC_FLAGS, COUNTER_TYPES, SHAPES, FILL_MODES, VISIBILITY,
   HUD_MODES, VISIBLE_WHEN, ELEMENT_TYPES, COUNTER_DEFAULTS
} from './tokenCounters.mjs';

export * as movementRulerConfig from './movementRuler.mjs';
export {
   MR_SETTINGS, MR_NATIVE_PROVIDER_ID, MR_UNREACHABLE_COLOR_ID, MR_READY_HOOK,
   MR_MEASUREMENT_MODES, mrColorSettingKey, mrProviderSettingKey
} from './movementRuler.mjs';

export const MODULE_ID = constants.moduleId;
export const MODULE_LABEL = constants.moduleLabel;

/**
 * Default music categories
 * Used as fallback when settings are not yet initialized
 */
export const DEFAULT_MUSIC_CATEGORIES = [
   { id: 'theme', label: 'Theme', icon: 'fa-music' },
   { id: 'combat', label: 'Combat', icon: 'fa-swords' },
   { id: 'dramatic', label: 'Dramatic', icon: 'fa-theater-masks' },
   { id: 'ambient', label: 'Ambient', icon: 'fa-wind' }
];

/**
 * Special category for tracks with invalid/missing category
 */
export const UNCATEGORIZED_CATEGORY = { 
   id: '__uncategorized__', 
   label: 'Uncategorized', 
   icon: 'fa-question' 
};
