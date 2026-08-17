import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";

/* ============================================================
   HUDDLE — 2026 fantasy football command center
   Data: consensus PPR ADP (top 300) as of Aug 10 2026, real byes
   ============================================================ */

const BYE = {
  ARI: 14, ATL: 11, BAL: 13, BUF: 7, CAR: 5, CHI: 10, CIN: 6, CLE: 11,
  DAL: 14, DEN: 10, DET: 6, GB: 11, HOU: 8, IND: 13, JAX: 7, KC: 5,
  LV: 13, LAC: 7, LAR: 11, MIA: 6, MIN: 6, NE: 11, NO: 8, NYG: 8,
  NYJ: 13, PHI: 10, PIT: 9, SF: 8, SEA: 11, TB: 10, TEN: 9, WAS: 7, FA: 0,
};

const RAW = `Jahmyr Gibbs|RB|DET
Bijan Robinson|RB|ATL
Ja'Marr Chase|WR|CIN
Puka Nacua|WR|LAR
Jaxon Smith-Njigba|WR|SEA
Christian McCaffrey|RB|SF
Amon-Ra St. Brown|WR|DET
Jonathan Taylor|RB|IND
James Cook|RB|BUF
Ashton Jeanty|RB|LV
CeeDee Lamb|WR|DAL
Justin Jefferson|WR|MIN
Saquon Barkley|RB|PHI
De'Von Achane|RB|MIA
Omarion Hampton|RB|LAC
Chase Brown|RB|CIN
Kenneth Walker|RB|KC
Drake London|WR|ATL
Derrick Henry|RB|BAL
Brock Bowers|TE|LV
A.J. Brown|WR|NE
Nico Collins|WR|HOU
Trey McBride|TE|ARI
George Pickens|WR|DAL
Rashee Rice|WR|KC
Jeremiyah Love|RB|ARI
Josh Allen|QB|BUF
Chris Olave|WR|NO
Malik Nabers|WR|NYG
DeVonta Smith|WR|PHI
Kyren Williams|RB|LAR
Breece Hall|RB|NYJ
Zay Flowers|WR|BAL
Emeka Egbuka|WR|TB
Javonte Williams|RB|DAL
Josh Jacobs|RB|GB
Tee Higgins|WR|CIN
Garrett Wilson|WR|NYJ
Colston Loveland|TE|CHI
Tetairoa McMillan|WR|CAR
Cam Skattebo|RB|NYG
Travis Etienne|RB|NO
Ladd McConkey|WR|LAC
Jaylen Waddle|WR|DEN
Terry McLaurin|WR|WAS
Luther Burden|WR|CHI
D'Andre Swift|RB|CHI
Lamar Jackson|QB|BAL
Davante Adams|WR|LAR
Quinshon Judkins|RB|CLE
Tyler Warren|TE|IND
David Montgomery|RB|HOU
Bucky Irving|RB|TB
Bhayshul Tuten|RB|JAX
Jameson Williams|WR|DET
TreVeyon Henderson|RB|NE
D.J. Moore|WR|BUF
Mike Evans|WR|SF
Drake Maye|QB|NE
Joe Burrow|QB|CIN
Rome Odunze|WR|CHI
Christian Watson|WR|GB
Jadarian Price|RB|SEA
Jayden Daniels|QB|WAS
Carnell Tate|WR|TEN
Marvin Harrison Jr.|WR|ARI
Jalen Hurts|QB|PHI
Parker Washington|WR|JAX
Brian Thomas Jr.|WR|JAX
Jaylen Warren|RB|PIT
Tucker Kraft|TE|GB
Tony Pollard|RB|TEN
Caleb Williams|QB|CHI
Sam LaPorta|TE|DET
Jordyn Tyson|WR|NO
DK Metcalf|WR|PIT
Kyle Pitts|TE|ATL
Rhamondre Stevenson|RB|NE
Dak Prescott|QB|DAL
Harold Fannin|TE|CLE
Alec Pierce|WR|IND
Courtland Sutton|WR|DEN
Justin Herbert|QB|LAC
Chuba Hubbard|RB|CAR
Rico Dowdle|RB|PIT
Trevor Lawrence|QB|JAX
RJ Harvey|RB|DEN
Quentin Johnston|WR|LAC
Jonathon Brooks|RB|CAR
Michael Pittman Jr.|WR|PIT
Jaxson Dart|QB|NYG
Chris Godwin|WR|TB
Michael Wilson|WR|ARI
Josh Downs|WR|IND
J.K. Dobbins|RB|DEN
Makai Lemon|WR|PHI
Kenneth Gainwell|RB|TB
Matthew Stafford|QB|LAR
George Kittle|TE|SF
Brock Purdy|QB|SF
Blake Corum|RB|LAR
Kyle Monangai|RB|CHI
Wan'Dale Robinson|WR|TEN
Rachaad White|RB|WAS
Patrick Mahomes|QB|KC
Jayden Reed|WR|GB
Jordan Addison|WR|MIN
Travis Kelce|TE|KC
Bo Nix|QB|DEN
Jakobi Meyers|WR|JAX
Dallas Goedert|TE|PHI
Jared Goff|QB|DET
Matthew Golden|WR|GB
Isaiah Likely|TE|NYG
Jordan Mason|RB|MIN
Jacory Croskey-Merritt|RB|WAS
Xavier Worthy|WR|KC
Aaron Jones|RB|MIN
Jake Ferguson|TE|DAL
Dalton Kincaid|TE|BUF
Stefon Diggs|WR|WAS
Mark Andrews|TE|BAL
Kyler Murray|QB|MIN
KC Concepcion|WR|CLE
Romeo Doubs|WR|NE
Baker Mayfield|QB|TB
Jayden Higgins|WR|HOU
Khalil Shakir|WR|BUF
Jordan Love|QB|GB
Jalen Coker|WR|CAR
Tyler Shough|QB|NO
Deebo Samuel|WR|SF
Tyrone Tracy|RB|NYG
Chris Rodriguez|RB|JAX
Woody Marks|RB|HOU
Rashid Shaheed|WR|SEA
Zach Charbonnet|RB|SEA
Malik Willis|QB|MIA
Chigoziem Okonkwo|TE|WAS
Brenton Strange|TE|JAX
Isiah Pacheco|RB|DET
Juwan Johnson|TE|NO
Alvin Kamara|RB|NO
Tyjae Spears|RB|TEN
Tyler Allgeier|RB|ARI
Jalen McMillan|WR|TB
Denzel Boston|WR|CLE
Hunter Henry|TE|NE
Daniel Jones|QB|IND
Jalen Nailor|WR|LV
Tank Bigsby|RB|PHI
De'Zhaun Stribling|WR|SF
Tre Tucker|WR|LV
Oronde Gadsden|TE|LAC
Kenyon Sadiq|TE|NYJ
C.J. Stroud|QB|HOU
Cam Ward|QB|TEN
T.J. Hockenson|TE|MIN
Brian Robinson|RB|ATL
Sam Darnold|QB|SEA
Jerry Jeudy|WR|CLE
Dalton Schultz|TE|HOU
Keaton Mitchell|RB|LAC
Calvin Ridley|WR|TEN
Omar Cooper Jr.|WR|NYJ
Dylan Sampson|RB|CLE
Jonah Coleman|RB|DEN
Travis Hunter|WR|JAX
Jauan Jennings|WR|MIN
Greg Dulcich|TE|MIA
Adonai Mitchell|WR|NYJ
Bryce Young|QB|CAR
AJ Barner|TE|SEA
Tank Dell|WR|HOU
Malik Washington|WR|MIA
Terrance Ferguson|TE|LAR
Antonio Williams|WR|WAS
Emmett Johnson|RB|KC
Braelon Allen|RB|NYJ
Kayshon Boutte|WR|NE
Kimani Vidal|RB|LAC
Fernando Mendoza|QB|LV
Jordan James|RB|SF
Kaelon Black|RB|SF
James Conner|RB|ARI
Cooper Kupp|WR|SEA
Texans D/ST|DST|HOU
Justice Hill|RB|BAL
Broncos D/ST|DST|DEN
Rashod Bateman|WR|BAL
Rams D/ST|DST|LAR
Seahawks D/ST|DST|SEA
Ryan Flournoy|WR|DAL
Eagles D/ST|DST|PHI
Tre' Harris|WR|LAC
Kirk Cousins|QB|LV
Jaydon Blue|RB|DAL
Isaac TeSlaa|WR|DET
Steelers D/ST|DST|PIT
Patriots D/ST|DST|NE
MarShawn Lloyd|RB|GB
Ray Davis|RB|BUF
Ravens D/ST|DST|BAL
Vikings D/ST|DST|MIN
Chargers D/ST|DST|LAC
Jaguars D/ST|DST|JAX
Dontayvion Wicks|WR|PHI
Mike Washington Jr.|RB|LV
Gunnar Helm|TE|TEN
Pat Freiermuth|TE|PIT
Aaron Rodgers|QB|PIT
Zachariah Branch|WR|ATL
Cade Otton|TE|TB
Jacoby Brissett|QB|ARI
Kaytron Allen|RB|WAS
Sean Tucker|RB|TB
Nicholas Singleton|RB|TEN
Lions D/ST|DST|DET
Darnell Mooney|WR|NYG
George Holani|RB|SEA
Geno Smith|QB|NYJ
David Njoku|TE|LAC
Demond Claiborne|RB|MIN
Tua Tagovailoa|QB|ATL
Bills D/ST|DST|BUF
Cyrus Allen|WR|KC
Shedeur Sanders|QB|CLE
Emanuel Wilson|RB|SEA
Christian Kirk|WR|SF
Pat Bryant|WR|DEN
Malachi Fields|WR|NYG
Tyreek Hill|WR|FA
Eli Stowers|TE|PHI
Emari Demercado|RB|KC
Brandon Aubrey|K|DAL
Jaylin Noel|WR|HOU
Ollie Gordon|RB|MIA
Jack Bech|WR|LV
DJ Giddens|RB|IND
Michael Penix Jr.|QB|ATL
Carson Beck|QB|ARI
Mason Taylor|TE|NYJ
Deshaun Watson|QB|CLE
Jason Myers|K|SEA
Ka'imi Fairbairn|K|HOU
Cameron Dicker|K|LAC
Skyler Bell|WR|BUF
Cam Little|K|JAX
Devontez Walker|WR|BAL
Jake Bates|K|DET
Harrison Mevis|K|LAR
Eddy Pineiro|K|SF
Tyler Loop|K|BAL
Colby Parkinson|TE|LAR
Packers D/ST|DST|GB
Germie Bernard|WR|PIT
Browns D/ST|DST|CLE
Evan Engram|TE|DEN
Chiefs D/ST|DST|KC
Harrison Butker|K|KC
Ted Hurst|WR|TB
Cairo Santos|K|CHI
Ja'Kobi Lane|WR|BAL
Troy Franklin|WR|DEN
Mike Gesicki|TE|CIN
Jake Tonges|TE|SF
Will Reichard|K|MIN
Chase McLaughlin|K|TB
Keenan Allen|WR|FA
49ers D/ST|DST|SF
Jaylen Wright|RB|MIA
Keon Coleman|WR|BUF
Samaje Perine|RB|CIN
Cowboys D/ST|DST|DAL
Brandon Aiyuk|WR|SF
Darnell Washington|TE|PIT
Tory Horton|WR|SEA
Tyquan Thornton|WR|KC
Giants D/ST|DST|NYG
Chris Bell|WR|MIA
LeQuint Allen|RB|JAX
Ty Johnson|RB|BUF
Saints D/ST|DST|NO
Adam Randall|RB|BAL
Isaiah Davis|RB|NYJ
J.J. McCarthy|QB|MIN
Caleb Douglas|WR|MIA
Jalen Tolbert|WR|MIA
Theo Johnson|TE|NYG
Dawson Knox|TE|BUF
Jahan Dotson|WR|ATL
Eli Raridon|TE|NE
Andrei Iosivas|WR|CIN
Hollywood Brown|WR|PHI
Elic Ayomanor|WR|TEN
Zavion Thomas|WR|CHI
Erick All|TE|CIN
Ricky Pearsall|WR|SF
Evan McPherson|K|CIN
Bears D/ST|DST|CHI`;

// season-long PPR projection anchors by positional rank
const CURVE = {
  QB: [[1, 396], [3, 362], [6, 331], [10, 301], [16, 266], [24, 226], [32, 189], [40, 158]],
  RB: [[1, 316], [3, 286], [6, 256], [10, 226], [16, 191], [24, 156], [32, 126], [45, 92], [60, 66], [80, 41]],
  WR: [[1, 306], [3, 281], [6, 256], [10, 231], [16, 201], [24, 171], [32, 146], [45, 111], [60, 86], [80, 61], [107, 36]],
  TE: [[1, 236], [2, 206], [4, 181], [6, 156], [10, 126], [15, 101], [22, 76], [30, 56], [41, 36]],
  K: [[1, 141], [5, 126], [10, 113], [14, 101]],
  DST: [[1, 131], [4, 116], [8, 103], [14, 91], [21, 79]],
};

function curveAt(pos, rank) {
  const pts = CURVE[pos] || CURVE.WR;
  if (rank <= pts[0][0]) return pts[0][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    if (rank <= x2) return y1 + ((rank - x1) / (x2 - x1)) * (y2 - y1);
  }
  const last = pts[pts.length - 1];
  return Math.max(12, last[1] - (rank - last[0]) * 1.1);
}

// weekly coefficient of variation + injury risk
const VOL = { QB: 0.27, RB: 0.42, WR: 0.48, TE: 0.51, K: 0.36, DST: 0.58 };
const INJ = { QB: 0.017, RB: 0.030, WR: 0.021, TE: 0.021, K: 0.003, DST: 0 };
const POS_ORDER = ["QB", "RB", "WR", "TE", "K", "DST"];

export const PLAYERS = (() => {
  const counts = {};
  return RAW.trim().split("\n").map((line, i) => {
    const [name, pos, team] = line.split("|");
    counts[pos] = (counts[pos] || 0) + 1;
    const posRank = counts[pos];
    const base = curveAt(pos, posRank);
    return {
      id: i + 1,
      name,
      pos,
      team,
      bye: BYE[team] ?? 0,
      adp: i + 1,
      posRank,
      base,                      // full-PPR baseline season points
      vol: VOL[pos],
      inj: INJ[pos],
      // deeper players carry more uncertainty -> real breakouts + real busts
      spread: 0.13 + Math.min(0.30, (i + 1) * 0.0011),
    };
  });
})();

export const BY_ID = Object.fromEntries(PLAYERS.map((p) => [p.id, p]));

export function pprScale(pos, ppr) {
  if (ppr >= 1) return 1;
  const f = ppr === 0.5 ? { WR: 0.90, TE: 0.90, RB: 0.95 } : { WR: 0.80, TE: 0.80, RB: 0.90 };
  return f[pos] ?? 1;
}
export function proj(p, ppr = 1) {
  return p.base * pprScale(p.pos, ppr);
}

export const LINEUP_STD = [
  { slot: "QB", accepts: ["QB"] },
  { slot: "RB", accepts: ["RB"] },
  { slot: "RB", accepts: ["RB"] },
  { slot: "WR", accepts: ["WR"] },
  { slot: "WR", accepts: ["WR"] },
  { slot: "TE", accepts: ["TE"] },
  { slot: "FLEX", accepts: ["RB", "WR", "TE"] },
  { slot: "D/ST", accepts: ["DST"] },
  { slot: "K", accepts: ["K"] },
];
export const SUPERFLEX = { slot: "SFLX", accepts: ["QB", "RB", "WR", "TE"] };

export function lineupFor(settings) {
  const l = LINEUP_STD.map((s) => ({ ...s }));
  if (settings.superflex) l.splice(7, 0, { ...SUPERFLEX });
  return l;
}

export const GM_NAMES = [
  "Turf Monsters", "Sunday Scaries", "Hurts Donut", "Pylon Patrol",
  "Chalk Talk", "The Waiver Wire", "Play Action Heroes", "Bootleg Kings",
  "Zone Read Ninjas", "Cover Two Cowards", "Screen Pass Society", "Fourth & Forever",
  "Gadget Package", "Two-Minute Drillers",
];

// drafting personalities give each AI room a different feel
export const PERSONAS = [
  { key: "value", label: "Best available", reach: 2.5, needW: 0.35, posBias: {} },
  { key: "needy", label: "Roster builder", reach: 4.5, needW: 1.15, posBias: {} },
  { key: "zeroRB", label: "Zero RB", reach: 5.0, needW: 0.6, posBias: { WR: -10, TE: -5, RB: 14 } },
  { key: "heroRB", label: "Hero RB", reach: 5.0, needW: 0.6, posBias: { RB: -11, WR: 6 } },
  { key: "lateQB", label: "Late-round QB", reach: 3.5, needW: 0.7, posBias: { QB: 22, TE: -4 } },
  { key: "homer", label: "Reacher", reach: 9.0, needW: 0.8, posBias: {} },
  { key: "sharp", label: "Analytics", reach: 3.0, needW: 0.55, posBias: { K: 30, DST: 22 } },
];

export const uid = () => Math.random().toString(36).slice(2, 10);

