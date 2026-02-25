<svelte:options accessors={true}/>

<script>
   /**
    * DefensiveFxShell — Configure defensive/reactive FX for an item.
    *
    * Sections:
    * - Enable toggle
    * - Shield Hit (reactive: one-shot effect when bearer takes damage through shield)
    * - Armor Deflect (reactive: save succeeded — sparks, ricochet)
    * - Armor Penetrate (reactive: save failed — blood, damage)
    * - Shield Aura (persistent shield — intro→loop→outro, or reactive flash)
    * - Test buttons
    */
   import { getContext } from 'svelte';
   import { ApplicationShell } from '#runtime/svelte/component/application';
   import { MODULE_ID } from '#config';
   import { openAudioPicker, playDefensiveFx, exportDefensiveFx, importFxToItem, copyFxToClipboard, downloadFxAsFile } from '#utils';

   export let elementRoot = void 0;
   export let tjsDoc = null;

   const external = getContext('#external');
   const application = external?.application;

   $: doc = tjsDoc ? $tjsDoc : null;

   // ==========================================
   // Default config shape
   // ==========================================
   const D = {
      enabled: false,
      onHit: {
         enabled: false,
         effect: { source: 'sequencer', sequencerPath: '', customFile: '' },
         sound: { path: '', volume: 0.8 },
         scale: 1.0
      },
      onDeflect: {
         enabled: false,
         effect: { source: 'sequencer', sequencerPath: '', customFile: '' },
         sound: { path: '', volume: 0.8 },
         scale: 1.0
      },
      onPenetrate: {
         enabled: false,
         effect: { source: 'sequencer', sequencerPath: '', customFile: '' },
         sound: { path: '', volume: 0.8 },
         scale: 1.0
      },
      aura: {
         enabled: false,
         mode: 'permanent',
         roundsDuration: 3,
         loop: { source: 'sequencer', sequencerPath: '', customFile: '' },
         intro: { source: 'sequencer', sequencerPath: '', customFile: '' },
         outro: { source: 'sequencer', sequencerPath: '', customFile: '' },
         overloadEffect: { source: 'sequencer', sequencerPath: '', customFile: '' },
         activateSound: { path: '', volume: 0.8 },
         deactivateSound: { path: '', volume: 0.8 },
         overloadSound: { path: '', volume: 1.0 },
         scale: 1.5
      }
   };

   // ==========================================
   // FX Config (reactive from flags — deep merge)
   // ==========================================
   let fxConfig = { ...D };

   $: if (doc) {
      const s = doc.getFlag(MODULE_ID, 'defensiveFx');
      if (s) {
         fxConfig = {
            ...D, ...s,
            onHit: { ...D.onHit, ...(s.onHit ?? {}), effect: { ...D.onHit.effect, ...(s.onHit?.effect ?? {}) }, sound: { ...D.onHit.sound, ...(s.onHit?.sound ?? {}) } },
            onDeflect: { ...D.onDeflect, ...(s.onDeflect ?? {}), effect: { ...D.onDeflect.effect, ...(s.onDeflect?.effect ?? {}) }, sound: { ...D.onDeflect.sound, ...(s.onDeflect?.sound ?? {}) } },
            onPenetrate: { ...D.onPenetrate, ...(s.onPenetrate ?? {}), effect: { ...D.onPenetrate.effect, ...(s.onPenetrate?.effect ?? {}) }, sound: { ...D.onPenetrate.sound, ...(s.onPenetrate?.sound ?? {}) } },
            aura: {
               ...D.aura, ...(s.aura ?? {}),
               loop: { ...D.aura.loop, ...(s.aura?.loop ?? {}) },
               intro: { ...D.aura.intro, ...(s.aura?.intro ?? {}) },
               outro: { ...D.aura.outro, ...(s.aura?.outro ?? {}) },
               overloadEffect: { ...D.aura.overloadEffect, ...(s.aura?.overloadEffect ?? {}) },
               activateSound: { ...D.aura.activateSound, ...(s.aura?.activateSound ?? {}) },
               deactivateSound: { ...D.aura.deactivateSound, ...(s.aura?.deactivateSound ?? {}) },
               overloadSound: { ...D.aura.overloadSound, ...(s.aura?.overloadSound ?? {}) }
            }
         };
      } else {
         fxConfig = { ...D };
      }
   }

   async function saveConfig(config) {
      if (!doc) return;
      await doc.setFlag(MODULE_ID, 'defensiveFx', config);
   }

   async function toggleEnabled() {
      await saveConfig({ ...fxConfig, enabled: !fxConfig.enabled });
   }

   // ==========================================
   // Reactive section helpers (inline spread)
   // ==========================================
   async function toggleSection(key) {
      const cur = fxConfig[key];
      await saveConfig({ ...fxConfig, [key]: { ...cur, enabled: !cur.enabled } });
   }

   async function updateEffect(key, field, value) {
      const cur = fxConfig[key];
      await saveConfig({ ...fxConfig, [key]: { ...cur, effect: { ...cur.effect, [field]: value } } });
   }

   async function updateSound(key, field, value) {
      const cur = fxConfig[key];
      await saveConfig({ ...fxConfig, [key]: { ...cur, sound: { ...cur.sound, [field]: value } } });
   }

   async function updateScale(key, value) {
      const n = Number(value);
      if (isNaN(n)) return;
      await saveConfig({ ...fxConfig, [key]: { ...fxConfig[key], scale: n } });
   }

   // ==========================================
   // Aura helpers (inline spread)
   // ==========================================
   async function toggleAura() {
      await saveConfig({ ...fxConfig, aura: { ...fxConfig.aura, enabled: !fxConfig.aura.enabled } });
   }

   async function setAuraField(field, value) {
      await saveConfig({ ...fxConfig, aura: { ...fxConfig.aura, [field]: value } });
   }

   async function updateAuraEffect(slot, field, value) {
      await saveConfig({ ...fxConfig, aura: { ...fxConfig.aura, [slot]: { ...fxConfig.aura[slot], [field]: value } } });
   }

   async function updateAuraSound(slot, field, value) {
      await saveConfig({ ...fxConfig, aura: { ...fxConfig.aura, [slot]: { ...fxConfig.aura[slot], [field]: value } } });
   }

   async function updateAuraScale(value) {
      const n = Number(value);
      if (isNaN(n)) return;
      await saveConfig({ ...fxConfig, aura: { ...fxConfig.aura, scale: n } });
   }

   // ==========================================
   // Test buttons
   // ==========================================
   function testReactive(type) {
      if (!doc) return;
      const token = canvas.tokens?.controlled?.[0];
      if (!token) {
         ui.notifications.warn('Select a token to test defensive FX');
         return;
      }
      playDefensiveFx(doc, { type, token }).catch(err => {
         console.warn('[ARS] DefensiveFX test failed:', err);
         ui.notifications.warn('Test failed. Check console.');
      });
   }

   // ==========================================
   // Copy / Paste
   // ==========================================
   async function copyFxConfig() {
      const configToCopy = { ...fxConfig };
      delete configToCopy.enabled;
      try {
         await navigator.clipboard.writeText(JSON.stringify(configToCopy, null, 2));
         ui.notifications.info('Defensive FX config copied to clipboard');
      } catch {
         DefensiveFxShell._copiedConfig = configToCopy;
         ui.notifications.info('Defensive FX config copied');
      }
   }

   async function pasteFxConfig() {
      let pastedConfig;
      try {
         const text = await navigator.clipboard.readText();
         pastedConfig = JSON.parse(text);
      } catch {
         pastedConfig = DefensiveFxShell._copiedConfig;
      }

      if (!pastedConfig || typeof pastedConfig !== 'object') {
         ui.notifications.warn('No valid FX config in clipboard');
         return;
      }

      const merged = { ...fxConfig, ...pastedConfig, enabled: fxConfig.enabled };
      await saveConfig(merged);
      ui.notifications.info('Defensive FX config pasted');
   }

   // ==========================================
   // Export / Import
   // ==========================================
   async function exportFx() {
      if (!doc) return;
      const data = exportDefensiveFx(doc);
      if (!data) {
         ui.notifications.warn('No defensive FX configured to export');
         return;
      }
      const copied = await copyFxToClipboard(data);
      if (copied) {
         ui.notifications.info('Defensive FX exported to clipboard');
      } else {
         downloadFxAsFile(data, `defensive-fx-${doc.name}.json`);
         ui.notifications.info('Defensive FX downloaded as file');
      }
   }

   async function importFx() {
      let jsonText;
      try {
         jsonText = await navigator.clipboard.readText();
      } catch {
         ui.notifications.warn('Cannot read clipboard. Try pasting directly.');
         return;
      }
      if (!jsonText?.trim()) {
         ui.notifications.warn('Clipboard is empty');
         return;
      }
      const result = await importFxToItem(doc, jsonText);
      if (result.success) {
         ui.notifications.info(`Imported ${result.type === 'allFx' ? 'all FX' : 'defensive FX'} config`);
      } else {
         ui.notifications.warn(`Import failed: ${result.error}`);
      }
   }

   $: sequencerAvailable = typeof Sequencer !== 'undefined' && game.modules?.get('sequencer')?.active === true;
