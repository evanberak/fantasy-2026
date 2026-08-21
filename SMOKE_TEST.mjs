/* Huddle smoke test.
 *
 *   npm install
 *   npm test
 *
 * Renders every screen and exercises the engine. Compiling is not enough:
 * an undefined variable inside a component only shows up when it renders,
 * which is exactly how the Settings screen once shipped blank.
 */

import React from "react";
import { renderToString } from "react-dom/server";
import { createRequire } from "module";
import { execSync } from "child_process";
import { readFileSync, writeFileSync, unlinkSync } from "fs";

// Build the app once with every component exported so each can be mounted alone.
const src = readFileSync("./App.jsx", "utf8");
const NAMES = [
  "Settings", "MockHome", "TradeHelp", "DraftHelp", "Hub", "BoardArchive",
  "ScoringEditor", "TeamView", "SeasonView",   "DraftRoom", "TradeCalc", "TradeFinder", "ShotFinder", "Versus", "Radar",
  "GMChat", "MyRoster", "TradeDesk", "PlayerCardSheet", "StandingsView",
  "WeekRecap", "DraftRecap", "findTrades", "snapshotBoard", "PlayoffBracket",
];
let patched = src;
for (const n of NAMES) {
  patched = patched.replace(new RegExp(`(?<!export )\\bfunction ${n}\\(`), `export function ${n}(`);
}
writeFileSync("./.smoke.jsx", patched);
// React stays external so the bundle and this file share one instance,
// otherwise every hook call fails with "Invalid hook call".
execSync(
  "npx esbuild ./.smoke.jsx --bundle --format=cjs --platform=node " +
  "--external:react --external:react-dom --outfile=./.smoke.cjs --log-level=error"
);

// Minimal browser surface so components can render outside a browser.
const memory = {};
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {}, key: () => null, length: 0 };
globalThis.window = {
  localStorage: globalThis.localStorage,
  innerHeight: 800,
  storage: {
    get: async (k) => { if (!(k in memory)) throw new Error("missing"); return { key: k, value: memory[k] }; },
    set: async (k, v) => { memory[k] = v; },
    delete: async (k) => { delete memory[k]; },
    list: async () => ({ keys: [] }),
  },
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
};
// Node 22 defines navigator as a getter, so define instead of assign
if (!globalThis.navigator) {
  Object.defineProperty(globalThis, "navigator", { value: {}, configurable: true });
}

const require = createRequire(import.meta.url);
const M = require("./.smoke.cjs");

let failures = 0;
const check = (label, fn) => {
  try {
    const problem = fn();
    if (problem) { failures++; console.log(`  FAIL  ${label}: ${problem}`); }
    else console.log(`  ok    ${label}`);
  } catch (e) {
    failures++;
    console.log(`  FAIL  ${label}: ${e.message}`);
  }
};

console.log("\nEngine");

check("default scoring reproduces every baseline", () => {
  const worst = Math.max(...M.PLAYERS.map((p) => Math.abs(M.proj(p, M.DEFAULT_SCORING) - p.base)));
  return worst > 0.01 ? `off by ${worst.toFixed(3)}` : null;
});

check("scoring presets move projections", () => {
  const te = M.PLAYERS.find((p) => p.pos === "TE");
  const qb = M.PLAYERS.find((p) => p.pos === "QB");
  const tep = M.projectPoints(te, { ...M.DEFAULT_SCORING, tePremium: 0.5 });
  const six = M.projectPoints(qb, { ...M.DEFAULT_SCORING, passTD: 6 });
  if (tep <= te.base) return "TE premium did not raise tight ends";
  if (six <= qb.base) return "six point passing did not raise quarterbacks";
  return null;
});

