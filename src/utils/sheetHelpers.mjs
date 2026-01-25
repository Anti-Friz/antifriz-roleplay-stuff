import { MODULE_ID } from '#config';
import { CharacterMusicApp, PortraitGalleryApp } from '#applications';

/**
 * Inject header buttons for Actor sheets
 */
export function injectActorHeaderButtons(sheet, buttons) {
   const showGalleryButton = game.settings.get(MODULE_ID, 'showGalleryButton');
   const showMusicButton = game.settings.get(MODULE_ID, 'showMusicButton');

   const doc = sheet.document ?? sheet.actor ?? sheet.object;
   if (!(doc instanceof foundry.abstract.Document)) return;

   if (showGalleryButton) {
      buttons.unshift({
         class: 'antifriz-gallery-btn',
         icon: 'fas fa-photo-film',
         onclick: function() { PortraitGalleryApp.open(doc); }
      });
   }

   if (showMusicButton) {
      buttons.unshift({
         class: 'antifriz-music-btn',
         icon: 'fas fa-music',
         onclick: function() { CharacterMusicApp.open(doc); }
      });
   }
}

/**
 * Inject header buttons for Item sheets
 */
export function injectItemHeaderButtons(sheet, buttons) {
   const showGalleryButton = game.settings.get(MODULE_ID, 'showItemGalleryButton');
   const showMusicButton = game.settings.get(MODULE_ID, 'showItemMusicButton');

   const doc = sheet.document ?? sheet.item ?? sheet.object;
   if (!(doc instanceof foundry.abstract.Document)) return;

   if (showGalleryButton) {
      buttons.unshift({
         class: 'antifriz-gallery-btn',
         icon: 'fas fa-photo-film',
         onclick: function() { PortraitGalleryApp.open(doc); }
      });
   }

   if (showMusicButton) {
      buttons.unshift({
         class: 'antifriz-music-btn',
         icon: 'fas fa-music',
         onclick: function() { CharacterMusicApp.open(doc); }
      });
   }
}