// deterministic-ish RNG so a saved season replays the same way
export function mulberry(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function gauss(rng) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* ============================================================
   ENGINE — draft AI, player valuation, season simulation
   ============================================================ */

export function makeLeague(cfg) {
  const { teams, rounds, ppr, superflex, userSlot, teamName } = cfg;
  const gms = [];
  const pool = [...GM_NAMES].sort(() => Math.random() - 0.5);
  for (let i = 0; i < teams; i++) {
    const isUser = i === userSlot;
    gms.push({
      idx: i,
      name: isUser ? teamName || "My Team" : pool[i % pool.length],
      isUser,
      persona: isUser ? null : PERSONAS[Math.floor(Math.random() * PERSONAS.length)].key,
      traits: { qb2: Math.random() < 0.45, te2: Math.random() < 0.35 },
    });
  }
  const order = [];
  for (let r = 0; r < rounds; r++) {
    const row = [...Array(teams).keys()];
    order.push(...(r % 2 === 0 ? row : row.reverse()));
  }
  return {
    id: uid(),
    name: cfg.name || `${teams}-Team Mock`,
    createdAt: Date.now(),
    settings: { teams, rounds, ppr, superflex, userSlot, faab: cfg.faabBudget ?? 100, waiverMode: cfg.waiverMode || "faab" },
    gms,
    order,
    picks: [],
    rosters: Object.fromEntries(gms.map((g) => [g.idx, []])),
    season: null,
    keeperNotes: "",
  };
}

export const onClock = (lg) => (lg.picks.length < lg.order.length ? lg.order[lg.picks.length] : null);
export const draftDone = (lg) => lg.picks.length >= lg.order.length;
export const roundOf = (lg, n) => Math.floor(n / lg.settings.teams) + 1;
export const slotOf = (lg, n) => (n % lg.settings.teams) + 1;

function rosterCounts(ids) {
  const c = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0 };
  ids.forEach((id) => { c[BY_ID[id].pos]++; });
  return c;
}

/* ---- CPU drafting: hard roster rules + tier/dropoff reasoning ----
   These GMs draft the way a good league drafts: starters before backups,
   never a kicker in round 9, never a third QB, and they weigh how much
   value actually falls off before their next turn instead of just ADP. */

// how many starters a real roster wants at each position
function startersWanted(superflex) {
  return superflex
    ? { QB: 2, RB: 2, WR: 3, TE: 1, K: 1, DST: 1 }
    : { QB: 1, RB: 2, WR: 3, TE: 1, K: 1, DST: 1 };
}
// hard ceilings — nobody rosters five tight ends
function posCap(superflex) {
  return superflex
    ? { QB: 3, RB: 6, WR: 7, TE: 2, K: 1, DST: 1 }
    : { QB: 2, RB: 6, WR: 7, TE: 2, K: 1, DST: 1 };
}

// picks between now and this GM's next turn (snake-aware)
function picksUntilNext(lg, gmIdx) {
  const start = lg.picks.length;
  for (let i = start + 1; i < lg.order.length; i++) if (lg.order[i] === gmIdx) return i - start;
  return 999;
}

export function aiPick(lg, gmIdx, available) {
  const g = lg.gms[gmIdx];
  const P = PERSONAS.find((p) => p.key === g.persona) || PERSONAS[0];
  const { rounds, superflex, ppr, teams } = lg.settings;
  const round = roundOf(lg, lg.picks.length);
  const ids = lg.rosters[gmIdx];
  const counts = rosterCounts(ids);
  const cap = posCap(superflex);
  const want = startersWanted(superflex);
  const left = rounds - ids.length;             // picks this GM has remaining
  const gap = picksUntilNext(lg, gmIdx);
  const overall = lg.picks.length + 1;

  const needK = counts.K < 1, needDST = counts.DST < 1;
  const mustFill = (needK ? 1 : 0) + (needDST ? 1 : 0);
  const lateWindow = left <= mustFill + 1;       // time to grab K/DST

  // --- hard legality: this is what stops the "idiot" picks ---
  const legal = (p) => {
    if (counts[p.pos] >= cap[p.pos]) return false;
    if (p.pos === "K" || p.pos === "DST") return left <= 2;      // last two rounds only
    if (left <= mustFill) return false;                           // must save slots for K/DST
    if (p.pos === "QB") {
      if (!superflex && round <= 2) return false;                 // no round 1-2 QB in 1QB
      if (!superflex && counts.QB >= 1) {
        if (!g.traits?.qb2) return false;                          // not every GM carries a QB2
        if (round < rounds - 3) return false;
      }
      if (superflex && round === 1 && p.posRank > 3) return false;
    }
    if (p.pos === "TE" && counts.TE >= 1) {
      if (!g.traits?.te2) return false;
      if (round < rounds - 4) return false;
    }
    // don't take a 4th WR/3rd RB before you have a full starting lineup
    const startersMissing = ["RB", "WR", "TE"].some((x) => counts[x] < want[x]);
    if (startersMissing && counts[p.pos] >= want[p.pos] + 1 && round <= 7) return false;
    return true;
  };

  let pool = available.filter(legal);
  if (!pool.length) pool = available.filter((p) => counts[p.pos] < cap[p.pos]);
  if (!pool.length) pool = available;

  // forced end-of-draft fills
  if (lateWindow && (needK || needDST)) {
    const urgent = pool.filter((p) => (needDST && p.pos === "DST") || (needK && p.pos === "K"));
    if (urgent.length && left <= mustFill) return urgent[0];
  }

  // --- best available at each position, now vs. likely at next turn ---
  const bestNow = {}, bestNext = {};
  for (const pos of POS_ORDER) {
    const at = available.filter((p) => p.pos === pos);
    bestNow[pos] = at[0];
    // a player survives the gap if his ADP is comfortably past our next pick
    bestNext[pos] = at.find((p) => p.adp > overall + gap * 0.9) || at[at.length - 1];
  }

  let best = null, bestScore = -Infinity;
  for (const p of pool.slice(0, 45)) {
    const pts = proj(p, ppr);
    // 1. how much value evaporates at this position if we wait one turn
    const fallback = bestNext[p.pos] ? proj(bestNext[p.pos], ppr) : pts * 0.75;
    const dropoff = Math.max(0, pts - fallback);
    // 2. tier break — real gap to the next man at the position
    const same = available.filter((x) => x.pos === p.pos);
    const idx = same.findIndex((x) => x.id === p.id);
    const tier = same[idx + 1] ? Math.max(0, pts - proj(same[idx + 1], ppr)) : 0;
    // 3. does this pick actually improve the starting lineup?
    const have = counts[p.pos];
    const roleWeight = have < want[p.pos] ? 1.0
      : have === want[p.pos] ? 0.78                 // flex / handcuff value
        : Math.max(0.32, 0.62 - (have - want[p.pos]) * 0.12);
    // 4. don't reach into next week — ADP discipline, loosened late
    const reachPenalty = Math.max(0, p.adp - overall - 6 - round * 1.5) * (1.6 / (1 + round * 0.12));
    // 5. bye-week hygiene
    const byeClash = ids.filter((id) => BY_ID[id].bye === p.bye).length;
    const byePenalty = byeClash >= 3 ? 9 : byeClash >= 2 ? 3 : 0;
    // 6. late-round upside chase — swing on variance when it's free
    const upside = round > rounds * 0.62 ? p.spread * 34 : 0;

    const persona = -(P.posBias[p.pos] || 0) * 2.1;
    const noise = (Math.random() - 0.5) * 2 * P.reach * 3.2;

    const score = (pts * 0.42 + dropoff * 1.5 + tier * 0.9) * roleWeight
      - reachPenalty - byePenalty + upside + persona + noise;

    if (score > bestScore) { bestScore = score; best = p; }
  }
  return best || pool[0] || available[0];
}

export function makePick(lg, playerId) {
  const gmIdx = onClock(lg);
  if (gmIdx == null) return lg;
  lg.picks.push({ overall: lg.picks.length + 1, gmIdx, playerId });
  lg.rosters[gmIdx].push(playerId);
  return lg;
}

/* ---------------- valuation ---------------- */

// remaining-season points estimate for every player, given season state
export function buildValues(lg, state) {
  const ppr = lg.settings.ppr;
  const weeksLeft = state ? Math.max(0, 18 - state.week) : 17;
  const out = {};
  for (const p of PLAYERS) {
    const seasonPts = proj(p, ppr);
    const perWeek = seasonPts / 17;
    let mult = 1;
    if (state) {
      const a = state.actual[p.id];
      const gp = a ? a.gp : 0;
      const obs = gp > 0 ? a.pts / (perWeek * gp) : 1;
      const prior = 4.5;
      mult = (prior * 1 + gp * obs) / (prior + gp);
      mult = Math.max(0.25, Math.min(2.6, mult));
    }
    const inj = state ? (state.injuries[p.id] || 0) : 0;
    const playable = Math.max(0, weeksLeft - Math.min(weeksLeft, inj) - (state && p.bye >= state.week ? 1 : 0));
    out[p.id] = {
      ppg: perWeek * mult,
      ros: perWeek * mult * playable,
      mult,
      out: inj,
    };
  }
  // replacement level per position from ROS ppg
  const { teams, superflex } = lg.settings;
  const starters = { QB: superflex ? 1.8 : 1, RB: 2.6, WR: 2.9, TE: 1.2, K: 1, DST: 1 };
  const repl = {};
  for (const pos of ["QB", "RB", "WR", "TE", "K", "DST"]) {
    const sorted = PLAYERS.filter((p) => p.pos === pos)
      .map((p) => out[p.id].ppg).sort((a, b) => b - a);
    const idx = Math.min(sorted.length - 1, Math.round(teams * starters[pos]) + 1);
    repl[pos] = sorted[idx] || 0;
  }
  for (const p of PLAYERS) {
    const v = out[p.id];
    const vorpPPG = Math.max(0.15, v.ppg - repl[p.pos]);
    const horizon = state ? Math.max(1, weeksLeft) : 17;
    v.vorp = vorpPPG * horizon;
    // superlinear: one stud > two mid guys, because you start finite lineups
    v.tv = Math.round(Math.pow(v.vorp, 1.22) / 3.6 * 10) / 10;
  }
  out.__repl = repl;
  return out;
}

export function tradeVerdict(sideA, sideB, values) {
  const sum = (ids) => ids.reduce((t, id) => t + (values[id]?.tv || 0), 0);
  let a = sum(sideA), b = sum(sideB);
  // consolidation premium: giving up more bodies for one stud has real value
  const tax = (n) => (n > 1 ? 1 - Math.min(0.16, (n - 1) * 0.055) : 1);
  a *= tax(sideA.length); b *= tax(sideB.length);
  const diff = a - b;
  const pct = (diff / Math.max(1, (a + b) / 2)) * 100;
  let verdict = "Even trade";
  if (Math.abs(diff) < 1.2) return { a: Math.round(a * 10) / 10, b: Math.round(b * 10) / 10, pct: 0, verdict };
  if (pct > 28) verdict = "You're giving up way too much";
  else if (pct > 11) verdict = "Slight loss for you";
  else if (pct < -28) verdict = "Massive win for you";
  else if (pct < -11) verdict = "Slight win for you";
  return { a: Math.round(a * 10) / 10, b: Math.round(b * 10) / 10, pct, verdict };
}

/* ---------------- season ---------------- */

export function playoffShape(teams) {
  return teams >= 10
    ? { pT: 6, rsWeeks: 14, bracket: [15, 16, 17] }
    : { pT: 4, rsWeeks: 15, bracket: [16, 17] };
}

function roundRobin(n, weeks) {
  const ids = [...Array(n).keys()];
  const sched = [];
  const arr = [...ids];
  for (let w = 0; w < weeks; w++) {
    const pairs = [];
    for (let i = 0; i < n / 2; i++) pairs.push([arr[i], arr[n - 1 - i]]);
    sched.push(pairs);
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop());
    arr.length = 0; arr.push(fixed, ...rest);
  }
  return sched;
}

export function startSeason(lg, seed = Date.now()) {
  const rng = mulberry(seed);
  const { teams } = lg.settings;
  const shape = playoffShape(teams);
  const rostered = new Set(Object.values(lg.rosters).flat());
  const talent = {};
  for (const p of PLAYERS) {
    // hidden true-talent draw — this is what makes the waiver wire matter
    talent[p.id] = Math.max(0.28, 1 + gauss(rng) * p.spread);
  }
  return {
    seed,
    week: 1,
    shape,
    talent,
    injuries: {},
    schedule: roundRobin(teams, shape.rsWeeks),
    weeks: [],
    record: Object.fromEntries(lg.gms.map((g) => [g.idx, { w: 0, l: 0, t: 0, pf: 0, pa: 0 }])),
    faab: Object.fromEntries(lg.gms.map((g) => [g.idx, lg.settings.faab])),
    waiverOrder: lg.gms.map((g) => g.idx).sort(() => rng() - 0.5),
    actual: {},
    log: [],
    freeAgents: PLAYERS.filter((p) => !rostered.has(p.id)).map((p) => p.id),
    lineups: {},
    playoffs: null,
    champion: null,
    tradeOffer: null,
    done: false,
  };
}

export function optimalLineup(lg, state, ids, week, values) {
  const slots = lineupFor(lg.settings);
  const avail = ids
    .map((id) => BY_ID[id])
    .filter((p) => p.bye !== week && !(state.injuries[p.id] > 0))
    .sort((a, b) => (values[b.id].ppg - values[a.id].ppg));
  const used = new Set();
  return slots.map((s) => {
    const pick = avail.find((p) => !used.has(p.id) && s.accepts.includes(p.pos));
    if (pick) used.add(pick.id);
    return pick ? pick.id : null;
  });
}

function scorePlayer(p, state, week, rng) {
  if (p.bye === week) return { pts: 0, tag: "BYE" };
  if (state.injuries[p.id] > 0) return { pts: 0, tag: "OUT" };
  const mean = (p.base / 17) * state.talent[p.id];
  const z = gauss(rng);
  const pts = Math.max(0, mean * (1 + z * p.vol) + (p.pos === "DST" ? gauss(rng) * 1.5 : 0));
  return { pts: Math.round(pts * 10) / 10, tag: null };
}

export function simWeek(lg, state, userLineup) {
  const rng = mulberry(state.seed * 7919 + state.week * 104729);
  const week = state.week;
  const values = buildValues(lg, state);
  const ppr = lg.settings.ppr;

  // tick injuries down, then roll new ones
  const inj = { ...state.injuries };
  for (const k of Object.keys(inj)) { inj[k] = Math.max(0, inj[k] - 1); if (!inj[k]) delete inj[k]; }
  const newInjuries = [];
  const rostered = new Set(Object.values(lg.rosters).flat());
  for (const p of PLAYERS) {
    if (!rostered.has(p.id) || inj[p.id] || p.bye === week) continue;
    if (rng() < p.inj) {
      const roll = rng();
      const wks = roll < 0.42 ? 1 : roll < 0.72 ? 2 : roll < 0.88 ? 4 : roll < 0.96 ? 7 : 99;
      inj[p.id] = wks;
      newInjuries.push({ id: p.id, wks });
    }
  }
  const st = { ...state, injuries: inj };

  // scores for everyone (free agents included so the wire is live)
  const scores = {};
  for (const p of PLAYERS) scores[p.id] = scorePlayer(p, st, week, rng);

  // matchups
  const isRS = week <= state.shape.rsWeeks;
  const pairs = isRS ? state.schedule[(week - 1) % state.schedule.length] : (state.playoffs?.pairs || []);
  const matchups = [];
  const lineups = {};
  for (const [a, b] of pairs) {
    for (const t of [a, b]) {
      const isUser = lg.gms[t].isUser;
      let lu = isUser && userLineup ? userLineup.slice() : optimalLineup(lg, st, lg.rosters[t], week, values);
      // patch invalid user slots
      const slots = lineupFor(lg.settings);
      const seen = new Set();
      lu = lu.map((id, i) => {
        const p = id ? BY_ID[id] : null;
        const ok = p && slots[i].accepts.includes(p.pos) && lg.rosters[t].includes(id) && !seen.has(id);
        if (ok) { seen.add(id); return id; }
        return null;
      });
      lineups[t] = lu;
    }
    const pts = (t) => lineups[t].reduce((s, id) => s + (id ? scores[id].pts : 0), 0);
    const aP = Math.round(pts(a) * 10) / 10, bP = Math.round(pts(b) * 10) / 10;
    matchups.push({ a, b, aP, bP });
  }

  // record + running totals
  const record = JSON.parse(JSON.stringify(state.record));
  if (isRS) {
    for (const m of matchups) {
      record[m.a].pf += m.aP; record[m.a].pa += m.bP;
      record[m.b].pf += m.bP; record[m.b].pa += m.aP;
      if (m.aP > m.bP) { record[m.a].w++; record[m.b].l++; }
      else if (m.bP > m.aP) { record[m.b].w++; record[m.a].l++; }
      else { record[m.a].t++; record[m.b].t++; }
    }
  }
  const actual = { ...state.actual };
  for (const p of PLAYERS) {
    const s = scores[p.id];
    if (s.tag) continue;
    const prev = actual[p.id] || { pts: 0, gp: 0, log: [] };
    actual[p.id] = { pts: prev.pts + s.pts, gp: prev.gp + 1, log: [...prev.log, s.pts].slice(-17) };
  }

  return { scores, matchups, lineups, record, actual, injuries: inj, newInjuries, week };
}

/* -------- waivers -------- */

export function waiverBoard(lg, state, limit = 40) {
  const values = buildValues(lg, state);
  return state.freeAgents
    .map((id) => ({ p: BY_ID[id], v: values[id], hot: hotness(state, id) }))
    .sort((x, y) => y.v.ppg + y.hot * 1.4 - (x.v.ppg + x.hot * 1.4))
    .slice(0, limit);
}

function hotness(state, id) {
  const a = state.actual[id];
  if (!a || !a.log.length) return 0;
  const last = a.log.slice(-2);
  const avg = last.reduce((s, x) => s + x, 0) / last.length;
  const base = BY_ID[id].base / 17;
  return Math.max(0, avg - base * 1.1);
}

