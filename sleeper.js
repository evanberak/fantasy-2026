/* Live NFL injury data from Sleeper.
 *
 * Sleeper publishes a public, unauthenticated player endpoint. There is no
 * dedicated injuries route: injury fields ride along on the player records.
 *
 *   GET https://api.sleeper.app/v1/players/nfl
 *
 * The response is large (several megabytes) and Sleeper asks that it be
 * fetched at most once a day, so this module reduces it to the handful of
 * fields Huddle needs, caches the result on device, and refuses to refetch
 * inside the cache window unless forced.
 *
 * Everything here fails soft. If the network is down, the shape changes, or
 * the request is blocked, the app carries on with no live data rather than
 * breaking. Nothing in Huddle requires this to work.
 */

export const SLEEPER_URL = "https://api.sleeper.app/v1/players/nfl";
export const CACHE_KEY = "huddle:injuries";
export const CACHE_HOURS = 12;

/* Sleeper's injury_status values, mapped to a short label, how much of a
   player's remaining value survives, and whether he can be started. */
export const INJURY_LEVELS = {
  questionable: { code: "Q", label: "Questionable", factor: 0.92, startable: true },
  doubtful: { code: "D", label: "Doubtful", factor: 0.45, startable: true },
  out: { code: "OUT", label: "Out", factor: 0, startable: false },
  ir: { code: "IR", label: "Injured reserve", factor: 0, startable: false },
  pup: { code: "PUP", label: "Physically unable to perform", factor: 0, startable: false },
  sus: { code: "SUSP", label: "Suspended", factor: 0, startable: false },
  cov: { code: "OUT", label: "Reserve list", factor: 0, startable: false },
  dnr: { code: "DNR", label: "Did not report", factor: 0, startable: false },
  na: { code: "NA", label: "Not active", factor: 0.3, startable: false },
};

// Sleeper writes these inconsistently across records, so normalize hard.
export function normalizeStatus(raw) {
  if (!raw) return null;
  const key = String(raw).toLowerCase().replace(/[^a-z]/g, "");
  if (INJURY_LEVELS[key]) return key;
  if (key.startsWith("quest")) return "questionable";
  if (key.startsWith("doubt")) return "doubtful";
  if (key.includes("injuredreserve") || key === "ir") return "ir";
  if (key.includes("physicallyunable") || key === "pup") return "pup";
  if (key.startsWith("susp")) return "sus";
  if (key === "out" || key === "inactive") return "out";
  return null;
}

/* Reduce a raw Sleeper payload to the fields we use.
   Accepts either the documented object-keyed map or a plain array. */
export function parseSleeperPlayers(raw) {
  if (!raw || typeof raw !== "object") return [];
  const records = Array.isArray(raw) ? raw : Object.values(raw);
  const out = [];
  for (const r of records) {
    if (!r || typeof r !== "object") continue;
    const position = r.position || (Array.isArray(r.fantasy_positions) ? r.fantasy_positions[0] : null);
    if (!position || !["QB", "RB", "WR", "TE", "K", "DEF"].includes(position)) continue;

    const name = r.full_name
      || [r.first_name, r.last_name].filter(Boolean).join(" ")
      || r.last_name || "";
    if (!name) continue;

    const status = normalizeStatus(r.injury_status)
      // some records carry the state on `status` instead
      || normalizeStatus(["Injured Reserve", "PUP", "Suspended", "Inactive"].includes(r.status) ? r.status : null);
    if (!status) continue;

    out.push({
      name,
      team: r.team || null,
      pos: position === "DEF" ? "DST" : position,
      status,
      bodyPart: r.injury_body_part || null,
      note: r.injury_notes || null,
      since: r.injury_start_date || null,
    });
  }
  return out;
}

export async function fetchSleeperInjuries({ signal } = {}) {
  const res = await fetch(SLEEPER_URL, { signal, headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Sleeper responded ${res.status}`);
  return parseSleeperPlayers(await res.json());
}

export function isStale(fetchedAt, hours = CACHE_HOURS) {
  if (!fetchedAt) return true;
  return Date.now() - fetchedAt > hours * 3600 * 1000;
}

/* Read the cached payload. Returns null when nothing is stored. */
export async function readCache() {
  try {
    const row = await window.storage.get(CACHE_KEY);
    const parsed = JSON.parse(row.value);
    return parsed && Array.isArray(parsed.list) ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeCache(list) {
  try {
    await window.storage.set(CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), list }));
    return true;
  } catch {
    return false;
  }
}

/* Load injuries, preferring the cache and only going to the network when the
   cache is stale or a refresh is forced. Never throws. */
export async function loadInjuries({ force = false } = {}) {
  const cached = await readCache();
  if (cached && !force && !isStale(cached.fetchedAt)) {
    return { ...cached, source: "cache" };
  }
  try {
    const list = await fetchSleeperInjuries();
    await writeCache(list);
    return { fetchedAt: Date.now(), list, source: "network" };
  } catch (err) {
    // fall back to whatever we already had, however old
    if (cached) return { ...cached, source: "stale", error: String(err.message || err) };
    return { fetchedAt: null, list: [], source: "unavailable", error: String(err.message || err) };
  }
}
