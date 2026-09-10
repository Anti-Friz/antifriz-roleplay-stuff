<svelte:options accessors={true}/>

<script>
   /**
    * MovementRulerShell - configure the coloured token drag ruler:
    * active speed provider, its colours and its provider specific settings.
    */
   import { getContext } from 'svelte';
   import { ApplicationShell } from '#runtime/svelte/component/application';
   import { MODULE_ID } from '#config';
   import {
      MR_MEASUREMENT_MODES,
      MR_NATIVE_PROVIDER_ID,
      MR_SETTINGS,
      MR_UNREACHABLE_COLOR_ID,
      mrColorSettingKey,
      mrProviderSettingKey
   } from '../config/movementRuler.mjs';
   import { colorHexToNumber, colorNumberToHex, getSpeedProviders, notifyInfo } from '#utils';

   export let elementRoot = void 0;

   const external = getContext('#external');
   const application = external?.application;

   const isGM = game.user.isGM;
   const providers = [...getSpeedProviders().values()];

   const localize = (key) => (key ? game.i18n.localize(key) : '');

   let selectedProviderId = game.settings.get(MODULE_ID, MR_SETTINGS.speedProvider);
   if (!providers.some((p) => p.id === selectedProviderId)) {
      selectedProviderId = providers[0]?.id ?? MR_NATIVE_PROVIDER_ID;
   }

   let measurement = game.settings.get(MODULE_ID, MR_SETTINGS.measurement);
   let observerOnly = game.settings.get(MODULE_ID, MR_SETTINGS.observerOnly);
   let highlightGrid = game.settings.get(MODULE_ID, MR_SETTINGS.highlightGrid);
   let colorWaypoints = game.settings.get(MODULE_ID, MR_SETTINGS.colorWaypoints);

   /** Working copies keyed by `${providerId}.${colorId}` / `${providerId}.${settingId}`. */
   const colorValues = {};
   const settingValues = {};

   /**
    * All colours of a provider, including the reserved "unreachable" entry.
    * @param {object} provider
    */
   function providerColors(provider) {
      return [
         ...provider.colors,
         {
            id: MR_UNREACHABLE_COLOR_ID,
            default: provider.defaultUnreachableColor,
            name: 'MOVEMENTRULER.speeds.Unreachable'
         }
      ];
   }

   function providerLabel(provider) {
      if (provider.id === MR_NATIVE_PROVIDER_ID) return localize('MOVEMENTRULER.provider.Native');
      const separator = provider.id.indexOf('.');
      const type = provider.id.slice(0, separator);
      const packageId = provider.id.slice(separator + 1);
      if (type === 'system') {
         return game.i18n.format('MOVEMENTRULER.provider.System', { name: game.system.title });
      }
      return game.i18n.format('MOVEMENTRULER.provider.Module', {
         name: game.modules.get(packageId)?.title ?? packageId
      });
   }

   for (const provider of providers) {
      for (const color of providerColors(provider)) {
         colorValues[`${provider.id}.${color.id}`] =
            colorNumberToHex(game.settings.get(MODULE_ID, mrColorSettingKey(provider.id, color.id)));
      }
      for (const setting of provider.settings) {
         settingValues[`${provider.id}.${setting.id}`] =
            game.settings.get(MODULE_ID, mrProviderSettingKey(provider.id, setting.id));
      }
   }

   $: selectedProvider = providers.find((p) => p.id === selectedProviderId);
   $: selectedColors = selectedProvider ? providerColors(selectedProvider) : [];
   $: selectedSettings = selectedProvider?.settings ?? [];

   function settingKind(setting) {
      if (setting.choices) return 'select';
      if (setting.type === Boolean) return 'boolean';
      if (setting.type === Number) return 'number';
      return 'string';
   }

   function isSettingEditable(setting) {
      return isGM || setting.scope !== 'world';
   }

   function resetColors() {
      if (!selectedProvider) return;
      for (const color of providerColors(selectedProvider)) {
         colorValues[`${selectedProvider.id}.${color.id}`] = colorNumberToHex(color.default);
      }
   }

   async function save() {
      // Client-scoped display options are always writable.
      await game.settings.set(MODULE_ID, MR_SETTINGS.highlightGrid, highlightGrid);
      await game.settings.set(MODULE_ID, MR_SETTINGS.colorWaypoints, colorWaypoints);

      for (const provider of providers) {
         for (const color of providerColors(provider)) {
            await game.settings.set(
               MODULE_ID,
               mrColorSettingKey(provider.id, color.id),
               colorHexToNumber(colorValues[`${provider.id}.${color.id}`])
            );
         }
      }

      for (const provider of providers) {
         for (const setting of provider.settings) {
            if (!isSettingEditable(setting)) continue;
            let value = settingValues[`${provider.id}.${setting.id}`];
            if (setting.type === Number) value = Number(value);
            await game.settings.set(MODULE_ID, mrProviderSettingKey(provider.id, setting.id), value);
         }
      }

      if (isGM) {
         await game.settings.set(MODULE_ID, MR_SETTINGS.measurement, measurement);
         await game.settings.set(MODULE_ID, MR_SETTINGS.observerOnly, observerOnly);
         await game.settings.set(MODULE_ID, MR_SETTINGS.speedProvider, selectedProviderId);
      }

      notifyInfo(localize('MOVEMENTRULER.Saved'));
      application.close();
   }

   function cancel() {
      application.close();
   }
