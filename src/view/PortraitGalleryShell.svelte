<svelte:options accessors={true}/>

<script>
   /**
    * PortraitGalleryShell - Manage images for Actors or Items.
    * Uses TJSDocument for reactive document updates.
    * Supports ownership permissions for images.
    */
   import { getContext } from 'svelte';
   import { ApplicationShell } from '#runtime/svelte/component/application';
   import { MODULE_ID } from '#config';
   import { canUserSee, normalizePermission, getPermissionLabel, getPermissionIcon, PERMISSION_TYPES, openImagePicker, getFilenameFromPath } from '#utils';
   import PermissionPicker from './components/PermissionPicker.svelte';
   
   // Required for TRL ApplicationShell
   export let elementRoot = void 0;
   
   // TJSDocument passed from application (reactive store)
   export let tjsDoc = null;
   
   
   // Access application context
   const external = getContext('#external');
   const application = external?.application;
   
   // Reactive document from TJSDocument store
   $: doc = tjsDoc ? $tjsDoc : null;
   
   // Check document type
   $: isActor = doc?.documentName === 'Actor';
   $: isItem = doc?.documentName === 'Item';
   $: isGM = game.user.isGM;
   
   // Default images
   const DEFAULT_IMG = 'icons/svg/mystery-man.svg';
   
   // Reactive image paths
   $: currentImg = doc?.img ?? DEFAULT_IMG;
   $: currentToken = isActor ? (doc?.prototypeToken?.texture?.src ?? currentImg) : null;
   
   // UI State - Items only have 'images' tab
   let activeTab = 'portraits';
   let searchFilter = '';
   
   // Reset tab when switching document types
   $: if (isItem) activeTab = 'portraits';
   
   // Saved images from document flags
   $: savedData = doc?.getFlag(MODULE_ID, 'gallery') ?? { portraits: [], tokens: [] };
   $: portraits = savedData.portraits ?? [];
   $: tokens = savedData.tokens ?? [];
   $: currentList = activeTab === 'portraits' ? portraits : tokens;
   
   // Filter list based on search AND ownership permissions
   $: filteredList = currentList.filter(item => {
      // Search filter
      const matchesSearch = !searchFilter || 
         item.name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
         item.path?.toLowerCase().includes(searchFilter.toLowerCase());
      
      if (!matchesSearch) return false;
      
      // Ownership filter using centralized permission system
      return canUserSee(item.ownership, game.user, doc);
   });
   
   // ============================================
   // IMAGE POPOUT
   // ============================================
   
   function showImagePopout(imagePath, title = 'Image') {
      new foundry.applications.apps.ImagePopout({ src: imagePath, window: { title } }).render(true);
   }
   
   // ============================================
   // GALLERY ACTIONS
   // ============================================
   
   async function togglePortrait(imagePath) {
      const newImg = currentImg === imagePath ? DEFAULT_IMG : imagePath;
      await doc.update({ img: newImg });
   }
   
   async function toggleToken(imagePath) {
      if (!isActor) return;
      const newSrc = currentToken === imagePath ? DEFAULT_IMG : imagePath;
      await doc.update({ 'prototypeToken.texture.src': newSrc });
   }
   
   async function saveToCategory(imagePath, category, name = '', ownership = 'all') {
      const data = doc.getFlag(MODULE_ID, 'gallery') ?? { portraits: [], tokens: [] };
      const list = data[category] ?? [];
      
      if (list.some(p => p.path === imagePath)) return;
      
      list.push({
         path: imagePath,
         name: name || imagePath.split('/').pop().replace(/\.[^/.]+$/, ''),
         ownership,
         addedAt: Date.now()
      });
      
      await doc.setFlag(MODULE_ID, 'gallery', { ...data, [category]: list });
   }
   
   async function updateImageOwnership(imagePath, category, ownership) {
      const data = doc.getFlag(MODULE_ID, 'gallery') ?? { portraits: [], tokens: [] };
      const list = (data[category] ?? []).map(item => 
         item.path === imagePath ? { ...item, ownership } : item
      );
      await doc.setFlag(MODULE_ID, 'gallery', { ...data, [category]: list });
   }
   
   async function removeFromCategory(imagePath, category) {
      const data = doc.getFlag(MODULE_ID, 'gallery') ?? { portraits: [], tokens: [] };
      const list = (data[category] ?? []).filter(p => p.path !== imagePath);
      await doc.setFlag(MODULE_ID, 'gallery', { ...data, [category]: list });
      
      // Reset to default if removing current image
      if (category === 'portraits' && currentImg === imagePath) {
         await doc.update({ img: DEFAULT_IMG });
      }
      if (isActor && category === 'tokens' && currentToken === imagePath) {
         await doc.update({ 'prototypeToken.texture.src': DEFAULT_IMG });
      }
   }
   
   async function moveToCategory(imagePath, fromCategory, toCategory) {
      const data = doc.getFlag(MODULE_ID, 'gallery') ?? { portraits: [], tokens: [] };
      const fromList = data[fromCategory] ?? [];
      const toList = data[toCategory] ?? [];
      
      const item = fromList.find(p => p.path === imagePath);
      if (!item || toList.some(p => p.path === imagePath)) return;
      
      const newFromList = fromList.filter(p => p.path !== imagePath);
      toList.push(item);
      
      await doc.setFlag(MODULE_ID, 'gallery', { 
         ...data, 
         [fromCategory]: newFromList, 
         [toCategory]: toList 
      });
   }
   
   async function browseForImage() {
      const category = activeTab;
      const currentPath = category === 'portraits' ? currentImg : currentToken;
      
      openImagePicker(async (path) => {
         if (category === 'portraits') {
            await doc.update({ img: path });
         } else if (isActor) {
            await doc.update({ 'prototypeToken.texture.src': path });
         }
         await saveToCategory(path, category);
      }, currentPath !== DEFAULT_IMG ? currentPath : '');
   }
   
   function handleImageClick(event, item) {
      showImagePopout(item.path, item.name);
   }
