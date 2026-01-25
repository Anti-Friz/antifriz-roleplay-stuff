import "./chunk-X7HCJ7ZS.js";
import {
  Hashing,
  Strings,
  isMinimalWritableStore
} from "./chunk-3FJTWSRM.js";
import {
  writable
} from "./chunk-M2FRMPL5.js";
import {
  hasPrototype,
  isIterable,
  isObject,
  isPlainObject,
  safeAccess
} from "./chunk-KPMOB2R4.js";
import {
  get_store_value,
  tick
} from "./chunk-GBPX7F5N.js";
import "./chunk-CVMU2DPX.js";
import "./chunk-PZ5AY32C.js";

// node_modules/@typhonjs-fvtt/runtime/_dist/svelte/store/reducer/index.js
var DynReducerUtils = class {
  /**
   * Checks for array equality between two arrays of numbers.
   *
   * @param a - Array A
   *
   * @param b - Array B
   *
   * @returns Arrays are equal.
   */
  static arrayEquals(a, b) {
    if (a === b) {
      return true;
    }
    if (a === null || b === null) {
      return false;
    }
    if (a.length !== b.length) {
      return false;
    }
    for (let cntr = a.length; --cntr >= 0; ) {
      if (a[cntr] !== b[cntr]) {
        return false;
      }
    }
    return true;
  }
  /**
   * Provides a solid string hashing algorithm.
   *
   * Sourced from: https://stackoverflow.com/a/52171480
   *
   * @param str - String to hash.
   *
   * @param seed - A seed value altering the hash.
   *
   * @returns Hash code.
   */
  static hashString(str, seed = 0) {
    if (str === void 0 || str === null) {
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
   * Converts an unknown value for hashing purposes in {@link AdapterIndexer.calcHashUpdate}.
   *
   * Currently, objects / Map w/ object keys is not supported. Potentially can include `object-hash` to handle this
   * case, but it is not common to use objects as keys in Maps.
   *
   * @param value - An unknown value to convert to a number.
   */
  static hashUnknown(value) {
    if (value === null || value === void 0) {
      return 0;
    }
    let result = 0;
    switch (typeof value) {
      case "boolean":
        result = value ? 1 : 0;
        break;
      case "bigint":
        result = Number(BigInt.asIntN(64, value));
        break;
      case "function":
        result = this.hashString(value.name);
        break;
      case "number":
        result = Number.isFinite(value) ? value : 0;
        break;
      case "object":
        break;
      case "string":
        result = this.hashString(value);
        break;
      case "symbol":
        result = this.hashString(Symbol.keyFor(value));
        break;
    }
    return result;
  }
  /**
   * @param target -
   *
   * @param Prototype -
   *
   * @returns target constructor function has Prototype.
   */
  static hasPrototype(target, Prototype) {
    if (typeof target !== "function") {
      return false;
    }
    if (target === Prototype) {
      return true;
    }
    for (let proto = Object.getPrototypeOf(target); proto; proto = Object.getPrototypeOf(proto)) {
      if (proto === Prototype) {
        return true;
      }
    }
    return false;
  }
  /**
   * Provides a utility method to determine if the given data is iterable / implements iterator protocol.
   *
   * @param data - Data to verify as iterable.
   *
   * @returns Is data iterable.
   */
  static isIterable(data) {
    return data !== null && data !== void 0 && typeof data === "object" && typeof data[Symbol.iterator] === "function";
  }
};
var AdapterDerived = class {
  #hostData;
  #DerivedReducerCtor;
  #parentIndex;
  #derived = /* @__PURE__ */ new Map();
  #destroyed = false;
  /**
   * @param hostData - Hosted data structure.
   *
   * @param parentIndex - Any associated parent index API.
   *
   * @param DerivedReducerCtor - The default derived reducer constructor function.
   */
  constructor(hostData, parentIndex, DerivedReducerCtor) {
    this.#hostData = hostData;
    this.#parentIndex = parentIndex;
    this.#DerivedReducerCtor = DerivedReducerCtor;
    Object.freeze(this);
  }
  /**
   * Creates a new derived reducer.
   *
   * @param options - Options defining the new derived reducer.
   *
   * @returns Newly created derived reducer.
   */
  create(options) {
    if (this.#destroyed || this.#hostData === null) {
      throw Error(`AdapterDerived.create error: this instance has been destroyed.`);
    }
    let name;
    let rest = {};
    let ctor;
    const DerivedReducerCtor = this.#DerivedReducerCtor;
    if (typeof options === "string") {
      name = options;
      ctor = DerivedReducerCtor;
    } else if (typeof options === "function" && DynReducerUtils.hasPrototype(options, DerivedReducerCtor)) {
      ctor = options;
    } else if (typeof options === "object" && options !== null) {
      ({ name, ctor = DerivedReducerCtor, ...rest } = options);
    } else {
      throw new TypeError(`AdapterDerived.create error: 'options' does not conform to allowed parameters.`);
    }
    if (!DynReducerUtils.hasPrototype(ctor, DerivedReducerCtor)) {
      throw new TypeError(`AdapterDerived.create error: 'ctor' is not a '${DerivedReducerCtor?.name}'.`);
    }
    name = name ?? ctor?.name;
    if (typeof name !== "string") {
      throw new TypeError(`AdapterDerived.create error: 'name' is not a string.`);
    }
    const derivedReducer = new ctor(this.#hostData, this.#parentIndex, rest);
    this.#derived.set(name, derivedReducer);
    if (this.#hasInitialize(derivedReducer)) {
      const { filters: filters2, sort, ...optionsRest } = rest;
      derivedReducer.initialize(optionsRest);
    }
    return derivedReducer;
  }
  /**
   * Removes all derived reducers and associated subscriptions.
   */
  clear() {
    if (this.#destroyed) {
      return;
    }
    for (const reducer of this.#derived.values()) {
      reducer.destroy();
    }
    this.#derived.clear();
  }
  /**
   * Deletes and destroys a derived reducer by name.
   *
   * @param name - Name of the derived reducer.
   *
   * @returns true if an element in the Map existed and has been removed, or false if the element does not exist.
   */
  delete(name) {
    if (this.#destroyed) {
      throw Error(`AdapterDerived.delete error: this instance has been destroyed.`);
    }
    const reducer = this.#derived.get(name);
    if (reducer) {
      reducer.destroy();
    }
    return this.#derived.delete(name);
  }
  /**
   * Removes all derived reducers, subscriptions, and cleans up all resources.
   */
  destroy() {
    if (this.#destroyed) {
      return;
    }
    this.clear();
    this.#hostData = null;
    this.#parentIndex = null;
    this.#destroyed = true;
  }
  /**
   * Returns an existing derived reducer.
   *
   * @param name - Name of derived reducer.
   *
   * @returns Any associated derived reducer.
   */
  get(name) {
    if (this.#destroyed) {
      throw Error(`AdapterDerived.get error: this instance has been destroyed.`);
    }
    return this.#derived.get(name);
  }
  /**
   * Type guard to check for presence of `initialize` method.
   *
   * @param instance - Instance to check.
   */
  #hasInitialize(instance) {
    return typeof instance?.initialize === "function";
  }
  /**
   * Updates all managed derived reducer indexes.
   *
   * @param [force=false] - Force an update to subscribers.
   */
  update(force = false) {
    if (this.#destroyed) {
      return;
    }
    for (const reducer of this.#derived.values()) {
      reducer.index.update(force);
    }
  }
};
var AdapterFilters = class {
  #filtersData;
  #indexUpdate;
  #mapUnsubscribe = /* @__PURE__ */ new Map();
  constructor(indexUpdate, filtersAdapter) {
    this.#indexUpdate = indexUpdate;
    this.#filtersData = filtersAdapter;
    Object.freeze(this);
  }
  get length() {
    return this.#filtersData.filters.length;
  }
  *[Symbol.iterator]() {
    if (this.#filtersData.filters.length === 0) {
      return;
    }
    for (const entry of this.#filtersData.filters) {
      yield { ...entry };
    }
  }
  add(...filters2) {
    let subscribeCount = 0;
    for (const filter of filters2) {
      const filterType = typeof filter;
      if (filterType !== "function" && (filterType !== "object" || filter === null)) {
        throw new TypeError(`AdapterFilters error: 'filter' is not a function or object.`);
      }
      let data;
      let subscribeFn;
      if (filterType === "function") {
        data = {
          id: void 0,
          filter,
          weight: 1
        };
        subscribeFn = filter.subscribe;
      } else if (filterType === "object") {
        if ("filter" in filter) {
          if (typeof filter.filter !== "function") {
            throw new TypeError(`AdapterFilters error: 'filter' attribute is not a function.`);
          }
          if (filter.weight !== void 0 && (typeof filter.weight !== "number" || filter.weight < 0 || filter.weight > 1)) {
            throw new TypeError(`AdapterFilters error: 'weight' attribute is not a number between '0 - 1' inclusive.`);
          }
          data = {
            id: filter.id !== void 0 ? filter.id : void 0,
            filter: filter.filter,
            weight: filter.weight || 1
          };
          subscribeFn = filter.filter.subscribe ?? filter.subscribe;
        } else {
          throw new TypeError(`AdapterFilters error: 'filter' attribute is not a function.`);
        }
      } else {
        throw new TypeError(`AdapterFilters error: 'filter' is not defined.`);
      }
      const index = this.#filtersData.filters.findIndex((value) => {
        return data.weight < value.weight;
      });
      if (index >= 0) {
        this.#filtersData.filters.splice(index, 0, data);
      } else {
        this.#filtersData.filters.push(data);
      }
      if (typeof subscribeFn === "function") {
        const unsubscribe = subscribeFn(this.#indexUpdate);
        if (typeof unsubscribe !== "function") {
          throw new TypeError("AdapterFilters error: Filter has subscribe function, but no unsubscribe function is returned.");
        }
        if (this.#mapUnsubscribe.has(data.filter)) {
          throw new Error("AdapterFilters error: Filter added already has an unsubscribe function registered.");
        }
        this.#mapUnsubscribe.set(data.filter, unsubscribe);
        subscribeCount++;
      }
    }
    if (subscribeCount < filters2.length) {
      this.#indexUpdate(true);
    }
  }
  clear() {
    this.#filtersData.filters.length = 0;
    for (const unsubscribe of this.#mapUnsubscribe.values()) {
      unsubscribe();
    }
    this.#mapUnsubscribe.clear();
    this.#indexUpdate();
  }
  remove(...filters2) {
    const length = this.#filtersData.filters.length;
    if (length === 0) {
      return;
    }
    for (const data of filters2) {
      const actualFilter = typeof data === "function" ? data : data !== null && typeof data === "object" ? data.filter : void 0;
      if (!actualFilter) {
        continue;
      }
      for (let cntr = this.#filtersData.filters.length; --cntr >= 0; ) {
        if (this.#filtersData.filters[cntr].filter === actualFilter) {
          this.#filtersData.filters.splice(cntr, 1);
          let unsubscribe;
          if (typeof (unsubscribe = this.#mapUnsubscribe.get(actualFilter)) === "function") {
            unsubscribe();
            this.#mapUnsubscribe.delete(actualFilter);
          }
        }
      }
    }
    if (length !== this.#filtersData.filters.length) {
      this.#indexUpdate(true);
    }
  }
  removeBy(callback) {
    const length = this.#filtersData.filters.length;
    if (length === 0) {
      return;
    }
    if (typeof callback !== "function") {
      throw new TypeError(`AdapterFilters error: 'callback' is not a function.`);
    }
    this.#filtersData.filters = this.#filtersData.filters.filter((data) => {
      const remove = callback.call(callback, { ...data });
      if (remove) {
        let unsubscribe;
        if (typeof (unsubscribe = this.#mapUnsubscribe.get(data.filter)) === "function") {
          unsubscribe();
          this.#mapUnsubscribe.delete(data.filter);
        }
      }
      return !remove;
    });
    if (length !== this.#filtersData.filters.length) {
      this.#indexUpdate(true);
    }
  }
  removeById(...ids) {
    const length = this.#filtersData.filters.length;
    if (length === 0) {
      return;
    }
    this.#filtersData.filters = this.#filtersData.filters.filter((data) => {
      let remove = 0;
      for (const id of ids) {
        remove |= data.id === id ? 1 : 0;
      }
      if (!!remove) {
        let unsubscribe;
        if (typeof (unsubscribe = this.#mapUnsubscribe.get(data.filter)) === "function") {
          unsubscribe();
          this.#mapUnsubscribe.delete(data.filter);
        }
      }
      return !remove;
    });
    if (length !== this.#filtersData.filters.length) {
      this.#indexUpdate(true);
    }
  }
};
var AdapterIndexer = class {
  derivedAdapter;
  filtersData;
  hostData;
  hostUpdate;
  indexData;
  sortData;
  sortFn;
  destroyed = false;
  /**
   * @param hostData - Hosted data structure.
   *
   * @param hostUpdate - Host update function invoked on index updates.
   *
   * @param [parentIndexer] - Any associated parent index API.
   *
   * @returns Indexer adapter instance.
   */
  constructor(hostData, hostUpdate, parentIndexer) {
    this.hostData = hostData;
    this.hostUpdate = hostUpdate;
    this.indexData = { index: null, hash: null, reversed: false, parent: parentIndexer };
  }
  /**
   * @returns Returns whether the index is active.
   */
  get active() {
    return this.filtersData.filters.length > 0 || this.sortData.compareFn !== null || this.indexData.parent?.active === true;
  }
  /**
   * @returns Returns length of reduced index.
   */
  get length() {
    return this.indexData.index ? this.indexData.index.length : 0;
  }
  // -------------------------------------------------------------------------------------------------------------------
  /**
   * Calculates a new hash value for the new index array if any. If the new index array is null then the hash value
   * is set to null. Set calculated new hash value to the index adapter hash value.
   *
   * After hash generation compare old and new hash values and perform an update if they are different. If they are
   * equal check for array equality between the old and new index array and perform an update if they are not equal.
   *
   * @param oldIndex - Old index array.
   *
   * @param oldHash - Old index hash value.
   *
   * @param [force=false] - When true forces an update to subscribers.
   */
  calcHashUpdate(oldIndex, oldHash, force = false) {
    const actualForce = typeof force === "boolean" ? force : (
      /* c8 ignore next */
      false
    );
    let newHash = null;
    const newIndex = this.indexData.index;
    if (newIndex) {
      for (let cntr = newIndex.length; --cntr >= 0; ) {
        newHash ^= DynReducerUtils.hashUnknown(newIndex[cntr]) + 2654435769 + (newHash << 6) + (newHash >> 2);
      }
    }
    this.indexData.hash = newHash;
    if (actualForce || (oldHash === newHash ? !DynReducerUtils.arrayEquals(oldIndex, newIndex) : true)) {
      this.hostUpdate();
    }
  }
  /**
   * Destroys all resources.
   */
  destroy() {
    if (this.destroyed) {
      return;
    }
    this.hostData = null;
    this.indexData.index = null;
    this.indexData.hash = null;
    this.indexData.reversed = false;
    this.indexData.parent = null;
    this.destroyed = true;
  }
  /**
   * Store associated filter and sort data that are constructed after the indexer.
   *
   * @param filtersData - Associated AdapterFilters instance.
   *
   * @param sortData - Associated AdapterSort instance.
   *
   * @param derivedAdapter - Associated AdapterDerived instance.
   */
  initAdapters(filtersData, sortData, derivedAdapter) {
    this.filtersData = filtersData;
    this.sortData = sortData;
    this.derivedAdapter = derivedAdapter;
    this.sortFn = this.createSortFn();
  }
};
var AdapterSort = class {
  #sortData;
  #indexUpdate;
  #unsubscribe;
  constructor(indexUpdate, sortData) {
    this.#indexUpdate = indexUpdate;
    this.#sortData = sortData;
    Object.freeze(this);
  }
  clear() {
    const oldCompareFn = this.#sortData.compareFn;
    this.#sortData.compareFn = null;
    if (typeof this.#unsubscribe === "function") {
      this.#unsubscribe();
      this.#unsubscribe = void 0;
    }
    if (typeof oldCompareFn === "function") {
      this.#indexUpdate(true);
    }
  }
  set(sort) {
    if (typeof this.#unsubscribe === "function") {
      this.#unsubscribe();
      this.#unsubscribe = void 0;
    }
    let compareFn;
    let subscribeFn;
    switch (typeof sort) {
      case "function":
        compareFn = sort;
        subscribeFn = sort.subscribe;
        break;
      case "object":
        if (sort === null) {
          break;
        }
        if (typeof sort.compare !== "function") {
          throw new TypeError(`AdapterSort error: 'compare' attribute is not a function.`);
        }
        compareFn = sort.compare;
        subscribeFn = sort.compare.subscribe ?? sort.subscribe;
        break;
    }
    if (typeof compareFn === "function") {
      this.#sortData.compareFn = compareFn;
    } else {
      const oldCompareFn = this.#sortData.compareFn;
      this.#sortData.compareFn = null;
      if (typeof oldCompareFn === "function") {
        this.#indexUpdate();
      }
      return;
    }
    if (typeof subscribeFn === "function") {
      this.#unsubscribe = subscribeFn(this.#indexUpdate);
      if (typeof this.#unsubscribe !== "function") {
        throw new Error(`AdapterSort error: sort has 'subscribe' function, but no 'unsubscribe' function is returned.`);
      }
    } else {
      this.#indexUpdate(true);
    }
  }
};
var IndexerAPI = class {
  #indexData;
  /**
   * Provides a getter to determine if the index is active.
   */
  active;
  /**
   * Provides length of reduced / indexed elements.
   */
  length;
  /**
   * Manually invoke an update of the index.
   *
   * @param force - Force update to any subscribers.
   */
  update;
  constructor(adapterIndexer) {
    this.#indexData = adapterIndexer.indexData;
    this.update = adapterIndexer.update.bind(adapterIndexer);
    Object.defineProperties(this, {
      active: { get: () => adapterIndexer.active },
      length: { get: () => adapterIndexer.length }
    });
    Object.freeze(this);
  }
  get hash() {
    return this.#indexData.hash;
  }
  *[Symbol.iterator]() {
    const indexData = this.#indexData;
    if (!indexData.index) {
      return;
    }
    const reversed = indexData.reversed;
    const length = indexData.index.length;
    if (reversed) {
      for (let cntr = length; --cntr >= 0; ) {
        yield indexData.index[cntr];
      }
    } else {
      for (let cntr = 0; cntr < length; cntr++) {
        yield indexData.index[cntr];
      }
    }
  }
};
var MapIndexer = class extends AdapterIndexer {
  /**
   * @inheritDoc
   */
  createSortFn() {
    return (a, b) => {
      const data = this.hostData?.[0];
      const dataA = data?.get(a);
      const dataB = data?.get(b);
      return dataA && dataB ? this.sortData.compareFn(dataA, dataB) : 0;
    };
  }
  /**
   * Provides the custom filter / reduce step that is ~25-40% faster than implementing with `Array.reduce`.
   *
   * Note: Other loop unrolling techniques like Duff's Device gave a slight faster lower bound on large data sets,
   * but the maintenance factor is not worth the extra complication.
   *
   * @returns New filtered index array.
   */
  reduceImpl() {
    const data = [];
    const map = this.hostData?.[0];
    if (!map) {
      return data;
    }
    const filters2 = this.filtersData.filters;
    let include = true;
    const parentIndex = this.indexData.parent;
    if (DynReducerUtils.isIterable(parentIndex) && parentIndex.active) {
      for (const key of parentIndex) {
        const value = map.get(key);
        include = true;
        if (value === void 0) {
          continue;
        }
        for (let filCntr = 0, filLength = filters2.length; filCntr < filLength; filCntr++) {
          if (!filters2[filCntr].filter(value)) {
            include = false;
            break;
          }
        }
        if (include) {
          data.push(key);
        }
      }
    } else {
      for (const key of map.keys()) {
        include = true;
        const value = map.get(key);
        if (value === void 0) {
          continue;
        }
        for (let filCntr = 0, filLength = filters2.length; filCntr < filLength; filCntr++) {
          if (!filters2[filCntr].filter(value)) {
            include = false;
            break;
          }
        }
        if (include) {
          data.push(key);
        }
      }
    }
    return data;
  }
  /**
   * Update the reducer indexes. If there are changes subscribers are notified. If data order is changed externally
   * pass in true to force an update to subscribers.
   *
   * @param [force=false] - When true forces an update to subscribers.
   */
  update(force = false) {
    if (this.destroyed) {
      return;
    }
    const oldIndex = this.indexData.index;
    const oldHash = this.indexData.hash;
    const map = this.hostData?.[0];
    const parentIndex = this.indexData.parent;
    if (this.filtersData.filters.length === 0 && !this.sortData.compareFn || this.indexData.index && map?.size !== this.indexData.index.length) {
      this.indexData.index = null;
    }
    if (this.filtersData.filters.length > 0) {
      this.indexData.index = this.reduceImpl();
    }
    if (!this.indexData.index && parentIndex?.active) {
      this.indexData.index = [...parentIndex];
    }
    if (this.sortData.compareFn && map instanceof Map) {
      if (!this.indexData.index) {
        this.indexData.index = [...map.keys()];
      }
      this.indexData.index.sort(this.sortFn);
    }
    this.calcHashUpdate(oldIndex, oldHash, force);
    this.derivedAdapter?.update(force);
  }
};
var DerivedMapAPI = class {
  clear;
  create;
  delete;
  destroy;
  get;
  constructor(adapterDerived) {
    this.clear = adapterDerived.clear.bind(adapterDerived);
    this.create = adapterDerived.create.bind(adapterDerived);
    this.delete = adapterDerived.delete.bind(adapterDerived);
    this.destroy = adapterDerived.destroy.bind(adapterDerived);
    this.get = adapterDerived.get.bind(adapterDerived);
    Object.freeze(this);
  }
};
var DynMapReducerDerived = class _DynMapReducerDerived {
  #map;
  #derived;
  #derivedPublicAPI;
  #filters;
  #filtersData = { filters: [] };
  #index;
  #indexPublicAPI;
  #sort;
  #sortData = { compareFn: null };
  #subscribers = [];
  #destroyed = false;
  /**
   * @param map - Data host Map.
   *
   * @param parentIndex - Parent indexer.
   *
   * @param options - Any filters and sort functions to apply.
   *
   * @typeParam K `unknown` - Key type.
   *
   * @typeParam T `unknown` - Type of data.
   *
   * @private
   */
  constructor(map, parentIndex, options) {
    this.#map = map;
    this.#index = new MapIndexer(this.#map, this.#updateSubscribers.bind(this), parentIndex);
    this.#indexPublicAPI = new IndexerAPI(this.#index);
    this.#filters = new AdapterFilters(this.#indexPublicAPI.update, this.#filtersData);
    this.#sort = new AdapterSort(this.#indexPublicAPI.update, this.#sortData);
    this.#derived = new AdapterDerived(this.#map, this.#indexPublicAPI, _DynMapReducerDerived);
    this.#derivedPublicAPI = new DerivedMapAPI(this.#derived);
    this.#index.initAdapters(this.#filtersData, this.#sortData, this.#derived);
    const { filters: filters2, sort } = options;
    if (filters2 !== void 0) {
      if (!DynReducerUtils.isIterable(filters2)) {
        throw new TypeError(`DerivedMapReducer error (DataDerivedOptions): 'filters' attribute is not iterable.`);
      }
      this.filters.add(...filters2);
    }
    if (sort !== void 0) {
      if (typeof sort !== "function" && (typeof sort !== "object" || sort === null)) {
        throw new TypeError(`DerivedMapReducer error (DataDerivedOptions): 'sort' attribute is not a function or object.`);
      }
      this.sort.set(sort);
    }
  }
  /**
   * @returns Derived public API.
   */
  get derived() {
    return this.#derivedPublicAPI;
  }
  /**
   * @returns The filters adapter.
   */
  get filters() {
    return this.#filters;
  }
  /**
   * @returns Returns the Indexer public API; is also iterable.
   */
  get index() {
    return this.#indexPublicAPI;
  }
  /**
   * @returns Returns whether this derived reducer is destroyed.
   */
  get destroyed() {
    return this.#destroyed;
  }
  /**
   * @returns Returns the main data items or indexed items length.
   */
  get length() {
    const map = this.#map?.[0];
    return this.#index.active ? this.index.length : map ? map.size : 0;
  }
  /**
   * @returns Returns current reversed state.
   */
  get reversed() {
    return this.#index.indexData.reversed;
  }
  /**
   * @returns Returns the sort adapter.
   */
  get sort() {
    return this.#sort;
  }
  /**
   * Sets reversed state and notifies subscribers.
   *
   * @param reversed - New reversed state.
   */
  set reversed(reversed) {
    if (typeof reversed !== "boolean") {
      throw new TypeError(`DerivedMapReducer.reversed error: 'reversed' is not a boolean.`);
    }
    this.#index.indexData.reversed = reversed;
    this.index.update(true);
  }
  /**
   * Removes all derived reducers, subscriptions, and cleans up all resources.
   */
  destroy() {
    this.#destroyed = true;
    this.#map = [null];
    this.#index.update(true);
    this.#subscribers.length = 0;
    this.#derived.destroy();
    this.#index.destroy();
    this.#filters.clear();
    this.#sort.clear();
  }
  /**
   * Provides a callback for custom derived reducers to initialize any data / custom configuration. This allows
   * child classes to avoid implementing the constructor.
   *
   * @param [optionsRest] - Any additional custom options passed beyond {@link DynDataOptions}.
   *
   * @protected
   */
  initialize(optionsRest) {
  }
  /**
   * Provides an iterator for data stored in DynMapReducerDerived.
   *
   * @returns Iterator for data stored in DynMapReducerDerived.
   */
  *[Symbol.iterator]() {
    const map = this.#map?.[0] ?? null;
    if (this.#destroyed || map === null || map?.size === 0) {
      return;
    }
    if (this.#index.active) {
      for (const key of this.index) {
        yield map.get(key);
      }
    } else {
      if (this.reversed) {
        const values = [...map.values()];
        for (let cntr = values.length; --cntr >= 0; ) {
          yield values[cntr];
        }
      } else {
        for (const value of map.values()) {
          yield value;
        }
      }
    }
  }
  // -------------------------------------------------------------------------------------------------------------------
  /**
   * Subscribe to this DerivedMapReducer.
   *
   * @param handler - Callback function that is invoked on update / changes. Receives `this` reference.
   *
   * @returns Unsubscribe function.
   */
  subscribe(handler) {
    const currentIdx = this.#subscribers.findIndex((entry) => entry === handler);
    if (currentIdx === -1) {
      this.#subscribers.push(handler);
      handler(this);
    }
    return () => {
      const existingIdx = this.#subscribers.findIndex((entry) => entry === handler);
      if (existingIdx !== -1) {
        this.#subscribers.splice(existingIdx, 1);
      }
    };
  }
  /**
   * Updates subscribers on changes.
   */
  #updateSubscribers() {
    for (let cntr = 0; cntr < this.#subscribers.length; cntr++) {
      this.#subscribers[cntr](this);
    }
  }
};
var DynMapReducer = class {
  #map = [null];
  #derived;
  #derivedPublicAPI;
  #filters;
  #filtersData = { filters: [] };
  #index;
  #indexPublicAPI;
  #sort;
  #sortData = { compareFn: null };
  #subscribers = [];
  #destroyed = false;
  /**
   * Initializes DynMapReducer. Any iterable is supported for initial data. Take note that if `data` is an array it
   * will be used as the host array and not copied. All non-array iterables otherwise create a new array / copy.
   *
   * @param [data] - Data iterable to store if array or copy otherwise.
   *
   * @typeParam K `unknown` - Key type.
   *
   * @typeParam T `unknown` - Type of data.
   */
  constructor(data) {
    let dataMap;
    let filters2;
    let sort;
    if (data === null) {
      throw new TypeError(`DynMapReducer error: 'data' is not an object or Map.`);
    }
    if (data !== void 0 && typeof data !== "object" && !(data instanceof Map)) {
      throw new TypeError(`DynMapReducer error: 'data' is not an object or Map.`);
    }
    if (data !== void 0 && data instanceof Map) {
      dataMap = data;
    } else if (data !== void 0 && ("data" in data || "filters" in data || "sort" in data)) {
      if (data.data !== void 0 && !(data.data instanceof Map)) {
        throw new TypeError(`DynMapReducer error (DataDynMap): 'data' attribute is not a Map.`);
      }
      if (data.data instanceof Map) {
        dataMap = data.data;
      }
      if (data.filters !== void 0) {
        if (DynReducerUtils.isIterable(data.filters)) {
          filters2 = data.filters;
        } else {
          throw new TypeError(`DynMapReducer error (DataDynMap): 'filters' attribute is not iterable.`);
        }
      }
      if (data.sort !== void 0) {
        if (typeof data.sort === "function") {
          sort = data.sort;
        } else if (typeof data.sort === "object" && data.sort !== null) {
          sort = data.sort;
        } else {
          throw new TypeError(`DynMapReducer error (DataDynMap): 'sort' attribute is not a function or object.`);
        }
      }
    }
    if (dataMap) {
      this.#map[0] = dataMap;
    }
    this.#index = new MapIndexer(this.#map, this.#updateSubscribers.bind(this));
    this.#indexPublicAPI = new IndexerAPI(this.#index);
    this.#filters = new AdapterFilters(this.#indexPublicAPI.update, this.#filtersData);
    this.#sort = new AdapterSort(this.#indexPublicAPI.update, this.#sortData);
    this.#derived = new AdapterDerived(this.#map, this.#indexPublicAPI, DynMapReducerDerived);
    this.#derivedPublicAPI = new DerivedMapAPI(this.#derived);
    this.#index.initAdapters(this.#filtersData, this.#sortData, this.#derived);
    if (filters2) {
      this.filters.add(...filters2);
    }
    if (sort) {
      this.sort.set(sort);
    }
  }
  /**
   * Returns the internal data of this instance. Be careful!
   *
   * Note: When a map is set as data then that map is used as the internal data. If any changes are performed to the
   * data externally do invoke `update` via {@link DynMapReducer.index} with `true` to recalculate the  index and
   * notify all subscribers.
   *
   * @returns The internal data.
   */
  get data() {
    return this.#map[0];
  }
  /**
   * @returns Derived public API.
   */
  get derived() {
    return this.#derivedPublicAPI;
  }
  /**
   * @returns The filters adapter.
   */
  get filters() {
    return this.#filters;
  }
  /**
   * @returns Returns the Indexer public API; is also iterable.
   */
  get index() {
    return this.#indexPublicAPI;
  }
  /**
   * @returns Returns whether this instance is destroyed.
   */
  get destroyed() {
    return this.#destroyed;
  }
  /**
   * @returns Returns the main data items or indexed items length.
   */
  get length() {
    const map = this.#map[0];
    return this.#index.active ? this.#indexPublicAPI.length : map ? map.size : 0;
  }
  /**
   * @returns Returns current reversed state.
   */
  get reversed() {
    return this.#index.indexData.reversed;
  }
  /**
   * @returns The sort adapter.
   */
  get sort() {
    return this.#sort;
  }
  /**
   * Sets reversed state and notifies subscribers.
   *
   * @param reversed - New reversed state.
   */
  set reversed(reversed) {
    if (typeof reversed !== "boolean") {
      throw new TypeError(`DynMapReducer.reversed error: 'reversed' is not a boolean.`);
    }
    this.#index.indexData.reversed = reversed;
    this.index.update(true);
  }
  /**
   * Removes all derived reducers, subscriptions, and cleans up all resources.
   */
  destroy() {
    if (this.#destroyed) {
      return;
    }
    this.#destroyed = true;
    this.#derived.destroy();
    this.#map = [null];
    this.index.update(true);
    this.#subscribers.length = 0;
    this.#filters.clear();
    this.#sort.clear();
    this.#index.destroy();
  }
  /**
   * Provides a callback for custom reducers to initialize any data / custom configuration. Depending on the consumer
   * of `dynamic-reducer` this may be utilized allowing child classes to avoid implementing the constructor.
   *
   * @param [optionsRest] - Any additional custom options passed beyond {@link DynReducer.Options.Common}.
   *
   * @protected
   */
  /* c8 ignore next */
  initialize(optionsRest) {
  }
  /**
   * Removes internal data and pushes new data. This does not destroy any initial array set to internal data unless
   * `replace` is set to true.
   *
   * @param data - New data to set to internal data.
   *
   * @param [replace=false] - New data to set to internal data.
   */
  setData(data, replace = false) {
    if (data !== null && !(data instanceof Map)) {
      throw new TypeError(`DynMapReducer.setData error: 'data' is not iterable.`);
    }
    if (typeof replace !== "boolean") {
      throw new TypeError(`DynMapReducer.setData error: 'replace' is not a boolean.`);
    }
    const map = this.#map[0];
    if (!(map instanceof Map) || replace) {
      this.#map[0] = data instanceof Map ? data : null;
    } else if (data instanceof Map && map instanceof Map) {
      const removeKeySet = new Set(map.keys());
      for (const key of data.keys()) {
        map.set(key, data.get(key));
        if (removeKeySet.has(key)) {
          removeKeySet.delete(key);
        }
      }
      for (const key of removeKeySet) {
        map.delete(key);
      }
    } else if (data === null) {
      this.#map[0] = null;
    }
    this.#index.indexData.index = null;
    this.index.update(true);
  }
  /**
   * Add a subscriber to this DynMapReducer instance.
   *
   * @param handler - Callback function that is invoked on update / changes. Receives `this` reference.
   *
   * @returns Unsubscribe function.
   */
  subscribe(handler) {
    const currentIdx = this.#subscribers.findIndex((entry) => entry === handler);
    if (currentIdx === -1) {
      this.#subscribers.push(handler);
      handler(this);
    }
    return () => {
      const existingIdx = this.#subscribers.findIndex((entry) => entry === handler);
      if (existingIdx !== -1) {
        this.#subscribers.splice(existingIdx, 1);
      }
    };
  }
  /**
   * Updates subscribers on changes.
   */
  #updateSubscribers() {
    for (let cntr = 0; cntr < this.#subscribers.length; cntr++) {
      this.#subscribers[cntr](this);
    }
  }
  /**
   * Provides an iterator for data stored in DynMapReducer.
   *
   * @returns Iterator for data stored in DynMapReducer.
   */
  *[Symbol.iterator]() {
    const map = this.#map[0];
    if (this.#destroyed || map === null || map?.size === 0) {
      return;
    }
    if (this.#index.active) {
      for (const key of this.index) {
        yield map.get(key);
      }
    } else {
      if (this.reversed) {
        const values = [...map.values()];
        for (let cntr = values.length; --cntr >= 0; ) {
          yield values[cntr];
        }
      } else {
        for (const value of map.values()) {
          yield value;
        }
      }
    }
  }
};
function regexObjectQuery(accessors, { accessWarn = false, caseSensitive = false, store } = {}) {
  let keyword = "";
  let regex;
  if (store !== void 0 && !isMinimalWritableStore(store)) {
    throw new TypeError(`regexObjectQuery error: 'store' is not a minimal writable store.`);
  }
  const storeKeyword = store ? store : writable(keyword);
  if (store) {
    const current = get_store_value(store);
    if (typeof current === "string") {
      keyword = Strings.normalize(current);
      regex = new RegExp(Strings.escape(keyword), caseSensitive ? "" : "i");
    } else {
      store.set(keyword);
    }
  }
  const filterQuery = Object.assign(
    /**
     * If there is no filter keyword / regex then do not filter otherwise filter based on the regex
     * created from the search input element.
     *
     * @param data - Data object to test against regex.
     *
     * @returns Store filter state.
     */
    (data) => {
      if (keyword === "" || !regex) {
        return true;
      }
      if (isIterable(accessors)) {
        for (const accessor of accessors) {
          const value = safeAccess(data, accessor);
          if (typeof value !== "string") {
            if (accessWarn) {
              console.warn(`regexObjectQuery warning: could not access string data from '${accessor}'.`);
            }
            continue;
          }
          if (regex.test(Strings.normalize(value))) {
            return true;
          }
        }
        return false;
      } else {
        const value = safeAccess(data, accessors);
        if (typeof value !== "string") {
          if (accessWarn) {
            console.warn(`regexObjectQuery warning: could not access string data from '${accessors}'.`);
          }
          return false;
        }
        return regex.test(Strings.normalize(value));
      }
    },
    {
      /**
       * Create a custom store that changes when the search keyword changes.
       *
       * @param handler - A callback function that accepts strings.
       *
       * @returns Store unsubscribe function.
       */
      subscribe(handler) {
        return storeKeyword.subscribe(handler);
      },
      /**
       * @param value - A new value for the keyword / regex test.
       */
      set(value) {
        if (typeof value === "string") {
          keyword = Strings.normalize(value);
          regex = new RegExp(Strings.escape(keyword), caseSensitive ? "" : "i");
          storeKeyword.set(keyword);
        }
      }
    }
  );
  filterQuery.subscribe = (handler) => {
    return storeKeyword.subscribe(handler);
  };
  filterQuery.set = (value) => {
    if (typeof value === "string") {
      keyword = Strings.normalize(value);
      regex = new RegExp(Strings.escape(keyword), caseSensitive ? "" : "i");
      storeKeyword.set(keyword);
    }
  };
  return filterQuery;
}
var filters = Object.freeze({
  __proto__: null,
  regexObjectQuery
});

