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
            // Core V1 passes a DOM event; TRL SvelteApp passes { button, event }.
            _showFxDropdown(e?.event ?? e, doc);
         }
      });
   }
}

// ========================================
// AppV2 Header Controls (ApplicationV2 / DocumentSheetV2)
// ========================================

/**
 * Inject header controls for ApplicationV2 actor/item sheets.
 *
 * V2 analogue of the `getActorSheetHeaderButtons` / `getItemSheetHeaderButtons`
 * hooks: instead of touching the DOM in a render hook, we push entries into the
 * `controls` array supplied by the `getHeaderControlsApplicationV2` hook. Foundry
 * renders them as items in the window-header controls menu. The `{ icon, label,
 * action, onClick }` shape works on both Foundry v13 and v14.
 *
 * @param {foundry.applications.api.ApplicationV2} app - The application being rendered
 * @param {object[]} controls - The header control entries to append to
 */
export function injectHeaderControlsV2(app, controls) {
   const doc = app?.document;
   if (!(doc instanceof foundry.abstract.Document)) return;

   const isActor = doc instanceof Actor;
   const isItem = doc instanceof Item;
   if (!isActor && !isItem) return;

   const showGallery = isActor
      ? game.settings.get(MODULE_ID, 'showGalleryButton')
      : game.settings.get(MODULE_ID, 'showItemGalleryButton');
   const showMusic = isActor
      ? game.settings.get(MODULE_ID, 'showMusicButton')
      : game.settings.get(MODULE_ID, 'showItemMusicButton');

   if (showMusic) {
      controls.push({
         icon: 'fas fa-music',
         label: 'Music',
         action: 'antifrizMusic',
         onClick: () => CharacterMusicApp.open(doc)
      });
   }

   if (showGallery) {
      controls.push({
         icon: 'fas fa-photo-film',
         label: 'Gallery',
         action: 'antifrizGallery',
         onClick: () => PortraitGalleryApp.open(doc)
      });
   }

   // Weapon FX + Defensive FX (items only, gated by world setting). The header
   // controls already render as a menu, so add each option directly rather than
   // opening the nested dropdown used by the AppV1 path.
   if (isItem && game.settings.get(MODULE_ID, 'enableWeaponFx')) {
      controls.push({
         icon: 'fas fa-burst',
         label: 'Weapon FX',
         action: 'antifrizWeaponFx',
         onClick: () => WeaponFxApp.open(doc)
      });
      controls.push({
         icon: 'fas fa-shield-halved',
         label: 'Defensive FX',
         action: 'antifrizDefensiveFx',
         onClick: () => DefensiveFxApp.open(doc)
      });
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
