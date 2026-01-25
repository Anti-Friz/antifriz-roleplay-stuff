/**
 * FilePicker Utilities
 * Wrappers for Foundry's FilePicker for common use cases
 * @module utils/filepicker
 */

/**
 * Open a file picker for audio files
 * @param {Function} callback - Called with selected path
 * @param {string} [currentPath] - Current/default path
 * @returns {FilePicker}
 */
export function openAudioPicker(callback, currentPath = '') {
   const picker = new FilePicker({
      type: 'audio',
      current: currentPath,
      callback
   });
   picker.render(true);
   return picker;
}

/**
 * Open a file picker for image files
 * @param {Function} callback - Called with selected path
 * @param {string} [currentPath] - Current/default path
 * @returns {FilePicker}
 */
export function openImagePicker(callback, currentPath = '') {
   const picker = new foundry.applications.apps.FilePicker.implementation({
      type: 'image',
      current: currentPath,
      callback
   });
   picker.render(true);
   return picker;
}

/**
 * Extract filename without extension from a path
 * @param {string} path - File path
 * @returns {string}
 */
export function getFilenameFromPath(path) {
   return path.split('/').pop().replace(/\.[^/.]+$/, '');
}
