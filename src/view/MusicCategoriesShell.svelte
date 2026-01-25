<svelte:options accessors={true}/>

<script>
   /**
    * MusicCategoriesShell - Configure music categories
    * Allows GM to add/edit/remove music categories
    */
   import { getContext, onMount, onDestroy, tick } from 'svelte';
   import { ApplicationShell } from '#runtime/svelte/component/application';
   import { MODULE_ID, DEFAULT_MUSIC_CATEGORIES } from '#config';
   import { confirmDiscardChanges, notifyInfo, notifyWarn, notifyError } from '#utils';
   
   export let elementRoot = void 0;
   
   const external = getContext('#external');
   const application = external?.application;
   
   // Available icons for grid picker
   const availableIcons = [
      'fa-music', 'fa-swords', 'fa-theater-masks', 'fa-wind', 'fa-heart',
      'fa-skull', 'fa-hat-wizard', 'fa-moon', 'fa-sun', 'fa-bolt',
      'fa-ghost', 'fa-crown', 'fa-campground', 'fa-water', 'fa-mountain',
      'fa-city', 'fa-dragon', 'fa-dungeon', 'fa-fire', 'fa-snowflake',
      'fa-star', 'fa-shield', 'fa-scroll', 'fa-gem', 'fa-coins'
   ];
   
   // Local state
   let categories = [];
   let hasChanges = false;
   let openIconPicker = null;
   let pickerPosition = { x: 0, y: 0 };
   let iconButtons = {};
   let draggedIndex = null;
   let dragOverIndex = null;
   
   // Portal container for dropdown
   let portalContainer = null;
   
   onMount(() => {
      loadCategories();
      // Create portal container
      portalContainer = document.createElement('div');
      portalContainer.className = 'antifriz-icon-picker-portal';
      document.body.appendChild(portalContainer);
   });
   
   onDestroy(() => {
      if (portalContainer) {
         portalContainer.remove();
      }
   });
   
   function loadCategories() {
      const saved = game.settings.get(MODULE_ID, 'musicCategories');
      categories = Array.isArray(saved) && saved.length > 0 
         ? JSON.parse(JSON.stringify(saved))
         : JSON.parse(JSON.stringify(DEFAULT_MUSIC_CATEGORIES));
      hasChanges = false;
   }
   
   
   function addCategory() {
      const newId = `custom_${foundry.utils.randomID(8)}`;
      categories = [...categories, {
         id: newId,
         label: '',
         icon: 'fa-music'
      }];
      hasChanges = true;
   }
   
   function removeCategory(index) {
      if (categories.length <= 1) {
         notifyWarn('At least one category is required.');
         return;
      }
      categories = categories.filter((_, i) => i !== index);
      hasChanges = true;
   }
   
   function updateCategory(index, field, value) {
      categories[index][field] = value;
      categories = categories;
      hasChanges = true;
   }
   
   
   function selectIcon(index, icon) {
      updateCategory(index, 'icon', icon);
      openIconPicker = null;
   }
   
   async function toggleIconPicker(catId, index) {
      if (openIconPicker === catId) {
         openIconPicker = null;
         return;
      }
      
      openIconPicker = catId;
      await tick();
      
      // Calculate position based on button
      const btn = iconButtons[catId];
      if (btn) {
         const rect = btn.getBoundingClientRect();
         pickerPosition = {
            x: rect.left,
            y: rect.bottom + 4
         };
      }
   }
   
   // Drag and drop handlers
   function handleDragStart(e, index) {
      draggedIndex = index;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index.toString());
   }
   
   function handleDragOver(e, index) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      dragOverIndex = index;
   }
   
   function handleDragLeave() {
      dragOverIndex = null;
   }
   
   function handleDrop(e, index) {
      e.preventDefault();
      if (draggedIndex !== null && draggedIndex !== index) {
         const newCategories = [...categories];
         const [removed] = newCategories.splice(draggedIndex, 1);
         newCategories.splice(index, 0, removed);
         categories = newCategories;
         hasChanges = true;
      }
      draggedIndex = null;
      dragOverIndex = null;
   }
   
   function handleDragEnd() {
      draggedIndex = null;
      dragOverIndex = null;
   }
   
   async function saveCategories() {
      const valid = categories.filter(c => c.label?.trim());
      if (valid.length === 0) {
         notifyError('At least one category with a name is required.');
         return;
      }
      
      const cleaned = valid.map(c => ({
         id: c.id,
         label: c.label.trim(),
         icon: c.icon || 'fa-music'
      }));
      
      await game.settings.set(MODULE_ID, 'musicCategories', cleaned);
      notifyInfo('Music categories saved!');
      hasChanges = false;
      application?.close();
   }
   
   function resetToDefaults() {
      categories = JSON.parse(JSON.stringify(DEFAULT_MUSIC_CATEGORIES));
      hasChanges = true;
   }
   
   function cancel() {
      if (hasChanges) {
         confirmDiscardChanges(() => application?.close());
      } else {
         application?.close();
      }
   }
   
   // Close picker when clicking outside
   function handleWindowClick(e) {
      if (openIconPicker && !e.target.closest('.icon-picker-dropdown') && !e.target.closest('.icon-btn')) {
         openIconPicker = null;
      }
   }
   
   // Get current open category index
   $: openCategoryIndex = openIconPicker ? categories.findIndex(c => c.id === openIconPicker) : -1;
   $: openCategory = openCategoryIndex >= 0 ? categories[openCategoryIndex] : null;