</script>

<ApplicationShell bind:elementRoot>
   <main class="defensive-fx-shell">
      <!-- Enable Toggle -->
      <section class="fx-section fx-enable">
         <label class="fx-toggle-row">
            <span class="fx-toggle-label">Enable Defensive FX</span>
            <button class="fx-toggle-btn" class:active={fxConfig.enabled} on:click={toggleEnabled}
                    title={fxConfig.enabled ? 'Disable' : 'Enable'}>
               <i class="fas" class:fa-toggle-on={fxConfig.enabled} class:fa-toggle-off={!fxConfig.enabled}></i>
            </button>
         </label>
      </section>

      {#if fxConfig.enabled}
         <!-- Shield Hit -->
         <section class="fx-section">
            <div class="fx-effect-header">
               <h4 class="fx-section-title"><i class="fas fa-shield-halved"></i> Shield Hit</h4>
               <button class="fx-toggle-btn" class:active={fxConfig.onHit.enabled} on:click={() => toggleSection('onHit')}>
                  <i class="fas" class:fa-toggle-on={fxConfig.onHit.enabled} class:fa-toggle-off={!fxConfig.onHit.enabled}></i>
               </button>
            </div>
            {#if fxConfig.onHit.enabled}
               <p class="fx-hint"><i class="fas fa-info-circle"></i> Played when shield absorbs damage</p>
               <div class="fx-field-row">
                  <label class="fx-field-label">Source</label>
                  <select value={fxConfig.onHit.effect.source} on:change={(e) => updateEffect('onHit', 'source', e.target.value)}>
                     <option value="sequencer" disabled={!sequencerAvailable}>Sequencer DB{!sequencerAvailable ? ' (N/A)' : ''}</option>
                     <option value="custom">Custom File</option>
                  </select>
               </div>
               {#if fxConfig.onHit.effect.source === 'sequencer'}
                  <div class="fx-field-row">
                     <label class="fx-field-label">Path</label>
                     <input type="text" value={fxConfig.onHit.effect.sequencerPath} placeholder="e.g. jb2a.shield.01.loop.blue"
                            on:change={(e) => updateEffect('onHit', 'sequencerPath', e.target.value)} />
                  </div>
               {/if}
               <div class="fx-field-row">
                  <label class="fx-field-label">Scale</label>
                  <input type="number" min="0.1" max="5" step="0.1" value={fxConfig.onHit.scale}
                         on:change={(e) => updateScale('onHit', e.target.value)} />
               </div>
               <div class="fx-field-row">
                  <label class="fx-field-label">Sound</label>
                  <div class="fx-file-picker-row">
                     <input type="text" value={fxConfig.onHit.sound.path} readonly placeholder="No sound" />
                     <button class="fx-btn-small" on:click={() => openAudioPicker((p) => { if (p) updateSound('onHit', 'path', p); }, fxConfig.onHit.sound.path)}>
                        <i class="fas fa-file"></i>
                     </button>
                     {#if fxConfig.onHit.sound.path}
                        <button class="fx-btn-small" on:click={() => updateSound('onHit', 'path', '')} title="Clear"><i class="fas fa-times"></i></button>
                     {/if}
                  </div>
               </div>
               {#if fxConfig.onHit.sound.path}
                  <div class="fx-field-row">
                     <label class="fx-field-label">Volume</label>
                     <input type="range" min="0" max="1" step="0.05" value={fxConfig.onHit.sound.volume}
                            on:input={(e) => updateSound('onHit', 'volume', Number(e.target.value))} />
                     <span class="fx-sound-volume-label">{Math.round((fxConfig.onHit.sound.volume ?? 0.8) * 100)}%</span>
                  </div>
               {/if}
               <button class="fx-btn fx-btn-small" on:click={() => testReactive('shieldHit')} title="Test (select a token)">
                  <i class="fas fa-play"></i> Test
               </button>
            {/if}
         </section>

         <!-- Armor Deflect -->
         <section class="fx-section">
            <div class="fx-effect-header">
               <h4 class="fx-section-title"><i class="fas fa-shield"></i> Armor Deflect</h4>
               <button class="fx-toggle-btn" class:active={fxConfig.onDeflect.enabled} on:click={() => toggleSection('onDeflect')}>
                  <i class="fas" class:fa-toggle-on={fxConfig.onDeflect.enabled} class:fa-toggle-off={!fxConfig.onDeflect.enabled}></i>
               </button>
            </div>
            {#if fxConfig.onDeflect.enabled}
               <p class="fx-hint"><i class="fas fa-info-circle"></i> Played when armor save succeeds (sparks, ricochet)</p>
               <div class="fx-field-row">
                  <label class="fx-field-label">Source</label>
                  <select value={fxConfig.onDeflect.effect.source} on:change={(e) => updateEffect('onDeflect', 'source', e.target.value)}>
                     <option value="sequencer" disabled={!sequencerAvailable}>Sequencer DB{!sequencerAvailable ? ' (N/A)' : ''}</option>
                     <option value="custom">Custom File</option>
                  </select>
               </div>
               {#if fxConfig.onDeflect.effect.source === 'sequencer'}
                  <div class="fx-field-row">
                     <label class="fx-field-label">Path</label>
                     <input type="text" value={fxConfig.onDeflect.effect.sequencerPath} placeholder="e.g. jb2a.impact.004.blue"
                            on:change={(e) => updateEffect('onDeflect', 'sequencerPath', e.target.value)} />
                  </div>
               {/if}
               <div class="fx-field-row">
                  <label class="fx-field-label">Scale</label>
                  <input type="number" min="0.1" max="5" step="0.1" value={fxConfig.onDeflect.scale}
                         on:change={(e) => updateScale('onDeflect', e.target.value)} />
               </div>
               <div class="fx-field-row">
                  <label class="fx-field-label">Sound</label>
                  <div class="fx-file-picker-row">
                     <input type="text" value={fxConfig.onDeflect.sound.path} readonly placeholder="No sound" />
                     <button class="fx-btn-small" on:click={() => openAudioPicker((p) => { if (p) updateSound('onDeflect', 'path', p); }, fxConfig.onDeflect.sound.path)}>
                        <i class="fas fa-file"></i>
                     </button>
                     {#if fxConfig.onDeflect.sound.path}
                        <button class="fx-btn-small" on:click={() => updateSound('onDeflect', 'path', '')} title="Clear"><i class="fas fa-times"></i></button>
                     {/if}
                  </div>
               </div>
               {#if fxConfig.onDeflect.sound.path}
                  <div class="fx-field-row">
                     <label class="fx-field-label">Volume</label>
                     <input type="range" min="0" max="1" step="0.05" value={fxConfig.onDeflect.sound.volume}
                            on:input={(e) => updateSound('onDeflect', 'volume', Number(e.target.value))} />
                     <span class="fx-sound-volume-label">{Math.round((fxConfig.onDeflect.sound.volume ?? 0.8) * 100)}%</span>
                  </div>
               {/if}
               <button class="fx-btn fx-btn-small" on:click={() => testReactive('armorDeflect')} title="Test (select a token)">
                  <i class="fas fa-play"></i> Test
               </button>
            {/if}
         </section>

         <!-- Armor Penetrate -->
         <section class="fx-section">
            <div class="fx-effect-header">
               <h4 class="fx-section-title"><i class="fas fa-heart-crack"></i> Armor Penetrate</h4>
               <button class="fx-toggle-btn" class:active={fxConfig.onPenetrate.enabled} on:click={() => toggleSection('onPenetrate')}>
                  <i class="fas" class:fa-toggle-on={fxConfig.onPenetrate.enabled} class:fa-toggle-off={!fxConfig.onPenetrate.enabled}></i>
               </button>
            </div>
            {#if fxConfig.onPenetrate.enabled}
               <p class="fx-hint"><i class="fas fa-info-circle"></i> Played when armor save fails (blood, damage)</p>
               <div class="fx-field-row">
                  <label class="fx-field-label">Source</label>
                  <select value={fxConfig.onPenetrate.effect.source} on:change={(e) => updateEffect('onPenetrate', 'source', e.target.value)}>
                     <option value="sequencer" disabled={!sequencerAvailable}>Sequencer DB{!sequencerAvailable ? ' (N/A)' : ''}</option>
                     <option value="custom">Custom File</option>
                  </select>
               </div>
               {#if fxConfig.onPenetrate.effect.source === 'sequencer'}
                  <div class="fx-field-row">
                     <label class="fx-field-label">Path</label>
                     <input type="text" value={fxConfig.onPenetrate.effect.sequencerPath} placeholder="e.g. jb2a.liquid.splash.red"
                            on:change={(e) => updateEffect('onPenetrate', 'sequencerPath', e.target.value)} />
                  </div>
               {/if}
               <div class="fx-field-row">
                  <label class="fx-field-label">Scale</label>
                  <input type="number" min="0.1" max="5" step="0.1" value={fxConfig.onPenetrate.scale}
                         on:change={(e) => updateScale('onPenetrate', e.target.value)} />
               </div>
               <div class="fx-field-row">
                  <label class="fx-field-label">Sound</label>
                  <div class="fx-file-picker-row">
                     <input type="text" value={fxConfig.onPenetrate.sound.path} readonly placeholder="No sound" />
                     <button class="fx-btn-small" on:click={() => openAudioPicker((p) => { if (p) updateSound('onPenetrate', 'path', p); }, fxConfig.onPenetrate.sound.path)}>
                        <i class="fas fa-file"></i>
                     </button>
                     {#if fxConfig.onPenetrate.sound.path}
                        <button class="fx-btn-small" on:click={() => updateSound('onPenetrate', 'path', '')} title="Clear"><i class="fas fa-times"></i></button>
                     {/if}
                  </div>
               </div>
               {#if fxConfig.onPenetrate.sound.path}
                  <div class="fx-field-row">
                     <label class="fx-field-label">Volume</label>
                     <input type="range" min="0" max="1" step="0.05" value={fxConfig.onPenetrate.sound.volume}
                            on:input={(e) => updateSound('onPenetrate', 'volume', Number(e.target.value))} />
                     <span class="fx-sound-volume-label">{Math.round((fxConfig.onPenetrate.sound.volume ?? 0.8) * 100)}%</span>
                  </div>
               {/if}
               <button class="fx-btn fx-btn-small" on:click={() => testReactive('armorPenetrate')} title="Test (select a token)">
                  <i class="fas fa-play"></i> Test
               </button>
            {/if}
         </section>

         <!-- Shield Aura -->
         <section class="fx-section">
            <div class="fx-effect-header">
               <h4 class="fx-section-title"><i class="fas fa-circle-radiation"></i> Shield Aura</h4>
               <button class="fx-toggle-btn" class:active={fxConfig.aura.enabled} on:click={toggleAura}>
                  <i class="fas" class:fa-toggle-on={fxConfig.aura.enabled} class:fa-toggle-off={!fxConfig.aura.enabled}></i>
               </button>
            </div>
            {#if fxConfig.aura.enabled}
               <!-- Aura Mode -->
               <div class="fx-field-row">
                  <label class="fx-field-label">Mode</label>
                  <select value={fxConfig.aura.mode ?? 'permanent'}
                          on:change={(e) => setAuraField('mode', e.target.value)}>
                     <option value="permanent">Permanent</option>
                     <option value="rounds">Timed (rounds)</option>
                     <option value="reactive">Reactive (on hit only)</option>
                  </select>
               </div>
               {#if (fxConfig.aura.mode ?? 'permanent') === 'permanent'}
                  <p class="fx-hint"><i class="fas fa-info-circle"></i> Stays on token until manually deactivated or overloaded</p>
               {:else if fxConfig.aura.mode === 'rounds'}
                  <p class="fx-hint"><i class="fas fa-info-circle"></i> Active for a set number of rounds (provider passes duration)</p>
                  <div class="fx-field-row">
                     <label class="fx-field-label">Default Rounds</label>
                     <input type="number" min="1" max="99" step="1" value={fxConfig.aura.roundsDuration ?? 3}
                            on:change={(e) => { const n = Number(e.target.value); if (!isNaN(n)) setAuraField('roundsDuration', n); }} />
                  </div>
               {:else if fxConfig.aura.mode === 'reactive'}
                  <p class="fx-hint"><i class="fas fa-info-circle"></i> No persistent visual — shield flashes briefly only when hit</p>
               {/if}

               <!-- Loop effect -->
               <div class="fx-aura-subsection">
                  <span class="fx-jam-label"><i class="fas fa-repeat"></i> {fxConfig.aura.mode === 'reactive' ? 'Flash Effect (on hit)' : 'Loop Effect (idle)'}</span>
                  <div class="fx-field-row">
                     <label class="fx-field-label">Source</label>
                     <select value={fxConfig.aura.loop.source} on:change={(e) => updateAuraEffect('loop', 'source', e.target.value)}>
                        <option value="sequencer" disabled={!sequencerAvailable}>Sequencer DB{!sequencerAvailable ? ' (N/A)' : ''}</option>
                        <option value="custom">Custom File</option>
                     </select>
                  </div>
                  {#if fxConfig.aura.loop.source === 'sequencer'}
                     <div class="fx-field-row">
                        <label class="fx-field-label">Path</label>
                        <input type="text" value={fxConfig.aura.loop.sequencerPath} placeholder="e.g. jb2a.shield.01.loop.blue"
                               on:change={(e) => updateAuraEffect('loop', 'sequencerPath', e.target.value)} />
                     </div>
                  {/if}
               </div>

               <!-- Intro/Outro only for non-reactive modes -->
               {#if fxConfig.aura.mode !== 'reactive'}
                  <div class="fx-aura-subsection">
                     <span class="fx-jam-label"><i class="fas fa-play"></i> Intro Effect (optional)</span>
                     <div class="fx-field-row">
                        <label class="fx-field-label">Source</label>
                        <select value={fxConfig.aura.intro.source} on:change={(e) => updateAuraEffect('intro', 'source', e.target.value)}>
                           <option value="sequencer" disabled={!sequencerAvailable}>Sequencer DB{!sequencerAvailable ? ' (N/A)' : ''}</option>
                           <option value="custom">Custom File</option>
                        </select>
                     </div>
                     {#if fxConfig.aura.intro.source === 'sequencer'}
                        <div class="fx-field-row">
                           <label class="fx-field-label">Path</label>
                           <input type="text" value={fxConfig.aura.intro.sequencerPath} placeholder="e.g. jb2a.shield.01.intro.blue"
                                  on:change={(e) => updateAuraEffect('intro', 'sequencerPath', e.target.value)} />
                        </div>
                     {/if}
                  </div>

                  <div class="fx-aura-subsection">
                     <span class="fx-jam-label"><i class="fas fa-stop"></i> Outro Effect (optional)</span>
                     <div class="fx-field-row">
                        <label class="fx-field-label">Source</label>
                        <select value={fxConfig.aura.outro.source} on:change={(e) => updateAuraEffect('outro', 'source', e.target.value)}>
                           <option value="sequencer" disabled={!sequencerAvailable}>Sequencer DB{!sequencerAvailable ? ' (N/A)' : ''}</option>
                           <option value="custom">Custom File</option>
                        </select>
                     </div>
                     {#if fxConfig.aura.outro.source === 'sequencer'}
                        <div class="fx-field-row">
                           <label class="fx-field-label">Path</label>
                           <input type="text" value={fxConfig.aura.outro.sequencerPath} placeholder="e.g. jb2a.shield.01.outro_explode.blue"
                                  on:change={(e) => updateAuraEffect('outro', 'sequencerPath', e.target.value)} />
                        </div>
                     {/if}
                  </div>

                  <!-- Overload effect -->
                  <div class="fx-aura-subsection" style="border-left-color: var(--ars-danger, #dc3545);">
                     <span class="fx-jam-label"><i class="fas fa-explosion"></i> Overload Effect (optional)</span>
                     <p class="fx-hint"><i class="fas fa-info-circle"></i> Dramatic shield collapse — falls back to outro if not set</p>
                     <div class="fx-field-row">
                        <label class="fx-field-label">Source</label>
                        <select value={fxConfig.aura.overloadEffect.source} on:change={(e) => updateAuraEffect('overloadEffect', 'source', e.target.value)}>
                           <option value="sequencer" disabled={!sequencerAvailable}>Sequencer DB{!sequencerAvailable ? ' (N/A)' : ''}</option>
                           <option value="custom">Custom File</option>
                        </select>
                     </div>
                     {#if fxConfig.aura.overloadEffect.source === 'sequencer'}
                        <div class="fx-field-row">
                           <label class="fx-field-label">Path</label>
                           <input type="text" value={fxConfig.aura.overloadEffect.sequencerPath} placeholder="e.g. jb2a.explosion.01.orange"
                                  on:change={(e) => updateAuraEffect('overloadEffect', 'sequencerPath', e.target.value)} />
                        </div>
                     {/if}
                     <div class="fx-field-row">
                        <label class="fx-field-label">Sound</label>
                        <div class="fx-file-picker-row">
                           <input type="text" value={fxConfig.aura.overloadSound.path} readonly placeholder="Falls back to deactivate sound" />
                           <button class="fx-btn-small" on:click={() => openAudioPicker((p) => { if (p) updateAuraSound('overloadSound', 'path', p); }, fxConfig.aura.overloadSound.path)}>
                              <i class="fas fa-file"></i>
                           </button>
                           {#if fxConfig.aura.overloadSound.path}
                              <button class="fx-btn-small" on:click={() => updateAuraSound('overloadSound', 'path', '')} title="Clear"><i class="fas fa-times"></i></button>
                           {/if}
                        </div>
                     </div>
                  </div>
               {/if}

               <!-- Scale -->
               <div class="fx-field-row">
                  <label class="fx-field-label">Scale</label>
                  <input type="number" min="0.1" max="5" step="0.1" value={fxConfig.aura.scale}
                         on:change={(e) => updateAuraScale(e.target.value)} />
               </div>

               <!-- Sounds -->
               {#if fxConfig.aura.mode !== 'reactive'}
                  <div class="fx-field-row">
                     <label class="fx-field-label">Activate Sound</label>
                     <div class="fx-file-picker-row">
                        <input type="text" value={fxConfig.aura.activateSound.path} readonly placeholder="No sound" />
                        <button class="fx-btn-small" on:click={() => openAudioPicker((p) => { if (p) updateAuraSound('activateSound', 'path', p); }, fxConfig.aura.activateSound.path)}>
                           <i class="fas fa-file"></i>
                        </button>
                        {#if fxConfig.aura.activateSound.path}
                           <button class="fx-btn-small" on:click={() => updateAuraSound('activateSound', 'path', '')} title="Clear"><i class="fas fa-times"></i></button>
                        {/if}
                     </div>
                  </div>
                  <div class="fx-field-row">
                     <label class="fx-field-label">Deactivate Sound</label>
                     <div class="fx-file-picker-row">
                        <input type="text" value={fxConfig.aura.deactivateSound.path} readonly placeholder="No sound" />
                        <button class="fx-btn-small" on:click={() => openAudioPicker((p) => { if (p) updateAuraSound('deactivateSound', 'path', p); }, fxConfig.aura.deactivateSound.path)}>
                           <i class="fas fa-file"></i>
                        </button>
                        {#if fxConfig.aura.deactivateSound.path}
                           <button class="fx-btn-small" on:click={() => updateAuraSound('deactivateSound', 'path', '')} title="Clear"><i class="fas fa-times"></i></button>
                        {/if}
                     </div>
                  </div>
               {/if}

               <!-- Test buttons -->
               <div class="fx-test-buttons">
                  {#if fxConfig.aura.mode !== 'reactive'}
                     <button class="fx-btn fx-btn-small" on:click={() => testReactive('auraActivate')} title="Test activate (select a token)">
                        <i class="fas fa-play"></i> Activate
                     </button>
                     <button class="fx-btn fx-btn-small" on:click={() => testReactive('auraDeactivate')} title="Test deactivate (select a token)">
                        <i class="fas fa-stop"></i> Deactivate
                     </button>
                     <button class="fx-btn fx-btn-small" on:click={() => testReactive('shieldOverload')} title="Test overload (select a token)">
                        <i class="fas fa-explosion"></i> Overload
                     </button>
                  {:else}
                     <button class="fx-btn fx-btn-small" on:click={() => testReactive('shieldHit')} title="Test reactive flash (select a token)">
                        <i class="fas fa-play"></i> Test Flash
                     </button>
                  {/if}
               </div>
            {/if}
             </section>

            <!-- Copy / Paste / Export / Import -->
            <section class="fx-section fx-actions-row">
               <button class="fx-btn fx-btn-small" on:click={copyFxConfig} title="Copy defensive FX config to clipboard">
                  <i class="fas fa-copy"></i> Copy
               </button>
               <button class="fx-btn fx-btn-small" on:click={pasteFxConfig} title="Paste defensive FX config from clipboard">
                  <i class="fas fa-paste"></i> Paste
               </button>
               <button class="fx-btn fx-btn-small" on:click={exportFx} title="Export defensive FX as portable JSON">
                  <i class="fas fa-file-export"></i> Export
               </button>
               <button class="fx-btn fx-btn-small" on:click={importFx} title="Import defensive FX from clipboard JSON">
                  <i class="fas fa-file-import"></i> Import
               </button>
            </section>
         {/if}
   </main>
</ApplicationShell>
