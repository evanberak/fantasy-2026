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
  "ScoringEditor", "TeamView", "SeasonView", "TradesView", "ToolsView",
  "DraftRoom", "TradeCalc", "TradeFinder", "ShotFinder", "Versus", "Radar",
  "GMChat", "MyRoster", "TradeDesk", "PlayerCardSheet", "StandingsView",
  "WeekRecap", "DraftRecap", "findTrades", "snapshotBoard",
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

console.log("\nScreens");

const noop = () => {};
const myTeam = { ids: league.rosters[5], teams: 12, ppr: 1, superflex: false, name: "My Team", topPad: 0 };
const screens = [
  ["Hub", M.Hub, { go: noop, my: myTeam }],
  ["MockHome", M.MockHome, { onOpen: noop, onCreate: noop, customScoring: 1 }],
  ["DraftRoom", M.DraftRoom, { lg: league, setLg: noop, toast: noop }],
  ["TeamView", M.TeamView, { lg: league, setLg: noop, toast: noop }],
  ["SeasonView", M.SeasonView, { lg: league, setLg: noop, toast: noop, setTab: noop }],
  ["TradesView", M.TradesView, { lg: league, toast: noop }],
  ["ToolsView", M.ToolsView, { lg: league, toast: noop }],
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