export function runWaivers(lg, state, userClaims) {
  if (lg.settings.waiverMode === "priority") return runPriorityWaivers(lg, state, userClaims);
  const values = buildValues(lg, state);
  const board = waiverBoard(lg, state, 26);
  const bids = [];
  // AI bids
  for (const g of lg.gms) {
    if (g.isUser) continue;
    const roster = lg.rosters[g.idx];
    const ranked = roster.slice().sort((a, b) => values[a].ppg - values[b].ppg);
    const worst = ranked[0];
    const budget = state.faab[g.idx];
    let made = 0;
    for (const item of board) {
      if (made >= 2 || budget <= 0) break;
      const gain = item.v.ppg + item.hot - values[worst].ppg;
      if (gain < 1.1) continue;
      if (Math.random() > 0.55) continue;
      const bid = Math.max(1, Math.min(budget, Math.round(gain * (2 + Math.random() * 5))));
      bids.push({ gm: g.idx, id: item.p.id, bid, drop: worst });
      made++;
    }
  }
  for (const c of userClaims || []) {
    bids.push({ gm: lg.settings.userSlot, id: c.id, bid: c.bid, drop: c.drop, user: true });
  }
  const byPlayer = {};
  bids.forEach((b) => { (byPlayer[b.id] = byPlayer[b.id] || []).push(b); });
  const results = [];
  const order = state.waiverOrder;
  const taken = new Set();
  for (const pid of Object.keys(byPlayer)) {
    const list = byPlayer[pid].sort((x, y) => y.bid - x.bid || order.indexOf(x.gm) - order.indexOf(y.gm));
    const win = list[0];
    if (taken.has(Number(pid))) continue;
    if (win.bid > state.faab[win.gm]) continue;
    taken.add(Number(pid));
    state.faab[win.gm] -= win.bid;
    lg.rosters[win.gm] = lg.rosters[win.gm].filter((x) => x !== win.drop);
    lg.rosters[win.gm].push(Number(pid));
    state.freeAgents = state.freeAgents.filter((x) => x !== Number(pid));
    if (win.drop) state.freeAgents.push(win.drop);
    results.push({
      gm: win.gm, add: Number(pid), drop: win.drop, bid: win.bid,
      losers: list.slice(1).map((l) => ({ gm: l.gm, bid: l.bid })),
    });
    // winner drops to back of tiebreak order
    state.waiverOrder = [...order.filter((o) => o !== win.gm), win.gm];
  }
  return results;
}

// classic rolling waiver priority — no money, worst record picks first
function runPriorityWaivers(lg, state, userClaims) {
  const values = buildValues(lg, state);
  const results = [];
  const order = [...state.waiverOrder];
  const wanted = {};
  for (const c of userClaims || []) {
    (wanted[lg.settings.userSlot] = wanted[lg.settings.userSlot] || []).push(c);
  }
  for (const gm of order) {
    const board = waiverBoard(lg, state, 22);
    if (!board.length) break;
    const roster = lg.rosters[gm];
    const ranked = roster.slice().sort((a, b) => values[a].ppg - values[b].ppg);
    let claim = null;
    if (wanted[gm]?.length) {
      const c = wanted[gm].find((x) => state.freeAgents.includes(x.id));
      if (c) claim = { id: c.id, drop: c.drop };
    } else if (!lg.gms[gm].isUser) {
      const worst = ranked[0];
      const target = board.find((b) => b.v.ppg + b.hot - values[worst].ppg > 1.4);
      if (target && Math.random() < 0.5) claim = { id: target.p.id, drop: worst };
    }
    if (!claim) continue;
    lg.rosters[gm] = lg.rosters[gm].filter((x) => x !== claim.drop).concat(claim.id);
    state.freeAgents = state.freeAgents.filter((x) => x !== claim.id);
    if (claim.drop) state.freeAgents.push(claim.drop);
    state.waiverOrder = [...state.waiverOrder.filter((o) => o !== gm), gm];
    results.push({ gm, add: claim.id, drop: claim.drop, bid: null, losers: [] });
  }
  return results;
}

/* -------- AI trade offers -------- */

export function generateOffer(lg, state) {
  const values = buildValues(lg, state);
  const u = lg.settings.userSlot;
  const others = lg.gms.filter((g) => !g.isUser);
  const partner = others[Math.floor(Math.random() * others.length)];
  const mine = lg.rosters[u].slice().sort((a, b) => values[b].tv - values[a].tv);
  const theirs = lg.rosters[partner.idx].slice().sort((a, b) => values[b].tv - values[a].tv);
  if (mine.length < 3 || theirs.length < 3) return null;
  const need = weakestPos(lg, partner.idx, values);
  const target = mine.find((id) => BY_ID[id].pos === need && values[id].tv > 4) || mine[Math.floor(Math.random() * 4)];
  if (!target) return null;
  const want = values[target].tv;
  // build a package they'd actually send: 1 or 2 pieces landing 0.82–1.12x
  let bestPkg = null, bestGap = Infinity;
  for (let i = 0; i < theirs.length; i++) {
    for (let j = -1; j < theirs.length; j++) {
      if (j === i) continue;
      const pkg = j === -1 ? [theirs[i]] : [theirs[i], theirs[j]];
      const val = tradeVerdict([target], pkg, values);
      const ratio = val.b / Math.max(0.1, val.a);
      if (ratio < 0.78 || ratio > 1.18) continue;
      const gap = Math.abs(ratio - 0.96);
      if (gap < bestGap) { bestGap = gap; bestPkg = pkg; }
    }
  }
  if (!bestPkg) return null;
  return { gm: partner.idx, wants: [target], gives: bestPkg, note: `${partner.name} needs ${need} help.` };
}

export function weakestPos(lg, gmIdx, values) {
  const roster = lg.rosters[gmIdx].map((id) => BY_ID[id]);
  const strength = {};
  for (const pos of ["QB", "RB", "WR", "TE"]) {
    const at = roster.filter((p) => p.pos === pos).map((p) => values[p.id].ppg).sort((a, b) => b - a);
    const need = pos === "RB" || pos === "WR" ? 3 : 1;
    strength[pos] = at.slice(0, need).reduce((s, x) => s + x, 0) / need || 0;
  }
  const bench = { QB: 15, RB: 11, WR: 11, TE: 8 };
  let worst = "RB", worstGap = -99;
  for (const pos of Object.keys(strength)) {
    const gap = bench[pos] - strength[pos];
    if (gap > worstGap) { worstGap = gap; worst = pos; }
  }
  return worst;
}

export function standings(lg, state) {
  return lg.gms
    .map((g) => ({ ...g, ...state.record[g.idx] }))
    .sort((a, b) => (b.w - a.w) || (b.pf - a.pf));
}

export function seedPlayoffs(lg, state) {
  const s = standings(lg, state).slice(0, state.shape.pT).map((t) => t.idx);
  if (state.shape.pT === 6) return { seeds: s, pairs: [[s[2], s[5]], [s[3], s[4]]], round: 1, alive: s };
  return { seeds: s, pairs: [[s[0], s[3]], [s[1], s[2]]], round: 1, alive: s };
}

export function advancePlayoffs(lg, state, matchups) {
  const po = state.playoffs;
  const winners = matchups.map((m) => (m.aP >= m.bP ? m.a : m.b));
  const seedOf = (i) => po.seeds.indexOf(i);
  if (po.round === 1 && state.shape.pT === 6) {
    const four = [po.seeds[0], po.seeds[1], ...winners].sort((a, b) => seedOf(a) - seedOf(b));
    return { ...po, round: 2, pairs: [[four[0], four[3]], [four[1], four[2]]] };
  }
  if ((po.round === 1 && state.shape.pT === 4) || po.round === 2) {
    const two = winners.sort((a, b) => seedOf(a) - seedOf(b));
    return { ...po, round: 3, pairs: [[two[0], two[1]]], final: true };
  }
  return { ...po, done: true, champion: winners[0] };
}

/* ============================================================
   UI
   ============================================================ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap');
.hd { --safe-top:env(safe-area-inset-top,0px); --safe-bot:env(safe-area-inset-bottom,0px); --ink:#0C1116; --panel:#141C24; --panel2:#1B252F; --line:#26323D;
  --chalk:#E9EEF2; --mute:#8B9BA8; --first:#FFD400; --los:#3B7BFF;
  --red:#E2483A; --green:#22C48A;
  background:var(--ink); color:var(--chalk); font-family:Inter,system-ui,sans-serif;
  min-height:100vh; -webkit-font-smoothing:antialiased; font-size:14px; }
.hd *{box-sizing:border-box}
.hd button{font-family:inherit;cursor:pointer;border:none;background:none;color:inherit}
.hd input,.hd select,.hd textarea{font-family:inherit;background:var(--panel2);border:1px solid var(--line);
  color:var(--chalk);border-radius:6px;padding:9px 10px;width:100%;font-size:14px;outline:none}
.hd input:focus,.hd select:focus,.hd textarea:focus{border-color:var(--los)}
.hd h1,.hd h2,.hd h3,.hd .disp{font-family:'Barlow Condensed',Impact,sans-serif;font-weight:700;
  text-transform:uppercase;letter-spacing:.02em;margin:0;line-height:1}
.num{font-family:'JetBrains Mono',monospace;font-variant-numeric:tabular-nums}
.eyebrow{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--mute);font-weight:600}
/* signature: the first-down line */
.fdl{position:relative}
.fdl::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--first)}
.hdr{position:sticky;top:0;padding-top:calc(12px + var(--safe-top));z-index:30;background:rgba(12,17,22,.94);backdrop-filter:blur(8px);
  border-bottom:1px solid var(--line);padding:10px 14px;display:flex;align-items:center;gap:10px}
.tabs{position:sticky;bottom:0;z-index:30;display:grid;grid-template-columns:repeat(5,1fr);
  background:rgba(12,17,22,.97);backdrop-filter:blur(8px);border-top:1px solid var(--line)}
.tab{padding:10px 2px calc(12px + var(--safe-bot));text-align:center;font-size:10px;letter-spacing:.08em;text-transform:uppercase;
  color:var(--mute);font-weight:600;border-top:3px solid transparent}
.tab.on{color:var(--first);border-top-color:var(--first)}
.wrap{padding:14px 14px 24px;max-width:760px;margin:0 auto}
.wrap.top{padding-top:calc(18px + var(--safe-top))}
@media (display-mode:standalone){ .hd{--safe-top:max(env(safe-area-inset-top,0px),28px);--safe-bot:max(env(safe-area-inset-bottom,0px),12px)} }
.card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:13px;margin-bottom:11px}
.card.tight{padding:0;overflow:hidden}
.btn{background:var(--first);color:#101519;font-weight:700;padding:11px 14px;border-radius:7px;
  font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.06em;font-size:16px;width:100%}
