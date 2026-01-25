import { MODULE_ID } from '#config';
import { CharacterMusicApp, PortraitGalleryApp } from '#applications';

// ========================================
// AppV1 Header Buttons (Legacy / v12 and prior)
// ========================================

/**
 * Inject header buttons for Actor sheets (AppV1)
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
 * Inject header buttons for Item sheets (AppV1)
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

// ========================================
// AppV2 Header Buttons (Foundry v12+ DocumentSheetV2)
// ========================================

/**
 * Inject header buttons for DocumentSheetV2 (Actor/Item)
 * @param {ApplicationV2} app - The application
 * @param {HTMLElement} el - The element
 */
export function injectDocumentSheetV2Buttons(app, el) {
   // Check if this is ApplicationV2
   if (!(app instanceof foundry.applications.api.ApplicationV2)) return;
   
   const doc = app.document;
   if (!doc) return;
   
   // Determine if Actor or Item and get settings
   const isActor = doc instanceof Actor;
   const isItem = doc instanceof Item;
   
   if (!isActor && !isItem) return;
   
   const showGallery = isActor 
      ? game.settings.get(MODULE_ID, 'showGalleryButton')
      : game.settings.get(MODULE_ID, 'showItemGalleryButton');
   const showMusic = isActor
      ? game.settings.get(MODULE_ID, 'showMusicButton')
      : game.settings.get(MODULE_ID, 'showItemMusicButton');
   
   if (!showGallery && !showMusic) return;
   
   // Get the element
   let html = el;
   if (html instanceof jQuery) html = html[0];
   
   const header = html.querySelector('header.window-header');
   if (!header) return;
   
   // Find reference element (copyUuid button or close button)
   const refElement = header.querySelector('button[data-action="copyUuid"]') 
      || header.querySelector('button[data-action="close"]')
      || header.querySelector('.window-title');
   
   if (!refElement) return;
   
   // Add Music button
   if (showMusic && !header.querySelector('button[data-action="antifriz-music"]')) {
      const musicBtn = document.createElement('button');
      musicBtn.type = 'button';
      musicBtn.dataset.action = 'antifriz-music';
      musicBtn.dataset.tooltip = 'Music';
      musicBtn.classList.add('header-control', 'fas', 'fa-music', 'icon');
      musicBtn.addEventListener('click', (e) => {
         e.preventDefault();
         e.stopPropagation();
         CharacterMusicApp.open(doc);
      });
      refElement.before(musicBtn);
   }
   
   // Add Gallery button
   if (showGallery && !header.querySelector('button[data-action="antifriz-gallery"]')) {
      const galleryBtn = document.createElement('button');
      galleryBtn.type = 'button';
      galleryBtn.dataset.action = 'antifriz-gallery';
      galleryBtn.dataset.tooltip = 'Gallery';
      galleryBtn.classList.add('header-control', 'fas', 'fa-photo-film', 'icon');
      galleryBtn.addEventListener('click', (e) => {
         e.preventDefault();
         e.stopPropagation();
         PortraitGalleryApp.open(doc);
      });
      refElement.before(galleryBtn);
   }
}
