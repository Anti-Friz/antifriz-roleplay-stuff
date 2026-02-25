/**
 * FX Import/Export utility.
 * Handles serialization and deserialization of Weapon FX and Defensive FX configs
 * as JSON, including Sequencer DB path references.
 *
 * @module utils/fxImportExport
 */

import { MODULE_ID } from '#config';
import { debug } from './logger.mjs';

// ==========================================
// Export
// ==========================================

/**
 * Export a weapon FX config to a portable JSON object.
 * Strips runtime-only data, keeps Sequencer DB paths as references.
 *
 * @param {Item} item - The item to export from
 * @returns {object|null} Portable config (or null if no FX configured)
 */
export function exportWeaponFx(item) {
   if (!item) return null;
   const config = item.getFlag(MODULE_ID, 'weaponFx');
   if (!config) return null;

   return {
      _arsExport: 'weaponFx',
      _version: 1,
      _itemName: item.name,
      _exportedAt: new Date().toISOString(),
      config: _stripEnabled(config)
   };
}

/**
 * Export a defensive FX config to a portable JSON object.
 *
 * @param {Item} item - The item to export from
 * @returns {object|null} Portable config (or null if no FX configured)
 */
export function exportDefensiveFx(item) {
   if (!item) return null;
   const config = item.getFlag(MODULE_ID, 'defensiveFx');
   if (!config) return null;

   return {
      _arsExport: 'defensiveFx',
      _version: 1,
      _itemName: item.name,
      _exportedAt: new Date().toISOString(),
      config: _stripEnabled(config)
   };
}

/**
 * Export both weapon and defensive FX configs as a combined bundle.
 *
 * @param {Item} item
 * @returns {object|null}
 */
export function exportAllFx(item) {
   if (!item) return null;
   const weapon = item.getFlag(MODULE_ID, 'weaponFx');
   const defensive = item.getFlag(MODULE_ID, 'defensiveFx');
   if (!weapon && !defensive) return null;

   return {
      _arsExport: 'allFx',
      _version: 1,
      _itemName: item.name,
      _exportedAt: new Date().toISOString(),
      weaponFx: weapon ? _stripEnabled(weapon) : null,
      defensiveFx: defensive ? _stripEnabled(defensive) : null
   };
}

// ==========================================
// Import
// ==========================================

/**
 * Validate and parse an imported FX JSON string.
 *
 * @param {string} jsonString - The JSON string to parse
 * @returns {{ type: string, config: object }|{ error: string }}
 */
export function parseImportedFx(jsonString) {
   let data;
   try {
      data = JSON.parse(jsonString);
   } catch (err) {
      return { error: 'Invalid JSON format' };
   }

   if (!data || typeof data !== 'object') {
      return { error: 'Invalid data: not an object' };
   }

   // Detect format
   if (data._arsExport === 'weaponFx' && data.config) {
      if (!_validateWeaponFxConfig(data.config)) {
         return { error: 'Invalid weapon FX config structure' };
      }
      return { type: 'weaponFx', config: data.config };
   }

   if (data._arsExport === 'defensiveFx' && data.config) {
      if (!_validateDefensiveFxConfig(data.config)) {
         return { error: 'Invalid defensive FX config structure' };
      }
      return { type: 'defensiveFx', config: data.config };
   }

   if (data._arsExport === 'allFx') {
      const result = { type: 'allFx' };
      if (data.weaponFx) {
         if (!_validateWeaponFxConfig(data.weaponFx)) {
            return { error: 'Invalid weapon FX config in bundle' };
         }
         result.weaponFx = data.weaponFx;
      }
      if (data.defensiveFx) {
         if (!_validateDefensiveFxConfig(data.defensiveFx)) {
            return { error: 'Invalid defensive FX config in bundle' };
         }
         result.defensiveFx = data.defensiveFx;
      }
      return result;
   }

   // Try to detect raw configs without wrapper
   if (data.fxType !== undefined && (data.sounds !== undefined || data.projectile !== undefined)) {
      if (!_validateWeaponFxConfig(data)) {
         return { error: 'Invalid weapon FX config structure' };
      }
      return { type: 'weaponFx', config: data };
   }

   if (data.onHit !== undefined || data.onDeflect !== undefined || data.aura !== undefined) {
      if (!_validateDefensiveFxConfig(data)) {
         return { error: 'Invalid defensive FX config structure' };
      }
      return { type: 'defensiveFx', config: data };
   }

   return { error: 'Unrecognized FX format' };
}

