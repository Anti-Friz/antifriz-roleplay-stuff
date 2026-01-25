<svelte:options accessors={true}/>

<script>
   /**
    * HeaderButtonsShell - Configure header buttons visibility
    * Allows users to toggle Music and Gallery buttons for Actor and Item sheets
    */
   import { getContext } from 'svelte';
   import { ApplicationShell } from '#runtime/svelte/component/application';
   import { MODULE_ID } from '#config';
   import { notifyInfo } from '#utils';
   
   export let elementRoot = void 0;
   
   const external = getContext('#external');
   const application = external?.application;
   
   // Local state
   let showMusicButton = true;
   let showGalleryButton = true;
   let showItemMusicButton = true;
   let showItemGalleryButton = true;
   
   // Load current settings
   function loadSettings() {
      showMusicButton = game.settings.get(MODULE_ID, 'showMusicButton');
      showGalleryButton = game.settings.get(MODULE_ID, 'showGalleryButton');
      showItemMusicButton = game.settings.get(MODULE_ID, 'showItemMusicButton');
      showItemGalleryButton = game.settings.get(MODULE_ID, 'showItemGalleryButton');
   }
   
   // Save settings
   async function save() {
      await game.settings.set(MODULE_ID, 'showMusicButton', showMusicButton);
      await game.settings.set(MODULE_ID, 'showGalleryButton', showGalleryButton);
      await game.settings.set(MODULE_ID, 'showItemMusicButton', showItemMusicButton);
      await game.settings.set(MODULE_ID, 'showItemGalleryButton', showItemGalleryButton);
      
      notifyInfo('Header buttons configuration saved!');
      application.close();
   }
   
   function cancel() {
      application.close();
   }
   
   // Initialize on mount
   loadSettings();
</script>

<ApplicationShell bind:elementRoot>
   <div class="header-buttons-config-content">
      <div class="config-section">
         <h3><i class="fas fa-user"></i> Actor Sheets</h3>
         <div class="setting-row">
            <label>
               <input type="checkbox" bind:checked={showMusicButton}>
               <i class="fas fa-music"></i>
               Show Music Button
            </label>
         </div>
         <div class="setting-row">
            <label>
               <input type="checkbox" bind:checked={showGalleryButton}>
               <i class="fas fa-image"></i>
               Show Gallery Button
            </label>
         </div>
      </div>
      
      <div class="config-section">
         <h3><i class="fas fa-suitcase"></i> Item Sheets</h3>
         <div class="setting-row">
            <label>
               <input type="checkbox" bind:checked={showItemMusicButton}>
               <i class="fas fa-music"></i>
               Show Music Button
            </label>
         </div>
         <div class="setting-row">
            <label>
               <input type="checkbox" bind:checked={showItemGalleryButton}>
               <i class="fas fa-image"></i>
               Show Gallery Button
            </label>
         </div>
      </div>
      
      <div class="button-row">
         <button class="save-btn" on:click={save}>
            <i class="fas fa-save"></i> Save
         </button>
         <button class="cancel-btn" on:click={cancel}>
            <i class="fas fa-times"></i> Cancel
         </button>
      </div>
   </div>
</ApplicationShell>

