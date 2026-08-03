# Copilot Instructions for antifriz-roleplay-stuff

## Project Overview
This is a Foundry VTT module built with:
- **ES Modules** (ESM) architecture

## General Foundry API Routing

For broad requests that may not name a specific file, route manually to the user-level Foundry V13 skills in `~/.copilot/skills/`:
- Use `c:\Users\Yaroslav\source\repos\Test_AI_thigs\MDs\RPG_RULES\FFG\FOUNDRY\foundryAPI\AGENT_INDEX.md` as the quick map and `api.md` in that folder for public/protected/private/internal API rules.
- Requests involving broad Foundry API lookup, namespaces, signatures, or public/private status: load `foundry-v13-api-lookup`.
- Requests involving Documents, DataModels, TypeDataModels, embedded documents, flags, UUIDs, or compendiums: load `foundry-v13-documents-datamodels`.
- Requests involving hooks, lifecycle events, render hooks, AppV2 header hooks, document hooks, or canvas hooks: load `foundry-v13-hooks`.
- Requests involving ApplicationV2, DocumentSheetV2, DialogV2, FilePicker, ImagePopout, TextEditor, ContextMenu, or Foundry UI: load `foundry-v13-applications-ui`.
- If a request also involves TRL/Svelte integration, load the relevant `trl-*` skill after confirming the Foundry API surface.
- For real Foundry implementation patterns, refer to `c:\Users\Yaroslav\source\repos\Test_AI_things\Examples\FoundrySystemExamples`.
- For module-specific implementation and code verification, refer to `d:\FoundryUserData\Data\modules\antifriz-roleplay-stuff`.

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
