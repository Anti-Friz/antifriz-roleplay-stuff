<svelte:options accessors={true}/>

<script>
   /**
    * WeaponFxShell — Configure sound and visual effects for a weapon/item.
    * 
    * Sections:
    * - Enable FX toggle
    * - Effect Type selector (ranged/melee/magic/thrown/custom)
    * - Rate of Fire (single/semi/burst/auto)
    * - Sound list (add/remove/reorder with file picker)
    * - Projectile config
    * - Muzzle flash config
    * - Impact effect config
    * - Test buttons
    */
   import { getContext } from 'svelte';
   import { ApplicationShell } from '#runtime/svelte/component/application';
   import { MODULE_ID } from '#config';
   import { WEAPON_FX_PRESETS, getPresetCategories, getPresetsByCategory } from '#config';
   import { openAudioPicker, getFilenameFromPath, playWeaponFx, exportWeaponFx, importFxToItem, copyFxToClipboard, downloadFxAsFile } from '#utils';
   import FxSoundList from './components/FxSoundList.svelte';
   import FxEffectConfig from './components/FxEffectConfig.svelte';

   export let elementRoot = void 0;
   export let tjsDoc = null;

   const external = getContext('#external');
   const application = external?.application;

   $: doc = tjsDoc ? $tjsDoc : null;

   // ==========================================
   // Default config shape
   // ==========================================
   const DEFAULT_WEAPON_FX = {
      enabled: false,
      fxType: 'ranged',
      sounds: [],
      soundMode: 'random',
      jam: {
         sound: { path: '', volume: 0.8 },
         catastrophicSound: { path: '', volume: 1.0 },
         catastrophicEffect: {
            enabled: false,
            source: 'sequencer',
            sequencerPath: '',
            customFile: '',
            scale: 1.0
         }
      },
      rateOfFire: {
         mode: 'single',
         burstCount: 3,
         autoCount: 5,
         delayBetweenShots: 100,
         randomizeDelay: true
      },
      projectile: {
         enabled: false,
         source: 'sequencer',
         sequencerPath: '',
         customFile: '',
         builtinType: 'tracer',
         travelMode: 'beam',
         color: '#ffaa00',
         scale: 1.0,
         speed: 1.0,
         scatter: 0.3,
         randomizeMirrorY: false
      },
      impact: {
         enabled: false,
         source: 'sequencer',
         sequencerPath: '',
         customFile: '',
         builtinType: 'flash',
         color: '#ff4400',
         scale: 0.5,
         randomOffset: 0.3
      },
      muzzle: {
         enabled: false,
         source: 'sequencer',
         sequencerPath: '',
         customFile: '',
         builtinType: 'flash',
         color: '#ffff00',
         scale: 0.5
      },
      casing: {
         enabled: false,
         source: 'sequencer',
         sequencerPath: '',
         customFile: '',
         scale: 0.3,
         persist: true,
         duration: 0,
         scatter: 0.5,
         ejectDirection: 'right'
      }
   };

   // ==========================================
   // FX Config (reactive from flags)
   // ==========================================
   let fxConfig = { ...DEFAULT_WEAPON_FX };

   $: if (doc) {
      const saved = doc.getFlag(MODULE_ID, 'weaponFx');
      fxConfig = saved
         ? { ...DEFAULT_WEAPON_FX, ...saved, rateOfFire: { ...DEFAULT_WEAPON_FX.rateOfFire, ...(saved.rateOfFire ?? {}) } }
         : { ...DEFAULT_WEAPON_FX };
   }

   /**
    * Persist the full config to item flags
    */
   async function saveConfig(config) {
      if (!doc) return;
      await doc.setFlag(MODULE_ID, 'weaponFx', config);
   }

   // ==========================================
   // Enable toggle
   // ==========================================
   async function toggleEnabled() {
      const updated = { ...fxConfig, enabled: !fxConfig.enabled };
      await saveConfig(updated);
   }

   // ==========================================
   // Effect type
   // ==========================================
   const FX_TYPES = [
      { value: 'ranged', label: 'Ranged', icon: 'fa-crosshairs' },
      { value: 'melee', label: 'Melee', icon: 'fa-sword' },
      { value: 'magic', label: 'Magic', icon: 'fa-wand-sparkles' },
      { value: 'thrown', label: 'Thrown', icon: 'fa-hand-fist' },
      { value: 'custom', label: 'Custom', icon: 'fa-gear' }
   ];

   async function setFxType(type) {
      await saveConfig({ ...fxConfig, fxType: type });
   }

   // ==========================================
   // Rate of Fire
   // ==========================================
   const ROF_MODES = [
      { value: 'single', label: 'Single', hint: 'One shot per use' },
      { value: 'semi', label: 'Semi', hint: 'One shot per use (semi-auto flavor)' },
      { value: 'burst', label: 'Burst', hint: 'Multiple shots in quick succession' },
      { value: 'auto', label: 'Auto', hint: 'Sustained automatic fire' }
   ];

   async function setRofMode(mode) {
      await saveConfig({ ...fxConfig, rateOfFire: { ...fxConfig.rateOfFire, mode } });
   }

   async function setRofField(field, value) {
      const num = Number(value);
      if (isNaN(num)) return;
      await saveConfig({ ...fxConfig, rateOfFire: { ...fxConfig.rateOfFire, [field]: num } });
   }

   async function toggleRofRandomize() {
      await saveConfig({
         ...fxConfig,
         rateOfFire: { ...fxConfig.rateOfFire, randomizeDelay: !fxConfig.rateOfFire.randomizeDelay }
      });
   }

   // ==========================================
   // Sound list handlers (delegated to FxSoundList)
   // ==========================================
   async function handleSoundsChanged(event) {
      await saveConfig({ ...fxConfig, sounds: event.detail.sounds });
   }

   async function handleSoundModeChanged(event) {
      await saveConfig({ ...fxConfig, soundMode: event.detail.mode });
   }

   // ==========================================
   // Effect config handlers
   // ==========================================
   async function handleEffectChanged(section, event) {
      await saveConfig({ ...fxConfig, [section]: event.detail });
   }

   // ==========================================
   // Test buttons
   // ==========================================
   function testSound() {
      if (!fxConfig.sounds.length) {
         ui.notifications.warn('No sounds configured.');
         return;
      }
      const sound = fxConfig.sounds[Math.floor(Math.random() * fxConfig.sounds.length)];
      const audio = new Audio(sound.path);
      audio.volume = sound.volume ?? 0.8;
      audio.play().catch(err => console.warn('[ARS] WeaponFX test sound failed:', err));
   }

   function testEffect() {
      if (!doc) return;
      playWeaponFx(doc, { soundOnly: false }).catch(err => {
         console.warn('[ARS] WeaponFX test effect failed:', err);
         ui.notifications.warn('Test effect failed. Check console for details.');
      });
   }

   // ==========================================
   // Copy / Paste / Export / Import
   // ==========================================
   async function copyFxConfig() {
      const configToCopy = { ...fxConfig };
      delete configToCopy.enabled;
      try {
         await navigator.clipboard.writeText(JSON.stringify(configToCopy, null, 2));
         ui.notifications.info('FX config copied to clipboard');
      } catch {
         WeaponFxShell._copiedConfig = configToCopy;
         ui.notifications.info('FX config copied');
      }
   }

   async function pasteFxConfig() {
      let pastedConfig;
      try {
         const text = await navigator.clipboard.readText();
         pastedConfig = JSON.parse(text);
      } catch {
         pastedConfig = WeaponFxShell._copiedConfig;
      }

      if (!pastedConfig || typeof pastedConfig !== 'object') {
         ui.notifications.warn('No valid FX config in clipboard');
         return;
      }

      const merged = { ...fxConfig, ...pastedConfig, enabled: fxConfig.enabled };
      await saveConfig(merged);
      ui.notifications.info('FX config pasted');
   }

   async function exportFx() {
      if (!doc) return;
      const data = exportWeaponFx(doc);
      if (!data) {
         ui.notifications.warn('No weapon FX configured to export');
         return;
      }
      const copied = await copyFxToClipboard(data);
      if (copied) {
         ui.notifications.info('Weapon FX exported to clipboard');
      } else {
         downloadFxAsFile(data, `weapon-fx-${doc.name}.json`);
         ui.notifications.info('Weapon FX downloaded as file');
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
         ui.notifications.info(`Imported ${result.type === 'allFx' ? 'all FX' : 'weapon FX'} config`);
      } else {
         ui.notifications.warn(`Import failed: ${result.error}`);
      }
   }

   // ==========================================
   // Preset application
   // ==========================================
   let showPresets = false;
   const presetCategories = getPresetCategories();

   async function applyPreset(preset) {
      const pc = preset.config;
      const merged = {
         ...fxConfig,
         fxType: pc.fxType ?? fxConfig.fxType,
         rateOfFire: { ...fxConfig.rateOfFire, ...(pc.rateOfFire ?? {}) },
         projectile: { ...fxConfig.projectile, ...(pc.projectile ?? {}) },
         impact: { ...fxConfig.impact, ...(pc.impact ?? {}) },
         muzzle: { ...fxConfig.muzzle, ...(pc.muzzle ?? {}) },
         casing: { ...fxConfig.casing, ...(pc.casing ?? {}) }
      };
      // Preserve sounds — presets don't include audio files
      merged.sounds = fxConfig.sounds;
      merged.soundMode = fxConfig.soundMode;
      await saveConfig(merged);
      showPresets = false;
      ui.notifications.info(`Applied preset: ${preset.name}`);
   }

   // Sequencer availability
   $: sequencerAvailable = typeof Sequencer !== 'undefined' && game.modules?.get('sequencer')?.active === true;
