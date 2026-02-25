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
// AppV1 Header Buttons (Legacy / v12 and prior)
// ========================================
Hooks.on('getActorSheetHeaderButtons', (sheet, buttons) => {
   utils.injectActorHeaderButtons(sheet, buttons);
});

Hooks.on('getItemSheetHeaderButtons', (sheet, buttons) => {
   utils.injectItemHeaderButtons(sheet, buttons);
});

// ========================================
// AppV2 Header Buttons (Foundry v12+ DocumentSheetV2)
// ========================================
Hooks.on('renderDocumentSheetV2', (app, el) => {
   utils.injectDocumentSheetV2Buttons(app, el);
});

