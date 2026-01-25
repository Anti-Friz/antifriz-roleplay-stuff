import { TJSGameSettings } from '#runtime/svelte/store/fvtt/settings';
import { MODULE_ID } from '#config';

/**
 * TJSGameSettings instance for reactive Foundry settings
 * @type {TJSGameSettings}
 */
export const AFSettings = new TJSGameSettings(MODULE_ID);

/**
 * Register all system settings
 */
export function registerSettings() {
   _registerClientSettings();
}

/**
 * Register client-scoped settings (per-user)
 * @private
 */
function _registerClientSettings() {
   // Actor sheet buttons
   game.settings.register(MODULE_ID, 'showMusicButton', {
      name: 'SETTINGS.showMusicButton.Name',
      hint: 'SETTINGS.showMusicButton.Hint',
      scope: 'client',
      config: true,
      type: Boolean,
      default: true
   });

   game.settings.register(MODULE_ID, 'showGalleryButton', {
      name: 'SETTINGS.showGalleryButton.Name',
      hint: 'SETTINGS.showGalleryButton.Hint',
      scope: 'client',
      config: true,
      type: Boolean,
      default: true
   });

   // Item sheet buttons
   game.settings.register(MODULE_ID, 'showItemMusicButton', {
      name: 'SETTINGS.showItemMusicButton.Name',
      hint: 'SETTINGS.showItemMusicButton.Hint',
      scope: 'client',
      config: true,
      type: Boolean,
      default: true
   });

    game.settings.register(MODULE_ID, 'showItemGalleryButton', {
      name: 'SETTINGS.showItemGalleryButton.Name',
      hint: 'SETTINGS.showItemGalleryButton.Hint',
      scope: 'client',
      config: true,
      type: Boolean,
      default: true
   });

   game.settings.register(MODULE_ID, 'debugMode', {
      name: 'SETTINGS.debugMode.Name',
      hint: 'SETTINGS.debugMode.Hint',
      scope: 'client',
      config: true,
      type: Boolean,
      default: false
   });
}
