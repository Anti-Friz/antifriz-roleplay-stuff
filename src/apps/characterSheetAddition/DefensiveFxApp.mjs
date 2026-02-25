import { SvelteApp } from '#runtime/svelte/application';
import { deepMerge } from '#runtime/util/object';
import { TJSDocument } from '#runtime/svelte/store/fvtt/document';

import { DefensiveFxShell } from '#view';

/**
 * Defensive FX Application
 * Allows configuring defensive/reactive effects for an Item (armor, shield, force field).
 * Uses TJSDocument for reactive document handling.
 *
 * @extends {SvelteApp}
 */
export class DefensiveFxApp extends SvelteApp {
   /**
    * TJSDocument wrapper for reactive document updates
    * @type {TJSDocument}
    */
   #tjsDoc;

   /**
    * @param {Item} item - The Item document
    * @param {object} options - Application options
    */
   constructor(item, options = {}) {
      super({
         ...options,
         id: `defensive-fx-app-${item.id}`
      });
      this.#tjsDoc = new TJSDocument(item);
   }

   /**
    * Static method to open the app for a given item.
    * Prevents duplicate windows for the same item.
    *
    * @param {Item} item - The item document
    * @returns {DefensiveFxApp}
    */
   static open(item) {
      const existingApp = Object.values(ui.windows).find(
         w => w instanceof DefensiveFxApp && w.document?.id === item.id
      );

      if (existingApp) {
         existingApp.render(true, { focus: true });
         return existingApp;
      }

      const app = new this(item);
      app.render(true);
      return app;
   }

   /**
    * Default Application options
    *
    * @returns {SvelteApp.Options} options - SvelteApp options.
    */
   static get defaultOptions() {
      return deepMerge(super.defaultOptions, {
         classes: ['antifriz-roleplay-stuff', 'defensive-fx-app'],
         title: 'Defensive FX',
         width: 460,
         height: 550,
         resizable: true,
         minimizable: true,

         svelte: {
            class: DefensiveFxShell,
            target: document.body,
            intro: true,
            props: function() {
               return {
                  tjsDoc: this.#tjsDoc
               };
            }
         }
      });
   }

   /**
    * Get the application title
    * @returns {string}
    */
   get title() {
      return `${this.document?.name ?? 'Item'} — Defensive FX`;
   }

   /**
    * Get the document from TJSDocument
    * @returns {Item|undefined}
    */
   get document() {
      return this.#tjsDoc.get();
   }

   /**
    * Get the TJSDocument store
    * @returns {TJSDocument}
    */
   get tjsDoc() {
      return this.#tjsDoc;
   }
}
