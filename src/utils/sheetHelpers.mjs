import { MODULE_ID } from '#config';
import { CharacterMusicApp, PortraitGalleryApp, WeaponFxApp, DefensiveFxApp } from '#applications';

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

   // Weapon FX + Defensive FX dropdown (gated by world setting)
   const showFxButton = game.settings.get(MODULE_ID, 'enableWeaponFx');
   if (showFxButton) {
      buttons.unshift({
         class: 'antifriz-fx-menu-btn',
         icon: 'fas fa-wand-magic-sparkles',
         onclick: function(e) {
            _showFxDropdown(e, doc);
         }
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
   
   if (!showGallery && !showMusic && !(isItem && game.settings.get(MODULE_ID, 'enableWeaponFx'))) return;

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

   // Add FX dropdown button (items only, gated by world setting)
   const showFx = isItem && game.settings.get(MODULE_ID, 'enableWeaponFx');
   if (showFx && !header.querySelector('button[data-action="antifriz-fx-menu"]')) {
      const fxBtn = document.createElement('button');
      fxBtn.type = 'button';
      fxBtn.dataset.action = 'antifriz-fx-menu';
      fxBtn.dataset.tooltip = 'Effects';
      fxBtn.classList.add('header-control', 'fas', 'fa-wand-magic-sparkles', 'icon');
      fxBtn.addEventListener('click', (e) => {
         e.preventDefault();
         e.stopPropagation();
         _showFxDropdown(e, doc);
      });
      refElement.before(fxBtn);
   }
}

// ========================================
// FX Dropdown Menu
// ========================================

/**
 * Show a small dropdown menu with Weapon FX and Defensive FX options.
 * @param {MouseEvent} event
 * @param {Item} doc
 */
function _showFxDropdown(event, doc) {
   // Remove any existing dropdown
   document.querySelector('.ars-fx-dropdown')?.remove();

   const dropdown = document.createElement('div');
   dropdown.classList.add('ars-fx-dropdown');

   const menuItems = [
      { icon: 'fa-burst', label: 'Weapon FX', action: () => WeaponFxApp.open(doc) },
      { icon: 'fa-shield-halved', label: 'Defensive FX', action: () => DefensiveFxApp.open(doc) }
   ];

   for (const item of menuItems) {
      const row = document.createElement('button');
      row.type = 'button';
      row.classList.add('ars-fx-dropdown-item');
      row.innerHTML = `<i class="fas ${item.icon}"></i> ${item.label}`;
      row.addEventListener('click', (e) => {
         e.preventDefault();
         e.stopPropagation();
         dropdown.remove();
         item.action();
      });
      dropdown.appendChild(row);
   }

   // Position near the button
   const target = event.currentTarget ?? event.target;
   const rect = target.getBoundingClientRect();
   dropdown.style.position = 'fixed';
   dropdown.style.top = `${rect.bottom + 4}px`;
   dropdown.style.left = `${rect.left}px`;
   dropdown.style.zIndex = '9999';

   document.body.appendChild(dropdown);

   // Close on outside click
   const closeHandler = (e) => {
      if (!dropdown.contains(e.target)) {
         dropdown.remove();
         document.removeEventListener('click', closeHandler, true);
      }
   };
   setTimeout(() => document.addEventListener('click', closeHandler, true), 0);
}