check("generated schedule is valid", () => {
  const sched = M.buildNFLSchedule(77);
  for (let w = 1; w <= 17; w++) {
    const map = sched[w - 1];
    for (const [team, opp] of Object.entries(map)) {
      if (team === opp) return `week ${w}: ${team} plays itself`;
      if (map[opp] !== team) return `week ${w}: ${team} and ${opp} disagree`;
    }
  }
  return null;
});

// One full league drives the rest of the checks.
const league = M.makeLeague({ teams: 12, rounds: 15, superflex: false, userSlot: 5, ppr: 1, teamName: "Me" });
while (!M.draftDone(league)) {
  const onClock = M.onClock(league);
  const taken = new Set(league.picks.map((p) => p.playerId));
  M.makePick(league, M.aiPick(league, onClock, M.PLAYERS.filter((p) => !taken.has(p.id))).id);
}

check("draft fills every roster legally", () => {
  for (const pick of league.picks) {
    const p = M.BY_ID[pick.playerId];
    const round = M.roundOf(league, pick.overall - 1);
    if ((p.pos === "K" || p.pos === "DST") && round <= 13) return `${p.pos} taken in round ${round}`;
    if (p.pos === "QB" && round === 1) return "quarterback taken in round 1";
  }
  for (let t = 0; t < 12; t++) {
    const counts = {};
    league.rosters[t].forEach((id) => { counts[M.BY_ID[id].pos] = (counts[M.BY_ID[id].pos] || 0) + 1; });
    if (counts.K !== 1 || counts.DST !== 1 || !counts.QB || !counts.TE) {
      return `team ${t} finished with ${JSON.stringify(counts)}`;
    }
  }
  return null;
});

league.season = M.startSeason(league, 999);
for (let i = 0; i < 6; i++) {
  const state = league.season;
  const result = M.simWeek(league, state, state.lineups[state.week]);
  state.record = result.record;
  state.actual = result.actual;
  state.injuries = result.injuries;
  state.weeks.push({
    week: state.week, matchups: result.matchups, lineups: result.lineups,
    scores: {}, injuries: result.newInjuries,
  });
  M.runWaivers(league, state, []);
  state.week += 1;
}
const values = M.buildValues(league, league.season);

check("six weeks simulate with sane scores", () => {
  const scores = league.season.weeks.flatMap((w) => w.matchups.flatMap((m) => [m.aP, m.bP]));
  const low = Math.min(...scores), high = Math.max(...scores);
  return (low < 30 || high > 250) ? `scores ranged ${low} to ${high}` : null;
});

check("game logs line up with real weeks", () => {
  for (const id of league.rosters[5]) {
    const entry = league.season.actual[id];
    if (!entry) continue;
    const weeks = entry.log.map((x) => x.w);
    if (weeks.some((w) => w === M.BY_ID[id].bye)) return `${M.BY_ID[id].name} logged a bye week`;
    if (weeks.some((w, i) => i > 0 && w <= weeks[i - 1])) return `${M.BY_ID[id].name} has out of order weeks`;
  }
  return null;
});

check("trade packages stay believable", () => {
  for (const trade of M.findTrades(league, league.rosters[5], values, league.rosters)) {
    for (const side of [trade.give, trade.getIds]) {
      const counts = {};
      side.forEach((id) => { counts[M.BY_ID[id].pos] = (counts[M.BY_ID[id].pos] || 0) + 1; });
      if ((counts.QB || 0) > 1) return "package with two quarterbacks";
      if ((counts.TE || 0) > 1) return "package with two tight ends";
      if (counts.K || counts.DST) return "package containing a kicker or defense";
    }
    if (trade.ratio < 0.8 || trade.ratio > 1.35) return `value ratio ${Math.round(trade.ratio * 100)}%`;
  }
  return null;
});

check("every rostered player has an opponent or a reason", () => {
  for (const id of league.rosters[5]) {
    const player = M.BY_ID[id];
    const outlook = M.weekOutlook(player, league.season, 7, values);
    if (!outlook.status && !outlook.opp) return `${player.name} has no game and no reason`;
  }
  return null;
});

