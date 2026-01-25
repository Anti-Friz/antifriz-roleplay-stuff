// node_modules/@typhonjs-fvtt/runtime/_dist/svelte/store/util/index.js
function isMinimalWritableStore(store) {
  if (store === null || store === void 0) {
    return false;
  }
  switch (typeof store) {
    case "function":
    case "object":
      return typeof store.subscribe === "function" && typeof store.set === "function";
  }
  return false;
}
function isWritableStore(store) {
  if (store === null || store === void 0) {
    return false;
  }
  switch (typeof store) {
    case "function":
    case "object":
      return typeof store.subscribe === "function" && typeof store.set === "function" && typeof store.update === "function";
  }
  return false;
}
function subscribeIgnoreFirst(store, update) {
  let firedFirst = false;
  return store.subscribe((value) => {
    if (!firedFirst) {
      firedFirst = true;
    } else {
      update(value);
    }
  });
}

// node_modules/@typhonjs-fvtt/runtime/_dist/util/index.js
var Frozen = class {
  /**
   * @hideconstructor
   */
  constructor() {
    throw new Error("Frozen constructor: This is a static class and should not be constructed.");
  }
  /**
   * @param {Iterable<[K, V]>} [entries] - Target Map or iterable of [key, value] pairs.
   *
   * @returns {ReadonlyMap<K, V>} A strictly ReadonlyMap.
   *
   * @template K, V
   */
  static Map(entries) {
    const result = new Map(entries);
    result.set = void 0;
    result.delete = void 0;
    result.clear = void 0;
    return (
      /** @type {ReadonlyMap<K, V>} */
      result
    );
  }
  /**
   * @param {Iterable<T>} [data] - Target Set or iterable list.
   *
   * @returns {ReadonlySet<T>} A strictly ReadonlySet.
   *
   * @template T
   */
  static Set(data) {
    const result = new Set(data);
    result.add = void 0;
    result.delete = void 0;
    result.clear = void 0;
    return (
      /** @type {ReadonlySet<T>} */
      result
    );
  }
};
Object.freeze(Frozen);
var Hashing = class {
  static #regexUuidv = /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
  /**
   * @hideconstructor
   */
  constructor() {
    throw new Error("Hashing constructor: This is a static class and should not be constructed.");
  }
  /**
   * Provides a solid string hashing algorithm.
   *
   * Sourced from: https://stackoverflow.com/a/52171480
   *
   * @param {string}   str - String to hash.
   *
   * @param {number}   [seed=0] - A seed value altering the hash.
   *
   * @returns {number} Hash code.
   */
  static hashCode(str, seed = 0) {
    if (typeof str !== "string") {
      return 0;
    }
    let h1 = 3735928559 ^ seed, h2 = 1103547991 ^ seed;
    for (let ch, i = 0; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ h1 >>> 16, 2246822507) ^ Math.imul(h2 ^ h2 >>> 13, 3266489909);
    h2 = Math.imul(h2 ^ h2 >>> 16, 2246822507) ^ Math.imul(h1 ^ h1 >>> 13, 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
  }
  /**
   * Validates that the given string is formatted as a UUIDv4 string.
   *
   * @param {unknown}   uuid - UUID string to test.
   *
   * @returns {uuid is string} Is UUIDv4 string.
   */
  static isUuidv4(uuid) {
    return typeof uuid === "string" && this.#regexUuidv.test(uuid);
  }
  /**
   * Generates a UUID v4 compliant ID. Please use a complete UUID generation package for guaranteed compliance.
   *
   * This code is an evolution of the following Gist.
   * https://gist.github.com/jed/982883
   *
   * There is a public domain / free copy license attached to it that is not a standard OSS license...
   * https://gist.github.com/jed/982883#file-license-txt
   *
   * @returns {string} UUIDv4
   */
  static uuidv4() {
    return ("10000000-1000-4000-8000" + -1e11).replace(/[018]/g, (c) => (c ^ (globalThis.crypto ?? globalThis.msCrypto).getRandomValues(
      new Uint8Array(1)
    )[0] & 15 >> c / 4).toString(16));
  }
};
var Strings = class {
  /**
   * @hideconstructor
   */
  constructor() {
    throw new Error("Strings constructor: This is a static class and should not be constructed.");
  }
  /**
   * Escape a given input string prefacing special characters with backslashes for use in a regular expression.
   *
   * @param {string}   string - An un-escaped input string.
   *
   * @returns {string} The escaped string suitable for use in a regular expression.
   */
  static escape(string) {
    return string.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  }
  /**
   * Normalizes a string.
   *
   * @param {string}   string - A string to normalize for comparisons.
   *
   * @returns {string} Cleaned string.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize
   */
  static normalize(string) {
    return string.trim().normalize("NFD").replace(/[\x00-\x1F]/gm, "");
  }
};

export {
  isMinimalWritableStore,
  isWritableStore,
  subscribeIgnoreFirst,
  Frozen,
  Hashing,
  Strings
};
//# sourceMappingURL=chunk-3FJTWSRM.js.map
