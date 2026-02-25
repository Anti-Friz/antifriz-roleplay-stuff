<script>
   /**
    * FxSoundList — Manage a list of weapon FX sounds.
    * Supports add/remove, volume slider, weight, and sound mode selection.
    * Dispatches events to parent for persistence.
    */
   import { createEventDispatcher } from 'svelte';
   import { openAudioPicker, getFilenameFromPath } from '#utils';

   export let sounds = [];
   export let soundMode = 'random';

   const dispatch = createEventDispatcher();

   const SOUND_MODES = [
      { value: 'random', label: 'Random' },
      { value: 'sequential', label: 'Sequential' },
      { value: 'all', label: 'All at once' }
   ];

   // Track which sound id is in volume-edit mode
   let editingVolumeId = null;
   let editingVolumeValue = '';

   function addSound() {
      openAudioPicker((path) => {
         if (!path) return;
         const newSound = {
            id: foundry.utils.randomID(),
            path,
            name: getFilenameFromPath(path),
            volume: 0.8,
            weight: 1
         };
         dispatch('soundsChanged', { sounds: [...sounds, newSound] });
      });
   }

   function addSoundsFromFolder() {
      // User picks ANY audio file — we import ALL audio files from that file's folder
      const picker = new FilePicker({
         type: 'audio',
         callback: async (path) => {
            if (!path) return;
            const dir = path.substring(0, path.lastIndexOf('/'));
            if (!dir) return;

            try {
               const result = await FilePicker.browse('data', dir);
               const audioFiles = (result.files ?? []).filter(f =>
                  /\.(ogg|mp3|wav|flac|webm|m4a)$/i.test(f)
               );
               if (audioFiles.length === 0) {
                  ui.notifications.warn('No audio files found in that folder.');
                  return;
               }
               const existingPaths = new Set(sounds.map(s => s.path));
               const newSounds = audioFiles
                  .filter(f => !existingPaths.has(f))
                  .map(f => ({
                     id: foundry.utils.randomID(),
                     path: f,
                     name: getFilenameFromPath(f),
                     volume: 0.8,
                     weight: 1
                  }));
               if (newSounds.length > 0) {
                  dispatch('soundsChanged', { sounds: [...sounds, ...newSounds] });
                  ui.notifications.info(`Added ${newSounds.length} sound(s) from folder`);
               } else {
                  ui.notifications.info('All files from that folder are already added.');
               }
            } catch (err) {
               console.warn('[ARS] Failed to browse folder for sounds:', err);
               ui.notifications.error('Failed to read folder contents.');
            }
         }
      });
      picker.render(true);
   }

   function removeSound(id) {
      dispatch('soundsChanged', { sounds: sounds.filter(s => s.id !== id) });
   }

   function updateSound(id, field, value) {
      const updated = sounds.map(s => {
         if (s.id !== id) return s;
         return { ...s, [field]: field === 'volume' || field === 'weight' ? Number(value) : value };
      });
      dispatch('soundsChanged', { sounds: updated });
   }

   function setMode(mode) {
      dispatch('soundModeChanged', { mode });
   }

   function previewSound(sound) {
      const audio = new Audio(sound.path);
      audio.volume = sound.volume ?? 0.8;
      audio.play().catch(err => console.warn('[ARS] Sound preview failed:', err));
   }

   function startEditVolume(sound) {
      editingVolumeId = sound.id;
      editingVolumeValue = String(Math.round((sound.volume ?? 0.8) * 100));
   }

   function commitEditVolume(id) {
      const num = parseInt(editingVolumeValue, 10);
      if (!isNaN(num)) {
         const clamped = Math.max(0, Math.min(100, num)) / 100;
         updateSound(id, 'volume', clamped);
      }
      editingVolumeId = null;
   }

   function cancelEditVolume() {
      editingVolumeId = null;
   }
</script>

<div class="fx-sound-list">
   <!-- Sound entries -->
   {#if sounds.length === 0}
      <p class="fx-empty-hint">No sounds added. Click <strong>+ Add</strong> to pick an audio file.</p>
   {:else}
      {#each sounds as sound (sound.id)}
         <div class="fx-sound-entry">
            <button class="fx-sound-preview" on:click={() => previewSound(sound)} title="Preview">
               <i class="fas fa-volume-up"></i>
            </button>
            <span class="fx-sound-name" title={sound.path}>{sound.name}</span>
            <input type="range" class="fx-sound-volume" min="0" max="1" step="0.05"
                   value={sound.volume}
                   on:input={(e) => updateSound(sound.id, 'volume', e.target.value)} />
            {#if editingVolumeId === sound.id}
               <input type="number" class="fx-sound-volume-input" min="0" max="100" step="1"
                      bind:value={editingVolumeValue}
                      on:blur={() => commitEditVolume(sound.id)}
                      on:keydown={(e) => {
                         if (e.key === 'Enter') commitEditVolume(sound.id);
                         if (e.key === 'Escape') cancelEditVolume();
                      }}
                      autofocus />
            {:else}
               <!-- svelte-ignore a11y-no-static-element-interactions -->
               <span class="fx-sound-volume-label" on:dblclick={() => startEditVolume(sound)}
                     title="Double-click to type">{Math.round((sound.volume ?? 0.8) * 100)}%</span>
            {/if}
            <button class="fx-sound-remove" on:click={() => removeSound(sound.id)} title="Remove">
               <i class="fas fa-times"></i>
            </button>
         </div>
      {/each}
   {/if}

   <!-- Add buttons -->
   <div class="fx-sound-add-row">
      <button class="fx-btn fx-btn-add" on:click={addSound}>
         <i class="fas fa-plus"></i> Add
      </button>
      <button class="fx-btn fx-btn-add" on:click={addSoundsFromFolder}
              title="Pick any file — all audio from that folder will be added">
         <i class="fas fa-folder-open"></i> Folder
      </button>
   </div>

   <!-- Sound mode selector -->
   {#if sounds.length > 1}
      <div class="fx-sound-mode">
         <span class="fx-sound-mode-label">Mode:</span>
         <select value={soundMode} on:change={(e) => setMode(e.target.value)}>
            {#each SOUND_MODES as sm}
               <option value={sm.value}>{sm.label}</option>
            {/each}
         </select>
         <p class="fx-hint">
            <i class="fas fa-info-circle"></i>
            {#if soundMode === 'random'}
               Sound is picked randomly on each use
            {:else if soundMode === 'sequential'}
               Sounds play in order, cycling through the list
            {:else}
               All sounds play simultaneously
            {/if}
         </p>
      </div>
   {/if}
</div>
