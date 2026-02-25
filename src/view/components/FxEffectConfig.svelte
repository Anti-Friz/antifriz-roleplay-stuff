<script>
   /**
    * FxEffectConfig — Reusable effect configuration section.
    * Used for Projectile, Muzzle Flash, and Impact Effect.
    * Supports Sequencer DB path, custom file, and builtin type selection.
    */
   import { createEventDispatcher } from 'svelte';
   import { openAudioPicker, getFilenameFromPath } from '#utils';

   export let title = 'Effect';
   export let config = {};
   export let sequencerAvailable = false;
   export let showSpeed = false;
   export let showMirror = false;
   export let showTravelMode = false;
   export let showScatter = false;

   const dispatch = createEventDispatcher();

   const SOURCES = [
      { value: 'sequencer', label: 'Sequencer DB' },
      { value: 'custom', label: 'Custom File' },
      { value: 'builtin', label: 'Builtin' }
   ];

   const TRAVEL_MODES = [
      { value: 'beam', label: 'Beam / Laser', hint: 'Stretches from source to target' },
      { value: 'projectile', label: 'Projectile', hint: 'Small object travels A → B' },
      { value: 'pulse', label: 'Pulse', hint: 'Short segment travels A → B' }
   ];

   const BUILTIN_PROJECTILE_TYPES = [
      { value: 'tracer', label: 'Tracer' },
      { value: 'beam', label: 'Beam' },
      { value: 'bolt', label: 'Bolt' },
      { value: 'arrow', label: 'Arrow' }
   ];

   const BUILTIN_EFFECT_TYPES = [
      { value: 'flash', label: 'Flash' },
      { value: 'spark', label: 'Spark' },
      { value: 'ripple', label: 'Ripple' },
      { value: 'slash', label: 'Slash' }
   ];

   $: builtinTypes = showSpeed ? BUILTIN_PROJECTILE_TYPES : BUILTIN_EFFECT_TYPES;

   function update(field, value) {
      const updated = { ...config, [field]: value };
      dispatch('changed', updated);
   }

   function updateNumber(field, value) {
      const num = Number(value);
      if (!isNaN(num)) update(field, num);
   }

   function toggleEnabled() {
      update('enabled', !config.enabled);
   }

   function toggleMirror() {
      update('randomizeMirrorY', !config.randomizeMirrorY);
   }

   function pickCustomFile() {
      // Video/image picker for .webm effect files
      const picker = new FilePicker({
         type: 'imagevideo',
         current: config.customFile || '',
         callback: (path) => {
            if (path) {
               update('customFile', path);
            }
         }
      });
      picker.render(true);
   }
</script>

<div class="fx-effect-config">
   <div class="fx-effect-header">
      <h4 class="fx-section-title">{title}</h4>
      <button class="fx-toggle-btn" class:active={config.enabled} on:click={toggleEnabled}
              title={config.enabled ? `Disable ${title}` : `Enable ${title}`}>
         <i class="fas" class:fa-toggle-on={config.enabled} class:fa-toggle-off={!config.enabled}></i>
      </button>
   </div>

   {#if config.enabled}
      <!-- Source selector -->
      <div class="fx-field-row">
         <label class="fx-field-label">Source</label>
         <select value={config.source} on:change={(e) => update('source', e.target.value)}>
            {#each SOURCES as src}
               <option value={src.value} disabled={src.value === 'sequencer' && !sequencerAvailable}>
                  {src.label}{src.value === 'sequencer' && !sequencerAvailable ? ' (not installed)' : ''}
               </option>
            {/each}
         </select>
      </div>

      <!-- Sequencer DB path -->
      {#if config.source === 'sequencer'}
         <div class="fx-field-row">
            <label class="fx-field-label">Path</label>
            <input type="text" value={config.sequencerPath}
                   placeholder="e.g. jb2a.bullet.snipe.blue"
                   on:change={(e) => update('sequencerPath', e.target.value)} />
         </div>
         {#if !sequencerAvailable}
            <p class="fx-warning">
               <i class="fas fa-exclamation-triangle"></i>
               Sequencer not installed — builtin fallback will be used.
            </p>
         {/if}
      {/if}

      <!-- Custom file -->
      {#if config.source === 'custom'}
         <div class="fx-field-row">
            <label class="fx-field-label">File</label>
            <div class="fx-file-picker-row">
               <input type="text" value={config.customFile} readonly
                      placeholder="Select a .webm file" />
               <button class="fx-btn-small" on:click={pickCustomFile}>
                  <i class="fas fa-file"></i>
               </button>
            </div>
         </div>
      {/if}

      <!-- Builtin type -->
      {#if config.source === 'builtin'}
         <div class="fx-field-row">
            <label class="fx-field-label">Type</label>
            <select value={config.builtinType} on:change={(e) => update('builtinType', e.target.value)}>
               {#each builtinTypes as bt}
                  <option value={bt.value}>{bt.label}</option>
               {/each}
            </select>
         </div>
         <div class="fx-field-row">
            <label class="fx-field-label">Color</label>
            <input type="color" value={config.color}
                   on:change={(e) => update('color', e.target.value)} />
         </div>
      {/if}

      <!-- Scale -->
      <div class="fx-field-row">
         <label class="fx-field-label">Scale</label>
         <input type="number" min="0.1" max="5" step="0.1" value={config.scale}
                on:change={(e) => updateNumber('scale', e.target.value)} />
      </div>

      <!-- Speed (projectile only) -->
      {#if showSpeed}
         <div class="fx-field-row">
            <label class="fx-field-label">Speed</label>
            <input type="number" min="0.1" max="5" step="0.1" value={config.speed}
                   on:change={(e) => updateNumber('speed', e.target.value)} />
         </div>
      {/if}

      <!-- Mirror Y (projectile only) -->
      {#if showMirror}
         <label class="fx-checkbox-field">
            <input type="checkbox" checked={config.randomizeMirrorY}
                   on:change={toggleMirror} />
            <span>Randomize mirror Y</span>
         </label>
      {/if}

      <!-- Travel Mode (projectile only) -->
      {#if showTravelMode}
         <div class="fx-field-row">
            <label class="fx-field-label">Travel</label>
            <select value={config.travelMode ?? 'beam'} on:change={(e) => update('travelMode', e.target.value)}>
               {#each TRAVEL_MODES as tm}
                  <option value={tm.value}>{tm.label}</option>
               {/each}
            </select>
         </div>
         <p class="fx-hint">
            <i class="fas fa-info-circle"></i>
            {TRAVEL_MODES.find(t => t.value === (config.travelMode ?? 'beam'))?.hint ?? ''}
         </p>
      {/if}

      <!-- Scatter (projectile destination spread) -->
      {#if showScatter}
         <div class="fx-field-row">
            <label class="fx-field-label">Scatter</label>
            <input type="range" min="0" max="1" step="0.05"
                   value={config.scatter ?? 0.3}
                   on:input={(e) => updateNumber('scatter', e.target.value)} />
            <span class="fx-sound-volume-label">{Math.round((config.scatter ?? 0.3) * 100)}%</span>
         </div>
      {/if}
   {/if}
</div>
