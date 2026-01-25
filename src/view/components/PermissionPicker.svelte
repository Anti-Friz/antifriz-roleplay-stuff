<script>
   /**
    * PermissionPicker - Reusable component for selecting visibility permissions
    * Supports: Everyone, Owner Only, GM Only, Custom (specific players)
    */
   import { createEventDispatcher, tick } from 'svelte';
   import { 
      PERMISSION_TYPES, 
      getPermissionOptions, 
      normalizePermission,
      getPermissionLabel,
      getPermissionIcon,
      getAllPlayers,
      createPermission
   } from '#utils';
   
   export let value = 'all';
   export let compact = false; // Compact mode for tight spaces
   
   const dispatch = createEventDispatcher();
   
   // State
   let isOpen = false;
   let showUserPicker = false;
   let pickerPosition = { x: 0, y: 0 };
   let buttonRef = null;
   let selectedUsers = [];
   
   // Options
   const options = getPermissionOptions();
   $: normalized = normalizePermission(value);
   $: currentLabel = getPermissionLabel(value);
   $: currentIcon = getPermissionIcon(value);
   $: players = getAllPlayers();
   
   // Initialize selected users from value
   $: if (normalized.type === PERMISSION_TYPES.CUSTOM) {
      selectedUsers = [...normalized.users];
   }
   
   async function toggleDropdown(e) {
      e?.stopPropagation();
      
      if (isOpen) {
         closeDropdown();
         return;
      }
      
      isOpen = true;
      showUserPicker = false;
      await tick();
      
      if (buttonRef) {
         const rect = buttonRef.getBoundingClientRect();
         pickerPosition = {
            x: rect.left,
            y: rect.bottom + 4
         };
      }
   }
   
   function closeDropdown() {
      isOpen = false;
      showUserPicker = false;
   }
   
   function selectOption(option) {
      if (option.value === PERMISSION_TYPES.CUSTOM) {
         // Show user picker
         showUserPicker = true;
         selectedUsers = normalized.type === PERMISSION_TYPES.CUSTOM 
            ? [...normalized.users] 
            : [];
      } else {
         // Direct selection
         dispatch('change', createPermission(option.value));
         closeDropdown();
      }
   }
   
   function toggleUser(userId) {
      if (selectedUsers.includes(userId)) {
         selectedUsers = selectedUsers.filter(id => id !== userId);
      } else {
         selectedUsers = [...selectedUsers, userId];
      }
   }
   
   function applyCustomPermission() {
      if (selectedUsers.length === 0) {
         // If no users selected, default to GM only
         dispatch('change', createPermission(PERMISSION_TYPES.GM));
      } else {
         dispatch('change', createPermission(PERMISSION_TYPES.CUSTOM, selectedUsers));
      }
      closeDropdown();
   }
   
   function handleWindowClick(e) {
      if (isOpen && !e.target.closest('.permission-picker')) {
         closeDropdown();
      }
   }
   
   // Portal action
   function portal(node) {
      document.body.appendChild(node);
      return {
         destroy() {
            node.remove();
         }
      };
   }
</script>

<svelte:window on:click={handleWindowClick} />

<div class="permission-picker" class:compact>
   <button 
      type="button"
      class="permission-btn"
      class:active={isOpen}
      bind:this={buttonRef}
      on:click={toggleDropdown}
      title="Set visibility: {currentLabel}"
   >
      <i class="fas {currentIcon}"></i>
      {#if !compact}
         <span class="label">{currentLabel}</span>
         <i class="fas fa-caret-down"></i>
      {/if}
   </button>
</div>

{#if isOpen}
   <div 
      class="permission-dropdown"
      style="position: fixed; left: {pickerPosition.x}px; top: {pickerPosition.y}px; z-index: 10000;"
      use:portal
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="listbox"
      tabindex="-1"
   >
      {#if !showUserPicker}
         <!-- Main options -->
         <div class="options-list">
            {#each options as option}
               <button 
                  type="button"
                  class="option-item"
                  class:selected={normalized.type === option.value}
                  on:click={() => selectOption(option)}
               >
                  <i class="fas {option.icon}"></i>
                  <span>{option.label}</span>
                  {#if normalized.type === option.value}
                     <i class="fas fa-check check-mark"></i>
                  {/if}
               </button>
            {/each}
         </div>
      {:else}
         <!-- User picker -->
         <div class="user-picker">
            <div class="picker-header">
               <button type="button" class="back-btn" on:click={() => showUserPicker = false}>
                  <i class="fas fa-arrow-left"></i>
               </button>
               <span>Select Players</span>
            </div>
            
            <div class="users-list">
               {#if players.length === 0}
                  <div class="no-players">No players found</div>
               {:else}
                  {#each players as player}
                     <label class="user-item">
                        <input 
                           type="checkbox" 
                           checked={selectedUsers.includes(player.id)}
                           on:change={() => toggleUser(player.id)}
                        />
                        <img 
                           src={player.avatar || 'icons/svg/mystery-man.svg'} 
                           alt="" 
                           class="user-avatar"
                        />
                        <span class="user-name" style="color: {player.color}">{player.name}</span>
                        {#if player.active}
                           <span class="online-dot" title="Online"></span>
                        {/if}
                     </label>
                  {/each}
               {/if}
            </div>
            
            <div class="picker-footer">
               <span class="selected-count">{selectedUsers.length} selected</span>
               <button type="button" class="apply-btn" on:click={applyCustomPermission}>
                  Apply
               </button>
            </div>
         </div>
      {/if}
   </div>
{/if}
