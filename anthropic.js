/* Routes the app's Claude calls (screenshot reading, second opinions, co-GM chat).

   Inside Claude artifacts, calls to api.anthropic.com are authenticated for you —
   this file does nothing and everything just works.

   Standing alone, set VITE_ANTHROPIC_API_KEY in .env.local and this attaches the
   auth headers. Note that shipping a key to the browser exposes it to anyone who
   opens devtools; for anything public, point PROXY_URL at your own server instead. */

const KEY = import.meta.env?.VITE_ANTHROPIC_API_KEY;
const PROXY_URL = import.meta.env?.VITE_ANTHROPIC_PROXY;

export function installAnthropic() {
  if (typeof window === "undefined") return;
  if (!KEY && !PROXY_URL) return; // artifact mode — leave fetch alone

  const orig = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const url = typeof input === "string" ? input : input?.url || "";
    if (!url.includes("api.anthropic.com")) return orig(input, init);

    if (PROXY_URL) return orig(PROXY_URL, init);

    return orig(url, {
      ...init,
      headers: {
        ...(init.headers || {}),
        "x-api-key": KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
    });
  };
}