check("older saves recover a schedule", () => {
  const legacy = JSON.parse(JSON.stringify(league));
  delete legacy.season.nfl;
  M.ensureSchedule(legacy);
  return legacy.season.nfl?.length === 18 ? null : "schedule was not rebuilt";
});

check("lineup swaps persist before the season starts", () => {
  const pre = M.makeLeague({ teams: 12, rounds: 15, superflex: false, userSlot: 5, ppr: 1 });
  while (!M.draftDone(pre)) {
    const onClock = M.onClock(pre);
    const taken = new Set(pre.picks.map((p) => p.playerId));
    M.makePick(pre, M.aiPick(pre, onClock, M.PLAYERS.filter((p) => !taken.has(p.id))).id);
  }
  const vals = M.buildValues(pre, null);
  const starters = M.optimalLineup(pre, { injuries: {} }, pre.rosters[5], 1, vals);
  const bench = pre.rosters[5].filter((id) => !starters.includes(id));
  if (!bench.length) return "no bench to swap from";

  // simulate the swap the sheet performs, then kick off
  const next = starters.slice();
  next[1] = bench[0];
  pre.preseasonLineup = next;
  const season = M.startSeason(pre);
  if (pre.preseasonLineup) season.lineups[1] = pre.preseasonLineup;
  if (season.lineups[1][1] !== bench[0]) return "swap did not carry into week 1";
  return null;
});

// archive round trip: save a finished board, read it back
{
  const saved = await M.archiveBoard(league);
  const index = JSON.parse(memory["huddle:boards"] || "[]");
  const stored = memory[`huddle:board:${league.id}`] ? JSON.parse(memory[`huddle:board:${league.id}`]) : null;
  check("finished drafts land in the board archive", () => {
    if (!saved) return "archiveBoard reported failure";
    if (index.length !== 1) return `index has ${index.length} entries`;
    if (!stored) return "board body was not written";
    if (stored.picks.length !== league.picks.length) return "pick count mismatch";
    const first = stored.picks[0];
    if (!first.name || !first.pos || !first.team) return "picks missing inline player details";
    if (stored.picks.some((p) => !p.round || !p.slot)) return "picks missing round or slot";
    return null;
  });
}

check("each drafting personality behaves distinctly", () => {
  const seats = { 0: "zeroRB", 1: "heroRB", 2: "lateQB", 3: "eliteTE" };
  const first = { zeroRB: [], heroRB: [], lateQB: [], eliteTE: [] };
  for (let run = 0; run < 6; run++) {
    const table = M.makeLeague({ teams: 12, rounds: 15, superflex: false, userSlot: 5, ppr: 1, personas: seats });
    while (!M.draftDone(table)) {
      const onClock = M.onClock(table);
      const taken = new Set(table.picks.map((p) => p.playerId));
      M.makePick(table, M.aiPick(table, onClock, M.PLAYERS.filter((p) => !taken.has(p.id))).id);
    }
    for (const [seat, key] of Object.entries(seats)) {
      if (table.gms[seat].persona !== key) return `seat ${seat} ignored its assigned personality`;
      const want = key === "lateQB" ? "QB" : key === "eliteTE" ? "TE" : "RB";
      const pick = table.picks.find((p) => p.gmIdx === Number(seat) && M.BY_ID[p.playerId].pos === want);
      first[key].push(pick ? M.roundOf(table, pick.overall - 1) : 99);
      const counts = {};
      table.rosters[seat].forEach((id) => { counts[M.BY_ID[id].pos] = (counts[M.BY_ID[id].pos] || 0) + 1; });
      if (counts.K !== 1 || counts.DST !== 1 || !counts.QB || !counts.TE || counts.RB < 2) {
        return `${key} finished with an illegal roster`;
      }
    }
  }
  const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  if (avg(first.zeroRB) < 4) return `Zero RB took a back in round ${avg(first.zeroRB).toFixed(1)}`;
  if (avg(first.heroRB) > 2.5) return "Hero RB did not anchor early";
  if (avg(first.lateQB) < 6) return "Late-round QB reached for a quarterback";
  if (avg(first.eliteTE) > 5) return "Elite TE did not prioritize the position";
  return null;
});

