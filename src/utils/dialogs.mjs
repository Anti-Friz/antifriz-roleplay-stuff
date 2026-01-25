/**
 * Reusable Dialog Utilities
 * Common dialog patterns used across the module
 * @module utils/dialogs
 */

/**
 * Show a confirmation dialog for deletion
 * @param {string} title - Dialog title
 * @param {string} itemName - Name of item being deleted (for message)
 * @returns {Promise<boolean>} - True if confirmed
 */
export async function confirmDelete(title, itemName = 'this item') {
   return Dialog.confirm({
      title,
      content: `<p>Are you sure you want to remove ${itemName}?</p>`,
      defaultYes: false
   });
}

/**
 * Show a prompt dialog for renaming
 * @param {string} title - Dialog title  
 * @param {string} currentName - Current name value
 * @returns {Promise<string|null>} - New name or null if cancelled
 */
export async function promptRename(title, currentName) {
   try {
      const newName = await Dialog.prompt({
         title,
         content: `<input type="text" name="name" value="${currentName}" style="width: 100%">`,
         callback: (html) => html.find('input[name="name"]').val()
      });
      
      // Return new name only if it changed
      if (newName && newName.trim() !== currentName) {
         return newName.trim();
      }
      return null;
   } catch (e) {
      // User cancelled the dialog
      return null;
   }
}

/**
 * Show a confirmation dialog for discarding unsaved changes
 * @param {Function} onConfirm - Callback when user confirms discard
 * @returns {Promise<void>}
 */
export function confirmDiscardChanges(onConfirm) {
   return Dialog.confirm({
      title: 'Unsaved Changes',
      content: '<p>You have unsaved changes. Discard them?</p>',
      yes: onConfirm,
      no: () => {},
      defaultYes: false
   });
}

/**
 * Show an error notification
 * @param {string} message - Error message
 */
export function notifyError(message) {
   ui.notifications.error(message);
}

/**
 * Show a warning notification
 * @param {string} message - Warning message
 */
export function notifyWarn(message) {
   ui.notifications.warn(message);
}

/**
 * Show an info notification
 * @param {string} message - Info message
 */
export function notifyInfo(message) {
   ui.notifications.info(message);
}
