// Node 26 exposes an experimental global `localStorage` that is non-functional
// without --localstorage-file, and it shadows jsdom's working implementation.
// Replace it with a minimal Map-backed polyfill for deterministic tests.
const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
}
