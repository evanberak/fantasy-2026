/* Huddle interaction test.
 *
 *   npm install
 *   npm run test:click
 *
 * Mounts screens in a real DOM and clicks every tappable row. Rendering once
 * is not enough: "Rendered more hooks than during the previous render" only
 * fires when a click changes state and the component takes a different path,
 * which is exactly how tapping a trade partner blanked the screen.
 */

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { JSDOM } from "jsdom";
import { execSync } from "child_process";
import { readFileSync, writeFileSync, unlinkSync } from "fs";

const src = readFileSync("./App.jsx", "utf8");
const NAMES = [
  "PlayerCardSheet", "DraftRecap", "TeamView", "SeasonView", "TradeDesk",
  "StandingsView", "WeekRecap", "WireView",   "DraftRoom", "Versus", "MyRoster", "TradeCalc", "shellLeague",
  "PersonaPicker", "BoardArchive", "Settings", "MockHome", "Hub", "PlayoffBracket",
  "TradeHelp", "DraftHelp", "ScoringEditor", "TradeFinder", "Radar", "GMChat",
];
let patched = src;
for (const n of NAMES) {
  patched = patched.replace(new RegExp(`(?<!export )\\bfunction ${n}\\(`), `export function ${n}(`);
}
writeFileSync("./.click.jsx", patched);
execSync(
  "npx esbuild ./.click.jsx --bundle --format=esm --platform=node " +
  "--external:react --external:react-dom --external:jsdom --outfile=./.click.mjs --log-level=error"
);

const dom = new JSDOM("<!doctype html><html><body><div id=root></div></body></html>",
  { pretendToBeVisual: true, url: "https://huddle.test/" });
const { window: w } = dom;
globalThis.window = w;
globalThis.document = w.document;
globalThis.HTMLElement = w.HTMLElement;
globalThis.Node = w.Node;
globalThis.Event = w.Event;
globalThis.MouseEvent = w.MouseEvent;
globalThis.getComputedStyle = w.getComputedStyle;
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
globalThis.cancelAnimationFrame = clearTimeout;
if (!globalThis.navigator) {
  Object.defineProperty(globalThis, "navigator", { value: w.navigator, configurable: true });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const memory = {};
w.storage = {
  get: async (k) => { if (!(k in memory)) throw new Error("missing"); return { key: k, value: memory[k] }; },
  set: async (k, v) => { memory[k] = v; },
  delete: async (k) => { delete memory[k]; },
  list: async () => ({ keys: [] }),
};
w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
w.scrollTo = () => {};

const M = await import("./.click.mjs");

const league = M.makeLeague({ teams: 12, rounds: 15, superflex: false, userSlot: 5, ppr: 1 });
while (!M.draftDone(league)) {
  const onClock = M.onClock(league);
  const taken = new Set(league.picks.map((p) => p.playerId));
  M.makePick(league, M.aiPick(league, onClock, M.PLAYERS.filter((p) => !taken.has(p.id))).id);
}
league.season = M.startSeason(league, 7);
for (let i = 0; i < 6; i++) {
  const st = league.season;
  const r = M.simWeek(league, st, null);
  st.record = r.record; st.actual = r.actual; st.injuries = r.injuries;
  st.weeks.push({ week: st.week, matchups: r.matchups, lineups: r.lineups, scores: {}, injuries: r.newInjuries });
  M.runWaivers(league, st, []);
  st.week += 1;
}

let failures = 0;
const noop = () => {};
const values = M.buildValues(league, league.season);
const my = { ids: league.rosters[5], teams: 12, ppr: 1, superflex: false, name: "My Team", topPad: 0, liveInjuries: false };

async function clickThrough(label, element, selector) {
  const host = w.document.createElement("div");
  w.document.body.appendChild(host);
  const root = createRoot(host);
  try {
    await act(async () => { root.render(element); });
  } catch (e) {
    failures++; console.log(`  FAIL  ${label} did not mount: ${e.message}`);
    host.remove(); return;
  }
  const targets = Array.from(host.querySelectorAll(selector)).slice(0, 40);
  for (const el of targets) {
    const name = (el.textContent || "").trim().slice(0, 28);
    try {
      await act(async () => { el.dispatchEvent(new w.MouseEvent("click", { bubbles: true })); });
      if (host.textContent.trim().length === 0) {
        failures++; console.log(`  FAIL  ${label}: screen went blank after clicking "${name}"`);
        root.unmount(); host.remove(); return;
      }
    } catch (e) {
      failures++; console.log(`  FAIL  ${label}: clicking "${name}" threw ${e.message}`);
      root.unmount(); host.remove(); return;
    }
  }
  console.log(`  ok    ${label} (${targets.length} taps)`);
  root.unmount(); host.remove();
}

console.log("\nTapping through every screen");
await clickThrough("Draft recap team names", React.createElement(M.DraftRecap, { lg: league }), ".card .row.sp");
await clickThrough("Team lineup rows", React.createElement(M.TeamView, { lg: league, setLg: noop, toast: noop }), ".plr");
await clickThrough("Standings rows", React.createElement(M.StandingsView, { lg: league, s: league.season, table: M.standings(league, league.season) }), ".plr");
await clickThrough("Week recap rows", React.createElement(M.WeekRecap, { lg: league, wk: league.season.weeks.at(-1) }), ".plr");
await clickThrough("Trade desk partners", React.createElement(M.TradeDesk, { lg: league, setLg: noop, values, toast: noop }), ".act");
await clickThrough("Draft room rows", React.createElement(M.DraftRoom, { lg: league, setLg: noop, toast: noop }), ".plr");
await clickThrough("Waiver wire rows", React.createElement(M.WireView, { lg: league, s: league.season, values, claims: [], setClaims: noop, claimFor: null, setClaimFor: noop, toast: noop }), ".plr");
await clickThrough("Season trade modes", React.createElement(M.SeasonView, { lg: league, setLg: noop, toast: noop, setTab: noop }), ".segs .seg");
await clickThrough("Season nav", React.createElement(M.SeasonView, { lg: league, setLg: noop, toast: noop, setTab: noop }), ".seg");
await clickThrough("Season actions", React.createElement(M.SeasonView, { lg: league, setLg: noop, toast: noop, setTab: noop }), ".act");
await clickThrough("Trade help tabs", React.createElement(M.TradeHelp, { my, save: noop, toast: noop }), ".chip");
await clickThrough("Draft help tabs", React.createElement(M.DraftHelp, { my, save: noop, toast: noop }), ".chip");
await clickThrough("Settings rows", React.createElement(M.Settings, { my, save: noop, toast: noop, onWipe: noop }), ".act");
await clickThrough("Hub tiles", React.createElement(M.Hub, { go: noop, my }), ".tile");
await clickThrough("Scoring presets", React.createElement(M.ScoringEditor, { scoring: 1, onChange: noop, title: "s" }), ".chip");
await clickThrough("Player card tabs", React.createElement(M.PlayerCardSheet, { id: league.rosters[5][0], lg: league, onClose: noop }), ".seg");
await clickThrough("Player card rows", React.createElement(M.PlayerCardSheet, { id: league.rosters[5][0], lg: league, onClose: noop }), ".plr");

try { unlinkSync("./.click.jsx"); unlinkSync("./.click.mjs"); } catch { }
console.log(failures ? `\n${failures} interaction failure(s)\n` : "\nAll interactions fine\n");
process.exit(failures ? 1 : 0);
