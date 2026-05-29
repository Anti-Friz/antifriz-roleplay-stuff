import { GALLERY_CATEGORIES, getPerceivedImage } from '#utils';

const DEFAULT_PORTRAIT = 'icons/svg/mystery-man.svg';
const tokenTextureState = new WeakMap();

let hooksRegistered = false;

/**
 * Register client-local perceived image hooks.
 */
export function registerPerceivedImageHooks() {
   if (hooksRegistered) return;
   hooksRegistered = true;

   Hooks.on('canvasReady', refreshPerceivedTokenImages);
   Hooks.on('drawToken', applyPerceivedTokenImage);
   Hooks.on('refreshToken', applyPerceivedTokenImage);
   Hooks.on('updateToken', tokenDocument => applyPerceivedTokenImage(tokenDocument.object));
   Hooks.on('updateActor', actor => refreshPerceivedActorImages(actor));
   Hooks.on('renderActorSheet', applyPerceivedActorSheetPortrait);
   Hooks.on('renderDocumentSheetV2', applyPerceivedActorSheetPortrait);
   Hooks.on('renderActorDirectory', applyPerceivedActorDirectoryPortraits);
   Hooks.on('renderApplicationV2', applyPerceivedActorDirectoryPortraitsFromApplicationV2);
}

/**
 * Reapply perceived images for all active canvas tokens.
 */
export function refreshPerceivedTokenImages() {
   if (!canvas?.ready) return;

   for (const token of canvas.tokens?.placeables ?? []) {
      applyPerceivedTokenImage(token);
   }
}

/**
 * Apply the perceived token image to a canvas Token object for this client only.
 * @param {Token} token - Canvas token object
 * @returns {Promise<void>}
 */
export async function applyPerceivedTokenImage(token) {
   const actor = token?.actor;
   if (!actor || !token.mesh) return;

   const perceivedSrc = getPerceivedImage(actor, GALLERY_CATEGORIES.TOKENS, game.user) ?? DEFAULT_PORTRAIT;
   const tokenSrc = token.document?.texture?.src ?? actor.img ?? DEFAULT_PORTRAIT;
   const state = tokenTextureState.get(token);

   if (state?.appliedSrc === perceivedSrc && token.mesh.texture === state.texture) return;
   if (state?.pendingSrc === perceivedSrc) return;

   const requestId = (state?.requestId ?? 0) + 1;
   tokenTextureState.set(token, {
      ...state,
      pendingSrc: perceivedSrc,
      requestId
   });

   const texture = await loadTextureForDisplay(perceivedSrc, tokenSrc);
   const latestState = tokenTextureState.get(token);
   if (latestState?.requestId !== requestId) return;

   if (!texture) {
      tokenTextureState.set(token, {
         ...latestState,
         pendingSrc: null
      });
      return;
   }

   token.texture = texture;
   token.mesh.texture = texture;
   tokenTextureState.set(token, {
      appliedSrc: perceivedSrc,
      documentSrc: tokenSrc,
      pendingSrc: null,
      requestId,
      texture
   });
}

/**
 * Refresh perceived images tied to an actor.
 * @param {Actor} actor - Actor document
 */
export function refreshPerceivedActorImages(actor) {
   if (!actor) return;

   if (canvas?.ready) {
      for (const token of canvas.tokens?.placeables ?? []) {
         if (token.actor?.id === actor.id) applyPerceivedTokenImage(token);
      }
   }

   refreshOpenActorSheetPortraits(actor);
   refreshActorDirectoryPortraits(actor);
}

/**
 * Apply the perceived portrait to a rendered Actor sheet.
 * @param {Application|ApplicationV2} app - Foundry application
 * @param {HTMLElement|jQuery} html - Rendered app HTML
 */
export function applyPerceivedActorSheetPortrait(app, html) {
   const actor = getApplicationActor(app);
   if (!actor) return;

   const root = getRenderRoot(app, html);
   if (!root) return;

   const perceivedSrc = getPerceivedImage(actor, GALLERY_CATEGORIES.PORTRAITS, game.user) ?? DEFAULT_PORTRAIT;
   patchActorPortraitImages(root, actor, perceivedSrc);
}

/**
 * Apply perceived portraits to the Foundry Actor Directory sidebar tab.
 * @param {ApplicationV2} app - ActorDirectory application
 * @param {HTMLElement} html - Rendered actor directory HTML
 */
export function applyPerceivedActorDirectoryPortraits(app, html) {
   const root = getRenderRoot(app, html);
   if (!root) return;

   patchActorDirectoryPortraits(root);
}

