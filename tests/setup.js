// tests/setup.js
// Runs before any test modules are evaluated, ensuring localStorage is available
// even during module-level singleton construction (e.g. draft-store.js).

if (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function') {
  let store = {};
  Object.defineProperty(global, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key) => Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
      setItem: (key, val) => { store[key] = String(val); },
      removeItem: (key) => { delete store[key]; },
      clear: () => { store = {}; },
      get length() { return Object.keys(store).length; },
      key: (i) => Object.keys(store)[i] ?? null
    }
  });
}
