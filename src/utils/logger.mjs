/**
 * Debug logging utility for the module.
 * Provides conditional logging based on debug mode setting.
 * @module utils/logger
 */

import { MODULE_ID, constants } from '#config';

const LOG_PREFIX = constants.moduleLabel;

/**
 * Check if debug mode is enabled
 * @returns {boolean}
 */
function isDebugEnabled() {
   try {
      return game.settings.get(MODULE_ID, 'debugMode') ?? false;
   } catch {
      return false;
   }
}

/**
 * Log a debug message (only when debug mode is enabled)
 * @param {...any} args - Arguments to log
 */
export function debug(...args) {
   if (isDebugEnabled()) {
      console.log(`${LOG_PREFIX} |`, ...args);
   }
}

/**
 * Log a warning message (only when debug mode is enabled)
 * @param {...any} args - Arguments to log
 */
export function debugWarn(...args) {
   if (isDebugEnabled()) {
      console.warn(`${LOG_PREFIX} |`, ...args);
   }
}

/**
 * Log an error message (always shown)
 * @param {...any} args - Arguments to log
 */
export function error(...args) {
   console.error(`${LOG_PREFIX} |`, ...args);
}

/**
 * Log an info message (always shown, for important events)
 * @param {...any} args - Arguments to log
 */
export function info(...args) {
   console.log(`${LOG_PREFIX} |`, ...args);
}
