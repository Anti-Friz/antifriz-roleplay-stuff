import { SvelteApp } from '#runtime/svelte/application';
import { deepMerge } from '#runtime/util/object';

import MusicCategoriesShell from '../../view/MusicCategoriesShell.svelte';

/**
 * Music Categories Configuration Application
 * @extends {SvelteApp}
 */
export class MusicCategoriesApp extends SvelteApp {
   /**
    * @param {object} options - Application options
    */
   constructor(options = {}) {
      super(options);
   }

   /**
    * Static method to open the app.
    * Prevents duplicate windows.
    * @returns {MusicCategoriesApp}
    */
   static open() {
      const existingApp = Object.values(ui.windows).find(
         w => w instanceof MusicCategoriesApp
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
         id: 'music-categories-config',
         classes: ['antifriz-roleplay-stuff', 'categories-config'],
         title: 'Music Categories',
         width: 520,
         height: 470,
         resizable: true,
         minimizable: false,

         svelte: {
            class: MusicCategoriesShell,
            target: document.body,
            intro: true,
            props: {}
         }
      });
   }
}
