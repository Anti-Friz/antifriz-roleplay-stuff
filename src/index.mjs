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

// Add buttons to Actor sheets
Hooks.on('getActorSheetHeaderButtons', (sheet, buttons) => {
   utils.injectActorHeaderButtons(sheet, buttons);
});

// Add buttons to Item sheets
Hooks.on('getItemSheetHeaderButtons', (sheet, buttons) => {
   utils.injectItemHeaderButtons(sheet, buttons);
});