/**
 * Apply Actor Directory portrait patches from the generic AppV2 render hook.
 * @param {ApplicationV2} app - Rendered ApplicationV2
 * @param {HTMLElement} html - Rendered application HTML
 */
export function applyPerceivedActorDirectoryPortraitsFromApplicationV2(app, html) {
   if (!isActorDirectoryApplication(app)) return;
   applyPerceivedActorDirectoryPortraits(app, html);
}

/**
 * Patch currently open actor sheets for one actor.
 * @param {Actor} actor - Actor document
 */
function refreshOpenActorSheetPortraits(actor) {
   for (const app of Object.values(ui.windows ?? {})) {
      const appActor = getApplicationActor(app);
      if (appActor?.id !== actor.id) continue;
      applyPerceivedActorSheetPortrait(app);
   }
}

/**
 * Patch open Actor Directory roots for one actor or all visible actors.
 * @param {Actor|null} [actor] - Optional actor document to refresh
 */
function refreshActorDirectoryPortraits(actor = null) {
   for (const root of getActorDirectoryRoots()) {
      patchActorDirectoryPortraits(root, actor);
   }

   globalThis.requestAnimationFrame?.(() => {
      for (const root of getActorDirectoryRoots()) {
         patchActorDirectoryPortraits(root, actor);
      }
   });
}

/**
 * Load a texture through Foundry's public canvas helper.
 * @param {string} src - Preferred image source
 * @param {string} fallback - Fallback image source
 * @returns {Promise<object|null>}
 */
async function loadTextureForDisplay(src, fallback) {
   try {
      const asset = await foundry.canvas.loadTexture(src, { fallback: fallback || DEFAULT_PORTRAIT });
      return resolveTexture(asset);
   } catch (error) {
      console.warn('Antifriz Roleplay Stuff | Failed to load perceived token image', src, error);
      return null;
   }
}

/**
 * Resolve a Texture from either a Texture or Spritesheet return value.
 * @param {object|null} asset - Loaded texture asset
 * @returns {object|null}
 */
function resolveTexture(asset) {
   if (!asset) return null;
   if (asset.baseTexture) return asset;
   if (asset.texture?.baseTexture) return asset.texture;
   if (asset.textures) return Object.values(asset.textures)[0] ?? null;
   return null;
}

/**
 * Get an Actor document from a sheet/application.
 * @param {Application|ApplicationV2} app - Foundry application
 * @returns {Actor|null}
 */
function getApplicationActor(app) {
   const document = app?.document ?? app?.actor ?? app?.object;
   return document?.documentName === 'Actor' ? document : null;
}

/**
 * Check whether an application is the Actor Directory sidebar tab.
 * @param {ApplicationV2} app - Foundry application
 * @returns {boolean}
 */
function isActorDirectoryApplication(app) {
   return app?.constructor?.name === 'ActorDirectory'
      || (app?.documentName === 'Actor' && app?.collection === game.actors)
      || app?.tabName === 'actors';
}

/**
 * Normalize AppV1/AppV2 render roots.
 * @param {Application|ApplicationV2} app - Foundry application
 * @param {HTMLElement|jQuery} html - Rendered app HTML
 * @returns {HTMLElement|null}
 */
function getRenderRoot(app, html) {
   if (html instanceof HTMLElement) return html;
   if (html?.[0] instanceof HTMLElement) return html[0];
   if (app?.element instanceof HTMLElement) return app.element;
   if (app?.element?.[0] instanceof HTMLElement) return app.element[0];
   return null;
}

/**
 * Patch likely actor portrait image elements inside a sheet root.
 * @param {HTMLElement} root - Sheet root element
 * @param {Actor} actor - Actor document
 * @param {string} perceivedSrc - Image visible to the current user
 */
function patchActorPortraitImages(root, actor, perceivedSrc) {
   const forcedSelectors = [
      'img[data-edit="img"]',
      'img[name="img"]',
      'img[data-action="editImage"]'
   ];

   const matchingSelectors = [
      'img.profile-img',
      'img.actor-img',
      'img.character-img',
      'img.character-image',
      '.profile img',
      '.portrait img',
      '.character-portrait img',
      '.sheet-header img'
   ];

   const portraitImages = new Set();
   for (const selector of forcedSelectors) {
      root.querySelectorAll(selector).forEach(image => portraitImages.add(image));
   }

   for (const selector of matchingSelectors) {
      root.querySelectorAll(selector).forEach(image => {
         if (isActorPortraitImage(image, actor.img)) portraitImages.add(image);
      });
   }

   for (const image of portraitImages) {
      patchImageSource(image, perceivedSrc);
   }
}

/**
 * Patch actor portraits inside a sidebar Actor Directory root.
 * @param {HTMLElement} root - Actor directory root
 * @param {Actor|null} [onlyActor] - Optional actor document to limit patching
 */
