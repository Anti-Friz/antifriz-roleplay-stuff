/**
 * FilePicker Utilities
 * Wrappers for Foundry's FilePicker for common use cases
 * @module utils/filepicker
 */

/**
 * Get the configured Foundry V13 FilePicker class.
 * @returns {typeof foundry.applications.apps.FilePicker}
 */
function getFilePickerClass() {
   return foundry.applications.apps.FilePicker.implementation;
}

/**
 * Open a file picker for a specific Foundry file type.
 * @param {string} type - FilePicker type
 * @param {Function} callback - Called with selected path
 * @param {string} [currentPath] - Current/default path
 * @returns {FilePicker}
 */
export function openFilePicker(type, callback, currentPath = '') {
   const FilePickerClass = getFilePickerClass();
   const picker = new FilePickerClass({
      type,
      current: currentPath,
      callback
   });
   picker.render(true);
   return picker;
}

/**
 * Open a file picker for audio files
 * @param {Function} callback - Called with selected path
 * @param {string} [currentPath] - Current/default path
 * @returns {FilePicker}
 */
export function openAudioPicker(callback, currentPath = '') {
   return openFilePicker('audio', callback, currentPath);
}

/**
 * Open a file picker for image files
 * @param {Function} callback - Called with selected path
 * @param {string} [currentPath] - Current/default path
 * @returns {FilePicker}
 */
export function openImagePicker(callback, currentPath = '') {
   return openFilePicker('image', callback, currentPath);
}

/**
 * Open a file picker for image and video files.
 * @param {Function} callback - Called with selected path
 * @param {string} [currentPath] - Current/default path
 * @returns {FilePicker}
 */
export function openImageVideoPicker(callback, currentPath = '') {
   return openFilePicker('imagevideo', callback, currentPath);
}

/**
 * Browse files through Foundry's configured FilePicker implementation.
 * @param {string} source - FilePicker source
 * @param {string} target - Target directory
 * @param {object} [options] - Browse options
 * @returns {Promise<object>}
 */
export function browseFiles(source, target, options = {}) {
   const FilePickerClass = getFilePickerClass();
   return FilePickerClass.browse(source, target, options);
}

/**
 * Extract filename without extension from a path
 * @param {string} path - File path
 * @returns {string}
 */
export function getFilenameFromPath(path) {
   return path.split('/').pop().replace(/\.[^/.]+$/, '');
}
