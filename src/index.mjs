/**
 * Entry point - registers all hooks.
 * @module antifriz-roleplay-stuff
 */

import './styles/antifriz-roleplay-stuff.scss';

import * as hooks from '#hooks';
import * as utils from '#utils';
import { constants, MODULE_ID } from '#config';

const LOG_PREFIX = constants.moduleLabel;

Hooks.once('init', async function () {
   hooks.registerSettings();
   hooks.registerPerceivedImageHooks();
});

Hooks.once('ready', async function () {
   hooks.registerSocketListeners();

   // Conditionally initialize Weapon FX subsystem
   const fxEnabled = game.settings.get(MODULE_ID, 'enableWeaponFx');
   if (fxEnabled) {
      utils.initFxTriggerManager();
      console.log(`${LOG_PREFIX} | Weapon FX subsystem enabled`);
   }

   console.log(`${LOG_PREFIX} | Ready`);
});

// ========================================
// AppV1 Header Buttons (core sheets + TRL SvelteApp)
// ========================================
// `getApplicationHeaderButtons` fires for every ApplicationV1 in the inheritance
// chain — core ActorSheet/ItemSheet AND TRL SvelteApp sheets (e.g. the FFG item
// sheet) — whereas `get{Actor,Item}SheetHeaderButtons` only fire for core sheet
// subclasses, so TRL-based sheets never received buttons.
Hooks.on('getApplicationHeaderButtons', (app, buttons) => {
   const doc = app?.document;
   // Only a document's own sheet; skips helper apps that also expose `document`.
   if (!(doc instanceof foundry.abstract.Document) || doc.sheet !== app) return;

   if (doc instanceof Actor) utils.injectActorHeaderButtons(app, buttons);
   else if (doc instanceof Item) utils.injectItemHeaderButtons(app, buttons);
});

// ========================================
// AppV2 Header Controls (ApplicationV2 / DocumentSheetV2)
// ========================================
Hooks.on('getHeaderControlsApplicationV2', (app, controls) => {
   utils.injectHeaderControlsV2(app, controls);
});

