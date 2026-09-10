import { SvelteApp } from '#runtime/svelte/application';
import { deepMerge } from '#runtime/util/object';

import MovementRulerShell from '../../view/MovementRulerShell.svelte';

/**
 * Movement Ruler configuration application.
 * @extends {SvelteApp}
 */
export class MovementRulerApp extends SvelteApp {
   /**
    * Open the app, focusing an existing window instead of duplicating it.
    * @returns {MovementRulerApp}
    */
   static open() {
      const existingApp = Object.values(ui.windows).find((w) => w instanceof MovementRulerApp);

      if (existingApp) {
         existingApp.render(true, { focus: true });
         return existingApp;
      }

      const app = new this();
      app.render(true);
      return app;
   }

   /**
    * @returns {SvelteApp.Options}
    */
   static get defaultOptions() {
      return deepMerge(super.defaultOptions, {
         id: 'movement-ruler-config',
         classes: ['antifriz-roleplay-stuff', 'movement-ruler-config'],
         title: 'MOVEMENTRULER.Title',
         width: 520,
         height: 'auto',
         resizable: true,
         minimizable: false,

         svelte: {
            class: MovementRulerShell,
            target: document.body,
            intro: true,
            props: {}
         }
      });
   }
}