.btn:disabled{opacity:.35}
.btn.alt{background:var(--panel2);color:var(--chalk);border:1px solid var(--line)}
.btn.blue{background:var(--los);color:#fff}
.btn.sm{padding:7px 10px;font-size:13px;width:auto}
.row{display:flex;align-items:center;gap:9px}
.sp{justify-content:space-between}
.chip{padding:5px 9px;border-radius:99px;background:var(--panel2);border:1px solid var(--line);
  font-size:11px;font-weight:600;letter-spacing:.04em;white-space:nowrap;color:var(--mute)}
.chip.on{background:var(--first);color:#101519;border-color:var(--first)}
.scroll-x{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;-webkit-overflow-scrolling:touch}
.scroll-x::-webkit-scrollbar{display:none}
.pos{width:30px;height:20px;border-radius:4px;display:grid;place-items:center;font-size:10px;font-weight:700;
  font-family:'Barlow Condensed',sans-serif;letter-spacing:.05em;flex:none}
.pQB{background:#7A4DD6;color:#fff}.pRB{background:#1E9E6A;color:#fff}.pWR{background:#2F6BFF;color:#fff}
.pTE{background:#D2822B;color:#fff}.pK{background:#4B5A68;color:#fff}.pDST{background:#8A5C2E;color:#fff}
.plr{display:flex;align-items:center;gap:9px;padding:9px 11px;border-bottom:1px solid var(--line)}
.plr:last-child{border-bottom:none}
.nm{font-weight:600;font-size:13.5px;line-height:1.25}
.sub{font-size:11px;color:var(--mute);margin-top:2px}
.divider{height:1px;background:var(--line);margin:11px 0}
.bar{height:5px;background:var(--panel2);border-radius:99px;overflow:hidden}
.bar>i{display:block;height:100%;background:var(--first)}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
.stat{background:var(--panel2);border-radius:8px;padding:9px;text-align:center}
.stat b{display:block;font-family:'Barlow Condensed',sans-serif;font-size:24px;line-height:1;margin-bottom:3px}
.sheet{position:fixed;inset:0;z-index:60;background:rgba(6,9,12,.7);display:flex;align-items:flex-end}
.sheet>div{background:var(--panel);width:100%;max-height:88vh;overflow-y:auto;border-radius:14px 14px 0 0;
  border-top:3px solid var(--first);padding:14px}
.tag{font-size:9.5px;font-weight:700;letter-spacing:.08em;padding:2px 5px;border-radius:3px;text-transform:uppercase}
.t-out{background:rgba(226,72,58,.16);color:var(--red)}
.t-bye{background:rgba(139,155,168,.16);color:var(--mute)}
.t-up{background:rgba(34,196,138,.16);color:var(--green)}
.toast{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(80px + var(--safe-bot));z-index:80;background:var(--first);
  color:#101519;font-weight:700;padding:10px 16px;border-radius:99px;font-size:13px;max-width:90%}
.mini{font-size:11.5px;color:var(--mute);line-height:1.5}
.link{color:var(--first);font-weight:600;text-decoration:underline;text-underline-offset:2px}
.hub{display:grid;grid-template-columns:1fr 1fr;gap:11px}
.tile{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:15px 13px 14px;
  text-align:left;min-height:152px;display:flex;flex-direction:column;position:relative;overflow:hidden}
.tile::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--first);opacity:.85}
.tile.b::before{background:var(--los)} .tile.g::before{background:var(--green)} .tile.m::before{background:var(--mute)}
.tile h3{font-size:20px;line-height:.95;margin-bottom:6px}
.tile .mini{flex:1}
.tile .go{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--first);margin-top:9px}
.tile.b .go{color:var(--los)} .tile.g .go{color:var(--green)} .tile.m .go{color:var(--mute)}
@media (prefers-reduced-motion: no-preference){ .pop{animation:pop .18s ease-out} }
@keyframes pop{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
`;

const POSC = (p) => `pos p${p}`;

function Toast({ msg }) {
  if (!msg) return null;
  return <div className="toast pop">{msg}</div>;
}

function Sheet({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="sheet" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>
        <div className="row sp" style={{ marginBottom: 10 }}>
          <h2 style={{ fontSize: 20 }}>{title}</h2>
          <button className="chip" onClick={onClose}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PlayerRow({ p, right, onClick, tag, sub }) {
  return (
    <div className="plr" onClick={onClick} style={{ cursor: onClick ? "pointer" : "default" }}>
      <div className={POSC(p.pos)}>{p.pos === "DST" ? "DEF" : p.pos}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="nm" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {p.name} {tag && <span className={`tag ${tag.c}`} style={{ marginLeft: 4 }}>{tag.t}</span>}
        </div>
        <div className="sub">{sub ?? `${p.team} · Bye ${p.bye || "—"} · ADP ${p.adp}`}</div>
      </div>
      {right}
    </div>
  );
}

/* ---------------- storage ---------------- */

const store = {
  async get(k) { try { const r = await window.storage.get(k); return r ? JSON.parse(r.value) : null; } catch { return null; } },
  async set(k, v) { try { await window.storage.set(k, JSON.stringify(v)); return true; } catch { return false; } },
  async del(k) { try { await window.storage.delete(k); } catch { } },
};

async function saveLeague(lg) {
  const idx = (await store.get("huddle:index")) || [];
  const meta = { id: lg.id, name: lg.name, teams: lg.settings.teams, at: Date.now(), phase: lg.season ? (lg.season.champion != null ? "Complete" : `Week ${lg.season.week}`) : draftDone(lg) ? "Drafted" : `Pick ${lg.picks.length + 1}` };
  const next = [meta, ...idx.filter((m) => m.id !== lg.id)].slice(0, 20);
  await store.set("huddle:index", next);
  await store.set(`huddle:lg:${lg.id}`, lg);
}

/* ---------------- Claude helper ---------------- */

async function askClaude(content, system, maxTokens = 1200) {
  const body = {
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    messages: [{ role: "user", content }],
  };
  if (system) body.system = system;
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const d = await r.json();
  return (d.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
}
function parseJSON(txt) {
  const clean = txt.replace(/```json|```/g, "").trim();
  const s = clean.indexOf("{"), sa = clean.indexOf("[");
  const start = sa !== -1 && (sa < s || s === -1) ? sa : s;
  try { return JSON.parse(clean.slice(start)); } catch { return null; }
}

/* ============================================================
   HOME
   ============================================================ */

function MockHome({ onOpen, onCreate }) {
  const [saved, setSaved] = useState([]);
  const [cfg, setCfg] = useState({
    teams: 12, rounds: 15, ppr: 1, superflex: false, userSlot: 5, teamName: "My Team", name: "",
    waiverMode: "faab", faabBudget: 100,
  });
  useEffect(() => { store.get("huddle:index").then((v) => setSaved(v || [])); }, []);

  const load = async (id) => { const lg = await store.get(`huddle:lg:${id}`); if (lg) onOpen(lg); };
  const remove = async (id) => {
    await store.del(`huddle:lg:${id}`);
    const idx = (await store.get("huddle:index")) || [];
    const next = idx.filter((m) => m.id !== id);
    await store.set("huddle:index", next); setSaved(next);
  };

  return (
    <div className="wrap">
      <div style={{ padding: "2px 0 16px" }}>
        <div className="eyebrow">2026 season · consensus ADP through Aug 10</div>
        <h1 style={{ fontSize: 34, marginTop: 5 }}>Mock Season</h1>
        <div className="mini" style={{ marginTop: 7, maxWidth: 430 }}>
          Draft against seven distinct personalities, then play the year out — injuries, breakouts,
          bidding wars, and a trade market that pushes back.
        </div>
      </div>

      {saved.length > 0 && (
        <>
          <div className="eyebrow" style={{ marginBottom: 7 }}>Saved leagues</div>
          <div className="card tight" style={{ marginBottom: 16 }}>
            {saved.map((m) => (
              <div key={m.id} className="plr">
                <div style={{ flex: 1 }}>
                  <div className="nm">{m.name}</div>
                  <div className="sub">{m.teams} teams · {m.phase}</div>
                </div>
                <button className="chip on" onClick={() => load(m.id)}>Open</button>
                <button className="chip" onClick={() => remove(m.id)}>Delete</button>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="card">
        <h2 style={{ fontSize: 22, marginBottom: 12 }}>New mock draft</h2>
        <div className="grid2" style={{ marginBottom: 9 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 4 }}>Teams</div>
            <select value={cfg.teams} onChange={(e) => {
              const t = +e.target.value;
              setCfg({ ...cfg, teams: t, userSlot: Math.min(cfg.userSlot, t - 1) });
            }}>
              {[8, 10, 12, 14].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 4 }}>Rounds</div>
            <select value={cfg.rounds} onChange={(e) => setCfg({ ...cfg, rounds: +e.target.value })}>
              {[13, 14, 15, 16].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 4 }}>Scoring</div>
            <select value={cfg.ppr} onChange={(e) => setCfg({ ...cfg, ppr: +e.target.value })}>
              <option value={1}>Full PPR</option>
              <option value={0.5}>Half PPR</option>
              <option value={0}>Standard</option>
            </select>
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 4 }}>Your draft slot</div>
            <select value={cfg.userSlot} onChange={(e) => setCfg({ ...cfg, userSlot: +e.target.value })}>
              {[...Array(cfg.teams).keys()].map((n) => <option key={n} value={n}>Pick {n + 1}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 9 }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Team name</div>
          <input value={cfg.teamName} onChange={(e) => setCfg({ ...cfg, teamName: e.target.value })} />
        </div>
        <div style={{ marginBottom: 9 }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Waivers</div>
          <div className="grid2">
            {[["faab", `FAAB bidding`], ["priority", "Rolling priority"]].map(([k, l]) => (
              <button key={k} className={`chip ${cfg.waiverMode === k ? "on" : ""}`} style={{ padding: "10px 8px", textAlign: "center", display: "block" }}
                onClick={() => setCfg({ ...cfg, waiverMode: k })}>{l}</button>
            ))}
          </div>
          {cfg.waiverMode === "faab" && (
            <div style={{ marginTop: 8 }}>
              <div className="eyebrow" style={{ marginBottom: 4 }}>Budget</div>
              <select value={cfg.faabBudget} onChange={(e) => setCfg({ ...cfg, faabBudget: +e.target.value })}>
                {[50, 100, 200, 1000].map((n) => <option key={n} value={n}>${n}</option>)}
              </select>
            </div>
          )}
          <div className="mini" style={{ marginTop: 6 }}>
            {cfg.waiverMode === "faab" ? "Blind bidding — highest bid takes the player." : "No money. Worst record claims first, then drops to the back of the line."}
          </div>
        </div>
        <label className="row" style={{ marginBottom: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={cfg.superflex} style={{ width: 18, height: 18 }}
            onChange={(e) => setCfg({ ...cfg, superflex: e.target.checked })} />
          <span style={{ fontSize: 13 }}>Superflex (QB/RB/WR/TE second flex)</span>
        </label>
        <button className="btn" onClick={() => onCreate(makeLeague({ ...cfg, name: cfg.name || `${cfg.teams}-team ${cfg.ppr === 1 ? "PPR" : cfg.ppr === 0.5 ? "Half" : "Std"}${cfg.superflex ? " SF" : ""}` }))}>
          Start draft
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   DRAFT ROOM
   ============================================================ */

function DraftRoom({ lg, setLg, toast }) {
  const [pos, setPos] = useState("ALL");
  const [q, setQ] = useState("");
  const [paused, setPaused] = useState(false);
  const [detail, setDetail] = useState(null);
  const [autopick, setAutopick] = useState(false);
  const timer = useRef(null);

  const taken = useMemo(() => new Set(lg.picks.map((p) => p.playerId)), [lg.picks]);
  const available = useMemo(() => PLAYERS.filter((p) => !taken.has(p.id)), [taken]);
  const clock = onClock(lg);
  const isUser = clock != null && lg.gms[clock].isUser;
  const done = draftDone(lg);

  useEffect(() => {
    if (done || paused) return;
    if (isUser && !autopick) return;
    timer.current = setTimeout(() => {
      const pick = isUser ? aiPick(lg, clock, available) : aiPick(lg, clock, available);
      setLg((prev) => { const n = { ...prev, picks: [...prev.picks], rosters: { ...prev.rosters } }; n.rosters[clock] = [...n.rosters[clock]]; return makePick(n, pick.id); });
    }, isUser ? 350 : 520);
    return () => clearTimeout(timer.current);
  }, [lg.picks.length, paused, isUser, autopick, done]);

  const pick = (p) => {
    if (!isUser) { toast("Not your pick yet"); return; }
    setLg((prev) => { const n = { ...prev, picks: [...prev.picks], rosters: { ...prev.rosters } }; n.rosters[clock] = [...n.rosters[clock]]; return makePick(n, p.id); });
    setDetail(null);
  };
  const undo = () => {
    setLg((prev) => {
      const n = { ...prev, picks: [...prev.picks], rosters: { ...prev.rosters } };
      while (n.picks.length) {
        const last = n.picks.pop();
        n.rosters[last.gmIdx] = n.rosters[last.gmIdx].filter((x) => x !== last.playerId);
        if (n.gms[last.gmIdx].isUser) break;
      }
      return n;
    });
    setPaused(true);
  };

  const filtered = available.filter((p) =>
    (pos === "ALL" || p.pos === pos || (pos === "FLX" && ["RB", "WR", "TE"].includes(p.pos))) &&
    (!q || p.name.toLowerCase().includes(q.toLowerCase()) || p.team.toLowerCase() === q.toLowerCase())
  );

  const myRoster = lg.rosters[lg.settings.userSlot] || [];
  const counts = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0 };
  myRoster.forEach((id) => counts[BY_ID[id].pos]++);
  const nextUserPick = (() => {
    for (let i = lg.picks.length; i < lg.order.length; i++) if (lg.order[i] === lg.settings.userSlot) return i + 1;
    return null;
  })();

  // tier break: gap to the next player at the same position
  const tierGap = (p) => {
    const same = available.filter((x) => x.pos === p.pos);
    const i = same.findIndex((x) => x.id === p.id);
    const nxt = same[i + 1];
    return nxt ? p.base - nxt.base : 0;
  };

  if (done) {
    return <DraftRecap lg={lg} />;
  }

  return (
    <div className="wrap">
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 13px", background: isUser ? "rgba(255,212,0,.10)" : "transparent" }}>
          <div className="row sp">
            <div>
              <div className="eyebrow">Round {roundOf(lg, lg.picks.length)} · Pick {slotOf(lg, lg.picks.length)} · #{lg.picks.length + 1} overall</div>
              <h2 style={{ fontSize: 24, marginTop: 4, color: isUser ? "var(--first)" : "var(--chalk)" }}>
                {isUser ? "You're on the clock" : `${lg.gms[clock].name}`}
              </h2>
              {!isUser && <div className="sub" style={{ marginTop: 3 }}>{PERSONAS.find((x) => x.key === lg.gms[clock].persona)?.label}</div>}
              {isUser && nextUserPick && <div className="sub" style={{ marginTop: 3 }}>Next pick after this: #{(() => { for (let i = lg.picks.length + 1; i < lg.order.length; i++) if (lg.order[i] === lg.settings.userSlot) return i + 1; return "—"; })()}</div>}
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="disp num" style={{ fontSize: 30, color: "var(--first)" }}>{lg.picks.length}</div>
              <div className="eyebrow">of {lg.order.length}</div>
            </div>
          </div>
          <div className="bar" style={{ marginTop: 10 }}><i style={{ width: `${(lg.picks.length / lg.order.length) * 100}%` }} /></div>
        </div>
        <div className="row" style={{ padding: "9px 13px", borderTop: "1px solid var(--line)", gap: 7 }}>
          <button className="chip" onClick={() => setPaused(!paused)}>{paused ? "Resume" : "Pause"}</button>
          <button className="chip" onClick={undo} disabled={!lg.picks.length}>Undo my pick</button>
          <button className={`chip ${autopick ? "on" : ""}`} onClick={() => setAutopick(!autopick)}>Autopick me</button>
        </div>
      </div>

      {lg.picks.length > 0 && (
        <div className="scroll-x" style={{ marginBottom: 11 }}>
          {lg.picks.slice(-8).reverse().map((pk) => (
            <div key={pk.overall} className="chip" style={{ background: lg.gms[pk.gmIdx].isUser ? "rgba(255,212,0,.14)" : undefined, color: lg.gms[pk.gmIdx].isUser ? "var(--first)" : undefined }}>
              {pk.overall}. {BY_ID[pk.playerId].name}
            </div>
          ))}
        </div>
      )}

      <div className="row" style={{ marginBottom: 9, gap: 7 }}>
        <input placeholder="Search player or team" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="scroll-x" style={{ marginBottom: 10 }}>
        {["ALL", "QB", "RB", "WR", "TE", "FLX", "K", "DST"].map((x) => (
          <button key={x} className={`chip ${pos === x ? "on" : ""}`} onClick={() => setPos(x)}>
            {x}{x !== "ALL" && x !== "FLX" ? ` ${counts[x] || 0}` : ""}
          </button>
        ))}
      </div>

      <div className="card tight">
        {filtered.slice(0, 60).map((p) => {
          const gap = tierGap(p);
          return (
            <PlayerRow key={p.id} p={p} onClick={() => setDetail(p)}
              tag={gap > 14 ? { c: "t-up", t: "Tier break" } : null}
              right={
                <div className="row" style={{ gap: 8 }}>
                  <div style={{ textAlign: "right" }}>
                    <div className="num" style={{ fontSize: 13, fontWeight: 700 }}>{Math.round(proj(p, lg.settings.ppr))}</div>
                    <div className="sub">proj</div>
                  </div>
                  {isUser && <button className="btn sm" onClick={(e) => { e.stopPropagation(); pick(p); }}>Draft</button>}
                </div>
              } />
          );
        })}
        {!filtered.length && <div style={{ padding: 20, textAlign: "center" }} className="mini">No players match that filter.</div>}
      </div>

      <Sheet open={!!detail} onClose={() => setDetail(null)} title={detail?.name || ""}>
        {detail && <PlayerCard p={detail} lg={lg} onDraft={isUser ? () => pick(detail) : null} available={available} />}
      </Sheet>
    </div>
  );
}

function PlayerCard({ p, lg, onDraft, available }) {
  const ppr = lg.settings.ppr;
  const posRankAvail = available ? available.filter((x) => x.pos === p.pos).findIndex((x) => x.id === p.id) + 1 : null;
  const myBye = (lg.rosters[lg.settings.userSlot] || []).filter((id) => BY_ID[id].bye === p.bye).length;
  const risk = p.spread > 0.3 ? "High variance — wide range of outcomes" : p.spread > 0.2 ? "Moderate variance" : "Stable, well-defined role";
  return (
    <div>
      <div className="row" style={{ marginBottom: 11 }}>
        <div className={POSC(p.pos)} style={{ width: 40, height: 26 }}>{p.pos === "DST" ? "DEF" : p.pos}</div>
        <div>
          <div style={{ fontWeight: 600 }}>{p.team} · {p.pos}{p.posRank}</div>
          <div className="sub">Bye week {p.bye || "—"}</div>
        </div>
      </div>
      <div className="grid3" style={{ marginBottom: 11 }}>
        <div className="stat"><b className="num">{p.adp}</b><span className="eyebrow">ADP</span></div>
        <div className="stat"><b className="num">{Math.round(proj(p, ppr))}</b><span className="eyebrow">Proj pts</span></div>
        <div className="stat"><b className="num">{posRankAvail ?? p.posRank}</b><span className="eyebrow">{p.pos} left</span></div>
      </div>
      <div className="mini" style={{ marginBottom: 11 }}>
        {risk}. {myBye > 2 ? `Warning — you already roster ${myBye} players on the week ${p.bye} bye.` : ""}
      </div>
      {onDraft && <button className="btn" onClick={onDraft}>Draft {p.name}</button>}
    </div>
  );
}

/* ============================================================
   DRAFT RECAP + GRADES
   ============================================================ */

function gradeFor(score) {
  const g = ["F", "D", "D+", "C-", "C", "C+", "B-", "B", "B+", "A-", "A", "A+"];
  return g[Math.max(0, Math.min(g.length - 1, Math.round(score)))];
}

function gradeTeams(lg) {
  const ppr = lg.settings.ppr;
  const slots = lineupFor(lg.settings);
  return lg.gms.map((g) => {
    const ids = lg.rosters[g.idx];
    const players = ids.map((id) => BY_ID[id]).sort((a, b) => proj(b, ppr) - proj(a, ppr));
    const used = new Set();
    let starterPts = 0;
    slots.forEach((s) => {
      const pick = players.find((p) => !used.has(p.id) && s.accepts.includes(p.pos));
      if (pick) { used.add(pick.id); starterPts += proj(pick, ppr); }
    });
    const depth = players.filter((p) => !used.has(p.id) && ["RB", "WR", "TE", "QB"].includes(p.pos))
      .slice(0, 5).reduce((s, p) => s + proj(p, ppr), 0);
    const value = ids.reduce((s, id, i) => {
      const pickNo = lg.picks.find((pk) => pk.playerId === id)?.overall || 0;
      return s + (pickNo - BY_ID[id].adp);
    }, 0);
    const byeMap = {};
    ids.forEach((id) => { const b = BY_ID[id].bye; if (b) byeMap[b] = (byeMap[b] || 0) + 1; });
    const worstBye = Math.max(0, ...Object.values(byeMap));
    return { gm: g, ids, starterPts, depth, value, worstBye, byeMap };
  });
}

function DraftRecap({ lg }) {
  const rows = useMemo(() => gradeTeams(lg), [lg]);
  const max = Math.max(...rows.map((r) => r.starterPts + r.depth * 0.35));
  const min = Math.min(...rows.map((r) => r.starterPts + r.depth * 0.35));
  const [open, setOpen] = useState(lg.settings.userSlot);

  const steals = lg.picks
    .map((pk) => ({ pk, p: BY_ID[pk.playerId], edge: pk.overall - BY_ID[pk.playerId].adp }))
    .sort((a, b) => b.edge - a.edge);

  return (
    <div className="wrap">
      <div className="fdl" style={{ paddingLeft: 12, margin: "6px 0 14px" }}>
        <div className="eyebrow">Draft complete</div>
        <h1 style={{ fontSize: 30, marginTop: 4 }}>The Room</h1>
        <div className="mini" style={{ marginTop: 5 }}>Grades weight projected starter points, bench depth, and value against ADP.</div>
      </div>

      {rows.map((r) => {
        const raw = r.starterPts + r.depth * 0.35;
        const norm = max === min ? 0.5 : (raw - min) / (max - min);
        const grade = gradeFor(3 + norm * 8 + Math.max(-1.5, Math.min(1.5, r.value / 90)));
        const isOpen = open === r.gm.idx;
        return (
          <div key={r.gm.idx} className="card" style={{ borderColor: r.gm.isUser ? "var(--first)" : "var(--line)" }}>
            <div className="row sp" onClick={() => setOpen(isOpen ? -1 : r.gm.idx)} style={{ cursor: "pointer" }}>
              <div style={{ flex: 1 }}>
                <div className="nm">{r.gm.name} {r.gm.isUser && <span className="tag t-up">YOU</span>}</div>
                <div className="sub">{r.gm.isUser ? "Your picks" : PERSONAS.find((x) => x.key === r.gm.persona)?.label} · {Math.round(r.starterPts)} starter pts
                  {r.worstBye >= 4 ? ` · ${r.worstBye} on one bye` : ""}</div>
              </div>
              <div className="disp" style={{ fontSize: 30, color: "var(--first)" }}>{grade}</div>
            </div>
            {isOpen && (
              <div style={{ marginTop: 9, borderTop: "1px solid var(--line)", paddingTop: 4 }}>
                {r.ids.map((id, i) => {
                  const p = BY_ID[id];
                  const pk = lg.picks.find((x) => x.playerId === id);
                  const edge = pk.overall - p.adp;
                  return (
                    <PlayerRow key={id} p={p} sub={`${roundOf(lg, pk.overall - 1)}.${String(slotOf(lg, pk.overall - 1)).padStart(2, "0")} · ${p.team} · Bye ${p.bye || "—"}`}
                      right={<div style={{ textAlign: "right" }}>
                        <div className="num" style={{ fontSize: 12, color: edge > 12 ? "var(--green)" : edge < -12 ? "var(--red)" : "var(--mute)" }}>
                          {edge > 0 ? `+${edge}` : edge}
                        </div>
                        <div className="sub">vs ADP</div>
                      </div>} />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div className="card">
        <h2 style={{ fontSize: 19, marginBottom: 9 }}>Biggest value picks</h2>
        {steals.slice(0, 5).map((s) => (
          <div key={s.pk.overall} className="row sp" style={{ padding: "6px 0" }}>
            <div className="mini" style={{ color: "var(--chalk)" }}>{s.p.name} <span style={{ color: "var(--mute)" }}>— {lg.gms[s.pk.gmIdx].name}</span></div>
            <div className="num" style={{ color: "var(--green)", fontSize: 12 }}>+{s.edge}</div>
          </div>
        ))}
        <div className="divider" />
        <h2 style={{ fontSize: 19, marginBottom: 9 }}>Biggest reaches</h2>
        {steals.slice(-4).reverse().map((s) => (
          <div key={s.pk.overall} className="row sp" style={{ padding: "6px 0" }}>
            <div className="mini" style={{ color: "var(--chalk)" }}>{s.p.name} <span style={{ color: "var(--mute)" }}>— {lg.gms[s.pk.gmIdx].name}</span></div>
            <div className="num" style={{ color: "var(--red)", fontSize: 12 }}>{s.edge}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   MY TEAM + LINEUP
   ============================================================ */

function TeamView({ lg, setLg, toast }) {
  const u = lg.settings.userSlot;
  const ppr = lg.settings.ppr;
  const season = lg.season;
  const week = season ? season.week : 1;
  const slots = lineupFor(lg.settings);
  const ids = lg.rosters[u] || [];
  const values = useMemo(() => buildValues(lg, season), [lg, season && season.week, ids.length]);
  const [swap, setSwap] = useState(null);

  const stored = season?.lineups?.[week];
  const lineup = stored || (season ? optimalLineup(lg, season, ids, week, values) : defaultLineup(lg, ids, values));
  const setLineup = (next) => {
    if (!season) { toast("Start the season to lock lineups"); return; }
    setLg((prev) => {
      const s = { ...prev.season, lineups: { ...prev.season.lineups, [week]: next } };
      return { ...prev, season: s };
    });
  };

  const bench = ids.filter((id) => !lineup.includes(id));
  const projTotal = lineup.reduce((s, id) => s + (id ? values[id].ppg : 0), 0);

  if (!ids.length) return <Empty text="Draft a team first — head to the Draft tab." />;

  return (
    <div className="wrap">
      <div className="row sp" style={{ marginBottom: 12 }}>
        <div>
          <div className="eyebrow">{season ? `Week ${week} lineup` : "Projected starters"}</div>
          <h1 style={{ fontSize: 28, marginTop: 3 }}>{lg.gms[u].name}</h1>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="disp num" style={{ fontSize: 30, color: "var(--first)" }}>{projTotal.toFixed(1)}</div>
          <div className="eyebrow">proj pts</div>
        </div>
      </div>

      {season && (
        <button className="btn alt" style={{ marginBottom: 11 }}
          onClick={() => { setLineup(optimalLineup(lg, season, ids, week, values)); toast("Lineup optimized"); }}>
          Optimize lineup
        </button>
      )}

      <div className="card tight">
        {slots.map((s, i) => {
          const id = lineup[i];
          const p = id ? BY_ID[id] : null;
          const bad = p && (p.bye === week || (season?.injuries[p.id] > 0));
          return (
            <div key={i} className="plr" onClick={() => setSwap({ i, accepts: s.accepts })} style={{ cursor: "pointer" }}>
              <div className="disp" style={{ width: 42, fontSize: 13, color: "var(--mute)", flex: "none" }}>{s.slot}</div>
              {p ? (
                <>
                  <div className={POSC(p.pos)}>{p.pos === "DST" ? "DEF" : p.pos}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="nm">{p.name} {bad && <span className={`tag ${p.bye === week ? "t-bye" : "t-out"}`}>{p.bye === week ? "BYE" : "OUT"}</span>}</div>
                    <div className="sub">{p.team} · {values[p.id].ppg.toFixed(1)} ppg proj</div>
                  </div>
                </>
              ) : <div style={{ flex: 1 }} className="mini">Tap to fill</div>}
              <div style={{ color: "var(--mute)", fontSize: 18 }}>›</div>
            </div>
          );
        })}
      </div>

      <div className="eyebrow" style={{ margin: "14px 0 7px" }}>Bench</div>
      <div className="card tight">
        {bench.map((id) => {
          const p = BY_ID[id];
          const out = season?.injuries[id] > 0;
          return <PlayerRow key={id} p={p}
            tag={out ? { c: "t-out", t: `OUT ${season.injuries[id] > 20 ? "SEA" : season.injuries[id] + "w"}` } : p.bye === week ? { c: "t-bye", t: "BYE" } : null}
            sub={`${p.team} · Bye ${p.bye || "—"}`}
            right={<div style={{ textAlign: "right" }}>
              <div className="num" style={{ fontSize: 13, fontWeight: 700 }}>{values[id].ppg.toFixed(1)}</div>
              <div className="sub">ppg</div>
            </div>} />;
        })}
        {!bench.length && <div style={{ padding: 16 }} className="mini">Bench is empty.</div>}
      </div>

      <RosterAudit lg={lg} values={values} ids={ids} />

      <Sheet open={!!swap} onClose={() => setSwap(null)} title="Choose a player">
        {swap && ids.filter((id) => swap.accepts.includes(BY_ID[id].pos))
          .sort((a, b) => values[b].ppg - values[a].ppg)
          .map((id) => {
            const p = BY_ID[id];
            const inLineup = lineup.includes(id);
            return <PlayerRow key={id} p={p} sub={`${p.team} · ${values[id].ppg.toFixed(1)} ppg${inLineup ? " · starting" : ""}`}
              onClick={() => {
                const next = lineup.slice();
                const at = next.indexOf(id);
                if (at !== -1) next[at] = next[swap.i];
                next[swap.i] = id;
                setLineup(next); setSwap(null);
              }}
              right={<div className="chip">{inLineup ? "Swap" : "Start"}</div>} />;
          })}
      </Sheet>
    </div>
  );
}

function defaultLineup(lg, ids, values) {
  const slots = lineupFor(lg.settings);
  const sorted = ids.map((id) => BY_ID[id]).sort((a, b) => values[b.id].ppg - values[a.id].ppg);
  const used = new Set();
  return slots.map((s) => {
    const p = sorted.find((x) => !used.has(x.id) && s.accepts.includes(x.pos));
    if (p) used.add(p.id);
    return p ? p.id : null;
  });
}

function RosterAudit({ lg, values, ids }) {
  const byes = {};
  ids.forEach((id) => { const b = BY_ID[id].bye; if (b) (byes[b] = byes[b] || []).push(id); });
  const clashes = Object.entries(byes).filter(([, v]) => v.length >= 3).sort((a, b) => b[1].length - a[1].length);
  const stacks = {};
  ids.forEach((id) => { const p = BY_ID[id]; if (["QB", "WR", "TE"].includes(p.pos)) (stacks[p.team] = stacks[p.team] || []).push(p); });
  const realStacks = Object.entries(stacks).filter(([, v]) => v.some((p) => p.pos === "QB") && v.length > 1);
  const league = lg.gms.map((g) => lg.rosters[g.idx].reduce((s, id) => s + values[id].ppg, 0));
  const mine = ids.reduce((s, id) => s + values[id].ppg, 0);
  const rank = league.filter((x) => x > mine).length + 1;

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <h2 style={{ fontSize: 19, marginBottom: 10 }}>Roster audit</h2>
      <div className="grid3" style={{ marginBottom: 11 }}>
        <div className="stat"><b className="num">{rank}</b><span className="eyebrow">roster rank</span></div>
        <div className="stat"><b className="num">{Math.round(mine)}</b><span className="eyebrow">total ppg</span></div>
        <div className="stat"><b className="num">{realStacks.length}</b><span className="eyebrow">QB stacks</span></div>
      </div>
      {clashes.length > 0 && (
        <div className="mini" style={{ marginBottom: 7 }}>
          <b style={{ color: "var(--red)" }}>Bye crunch:</b> week {clashes[0][0]} takes out {clashes[0][1].length} of your players
          ({clashes[0][1].map((id) => BY_ID[id].name.split(" ").slice(-1)[0]).join(", ")}).
        </div>
      )}
      {realStacks.map(([team, v]) => (
        <div key={team} className="mini" style={{ marginBottom: 5 }}>
          <b style={{ color: "var(--green)" }}>{team} stack:</b> {v.map((p) => p.name).join(" + ")} — correlated ceiling weeks.
        </div>
      ))}
      {!clashes.length && !realStacks.length && <div className="mini">Balanced build. No bye crunches, no correlation plays.</div>}
    </div>
  );
}

function Empty({ text }) {
  return <div className="wrap"><div className="card" style={{ textAlign: "center", padding: 30 }}>
    <div className="mini">{text}</div></div></div>;
}

/* ============================================================
   SEASON
   ============================================================ */

function SeasonView({ lg, setLg, toast }) {
  const u = lg.settings.userSlot;
  const s = lg.season;
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState("hub");
  const [claims, setClaims] = useState([]);
  const [odds, setOdds] = useState(null);
  const [claimFor, setClaimFor] = useState(null);

  if (!draftDone(lg)) return <Empty text="Finish your draft first — the season needs a full roster." />;

  if (!s) {
    return (
      <div className="wrap">
        <div className="card">
          <div className="eyebrow">Ready</div>
          <h1 style={{ fontSize: 30, margin: "5px 0 9px" }}>Play the season</h1>
          <div className="mini" style={{ marginBottom: 14 }}>
            Every player gets a hidden true-talent draw before week 1, so some of your late picks break out and some
            first-rounders bust. Injuries, FAAB waivers, and trade offers run all year.
            {s ? "" : ` ${lg.settings.teams >= 10 ? "14-week regular season, 6-team playoff." : "15-week regular season, 4-team playoff."}`}
          </div>
          <button className="btn" onClick={() => setLg((p) => ({ ...p, season: startSeason(p) }))}>Kick off week 1</button>
        </div>
      </div>
    );
  }

  const done = s.champion != null;
  const rs = s.week <= s.shape.rsWeeks;
  const table = standings(lg, s);
  const myMatch = (() => {
    if (done) return null;
    const pairs = rs ? s.schedule[(s.week - 1) % s.schedule.length] : (s.playoffs?.pairs || []);
    return pairs.find((p) => p.includes(u));
  })();

  const values = buildValues(lg, s);

  const advance = () => {
    setBusy(true);
    setTimeout(() => {
      setLg((prev) => {
        const lgc = JSON.parse(JSON.stringify(prev));
        const st = lgc.season;
        const userLu = st.lineups[st.week];
        const r = simWeek(lgc, st, userLu);
        // trim stored scores to what the UI needs
        const keep = new Set(Object.values(r.lineups).flat().filter(Boolean));
        waiverBoard(lgc, st, 25).forEach((x) => keep.add(x.p.id));
        const scores = {};
        keep.forEach((id) => { if (r.scores[id]) scores[id] = r.scores[id].pts; });

        st.record = r.record; st.actual = r.actual; st.injuries = r.injuries;
        st.weeks.push({
          week: st.week, matchups: r.matchups, lineups: r.lineups, scores,
          injuries: r.newInjuries, playoff: !rs,
        });

        if (rs) {
          const w = runWaivers(lgc, st, claims);
          if (w.length) st.log.push({ week: st.week, type: "waivers", items: w });
        }
        if (st.week === st.shape.rsWeeks) st.playoffs = seedPlayoffs(lgc, st);
        else if (!rs && st.playoffs) {
          const next = advancePlayoffs(lgc, st, r.matchups);
          st.playoffs = next;
          if (next.done) { st.champion = next.champion; }
        }
        // occasional AI offer
        if (rs && st.week < st.shape.rsWeeks - 1 && Math.random() < 0.3 && !st.tradeOffer) {
          st.tradeOffer = generateOffer(lgc, st);
        }
        st.week += 1;
        if (st.week > 17 && st.champion == null && st.playoffs) st.champion = st.playoffs.seeds[0];
        return lgc;
      });
      setClaims([]); setBusy(false); setView("recap");
    }, 30);
  };

  const simRest = () => {
    setBusy(true);
    setTimeout(() => {
      setLg((prev) => {
        const lgc = JSON.parse(JSON.stringify(prev));
        let guard = 0;
        while (lgc.season.champion == null && guard++ < 20) {
          const st = lgc.season;
          const isRS = st.week <= st.shape.rsWeeks;
          const r = simWeek(lgc, st, st.lineups[st.week]);
          const keep = new Set(Object.values(r.lineups).flat().filter(Boolean));
          const scores = {}; keep.forEach((id) => { if (r.scores[id]) scores[id] = r.scores[id].pts; });
          st.record = r.record; st.actual = r.actual; st.injuries = r.injuries;
          st.weeks.push({ week: st.week, matchups: r.matchups, lineups: r.lineups, scores, injuries: r.newInjuries, playoff: !isRS });
          if (isRS) { const w = runWaivers(lgc, st, []); if (w.length) st.log.push({ week: st.week, type: "waivers", items: w }); }
          if (st.week === st.shape.rsWeeks) st.playoffs = seedPlayoffs(lgc, st);
          else if (!isRS && st.playoffs) { const n = advancePlayoffs(lgc, st, r.matchups); st.playoffs = n; if (n.done) st.champion = n.champion; }
          st.week += 1;
          if (st.week > 17 && st.champion == null && st.playoffs) st.champion = st.playoffs.seeds[0];
        }
        return lgc;
      });
      setBusy(false); setView("standings");
    }, 30);
  };

  const runOdds = () => {
    const N = 260;
    const strength = lg.gms.map((g) => optimalLineup(lg, s, lg.rosters[g.idx], 99, values)
      .reduce((t, id) => t + (id ? values[id].ppg : 0), 0));
    const made = lg.gms.map(() => 0), titles = lg.gms.map(() => 0);
    const rng = mulberry(Date.now() % 100000);
    for (let n = 0; n < N; n++) {
      const rec = lg.gms.map((g) => ({ idx: g.idx, w: s.record[g.idx].w, pf: s.record[g.idx].pf }));
      for (let w = s.week; w <= s.shape.rsWeeks; w++) {
        for (const [a, b] of s.schedule[(w - 1) % s.schedule.length]) {
          const sa = strength[a] * (1 + gauss(rng) * 0.16), sb = strength[b] * (1 + gauss(rng) * 0.16);
          const A = rec.find((r) => r.idx === a), B = rec.find((r) => r.idx === b);
          if (sa > sb) { A.w++; A.pf += sa; B.pf += sb; } else { B.w++; B.pf += sb; A.pf += sa; }
        }
      }
      const sorted = rec.sort((x, y) => y.w - x.w || y.pf - x.pf);
      let alive = sorted.slice(0, s.shape.pT).map((r) => r.idx);
      alive.forEach((i) => made[i]++);
      while (alive.length > 1) {
        const nxt = [];
        for (let i = 0; i < alive.length; i += 2) {
          const a = alive[i], b = alive[i + 1];
          if (b == null) { nxt.push(a); continue; }
          nxt.push(strength[a] * (1 + gauss(rng) * 0.19) > strength[b] * (1 + gauss(rng) * 0.19) ? a : b);
        }
        alive = nxt;
      }
      titles[alive[0]]++;
    }
    setOdds(lg.gms.map((g) => ({ name: g.name, isUser: g.isUser, made: made[g.idx] / N, title: titles[g.idx] / N }))
      .sort((a, b) => b.title - a.title));
  };

  const last = s.weeks[s.weeks.length - 1];

  return (
    <div className="wrap">
      <div className="row sp" style={{ marginBottom: 12 }}>
        <div>
          <div className="eyebrow">{done ? "Season complete" : rs ? "Regular season" : "Playoffs"}</div>
          <h1 style={{ fontSize: 28, marginTop: 3 }}>{done ? "Final" : `Week ${s.week}`}</h1>
        </div>
        <div className="row" style={{ gap: 6 }}>
          {["hub", "recap", "standings", "wire"].map((v) => (
            <button key={v} className={`chip ${view === v ? "on" : ""}`} onClick={() => setView(v)}>
              {v === "hub" ? "Hub" : v === "recap" ? "Scores" : v === "standings" ? "Table" : "Wire"}
            </button>
          ))}
        </div>
      </div>

      {done && <ChampionCard lg={lg} s={s} />}

      {view === "hub" && !done && (
        <>
          {s.tradeOffer && <OfferCard lg={lg} setLg={setLg} values={values} toast={toast} />}
          {myMatch ? <MatchPreview lg={lg} s={s} values={values} pair={myMatch} /> :
            <div className="card"><div className="mini">You're not in this round of the playoffs. Sim ahead to see who takes the title.</div></div>}
          <button className="btn" disabled={busy} onClick={advance} style={{ marginBottom: 9 }}>
            {busy ? "Simulating…" : `Sim week ${s.week}`}
          </button>
          <div className="grid2">
            <button className="btn alt" disabled={busy} onClick={simRest}>Sim to the end</button>
            <button className="btn alt" onClick={runOdds}>Playoff odds</button>
          </div>
          {odds && (
            <div className="card" style={{ marginTop: 11 }}>
              <h2 style={{ fontSize: 19, marginBottom: 9 }}>Monte Carlo · 260 seasons</h2>
              {odds.map((o) => (
                <div key={o.name} style={{ marginBottom: 8 }}>
                  <div className="row sp" style={{ marginBottom: 3 }}>
                    <div className="mini" style={{ color: o.isUser ? "var(--first)" : "var(--chalk)", fontWeight: o.isUser ? 700 : 400 }}>{o.name}</div>
                    <div className="num" style={{ fontSize: 11.5, color: "var(--mute)" }}>{Math.round(o.made * 100)}% playoffs · {Math.round(o.title * 100)}% title</div>
                  </div>
                  <div className="bar"><i style={{ width: `${o.made * 100}%`, background: o.isUser ? "var(--first)" : "var(--los)" }} /></div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {view === "recap" && (last ? <WeekRecap lg={lg} wk={last} /> :
        <div className="card"><div className="mini">No weeks played yet.</div></div>)}

      {view === "standings" && <StandingsView lg={lg} s={s} table={table} />}

      {view === "wire" && (
        <WireView lg={lg} s={s} values={values} claims={claims} setClaims={setClaims}
          claimFor={claimFor} setClaimFor={setClaimFor} toast={toast} />
      )}
    </div>
  );
}

function ChampionCard({ lg, s }) {
  const g = lg.gms[s.champion];
  return (
    <div className="card" style={{ borderColor: "var(--first)", background: "rgba(255,212,0,.07)" }}>
      <div className="eyebrow">Champion</div>
      <h1 style={{ fontSize: 32, margin: "6px 0" }}>{g.name}</h1>
      <div className="mini">{g.isUser ? "You won it. The hidden talent draws broke your way — check the wire log to see which pickup swung it." : "Better luck next mock. Run it back from the home screen with a different draft slot."}</div>
    </div>
  );
}

function MatchPreview({ lg, s, values, pair }) {
  const u = lg.settings.userSlot;
  const opp = pair[0] === u ? pair[1] : pair[0];
  const tot = (i) => optimalLineup(lg, s, lg.rosters[i], s.week, values).reduce((t, id) => t + (id ? values[id].ppg : 0), 0);
  const mine = s.lineups[s.week] ? s.lineups[s.week].reduce((t, id) => t + (id ? values[id].ppg : 0), 0) : tot(u);
  const theirs = tot(opp);
  const p = mine / (mine + theirs);
  return (
    <div className="card">
      <div className="eyebrow">Week {s.week} matchup</div>
      <div className="row sp" style={{ margin: "8px 0 11px" }}>
        <div style={{ flex: 1 }}>
          <div className="nm">{lg.gms[u].name}</div>
          <div className="num disp" style={{ fontSize: 26, color: "var(--first)" }}>{mine.toFixed(1)}</div>
        </div>
        <div className="disp" style={{ color: "var(--mute)" }}>vs</div>
        <div style={{ flex: 1, textAlign: "right" }}>
          <div className="nm">{lg.gms[opp].name}</div>
          <div className="num disp" style={{ fontSize: 26 }}>{theirs.toFixed(1)}</div>
        </div>
      </div>
      <div className="bar"><i style={{ width: `${p * 100}%` }} /></div>
      <div className="mini" style={{ marginTop: 7 }}>{Math.round(p * 100)}% projected win. Set your lineup on the Team tab before you sim.</div>
    </div>
  );
}

function WeekRecap({ lg, wk }) {
  const [open, setOpen] = useState(null);
  const all = wk.matchups.flatMap((m) => [{ i: m.a, p: m.aP }, { i: m.b, p: m.bP }]).sort((a, b) => b.p - a.p);
  return (
    <>
      <div className="card">
        <div className="eyebrow">Week {wk.week} {wk.playoff ? "· playoffs" : ""}</div>
        <div className="grid2" style={{ marginTop: 9 }}>
          <div className="stat"><b className="num">{all[0]?.p.toFixed(0)}</b><span className="eyebrow">{lg.gms[all[0]?.i]?.name.slice(0, 14)}</span></div>
          <div className="stat"><b className="num">{all[all.length - 1]?.p.toFixed(0)}</b><span className="eyebrow">low: {lg.gms[all[all.length - 1]?.i]?.name.slice(0, 12)}</span></div>
        </div>
      </div>
      {wk.matchups.map((m, i) => {
        const win = m.aP >= m.bP ? m.a : m.b;
        return (
          <div key={i} className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="plr" onClick={() => setOpen(open === i ? null : i)} style={{ cursor: "pointer" }}>
              <div style={{ flex: 1 }}>
                {[m.a, m.b].map((t) => (
                  <div key={t} className="row sp" style={{ padding: "3px 0" }}>
                    <div className="nm" style={{ color: t === win ? "var(--chalk)" : "var(--mute)", fontWeight: t === win ? 700 : 400 }}>
                      {lg.gms[t].name}{lg.gms[t].isUser ? " ★" : ""}
                    </div>
                    <div className="num" style={{ fontWeight: 700, color: t === win ? "var(--first)" : "var(--mute)" }}>
                      {(t === m.a ? m.aP : m.bP).toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {open === i && [m.a, m.b].map((t) => (
              <div key={t} style={{ borderTop: "1px solid var(--line)" }}>
                <div className="eyebrow" style={{ padding: "8px 11px 4px" }}>{lg.gms[t].name}</div>
                {(wk.lineups[t] || []).map((id, k) => {
                  if (!id) return <div key={k} className="plr"><div className="mini">Empty slot</div></div>;
                  const p = BY_ID[id];
                  return <PlayerRow key={k} p={p} sub={`${p.team}`}
                    right={<div className="num" style={{ fontWeight: 700 }}>{(wk.scores[id] ?? 0).toFixed(1)}</div>} />;
                })}
              </div>
            ))}
          </div>
        );
      })}
      {wk.injuries?.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>Injury report</h2>
          {wk.injuries.map((n) => (
            <div key={n.id} className="mini" style={{ marginBottom: 4 }}>
              <span style={{ color: "var(--red)", fontWeight: 700 }}>{BY_ID[n.id].name}</span> — out {n.wks > 20 ? "for the season" : `${n.wks} week${n.wks > 1 ? "s" : ""}`}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function StandingsView({ lg, s, table }) {
  return (
    <>
      <div className="card tight">
        {table.map((t, i) => (
          <div key={t.idx} className="plr" style={{ background: t.isUser ? "rgba(255,212,0,.07)" : undefined }}>
            <div className="disp num" style={{ width: 22, color: i < s.shape.pT ? "var(--first)" : "var(--mute)", fontSize: 17 }}>{i + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="nm" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</div>
              <div className="sub">{Math.round(t.pf)} PF · {Math.round(t.pa)} PA</div>
            </div>
            <div className="num disp" style={{ fontSize: 18 }}>{t.w}-{t.l}{t.t ? `-${t.t}` : ""}</div>
          </div>
        ))}
      </div>
      {s.playoffs && (
        <div className="card">
          <h2 style={{ fontSize: 19, marginBottom: 8 }}>Bracket</h2>
          <div className="mini">Seeds: {s.playoffs.seeds.map((i, k) => `${k + 1}. ${lg.gms[i].name}`).join(" · ")}</div>
        </div>
      )}
      {s.log.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: 19, marginBottom: 9 }}>Transactions</h2>
          {s.log.slice().reverse().slice(0, 12).map((entry, i) => (
            entry.type === "trade" ? (
              <div key={i} style={{ marginBottom: 9 }}>
                <div className="eyebrow" style={{ marginBottom: 3, color: "var(--los)" }}>Week {entry.week} trade</div>
                <div className="mini">
                  You sent {entry.out.map((id) => BY_ID[id].name).join(", ")} to {lg.gms[entry.gm].name} for {entry.in.map((id) => BY_ID[id].name).join(", ")}.
                </div>
              </div>
            ) : (
            <div key={i} style={{ marginBottom: 9 }}>
              <div className="eyebrow" style={{ marginBottom: 3 }}>Week {entry.week} waivers</div>
              {entry.items.map((it, k) => (
                <div key={k} className="mini" style={{ marginBottom: 3 }}>
                  <b style={{ color: lg.gms[it.gm].isUser ? "var(--first)" : "var(--chalk)" }}>{lg.gms[it.gm].name}</b> added {BY_ID[it.add].name}{it.bid != null ? ` ($${it.bid})` : ""}
                  {it.drop ? `, dropped ${BY_ID[it.drop].name}` : ""}
                  {it.losers.length ? ` — outbid ${it.losers.length}` : ""}
                </div>
              ))}
            </div>
            )
          ))}
        </div>
      )}
    </>
  );
}

function WireView({ lg, s, values, claims, setClaims, claimFor, setClaimFor, toast }) {
  const u = lg.settings.userSlot;
  const board = useMemo(() => waiverBoard(lg, s, 35), [lg, s.week]);
  const [bid, setBid] = useState(3);
  const [drop, setDrop] = useState(null);
  const myIds = lg.rosters[u];
  const faab = lg.settings.waiverMode !== "priority";

  return (
    <>
      <div className="card">
        <div className="row sp">
          <div>
            <div className="eyebrow">{faab ? "FAAB remaining" : "Waiver priority"}</div>
            <div className="disp num" style={{ fontSize: 30, color: "var(--first)" }}>
              {faab ? `$${s.faab[u]}` : `#${s.waiverOrder.indexOf(u) + 1}`}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="eyebrow">Pending claims</div>
            <div className="disp num" style={{ fontSize: 30 }}>{claims.length}</div>
          </div>
        </div>
        <div className="mini" style={{ marginTop: 8 }}>
          {faab
            ? "Claims process when you sim the week. Highest bid wins; ties break by waiver order."
            : `Claims process when you sim the week. You pick ${s.waiverOrder.indexOf(u) + 1}${["st","nd","rd"][s.waiverOrder.indexOf(u)] || "th"} this week — claiming sends you to the back of the line.`}
        </div>
      </div>

      {claims.length > 0 && (
        <div className="card">
          {claims.map((c, i) => (
            <div key={i} className="row sp" style={{ padding: "5px 0" }}>
              <div className="mini" style={{ color: "var(--chalk)" }}>{faab ? `$${c.bid} → ` : "Claim: "}{BY_ID[c.id].name} <span style={{ color: "var(--mute)" }}>for {BY_ID[c.drop].name}</span></div>
              <button className="chip" onClick={() => setClaims(claims.filter((_, k) => k !== i))}>Cancel</button>
            </div>
          ))}
        </div>
      )}

      <div className="card tight">
        {board.map(({ p, v, hot }) => (
          <PlayerRow key={p.id} p={p} onClick={() => { setClaimFor(p); setBid(Math.max(1, Math.round(v.ppg))); setDrop(null); }}
            tag={hot > 2 ? { c: "t-up", t: "Trending" } : null}
            sub={`${p.team} · ${s.actual[p.id]?.gp ? `${(s.actual[p.id].pts / s.actual[p.id].gp).toFixed(1)} ppg actual` : "no games"}`}
            right={<div style={{ textAlign: "right" }}>
              <div className="num" style={{ fontWeight: 700 }}>{v.ppg.toFixed(1)}</div>
              <div className="sub">ros ppg</div>
            </div>} />
        ))}
      </div>

      <Sheet open={!!claimFor} onClose={() => setClaimFor(null)} title={`Claim ${claimFor?.name || ""}`}>
        {faab && <>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Bid (${s.faab[u]} left)</div>
          <input type="number" min={0} max={s.faab[u]} value={bid} onChange={(e) => setBid(+e.target.value)} style={{ marginBottom: 11 }} />
        </>}
        <div className="eyebrow" style={{ marginBottom: 6 }}>Drop</div>
        <div style={{ maxHeight: 240, overflowY: "auto", marginBottom: 11 }}>
          {myIds.slice().sort((a, b) => values[a].ppg - values[b].ppg).map((id) => (
            <PlayerRow key={id} p={BY_ID[id]} onClick={() => setDrop(id)}
              sub={`${values[id].ppg.toFixed(1)} ppg`}
              right={<div className={`chip ${drop === id ? "on" : ""}`}>{drop === id ? "Dropping" : "Select"}</div>} />
          ))}
        </div>
        <button className="btn" disabled={!drop || (faab && bid > s.faab[u])} onClick={() => {
          setClaims([...claims, { id: claimFor.id, bid: faab ? bid : 0, drop }]);
          setClaimFor(null); toast("Claim queued");
        }}>Queue claim</button>
      </Sheet>
    </>
  );
}

function OfferCard({ lg, setLg, values, toast }) {
  const o = lg.season.tradeOffer;
  if (!o) return null;
  const v = tradeVerdict(o.wants, o.gives, values);
  const accept = () => {
    setLg((prev) => {
      const n = JSON.parse(JSON.stringify(prev));
      const u = n.settings.userSlot;
      n.rosters[u] = n.rosters[u].filter((x) => !o.wants.includes(x)).concat(o.gives);
      n.rosters[o.gm] = n.rosters[o.gm].filter((x) => !o.gives.includes(x)).concat(o.wants);
      n.season.tradeOffer = null;
      n.season.log.push({ week: n.season.week, type: "trade", gm: o.gm, out: o.wants, in: o.gives });
      return n;
    });
    toast("Trade accepted");
  };
  return (
    <div className="card" style={{ borderColor: "var(--los)" }}>
      <div className="eyebrow" style={{ color: "var(--los)" }}>Trade offer · {lg.gms[o.gm].name}</div>
      <div className="mini" style={{ margin: "6px 0 9px" }}>{o.note}</div>
      <div className="grid2" style={{ marginBottom: 10 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>You send</div>
          {o.wants.map((id) => <div key={id} className="mini" style={{ color: "var(--chalk)" }}>{BY_ID[id].name}</div>)}
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>You get</div>
          {o.gives.map((id) => <div key={id} className="mini" style={{ color: "var(--chalk)" }}>{BY_ID[id].name}</div>)}
        </div>
      </div>
      <div className="mini" style={{ marginBottom: 10 }}>
        Value read: <b style={{ color: v.pct < -8 ? "var(--green)" : v.pct > 8 ? "var(--red)" : "var(--first)" }}>{v.verdict}</b> ({v.a} out / {v.b} in)
      </div>
      <div className="grid2">
        <button className="btn blue" onClick={accept}>Accept</button>
        <button className="btn alt" onClick={() => setLg((p) => ({ ...p, season: { ...p.season, tradeOffer: null } }))}>Decline</button>
      </div>
    </div>
  );
}

/* ============================================================
   TRADES
   ============================================================ */

function norm(s) {
  return String(s).toLowerCase().replace(/[^a-z ]/g, "").replace(/\b(jr|sr|ii|iii|iv)\b/g, "").replace(/\s+/g, " ").trim();
}
function matchPlayer(raw) {
  const n = norm(raw);
  if (!n) return null;
  let hit = PLAYERS.find((p) => norm(p.name) === n);
  if (hit) return hit;
  const parts = n.split(" ");
  const last = parts[parts.length - 1], first = parts[0];
  hit = PLAYERS.find((p) => { const q = norm(p.name).split(" "); return q[q.length - 1] === last && q[0][0] === first[0]; });
  if (hit) return hit;
  hit = PLAYERS.find((p) => norm(p.name).includes(last) && last.length > 3);
  return hit || null;
}

function PlayerPicker({ open, onClose, onPick, pool, title }) {
  const [q, setQ] = useState("");
  const list = (pool || PLAYERS).filter((p) => !q || norm(p.name).includes(norm(q))).slice(0, 50);
  return (
    <Sheet open={open} onClose={onClose} title={title || "Add player"}>
      <input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 10 }} autoFocus />
      <div style={{ maxHeight: "58vh", overflowY: "auto" }}>
        {list.map((p) => <PlayerRow key={p.id} p={p} onClick={() => { onPick(p); setQ(""); }} />)}
      </div>
    </Sheet>
  );
}

function TradesView({ lg, toast }) {
  const [mode, setMode] = useState("calc");
  return (
    <div className="wrap">
      <div className="scroll-x" style={{ marginBottom: 12 }}>
        {[["calc", "Calculator"], ["finder", "Trade finder"], ["shot", "From screenshot"]].map(([k, l]) => (
          <button key={k} className={`chip ${mode === k ? "on" : ""}`} onClick={() => setMode(k)}>{l}</button>
        ))}
      </div>
      {mode === "calc" && <TradeCalc lg={lg} />}
      {mode === "finder" && <TradeFinder lg={lg} toast={toast} />}
      {mode === "shot" && <ShotFinder lg={lg} toast={toast} />}
    </div>
  );
}

function TradeCalc({ lg }) {
  const values = useMemo(() => buildValues(lg, lg.season), [lg]);
  const [send, setSend] = useState([]);
  const [get, setGet] = useState([]);
  const [pick, setPick] = useState(null);
  const v = tradeVerdict(send.map((p) => p.id), get.map((p) => p.id), values);
  const total = Math.max(1, v.a + v.b);
  const myIds = lg.rosters?.[lg.settings.userSlot] || [];
  const roster = myIds.map((id) => BY_ID[id]);

  const Side = ({ label, arr, setArr, poolMine }) => (
    <div className="card">
      <div className="row sp" style={{ marginBottom: 8 }}>
        <div className="eyebrow">{label}</div>
        <button className="chip on" onClick={() => setPick({ setArr, arr, pool: poolMine ? roster : null, label })}>+ Add</button>
      </div>
      {arr.length === 0 && <div className="mini">Nothing yet.</div>}
      {arr.map((p) => (
        <PlayerRow key={p.id} p={p} sub={`${p.team} · ${values[p.id].ppg.toFixed(1)} ppg`}
          right={<div className="row" style={{ gap: 7 }}>
            <div className="num" style={{ fontWeight: 700, color: "var(--first)" }}>{values[p.id].tv}</div>
            <button className="chip" onClick={() => setArr(arr.filter((x) => x.id !== p.id))}>×</button>
          </div>} />
      ))}
    </div>
  );

  return (
    <>
      <Side label="You send" arr={send} setArr={setSend} poolMine={myIds.length > 0} />
      <Side label="You get" arr={get} setArr={setGet} />
      {(send.length > 0 || get.length > 0) && (
        <div className="card fdl" style={{ paddingLeft: 15 }}>
          <div className="eyebrow">Verdict</div>
          <h2 style={{ fontSize: 24, margin: "6px 0 11px", color: v.pct < -8 ? "var(--green)" : v.pct > 8 ? "var(--red)" : "var(--first)" }}>
            {v.verdict}
          </h2>
          <div className="row" style={{ gap: 2, marginBottom: 8 }}>
            <div style={{ height: 22, width: `${(v.a / total) * 100}%`, background: "var(--red)", borderRadius: "4px 0 0 4px" }} />
            <div style={{ height: 22, width: `${(v.b / total) * 100}%`, background: "var(--green)", borderRadius: "0 4px 4px 0" }} />
          </div>
          <div className="row sp mini" style={{ marginBottom: 10 }}>
            <span>Out {v.a}</span><span>In {v.b}</span>
          </div>
          <div className="mini">
            Values are rest-of-season points over replacement, curved so a single elite player outweighs the raw sum of
            two mid pieces — you only start so many.
            {send.length > get.length && " You're consolidating, which this model rewards."}
            {get.length > send.length && " You're taking on more bodies; the depth only pays off if you can actually start it."}
          </div>
        </div>
      )}
      <PlayerPicker open={!!pick} onClose={() => setPick(null)} title={pick?.label}
        pool={pick?.pool} onPick={(p) => { pick.setArr([...pick.arr, p]); setPick(null); }} />
    </>
  );
}

/* ---- in-league trade finder ---- */

function findTrades(lg, myIds, values, rosters) {
  const out = [];
  const myWeak = weakestPosFromIds(myIds, values);
  for (const [gmIdx, ids] of Object.entries(rosters)) {
    if (Number(gmIdx) === lg.settings.userSlot) continue;
    const theirWeak = weakestPosFromIds(ids, values);
    const myGive = myIds.filter((id) => BY_ID[id].pos === theirWeak).sort((a, b) => values[b].tv - values[a].tv);
    const theirGive = ids.filter((id) => BY_ID[id].pos === myWeak).sort((a, b) => values[b].tv - values[a].tv);
    for (const g of myGive.slice(0, 4)) {
      for (const t of theirGive.slice(0, 4)) {
        const v = tradeVerdict([g], [t], values);
        const ratio = v.b / Math.max(0.1, v.a);
        if (ratio < 0.82 || ratio > 1.35) continue;
        // must actually be a surplus piece for me and a starter upgrade
        const mySurplus = myIds.filter((id) => BY_ID[id].pos === BY_ID[g].pos && values[id].ppg >= values[g].ppg).length;
        if (mySurplus < 2) continue;
        out.push({ gmIdx: Number(gmIdx), give: [g], getIds: [t], v, myWeak, theirWeak, ratio });
      }
    }
    // 2-for-1 consolidation
    if (myGive.length >= 2 && theirGive.length) {
      const pkg = [myGive[0], myGive[1]];
      const target = theirGive[0];
      const v = tradeVerdict(pkg, [target], values);
      if (v.b / Math.max(0.1, v.a) > 0.8) out.push({ gmIdx: Number(gmIdx), give: pkg, getIds: [target], v, myWeak, theirWeak, ratio: v.b / v.a });
    }
  }
  return out.sort((a, b) => b.ratio - a.ratio).slice(0, 8);
}

function weakestPosFromIds(ids, values) {
  const need = { QB: 1, RB: 3, WR: 3, TE: 1 };
  const bench = { QB: 15, RB: 11, WR: 11, TE: 8 };
  let worst = "RB", gap = -99;
  for (const pos of Object.keys(need)) {
    const at = ids.map((id) => BY_ID[id]).filter((p) => p.pos === pos)
      .map((p) => values[p.id].ppg).sort((a, b) => b - a);
    const avg = at.slice(0, need[pos]).reduce((s, x) => s + x, 0) / need[pos] || 0;
    if (bench[pos] - avg > gap) { gap = bench[pos] - avg; worst = pos; }
  }
  return worst;
}

function TradeFinder({ lg, toast }) {
  const values = useMemo(() => buildValues(lg, lg.season), [lg]);
  const myIds = lg.rosters?.[lg.settings.userSlot] || [];
  const trades = useMemo(() => (myIds.length ? findTrades(lg, myIds, values, lg.rosters) : []), [lg]);
  if (!myIds.length) return <div className="card"><div className="mini">Draft a team first, or use "From screenshot" to analyze a roster from another app.</div></div>;
  return (
    <>
      <div className="card">
        <div className="eyebrow">Scanning {lg.settings.teams - 1} rosters</div>
        <div className="mini" style={{ marginTop: 6 }}>
          These only surface when both sides gain: you're dealing from a position where you already have starters banked,
          into a hole, and they're doing the same in reverse.
        </div>
      </div>
      {trades.length === 0 && <div className="card"><div className="mini">No clean fits right now. Your roster is balanced enough that every deal costs you as much as it returns.</div></div>}
      {trades.map((t, i) => (
        <div key={i} className="card">
          <div className="row sp" style={{ marginBottom: 9 }}>
            <div className="nm">{lg.gms[t.gmIdx].name}</div>
            <div className="chip on">{Math.round(t.ratio * 100)}% value back</div>
          </div>
          <div className="grid2" style={{ marginBottom: 9 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 4 }}>You send</div>
              {t.give.map((id) => <div key={id} className="mini" style={{ color: "var(--chalk)" }}>{BY_ID[id].name} <span style={{ color: "var(--mute)" }}>{BY_ID[id].pos}</span></div>)}
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 4 }}>You get</div>
              {t.getIds.map((id) => <div key={id} className="mini" style={{ color: "var(--chalk)" }}>{BY_ID[id].name} <span style={{ color: "var(--mute)" }}>{BY_ID[id].pos}</span></div>)}
            </div>
          </div>
          <div className="mini">Why they'd take it: they're thin at {t.theirWeak} and you're stacked there. You fill {t.myWeak}.</div>
        </div>
      ))}
    </>
  );
}

