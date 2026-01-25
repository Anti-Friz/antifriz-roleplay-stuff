import { TJSGameSettings } from '#runtime/svelte/store/fvtt/settings';
import { MODULE_ID, DEFAULT_MUSIC_CATEGORIES } from '#config';
import { MusicCategoriesApp } from '#applications';

/**
 * TJSGameSettings instance for reactive Foundry settings
 * @type {TJSGameSettings}
 */
export const AFSettings = new TJSGameSettings(MODULE_ID);

/**
 * Register all system settings
 */
export function registerSettings() {
   _registerWorldSettings();
   _registerClientSettings();
}

/**
 * Register world-scoped settings (shared by all users)
 * @private
 */
function _registerWorldSettings() {
   // Music categories (world setting, GM only)
   game.settings.register(MODULE_ID, 'musicCategories', {
      name: 'SETTINGS.musicCategories.Name',
      hint: 'SETTINGS.musicCategories.Hint',
      scope: 'world',
      config: false, // Hidden, use custom menu
      type: Array,
      default: DEFAULT_MUSIC_CATEGORIES
   });
   
   // Register settings menu for categories
   game.settings.registerMenu(MODULE_ID, 'musicCategoriesMenu', {
      name: 'SETTINGS.musicCategoriesMenu.Name',
      label: 'SETTINGS.musicCategoriesMenu.Label',
      hint: 'SETTINGS.musicCategoriesMenu.Hint',
      icon: 'fas fa-music',
      type: MusicCategoriesMenuProxy,
      restricted: true // GM only
   });
}

/**
 * Proxy class to open the Svelte-based Music Categories App
 * This is needed because settings.registerMenu expects a FormApplication-like class
 */
class MusicCategoriesMenuProxy extends FormApplication {
   constructor(...args) {
      super(...args);
      // Immediately open the Svelte app
      MusicCategoriesApp.open();
   }
   
   // Override render to do nothing (we open Svelte app instead)
   async render() {
      return this;
   }
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