</script>

<ApplicationShell bind:elementRoot>
   <div class="movement-ruler-content">
      <section class="config-section">
         <h3><i class="fas fa-gauge-high"></i> {localize('MOVEMENTRULER.headers.Provider')}</h3>

         {#if isGM}
            <div class="setting-row">
               <label for="mr-provider">{localize('MOVEMENTRULER.provider.Name')}</label>
               <select id="mr-provider" bind:value={selectedProviderId}>
                  {#each providers as provider (provider.id)}
                     <option value={provider.id}>{providerLabel(provider)}</option>
                  {/each}
               </select>
            </div>
            <p class="notes">{localize('MOVEMENTRULER.provider.Hint')}</p>

            <div class="setting-row">
               <label for="mr-measurement">{localize('MOVEMENTRULER.measurement.Name')}</label>
               <select id="mr-measurement" bind:value={measurement}>
                  <option value={MR_MEASUREMENT_MODES.COST}>{localize('MOVEMENTRULER.measurement.Cost')}</option>
                  <option value={MR_MEASUREMENT_MODES.DISTANCE}>{localize('MOVEMENTRULER.measurement.Distance')}</option>
               </select>
            </div>
            <p class="notes">{localize('MOVEMENTRULER.measurement.Hint')}</p>

            <div class="setting-row">
               <label>
                  <input type="checkbox" bind:checked={observerOnly}>
                  {localize('MOVEMENTRULER.observerOnly.Name')}
               </label>
            </div>
            <p class="notes">{localize('MOVEMENTRULER.observerOnly.Hint')}</p>
         {:else}
            <div class="setting-row">
               <span class="row-label">{localize('MOVEMENTRULER.provider.Name')}</span>
               <b>{selectedProvider ? providerLabel(selectedProvider) : ''}</b>
            </div>
            <p class="notes">{localize('MOVEMENTRULER.provider.PlayerHint')}</p>
         {/if}
      </section>

      <section class="config-section">
         <h3><i class="fas fa-palette"></i> {localize('MOVEMENTRULER.headers.Display')}</h3>
         <div class="setting-row">
            <label>
               <input type="checkbox" bind:checked={highlightGrid}>
               {localize('MOVEMENTRULER.highlightGrid.Name')}
            </label>
         </div>
         <div class="setting-row">
            <label>
               <input type="checkbox" bind:checked={colorWaypoints}>
               {localize('MOVEMENTRULER.colorWaypoints.Name')}
            </label>
         </div>
      </section>

      <section class="config-section">
         <h3><i class="fas fa-swatchbook"></i> {localize('MOVEMENTRULER.headers.Colors')}</h3>
         {#each selectedColors as color (color.id)}
            <div class="setting-row">
               <label for={`mr-color-${color.id}`}>{color.name ? localize(color.name) : color.id}</label>
               <input
                  id={`mr-color-${color.id}`}
                  type="color"
                  bind:value={colorValues[`${selectedProviderId}.${color.id}`]}
               >
            </div>
         {/each}
         <button type="button" class="reset-btn" on:click={resetColors}>
            <i class="fas fa-rotate-left"></i> {localize('MOVEMENTRULER.ResetColors')}
         </button>
      </section>

      {#if selectedSettings.length > 0}
         <section class="config-section">
            <h3><i class="fas fa-sliders"></i> {localize('MOVEMENTRULER.headers.ProviderSettings')}</h3>
            {#each selectedSettings as setting (setting.id)}
               {@const key = `${selectedProviderId}.${setting.id}`}
               <div class="setting-row">
                  <label for={`mr-setting-${setting.id}`}>{localize(setting.name) || setting.id}</label>
                  {#if settingKind(setting) === 'boolean'}
                     <input
                        id={`mr-setting-${setting.id}`}
                        type="checkbox"
                        disabled={!isSettingEditable(setting)}
                        bind:checked={settingValues[key]}
                     >
                  {:else if settingKind(setting) === 'select'}
                     <select
                        id={`mr-setting-${setting.id}`}
                        disabled={!isSettingEditable(setting)}
                        bind:value={settingValues[key]}
                     >
                        {#each Object.entries(setting.choices) as [value, label] (value)}
                           <option {value}>{localize(label)}</option>
                        {/each}
                     </select>
                  {:else if settingKind(setting) === 'number'}
                     <input
                        id={`mr-setting-${setting.id}`}
                        type="number"
                        step="any"
                        disabled={!isSettingEditable(setting)}
                        bind:value={settingValues[key]}
                     >
                  {:else}
                     <input
                        id={`mr-setting-${setting.id}`}
                        type="text"
                        disabled={!isSettingEditable(setting)}
                        bind:value={settingValues[key]}
                     >
                  {/if}
               </div>
               {#if setting.hint}
                  <p class="notes">{localize(setting.hint)}</p>
               {/if}
            {/each}
         </section>
      {/if}

      <div class="button-row">
         <button type="button" class="save-btn" on:click={save}>
            <i class="fas fa-save"></i> {localize('SETTINGS.Save')}
         </button>
         <button type="button" class="cancel-btn" on:click={cancel}>
            <i class="fas fa-times"></i> {localize('Cancel')}
         </button>
      </div>
   </div>
</ApplicationShell>