</script>

<ApplicationShell bind:elementRoot>
<main class="gallery-shell">
   <!-- Header with current image preview -->
   <header class="gallery-header">
      <div class="current-portraits">
         <button 
            type="button"
            class="portrait-preview" 
            class:active={activeTab === 'portraits'}
            on:click={() => showImagePopout(currentImg, 'Image')}
            title="Click to view full size"
         >
            <img src={currentImg} alt="" role="presentation" />
            <span class="preview-label">{isItem ? 'Image' : 'Portrait'}</span>
         </button>
         {#if isActor}
            <button 
               type="button"
               class="portrait-preview token" 
               class:active={activeTab === 'tokens'}
               on:click={() => showImagePopout(currentToken, 'Token')}
               title="Click to view full size"
            >
               <img src={currentToken} alt="" role="presentation" />
               <span class="preview-label">Token</span>
            </button>
         {/if}
      </div>
         
      <button type="button" class="browse-btn" on:click={browseForImage}>
         <i class="fas fa-folder-open"></i> 
         {#if isItem}
            Add Image
         {:else}
            {activeTab === 'portraits' ? 'Add Portrait' : 'Add Token'}
         {/if}
         </button>
      </header>
      
      <!-- Search bar -->
      <div class="search-bar">
         <i class="fas fa-search"></i>
         <input 
            type="search" 
            placeholder="Search..."
            bind:value={searchFilter}
         />
      </div>
      
      <!-- Tabs (only for Actors) -->
      {#if isActor}
         <nav class="gallery-tabs">
            <button 
               type="button" 
               class:active={activeTab === 'portraits'}
               on:click={() => activeTab = 'portraits'}
            >
               <i class="fas fa-user"></i> Portraits ({portraits.length})
            </button>
            <button 
               type="button" 
               class:active={activeTab === 'tokens'}
               on:click={() => activeTab = 'tokens'}
            >
               <i class="fas fa-circle-user"></i> Tokens ({tokens.length})
            </button>
         </nav>
      {/if}
      
      <!-- Gallery Content -->
      <section class="gallery-content">
         <div class="image-grid">
            {#if filteredList.length === 0}
               <div class="empty-state">
                  <i class="fas fa-images fa-3x"></i>
                  <p>No {isItem ? 'images' : activeTab} saved yet</p>
                  <p class="hint">Click "Add {isItem ? 'Image' : (activeTab === 'portraits' ? 'Portrait' : 'Token')}" to browse and add images</p>
               </div>
            {:else}
               {#each filteredList as item (item.path)}
                  {@const isCurrentPortrait = activeTab === 'portraits' && currentImg === item.path}
                  {@const isCurrentToken = activeTab === 'tokens' && currentToken === item.path}
                  {@const isCurrent = isCurrentPortrait || isCurrentToken}
                  {@const itemPermission = normalizePermission(item.ownership)}
                  <div 
                     class="image-card"
                     class:is-current={isCurrent}
                     on:click={(e) => handleImageClick(e, item)}
                     on:keydown={(e) => e.key === 'Enter' && handleImageClick(e, item)}
                     role="button"
                     tabindex="0"
                     title="Click to view full size"
                  >
                     <img src={item.path} alt={item.name} loading="lazy" />
                     
                     {#if isCurrent}
                        <div class="status-badge">
                           <i class="fas fa-check"></i>
                        </div>
                     {/if}
                     
                     <!-- Ownership indicator (visible only to GM if not 'all') -->
                     {#if isGM && itemPermission.type !== PERMISSION_TYPES.ALL}
                        <div class="ownership-badge" title="Visibility: {getPermissionLabel(item.ownership)}">
                           <i class="fas {getPermissionIcon(item.ownership)}"></i>
                        </div>
                     {/if}
                     
                     <div class="image-overlay">
                        <span class="image-name">{item.name}</span>
                        <div class="image-actions">
                           <button 
                              type="button" 
                              title={isCurrent ? "Reset to default" : (isItem ? "Set as Image" : (activeTab === 'portraits' ? "Set as Portrait" : "Set as Token"))}
                              class:active={isCurrent}
                              on:click|stopPropagation={() => activeTab === 'portraits' ? togglePortrait(item.path) : toggleToken(item.path)}
                           >
                              <i class="fas fa-{isCurrent ? 'times' : 'check'}"></i>
                           </button>
                           {#if isActor}
                              <button 
                                 type="button" 
                                 title="Move to {activeTab === 'portraits' ? 'Tokens' : 'Portraits'}"
                                 on:click|stopPropagation={() => moveToCategory(item.path, activeTab, activeTab === 'portraits' ? 'tokens' : 'portraits')}
                              >
                                 <i class="fas fa-arrow-right-arrow-left"></i>
                              </button>
                           {/if}
                           <!-- Ownership selector (GM only) -->
                           {#if isGM}
                              <div on:click|stopPropagation on:keydown|stopPropagation role="presentation">
                                 <PermissionPicker 
                                    value={item.ownership}
                                    compact={true}
                                    on:change={(e) => updateImageOwnership(item.path, activeTab, e.detail)}
                                 />
                              </div>
                           {/if}
                           <button 
                              type="button" 
                              class="remove"
                              title="Remove from gallery"
                              on:click|stopPropagation={() => removeFromCategory(item.path, activeTab)}
                           >
                              <i class="fas fa-trash"></i>
                           </button>
                        </div>
                     </div>
                  </div>
               {/each}
            {/if}
         </div>
      </section>
   </main>
</ApplicationShell>