/* ---- screenshot roster ---- */

function ShotFinder({ lg, toast, my, save }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [found, setFound] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const fileRef = useRef(null);

  const handle = async (file) => {
    if (!file) return;
    setBusy(true); setErr(""); setFound(null); setAnalysis(null);
    try {
      const b64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result).split(",")[1]);
        r.onerror = () => rej(new Error("read"));
        r.readAsDataURL(file);
      });
      const media = file.type === "image/png" ? "image/png" : file.type === "image/webp" ? "image/webp" : "image/jpeg";
      const body = {
        model: "claude-sonnet-4-6",
        max_tokens: 900,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: media, data: b64 } },
            { type: "text", text: 'This is a fantasy football roster screenshot. Return ONLY a JSON array of the player names you can read, in order, no markdown, no commentary. Team defenses should be written like "Texans D/ST". Example: ["Bijan Robinson","Nico Collins"]' },
          ],
        }],
      };
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const d = await r.json();
      const txt = (d.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
      const names = parseJSON(txt);
      if (!Array.isArray(names)) throw new Error("Could not read that image");
      const matched = names.map((n) => ({ raw: n, p: matchPlayer(n) }));
      setFound(matched);
    } catch (e) {
      setErr("Could not read that screenshot. Try a tighter crop of just the roster list, or add players manually below.");
    }
    setBusy(false);
  };

  const ids = (found || []).filter((m) => m.p).map((m) => m.p.id);

  const analyze = () => {
    const values = buildValues(lg, null);
    // synthetic league of counterparties from the best players not on this roster
    const mine = new Set(ids);
    const pool = PLAYERS.filter((p) => !mine.has(p.id) && p.adp <= 190);
    const rosters = {};
    const n = lg.settings.teams - 1;
    for (let i = 0; i < n; i++) rosters[i + 100] = [];
    pool.forEach((p, i) => { rosters[(i % n) + 100].push(p.id); });
    const fake = { ...lg, settings: { ...lg.settings, userSlot: -1 }, gms: [] };
    const trades = findTrades(fake, ids, values, rosters);
    setAnalysis({ values, trades, weak: weakestPosFromIds(ids, values) });
  };

  return (
    <>
      <div className="card">
        <div className="eyebrow">Read a roster from any app</div>
        <div className="mini" style={{ margin: "6px 0 11px" }}>
          Screenshot your roster in Sleeper, ESPN, Yahoo — whatever you use — and drop it here. Names get matched against
          the 2026 player pool, then scored for trade fits.
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
          onChange={(e) => handle(e.target.files?.[0])} />
        <button className="btn" disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? "Reading screenshot…" : "Upload screenshot"}
        </button>
        {err && <div className="mini" style={{ color: "var(--red)", marginTop: 9 }}>{err}</div>}
      </div>

      {found && (
        <div className="card tight">
          {found.map((m, i) => (
            m.p
              ? <PlayerRow key={i} p={m.p} right={<div className="num" style={{ fontWeight: 700 }}>{m.p.adp}</div>} />
              : <div key={i} className="plr"><div className="mini" style={{ color: "var(--red)" }}>Couldn't match "{m.raw}"</div></div>
          ))}
        </div>
      )}

      {found && ids.length > 2 && (
        <>
          {save && (
            <button className="btn" style={{ marginBottom: 9 }} onClick={() => {
              save({ ...my, ids });
              toast(`Saved ${ids.length} players`);
            }}>Save as my roster</button>
          )}
          {!analysis && <button className="btn blue" onClick={analyze}>Find trades for this roster</button>}
        </>
      )}

      {analysis && (
        <>
          <div className="card fdl" style={{ paddingLeft: 15 }}>
            <div className="eyebrow">Biggest hole</div>
            <h2 style={{ fontSize: 26, margin: "5px 0 7px" }}>{analysis.weak}</h2>
            <div className="mini">Deals below all send out a position where this roster already has starters banked.</div>
          </div>
          {analysis.trades.length === 0 && <div className="card"><div className="mini">No clean fits — this roster is balanced. Hold and work the wire instead.</div></div>}
          {analysis.trades.map((t, i) => (
            <div key={i} className="card">
              <div className="row sp" style={{ marginBottom: 9 }}>
                <div className="eyebrow">Target {i + 1}</div>
                <div className="chip on">{Math.round(t.ratio * 100)}% value back</div>
              </div>
              <div className="grid2">
                <div>
                  <div className="eyebrow" style={{ marginBottom: 4 }}>Send</div>
                  {t.give.map((id) => <div key={id} className="mini" style={{ color: "var(--chalk)" }}>{BY_ID[id].name}</div>)}
                </div>
                <div>
                  <div className="eyebrow" style={{ marginBottom: 4 }}>Ask for</div>
                  {t.getIds.map((id) => <div key={id} className="mini" style={{ color: "var(--chalk)" }}>{BY_ID[id].name}</div>)}
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </>
  );
}

/* ============================================================
   TOOLS — compare, sleepers, GM chat
   ============================================================ */

function ToolsView({ lg, toast }) {
  const [mode, setMode] = useState("vs");
  return (
    <div className="wrap">
      <div className="scroll-x" style={{ marginBottom: 12 }}>
        {[["vs", "A over B"], ["sleep", "Value radar"], ["gm", "Ask your GM"]].map(([k, l]) => (
          <button key={k} className={`chip ${mode === k ? "on" : ""}`} onClick={() => setMode(k)}>{l}</button>
        ))}
      </div>
      {mode === "vs" && <Versus lg={lg} />}
      {mode === "sleep" && <Radar lg={lg} />}
      {mode === "gm" && <GMChat lg={lg} />}
    </div>
  );
}

function Versus({ lg }) {
  const values = useMemo(() => buildValues(lg, lg.season), [lg]);
  const [a, setA] = useState(PLAYERS[12]);
  const [b, setB] = useState(PLAYERS[19]);
  const [pick, setPick] = useState(null);
  const [take, setTake] = useState("");
  const [busy, setBusy] = useState(false);
  const ppr = lg.settings.ppr;
  const myIds = lg.rosters?.[lg.settings.userSlot] || [];

  const score = (p) => {
    const scarcity = { QB: lg.settings.superflex ? 1.06 : 0.9, RB: 1.08, WR: 1.0, TE: 1.05, K: 0.6, DST: 0.6 }[p.pos];
    const byeClash = myIds.filter((id) => BY_ID[id].bye === p.bye).length;
    return {
      raw: proj(p, ppr),
      adj: values[p.id].tv * scarcity,
      byeClash,
      upside: p.spread,
    };
  };
  const sa = score(a), sb = score(b);
  const winner = sa.adj - sa.byeClash * 0.6 >= sb.adj - sb.byeClash * 0.6 ? a : b;
  const margin = Math.abs(sa.adj - sb.adj) / Math.max(1, (sa.adj + sb.adj) / 2);

  const ask = async () => {
    setBusy(true);
    try {
      const t = await askClaude(
        `Fantasy football 2026, ${lg.settings.teams}-team ${ppr === 1 ? "full PPR" : ppr === 0.5 ? "half PPR" : "standard"}${lg.settings.superflex ? " superflex" : ""}. ` +
        `Who would you draft: ${a.name} (${a.pos}, ${a.team}, ADP ${a.adp}) or ${b.name} (${b.pos}, ${b.team}, ADP ${b.adp})? ` +
        `Give a 3-sentence take: the case for each, then your pick. No preamble.`,
        "You are a sharp, concise fantasy football analyst. Be decisive and specific. Never hedge into 'it depends on your league' filler.", 400);
      setTake(t);
    } catch { setTake("Couldn't reach the analyst right now."); }
    setBusy(false);
  };

  const Col = ({ p, s, on }) => (
    <div className="card" style={{ borderColor: on ? "var(--first)" : "var(--line)", marginBottom: 0 }}
      onClick={() => setPick(p === a ? "a" : "b")}>
      <div className={POSC(p.pos)} style={{ marginBottom: 7 }}>{p.pos === "DST" ? "DEF" : p.pos}</div>
      <div className="nm" style={{ fontSize: 15, marginBottom: 3 }}>{p.name}</div>
      <div className="sub" style={{ marginBottom: 9 }}>{p.team} · ADP {p.adp} · Bye {p.bye || "—"}</div>
      <div className="row sp mini"><span>Proj</span><b className="num" style={{ color: "var(--chalk)" }}>{Math.round(s.raw)}</b></div>
      <div className="row sp mini"><span>Value score</span><b className="num" style={{ color: "var(--chalk)" }}>{s.adj.toFixed(1)}</b></div>
      <div className="row sp mini"><span>Volatility</span><b className="num" style={{ color: "var(--chalk)" }}>{(s.upside * 100).toFixed(0)}%</b></div>
      {s.byeClash > 1 && <div className="mini" style={{ color: "var(--red)", marginTop: 6 }}>{s.byeClash} others on wk {p.bye} bye</div>}
    </div>
  );

  return (
    <>
      <div className="grid2" style={{ marginBottom: 11 }}>
        <Col p={a} s={sa} on={winner === a} />
        <Col p={b} s={sb} on={winner === b} />
      </div>
      <div className="grid2" style={{ marginBottom: 11 }}>
        <button className="chip" onClick={() => setPick("a")}>Change left</button>
        <button className="chip" onClick={() => setPick("b")}>Change right</button>
      </div>
      <div className="card fdl" style={{ paddingLeft: 15 }}>
        <div className="eyebrow">The model says</div>
        <h2 style={{ fontSize: 24, margin: "6px 0 8px" }}>{winner.name}</h2>
        <div className="mini">
          {margin < 0.06 ? "Effectively a coin flip — take the one whose role you believe in more." :
            margin < 0.18 ? "A real but modest edge." : "Clear separation."}
          {" "}Positional replacement level does most of the work here: {winner.pos} depth in a {lg.settings.teams}-team league
          means the drop-off after {winner.name} is {winner.pos === "RB" || winner.pos === "TE" ? "steep" : "gentle"}.
          {sa.byeClash > 1 || sb.byeClash > 1 ? " Bye overlap on your roster is factored in." : ""}
        </div>
        <button className="btn alt" style={{ marginTop: 11 }} disabled={busy} onClick={ask}>
          {busy ? "Thinking…" : "Get a second opinion"}
        </button>
        {take && <div className="mini" style={{ marginTop: 11, whiteSpace: "pre-wrap", color: "var(--chalk)" }}>{take}</div>}
      </div>
      <PlayerPicker open={!!pick} onClose={() => setPick(null)} title="Pick a player"
        onPick={(p) => { pick === "a" ? setA(p) : setB(p); setPick(null); }} />
    </>
  );
}

function Radar({ lg }) {
  const ppr = lg.settings.ppr;
  const rows = useMemo(() => {
    const values = buildValues(lg, null);
    return PLAYERS.filter((p) => p.adp > 60 && !["K", "DST"].includes(p.pos))
      .map((p) => ({ p, edge: values[p.id].tv / Math.max(1, Math.pow(p.adp, 0.62)) }))
      .sort((x, y) => y.edge - x.edge).slice(0, 22);
  }, [lg]);
  return (
    <>
      <div className="card">
        <div className="eyebrow">Value radar</div>
        <div className="mini" style={{ marginTop: 6 }}>
          Points over replacement divided by what it costs to get there. Everything here is going after pick 60, where the
          gap between price and production is widest.
        </div>
      </div>
      <div className="card tight">
        {rows.map(({ p, edge }, i) => (
          <PlayerRow key={p.id} p={p}
            sub={`${p.team} · ADP ${p.adp} · ${Math.round(proj(p, ppr))} proj pts`}
            right={<div style={{ textAlign: "right", width: 62 }}>
              <div className="bar"><i style={{ width: `${(edge / rows[0].edge) * 100}%` }} /></div>
              <div className="sub" style={{ marginTop: 3 }}>#{i + 1}</div>
            </div>} />
        ))}
      </div>
    </>
  );
}

function GMChat({ lg }) {
  const [msgs, setMsgs] = useState([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const values = useMemo(() => buildValues(lg, lg.season), [lg]);
  const myIds = lg.rosters?.[lg.settings.userSlot] || [];

  const send = async () => {
    if (!q.trim() || busy) return;
    const question = q; setQ("");
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setBusy(true);
    const roster = myIds.map((id) => {
      const p = BY_ID[id];
      return `${p.name} (${p.pos}, ${p.team}, bye ${p.bye}, ${values[id].ppg.toFixed(1)} proj ppg)`;
    }).join("; ") || "no roster drafted yet";
    const ctx = `League: ${lg.settings.teams} teams, ${lg.settings.ppr === 1 ? "full PPR" : lg.settings.ppr === 0.5 ? "half PPR" : "standard"}${lg.settings.superflex ? ", superflex" : ""}. ` +
      (lg.season ? `Currently week ${lg.season.week}, record ${lg.season.record[lg.settings.userSlot].w}-${lg.season.record[lg.settings.userSlot].l}. ` : "Preseason. ") +
      `My roster: ${roster}.`;
    try {
      const t = await askClaude(`${ctx}\n\nQuestion: ${question}`,
        "You are the user's fantasy football co-GM for the 2026 NFL season. Be specific, decisive, and brief — 4 sentences max unless asked for depth. Reference their actual roster. Skip disclaimers.", 700);
      setMsgs((m) => [...m, { role: "gm", text: t }]);
    } catch {
      setMsgs((m) => [...m, { role: "gm", text: "Couldn't reach the analyst. Try again." }]);
    }
    setBusy(false);
  };

  return (
    <>
      <div className="card">
        <div className="eyebrow">Co-GM</div>
        <div className="mini" style={{ marginTop: 6 }}>Knows your roster, your scoring, and where you sit in the standings. Ask start/sit, buy-low, or draft strategy.</div>
      </div>
      {msgs.map((m, i) => (
        <div key={i} className="card" style={{ borderColor: m.role === "user" ? "var(--line)" : "var(--first)", background: m.role === "user" ? "var(--panel2)" : "var(--panel)" }}>
          <div className="eyebrow" style={{ marginBottom: 5 }}>{m.role === "user" ? "You" : "Co-GM"}</div>
          <div className="mini" style={{ color: "var(--chalk)", whiteSpace: "pre-wrap" }}>{m.text}</div>
        </div>
      ))}
      {busy && <div className="card"><div className="mini">Thinking…</div></div>}
      <div className="row" style={{ gap: 7, marginTop: 4 }}>
        <input placeholder="Who do I start at flex?" value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()} />
        <button className="btn sm" onClick={send} disabled={busy}>Ask</button>
      </div>
    </>
  );
}


/* ============================================================
   REAL-TEAM MODE
   Trade Help and Draft Help work on the roster you actually own,
   with no mock league required. Saved separately from any league.
   ============================================================ */

export const VERSION = "1.1.0";
const MY_KEY = "huddle:myteam";

const DEFAULT_MY = { ids: [], teams: 12, ppr: 1, superflex: false, name: "My Team" };

// a minimal league-shaped object so the engine works outside a mock draft
function shellLeague(my) {
  return {
    id: "real", name: my.name,
    settings: { teams: my.teams, rounds: 15, ppr: my.ppr, superflex: my.superflex, userSlot: 0, faab: 100, waiverMode: "faab" },
    gms: [{ idx: 0, name: my.name, isUser: true }],
    order: [], picks: [], rosters: { 0: my.ids }, season: null,
  };
}

function useMyTeam() {
  const [my, setMy] = useState(DEFAULT_MY);
  const [ready, setReady] = useState(false);
  useEffect(() => { store.get(MY_KEY).then((v) => { if (v) setMy({ ...DEFAULT_MY, ...v }); setReady(true); }); }, []);
  const save = useCallback((next) => { setMy(next); store.set(MY_KEY, next); }, []);
  return [my, save, ready];
}

/* ---- roster manager: the spine of real-team mode ---- */

function MyRoster({ my, save, toast, compact }) {
  const [pick, setPick] = useState(false);
  const lg = shellLeague(my);
  const values = useMemo(() => buildValues(lg, null), [my.ids.length, my.ppr, my.teams, my.superflex]);
  const sorted = [...my.ids].sort((a, b) => values[b].ppg - values[a].ppg);

  return (
    <>
      <div className="card">
        <div className="row sp" style={{ marginBottom: compact ? 0 : 10 }}>
          <div>
            <div className="eyebrow">Your roster</div>
            <div className="disp" style={{ fontSize: 24, marginTop: 3 }}>{my.ids.length} players</div>
          </div>
          <button className="chip on" onClick={() => setPick(true)}>+ Add player</button>
        </div>
        {!compact && (
          <div className="grid3" style={{ marginTop: 4 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 4 }}>Teams</div>
              <select value={my.teams} onChange={(e) => save({ ...my, teams: +e.target.value })}>
                {[8, 10, 12, 14].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 4 }}>Scoring</div>
              <select value={my.ppr} onChange={(e) => save({ ...my, ppr: +e.target.value })}>
                <option value={1}>PPR</option><option value={0.5}>Half</option><option value={0}>Std</option>
              </select>
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 4 }}>Format</div>
              <select value={my.superflex ? "sf" : "std"} onChange={(e) => save({ ...my, superflex: e.target.value === "sf" })}>
                <option value="std">1 QB</option><option value="sf">Superflex</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {my.ids.length > 0 && (
        <div className="card tight">
          {sorted.map((id) => (
            <PlayerRow key={id} p={BY_ID[id]} sub={`${BY_ID[id].team} · Bye ${BY_ID[id].bye || "—"} · ${values[id].ppg.toFixed(1)} ppg`}
              right={<button className="chip" onClick={() => save({ ...my, ids: my.ids.filter((x) => x !== id) })}>Remove</button>} />
          ))}
        </div>
      )}

      <PlayerPicker open={pick} onClose={() => setPick(false)} title="Add to your roster"
        pool={PLAYERS.filter((p) => !my.ids.includes(p.id))}
        onPick={(p) => { save({ ...my, ids: [...my.ids, p.id] }); toast(`${p.name} added`); }} />
    </>
  );
}

/* ---- TRADE HELP ---- */

function TradeHelp({ my, save, toast }) {
  const [mode, setMode] = useState("shot");
  const lg = shellLeague(my);
  return (
    <div className="wrap">
      <div className="scroll-x" style={{ marginBottom: 12 }}>
        {[["shot", "Screenshot"], ["calc", "Analyzer"], ["find", "Find targets"], ["roster", "My roster"]].map(([k, l]) => (
          <button key={k} className={`chip ${mode === k ? "on" : ""}`} onClick={() => setMode(k)}>{l}</button>
        ))}
      </div>
      {mode === "shot" && <ShotFinder lg={lg} toast={toast} my={my} save={save} />}
      {mode === "calc" && <TradeCalc lg={lg} />}
      {mode === "find" && (my.ids.length > 2
        ? <RealTradeFinder my={my} />
        : <div className="card"><div className="mini">Add your roster first — screenshot it or tap "My roster" to build it by hand.</div></div>)}
      {mode === "roster" && <MyRoster my={my} save={save} toast={toast} />}
    </div>
  );
}

// no real counterparties outside a mock league, so build a market from the pool
function RealTradeFinder({ my }) {
  const lg = shellLeague(my);
  const { values, trades, weak } = useMemo(() => {
    const values = buildValues(lg, null);
    const mine = new Set(my.ids);
    const pool = PLAYERS.filter((p) => !mine.has(p.id) && p.adp <= 190);
    const rosters = {};
    const n = Math.max(3, my.teams - 1);
    for (let i = 0; i < n; i++) rosters[i + 100] = [];
    pool.forEach((p, i) => rosters[(i % n) + 100].push(p.id));
    const fake = { ...lg, settings: { ...lg.settings, userSlot: -1 } };
    return { values, trades: findTrades(fake, my.ids, values, rosters), weak: weakestPosFromIds(my.ids, values) };
  }, [my]);

  return (
    <>
      <div className="card fdl" style={{ paddingLeft: 15 }}>
        <div className="eyebrow">Biggest hole</div>
        <h2 style={{ fontSize: 26, margin: "5px 0 7px" }}>{weak}</h2>
        <div className="mini">
          Every deal below sends out a spot where you already have starters banked. Values are rest-of-season
          points over replacement for a {my.teams}-team {my.ppr === 1 ? "PPR" : my.ppr === 0.5 ? "half-PPR" : "standard"} league.
        </div>
      </div>
      {trades.length === 0 && <div className="card"><div className="mini">No clean fits — your roster is balanced enough that every deal costs about what it returns. Work the wire instead.</div></div>}
      {trades.map((t, i) => (
        <div key={i} className="card">
          <div className="row sp" style={{ marginBottom: 9 }}>
            <div className="eyebrow">Target {i + 1}</div>
            <div className="chip on">{Math.round(t.ratio * 100)}% value back</div>
          </div>
          <div className="grid2" style={{ marginBottom: 9 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 4 }}>Send</div>
              {t.give.map((id) => <div key={id} className="mini" style={{ color: "var(--chalk)" }}>{BY_ID[id].name} <span style={{ color: "var(--mute)" }}>{BY_ID[id].pos}</span></div>)}
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 4 }}>Ask for</div>
              {t.getIds.map((id) => <div key={id} className="mini" style={{ color: "var(--chalk)" }}>{BY_ID[id].name} <span style={{ color: "var(--mute)" }}>{BY_ID[id].pos}</span></div>)}
            </div>
          </div>
          <div className="mini">You're deep at {BY_ID[t.give[0]].pos} and thin at {weak}. Pitch it to whoever in your league is short {BY_ID[t.give[0]].pos}.</div>
        </div>
      ))}
    </>
  );
}

/* ---- DRAFT HELP ---- */

function DraftHelp({ my, save, toast }) {
  const [mode, setMode] = useState("vs");
  const lg = shellLeague(my);
  return (
    <div className="wrap">
      <div className="scroll-x" style={{ marginBottom: 12 }}>
        {[["vs", "A over B"], ["radar", "Value radar"], ["gm", "Ask your GM"], ["roster", "My roster"]].map(([k, l]) => (
          <button key={k} className={`chip ${mode === k ? "on" : ""}`} onClick={() => setMode(k)}>{l}</button>
        ))}
      </div>
      {mode === "vs" && <Versus lg={lg} />}
      {mode === "radar" && <Radar lg={lg} />}
      {mode === "gm" && <GMChat lg={lg} />}
      {mode === "roster" && <MyRoster my={my} save={save} toast={toast} />}
    </div>
  );
}

/* ---- SETTINGS ---- */

function Settings({ my, save, toast, onWipe }) {
  const [leagues, setLeagues] = useState([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  useEffect(() => { store.get("huddle:index").then((v) => setLeagues(v || [])); }, []);

  const refresh = async () => {
    setBusy(true);
    try {
      if ("caches" in window) { const ks = await caches.keys(); await Promise.all(ks.map((k) => caches.delete(k))); }
      if (navigator.serviceWorker?.getRegistrations) {
        const rs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(rs.map((r) => r.unregister()));
      }
    } catch { }
    window.location.reload();
  };

  const exportAll = async () => {
    const idx = (await store.get("huddle:index")) || [];
    const lgs = {};
    for (const m of idx) lgs[m.id] = await store.get(`huddle:lg:${m.id}`);
    const blob = new Blob([JSON.stringify({ version: VERSION, savedAt: Date.now(), myTeam: my, leagues: lgs }, null, 2)],
      { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `huddle-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(a.href);
    toast("Save downloaded");
  };

  const importAll = async (file) => {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data.myTeam) save({ ...DEFAULT_MY, ...data.myTeam });
      if (data.leagues) {
        const idx = [];
        for (const [id, lg] of Object.entries(data.leagues)) {
          if (!lg) continue;
          await store.set(`huddle:lg:${id}`, lg);
          idx.push({ id, name: lg.name, teams: lg.settings.teams, at: Date.now(), phase: "Imported" });
        }
        await store.set("huddle:index", idx); setLeagues(idx);
      }
      toast("Save imported");
    } catch { toast("That file didn't parse"); }
  };

  return (
    <div className="wrap">
      <div className="card fdl m" style={{ paddingLeft: 15 }}>
        <div className="eyebrow">Version</div>
        <h1 className="num" style={{ fontSize: 38, margin: "4px 0 6px" }}>{VERSION}</h1>
        <div className="mini">2026 player pool · consensus ADP through Aug 10 · real 2026 byes</div>
        <button className="btn alt" style={{ marginTop: 12 }} disabled={busy} onClick={refresh}>
          {busy ? "Refreshing…" : "Fetch new version"}
        </button>
        <div className="mini" style={{ marginTop: 7 }}>Clears the cached app and reloads. Your saved data stays put.</div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: 19, marginBottom: 9 }}>Save & restore</h2>
        <div className="mini" style={{ marginBottom: 11 }}>
          Everything lives in this browser only. Export before you clear site data, switch phones, or reinstall —
          the file holds your roster and every mock league.
        </div>
        <div className="grid2">
          <button className="btn alt" onClick={exportAll}>Download save</button>
          <button className="btn alt" onClick={() => fileRef.current?.click()}>Import save</button>
        </div>
        <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }}
          onChange={(e) => importAll(e.target.files?.[0])} />
      </div>

      <div className="card">
        <h2 style={{ fontSize: 19, marginBottom: 9 }}>Stored data</h2>
        <div className="row sp mini" style={{ marginBottom: 5 }}>
          <span>Your roster</span><b style={{ color: "var(--chalk)" }}>{my.ids.length} players</b>
        </div>
        <div className="row sp mini" style={{ marginBottom: 11 }}>
          <span>Mock leagues</span><b style={{ color: "var(--chalk)" }}>{leagues.length}</b>
        </div>
        <button className="btn alt" style={{ color: "var(--red)" }} onClick={async () => {
          if (!window.confirm("Delete your roster and every saved league? This can't be undone.")) return;
          const idx = (await store.get("huddle:index")) || [];
          for (const m of idx) await store.del(`huddle:lg:${m.id}`);
          await store.set("huddle:index", []); await store.del(MY_KEY);
          save(DEFAULT_MY); setLeagues([]); onWipe(); toast("Everything cleared");
        }}>Clear all data</button>
      </div>

      <div className="card">
        <h2 style={{ fontSize: 19, marginBottom: 9 }}>About the numbers</h2>
        <div className="mini">
          Projections are curve-derived from consensus ADP, not scraped expert projections — ranking order is
          accurate, absolute point totals are estimates. Byes are the real 2026 schedule: six teams are off in
          Week 11, and nobody is off in Week 12.
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   APP SHELL
   ============================================================ */

function Hub({ go, my }) {
  const tiles = [
    { k: "mock", cls: "", h: "Mock Season", d: "Snake draft against seven personalities, then play all 17 weeks — injuries, waivers, playoffs.", go: "Draft now" },
    { k: "trade", cls: "b", h: "Trade Help", d: "Screenshot your roster, analyze any offer, and find deals both sides would actually take.", go: "Open" },
    { k: "draft", cls: "g", h: "Draft Help", d: "Player A over player B with the reasoning, value radar, and a co-GM that knows your team.", go: "Open" },
    { k: "settings", cls: "m", h: "Settings", d: `Version ${VERSION} · save and restore your roster and leagues.`, go: "Open" },
  ];
  return (
    <div className="wrap top">
      <div style={{ padding: "10px 0 20px" }}>
        <h1 style={{ fontSize: 64, letterSpacing: "-.02em", lineHeight: .9 }}>Huddle</h1>
        <div className="row" style={{ gap: 9, marginTop: 10 }}>
          <div style={{ width: 34, height: 3, background: "var(--first)" }} />
          <div className="eyebrow">2026 fantasy football</div>
        </div>
      </div>
      <div className="hub">
        {tiles.map((t) => (
          <button key={t.k} className={`tile ${t.cls}`} onClick={() => go(t.k)}>
            <h3>{t.h}</h3>
            <div className="mini">{t.d}</div>
            <div className="go">{t.go} →</div>
          </button>
        ))}
      </div>
      {my.ids.length > 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="row sp">
            <div>
              <div className="eyebrow">Saved roster</div>
              <div className="mini" style={{ marginTop: 3 }}>{my.ids.length} players · {my.teams}-team {my.ppr === 1 ? "PPR" : my.ppr === 0.5 ? "half PPR" : "standard"}</div>
            </div>
            <button className="chip on" onClick={() => go("trade")}>Trade help</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("hub");
  const [lg, setLg] = useState(null);
  const [tab, setTab] = useState("draft");
  const [toastMsg, setToastMsg] = useState("");
  const [my, saveMy] = useMyTeam();
  const saveTimer = useRef(null);

  const toast = useCallback((m) => { setToastMsg(m); setTimeout(() => setToastMsg(""), 1800); }, []);

  useEffect(() => {
    if (!lg) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveLeague(lg), 700);
    return () => clearTimeout(saveTimer.current);
  }, [lg]);

  const openLeague = (l) => { setLg(l); setTab(draftDone(l) ? (l.season ? "season" : "team") : "draft"); };
  const home = () => { if (lg) saveLeague(lg); setLg(null); setScreen("hub"); };

  const TITLES = { mock: "Mock Season", trade: "Trade Help", draft: "Draft Help", settings: "Settings" };

  return (
    <div className="hd">
      <style>{CSS}</style>

      {screen === "hub" && <Hub go={setScreen} my={my} />}

      {screen !== "hub" && (
        <>
          <div className="hdr">
            <button className="chip" onClick={lg ? () => { saveLeague(lg); setLg(null); } : home}>← Back</button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="nm" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {lg ? lg.name : TITLES[screen]}
              </div>
              <div className="sub">
                {lg
                  ? (lg.season ? (lg.season.champion != null ? "Season complete" : `Week ${lg.season.week}`)
                    : draftDone(lg) ? "Draft complete" : `Pick ${lg.picks.length + 1} of ${lg.order.length}`)
                  : screen === "mock" ? "Pick up where you left off" : `Huddle ${VERSION}`}
              </div>
            </div>
            {lg && <button className="chip" onClick={home}>Home</button>}
          </div>

          <div style={{ paddingBottom: 8 }}>
            {screen === "mock" && !lg && <MockHome onOpen={openLeague} onCreate={(l) => { setLg(l); setTab("draft"); }} />}
            {screen === "mock" && lg && (
              <>
                {tab === "draft" && <DraftRoom lg={lg} setLg={setLg} toast={toast} />}
                {tab === "team" && <TeamView lg={lg} setLg={setLg} toast={toast} />}
                {tab === "season" && <SeasonView lg={lg} setLg={setLg} toast={toast} />}
                {tab === "trades" && <TradesView lg={lg} toast={toast} />}
                {tab === "tools" && <ToolsView lg={lg} toast={toast} />}
              </>
            )}
            {screen === "trade" && <TradeHelp my={my} save={saveMy} toast={toast} />}
            {screen === "draft" && <DraftHelp my={my} save={saveMy} toast={toast} />}
            {screen === "settings" && <Settings my={my} save={saveMy} toast={toast} onWipe={() => setLg(null)} />}
          </div>

          {screen === "mock" && lg && (
            <div className="tabs">
              {[["draft", "Draft"], ["team", "Team"], ["season", "Season"], ["trades", "Trades"], ["tools", "Tools"]].map(([k, l]) => (
                <button key={k} className={`tab ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>{l}</button>
              ))}
            </div>
          )}
        </>
      )}
      <Toast msg={toastMsg} />
    </div>
  );
}
