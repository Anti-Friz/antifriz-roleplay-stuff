import { SvelteApp } from '#runtime/svelte/application';
import { deepMerge } from '#runtime/util/object';
import { TJSDocument } from '#runtime/svelte/store/fvtt/document';

import { PortraitGalleryShell } from '#view';

/**
 * Portrait Gallery Application
 * Allows managing portrait and token images for an Actor or Item.
 * Uses TJSDocument for reactive document handling.
 * 
 * @extends {SvelteApp}
 */
export class PortraitGalleryApp extends SvelteApp {
   /**
    * TJSDocument wrapper for reactive document updates
    * @type {TJSDocument}
    */
   #tjsDoc;

   /**
    * @param {Actor|Item} doc - The document (Actor or Item)
    * @param {object} options - Application options
    */
   constructor(doc, options = {}) {
      super({
         ...options,
         id: `gallery-app-${doc.id}`
      });
      this.#tjsDoc = new TJSDocument(doc);
   }

   /**
    * Static method to open the app for a given document.
    * Prevents duplicate windows for the same document.
    * 
    * @param {Actor|Item} doc - The document
    * @returns {PortraitGalleryApp}
    */
   static open(doc) {
      // Check if app already exists for this document
      const existingApp = Object.values(ui.windows).find(
         w => w instanceof PortraitGalleryApp && w.document?.id === doc.id
      );
      
      if (existingApp) {
         existingApp.render(true, { focus: true });
         return existingApp;
      }
      
      const app = new this(doc);
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
         classes: ['antifriz-roleplay-stuff', 'portrait-app'],
         title: 'Gallery',
         width: 500,
         height: 520,
         resizable: true,
         minimizable: true,

         svelte: {
            class: PortraitGalleryShell,
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
      return `${this.document?.name ?? 'Document'}'s Gallery`;
   }

   /**
    * Get the document from TJSDocument
    * @returns {Actor|Item|undefined}
    */
   get document() {
      return this.#tjsDoc.get();
   }

   /**
    * Legacy getter for backward compatibility
    * @returns {Actor|Item|undefined}
    */
   get actor() {
      return this.document;
   }

   /**
    * Get the TJSDocument store
    * @returns {TJSDocument}
    */
   get tjsDoc() {
      return this.#tjsDoc;
   }
}
