/**
 * Centralized Permission System
 * Used for both Gallery and Music visibility permissions
 * @module utils/permissions
 */

/**
 * Permission types
 * @readonly
 * @enum {string}
 */
export const PERMISSION_TYPES = {
   ALL: 'all',           // Everyone can see
   GM: 'gm',             // GM only
   OWNER: 'owner',       // Document owners only
   CUSTOM: 'custom'      // Specific users
};

/**
 * Get permission options for dropdown
 * @returns {Array<{value: string, label: string, icon: string}>}
 */
export function getPermissionOptions() {
   return [
      { value: PERMISSION_TYPES.ALL, label: 'Everyone', icon: 'fa-globe' },
      { value: PERMISSION_TYPES.OWNER, label: 'Owner Only', icon: 'fa-user-shield' },
      { value: PERMISSION_TYPES.GM, label: 'GM Only', icon: 'fa-eye-slash' },
      { value: PERMISSION_TYPES.CUSTOM, label: 'Custom...', icon: 'fa-users-cog' }
   ];
}

/**
 * Normalize permission value to consistent format
 * Handles both old string format and new object format
 * @param {string|object} permission - Permission value
 * @returns {{type: string, users: string[]}}
 */
export function normalizePermission(permission) {
   if (!permission) {
      return { type: PERMISSION_TYPES.ALL, users: [] };
   }
   
   // Old format (string)
   if (typeof permission === 'string') {
      return { type: permission, users: [] };
   }
   
   // New format (object)
   if (typeof permission === 'object') {
      return {
         type: permission.type || PERMISSION_TYPES.ALL,
         users: Array.isArray(permission.users) ? permission.users : []
      };
   }
   
   return { type: PERMISSION_TYPES.ALL, users: [] };
}

/**
 * Check if a user can see content based on permission
 * GM always sees everything!
 * 
 * @param {object} permission - Permission object or string
 * @param {User} user - Foundry User object (defaults to current user)
 * @param {Document} [document] - Optional document for owner check
 * @returns {boolean}
 */
export function canUserSee(permission, user = game.user, document = null) {
   // GM always sees everything
   if (user.isGM) return true;
   
   const normalized = normalizePermission(permission);
   
   switch (normalized.type) {
      case PERMISSION_TYPES.ALL:
         return true;
         
      case PERMISSION_TYPES.GM:
         return false; // GM check already done above
         
      case PERMISSION_TYPES.OWNER:
         if (!document) return false;
         return document.testUserPermission?.(user, 'OWNER') ?? false;
         
      case PERMISSION_TYPES.CUSTOM:
         return normalized.users.includes(user.id);
         
      default:
         return true;
   }
}

/**
 * Get online players (non-GM users)
 * @returns {User[]}
 */
export function getOnlinePlayers() {
   return game.users.filter(u => u.active && !u.isGM);
}

/**
 * Get all players (non-GM users)
 * @returns {User[]}
 */
export function getAllPlayers() {
   return game.users.filter(u => !u.isGM);
}

/**
 * Get display label for permission
 * @param {string|object} permission - Permission value
 * @returns {string}
 */
export function getPermissionLabel(permission) {
   const normalized = normalizePermission(permission);
   const options = getPermissionOptions();
   
   if (normalized.type === PERMISSION_TYPES.CUSTOM && normalized.users.length > 0) {
      const count = normalized.users.length;
      return `${count} player${count > 1 ? 's' : ''}`;
   }
   
   return options.find(o => o.value === normalized.type)?.label ?? 'Everyone';
}

/**
 * Get icon for permission type
 * @param {string|object} permission - Permission value
 * @returns {string} FontAwesome icon class
 */
export function getPermissionIcon(permission) {
   const normalized = normalizePermission(permission);
   const options = getPermissionOptions();
   return options.find(o => o.value === normalized.type)?.icon ?? 'fa-globe';
}

/**
 * Create permission object
 * @param {string} type - Permission type
 * @param {string[]} [users] - User IDs for custom permission
 * @returns {object}
 */
export function createPermission(type, users = []) {
   if (type === PERMISSION_TYPES.CUSTOM) {
      return { type, users };
   }
   // For backward compatibility, use simple string for non-custom types
   return type;
}
