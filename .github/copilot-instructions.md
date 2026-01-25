# Copilot Instructions for antifriz-roleplay-stuff

## Project Overview
This is a Foundry VTT module built with:
- **TyphonJS Runtime Library (TRL)** for Svelte integration
- **Svelte 4** for reactive UI components  
- **Vite** for bundling
- **ES Modules** (ESM) architecture

## Path Aliases (jsconfig.json)
The project uses path aliases via `jsconfig.json`:
- `#applications` → `src/apps/_module.mjs`
- `#config` → `src/config/_module.mjs`
- `#hooks` → `src/hooks/_module.mjs`
- `#utils` → `src/utils/_module.mjs`
- `#view` → `src/view/_module.mjs`
- `#runtime/*` → `@typhonjs-fvtt/runtime/*`
- `#standard/*` → `@typhonjs-fvtt/standard/*`

## Import Patterns

### TRL Runtime imports
```javascript
import { SvelteApp } from '#runtime/svelte/application';
import { TJSGameSettings } from '#runtime/svelte/store/fvtt/settings';
import { TJSDocument } from '#runtime/svelte/store/fvtt/document';
import { ApplicationShell } from '#runtime/svelte/component/application';
import { deepMerge } from '#runtime/util/object';
```

### Internal module imports (use named exports)
```javascript
import { CharacterMusicApp, PortraitGalleryApp } from '#applications';
import { MODULE_ID, constants } from '#config';
import { registerSettings } from '#hooks';
import { CharacterMusicShell, PortraitGalleryShell } from '#view';
```

## Module Constants
- **Module ID**: `antifriz-roleplay-stuff`
- **Flag namespace**: `antifriz-roleplay-stuff`
- **Socket channel**: `module.antifriz-roleplay-stuff`

## SvelteApp Pattern with TJSDocument
Applications should use TJSDocument for reactive document handling:
```javascript
import { TJSDocument } from '#runtime/svelte/store/fvtt/document';

export class MyApp extends SvelteApp {
   #tjsDoc;
   
   constructor(actor, options = {}) {
      super(options);
      this.#tjsDoc = new TJSDocument(actor);
   }
   
   static open(actor) {
      // Prevent duplicate windows
      const existingApp = Object.values(ui.windows).find(
         w => w instanceof MyApp && w.actor?.id === actor.id
      );
      if (existingApp) {
         existingApp.render(true, { focus: true });
         return existingApp;
      }
      
      const app = new this(actor);
      app.render(true);
      return app;
   }
   
   static get defaultOptions() {
      return deepMerge(super.defaultOptions, {
         id: 'my-app-{id}',
         classes: ['antifriz-roleplay-stuff', 'my-app'],
         svelte: {
            class: MyShell,
            props: function() {
               return { tjsDoc: this.#tjsDoc };
            }
         }
      });
   }
   
   get actor() {
      return this.#tjsDoc.get();
   }
}
```

## Svelte Shell Components with TJSDocument
Required exports for TRL ApplicationShell:
```svelte
<svelte:options accessors={true}/>

<script>
   import { getContext } from 'svelte';
   import { ApplicationShell } from '#runtime/svelte/component/application';
   import { MODULE_ID } from '#config';
   
   export let elementRoot = void 0;
   export let tjsDoc = null;
   
   // Access application context
   const external = getContext('#external');
   const application = external?.application;
   
   // Reactive actor from TJSDocument store
   $: actor = tjsDoc ? $tjsDoc : null;
   
   // Use MODULE_ID constant for flags
   $: data = actor?.getFlag(MODULE_ID, 'flagKey') ?? {};
</script>

<ApplicationShell bind:elementRoot>
   <!-- content -->
</ApplicationShell>
```

## CSS/SCSS Structure
Styles are organized in `src/styles/components/`:
- `_shared.scss` - CSS variables using Foundry theme vars
- `_music-shell.scss` - Music app styles
- `_gallery-shell.scss` - Gallery app styles

Use CSS variables for theming:
```scss
.antifriz-roleplay-stuff {
   // Use Foundry CSS variables
   --ars-bg-primary: var(--color-bg-option, #1a1a2e);
   --ars-text-primary: var(--color-text-primary, #e0e0e0);
   --ars-accent: var(--color-text-hyperlink, #7c3aed);
}
```

## Foundry VTT v13 APIs
Use namespaced APIs for v13:
```javascript
// FilePicker
new foundry.applications.apps.FilePicker.implementation({ ... })

// ImagePopout  
new foundry.applications.apps.ImagePopout({ src, window: { title } })

// Random ID
foundry.utils.randomID()
```


## Actor Flags Usage
```javascript
// Get flag
actor.getFlag('antifriz-roleplay-stuff', 'flagKey')

// Set flag
await actor.setFlag('antifriz-roleplay-stuff', 'flagKey', value)
```

## File Structure
```
src/
├── apps/                  # SvelteApp application classes
│   ├── _module.mjs        # Barrel export
│   └── characterSheetAddition/
├── config/                # Module configuration
│   ├── _module.mjs        # Barrel export with MODULE_ID
│   └── module.mjs         # Constants
├── hooks/                 # Foundry hooks registration
│   ├── _module.mjs
│   └── settings.mjs
├── utils/                 # Helper functions
│   ├── _module.mjs
│   └── sheetHelpers.mjs
├── view/                  # Svelte components
│   ├── _module.mjs        # Named exports for shells
│   └── *.svelte
├── styles/
│   └── antifriz-roleplay-stuff.scss
└── index.mjs              # Entry point
```

## Build Commands
```bash
npm run build   # Production build
npm run dev     # Development server (port 30001)
```