// node_modules/@typhonjs-fvtt/runtime/_dist/svelte/store/fvtt/document/index.js
function isDocument(doc) {
  return doc !== void 0 && doc !== null && doc instanceof foundry.abstract.Document;
}
function isDocumentCollection(collection) {
  return collection !== void 0 && collection !== null && collection instanceof foundry.documents.abstract.DocumentCollection;
}
var EmbeddedStoreManager = class _EmbeddedStoreManager {
  /**
   * RegExp for detecting CRUD updates for the associated document.
   */
  static #updateActionRegex = /(?<action>create|delete|update)(?<sep>\.?)(?<name>\w+)/;
  /**
   */
  #name = /* @__PURE__ */ new Map();
  /**
   * Source document.
   */
  #document;
  /**
   * Reverse lookup for older Foundry versions.
   */
  #collectionToDocName = /* @__PURE__ */ new Map();
  /**
   * Valid embedded collection actions.
   */
  #embeddedNames = /* @__PURE__ */ new Set();
  /**
   * @param document - The associated document holder.
   */
  constructor(document) {
    this.#document = document;
    this.handleDocChange();
    Object.seal(this);
  }
  /**
   * Create a reactive embedded collection store. When no options are provided the name of the embedded collection
   * matches the document name.
   *
   * @param FoundryDoc - A Foundry document.
   *
   * @param [options] - Dynamic reducer create options.
   *
   * @typeParam D `Foundry Document`.
   *
   * @typeParam O `CreateOptions` - Embedded API create options.
   */
  create(FoundryDoc, options) {
    const docName = FoundryDoc?.documentName;
    if (typeof docName !== "string") {
      throw new TypeError(`EmbeddedStoreManager.create error: 'FoundryDoc' does not have a valid 'documentName' property.`);
    }
    const doc = this.#document[0];
    let collection = null;
    if (doc) {
      try {
        collection = doc.getEmbeddedCollection(docName);
      } catch (err) {
        console.warn(`EmbeddedStoreManager.create error: No valid embedded collection for: ${docName}`);
      }
    }
    let embeddedData = this.#name.get(docName);
    if (!embeddedData) {
      embeddedData = {
        collection,
        stores: /* @__PURE__ */ new Map()
      };
      this.#name.set(docName, embeddedData);
    }
    let name;
    let rest = {};
    let ctor;
    if (typeof options === "string") {
      name = options;
      ctor = DynMapReducer;
    } else if (typeof options === "function" && hasPrototype(options, DynMapReducer)) {
      ctor = options;
    } else if (isObject(options)) {
      ({ name, ctor = DynMapReducer, ...rest } = options);
    } else {
      name = docName;
      ctor = DynMapReducer;
    }
    if (!hasPrototype(ctor, DynMapReducer)) {
      throw new TypeError(`EmbeddedStoreManager.create error: 'ctor' is not a 'DynMapReducer'.`);
    }
    name = name ?? ctor?.name;
    if (typeof name !== "string") {
      throw new TypeError(`EmbeddedStoreManager.create error: 'name' is not a string.`);
    }
    if (embeddedData.stores.has(name)) {
      return embeddedData.stores.get(name);
    } else {
      const reducerOptions = collection ? { data: collection, ...rest } : { ...rest };
      const instance = new ctor(reducerOptions);
      embeddedData.stores.set(name, instance);
      if (typeof instance?.initialize === "function") {
        instance.initialize(rest);
      }
      return instance;
    }
  }
  /**
   * Destroys one or more embedded collection reducers. When no `reducerName` is provided all reactive embedded
   * collections are destroyed for the given document type.
   *
   * @param FoundryDoc - A Foundry document class constructor.
   *
   * @param [reducerName] - Optional name of a specific reducer to destroy.
   *
   * @typeParam D `Foundry Document`.
   */
  destroy(FoundryDoc, reducerName) {
    let count = 0;
    if (FoundryDoc === void 0) {
      for (const embeddedData of this.#name.values()) {
        embeddedData.collection = null;
        for (const store of embeddedData.stores.values()) {
          store.destroy();
          count++;
        }
      }
      this.#name.clear();
    } else {
      const docName = FoundryDoc?.documentName;
      if (typeof docName !== "string") {
        throw new TypeError(`EmbeddedStoreManager.delete error: 'FoundryDoc' does not have a valid 'documentName' property.`);
      }
      if (reducerName === void 0) {
        const embeddedData = this.#name.get(docName);
        if (embeddedData) {
          embeddedData.collection = null;
          for (const store of embeddedData.stores.values()) {
            store.destroy();
            count++;
          }
        }
        this.#name.delete(docName);
      } else if (reducerName === "string") {
        const embeddedData = this.#name.get(docName);
        if (embeddedData) {
          const store = embeddedData.stores.get(reducerName);
          if (store) {
            store.destroy();
            count++;
          }
        }
      }
    }
    return count > 0;
  }
  /**
   * Returns a specific existing embedded collection store. When no `reducerName` is provided the document name
   * is used instead.
   *
   * @param FoundryDoc - A Foundry document class constructor.
   *
   * @param [reducerName] - Optional name of a specific reducer to get.
   *
   * @typeParam D `Foundry Document`.
   *
   * @returns The associated reactive embedded collection / reducer.
   */
  get(FoundryDoc, reducerName) {
    const docName = FoundryDoc?.documentName;
    if (typeof docName !== "string") {
      throw new TypeError(`EmbeddedStoreManager.get error: 'FoundryDoc' does not have a valid 'documentName' property.`);
    }
    const embeddedData = this.#name.get(docName);
    if (embeddedData) {
      return embeddedData.stores.get(reducerName ?? docName);
    }
  }
  /**
   * Updates all existing embedded collection stores with the associated embedded collection
   */
  handleDocChange() {
    const doc = this.#document[0];
    if (isDocument(doc)) {
      const existingEmbeddedNames = new Set(this.#name.keys());
      const embeddedNames = Object.entries(doc.constructor?.metadata?.embedded ?? []);
      this.#collectionToDocName.clear();
      this.#embeddedNames.clear();
      for (const [docName, collectionName] of embeddedNames) {
        existingEmbeddedNames.delete(docName);
        this.#embeddedNames.add(`create${docName}`);
        this.#embeddedNames.add(`delete${docName}`);
        this.#embeddedNames.add(`update${docName}`);
        this.#embeddedNames.add(`create.${collectionName}`);
        this.#embeddedNames.add(`delete.${collectionName}`);
        this.#embeddedNames.add(`update.${collectionName}`);
        this.#embeddedNames.add(`create${collectionName}`);
        this.#embeddedNames.add(`delete${collectionName}`);
        this.#embeddedNames.add(`update${collectionName}`);
        this.#collectionToDocName.set(docName, docName);
        this.#collectionToDocName.set(collectionName, docName);
        let collection = null;
        try {
          collection = doc.getEmbeddedCollection(docName);
        } catch (err) {
          console.warn(`EmbeddedStoreManager.handleDocUpdate error: No valid embedded collection for: ${docName}`);
        }
        const embeddedData = this.#name.get(docName);
        if (embeddedData) {
          embeddedData.collection = collection;
          for (const store of embeddedData.stores.values()) {
            store.setData(embeddedData.collection, true);
          }
        }
      }
      for (const embeddedName of existingEmbeddedNames) {
        const embeddedData = this.#name.get(embeddedName);
        if (embeddedData) {
          embeddedData.collection = null;
          for (const store of embeddedData.stores.values()) {
            store.setData(null, true);
          }
        }
      }
    } else {
      this.#collectionToDocName.clear();
      this.#embeddedNames.clear();
      for (const embeddedData of this.#name.values()) {
        embeddedData.collection = null;
        for (const store of embeddedData.stores.values()) {
          store.setData(null, true);
        }
      }
    }
  }
  /**
   * Handles updates to embedded stores parsing the document update action for valid embedded store types.
   *
   * On create, delete, update parse the type being modified then force index updates for the embedded type.
   *
   * @param action - Update action from document.
   */
  handleUpdate(action) {
    if (!this.#embeddedNames.has(action)) {
      return;
    }
    const match = _EmbeddedStoreManager.#updateActionRegex.exec(action);
    if (match && match.groups) {
      const docOrCollectionName = match.groups.name;
      const embeddedName = this.#collectionToDocName.get(docOrCollectionName);
      const embeddedData = this.#name.get(embeddedName);
      if (embeddedData) {
        for (const store of embeddedData.stores.values()) {
          store.index.update(true);
        }
      }
    }
  }
};
var TJSDocument = class _TJSDocument {
  /**
   * Fake Application API that ClientDocumentMixin uses for document model callbacks.
   */
  #callbackAPI;
  /**
   * Wrapped document.
   */
  #document = [void 0];
  /**
   *
   */
  #embeddedStoreManager;
  /**
   *
   */
  #embeddedAPI;
  /**
   * UUIDv4 assigned to this instance.
   */
  #uuidv4;
  /**
   *
   */
  #options = {};
  /**
   * All current subscribers.
   */
  #subscribers = [];
  /**
   * Latest update options processed.
   */
  #updateOptions;
  /**
   * @param [document] - Document to wrap or TJSDocumentOptions.
   *
   * @param [options] - TJSDocument options.
   */
  constructor(document, options = {}) {
    this.#uuidv4 = `tjs-document-${Hashing.uuidv4()}`;
    this.#callbackAPI = {
      close: this.#deleted.bind(this),
      render: this.#updateSubscribers.bind(this)
    };
    if (isPlainObject(document)) {
      this.setOptions(document);
    } else {
      this.setOptions(options);
      this.set(document);
    }
  }
  /**
   * @returns {import('./types').EmbeddedAPI} Embedded store manager.
   */
  get embedded() {
    if (!this.#embeddedAPI) {
      this.#embeddedStoreManager = new EmbeddedStoreManager(this.#document);
      this.#embeddedAPI = {
        create: (doc, options) => this.#embeddedStoreManager.create(doc, options),
        destroy: (doc, storeName) => this.#embeddedStoreManager.destroy(doc, storeName),
        get: (doc, storeName) => this.#embeddedStoreManager.get(doc, storeName)
      };
    }
    return this.#embeddedAPI;
  }
  /**
   * @returns Returns the options passed on last update.
   */
  get updateOptions() {
    return this.#updateOptions ?? { action: "unknown", data: [] };
  }
  /**
   * @returns Returns the UUIDv4 assigned to this store.
   */
  get uuidv4() {
    return this.#uuidv4;
  }
  /**
   * Register the callback API with the underlying Foundry document.
   */
  #callbackRegister() {
    const doc = this.#document[0];
    if (isDocument(doc) && isObject(doc?.apps) && !doc.apps[this.#uuidv4]) {
      doc.apps[this.#uuidv4] = this.#callbackAPI;
    }
  }
  /**
   * Unregister the callback API with the underlying Foundry document.
   */
  #callbackUnregister() {
    const doc = this.#document[0];
    if (isDocument(doc)) {
      delete doc?.apps?.[this.#uuidv4];
    }
  }
  /**
   * Handles cleanup when the document is deleted. Invoking any optional delete function set in the constructor.
   *
   * @returns Promise when completed.
   */
  async #deleted() {
    const doc = this.#document[0];
    if (isDocument(doc) && !doc?.collection?.has(doc.id)) {
      this.#setDocument(void 0);
      if (typeof this.#options.preDelete === "function") {
        await this.#options.preDelete(doc);
      }
      this.#updateSubscribers(false, { action: "delete" });
      if (typeof this.#options.delete === "function") {
        await this.#options.delete(doc);
      }
      await tick();
      this.#updateOptions = void 0;
    }
  }
  /**
   * Completely removes all internal subscribers, any optional delete callback, and unregisters from the
   * ClientDocumentMixin `apps` tracking object.
   */
  destroy() {
    if (this.#embeddedStoreManager) {
      this.#embeddedStoreManager.destroy();
      this.#embeddedStoreManager = void 0;
      this.#embeddedAPI = void 0;
    }
    this.#setDocument(void 0);
    this.#options.delete = void 0;
    this.#options.preDelete = void 0;
    this.#subscribers.length = 0;
  }
  /**
   * @returns Current document
   */
  get() {
    return this.#document[0];
  }
  /**
   * Attempts to create a Foundry UUID from standard drop data. This may not work for all systems.
   *
   * @param data - Drop transfer data.
   *
   * @param [opts] - Optional parameters.
   *
   * @param [opts.compendium=true] - Accept compendium documents.
   *
   * @param [opts.world=true] - Accept world documents.
   *
   * @param [opts.types] - Require the `data.type` to match entry in `types`.
   *
   * @returns Foundry UUID for drop data.
   */
  static getUUIDFromDataTransfer(data, { compendium = true, world = true, types = void 0 } = {}) {
    if (!isObject(data)) {
      return void 0;
    }
    if (Array.isArray(types) && !types.includes(data.type)) {
      return void 0;
    }
    let uuid = void 0;
    if (typeof data.uuid === "string") {
      const isCompendium = data.uuid.startsWith("Compendium");
      if (isCompendium && compendium) {
        uuid = data.uuid;
      } else if (world) {
        uuid = data.uuid;
      }
    }
    return uuid;
  }
  /**
   * Sets a new document target to be monitored. To unset use `undefined` or `null`.
   *
   * @param doc - New document to set.
   *
   * @param [options] - New document update options to set.
   */
  set(doc, options = {}) {
    if (doc !== void 0 && doc !== null && !isDocument(doc)) {
      throw new TypeError(`TJSDocument set error: 'document' is not a valid Document or undefined / null.`);
    }
    if (!isObject(options)) {
      throw new TypeError(`TJSDocument set error: 'options' is not an object.`);
    }
    if (this.#setDocument(doc)) {
      if (isDocument(doc) && this.#subscribers.length) {
        this.#callbackRegister();
      }
      this.#updateSubscribers(false, {
        ...options,
        action: `tjs-set-${doc === void 0 || doc === null ? "undefined" : "new"}`
      });
    }
  }
  /**
   * Internally sets the new document being tracked.
   *
   * @param doc -
   *
   * @returns {boolean} Whether the document changed.
   */
  #setDocument(doc) {
    const changed = doc !== this.#document[0];
    if (changed) {
      this.#callbackUnregister();
    }
    this.#document[0] = doc === void 0 || doc === null ? void 0 : doc;
    if (changed && this.#embeddedStoreManager) {
      this.#embeddedStoreManager.handleDocChange();
    }
    return changed;
  }
  /**
   * Potentially sets new document from data transfer object.
   *
   * @param data - Document transfer data.
   *
   * @param [options] - Optional parameters for {@link TJSDocument.getUUIDFromDataTransfer}.
   *
   * @returns Returns true if new document set from data transfer blob.
   */
  async setFromDataTransfer(data, options) {
    return this.setFromUUID(_TJSDocument.getUUIDFromDataTransfer(data, options));
  }
  /**
   * Sets the document by Foundry UUID performing a lookup and setting the document if found.
   *
   * @param {string}   uuid - A Foundry UUID to lookup.
   *
   * @param {import('./types').TJSDocumentUpdateOptions}   [options] - New document update options to set.
   *
   * @returns {Promise<boolean>} True if successfully set document from UUID.
   */
  async setFromUUID(uuid, options) {
    if (typeof uuid !== "string" || uuid.length === 0) {
      return false;
    }
    try {
      const doc = await globalThis.fromUuid(uuid);
      if (doc) {
        this.set(doc, options);
        return true;
      }
    } catch (err) {
    }
    return false;
  }
  /**
   * Sets options for this document wrapper / store.
   *
   * @param options - Options for TJSDocument.
   */
  setOptions(options) {
    if (!isObject(options)) {
      throw new TypeError(`TJSDocument error: 'options' is not a plain object.`);
    }
    if (options.delete !== void 0 && options.delete !== null && typeof options.delete !== "function") {
      throw new TypeError(`TJSDocument error: 'delete' attribute in options is not a function or null.`);
    }
    if (options.preDelete !== void 0 && options.preDelete !== null && typeof options.preDelete !== "function") {
      throw new TypeError(`TJSDocument error: 'preDelete' attribute in options is not a function or null.`);
    }
    if (options.delete !== void 0) {
      this.#options.delete = options.delete ?? void 0;
    }
    if (options.preDelete !== void 0) {
      this.#options.preDelete = options.preDelete ?? void 0;
    }
  }
  /**
   * @param handler - Callback function that is invoked on update / changes.
   *
   * @returns Unsubscribe function.
   */
  subscribe(handler) {
    let addedSubscriber = false;
    const currentIdx = this.#subscribers.findIndex((entry) => entry === handler);
    if (currentIdx === -1) {
      this.#subscribers.push(handler);
      addedSubscriber = true;
    }
    if (addedSubscriber) {
      if (this.#subscribers.length === 1) {
        this.#callbackRegister();
      }
      const updateOptions = { action: "tjs-subscribe", data: [] };
      handler(this.#document[0], updateOptions);
    }
    return () => {
      const index = this.#subscribers.findIndex((sub) => sub === handler);
      if (index !== -1) {
        this.#subscribers.splice(index, 1);
      }
      if (this.#subscribers.length === 0) {
        this.#callbackUnregister();
      }
    };
  }
  /**
   * @param [force] - unused - signature from Foundry render function.
   *
   * @param [options] - Options from render call; will have document update context.
   */
  #updateSubscribers(force, options = {}) {
    const optionsRemap = {
      action: options.action ?? options.renderContext ?? "tjs-unknown",
      data: options.data ?? options.renderData ?? []
    };
    if (!Array.isArray(optionsRemap.data)) {
      optionsRemap.data = [optionsRemap.data];
    }
    this.#updateOptions = optionsRemap;
    const subscribers = this.#subscribers;
    const doc = this.#document[0];
    for (let cntr = 0; cntr < subscribers.length; cntr++) {
      subscribers[cntr](doc, optionsRemap);
    }
    if (this.#embeddedStoreManager) {
      this.#embeddedStoreManager.handleUpdate(optionsRemap.action);
    }
  }
};
var TJSDocumentCollection = class {
  /**
   * Fake Application API that DocumentCollection uses for document model callbacks.
   */
  #callbackAPI;
  /**
   * Collection being wrapped.
   */
  #collection = void 0;
  /**
   * UUIDv4 to associate as key with wrapped collection.
   */
  #uuidv4;
  /**
   * Configuration options.
   */
  #options = {};
  /**
   * All current subscribers.
   */
  #subscribers = [];
  /**
   * Latest update options processed.
   */
  #updateOptions;
  /**
   * @param [collection] - Collection to wrap or TJSDocumentCollectionOptions.
   *
   * @param [options] - TJSDocumentCollection options.
   */
  constructor(collection, options = {}) {
    this.#uuidv4 = `tjs-collection-${Hashing.uuidv4()}`;
    this.#callbackAPI = {
      uuid: this.#uuidv4,
      close: this.#deleted.bind(this),
      render: this.#updateSubscribers.bind(this)
    };
    if (isPlainObject(collection)) {
      this.setOptions(collection);
    } else {
      this.setOptions(options);
      this.set(collection);
    }
  }
  /**
   * Returns the options passed on last update.
   *
   * @returns Last update options.
   */
  get updateOptions() {
    return this.#updateOptions ?? { action: "unknown", data: [] };
  }
  /**
   * Returns the UUIDv4 assigned to this store.
   *
   * @returns UUIDv4
   */
  get uuid() {
    return this.#uuidv4;
  }
  /**
   * Register the callback API with the underlying Foundry collection.
   */
  #callbackRegister() {
    const collection = this.#collection;
    if (isDocumentCollection(collection) && Array.isArray(collection?.apps)) {
      const index = collection.apps.findIndex((sub) => sub === this.#callbackAPI);
      if (index === -1) {
        collection.apps.push(this.#callbackAPI);
      }
    }
  }
  /**
   * Unregister the callback API with the underlying Foundry collection.
   */
  #callbackUnregister() {
    const collection = this.#collection;
    if (isDocumentCollection(this.#collection) && Array.isArray(collection?.apps)) {
      const index = collection.apps.findIndex((sub) => sub === this.#callbackAPI);
      if (index >= 0) {
        collection.apps.splice(index, 1);
      }
    }
  }
  /**
   * Handles cleanup when the collection is deleted. Invoking any optional delete function set in the constructor.
   *
   * @returns {Promise<void>}
   */
  async #deleted() {
    const collection = this.#collection;
    this.#callbackUnregister();
    this.#collection = void 0;
    if (collection) {
      if (typeof this.#options.preDelete === "function") {
        await this.#options.preDelete(collection);
      }
      this.#updateSubscribers(false, { action: "delete" });
      if (typeof this.#options.delete === "function") {
        await this.#options.delete(collection);
      }
    }
    await tick();
    this.#updateOptions = void 0;
  }
  /**
   * Completely removes all internal subscribers, any optional delete callback, and unregisters from the
   * DocumentCollection `apps` tracking array.
   */
  destroy() {
    this.#callbackUnregister();
    this.#collection = void 0;
    this.#options.delete = void 0;
    this.#options.preDelete = void 0;
    this.#subscribers.length = 0;
  }
  /**
   * @returns Current collection if any.
   */
  get() {
    return this.#collection;
  }
  /**
   * Sets a new document collection target to be monitored. To unset use `undefined` or `null`.
   *
   * @param collection - New collection to set.
   *
   * @param [options] - New collection update options to set.
   */
  set(collection, options = {}) {
    if (collection !== void 0 && collection !== null && !isDocumentCollection(collection)) {
      throw new TypeError(`TJSDocumentCollection set error: 'collection' is not a valid DocumentCollection or undefined.`);
    }
    if (!isObject(options)) {
      throw new TypeError(`TJSDocument set error: 'options' is not an object.`);
    }
    const changed = this.#collection !== collection;
    if (changed) {
      this.#callbackUnregister();
    }
    this.#collection = collection === void 0 || collection === null ? void 0 : collection;
    if (changed) {
      if (isDocumentCollection(collection) && this.#subscribers.length) {
        this.#callbackRegister();
      }
      this.#updateSubscribers(false, {
        data: [],
        ...options,
        action: `tjs-set-${collection === void 0 || collection === null ? "undefined" : "new"}`
      });
    }
  }
  /**
   * Sets options for this collection wrapper / store.
   *
   * @param options - Options for TJSDocumentCollection.
   */
  setOptions(options) {
    if (!isObject(options)) {
      throw new TypeError(`TJSDocumentCollection error: 'options' is not an object.`);
    }
    if (options.delete !== void 0 && options.delete !== null && typeof options.delete !== "function") {
      throw new TypeError(`TJSDocumentCollection error: 'delete' attribute in options is not a function or null.`);
    }
    if (options.preDelete !== void 0 && options.preDelete !== null && typeof options.preDelete !== "function") {
      throw new TypeError(`TJSDocumentCollection error: 'preDelete' attribute in options is not a function or null.`);
    }
    if (options.delete !== void 0) {
      this.#options.delete = options.delete ?? void 0;
    }
    if (options.preDelete !== void 0) {
      this.#options.preDelete = options.delete ?? void 0;
    }
  }
  /**
   * @param handler - Callback function that is invoked on update / changes.
   *
   * @returns Unsubscribe function.
   */
  subscribe(handler) {
    let addedSubscriber = false;
    const currentIdx = this.#subscribers.findIndex((entry) => entry === handler);
    if (currentIdx === -1) {
      this.#subscribers.push(handler);
      addedSubscriber = true;
    }
    if (addedSubscriber) {
      if (this.#subscribers.length === 1) {
        this.#callbackRegister();
      }
      const collection = this.#collection;
      const updateOptions = { action: "tjs-subscribe", data: [] };
      handler(collection, updateOptions);
    }
    return () => {
      const index = this.#subscribers.findIndex((sub) => sub === handler);
      if (index !== -1) {
        this.#subscribers.splice(index, 1);
      }
      if (this.#subscribers.length === 0) {
        this.#callbackUnregister();
      }
    };
  }
  /**
   * @param force - unused - signature from Foundry render function.
   *
   * @param [options] - Options from render call; will have collection update context.
   */
  #updateSubscribers(force, options = {}) {
    const optionsRemap = {
      action: options.action ?? options.renderContext ?? "tjs-unknown",
      data: options.data ?? options.renderData ?? []
    };
    if (!Array.isArray(optionsRemap.data)) {
      optionsRemap.data = [optionsRemap.data];
    }
    this.#updateOptions = optionsRemap;
    const subscribers = this.#subscribers;
    const collection = this.#collection;
    for (let cntr = 0; cntr < subscribers.length; cntr++) {
      subscribers[cntr](collection, optionsRemap);
    }
  }
};
export {
  TJSDocument,
  TJSDocumentCollection
};
//# sourceMappingURL=@typhonjs-fvtt_runtime_svelte_store_fvtt_document.js.map