/**
 * Import FX config to an item.
 *
 * @param {Item} item - Target item
 * @param {string} jsonString - JSON string to import
 * @returns {Promise<{ success: boolean, type?: string, error?: string }>}
 */
export async function importFxToItem(item, jsonString) {
   if (!item) return { success: false, error: 'No item provided' };

   const parsed = parseImportedFx(jsonString);
   if (parsed.error) {
      return { success: false, error: parsed.error };
   }

   try {
      if (parsed.type === 'weaponFx') {
         await item.setFlag(MODULE_ID, 'weaponFx', { ...parsed.config, enabled: true });
         debug('FxImportExport | Imported weapon FX to', item.name);
         return { success: true, type: 'weaponFx' };
      }

      if (parsed.type === 'defensiveFx') {
         await item.setFlag(MODULE_ID, 'defensiveFx', { ...parsed.config, enabled: true });
         debug('FxImportExport | Imported defensive FX to', item.name);
         return { success: true, type: 'defensiveFx' };
      }

      if (parsed.type === 'allFx') {
         if (parsed.weaponFx) {
            await item.setFlag(MODULE_ID, 'weaponFx', { ...parsed.weaponFx, enabled: true });
         }
         if (parsed.defensiveFx) {
            await item.setFlag(MODULE_ID, 'defensiveFx', { ...parsed.defensiveFx, enabled: true });
         }
         debug('FxImportExport | Imported all FX to', item.name);
         return { success: true, type: 'allFx' };
      }

      return { success: false, error: 'Unknown import type' };
   } catch (err) {
      console.error('[ARS] FxImportExport: Import failed:', err);
      return { success: false, error: err.message };
   }
}

// ==========================================
// Copy to clipboard / download
// ==========================================

/**
 * Copy FX config to clipboard as JSON.
 *
 * @param {object} exportData - Result of exportWeaponFx/exportDefensiveFx/exportAllFx
 * @returns {Promise<boolean>}
 */
export async function copyFxToClipboard(exportData) {
   if (!exportData) return false;
   try {
      const json = JSON.stringify(exportData, null, 2);
      await navigator.clipboard.writeText(json);
      return true;
   } catch (err) {
      console.warn('[ARS] FxImportExport: Clipboard copy failed:', err);
      return false;
   }
}

/**
 * Download FX config as a JSON file.
 *
 * @param {object} exportData
 * @param {string} [filename]
 */
export function downloadFxAsFile(exportData, filename) {
   if (!exportData) return;
   const json = JSON.stringify(exportData, null, 2);
   const blob = new Blob([json], { type: 'application/json' });
   const url = URL.createObjectURL(blob);
   const a = document.createElement('a');
   a.href = url;
   a.download = filename || `fx-${exportData._arsExport ?? 'config'}-${Date.now()}.json`;
   a.click();
   URL.revokeObjectURL(url);
}

// ==========================================
// Helpers
// ==========================================

/**
 * Strip the `enabled` flag from a config for export.
 * The enabled state is set on import, not carried over.
 */
function _stripEnabled(config) {
   const copy = { ...config };
   delete copy.enabled;
   return copy;
}

/**
 * Basic validation of weapon FX config structure.
 */
function _validateWeaponFxConfig(config) {
   if (typeof config !== 'object' || config === null) return false;
   // Must have at least one recognizable weapon FX field
   return config.fxType !== undefined
      || config.sounds !== undefined
      || config.projectile !== undefined
      || config.rateOfFire !== undefined;
}

/**
 * Basic validation of defensive FX config structure.
 */
function _validateDefensiveFxConfig(config) {
   if (typeof config !== 'object' || config === null) return false;
   // Must have at least one recognizable defensive FX field
   return config.onHit !== undefined
      || config.onDeflect !== undefined
      || config.onPenetrate !== undefined
      || config.aura !== undefined;
}
