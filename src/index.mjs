/**
 * Entry point - registers all hooks.
 * @module antifriz-roleplay-stuff
 */

import './styles/antifriz-roleplay-stuff.scss';

import * as hooks from '#hooks';
import * as utils from '#utils';
import { constants } from '#config';

const LOG_PREFIX = constants.moduleLabel;

Hooks.once('init', async function () {
   hooks.registerSettings();
});

Hooks.once('ready', async function () {
   hooks.registerSocketListeners();
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