function patchActorDirectoryPortraits(root, onlyActor = null) {
   for (const entry of getActorDirectoryEntries(root)) {
      const actor = getActorFromDirectoryEntry(entry);
      if (!actor || (onlyActor && actor.id !== onlyActor.id)) continue;

      const perceivedSrc = getPerceivedImage(actor, GALLERY_CATEGORIES.PORTRAITS, game.user) ?? DEFAULT_PORTRAIT;
      for (const image of getDirectoryEntryImages(entry)) {
         patchImageSource(image, perceivedSrc);
      }
   }
}

/**
 * Find actor document entries in an Actor Directory root.
 * @param {HTMLElement} root - Actor directory root
 * @returns {HTMLElement[]}
 */
function getActorDirectoryEntries(root) {
   const selector = '[data-document-id], [data-entry-id], [data-uuid], [data-document-uuid], [data-actor-id]';
   return Array.from(root.querySelectorAll(selector))
      .filter(entry => getActorFromDirectoryEntry(entry));
}

/**
 * Get images that belong to a single directory entry, excluding nested entries.
 * @param {HTMLElement} entry - Actor directory entry
 * @returns {HTMLImageElement[]}
 */
function getDirectoryEntryImages(entry) {
   const entrySelector = '[data-document-id], [data-entry-id], [data-uuid], [data-document-uuid], [data-actor-id]';

   return Array.from(entry.querySelectorAll('img'))
      .filter(image => image.closest(entrySelector) === entry);
}

/**
 * Resolve an Actor document from a sidebar directory entry.
 * @param {HTMLElement} entry - Actor directory entry
 * @returns {Actor|null}
 */
function getActorFromDirectoryEntry(entry) {
   const uuid = entry.dataset.uuid ?? entry.dataset.documentUuid ?? '';
   const uuidParts = uuid.split('.');
   const uuidId = uuidParts[0] === 'Actor' ? uuidParts[1] : null;
   const idCandidates = [
      entry.dataset.actorId,
      entry.dataset.documentId,
      entry.dataset.entryId,
      uuidId
   ];

   for (const id of idCandidates) {
      const actor = id ? game.actors?.get(id) : null;
      if (actor) return actor;
   }

   return null;
}

/**
 * Get currently available Actor Directory DOM roots.
 * @returns {HTMLElement[]}
 */
function getActorDirectoryRoots() {
   const roots = new Set();
   const actorsTab = ui.sidebar?.tabs?.actors;
   const actorTabRoot = getRenderRoot(actorsTab);
   if (actorTabRoot) roots.add(actorTabRoot);

   document.querySelectorAll('#actors, [data-tab="actors"], .actor-directory, .actors-directory').forEach(root => {
      if (root instanceof HTMLElement) roots.add(root);
   });

   return Array.from(roots);
}

/**
 * Check whether an image currently represents the actor portrait.
 * @param {HTMLImageElement} image - Image element
 * @param {string} actorImg - Actor document image
 * @returns {boolean}
 */
function isActorPortraitImage(image, actorImg) {
   const currentSrc = image.getAttribute('src') ?? image.src ?? '';
   const originalSrc = image.dataset.arsOriginalPortraitSrc ?? currentSrc;

   return areSameImagePath(currentSrc, actorImg) || areSameImagePath(originalSrc, actorImg);
}

/**
 * Patch an image element source while preserving its original source marker.
 * @param {HTMLImageElement} image - Image element
 * @param {string} perceivedSrc - Replacement image source
 */
function patchImageSource(image, perceivedSrc) {
   if (!image.dataset.arsOriginalPortraitSrc) {
      image.dataset.arsOriginalPortraitSrc = image.getAttribute('src') ?? image.src ?? '';
   }

   image.setAttribute('src', perceivedSrc);
   image.removeAttribute('srcset');
}

/**
 * Compare Foundry asset paths in relative or browser-expanded form.
 * @param {string} left - First path
 * @param {string} right - Second path
 * @returns {boolean}
 */
function areSameImagePath(left, right) {
   return normalizeImagePath(left) === normalizeImagePath(right);
}

/**
 * Normalize a Foundry asset path for comparison.
 * @param {string} src - Image source path or URL
 * @returns {string}
 */
function normalizeImagePath(src) {
   if (!src) return '';

   try {
      const url = new URL(src, globalThis.location?.href);
      return decodeURIComponent(url.pathname).replace(/^\/+/, '').split('?')[0].split('#')[0];
   } catch {
      return decodeURIComponent(src).replace(/^\/+/, '').split('?')[0].split('#')[0];
   }
}