</script>

<ApplicationShell bind:elementRoot>
   <main class="weapon-fx-shell">
      <!-- Enable Toggle -->
      <section class="fx-section fx-enable">
         <label class="fx-toggle-row">
            <span class="fx-toggle-label">Enable FX</span>
            <button class="fx-toggle-btn" class:active={fxConfig.enabled} on:click={toggleEnabled}
                    title={fxConfig.enabled ? 'Disable FX' : 'Enable FX'}>
               <i class="fas" class:fa-toggle-on={fxConfig.enabled} class:fa-toggle-off={!fxConfig.enabled}></i>
            </button>
         </label>
      </section>

      {#if fxConfig.enabled}
         <!-- Effect Type -->
         <section class="fx-section">
            <h4 class="fx-section-title">Effect Type</h4>
            <div class="fx-type-group">
               {#each FX_TYPES as ft}
                  <button class="fx-type-btn" class:selected={fxConfig.fxType === ft.value}
                          on:click={() => setFxType(ft.value)} title={ft.label}>
                     <i class="fas {ft.icon}"></i>
                     <span>{ft.label}</span>
                  </button>
               {/each}
            </div>
         </section>

         <!-- Rate of Fire -->
         <section class="fx-section">
            <h4 class="fx-section-title">Rate of Fire</h4>
            <div class="fx-rof-group">
               {#each ROF_MODES as rm}
                  <button class="fx-rof-btn" class:selected={fxConfig.rateOfFire.mode === rm.value}
                           on:click={() => setRofMode(rm.value)} title={rm.hint}>
                     {rm.label}
                  </button>
               {/each}
            </div>
            {#if fxConfig.rateOfFire.mode === 'burst' || fxConfig.rateOfFire.mode === 'auto'}
               <div class="fx-rof-details">
                  {#if fxConfig.rateOfFire.mode === 'burst'}
                     <label class="fx-inline-field">
                        <span>Burst count</span>
                        <input type="number" min="2" max="20" value={fxConfig.rateOfFire.burstCount}
                               on:change={(e) => setRofField('burstCount', e.target.value)} />
                     </label>
                  {/if}
                  {#if fxConfig.rateOfFire.mode === 'auto'}
                     <label class="fx-inline-field">
                        <span>Auto count</span>
                        <input type="number" min="2" max="50" value={fxConfig.rateOfFire.autoCount}
                               on:change={(e) => setRofField('autoCount', e.target.value)} />
                     </label>
                  {/if}
                  <label class="fx-inline-field">
                     <span>Delay (ms)</span>
                     <input type="number" min="20" max="2000" value={fxConfig.rateOfFire.delayBetweenShots}
                            on:change={(e) => setRofField('delayBetweenShots', e.target.value)} />
                  </label>
                  <label class="fx-checkbox-field">
                     <input type="checkbox" checked={fxConfig.rateOfFire.randomizeDelay}
                            on:change={toggleRofRandomize} />
                     <span>Randomize delay</span>
                  </label>
               </div>
               <p class="fx-hint"><i class="fas fa-info-circle"></i> Provider can override with shotEvents</p>
            {/if}
         </section>

         <!-- Sound List -->
         <section class="fx-section">
            <h4 class="fx-section-title">Sounds</h4>
            <FxSoundList sounds={fxConfig.sounds} soundMode={fxConfig.soundMode}
                         on:soundsChanged={handleSoundsChanged}
                         on:soundModeChanged={handleSoundModeChanged} />
         </section>

         <!-- Jam / Misfire -->
         <section class="fx-section">
            <div class="fx-effect-header">
               <h4 class="fx-section-title">Jam / Misfire</h4>
            </div>
            <p class="fx-hint"><i class="fas fa-info-circle"></i> Triggered by provider jam events</p>

            <!-- Regular jam sound -->
            <div class="fx-jam-subsection">
               <span class="fx-jam-label"><i class="fas fa-hand"></i> Regular Jam</span>
               <div class="fx-field-row">
                  <label class="fx-field-label">Sound</label>
                  <div class="fx-file-picker-row">
                     <input type="text" value={fxConfig.jam?.sound?.path ?? ''} readonly
                            placeholder="No jam sound (silent)" />
                     <button class="fx-btn-small" on:click={() => {
                        openAudioPicker((path) => {
                           if (path) saveConfig({ ...fxConfig, jam: { ...fxConfig.jam, sound: { ...fxConfig.jam?.sound, path } } });
                        }, fxConfig.jam?.sound?.path);
                     }}>
                        <i class="fas fa-file"></i>
                     </button>
                     {#if fxConfig.jam?.sound?.path}
                        <button class="fx-btn-small" on:click={() => saveConfig({ ...fxConfig, jam: { ...fxConfig.jam, sound: { ...fxConfig.jam?.sound, path: '' } } })}
                                title="Clear">
                           <i class="fas fa-times"></i>
                        </button>
                     {/if}
                  </div>
               </div>
               {#if fxConfig.jam?.sound?.path}
                  <div class="fx-field-row">
                     <label class="fx-field-label">Volume</label>
                     <input type="range" min="0" max="1" step="0.05"
                            value={fxConfig.jam?.sound?.volume ?? 0.8}
                            on:input={(e) => saveConfig({ ...fxConfig, jam: { ...fxConfig.jam, sound: { ...fxConfig.jam?.sound, volume: Number(e.target.value) } } })} />
                     <span class="fx-sound-volume-label">{Math.round((fxConfig.jam?.sound?.volume ?? 0.8) * 100)}%</span>
                  </div>
                  <button class="fx-btn fx-btn-small" on:click={() => {
                     const audio = new Audio(fxConfig.jam.sound.path);
                     audio.volume = fxConfig.jam.sound.volume ?? 0.8;
                     audio.play().catch(() => {});
                  }} title="Preview jam sound">
                     <i class="fas fa-play"></i> Preview
                  </button>
               {/if}
            </div>

            <!-- Catastrophic jam -->
            <div class="fx-jam-subsection">
               <span class="fx-jam-label"><i class="fas fa-explosion"></i> Catastrophic</span>
               <div class="fx-field-row">
                  <label class="fx-field-label">Sound</label>
                  <div class="fx-file-picker-row">
                     <input type="text" value={fxConfig.jam?.catastrophicSound?.path ?? ''} readonly
                            placeholder="No catastrophic sound" />
                     <button class="fx-btn-small" on:click={() => {
                        openAudioPicker((path) => {
                           if (path) saveConfig({ ...fxConfig, jam: { ...fxConfig.jam, catastrophicSound: { ...fxConfig.jam?.catastrophicSound, path } } });
                        }, fxConfig.jam?.catastrophicSound?.path);
                     }}>
                        <i class="fas fa-file"></i>
                     </button>
                     {#if fxConfig.jam?.catastrophicSound?.path}
                        <button class="fx-btn-small" on:click={() => saveConfig({ ...fxConfig, jam: { ...fxConfig.jam, catastrophicSound: { ...fxConfig.jam?.catastrophicSound, path: '' } } })}
                                title="Clear">
                           <i class="fas fa-times"></i>
                        </button>
                     {/if}
                  </div>
               </div>
               {#if fxConfig.jam?.catastrophicSound?.path}
                  <div class="fx-field-row">
                     <label class="fx-field-label">Volume</label>
                     <input type="range" min="0" max="1" step="0.05"
                            value={fxConfig.jam?.catastrophicSound?.volume ?? 1.0}
                            on:input={(e) => saveConfig({ ...fxConfig, jam: { ...fxConfig.jam, catastrophicSound: { ...fxConfig.jam?.catastrophicSound, volume: Number(e.target.value) } } })} />
                     <span class="fx-sound-volume-label">{Math.round((fxConfig.jam?.catastrophicSound?.volume ?? 1.0) * 100)}%</span>
                  </div>
                  <button class="fx-btn fx-btn-small" on:click={() => {
                     const audio = new Audio(fxConfig.jam.catastrophicSound.path);
                     audio.volume = fxConfig.jam.catastrophicSound.volume ?? 1.0;
                     audio.play().catch(() => {});
                  }} title="Preview catastrophic sound">
                     <i class="fas fa-play"></i> Preview
                  </button>
               {/if}

               <!-- Catastrophic visual effect -->
               <div class="fx-field-row" style="margin-top: 0.3rem;">
                  <label class="fx-field-label">Effect</label>
                  <label class="fx-checkbox-field">
                     <input type="checkbox" checked={fxConfig.jam?.catastrophicEffect?.enabled ?? false}
                            on:change={() => saveConfig({ ...fxConfig, jam: { ...fxConfig.jam, catastrophicEffect: { ...fxConfig.jam?.catastrophicEffect, enabled: !(fxConfig.jam?.catastrophicEffect?.enabled ?? false) } } })} />
                     <span>Explosion visual</span>
                  </label>
               </div>
               {#if fxConfig.jam?.catastrophicEffect?.enabled}
                  <div class="fx-field-row">
                     <label class="fx-field-label">Source</label>
                     <select value={fxConfig.jam?.catastrophicEffect?.source ?? 'sequencer'}
                             on:change={(e) => saveConfig({ ...fxConfig, jam: { ...fxConfig.jam, catastrophicEffect: { ...fxConfig.jam?.catastrophicEffect, source: e.target.value } } })}>
                        <option value="sequencer" disabled={!sequencerAvailable}>
                           Sequencer DB{!sequencerAvailable ? ' (not installed)' : ''}
                        </option>
                        <option value="custom">Custom File</option>
                     </select>
                  </div>
                  {#if (fxConfig.jam?.catastrophicEffect?.source ?? 'sequencer') === 'sequencer'}
                     <div class="fx-field-row">
                        <label class="fx-field-label">Path</label>
                        <input type="text" value={fxConfig.jam?.catastrophicEffect?.sequencerPath ?? ''}
                               placeholder="e.g. jb2a.explosion.01.orange"
                               on:change={(e) => saveConfig({ ...fxConfig, jam: { ...fxConfig.jam, catastrophicEffect: { ...fxConfig.jam?.catastrophicEffect, sequencerPath: e.target.value } } })} />
                     </div>
                  {/if}
                  {#if fxConfig.jam?.catastrophicEffect?.source === 'custom'}
                     <div class="fx-field-row">
                        <label class="fx-field-label">File</label>
                        <div class="fx-file-picker-row">
                           <input type="text" value={fxConfig.jam?.catastrophicEffect?.customFile ?? ''} readonly
                                  placeholder="Select a .webm file" />
                           <button class="fx-btn-small" on:click={() => {
                              const picker = new FilePicker({
                                 type: 'imagevideo',
                                 current: fxConfig.jam?.catastrophicEffect?.customFile || '',
                                 callback: (path) => {
                                    if (path) saveConfig({ ...fxConfig, jam: { ...fxConfig.jam, catastrophicEffect: { ...fxConfig.jam?.catastrophicEffect, customFile: path } } });
                                 }
                              });
                              picker.render(true);
                           }}>
                              <i class="fas fa-file"></i>
                           </button>
                        </div>
                     </div>
                  {/if}
                  <div class="fx-field-row">
                     <label class="fx-field-label">Scale</label>
                     <input type="number" min="0.1" max="5" step="0.1" value={fxConfig.jam?.catastrophicEffect?.scale ?? 1.0}
                            on:change={(e) => { const n = Number(e.target.value); if (!isNaN(n)) saveConfig({ ...fxConfig, jam: { ...fxConfig.jam, catastrophicEffect: { ...fxConfig.jam?.catastrophicEffect, scale: n } } }); }} />
                  </div>
               {/if}
            </div>
         </section>

         <!-- Projectile -->
         <section class="fx-section">
            <FxEffectConfig title="Projectile" config={fxConfig.projectile}
                            showSpeed={true} showMirror={true} showTravelMode={true} showScatter={true}
                            {sequencerAvailable}
                            on:changed={(e) => handleEffectChanged('projectile', e)} />
         </section>

         <!-- Muzzle Flash -->
         <section class="fx-section">
            <FxEffectConfig title="Muzzle Flash" config={fxConfig.muzzle}
                            {sequencerAvailable}
                            on:changed={(e) => handleEffectChanged('muzzle', e)} />
         </section>

         <!-- Impact Effect -->
         <section class="fx-section">
            <FxEffectConfig title="Impact Effect" config={fxConfig.impact}
                            {sequencerAvailable}
                            on:changed={(e) => handleEffectChanged('impact', e)} />
            {#if fxConfig.impact?.enabled && fxConfig.projectile?.enabled}
               <p class="fx-hint"><i class="fas fa-info-circle"></i> Uses Projectile scatter for positioning</p>
            {/if}
         </section>

         <!-- Casing Ejection -->
         <section class="fx-section">
            <div class="fx-effect-header">
               <h4 class="fx-section-title">Casing Ejection</h4>
               <button class="fx-toggle-btn" class:active={fxConfig.casing?.enabled}
                       on:click={() => handleEffectChanged('casing', { detail: { ...fxConfig.casing, enabled: !fxConfig.casing?.enabled } })}
                       title={fxConfig.casing?.enabled ? 'Disable Casing' : 'Enable Casing'}>
                  <i class="fas" class:fa-toggle-on={fxConfig.casing?.enabled} class:fa-toggle-off={!fxConfig.casing?.enabled}></i>
               </button>
            </div>
            {#if fxConfig.casing?.enabled}
               <div class="fx-field-row">
                  <label class="fx-field-label">Source</label>
                  <select value={fxConfig.casing.source ?? 'sequencer'}
                          on:change={(e) => handleEffectChanged('casing', { detail: { ...fxConfig.casing, source: e.target.value } })}>
                     <option value="sequencer" disabled={!sequencerAvailable}>
                        Sequencer DB{!sequencerAvailable ? ' (not installed)' : ''}
                     </option>
                     <option value="custom">Custom File</option>
                  </select>
               </div>
               {#if fxConfig.casing.source === 'sequencer'}
                  <div class="fx-field-row">
                     <label class="fx-field-label">Path</label>
                     <input type="text" value={fxConfig.casing.sequencerPath ?? ''}
                            placeholder="e.g. jb2a.bullet.shell"
                            on:change={(e) => handleEffectChanged('casing', { detail: { ...fxConfig.casing, sequencerPath: e.target.value } })} />
                  </div>
               {/if}
               {#if fxConfig.casing.source === 'custom'}
                  <div class="fx-field-row">
                     <label class="fx-field-label">File</label>
                     <div class="fx-file-picker-row">
                        <input type="text" value={fxConfig.casing.customFile ?? ''} readonly
                               placeholder="Select a .webm file" />
                        <button class="fx-btn-small" on:click={() => {
                           const picker = new FilePicker({
                              type: 'imagevideo',
                              current: fxConfig.casing.customFile || '',
                              callback: (path) => {
                                 if (path) handleEffectChanged('casing', { detail: { ...fxConfig.casing, customFile: path } });
                              }
                           });
                           picker.render(true);
                        }}>
                           <i class="fas fa-file"></i>
                        </button>
                     </div>
                  </div>
               {/if}
               <div class="fx-field-row">
                  <label class="fx-field-label">Scale</label>
                  <input type="number" min="0.05" max="2" step="0.05" value={fxConfig.casing.scale ?? 0.3}
                         on:change={(e) => { const n = Number(e.target.value); if (!isNaN(n)) handleEffectChanged('casing', { detail: { ...fxConfig.casing, scale: n } }); }} />
               </div>
               <div class="fx-field-row">
                  <label class="fx-field-label">Scatter</label>
                  <input type="range" min="0" max="2" step="0.1"
                         value={fxConfig.casing.scatter ?? 0.5}
                         on:input={(e) => { const n = Number(e.target.value); if (!isNaN(n)) handleEffectChanged('casing', { detail: { ...fxConfig.casing, scatter: n } }); }} />
                  <span class="fx-sound-volume-label">{Math.round((fxConfig.casing.scatter ?? 0.5) * 100)}%</span>
               </div>
               <div class="fx-field-row">
                  <label class="fx-field-label">Eject</label>
                  <select value={fxConfig.casing.ejectDirection ?? 'right'}
                          on:change={(e) => handleEffectChanged('casing', { detail: { ...fxConfig.casing, ejectDirection: e.target.value } })}>
                     <option value="right">Right</option>
                     <option value="left">Left</option>
                     <option value="up">Up</option>
                     <option value="random">Random</option>
                  </select>
               </div>
               <label class="fx-checkbox-field">
                  <input type="checkbox" checked={fxConfig.casing.persist ?? true}
                         on:change={() => handleEffectChanged('casing', { detail: { ...fxConfig.casing, persist: !(fxConfig.casing.persist ?? true) } })} />
                  <span>Stay on map</span>
               </label>
               {#if fxConfig.casing.persist}
                  <div class="fx-field-row">
                     <label class="fx-field-label">Duration</label>
                     <input type="number" min="0" max="600" step="5" value={fxConfig.casing.duration ?? 0}
                            on:change={(e) => { const n = Number(e.target.value); if (!isNaN(n)) handleEffectChanged('casing', { detail: { ...fxConfig.casing, duration: n } }); }} />
                     <span class="fx-hint-inline">{fxConfig.casing.duration ? `${fxConfig.casing.duration}s` : 'permanent'}</span>
                  </div>
                  <p class="fx-hint"><i class="fas fa-info-circle"></i> 0 = permanent (clear via Sequencer Effect Manager)</p>
               {/if}
            {/if}
         </section>

         <!-- Test Buttons -->
         <section class="fx-section fx-test-buttons">
            <button class="fx-btn" on:click={testEffect} title="Test visual effect (requires target)">
               <i class="fas fa-play"></i> Test Effect
            </button>
            <button class="fx-btn" on:click={testSound} title="Play a random sound">
               <i class="fas fa-play"></i> Test Sound Only
            </button>
         </section>

         <!-- Copy / Paste / Export / Import / Presets -->
         <section class="fx-section fx-actions-row">
            <button class="fx-btn fx-btn-small" on:click={copyFxConfig} title="Copy FX config to clipboard">
               <i class="fas fa-copy"></i> Copy
            </button>
            <button class="fx-btn fx-btn-small" on:click={pasteFxConfig} title="Paste FX config from clipboard">
               <i class="fas fa-paste"></i> Paste
            </button>
            <button class="fx-btn fx-btn-small" on:click={exportFx} title="Export FX as portable JSON (includes Sequencer DB paths)">
               <i class="fas fa-file-export"></i> Export
            </button>
            <button class="fx-btn fx-btn-small" on:click={importFx} title="Import FX from clipboard JSON">
               <i class="fas fa-file-import"></i> Import
            </button>
            <button class="fx-btn fx-btn-small" class:active={showPresets}
                    on:click={() => showPresets = !showPresets} title="Apply a weapon preset">
               <i class="fas fa-wand-magic-sparkles"></i> Presets
            </button>
         </section>

         <!-- Preset Picker -->
         {#if showPresets}
            <section class="fx-section fx-presets-panel">
               {#each presetCategories as cat}
                  <div class="fx-preset-category">
                     <h5 class="fx-preset-category-title">{cat}</h5>
                     <div class="fx-preset-grid">
                        {#each getPresetsByCategory(cat) as preset}
                           <button class="fx-preset-btn" on:click={() => applyPreset(preset)}
                                   title={preset.description}>
                              <i class="fas {preset.icon}"></i>
                              <span>{preset.name}</span>
                           </button>
                        {/each}
                     </div>
                  </div>
               {/each}
               <p class="fx-hint"><i class="fas fa-info-circle"></i> Presets set effect types and rate of fire. Your sounds are preserved.</p>
            </section>
         {/if}
      {/if}
   </main>
</ApplicationShell>
