/* Persistence shim.
   Inside Claude artifacts, window.storage already exists and is used as-is.
   Standing alone (Vercel/Netlify/local), this backs it with localStorage so
   saved leagues survive a refresh. Same API either way. */

export function installStorage() {
  if (typeof window === "undefined") return;

  // Ask supporting browsers to treat Huddle's on-device data as persistent.
  // This is best-effort; local saves still work if the browser declines.
  try { window.navigator?.storage?.persist?.().catch?.(() => {}); } catch { }

  if (window.storage) return;

  const KEY = (k, shared) => `huddle::${shared ? "shared" : "me"}::${k}`;

  window.storage = {
    async get(key, shared = false) {
      const raw = localStorage.getItem(KEY(key, shared));
      if (raw === null) throw new Error(`Key not found: ${key}`);
      return { key, value: raw, shared };
    },
    async set(key, value, shared = false) {
      localStorage.setItem(KEY(key, shared), String(value));
      return { key, value: String(value), shared };
    },
    async delete(key, shared = false) {
      localStorage.removeItem(KEY(key, shared));
      return { key, deleted: true, shared };
    },
    async list(prefix = "", shared = false) {
      const head = KEY(prefix, shared);
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(head)) keys.push(k.split("::").slice(2).join("::"));
      }
      return { keys, prefix, shared };
    },
  };
}