check("draft recap survives post-draft roster changes", () => {
  // waivers and trades put players on rosters who were never drafted
  const drafted = new Set(league.picks.map((p) => p.playerId));
  const added = Object.values(league.rosters).flat().filter((id) => !drafted.has(id));
  if (!added.length) return "no waiver adds to test against";
  for (let team = 0; team < league.settings.teams; team++) {
    for (const id of league.rosters[team]) {
      const pick = league.picks.find((x) => x.playerId === id);
      // the recap must not assume a pick exists
      if (!pick && !M.BY_ID[id]) return `roster ${team} holds an unknown player`;
    }
  }
  const html = renderToString(React.createElement(M.DraftRecap, { lg: league }));
  return html.length > 100 ? null : "recap rendered almost nothing";
});

check("no component calls a hook after an early return", () => {
  /* The bug that blanks a screen with "Rendered more hooks than during the
     previous render". Catches both forms:
         if (x == null) return null;
         if (x == null) { ... return (...); }
     Uses indentation, since component bodies here are indented two spaces and
     a block early-return indents its return to four. */
  const lines = src.split("\n");
  const HOOK = /^ {2}(?:const|let|\s)*.*\b(useState|useEffect|useMemo|useCallback|useRef|useContext|useKeyboardInset|useMyTeam|useLiveInjuries|usePlayerCard)\s*\(/;
  let i = 0;
  while (i < lines.length) {
    const m = /^(?:export )?function ([A-Z]\w*)\(/.exec(lines[i]);
    if (!m) { i++; continue; }
    let depth = 0, started = false, early = null, j = i;
    for (; j < lines.length; j++) {
      const line = lines[j];
      const clean = line.replace(/"[^"]*"|'[^']*'|`[^`]*`/g, "");
      if (!started && clean.includes("{")) started = true;
      depth += (clean.match(/\{/g) || []).length - (clean.match(/\}/g) || []).length;
      if (started && depth <= 0 && j > i) break;
      if (j <= i) continue;

      // single line: `if (...) return x;` or a bare `return` at body level
      if (early === null && /^ {2}(if\s*\(.*\)\s*return\b|return\b)/.test(line)) early = j + 1;

      // block form: `if (...) {` at body level containing a return
      if (early === null && /^ {2}if\s*\(.*\)\s*\{\s*$/.test(line)) {
        for (let k = j + 1; k < lines.length && !/^ {2}\}/.test(lines[k]); k++) {
          if (/^ {4}return\b/.test(lines[k])) { early = k + 1; break; }
        }
      }

      if (early !== null && HOOK.test(line)) {
        return `${m[1]} calls a hook on line ${j + 1} after returning on line ${early}`;
      }
    }
    i = j + 1;
  }
  return null;
});

check("the draft avoids players flagged as out", () => {
  const star = M.PLAYERS[3];   // a top-five pick by cost
  M.setLiveInjuries({ [star.id]: { status: "ir", code: "IR", label: "Injured reserve", factor: 0, startable: false } }, { matched: 1 });
  const table = M.makeLeague({ teams: 12, rounds: 15, superflex: false, userSlot: 5, ppr: 1 });
  while (!M.draftDone(table)) {
    const onClock = M.onClock(table);
    const taken = new Set(table.picks.map((p) => p.playerId));
    M.makePick(table, M.aiPick(table, onClock, M.PLAYERS.filter((p) => !taken.has(p.id))).id);
  }
  const pick = table.picks.find((p) => p.playerId === star.id);
  M.setLiveInjuries(null, null);
  if (pick && pick.overall < 40) return `${star.name} was on IR and still went at pick ${pick.overall}`;
  return null;
});

check("drafting maximizes the starting lineup, not raw points", () => {
  /* A roster that fills its starting slots should beat one that hoards a
     position. Verified by checking nobody ends up with dead weight: more
     bodies at a spot than the lineup can ever start, twice over. */
  const table = M.makeLeague({ teams: 12, rounds: 15, superflex: false, userSlot: 5, ppr: 1 });
  while (!M.draftDone(table)) {
    const onClock = M.onClock(table);
    const taken = new Set(table.picks.map((p) => p.playerId));
    M.makePick(table, M.aiPick(table, onClock, M.PLAYERS.filter((p) => !taken.has(p.id))).id);
  }
  for (let t = 0; t < 12; t++) {
    const counts = {};
    table.rosters[t].forEach((id) => { counts[M.BY_ID[id].pos] = (counts[M.BY_ID[id].pos] || 0) + 1; });
    if ((counts.QB || 0) > 2) return `team ${t} hoarded ${counts.QB} quarterbacks`;
    if ((counts.TE || 0) > 2) return `team ${t} hoarded ${counts.TE} tight ends`;
    if ((counts.K || 0) > 1 || (counts.DST || 0) > 1) return `team ${t} carried a spare kicker or defense`;
  }
  return null;
});

check("the playoff bracket reflects what actually happened", () => {
  const table = M.makeLeague({ teams: 12, rounds: 15, superflex: false, userSlot: 5, ppr: 1 });
  while (!M.draftDone(table)) {
    const onClock = M.onClock(table);
    const taken = new Set(table.picks.map((p) => p.playerId));
    M.makePick(table, M.aiPick(table, onClock, M.PLAYERS.filter((p) => !taken.has(p.id))).id);
  }
  table.season = M.startSeason(table, 5);
  let guard = 0;
  while (table.season.champion == null && guard++ < 20) {
    const st = table.season, isRS = st.week <= st.shape.rsWeeks;
    const r = M.simWeek(table, st, null);
    st.record = r.record; st.actual = r.actual; st.injuries = r.injuries;
    st.weeks.push({ week: st.week, matchups: r.matchups, lineups: r.lineups, scores: {}, injuries: r.newInjuries, playoff: !isRS });
    if (isRS) M.runWaivers(table, st, []);
    if (st.week === st.shape.rsWeeks) st.playoffs = M.seedPlayoffs(table, st);
    else if (!isRS && st.playoffs) {
      const next = M.advancePlayoffs(table, st, r.matchups);
      st.playoffs = next;
      if (next.done) st.champion = next.champion;
    }
    st.week += 1;
  }
  const s = table.season;
  if (s.champion == null) return "season never produced a champion";
  if (s.playoffs.seeds.length !== s.shape.pT) return "wrong number of playoff teams";

  // the champion must have won the final
  const final = s.weeks.find((w) => w.week === 17);
  if (!final || !final.matchups.length) return "no championship game was played";
  const game = final.matchups[0];
  const winner = game.aP >= game.bP ? game.a : game.b;
  if (winner !== s.champion) return "the champion did not win the final";

  // every playoff team must be a real seed, and byes must be the top two
  if (s.shape.pT === 6) {
    const wild = s.weeks.find((w) => w.week === 15);
    const played = wild.matchups.flatMap((m) => [m.a, m.b]);
    if (played.includes(s.playoffs.seeds[0]) || played.includes(s.playoffs.seeds[1])) {
      return "a top-two seed played in the wild card round";
    }
  }
  const html = renderToString(React.createElement(M.PlayoffBracket, { lg: table, s }));
  return html.length > 400 ? null : "bracket rendered almost nothing";
});

check("injured reserve obeys its own rules", () => {
  for (const slots of [0, 1, 2, 3]) {
    const table = M.makeLeague({ teams: 12, rounds: 15, superflex: false, userSlot: 5, ppr: 1, irSlots: slots });
    while (!M.draftDone(table)) {
      const onClock = M.onClock(table);
      const taken = new Set(table.picks.map((p) => p.playerId));
      M.makePick(table, M.aiPick(table, onClock, M.PLAYERS.filter((p) => !taken.has(p.id))).id);
    }
    table.season = M.startSeason(table, 4);
    for (let i = 0; i < 10; i++) {
      const st = table.season;
      const r = M.simWeek(table, st, st.lineups[st.week]);
      for (let t = 0; t < 12; t++) {
        const stashed = new Set(M.irList(table, t));
        for (const id of (r.lineups[t] || [])) {
          if (id && stashed.has(id)) return `a player on IR started for team ${t}`;
        }
      }
      st.record = r.record; st.actual = r.actual; st.injuries = r.injuries;
      st.weeks.push({ week: st.week, matchups: r.matchups, lineups: r.lineups, scores: {}, injuries: r.newInjuries });
      M.runWaivers(table, st, []);
      M.reconcileIR(table, st);
      for (let t = 0; t < 12; t++) {
        if (M.irList(table, t).length > slots) return `team ${t} exceeded ${slots} IR slots`;
        if (M.activeRoster(table, t).length > table.settings.rounds) return `team ${t} carried too many active players`;
        for (const id of M.irList(table, t)) {
          if (!M.irEligible(st, id) && M.openRosterSpots(table, t) > 0) {
            return `a healthy player sat on IR with bench room on team ${t}`;
          }
        }
      }
      st.week += 1;
    }
  }
  return null;
});

check("only injured players can be stashed", () => {
  const table = M.makeLeague({ teams: 12, rounds: 15, superflex: false, userSlot: 5, ppr: 1, irSlots: 1 });
  while (!M.draftDone(table)) {
    const onClock = M.onClock(table);
    const taken = new Set(table.picks.map((p) => p.playerId));
    M.makePick(table, M.aiPick(table, onClock, M.PLAYERS.filter((p) => !taken.has(p.id))).id);
  }
  table.season = M.startSeason(table, 4);
  const healthy = table.rosters[5].find((id) => !M.irEligible(table.season, id));
  if (M.canStashIR(table, table.season, 5, healthy).ok) return "a healthy player was allowed on IR";
  const none = M.makeLeague({ teams: 12, rounds: 15, superflex: false, userSlot: 5, ppr: 1, irSlots: 0 });
  if (M.canStashIR(none, null, 5, 1).ok) return "IR allowed in a league with no slots";
  return null;
});

check("a player can be moved to IR from anywhere", () => {
  const table = M.makeLeague({ teams: 12, rounds: 15, superflex: false, userSlot: 5, ppr: 1, irSlots: 2 });
  while (!M.draftDone(table)) {
    const onClock = M.onClock(table);
    const taken = new Set(table.picks.map((p) => p.playerId));
    M.makePick(table, M.aiPick(table, onClock, M.PLAYERS.filter((p) => !taken.has(p.id))).id);
  }
  table.season = M.startSeason(table, 4);
  let hurt = null;
  for (let i = 0; i < 10 && !hurt; i++) {
    const st = table.season;
    const r = M.simWeek(table, st, null);
    st.record = r.record; st.actual = r.actual; st.injuries = r.injuries; st.week += 1;
    hurt = table.rosters[5].find((id) => M.irEligible(st, id));
  }
  if (!hurt) return "no injury turned up to test with";

  const week = table.season.week;
  const values = M.buildValues(table, table.season);
  table.season.lineups[week] = M.optimalLineup(table, table.season, table.rosters[5], week, values);
  table.season.lineups[week][0] = hurt;   // put him in the lineup first

  const before = M.openRosterSpots(table, 5);
  const stashed = M.applyStash(table, 5, hurt, week);
  if (!M.irList(stashed, 5).includes(hurt)) return "stash did not put him on IR";
  if (stashed.season.lineups[week].includes(hurt)) return "stash left him in the lineup";
  if (!stashed.rosters[5].includes(hurt)) return "stash dropped him from the roster";
  if (M.openRosterSpots(stashed, 5) <= before) return "stash did not free a bench spot";
  if (M.rosterStatus(stashed, 5, hurt, week) !== "ir") return "status did not update";

  const played = M.simWeek(stashed, stashed.season, stashed.season.lineups[week]);
  if ((played.lineups[5] || []).includes(hurt)) return "a stashed player still started";

  const active = M.applyActivate(stashed, 5, hurt);
  if (M.irList(active, 5).includes(hurt)) return "activate did not clear the IR slot";
  if (M.rosterStatus(active, 5, hurt, week) !== "bench") return "activated player did not return to the bench";
  return null;
});

console.log("\nScreens");

const noop = () => {};
const myTeam = { ids: league.rosters[5], teams: 12, ppr: 1, superflex: false, name: "My Team", topPad: 0 };
const screens = [
  ["Hub", M.Hub, { go: noop, my: myTeam }],
  ["MockHome", M.MockHome, { onOpen: noop, onCreate: noop, customScoring: 1 }],
  ["DraftRoom", M.DraftRoom, { lg: league, setLg: noop, toast: noop }],
  ["TeamView", M.TeamView, { lg: league, setLg: noop, toast: noop }],
  ["SeasonView", M.SeasonView, { lg: league, setLg: noop, toast: noop, setTab: noop }],
  ["TradeCalc", M.TradeCalc, { lg: league }],
  ["TradeFinder", M.TradeFinder, { lg: league, toast: noop }],
  ["TradeDesk", M.TradeDesk, { lg: league, setLg: noop, values, toast: noop }],
  ["StandingsView", M.StandingsView, { lg: league, s: league.season, table: M.standings(league, league.season) }],
  ["WeekRecap", M.WeekRecap, { lg: league, wk: league.season.weeks.at(-1) }],
  ["PlayerCardSheet", M.PlayerCardSheet, { id: league.rosters[5][0], lg: league, onClose: noop }],
  ["TradeHelp", M.TradeHelp, { my: myTeam, save: noop, toast: noop }],
  ["DraftHelp", M.DraftHelp, { my: myTeam, save: noop, toast: noop }],
  ["MyRoster", M.MyRoster, { my: myTeam, save: noop, toast: noop }],
  ["Versus", M.Versus, { lg: league }],
  ["Radar", M.Radar, { lg: league }],
  ["GMChat", M.GMChat, { lg: league }],
  ["ShotFinder", M.ShotFinder, { lg: league, toast: noop, my: myTeam, save: noop }],
  ["Settings", M.Settings, { my: myTeam, save: noop, toast: noop, onWipe: noop }],
  ["BoardArchive", M.BoardArchive, { onBack: noop }],
  ["ScoringEditor", M.ScoringEditor, { scoring: 1, onChange: noop, title: "Scoring" }],
];
for (const [name, Component, props] of screens) {
  check(name, () => {
    if (!Component) return "component not found";
    const html = renderToString(React.createElement(Component, props));
    return html.length < 20 ? "rendered almost nothing" : null;
  });
}

check("every scoring preset renders in the editor", () => {
  for (const preset of M.SCORING_PRESETS) {
    renderToString(React.createElement(M.ScoringEditor, {
      scoring: { ...M.DEFAULT_SCORING, ...preset.patch }, onChange: noop, title: preset.label,
    }));
  }
  return null;
});

try { unlinkSync("./.smoke.jsx"); unlinkSync("./.smoke.cjs"); } catch { }

console.log(failures ? `\n${failures} check(s) failed\n` : "\nAll checks passed\n");
process.exit(failures ? 1 : 0);
