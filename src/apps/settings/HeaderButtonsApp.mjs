import { SvelteApp } from '#runtime/svelte/application';
import { deepMerge } from '#runtime/util/object';

import HeaderButtonsShell from '../../view/HeaderButtonsShell.svelte';

/**
 * Header Buttons Configuration Application
 * @extends {SvelteApp}
 */
export class HeaderButtonsApp extends SvelteApp {
   /**
    * @param {object} options - Application options
    */
   constructor(options = {}) {
      super(options);
   }

   /**
    * Static method to open the app.
    * Prevents duplicate windows.
    * @returns {HeaderButtonsApp}
    */
   static open() {
      const existingApp = Object.values(ui.windows).find(
         w => w instanceof HeaderButtonsApp
      );
      
      if (existingApp) {
         existingApp.render(true, { focus: true });
         return existingApp;
      }
      
      const app = new this();
      app.render(true);
      return app;
   }

   /**
    * Default Application options
    * @returns {SvelteApp.Options}
    */
   static get defaultOptions() {
      return deepMerge(super.defaultOptions, {
         id: 'header-buttons-config',
         classes: ['antifriz-roleplay-stuff', 'header-buttons-config'],
         title: 'Header Buttons Configuration',
         width: 450,
         height: 'auto',
         resizable: false,
         minimizable: false,

         svelte: {
            class: HeaderButtonsShell,
            target: document.body,
            intro: true,
            props: {}
         }
      });
   }
}