</script>

<svelte:window on:click={handleWindowClick} />

<ApplicationShell bind:elementRoot>
   <main class="categories-shell">
      <p class="description">
         Define custom categories for organizing character music. 
         Drag to reorder. Changes apply to all actors and items.
      </p>
      
      <div class="categories-list">
         {#each categories as cat, index (cat.id)}
            <div 
               class="category-row"
               class:dragging={draggedIndex === index}
               class:drag-over={dragOverIndex === index && draggedIndex !== index}
               draggable="true"
               role="listitem"
               on:dragstart={(e) => handleDragStart(e, index)}
               on:dragover={(e) => handleDragOver(e, index)}
               on:dragleave={handleDragLeave}
               on:drop={(e) => handleDrop(e, index)}
               on:dragend={handleDragEnd}
            >
               <span class="drag-handle">
                  <i class="fas fa-grip-vertical"></i>
               </span>
               
               <button 
                  type="button"
                  class="icon-btn"
                  class:active={openIconPicker === cat.id}
                  bind:this={iconButtons[cat.id]}
                  on:click|stopPropagation={() => toggleIconPicker(cat.id, index)}
                  title="Select icon"
               >
                  <i class="fas {cat.icon}"></i>
               </button>
               
               <input 
                  type="text" 
                  class="label-input"
                  placeholder="Category Name"
                  value={cat.label}
                  on:input={(e) => updateCategory(index, 'label', e.target.value)}
               />
               
               <button 
                  type="button" 
                  class="delete-btn"
                  on:click={() => removeCategory(index)}
                  title="Remove category"
                  disabled={categories.length <= 1}
               >
                  <i class="fas fa-trash"></i>
               </button>
            </div>
         {/each}
      </div>
      
      <div class="add-row">
         <button type="button" class="add-btn" on:click={addCategory}>
            <i class="fas fa-plus"></i> Add Category
         </button>
         <button type="button" class="reset-btn" on:click={resetToDefaults}>
            <i class="fas fa-undo"></i> Reset to Defaults
         </button>
      </div>
      
      <footer class="footer-actions">
         <button type="button" class="cancel-btn" on:click={cancel}>
            Cancel
         </button>
         <button 
            type="button" 
            class="save-btn" 
            on:click={saveCategories}
            disabled={!hasChanges}
         >
            <i class="fas fa-save"></i> Save Changes
         </button>
      </footer>
   </main>
</ApplicationShell>

<!-- Icon Picker Portal (rendered via action) -->
{#if openIconPicker && openCategory}
   <div 
      class="icon-picker-dropdown"
      style="position: fixed; left: {pickerPosition.x}px; top: {pickerPosition.y}px; z-index: 10000;"
      use:portal
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="listbox"
      tabindex="-1"
   >
      <div class="icon-grid">
         {#each availableIcons as icon}
            <button 
               type="button"
               class="icon-option"
               class:selected={openCategory.icon === icon}
               on:click={() => selectIcon(openCategoryIndex, icon)}
               title={icon}
            >
               <i class="fas {icon}"></i>
            </button>
         {/each}
      </div>
      <div class="icon-manual">
         <input 
            type="text"
            placeholder="fa-icon-name"
            value={openCategory.icon}
            on:input={(e) => updateCategory(openCategoryIndex, 'icon', e.target.value)}
            on:keydown={(e) => e.key === 'Enter' && (openIconPicker = null)}
         />
      </div>
   </div>
{/if}

<script context="module">
   // Portal action - moves element to body
   function portal(node) {
      document.body.appendChild(node);
      
      return {
         destroy() {
            node.remove();
         }
      };
   }
</script>
