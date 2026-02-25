/**
 * Weapon FX Presets — Pre-built effect configurations for common weapon types.
 * Users can apply a preset as a starting point, then customize.
 * @module config/weaponFxPresets
 */

/**
 * @typedef {Object} WeaponFxPreset
 * @property {string} id - Unique preset ID
 * @property {string} name - Display name
 * @property {string} category - Category for grouping
 * @property {string} icon - FontAwesome icon class
 * @property {string} description - Short description
 * @property {object} config - Partial WeaponFxConfig to merge
 */

/** @type {WeaponFxPreset[]} */
export const WEAPON_FX_PRESETS = [
   // ==========================================
   // Ballistic — conventional firearms
   // ==========================================
   {
      id: 'pistol',
      name: 'Pistol',
      category: 'Ballistic',
      icon: 'fa-gun',
      description: 'Single shot handgun',
      config: {
         fxType: 'ranged',
         rateOfFire: { mode: 'single', delayBetweenShots: 150, randomizeDelay: true },
         projectile: { enabled: true, travelMode: 'projectile', scatter: 0.2 },
         muzzle: { enabled: true, scale: 0.4 },
         impact: { enabled: true, scale: 0.4 },
         casing: { enabled: true, scale: 0.2, ejectDirection: 'right', persist: false }
      }
   },
   {
      id: 'revolver',
      name: 'Revolver',
      category: 'Ballistic',
      icon: 'fa-gun',
      description: 'Heavy revolver — no casing ejection',
      config: {
         fxType: 'ranged',
         rateOfFire: { mode: 'single', delayBetweenShots: 200, randomizeDelay: true },
         projectile: { enabled: true, travelMode: 'projectile', scatter: 0.15 },
         muzzle: { enabled: true, scale: 0.5 },
         impact: { enabled: true, scale: 0.5 },
         casing: { enabled: false }
      }
   },
   {
      id: 'smg',
      name: 'SMG',
      category: 'Ballistic',
      icon: 'fa-gun',
      description: 'Submachine gun — burst fire',
      config: {
         fxType: 'ranged',
         rateOfFire: { mode: 'burst', burstCount: 3, delayBetweenShots: 80, randomizeDelay: true },
         projectile: { enabled: true, travelMode: 'projectile', scatter: 0.35 },
         muzzle: { enabled: true, scale: 0.4 },
         impact: { enabled: true, scale: 0.4 },
         casing: { enabled: true, scale: 0.2, ejectDirection: 'right', persist: false }
      }
   },
   {
      id: 'assault-rifle',
      name: 'Assault Rifle',
      category: 'Ballistic',
      icon: 'fa-gun',
      description: 'Automatic rifle — burst/auto',
      config: {
         fxType: 'ranged',
         rateOfFire: { mode: 'burst', burstCount: 3, autoCount: 6, delayBetweenShots: 70, randomizeDelay: true },
         projectile: { enabled: true, travelMode: 'projectile', scatter: 0.3 },
         muzzle: { enabled: true, scale: 0.5 },
         impact: { enabled: true, scale: 0.5 },
         casing: { enabled: true, scale: 0.2, ejectDirection: 'right', persist: false }
      }
   },
   {
      id: 'shotgun',
      name: 'Shotgun',
      category: 'Ballistic',
      icon: 'fa-gun',
      description: 'Pump-action shotgun — wide spread',
      config: {
         fxType: 'ranged',
         rateOfFire: { mode: 'single', delayBetweenShots: 300, randomizeDelay: false },
         projectile: { enabled: true, travelMode: 'projectile', scatter: 0.6 },
         muzzle: { enabled: true, scale: 0.7 },
         impact: { enabled: true, scale: 0.6 },
         casing: { enabled: true, scale: 0.3, ejectDirection: 'right', persist: false }
      }
   },
   {
      id: 'sniper',
      name: 'Sniper Rifle',
      category: 'Ballistic',
      icon: 'fa-crosshairs',
      description: 'Precision rifle — minimal scatter',
      config: {
         fxType: 'ranged',
         rateOfFire: { mode: 'single', delayBetweenShots: 500, randomizeDelay: false },
         projectile: { enabled: true, travelMode: 'projectile', scatter: 0.05 },
         muzzle: { enabled: true, scale: 0.6 },
         impact: { enabled: true, scale: 0.6 },
         casing: { enabled: true, scale: 0.25, ejectDirection: 'right', persist: false }
      }
   },
   {
      id: 'machinegun',
      name: 'Machine Gun',
      category: 'Ballistic',
      icon: 'fa-gun',
      description: 'Heavy automatic — high volume of fire',
      config: {
         fxType: 'ranged',
         rateOfFire: { mode: 'auto', autoCount: 8, delayBetweenShots: 60, randomizeDelay: true },
         projectile: { enabled: true, travelMode: 'projectile', scatter: 0.4 },
         muzzle: { enabled: true, scale: 0.6 },
         impact: { enabled: true, scale: 0.5 },
         casing: { enabled: true, scale: 0.2, ejectDirection: 'right', persist: false }
      }
   },

   // ==========================================
   // Energy — lasers, plasma, etc.
   // ==========================================
   {
      id: 'laser-pistol',
      name: 'Laser Pistol',
      category: 'Energy',
      icon: 'fa-bolt',
      description: 'Light laser — beam type',
      config: {
         fxType: 'ranged',
         rateOfFire: { mode: 'single', delayBetweenShots: 100, randomizeDelay: false },
         projectile: { enabled: true, travelMode: 'beam', scatter: 0.1, speed: 1.5 },
         muzzle: { enabled: true, scale: 0.3 },
         impact: { enabled: true, scale: 0.4 },
         casing: { enabled: false }
      }
   },
   {
      id: 'laser-rifle',
      name: 'Laser Rifle',
      category: 'Energy',
      icon: 'fa-bolt',
      description: 'Standard laser rifle — beam',
      config: {
         fxType: 'ranged',
         rateOfFire: { mode: 'single', delayBetweenShots: 120, randomizeDelay: false },
         projectile: { enabled: true, travelMode: 'beam', scatter: 0.05, speed: 1.5 },
         muzzle: { enabled: true, scale: 0.4 },
         impact: { enabled: true, scale: 0.5 },
         casing: { enabled: false }
      }
   },
   {
      id: 'plasma',
      name: 'Plasma Gun',
      category: 'Energy',
      icon: 'fa-sun',
      description: 'Plasma bolt — slow, powerful pulse',
      config: {
         fxType: 'ranged',
         rateOfFire: { mode: 'single', delayBetweenShots: 300, randomizeDelay: false },
         projectile: { enabled: true, travelMode: 'pulse', scatter: 0.15, speed: 0.6 },
         muzzle: { enabled: true, scale: 0.6 },
         impact: { enabled: true, scale: 0.7 },
         casing: { enabled: false }
      }
   },

   // ==========================================
   // Warhammer 40k — iconic weapons
   // ==========================================
   {
      id: 'bolter',
      name: 'Bolter',
      category: 'Warhammer 40k',
      icon: 'fa-meteor',
      description: 'Bolt rounds — explosive projectiles',
      config: {
         fxType: 'ranged',
         rateOfFire: { mode: 'semi', delayBetweenShots: 120, randomizeDelay: true },
         projectile: { enabled: true, travelMode: 'projectile', scatter: 0.2 },
         muzzle: { enabled: true, scale: 0.5 },
         impact: { enabled: true, scale: 0.6 },
         casing: { enabled: true, scale: 0.25, ejectDirection: 'right', persist: false }
      }
   },
   {
      id: 'bolt-pistol',
      name: 'Bolt Pistol',
      category: 'Warhammer 40k',
      icon: 'fa-meteor',
      description: 'Compact bolter pistol',
      config: {
         fxType: 'ranged',
         rateOfFire: { mode: 'single', delayBetweenShots: 150, randomizeDelay: true },
         projectile: { enabled: true, travelMode: 'projectile', scatter: 0.25 },
         muzzle: { enabled: true, scale: 0.4 },
         impact: { enabled: true, scale: 0.5 },
         casing: { enabled: true, scale: 0.2, ejectDirection: 'right', persist: false }
      }
   },
   {
      id: 'heavy-bolter',
      name: 'Heavy Bolter',
      category: 'Warhammer 40k',
      icon: 'fa-meteor',
      description: 'Heavy support — sustained fire',
      config: {
         fxType: 'ranged',
         rateOfFire: { mode: 'auto', autoCount: 6, delayBetweenShots: 80, randomizeDelay: true },
         projectile: { enabled: true, travelMode: 'projectile', scatter: 0.35 },
         muzzle: { enabled: true, scale: 0.7 },
         impact: { enabled: true, scale: 0.7 },
         casing: { enabled: true, scale: 0.3, ejectDirection: 'right', persist: false }
      }
   },
   {
      id: 'lasgun',
      name: 'Lasgun',
      category: 'Warhammer 40k',
      icon: 'fa-bolt',
      description: 'Imperial Guard standard — laser beam',
      config: {
         fxType: 'ranged',
         rateOfFire: { mode: 'single', delayBetweenShots: 100, randomizeDelay: true },
         projectile: { enabled: true, travelMode: 'beam', scatter: 0.1, speed: 2.0 },
         muzzle: { enabled: true, scale: 0.3 },
         impact: { enabled: true, scale: 0.3 },
         casing: { enabled: false }
      }
   },
   {
      id: 'laspistol',
      name: 'Laspistol',
      category: 'Warhammer 40k',
      icon: 'fa-bolt',
      description: 'Compact laser sidearm',
      config: {
         fxType: 'ranged',
         rateOfFire: { mode: 'single', delayBetweenShots: 120, randomizeDelay: true },
         projectile: { enabled: true, travelMode: 'beam', scatter: 0.15, speed: 2.0 },
         muzzle: { enabled: true, scale: 0.3 },
         impact: { enabled: true, scale: 0.3 },
         casing: { enabled: false }
      }
   },
   {
      id: 'autogun',
      name: 'Autogun',
      category: 'Warhammer 40k',
      icon: 'fa-gun',
      description: 'Automatic stubber — cheap and fast',
      config: {
         fxType: 'ranged',
         rateOfFire: { mode: 'auto', autoCount: 5, delayBetweenShots: 70, randomizeDelay: true },
         projectile: { enabled: true, travelMode: 'projectile', scatter: 0.4 },
         muzzle: { enabled: true, scale: 0.4 },
         impact: { enabled: true, scale: 0.4 },
         casing: { enabled: true, scale: 0.2, ejectDirection: 'right', persist: false }
      }
   },
   {
      id: 'stubber',
      name: 'Stub Gun',
      category: 'Warhammer 40k',
      icon: 'fa-gun',
      description: 'Basic solid projectile sidearm',
      config: {
         fxType: 'ranged',
         rateOfFire: { mode: 'single', delayBetweenShots: 180, randomizeDelay: true },
         projectile: { enabled: true, travelMode: 'projectile', scatter: 0.25 },
         muzzle: { enabled: true, scale: 0.4 },
         impact: { enabled: true, scale: 0.4 },
         casing: { enabled: true, scale: 0.15, ejectDirection: 'right', persist: false }
      }
   },
   {
      id: 'melta',
      name: 'Meltagun',
      category: 'Warhammer 40k',
      icon: 'fa-fire',
      description: 'Short range fusion beam — devastating',
      config: {
         fxType: 'ranged',
         rateOfFire: { mode: 'single', delayBetweenShots: 400, randomizeDelay: false },
         projectile: { enabled: true, travelMode: 'beam', scatter: 0.1, speed: 0.8 },
         muzzle: { enabled: true, scale: 0.8 },
         impact: { enabled: true, scale: 0.8 },
         casing: { enabled: false }
      }
   },
   {
      id: 'flamer',
      name: 'Flamer',
      category: 'Warhammer 40k',
      icon: 'fa-fire-flame-curved',
      description: 'Flame template weapon',
      config: {
         fxType: 'ranged',
         rateOfFire: { mode: 'single', delayBetweenShots: 200, randomizeDelay: false },
         projectile: { enabled: true, travelMode: 'beam', scatter: 0.5, speed: 0.5 },
         muzzle: { enabled: true, scale: 0.7 },
         impact: { enabled: true, scale: 0.6 },
         casing: { enabled: false }
      }
   },

   // ==========================================
   // Fantasy — bows, crossbows, magic
   // ==========================================
   {
      id: 'bow',
      name: 'Bow',
      category: 'Fantasy',
      icon: 'fa-bow-arrow',
      description: 'Longbow or shortbow — arrow projectile',
      config: {
         fxType: 'ranged',
         rateOfFire: { mode: 'single', delayBetweenShots: 200, randomizeDelay: false },
         projectile: { enabled: true, travelMode: 'projectile', scatter: 0.15, speed: 0.8 },
         muzzle: { enabled: false },
         impact: { enabled: true, scale: 0.4 },
         casing: { enabled: false }
      }
   },
   {
      id: 'crossbow',
      name: 'Crossbow',
      category: 'Fantasy',
      icon: 'fa-crosshairs',
      description: 'Crossbow bolt — precise',
      config: {
         fxType: 'ranged',
         rateOfFire: { mode: 'single', delayBetweenShots: 300, randomizeDelay: false },
         projectile: { enabled: true, travelMode: 'projectile', scatter: 0.1, speed: 1.0 },
         muzzle: { enabled: false },
         impact: { enabled: true, scale: 0.4 },
         casing: { enabled: false }
      }
   },
   {
      id: 'fire-bolt',
      name: 'Fire Bolt',
      category: 'Fantasy',
      icon: 'fa-fire',
      description: 'Magical fire projectile',
      config: {
         fxType: 'magic',
         rateOfFire: { mode: 'single', delayBetweenShots: 200, randomizeDelay: false },
         projectile: { enabled: true, travelMode: 'pulse', scatter: 0.15, speed: 0.7 },
         muzzle: { enabled: true, scale: 0.4 },
         impact: { enabled: true, scale: 0.6 },
         casing: { enabled: false }
      }
   },
   {
      id: 'magic-missile',
      name: 'Magic Missile',
      category: 'Fantasy',
      icon: 'fa-wand-sparkles',
      description: 'Arcane bolt — auto-hit, multiple projectiles',
      config: {
         fxType: 'magic',
         rateOfFire: { mode: 'burst', burstCount: 3, delayBetweenShots: 150, randomizeDelay: false },
         projectile: { enabled: true, travelMode: 'pulse', scatter: 0.1, speed: 0.8 },
         muzzle: { enabled: true, scale: 0.3 },
         impact: { enabled: true, scale: 0.4 },
         casing: { enabled: false }
      }
   },

   // ==========================================
   // Thrown
   // ==========================================
   {
      id: 'thrown-knife',
      name: 'Throwing Knife',
      category: 'Thrown',
      icon: 'fa-dagger',
      description: 'Fast thrown weapon',
      config: {
         fxType: 'thrown',
         rateOfFire: { mode: 'single', delayBetweenShots: 200, randomizeDelay: false },
         projectile: { enabled: true, travelMode: 'projectile', scatter: 0.2, speed: 0.8, randomizeMirrorY: true },
         muzzle: { enabled: false },
         impact: { enabled: true, scale: 0.4 },
         casing: { enabled: false }
      }
   },
   {
      id: 'grenade',
      name: 'Grenade',
      category: 'Thrown',
      icon: 'fa-bomb',
      description: 'Explosive — large impact',
      config: {
         fxType: 'thrown',
         rateOfFire: { mode: 'single', delayBetweenShots: 300, randomizeDelay: false },
         projectile: { enabled: true, travelMode: 'projectile', scatter: 0.3, speed: 0.5 },
         muzzle: { enabled: false },
         impact: { enabled: true, scale: 1.0 },
         casing: { enabled: false }
      }
   }
];

/**
 * Get unique preset categories.
 * @returns {string[]}
 */
export function getPresetCategories() {
   return [...new Set(WEAPON_FX_PRESETS.map(p => p.category))];
}

/**
 * Get presets by category.
 * @param {string} category
 * @returns {WeaponFxPreset[]}
 */
export function getPresetsByCategory(category) {
   return WEAPON_FX_PRESETS.filter(p => p.category === category);
}

/**
 * Find a preset by ID.
 * @param {string} id
 * @returns {WeaponFxPreset|undefined}
 */
export function getPresetById(id) {
   return WEAPON_FX_PRESETS.find(p => p.id === id);
}
