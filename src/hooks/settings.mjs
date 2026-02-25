import { TJSGameSettings } from '#runtime/svelte/store/fvtt/settings';
import { MODULE_ID, DEFAULT_MUSIC_CATEGORIES } from '#config';
import { MusicCategoriesApp, HeaderButtonsApp } from '#applications';

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
   // Weapon FX subsystem master switch (GM only)
   game.settings.register(MODULE_ID, 'enableWeaponFx', {
      name: 'Enable Weapon FX',
      hint: 'Enable the Weapon FX subsystem. When active, Item sheets will show a FX button to configure sounds and visual effects for weapons. Requires a provider module or macros to trigger effects during gameplay.',
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      restricted: true,
      onChange: () => {
         Object.values(ui.windows).forEach(w => w.render?.());
      }
   });

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
 * Proxy class to open the Svelte-based Header Buttons Config App
 * This is needed because settings.registerMenu expects a FormApplication-like class
 */
class HeaderButtonsMenuProxy extends FormApplication {
   constructor(...args) {
      super(...args);
      // Immediately open the Svelte app
      HeaderButtonsApp.open();
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
   // Header buttons visibility (hidden settings, accessible via menu)
   game.settings.register(MODULE_ID, 'showMusicButton', {
      scope: 'client',
      config: false,
      type: Boolean,
      default: true
   });

   game.settings.register(MODULE_ID, 'showGalleryButton', {
      scope: 'client',
      config: false,
      type: Boolean,
      default: true
   });

   game.settings.register(MODULE_ID, 'showItemMusicButton', {
      scope: 'client',
      config: false,
      type: Boolean,
      default: true
   });

   game.settings.register(MODULE_ID, 'showItemGalleryButton', {
      scope: 'client',
      config: false,
      type: Boolean,
      default: true
   });

   // Register settings menu for header buttons
   game.settings.registerMenu(MODULE_ID, 'headerButtonsMenu', {
      name: 'SETTINGS.headerButtonsMenu.Name',
      label: 'SETTINGS.headerButtonsMenu.Label',
      hint: 'SETTINGS.headerButtonsMenu.Hint',
      icon: 'fas fa-cog',
      type: HeaderButtonsMenuProxy,
      restricted: false
   });

   // Debug mode
   game.settings.register(MODULE_ID, 'debugMode', {
      name: 'SETTINGS.debugMode.Name',
      hint: 'SETTINGS.debugMode.Hint',
      scope: 'client',
      config: true,
      type: Boolean,
      default: false
   });
}
