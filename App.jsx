import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { loadInjuries, INJURY_LEVELS, isStale, CACHE_KEY as INJURY_CACHE_KEY } from "./sleeper.js";

/* ============================================================
   HUDDLE, a 2026 fantasy football command center

   Data: consensus PPR ADP (top 300) as of Aug 10 2026, real 2026 byes.
   Projections are built from ADP, so ranking order is accurate while
   absolute point totals are estimates.

   MAP OF THIS FILE, top to bottom:

     1. DATA          player pool, bye weeks, projection curves
     2. SCORING       stat lines and custom scoring rules
     3. LEAGUE        league creation, snake order, roster rules
     4. CPU DRAFTING  roster rules plus tier and dropoff reasoning
     5. SCHEDULE      generated NFL slate and defensive strength
     6. VALUATION     rest-of-season value, replacement level, trades
     7. SEASON        weekly simulation, injuries, waivers, playoffs
     8. STORAGE       saves, the recovery mirror, the Claude helper
     9. SHARED UI     sheets, player rows, the tappable player card
    10. MOCK SCREENS  draft room, team, season, trades, tools
    11. REAL SCREENS  trade help, draft help, roster, settings
    12. APP SHELL     navigation and top level state

   Two vocabularies appear throughout and mean different things:
   "mock" is the simulated league, "real" is the roster the person
   actually owns in their own league.
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

/* ===== 2. SCORING =====
   
   Baselines are full-PPR season totals. To make custom scoring actually move
   projections, each player is given an implied stat line: the split of where
   his points come from, back-solved so that default PPR scoring reproduces his
   baseline exactly. Change a rule and the projection moves the right way. */

export const DEFAULT_SCORING = {
  rec: 1,            // per reception
  recYd: 0.1,        // per receiving yard
  recTD: 6,
  rushYd: 0.1,
  rushTD: 6,
  passYd: 0.04,
  passTD: 4,
  int: -2,
  fumble: -2,
  tePremium: 0,      // extra points per reception for tight ends only
  bonus100: 0,       // per 100-yard rushing or receiving game
  dstMult: 1,
  kMult: 1,
};

// where a season's points come from, by position
const SPLIT = {
  QB:  { passYd: .46, passTD: .30, rushYd: .14, rushTD: .10 },
  RB:  { rushYd: .44, rushTD: .21, rec: .13, recYd: .17, recTD: .05 },
  WR:  { rec: .22, recYd: .48, recTD: .27, rushYd: .03 },
  TE:  { rec: .26, recYd: .48, recTD: .26 },
  K:   { kick: 1 },
  DST: { def: 1 },
};

// back-solve the stat line that yields `base` under DEFAULT_SCORING
export function statLine(p) {
  if (p._stats) return p._stats;
  const sp = SPLIT[p.pos] || SPLIT.WR;
  const B = p.base;
  const D = DEFAULT_SCORING;

  // turnovers scale with volume and sit outside the positive split
  const int_ = p.pos === "QB" ? Math.max(3, 11 * (B / 330)) : 0;
  const fum = p.pos === "QB" ? 4 * (B / 330) : p.pos === "RB" ? 2.2 * (B / 300) : 1.1 * (B / 300);
  // positive production has to cover the baseline AND the turnover cost, or
  // default scoring would not reproduce the player's baseline
  const penalty = int_ * Math.abs(D.int) + fum * Math.abs(D.fumble);
  const T = B + penalty;

  const st = {
    rec: (T * (sp.rec || 0)) / D.rec,
    recYd: (T * (sp.recYd || 0)) / D.recYd,
    recTD: (T * (sp.recTD || 0)) / D.recTD,
    rushYd: (T * (sp.rushYd || 0)) / D.rushYd,
    rushTD: (T * (sp.rushTD || 0)) / D.rushTD,
    passYd: (T * (sp.passYd || 0)) / D.passYd,
    passTD: (T * (sp.passTD || 0)) / D.passTD,
    kick: B * (sp.kick || 0),
    def: B * (sp.def || 0),
    int: int_,
    fumble: fum,
  };
  // roughly how many 100-yard rushing or receiving games this player has
  const yds = st.rushYd + st.recYd;
  st.games100 = Math.max(0, Math.min(15, (yds - 700) / 78));
  p._stats = st;
  return st;
}

export function resolveScoring(x) {
  if (x && typeof x === "object") return { ...DEFAULT_SCORING, ...x };
  // legacy: a bare number is the old ppr setting
  const ppr = typeof x === "number" ? x : 1;
  return { ...DEFAULT_SCORING, rec: ppr };
}

export function projectPoints(p, scoring) {
  const sc = resolveScoring(scoring);
  const st = statLine(p);
  if (p.pos === "K") return st.kick * sc.kMult;
  if (p.pos === "DST") return st.def * sc.dstMult;
  const recPts = st.rec * (sc.rec + (p.pos === "TE" ? sc.tePremium : 0));
  return Math.max(0,
    recPts +
    st.recYd * sc.recYd +
    st.recTD * sc.recTD +
    st.rushYd * sc.rushYd +
    st.rushTD * sc.rushTD +
    st.passYd * sc.passYd +
    st.passTD * sc.passTD +
    st.int * sc.int +
    st.fumble * sc.fumble +
    st.games100 * sc.bonus100
  );
}

export function proj(p, scoring = 1) {
  return projectPoints(p, scoring);
}

// what a league actually scores with, tolerating older saves
export function scoringOf(lg) {
  return resolveScoring(lg?.settings?.scoring ?? lg?.settings?.ppr ?? 1);
}

export const SCORING_PRESETS = [
  { key: "ppr", label: "Full PPR", patch: { rec: 1, tePremium: 0, passTD: 4 } },
  { key: "half", label: "Half PPR", patch: { rec: 0.5, tePremium: 0, passTD: 4 } },
  { key: "std", label: "Standard", patch: { rec: 0, tePremium: 0, passTD: 4 } },
  { key: "tep", label: "TE Premium", patch: { rec: 1, tePremium: 0.5, passTD: 4 } },
  { key: "six", label: "6pt Pass TD", patch: { rec: 1, tePremium: 0, passTD: 6 } },
  { key: "bonus", label: "Yardage Bonus", patch: { rec: 1, bonus100: 3 } },
];

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
  { key: "value", label: "Best available", reach: 2.5, needW: 0.35, posBias: {},
    blurb: "Takes the highest player on the board and sorts out roster holes later." },
  { key: "needy", label: "Roster builder", reach: 4.5, needW: 1.15, posBias: {},
    blurb: "Fills starting slots in order. Rarely takes a third back before a first tight end." },
  { key: "zeroRB", label: "Zero RB", reach: 5.0, needW: 0.6, posBias: { WR: -10, TE: -5, RB: 14 },
    rules: { noRBBefore: 5 },
    blurb: "Loads up on receivers early and waits until the middle rounds for backs." },
  { key: "heroRB", label: "Hero RB", reach: 5.0, needW: 0.6, posBias: { RB: -11, WR: 6 },
    rules: { rbCap: 1, rbCapUntil: 7 },
    blurb: "Takes one anchor back early, then ignores the position for a long stretch." },
  { key: "lateQB", label: "Late-round QB", reach: 3.5, needW: 0.7, posBias: { QB: 22, TE: -4 },
    rules: { noQBBefore: 8 },
    blurb: "Refuses to pay for a quarterback and streams from the back of the pack." },
  { key: "eliteTE", label: "Elite TE", reach: 4.0, needW: 0.7, posBias: { TE: -14, WR: 4 },
    rules: { mustTEBy: 4 },
    blurb: "Pays up for a top tight end to win the position every week." },
  { key: "homer", label: "Reacher", reach: 9.0, needW: 0.8, posBias: {},
    blurb: "Falls in love with guys and takes them a round or two early. Every league has one." },
  { key: "sharp", label: "Analytics", reach: 3.0, needW: 0.55, posBias: { K: 30, DST: 22 },
    blurb: "Values discipline, waits on kicker and defense until the very last picks." },
  { key: "upside", label: "Upside hunter", reach: 6.0, needW: 0.5, posBias: {}, riskLove: 1.8,
    blurb: "Chases ceiling over floor, especially with young players in the later rounds." },
  { key: "safe", label: "Floor merchant", reach: 3.0, needW: 0.8, posBias: {}, riskLove: -1.4,
    blurb: "Wants proven, stable roles. Avoids volatile players even at a discount." },
];

export const personaByKey = (key) => PERSONAS.find((p) => p.key === key) || PERSONAS[0];

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
   ENGINE: CPU drafting, player valuation, season simulation
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
      persona: isUser ? null : (cfg.personas?.[i] || PERSONAS[Math.floor(Math.random() * PERSONAS.length)].key),
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
    settings: { teams, rounds, ppr, scoring: resolveScoring(cfg.scoring ?? ppr), superflex, userSlot, faab: cfg.faabBudget ?? 100, waiverMode: cfg.waiverMode || "faab" },
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

/* ===== 4. CPU DRAFTING =====
   Hard roster rules plus tier and dropoff reasoning.
   These GMs draft the way a good league drafts: starters before backups,
   never a kicker in round 9, never a third QB, and they weigh how much
   value actually falls off before their next turn instead of just ADP. */

// how many starters a real roster wants at each position
function startersWanted(superflex) {
  return superflex
    ? { QB: 2, RB: 2, WR: 3, TE: 1, K: 1, DST: 1 }
    : { QB: 1, RB: 2, WR: 3, TE: 1, K: 1, DST: 1 };
}
// hard ceilings. nobody rosters five tight ends
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

/* Best starting lineup a set of players can field, scored by any ppg function.
   The draft uses this to ask the only question that matters: how much does this
   pick improve the eleven I actually start? A fourth receiver adds nothing, a
   third quarterback adds nothing, and the model now knows that without needing
   a hand-tuned table of roster needs. */
export function bestStarterPoints(lg, entries) {
  const slots = lineupFor(lg.settings);
  const sorted = entries.slice().sort((a, b) => b.ppg - a.ppg);
  const used = new Set();
  let total = 0;
  for (const slot of slots) {
    for (let i = 0; i < sorted.length; i++) {
      if (used.has(i)) continue;
      if (!slot.accepts.includes(sorted[i].pos)) continue;
      used.add(i); total += sorted[i].ppg; break;
    }
  }
  return total;
}

export function aiPick(lg, gmIdx, available) {
  const g = lg.gms[gmIdx];
  const P = PERSONAS.find((p) => p.key === g.persona) || PERSONAS[0];
  const { rounds, superflex, teams } = lg.settings;
  const ppr = scoringOf(lg);   // full scoring object, not the legacy number
  const round = roundOf(lg, lg.picks.length);
  const ids = lg.rosters[gmIdx];
  const counts = rosterCounts(ids);
  const cap = posCap(superflex);
  const want = startersWanted(superflex);
  const left = rounds - ids.length;             // picks this GM has remaining
  const gap = picksUntilNext(lg, gmIdx);
  const overall = lg.picks.length + 1;

  /* An elite drafter does not spend an eighth round pick on someone who is on
     injured reserve. Live injury data, when loaded, discounts the projection
     the CPU is drafting against. */
  const projOf = (p) => {
    const live = injuryFor(p.id);
    return proj(p, ppr) * (live ? live.factor : 1);
  };
  const ppgOf = (p) => projOf(p) / 17;

  const needK = counts.K < 1, needDST = counts.DST < 1;
  const mustFill = (needK ? 1 : 0) + (needDST ? 1 : 0);
  const lateWindow = left <= mustFill + 1;       // time to grab K/DST

  // --- hard legality: this is what stops the "idiot" picks ---
  const legal = (p) => {
    if (counts[p.pos] >= cap[p.pos]) return false;
    if (p.pos === "K" || p.pos === "DST") return left <= 2;      // last two rounds only
    if (left <= mustFill) return false;                           // must save slots for K/DST
    if (p.pos === "QB") {
      // no early QB in 1QB leagues, but six-point passing touchdowns genuinely
      // move quarterbacks up, so the rule loosens when the scoring says so
      const qbHeavy = ppr.passTD >= 6 || ppr.passYd >= 0.05;
      if (!superflex && round <= (qbHeavy ? 1 : 2)) return false;
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
    /* Strategy commitments. A Zero RB manager who takes a back in round one
       is not running Zero RB, so these are hard gates rather than nudges.
       They relax late so nobody finishes with an illegal roster. */
    const R = P.rules || {};
    const roomToSpare = left > 5;
    if (roomToSpare) {
      if (p.pos === "RB" && R.noRBBefore && round < R.noRBBefore) return false;
      if (p.pos === "RB" && R.rbCap != null && counts.RB >= R.rbCap && round < (R.rbCapUntil || 7)) return false;
      if (p.pos === "QB" && R.noQBBefore && round < R.noQBBefore) return false;
      // the elite tight end manager must actually land one
      if (R.mustTEBy && counts.TE === 0 && round >= R.mustTEBy && p.pos !== "TE") return false;
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
  /* Real ADP has spread. Treating "will he last until my next pick" as a hard
     cutoff makes the CPU reach for players who would obviously have fallen.
     Instead, give each player a survival probability and take the expected
     value of the best man still on the board next turn. */
  const nextPick = overall + gap;
  const survive = (p) => {
    if (gap > 200) return 1;
    const sd = Math.max(6, 0.42 * Math.sqrt(p.adp) * 3.2);   // spread widens later
    const z = (p.adp - nextPick) / sd;
    // logistic approximation of the normal CDF
    return 1 / (1 + Math.exp(-1.702 * z));
  };

  const bestNow = {}, expectedNext = {};
  for (const pos of POS_ORDER) {
    const at = available.filter((p) => p.pos === pos);
    bestNow[pos] = at[0];
    let acc = 0, goneProb = 1;
    for (const cand of at.slice(0, 14)) {
      const ps = survive(cand);
      acc += projOf(cand) * ps * goneProb;   // he is there AND everyone better is gone
      goneProb *= (1 - ps);
      if (goneProb < 0.02) break;
    }
    const tail = at[Math.min(at.length - 1, 14)];
    expectedNext[pos] = acc + (tail ? projOf(tail) * goneProb : 0);
  }

  /* Positional runs. When four of the last eight picks were backs, the board
     is thinning fast and waiting costs more than the raw dropoff suggests.
     Real rooms react to this, so the CPU does too. */
  const recent = lg.picks.slice(-8).map((pk) => BY_ID[pk.playerId].pos);
  const runHeat = {};
  for (const posName of POS_ORDER) {
    const n = recent.filter((x) => x === posName).length;
    runHeat[posName] = n >= 4 ? 1.35 : n === 3 ? 1.18 : 1;
  }

  /* Marginal starting-lineup value. The only question that matters for a pick
     is how much better my starting eleven gets, which handles roster need,
     flex eligibility and diminishing returns without a hand-tuned table.
     Measured against the roster as it actually stands: judging against a
     hypothetical finished roster was tried and drafted far worse, because it
     let the model talk itself out of positions it genuinely needed. */
  const mine = ids.map((id) => ({ pos: BY_ID[id].pos, ppg: ppgOf(BY_ID[id]) }));
  const baseStarters = bestStarterPoints(lg, mine);

  /* Supply and demand across the whole room. A sharp drafter is not just asking
     "is this player good", he is asking "how many startable ones are left and
     how many managers still need one". When six usable tight ends remain and
     nine teams have none, the position is about to get expensive. */
  const demand = {}, supply = {};
  for (const pos of POS_ORDER) {
    let need = 0;
    for (const other of lg.gms) {
      const theirs = rosterCounts(lg.rosters[other.idx]);
      need += Math.max(0, want[pos] - theirs[pos]);
    }
    demand[pos] = need;
    const top = bestNow[pos] ? projOf(bestNow[pos]) : 0;
    // players still close enough to the top of the position to start
    supply[pos] = available.filter((x) => x.pos === pos && projOf(x) >= top * 0.78).length;
  }
  const urgency = {};
  for (const pos of POS_ORDER) {
    const d = demand[pos], sup = supply[pos];
    urgency[pos] = d <= 0 ? 0.9
      : Math.max(0.85, Math.min(1.55, 1 + 0.4 * ((d - sup) / Math.max(2, d))));
  }

  let best = null, bestScore = -Infinity;
  for (const p of pool.slice(0, 45)) {
    const pts = projOf(p);
    // 1. how much value evaporates at this position if we wait one turn
    const fallback = expectedNext[p.pos] || pts * 0.75;
    const dropoff = Math.max(0, pts - fallback);
    // 2. tier break: real gap to the next man at the position
    const same = available.filter((x) => x.pos === p.pos);
    const idx = same.findIndex((x) => x.id === p.id);
    const tier = same[idx + 1] ? Math.max(0, pts - projOf(same[idx + 1])) : 0;

    /* 3. The real question: how much better is my starting lineup with him in
       it? This replaces a hand-tuned roster-need table. A fourth receiver who
       cannot crack the flex scores near zero here no matter how good he is,
       which is exactly how a sharp drafter sees him. Bench players still carry
       insurance value, just heavily discounted. */
    const starterGain = Math.max(0,
      bestStarterPoints(lg, [...mine, { pos: p.pos, ppg: ppgOf(p) }]) - baseStarters) * 17;
    const benchValue = Math.max(0, pts - starterGain) * 0.22;
    const effective = starterGain + benchValue;

    // 4. don't reach into next week. ADP discipline, loosened late
    const reachPenalty = Math.max(0, p.adp - overall - 6 - round * 1.5) * (1.6 / (1 + round * 0.12));
    // 5. bye-week hygiene
    // stacking byes only really hurts among starters, so weight by pick quality
    const byeClash = ids.filter((id) => BY_ID[id].bye === p.bye).length;
    const early = round <= 7 ? 1.5 : 1;
    const byePenalty = (byeClash >= 4 ? 14 : byeClash >= 3 ? 9 : byeClash >= 2 ? 3 : 0) * early;
    // 6. late-round upside chase. swing on variance when it's free
    const upside = round > rounds * 0.62 ? p.spread * 34 : 0;

    const persona = -(P.posBias[p.pos] || 0) * 2.1;
    const noise = (Math.random() - 0.5) * 2 * P.reach * 3.2;

    /* Handcuff logic: a backup on the same team as a back you already roster
       is worth a late flier, but never worth a real pick. */
    const stacksMyBack = p.pos === "RB" && counts.RB >= 2
      && ids.some((id) => BY_ID[id].pos === "RB" && BY_ID[id].team === p.team);
    const handcuff = stacksMyBack ? (round > rounds * 0.7 ? 4 : -9) : 0;

    /* Correlation: pairing a quarterback with his own receiver means their big
       weeks land together. Worth a nudge late, never worth a reach. */
    const myQBTeams = ids.filter((id) => BY_ID[id].pos === "QB").map((id) => BY_ID[id].team);
    const stack = (["WR", "TE"].includes(p.pos) && myQBTeams.includes(p.team) && round > 4) ? 5 : 0;

    /* Scarcity only matters for players who would actually start for me. A third
       quarterback in superflex can be the last of a vanishing tier and still be
       worth nothing, because he sits on my bench either way. */
    const relevance = starterGain > 0.5 ? 1 : 0.15;

    const score = effective * 0.42
      + dropoff * 1.5 * runHeat[p.pos] * urgency[p.pos] * relevance
      + tier * 0.9 * relevance
      - reachPenalty - byePenalty + upside + persona + handcuff + stack + noise;

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

/* ===== 5. SCHEDULE =====
   
   The mock season simulates its own NFL slate. Byes are the real 2026 ones,
   and pairings are generated so every team plays a non-bye opponent each week,
   weighted toward division rivals the way a real schedule is. */

const DIVISIONS = {
  AFCE: ["BUF", "MIA", "NE", "NYJ"], AFCN: ["BAL", "CIN", "CLE", "PIT"],
  AFCS: ["HOU", "IND", "JAX", "TEN"], AFCW: ["DEN", "KC", "LV", "LAC"],
  NFCE: ["DAL", "NYG", "PHI", "WAS"], NFCN: ["CHI", "DET", "GB", "MIN"],
  NFCS: ["ATL", "CAR", "NO", "TB"], NFCW: ["ARI", "LAR", "SF", "SEA"],
};
const TEAMS32 = Object.values(DIVISIONS).flat();
const DIV_OF = {};
for (const [d, ts] of Object.entries(DIVISIONS)) ts.forEach((t) => { DIV_OF[t] = d; });

// Defensive strength comes straight from the D/ST projections already in the pool,
// so a team with a top-5 fantasy defense actually suppresses opposing scorers.
export const DEF_RATING = (() => {
  const dst = PLAYERS.filter((p) => p.pos === "DST");
  const vals = dst.map((p) => p.base);
  const hi = Math.max(...vals), lo = Math.min(...vals);
  const r = {};
  // Not every team has a D/ST inside the top 300, so unknown teams sit at league
  // average rather than being treated as the worst defense in football.
  TEAMS32.forEach((t) => { r[t] = 0.5; });
  dst.forEach((p) => {
    const norm = hi === lo ? 0.5 : (p.base - lo) / (hi - lo);   // 1 = best defense
    r[p.team] = norm;
  });
  return r;
})();

// how much a defense moves an opposing skill player, roughly +/-9%
export function matchupMult(oppTeam) {
  const d = DEF_RATING[oppTeam];
  if (d == null) return 1;
  return 1 + (0.5 - d) * 0.20;
}

export function buildNFLSchedule(seed) {
  const rng = mulberry(seed * 31 + 17);
  const weeks = [];
  const played = {};                       // team -> { opp: lastWeekPlayed }
  const meetings = {};                     // team -> { opp: timesPlayed }
  TEAMS32.forEach((t) => { played[t] = {}; meetings[t] = {}; });

  for (let w = 1; w <= 18; w++) {
    const active = TEAMS32.filter((t) => BYE[t] !== w);
    const pool = active.slice().sort(() => rng() - 0.5);
    const used = new Set();
    const pairs = [];

    for (const t of pool) {
      if (used.has(t)) continue;
      const free = pool.filter((x) => x !== t && !used.has(x));
      if (!free.length) continue;

      // score each candidate: division rivals are good, quick rematches are not
      const scored = free.map((x) => {
        const last = played[t][x];
        const recent = last != null ? w - last : 99;
        const met = meetings[t][x] || 0;
        let sc = rng() * 2;
        if (DIV_OF[x] === DIV_OF[t]) sc += 1.6;          // rivalries recur
        if (recent < 6) sc -= 6 - recent;                 // no fast rematch
        if (met >= 1 && DIV_OF[x] !== DIV_OF[t]) sc -= 5; // non-rivals meet once
        if (met >= 2) sc -= 14;                           // nobody plays three times
        return { x, sc };
      }).sort((a, b) => b.sc - a.sc);

      const pick = scored[0].x;
      used.add(t); used.add(pick);
      played[t][pick] = w; played[pick][t] = w;
      meetings[t][pick] = (meetings[t][pick] || 0) + 1;
      meetings[pick][t] = (meetings[pick][t] || 0) + 1;
      pairs.push([t, pick]);
    }

    const map = {};
    pairs.forEach(([a, b]) => { map[a] = b; map[b] = a; });
    weeks.push(map);
  }
  return weeks;
}

/* Seasons saved before the schedule existed have no nfl field. Rather than
   showing "no game" forever, rebuild it on demand from the season seed, which
   is deterministic and so reproduces the same slate every time. */
const _schedCache = {};
export function nflSchedule(state) {
  if (state?.nfl?.length) return state.nfl;
  const seed = state?.seed ?? 1;
  if (!_schedCache[seed]) _schedCache[seed] = buildNFLSchedule(seed);
  return _schedCache[seed];
}

export function oppFor(state, team, week) {
  if (!state || !team || team === "FA") return null;
  const sched = nflSchedule(state);
  const m = sched[week - 1];
  return m ? (m[team] || null) : null;
}

// write the schedule back into an older save so it persists from now on
export function ensureSchedule(lg) {
  if (lg?.season && !lg.season.nfl?.length) {
    lg.season.nfl = buildNFLSchedule(lg.season.seed ?? 1);
    return true;
  }
  return false;
}

/* ===== 5b. LIVE INJURIES =====
   Real injury data from Sleeper, matched onto our player pool.

   Scope matters here. A mock season runs its own simulated injuries, because
   the whole point is that it plays out differently each time. Real injuries
   therefore apply to preseason rankings and to the real-team tools, and never
   overwrite a simulation already in progress. */

let LIVE_INJURIES = null;      // { [playerId]: record }
let LIVE_META = null;          // { fetchedAt, matched, unmatched }

export function setLiveInjuries(byId, meta) {
  LIVE_INJURIES = byId && Object.keys(byId).length ? byId : null;
  LIVE_META = meta || null;
}
export function getLiveInjuries() { return LIVE_INJURIES; }
export function getLiveMeta() { return LIVE_META; }
export function injuryFor(playerId) { return LIVE_INJURIES ? LIVE_INJURIES[playerId] || null : null; }

/* Match Sleeper records onto our pool by normalized name, using team and
   position to break ties between players who share a name. */
export function matchInjuries(list) {
  const byId = {};
  let unmatched = 0;
  const index = new Map();
  for (const p of PLAYERS) {
    const key = norm(p.name);
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(p);
  }
  for (const rec of list || []) {
    const candidates = index.get(norm(rec.name)) || [];
    let hit = null;
    if (candidates.length === 1) hit = candidates[0];
    else if (candidates.length > 1) {
      hit = candidates.find((p) => p.team === rec.team && p.pos === rec.pos)
        || candidates.find((p) => p.pos === rec.pos)
        || candidates[0];
    }
    if (!hit) { unmatched++; continue; }
    const level = INJURY_LEVELS[rec.status];
    if (!level) { unmatched++; continue; }
    byId[hit.id] = { ...rec, ...level };
  }
  return { byId, matched: Object.keys(byId).length, unmatched };
}

/* ===== 6. VALUATION ===== */

// remaining-season points estimate for every player, given season state
export function buildValues(lg, state) {
  const ppr = scoringOf(lg);
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
    // Championship weeks are worth more than October weeks. Weight each remaining
    // week by whether it is a playoff week, and skip weeks the player misses.
    let weighted = 0;
    if (state) {
      const first = state.week + Math.min(weeksLeft, inj);
      for (let w = first; w <= 17; w++) {
        if (p.bye === w) continue;
        weighted += w >= state.shape.rsWeeks + 1 ? 1.75 : 1;
      }
    } else {
      weighted = 17 * 1.05;
    }
    /* Live injuries only bite outside a running simulation. Inside one, the
       season's own injury rolls are the source of truth. */
    const live = state ? null : injuryFor(p.id);
    const liveFactor = live ? live.factor : 1;
    out[p.id] = {
      ppg: perWeek * mult * liveFactor,
      ros: perWeek * mult * playable * liveFactor,
      rosWeighted: perWeek * mult * weighted * liveFactor,
      weeksCounted: weighted,
      mult,
      out: inj,
      live,
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
    // horizon is now playoff-weighted, so an injury through week 16 costs far more
    // than the same number of missed weeks in September
    const horizon = Math.max(1, v.weeksCounted);
    v.vorp = vorpPPG * horizon;
    // superlinear: one stud > two mid guys, because you start finite lineups
    v.tv = Math.round(Math.pow(v.vorp, 1.22) / 3.9 * 10) / 10;
  }
  out.__repl = repl;
  return out;
}

// Points a lineup actually scores per week, given who is on the roster.
export function lineupPPG(lg, ids, values) {
  const slots = lineupFor(lg.settings);
  const sorted = ids.slice().sort((a, b) => (values[b]?.ppg || 0) - (values[a]?.ppg || 0));
  const used = new Set();
  let total = 0;
  for (const s of slots) {
    const pick = sorted.find((id) => !used.has(id) && s.accepts.includes(BY_ID[id].pos));
    if (pick) { used.add(pick); total += values[pick].ppg; }
  }
  return total;
}

/* Marginal value: what a player is worth to THIS roster, not in the abstract.
   A WR5 on a receiver-rich team adds almost nothing to your weekly score even
   though his market value is high. This is the number that should drive
   depth-for-stud trades, and it is why most trade calculators feel wrong. */
export function marginalPPG(lg, ids, playerId, values) {
  const without = lineupPPG(lg, ids.filter((x) => x !== playerId), values);
  const with_ = lineupPPG(lg, [...ids.filter((x) => x !== playerId), playerId], values);
  return Math.max(0, with_ - without);
}

// Net weekly change from a proposed swap, from one side's point of view.
export function swapImpact(lg, ids, outIds, inIds, values) {
  const before = lineupPPG(lg, ids, values);
  const after = lineupPPG(lg, ids.filter((x) => !outIds.includes(x)).concat(inIds), values);
  return Math.round((after - before) * 10) / 10;
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

/* ===== 7. SEASON ===== */

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
    // hidden true-talent draw. this is what makes the waiver wire matter
    talent[p.id] = Math.max(0.28, 1 + gauss(rng) * p.spread);
  }
  return {
    seed,
    week: 1,
    nfl: buildNFLSchedule(seed),
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
  const opp = oppFor(state, p.team, week);
  // defenses matter: a skill player faces roughly a 9% swing either way,
  // and a D/ST gets the inverse read on the offense it is facing
  const mm = p.pos === "DST" ? (opp ? 2 - matchupMult(opp) : 1) : (opp ? matchupMult(opp) : 1);
  const mean = (p.base / 17) * state.talent[p.id] * mm;
  const z = gauss(rng);
  const pts = Math.max(0, mean * (1 + z * p.vol) + (p.pos === "DST" ? gauss(rng) * 1.5 : 0));
  return { pts: Math.round(pts * 10) / 10, tag: null, opp };
}

/* Weekly outlook shown in the preview: the visible estimate for a player this
   week, adjusted for opponent, with a realistic floor and ceiling band. */
export function weekOutlook(p, state, week, values) {
  const base = values[p.id]?.ppg ?? p.base / 17;
  if (p.bye === week) return { status: "BYE", mean: 0, low: 0, high: 0, opp: null, mm: 1 };
  if (state?.injuries?.[p.id] > 0) return { status: "OUT", mean: 0, low: 0, high: 0, opp: null, mm: 1 };
  const opp = oppFor(state, p.team, week);
  const mm = p.pos === "DST" ? (opp ? 2 - matchupMult(opp) : 1) : (opp ? matchupMult(opp) : 1);
  const mean = base * mm;
  // ~80% of weeks land inside this band
  const low = Math.max(0, mean * (1 - 0.95 * p.vol));
  const high = mean * (1 + 1.15 * p.vol);
  return {
    status: null, opp, mm,
    mean: Math.round(mean * 10) / 10,
    low: Math.round(low * 10) / 10,
    high: Math.round(high * 10) / 10,
    grade: mm > 1.055 ? "great" : mm > 1.02 ? "good" : mm < 0.945 ? "tough" : mm < 0.98 ? "hard" : "even",
  };
}

export function simWeek(lg, state, userLineup) {
  const rng = mulberry(state.seed * 7919 + state.week * 104729);
  const week = state.week;
  const values = buildValues(lg, state);
  const ppr = scoringOf(lg);

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
    // keep the week number with each score so the game log lines up correctly
    // after byes and missed weeks
    actual[p.id] = {
      pts: prev.pts + s.pts,
      gp: prev.gp + 1,
      log: [...prev.log, { w: week, pts: s.pts, opp: s.opp || null }].slice(-18),
    };
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
  const last = a.log.slice(-2).map((x) => (typeof x === "number" ? x : x.pts));
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

// classic rolling waiver priority. no money, worst record picks first
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

/* -------- CPU trade offers -------- */

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

// CPU response to a trade the user proposes. They weigh raw value AND roster fit,
// a team stacked at RB won't take a fourth one no matter how good the value is.
export function evaluateOffer(lg, state, partnerIdx, iSend, iGet) {
  const values = buildValues(lg, state);
  const v = tradeVerdict(iSend, iGet, values);
  const theirNeed = weakestPos(lg, partnerIdx, values);
  const incomingHelps = iSend.some((id) => BY_ID[id].pos === theirNeed);
  const theirRoster = lg.rosters[partnerIdx];

  // Do the players they would receive actually crack their lineup? This is the
  // real test, and it is why a WR-rich team turns down a good WR.
  const upgrade = swapImpact(lg, theirRoster, iGet, iSend, values);

  // v.pct > 0 means the user is sending more value than receiving
  let score = v.pct;
  if (incomingHelps) score += 6;
  score += Math.max(-14, Math.min(11, upgrade * 2.2));
  if (upgrade < -0.5) score -= 6;   // they will not weaken their own starters
  if (iGet.length > iSend.length) score -= 6;        // they dislike losing depth for one piece
  if (theirRoster.length - iGet.length + iSend.length < 13) score -= 14;

  const accept = score > 13;
  const close = !accept && score > 4;
  let reply;
  if (accept) {
    reply = incomingHelps
      ? `Done. I need ${theirNeed} help and this gets me there.`
      : `I'll take that. The value works for me.`;
  } else if (close) {
    reply = `Close, but not quite. Sweeten it slightly and I'm in.`;
  } else if (v.pct < -18) {
    reply = `You're asking for way too much. Not happening.`;
  } else {
    reply = incomingHelps
      ? `I like the fit but the price is too high.`
      : `That doesn't fill a hole for me. I'm set at ${BY_ID[iSend[0]].pos}.`;
  }
  return { accept, close, reply, verdict: v, theirNeed, score };
}

// Which spot on a roster is furthest below a startable baseline.
// Both the CPU and the trade finder use this, so it lives in one place.
export function weakestPos(lg, gmIdx, values) {
  return weakestPosFromIds(lg.rosters[gmIdx], values);
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
.hd { --nudge:0px; --safe-top:env(safe-area-inset-top,0px); --safe-bot:env(safe-area-inset-bottom,0px); --ink:#0C1116; --panel:#141C24; --panel2:#1B252F; --line:#26323D;
  --chalk:#E9EEF2; --mute:#8B9BA8; --first:#7FD1E8; --los:#8B7BFF;
  --red:#EF6153; --green:#5FC46E;
  background:var(--ink); color:var(--chalk); font-family:Inter,system-ui,sans-serif;
  min-height:100vh; -webkit-font-smoothing:antialiased; font-size:15.5px; }
.hd *{box-sizing:border-box}
.hd button{font-family:inherit;cursor:pointer;border:none;background:none;color:inherit}
.hd input,.hd select,.hd textarea{font-family:inherit;background:var(--panel2);border:1px solid var(--line);
  color:var(--chalk);border-radius:6px;padding:11px 12px;width:100%;font-size:16px;outline:none}
.hd input:focus,.hd select:focus,.hd textarea:focus{border-color:var(--los)}
.hd h1,.hd h2,.hd h3,.hd .disp{font-family:'Barlow Condensed',Impact,sans-serif;font-weight:700;
  text-transform:uppercase;letter-spacing:.02em;margin:0;line-height:1}
.num{font-family:'JetBrains Mono',monospace;font-variant-numeric:tabular-nums}
.eyebrow{font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:var(--mute);font-weight:600}
/* signature: the first-down line */
.fdl{position:relative}
.fdl::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--first)}
.hdr{position:sticky;top:0;padding-top:calc(11px + var(--safe-top) + var(--nudge));z-index:30;background:rgba(12,17,22,.94);backdrop-filter:blur(8px);
  border-bottom:1px solid var(--line);padding:10px 14px 11px;display:flex;align-items:center;gap:10px;min-height:56px}
.tabs{position:fixed;left:0;right:0;bottom:0;z-index:40;display:grid;grid-template-columns:repeat(4,1fr);gap:4px;
  background:rgba(10,14,19,.98);backdrop-filter:blur(14px);border-top:1px solid var(--line);
  padding:8px 8px calc(8px + var(--safe-bot))}
.navpad{height:calc(78px + var(--safe-bot))}
/* primary nav inside a mock league: one evenly spaced segmented control,
   no horizontal scrolling, so the five sections never shift position */
.subnav{position:sticky;top:0;z-index:25;display:grid;grid-template-columns:repeat(3,1fr);gap:3px;
  padding:8px 10px;background:rgba(12,17,22,.97);backdrop-filter:blur(8px);
  border-bottom:1px solid var(--line)}
.snb{padding:9px 2px;border-radius:8px;background:transparent;border:none;white-space:nowrap;
  font-size:13px;font-weight:700;color:var(--mute);font-family:'Barlow Condensed',sans-serif;
  text-transform:uppercase;letter-spacing:.06em;position:relative;text-align:center}
.snb.on{background:var(--first);color:#101519}
/* secondary nav within the season screen */
.segs{display:grid;grid-auto-flow:column;gap:3px;background:var(--panel2);border:1px solid var(--line);
  border-radius:10px;padding:3px;margin-bottom:12px}
.seg{padding:9px 2px;border-radius:7px;font-size:12.5px;font-weight:700;color:var(--mute);text-align:center;
  font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.05em;position:relative}
.seg.on{background:var(--first);color:#101519}
.tab{padding:9px 2px 8px;text-align:center;font-size:12.5px;letter-spacing:.05em;text-transform:uppercase;
  color:var(--mute);font-weight:700;border-radius:10px;display:flex;flex-direction:column;align-items:center;gap:4px;
  font-family:'Barlow Condensed',sans-serif;line-height:1}
.tab .dot{width:20px;height:20px;border-radius:6px;background:var(--line);display:block;position:relative}
.tab .dot::after{content:'';position:absolute;inset:5px;border-radius:2px;background:var(--mute)}
.tab.on{color:#101519;background:var(--first)}
.tab.on .dot{background:rgba(16,21,25,.22)} .tab.on .dot::after{background:#101519}
.badge{position:absolute;top:-4px;right:-6px;min-width:16px;height:16px;border-radius:99px;background:var(--red);
  color:#fff;font-size:9.5px;font-weight:700;display:grid;place-items:center;padding:0 4px;font-family:Inter,sans-serif}
/* in the tight segmented controls a number is noise, so show a dot instead */
.snb .badge,.seg .badge{top:5px;right:6px;min-width:6px;width:6px;height:6px;padding:0;font-size:0;overflow:hidden}
.snb.on .badge,.seg.on .badge{background:#101519}
.wrap{padding:14px 14px 24px;max-width:760px;margin:0 auto}
.wrap.top{padding-top:calc(14px + var(--safe-top) + var(--nudge))}
/* status-bar-style:black makes iOS reserve the bar, so insets stay small here.
   Only the home indicator needs a floor. */
.hd.pwa{--safe-bot:max(env(safe-area-inset-bottom,0px),16px)}
.card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:13px;margin-bottom:11px}
.card.tight{padding:0;overflow:hidden}
.btn{background:var(--first);color:#101519;font-weight:700;padding:13px 16px;border-radius:8px;
  font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.06em;font-size:19px;width:100%}
.btn:disabled{opacity:.35}
.btn.alt{background:var(--panel2);color:var(--chalk);border:1px solid var(--line)}
.btn.blue{background:var(--los);color:#fff}
.btn.sm{padding:9px 13px;font-size:15px;width:auto}
.row{display:flex;align-items:center;gap:9px}
.sp{justify-content:space-between}
.chip{padding:7px 12px;border-radius:99px;background:var(--panel2);border:1px solid var(--line);
  font-size:12.5px;font-weight:600;letter-spacing:.04em;white-space:nowrap;color:var(--mute)}
.chip.on{background:var(--first);color:#101519;border-color:var(--first)}
.scroll-x{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;-webkit-overflow-scrolling:touch}
.scroll-x::-webkit-scrollbar{display:none}
.pos{width:34px;height:23px;border-radius:5px;display:grid;place-items:center;font-size:11.5px;font-weight:700;
  font-family:'Barlow Condensed',sans-serif;letter-spacing:.05em;flex:none}
.pQB{background:#7A4DD6;color:#fff}.pRB{background:#1E9E6A;color:#fff}.pWR{background:#2F6BFF;color:#fff}
.pTE{background:#D2822B;color:#fff}.pK{background:#4B5A68;color:#fff}.pDST{background:#8A5C2E;color:#fff}
.plr{display:flex;align-items:center;gap:10px;padding:12px 12px;border-bottom:1px solid var(--line)}
.plr:last-child{border-bottom:none}
.nm{font-weight:600;font-size:15.5px;line-height:1.3}
.sub{font-size:12.5px;color:var(--mute);margin-top:3px}
.divider{height:1px;background:var(--line);margin:11px 0}
.bar{height:5px;background:var(--panel2);border-radius:99px;overflow:hidden}
.bar>i{display:block;height:100%;background:var(--first)}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.act{display:flex;align-items:center;gap:12px;width:100%;background:var(--panel);border:1px solid var(--line);
  border-radius:12px;padding:14px 13px;margin-bottom:9px;text-align:left;position:relative;overflow:hidden}
.act::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--first)}
.act.b::before{background:var(--los)} .act.g::before{background:var(--green)} .act.r::before{background:var(--red)}
.act .ico{width:38px;height:38px;border-radius:10px;background:var(--panel2);display:grid;place-items:center;flex:none;
  font-family:'Barlow Condensed',sans-serif;font-size:15px;font-weight:700;color:var(--first);letter-spacing:.02em}
.act.b .ico{color:var(--los)} .act.g .ico{color:var(--green)} .act.r .ico{color:var(--red)}
.act h4{font-family:'Barlow Condensed',sans-serif;font-size:22px;text-transform:uppercase;margin:0 0 2px;letter-spacing:.02em}
.act .arw{color:var(--mute);font-size:20px;flex:none}
.wk{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--line)}
.wk:last-child{border-bottom:none}
.wk.po{background:rgba(127,209,232,.05)}
.wkn{width:26px;flex:none;font-family:'JetBrains Mono',monospace;font-size:11.5px;color:var(--mute);text-align:right}
.rng{width:78px;flex:none;text-align:right}
.rngbar{height:4px;background:var(--panel2);border-radius:99px;position:relative;margin:4px 0 3px;overflow:hidden}
.rngbar>i{position:absolute;top:0;bottom:0;background:var(--first);border-radius:99px;opacity:.55}
.rngbar>b{position:absolute;top:-2px;width:2px;height:8px;background:var(--chalk);border-radius:1px}
.opp{font-size:10.5px;font-weight:700;letter-spacing:.03em}
.o-great{color:var(--green)} .o-good{color:#9BD6A3} .o-even{color:var(--mute)}
.o-hard{color:#E9A03A} .o-tough{color:var(--red)}
.pill{display:inline-block;padding:2px 7px;border-radius:99px;background:var(--first);color:#101519;
  font-size:10px;font-weight:700;margin-left:6px}
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
.stat{background:var(--panel2);border-radius:8px;padding:9px;text-align:center}
.stat b{display:block;font-family:'Barlow Condensed',sans-serif;font-size:29px;line-height:1;margin-bottom:4px}
.sheet{position:fixed;inset:0;z-index:60;background:rgba(6,9,12,.7);display:flex;align-items:flex-end;
  transition:padding-bottom .18s ease-out}
.sheet>div{background:var(--panel);width:100%;max-height:88vh;overflow-y:auto;border-radius:14px 14px 0 0;
  border-top:3px solid var(--first);padding:14px;-webkit-overflow-scrolling:touch;
  transition:max-height .18s ease-out}
.tag{font-size:10.5px;font-weight:700;letter-spacing:.08em;padding:2px 5px;border-radius:3px;text-transform:uppercase}
.t-out{background:rgba(226,72,58,.16);color:var(--red)}
.t-bye{background:rgba(139,155,168,.16);color:var(--mute)}
.t-up{background:rgba(34,196,138,.16);color:var(--green)}
.t-warn{background:rgba(233,160,58,.18);color:#E9A03A}
.toast{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(80px + var(--safe-bot));z-index:80;background:var(--first);
  color:#101519;font-weight:700;padding:10px 16px;border-radius:99px;font-size:13px;max-width:90%}
.mini{font-size:13.5px;color:var(--mute);line-height:1.55}
.hub{display:grid;grid-template-columns:1fr 1fr;gap:11px}
.tile{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:15px 13px 14px;
  text-align:left;min-height:152px;display:flex;flex-direction:column;position:relative;overflow:hidden}
.tile::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--first);opacity:.85}
.tile.b::before{background:var(--los)} .tile.g::before{background:var(--green)} .tile.m::before{background:var(--mute)}
.tile h3{font-size:25px;line-height:.95;margin-bottom:7px}
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

/* How much of the window the on-screen keyboard is covering. iOS does not resize
   the layout viewport when the keyboard opens, so anything anchored to the bottom
   ends up underneath it. visualViewport tells us the real overlap. */
export function useKeyboardInset() {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;
    const onChange = () => {
      const overlap = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
      setInset(overlap > 90 ? Math.round(overlap) : 0);
    };
    onChange();
    vv.addEventListener("resize", onChange);
    vv.addEventListener("scroll", onChange);
    return () => { vv.removeEventListener("resize", onChange); vv.removeEventListener("scroll", onChange); };
  }, []);
  return inset;
}

function Sheet({ open, onClose, title, children }) {
  const kb = useKeyboardInset();
  if (!open) return null;
  return (
    <div className="sheet" onClick={onClose} style={{ paddingBottom: kb }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          // shrink with the keyboard so the list is always reachable
          maxHeight: kb ? `calc(100vh - ${kb + 70}px)` : "88vh",
          paddingBottom: kb ? 16 : 14,
        }}
      >
        <div className="row sp" style={{ marginBottom: 10 }}>
          <h2 style={{ fontSize: 24 }}>{title}</h2>
          <button className="chip" onClick={onClose}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PlayerRow({ p, right, onClick, tag, sub }) {
  // live injury badge, only when the row is not already showing a status
  const live = tag ? null : injuryFor(p.id);
  const shown = tag || (live ? { c: live.factor === 0 ? "t-out" : "t-warn", t: live.code } : null);
  return (
    <div className="plr" onClick={onClick} style={{ cursor: onClick ? "pointer" : "default" }}>
      <div className={POSC(p.pos)}>{p.pos === "DST" ? "DEF" : p.pos}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="nm" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          <Tap id={p.id}>{p.name}</Tap> {shown && <span className={`tag ${shown.c}`} style={{ marginLeft: 4 }}>{shown.t}</span>}
        </div>
        <div className="sub">{sub ?? `${p.team} · Bye ${p.bye || "TBD"} · ADP ${p.adp}`}</div>
      </div>
      {right}
    </div>
  );
}

/* ===== 8. STORAGE ===== */

const store = {
  async get(k) { try { const r = await window.storage.get(k); return r ? JSON.parse(r.value) : null; } catch { return null; } },
  async set(k, v) { try { await window.storage.set(k, JSON.stringify(v)); return true; } catch { return false; } },
  async del(k) { try { await window.storage.delete(k); } catch { } },
};

/* ---- version-proof recovery mirror ----
   Normal Huddle saves live behind window.storage. These recovery keys live in a
   separate localStorage namespace so a new app build can recover leagues even
   if the normal storage wrapper or save schema changes. */
const RECOVERY_NS = "huddle::recovery::v1";
const RECOVERY_INDEX = `${RECOVERY_NS}::index`;
const RECOVERY_MY = `${RECOVERY_NS}::myteam`;
const RECOVERY_ACTIVE = `${RECOVERY_NS}::active`;
const recoveryLeagueKey = (id) => `${RECOVERY_NS}::league::${id}`;

function recoveryGet(key) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function recoverySet(key, value) {
  if (typeof window === "undefined") return false;
  try { window.localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
function recoveryDel(key) {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(key); } catch { }
}

function phaseForLeague(lg) {
  return lg?.season
    ? (lg.season.champion != null ? "Complete" : `Week ${lg.season.week}`)
    : draftDone(lg) ? "Drafted" : `Pick ${(lg?.picks?.length || 0) + 1}`;
}

function metaForLeague(lg, phase = null) {
  return {
    id: lg.id,
    name: cleanMockName(lg.name),
    teams: lg.settings.teams,
    ppr: lg.settings.ppr,
    superflex: !!lg.settings.superflex,
    at: Date.now(),
    phase: phase || phaseForLeague(lg),
  };
}

async function createRecoverySnapshot(myTeamOverride = null) {
  const idx = (await store.get("huddle:index")) || [];
  const recoveredIndex = [];
  for (const m of idx) {
    const lg = await store.get(`huddle:lg:${m.id}`);
    if (!lg) continue;
    recoverySet(recoveryLeagueKey(lg.id), lg);
    recoveredIndex.push(metaForLeague(lg));
  }
  recoverySet(RECOVERY_INDEX, recoveredIndex);
  const currentMy = myTeamOverride || await store.get("huddle:myteam");
  if (currentMy) recoverySet(RECOVERY_MY, currentMy);
  recoverySet(`${RECOVERY_NS}::lastSnapshot`, { version: VERSION, savedAt: Date.now(), leagues: recoveredIndex.length });
  return recoveredIndex.length;
}

async function restoreRecoveryData() {
  const backupIndex = recoveryGet(RECOVERY_INDEX) || [];
  let currentIndex = (await store.get("huddle:index")) || [];
  const currentById = new Map(currentIndex.map((m) => [m.id, m]));
  let changed = false;

  for (const backupMeta of backupIndex) {
    let lg = await store.get(`huddle:lg:${backupMeta.id}`);
    if (!lg) {
      lg = recoveryGet(recoveryLeagueKey(backupMeta.id));
      if (lg) { await store.set(`huddle:lg:${backupMeta.id}`, lg); changed = true; }
    }
    if (lg && !currentById.has(backupMeta.id)) {
      const meta = metaForLeague(lg, backupMeta.phase);
      currentIndex.push(meta);
      currentById.set(meta.id, meta);
      changed = true;
    }
  }

  // A league may exist in the main index while its object is missing. Restore it.
  for (const m of currentIndex) {
    const lg = await store.get(`huddle:lg:${m.id}`);
    if (!lg) {
      const backup = recoveryGet(recoveryLeagueKey(m.id));
      if (backup) { await store.set(`huddle:lg:${m.id}`, backup); changed = true; }
    }
  }

  if (changed) {
    currentIndex = currentIndex
      .filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i)
      .sort((a, b) => (b.at || 0) - (a.at || 0))
      .slice(0, 20);
    await store.set("huddle:index", currentIndex);
  }

  const currentMy = await store.get("huddle:myteam");
  const backupMy = recoveryGet(RECOVERY_MY);
  if (!currentMy && backupMy) await store.set("huddle:myteam", backupMy);

  return { restored: changed, leagues: currentIndex.length };
}

let recoveryRestorePromise = null;
function ensureRecoveryRestored() {
  if (!recoveryRestorePromise) recoveryRestorePromise = restoreRecoveryData();
  return recoveryRestorePromise;
}

function scoringLabel(ppr) {
  if (ppr === 1) return "PPR";
  if (ppr === 0.5) return "Half PPR";
  if (ppr === 0) return "Standard";
  return "";
}

function leagueFormat(lgOrMeta) {
  const s = lgOrMeta?.settings || lgOrMeta || {};
  const score = scoringLabel(s.ppr);
  return `${s.teams || "?"}-team${score ? ` ${score}` : ""}${s.superflex ? " SF" : ""}`;
}

function cleanMockName(name) {
  const raw = String(name || "").trim();
  if (!raw) return "Mock League";
  if (/^\d+-team\s+(ppr|half(?:\s+ppr)?|std|standard)(?:\s+sf)?$/i.test(raw)) return "Mock League";
  if (/^\d+-team\s+mock$/i.test(raw)) return "Mock League";
  return raw;
}

function leagueHeaderLabel(lg) {
  return `${cleanMockName(lg?.name)} · ${leagueFormat(lg)}`;
}

async function saveLeague(lg) {
  const idx = (await store.get("huddle:index")) || [];
  const meta = metaForLeague(lg);
  const next = [meta, ...idx.filter((m) => m.id !== lg.id)].slice(0, 20);
  await store.set("huddle:index", next);
  await store.set(`huddle:lg:${lg.id}`, lg);

  // Mirror every league save into the recovery namespace.
  recoverySet(recoveryLeagueKey(lg.id), lg);
  recoverySet(RECOVERY_INDEX, next);
}

/* ===== 8b. CLAUDE HELPER =====
   Only the screenshot reader and the question box use this. Everything
   else in the app runs with no network at all. */

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

function MockHome({ onOpen, onCreate, customScoring }) {
  const [showPersonas, setShowPersonas] = useState(false);
  const [saved, setSaved] = useState([]);
  const [cfg, setCfg] = useState({
    teams: 12, rounds: 15, ppr: 1, superflex: false, userSlot: 5, teamName: "My Team", name: "",
    waiverMode: "faab", faabBudget: 100,
  });
  useEffect(() => {
    ensureRecoveryRestored().then(() => store.get("huddle:index")).then((v) => setSaved(v || []));
  }, []);

  const load = async (id) => { const lg = await store.get(`huddle:lg:${id}`); if (lg) onOpen(lg); };
  const remove = async (id) => {
    await store.del(`huddle:lg:${id}`);
    recoveryDel(recoveryLeagueKey(id));
    const idx = (await store.get("huddle:index")) || [];
    const next = idx.filter((m) => m.id !== id);
    await store.set("huddle:index", next);
    recoverySet(RECOVERY_INDEX, next);
    setSaved(next);
  };
  const rename = async (id, currentName) => {
    const nextName = window.prompt("Mock league name", cleanMockName(currentName));
    if (!nextName?.trim()) return;
    const lg = await store.get(`huddle:lg:${id}`);
    if (!lg) return;
    lg.name = nextName.trim();
    await saveLeague(lg);
    const idx = (await store.get("huddle:index")) || [];
    setSaved(idx);
  };

  return (
    <div className="wrap">
      <div style={{ padding: "2px 0 16px" }}>
        <div className="eyebrow">2026 season · consensus ADP through Aug 10</div>
        <h1 style={{ fontSize: 40, marginTop: 6 }}>Mock Season</h1>
        <div className="mini" style={{ marginTop: 7, maxWidth: 430 }}>
          Draft against seven distinct personalities, then play the year out. Injuries, breakouts,
          bidding wars, and a trade market that pushes back.
        </div>
      </div>

      {saved.length > 0 && (
        <>
          <div className="eyebrow" style={{ marginBottom: 7 }}>Saved leagues</div>
          <div className="card tight" style={{ marginBottom: 16 }}>
            {saved.map((m) => (
              <div key={m.id} className="plr">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="nm" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cleanMockName(m.name)}</div>
                  <div className="sub">{leagueFormat(m)} · {m.phase}</div>
                </div>
                <button className="chip on" onClick={() => load(m.id)}>Open</button>
                <button className="chip" onClick={() => rename(m.id, m.name)}>Rename</button>
                <button className="chip" onClick={() => remove(m.id)}>Delete</button>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="card">
        <h2 style={{ fontSize: 30, marginBottom: 12 }}>New mock draft</h2>
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
            <select value={cfg.scoringKey ?? "ppr"} onChange={(e) => {
              const k = e.target.value;
              if (k === "custom") { setCfg({ ...cfg, scoringKey: k, scoring: resolveScoring(customScoring), ppr: resolveScoring(customScoring).rec }); return; }
              const pre = SCORING_PRESETS.find((x) => x.key === k) || SCORING_PRESETS[0];
              const sc = { ...DEFAULT_SCORING, ...pre.patch };
              setCfg({ ...cfg, scoringKey: k, scoring: sc, ppr: sc.rec });
            }}>
              {SCORING_PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              <option value="custom">My custom rules</option>
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
          <div className="eyebrow" style={{ marginBottom: 4 }}>Mock league name</div>
          <input placeholder="e.g. Office League Mock" value={cfg.name} onChange={(e) => setCfg({ ...cfg, name: e.target.value })} />
          <div className="mini" style={{ marginTop: 5 }}>This appears beside the league format at the top of the mock.</div>
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
            {cfg.waiverMode === "faab" ? "Blind bidding. Highest bid takes the player." : "No money. Worst record claims first, then drops to the back of the line."}
          </div>
        </div>
        <label className="row" style={{ marginBottom: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={cfg.superflex} style={{ width: 18, height: 18 }}
            onChange={(e) => setCfg({ ...cfg, superflex: e.target.checked })} />
          <span style={{ fontSize: 13 }}>Superflex (QB/RB/WR/TE second flex)</span>
        </label>
        <button className="act" style={{ marginBottom: 10 }} onClick={() => setShowPersonas(true)}>
          <div className="ico">CPU</div>
          <div style={{ flex: 1 }}>
            <h4>Drafting personalities</h4>
            <div className="mini">
              {Object.keys(cfg.personas || {}).length
                ? `${Object.keys(cfg.personas).length} seat${Object.keys(cfg.personas).length > 1 ? "s" : ""} set by hand, the rest random`
                : "Random mix. Tap to assign them yourself."}
            </div>
          </div>
          <div className="arw">›</div>
        </button>

        <button className="btn" onClick={() => onCreate(makeLeague({ ...cfg, name: cfg.name.trim() || "Mock League" }))}>
          Start draft
        </button>
      </div>

      <PersonaPicker
        open={showPersonas}
        onClose={() => setShowPersonas(false)}
        teams={cfg.teams}
        userSlot={cfg.userSlot}
        personas={cfg.personas || {}}
        onChange={(next) => setCfg({ ...cfg, personas: next })}
      />
    </div>
  );
}

/* Assign a drafting personality to each CPU seat, or leave them random.
   Ten distinct approaches means a room that drafts like a real league. */
function PersonaPicker({ open, onClose, teams, userSlot, personas, onChange }) {
  const [seat, setSeat] = useState(null);

  const seats = [];
  for (let i = 0; i < teams; i++) if (i !== userSlot) seats.push(i);

  if (seat != null) {
    return (
      <Sheet open={open} onClose={() => setSeat(null)} title={`Seat ${seat + 1}`}>
        <div className="mini" style={{ marginBottom: 11 }}>Pick how this manager drafts.</div>
        <button className={`act ${!personas[seat] ? "" : "m"}`}
          onClick={() => { const n = { ...personas }; delete n[seat]; onChange(n); setSeat(null); }}>
          <div className="ico">?</div>
          <div style={{ flex: 1 }}>
            <h4>Random</h4>
            <div className="mini">Let Huddle choose when the draft starts</div>
          </div>
          {!personas[seat] && <div className="go">Current</div>}
        </button>
        {PERSONAS.map((p) => (
          <button key={p.key} className={`act ${personas[seat] === p.key ? "g" : "m"}`}
            onClick={() => { onChange({ ...personas, [seat]: p.key }); setSeat(null); }}>
            <div className="ico">{p.label.slice(0, 2).toUpperCase()}</div>
            <div style={{ flex: 1 }}>
              <h4>{p.label}</h4>
              <div className="mini">{p.blurb}</div>
            </div>
            {personas[seat] === p.key && <div className="go">Set</div>}
          </button>
        ))}
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onClose={onClose} title="Drafting personalities">
      <div className="mini" style={{ marginBottom: 11 }}>
        Every seat is random unless you set it. Tap one to choose how that manager drafts.
      </div>
      <div className="row" style={{ gap: 7, marginBottom: 11 }}>
        <button className="chip" onClick={() => onChange({})}>Reset all to random</button>
        <button className="chip" onClick={() => {
          const next = {};
          seats.forEach((i, k) => { next[i] = PERSONAS[k % PERSONAS.length].key; });
          onChange(next);
        }}>One of each</button>
      </div>
      {seats.map((i) => {
        const chosen = personas[i] ? personaByKey(personas[i]) : null;
        return (
          <div key={i} className="plr" onClick={() => setSeat(i)} style={{ cursor: "pointer" }}>
            <div className="disp" style={{ width: 40, fontSize: 15, color: "var(--mute)", flex: "none" }}>
              {i + 1}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="nm">{chosen ? chosen.label : "Random"}</div>
              <div className="sub" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {chosen ? chosen.blurb : "Chosen when the draft starts"}
              </div>
            </div>
            <div style={{ color: "var(--mute)", fontSize: 18 }}>›</div>
          </div>
        );
      })}
    </Sheet>
  );
}

/* ============================================================
   DRAFT ROOM
   ============================================================ */

function DraftRoom({ lg, setLg, toast }) {
  const [pos, setPos] = useState("ALL");
  const [q, setQ] = useState("");
  const kb = useKeyboardInset();
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
        <div style={{ padding: "12px 13px", background: isUser ? "rgba(127,209,232,.10)" : "transparent" }}>
          <div className="row sp">
            <div>
              <div className="eyebrow">Round {roundOf(lg, lg.picks.length)} · Pick {slotOf(lg, lg.picks.length)} · #{lg.picks.length + 1} overall</div>
              <h2 style={{ fontSize: 28, marginTop: 4, color: isUser ? "var(--first)" : "var(--chalk)" }}>
                {isUser ? "You're on the clock" : `${lg.gms[clock].name}`}
              </h2>
              {!isUser && <div className="sub" style={{ marginTop: 3 }}>{personaByKey(lg.gms[clock].persona).label}</div>}
              {isUser && nextUserPick && <div className="sub" style={{ marginTop: 3 }}>Next pick after this: #{(() => { for (let i = lg.picks.length + 1; i < lg.order.length; i++) if (lg.order[i] === lg.settings.userSlot) return i + 1; return "last"; })()}</div>}
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
            <div key={pk.overall} className="chip" style={{ background: lg.gms[pk.gmIdx].isUser ? "rgba(127,209,232,.14)" : undefined, color: lg.gms[pk.gmIdx].isUser ? "var(--first)" : undefined }}>
              {pk.overall}. {BY_ID[pk.playerId].name}
            </div>
          ))}
        </div>
      )}

      <div className="row" style={{ marginBottom: 9, gap: 7 }}>
        <input placeholder="Search player or team" value={q} onChange={(e) => setQ(e.target.value)}
          enterKeyHint="search"
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} />
        {kb > 0 && <button className="chip on" onClick={() => document.activeElement?.blur?.()}>Done</button>}
      </div>
      <div className="scroll-x" style={{ marginBottom: 10 }}>
        {["ALL", "QB", "RB", "WR", "TE", "FLX", "K", "DST"].map((x) => (
          <button key={x} className={`chip ${pos === x ? "on" : ""}`} onClick={() => setPos(x)}>
            {x}{x !== "ALL" && x !== "FLX" ? ` ${counts[x] || 0}` : ""}
          </button>
        ))}
      </div>

      <div className="card tight" style={kb ? { marginBottom: kb + 16 } : undefined}>
        {filtered.slice(0, 60).map((p) => {
          const gap = tierGap(p);
          return (
            <PlayerRow key={p.id} p={p} onClick={() => setDetail(p)}
              tag={gap > 14 ? { c: "t-up", t: "Tier break" } : null}
              right={
                <div className="row" style={{ gap: 8 }}>
                  <div style={{ textAlign: "right" }}>
                    <div className="num" style={{ fontSize: 13, fontWeight: 700 }}>{Math.round(proj(p, scoringOf(lg)))}</div>
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
  const ppr = scoringOf(lg);
  const posRankAvail = available ? available.filter((x) => x.pos === p.pos).findIndex((x) => x.id === p.id) + 1 : null;
  const myBye = (lg.rosters[lg.settings.userSlot] || []).filter((id) => BY_ID[id].bye === p.bye).length;
  const risk = p.spread > 0.3 ? "High variance. Wide range of outcomes" : p.spread > 0.2 ? "Moderate variance" : "Stable, well-defined role";
  return (
    <div>
      <div className="row" style={{ marginBottom: 11 }}>
        <div className={POSC(p.pos)} style={{ width: 40, height: 26 }}>{p.pos === "DST" ? "DEF" : p.pos}</div>
        <div>
          <div style={{ fontWeight: 600 }}>{p.team} · {p.pos}{p.posRank}</div>
          <div className="sub">Bye week {p.bye || "TBD"}</div>
        </div>
      </div>
      <div className="grid3" style={{ marginBottom: 11 }}>
        <div className="stat"><b className="num">{p.adp}</b><span className="eyebrow">ADP</span></div>
        <div className="stat"><b className="num">{Math.round(proj(p, ppr))}</b><span className="eyebrow">Proj pts</span></div>
        <div className="stat"><b className="num">{posRankAvail ?? p.posRank}</b><span className="eyebrow">{p.pos} left</span></div>
      </div>
      <div className="mini" style={{ marginBottom: 11 }}>
        {risk}. {myBye > 2 ? `Careful: you already roster ${myBye} players on the week ${p.bye} bye.` : ""}
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
  const ppr = scoringOf(lg);
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
        <h1 style={{ fontSize: 36, marginTop: 5 }}>The Room</h1>
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
                <div className="sub">{r.gm.isUser ? "Your picks" : personaByKey(r.gm.persona).label} · {Math.round(r.starterPts)} starter pts
                  {r.worstBye >= 4 ? ` · ${r.worstBye} on one bye` : ""}</div>
              </div>
              <div className="disp" style={{ fontSize: 30, color: "var(--first)" }}>{grade}</div>
            </div>
            {isOpen && (
              <div style={{ marginTop: 9, borderTop: "1px solid var(--line)", paddingTop: 4 }}>
                {r.ids.map((id) => {
                  const p = BY_ID[id];
                  /* Rosters change after the draft. Anyone picked up on waivers
                     or acquired in a trade has no draft pick, so this has to
                     cope with a missing one rather than assume it exists. */
                  const pk = lg.picks.find((x) => x.playerId === id);
                  if (!pk) {
                    return (
                      <PlayerRow key={id} p={p}
                        sub={`Added in season · ${p.team} · Bye ${p.bye || "TBD"}`}
                        right={<div style={{ textAlign: "right" }}>
                          <div className="num" style={{ fontSize: 12, color: "var(--mute)" }}>n/a</div>
                          <div className="sub">undrafted</div>
                        </div>} />
                    );
                  }
                  const edge = pk.overall - p.adp;
                  return (
                    <PlayerRow key={id} p={p} sub={`${roundOf(lg, pk.overall - 1)}.${String(slotOf(lg, pk.overall - 1)).padStart(2, "0")} · ${p.team} · Bye ${p.bye || "TBD"}`}
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
        <h2 style={{ fontSize: 23, marginBottom: 9 }}>Biggest value picks</h2>
        {steals.slice(0, 5).map((s) => (
          <div key={s.pk.overall} className="row sp" style={{ padding: "6px 0" }}>
            <div className="mini" style={{ color: "var(--chalk)" }}><Tap id={s.p.id}>{s.p.name}</Tap> <span style={{ color: "var(--mute)" }}>· {lg.gms[s.pk.gmIdx].name}</span></div>
            <div className="num" style={{ color: "var(--green)", fontSize: 12 }}>+{s.edge}</div>
          </div>
        ))}
        <div className="divider" />
        <h2 style={{ fontSize: 23, marginBottom: 9 }}>Biggest reaches</h2>
        {steals.slice(-4).reverse().map((s) => (
          <div key={s.pk.overall} className="row sp" style={{ padding: "6px 0" }}>
            <div className="mini" style={{ color: "var(--chalk)" }}><Tap id={s.p.id}>{s.p.name}</Tap> <span style={{ color: "var(--mute)" }}>· {lg.gms[s.pk.gmIdx].name}</span></div>
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
  const ppr = scoringOf(lg);
  const season = lg.season;
  const week = season ? season.week : 1;
  const slots = lineupFor(lg.settings);
  const ids = lg.rosters[u] || [];
  const values = useMemo(() => buildValues(lg, season), [lg, season && season.week, ids.length]);
  const [swap, setSwap] = useState(null);

  /* Before kickoff there is no season object to hold lineups, so the preseason
     starting eleven lives on the league and is carried into week 1 when the
     season begins. Either way, editing works. */
  const stored = season ? season.lineups?.[week] : lg.preseasonLineup;
  const lineup = stored
    || (season ? optimalLineup(lg, season, ids, week, values) : defaultLineup(lg, ids, values));

  const setLineup = (next) => {
    setLg((prev) => {
      if (!prev.season) return { ...prev, preseasonLineup: next };
      return { ...prev, season: { ...prev.season, lineups: { ...prev.season.lineups, [week]: next } } };
    });
  };

  const bench = ids.filter((id) => !lineup.includes(id));
  const projTotal = lineup.reduce((s, id) => s + (id ? values[id].ppg : 0), 0);

  if (!ids.length) return <Empty text="Draft a team first. Head to the Draft tab." />;

  return (
    <div className="wrap">
      <div className="row sp" style={{ marginBottom: 12 }}>
        <div>
          <div className="eyebrow">{season ? `Mock week ${week} lineup` : "Projected starters"}</div>
          <h1 style={{ fontSize: 34, marginTop: 4 }}>{lg.gms[u].name}</h1>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="disp num" style={{ fontSize: 30, color: "var(--first)" }}>{projTotal.toFixed(1)}</div>
          <div className="eyebrow">proj pts</div>
        </div>
      </div>

      <button className="btn alt" style={{ marginBottom: 11 }}
        onClick={() => {
          setLineup(season ? optimalLineup(lg, season, ids, week, values) : defaultLineup(lg, ids, values));
          toast("Lineup optimized");
        }}>
        Optimize lineup
      </button>

      <div className="card tight">
        {slots.map((s, i) => {
          const id = lineup[i];
          const p = id ? BY_ID[id] : null;
          const bad = p && season && (p.bye === week || season.injuries[p.id] > 0);
          return (
            <div key={i} className="plr" onClick={() => setSwap({ i, accepts: s.accepts })} style={{ cursor: "pointer" }}>
              <div className="disp" style={{ width: 42, fontSize: 13, color: "var(--mute)", flex: "none" }}>{s.slot}</div>
              {p ? (
                <>
                  <div className={POSC(p.pos)}>{p.pos === "DST" ? "DEF" : p.pos}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="nm"><Tap id={p.id}>{p.name}</Tap> {bad && <span className={`tag ${p.bye === week ? "t-bye" : "t-out"}`}>{p.bye === week ? "BYE" : "OUT"}</span>}</div>
                    <div className="sub">{p.team}{oppLabel(p, season, week, values)}</div>
                  </div>
                </>
              ) : <div style={{ flex: 1 }} className="mini">Tap to fill</div>}
              {p && season ? <RangeCell p={p} season={season} week={week} values={values} /> : null}
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
            sub={season ? `${p.team}${oppLabel(p, season, week, values)}` : `${p.team} · Bye ${p.bye || "TBD"}`}
            right={season
              ? <RangeCell p={p} season={season} week={week} values={values} />
              : <div style={{ textAlign: "right" }}>
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

// "· vs SEA · tough" style line under a player in a live mock week
function oppLabel(p, season, week, values) {
  if (!season) return ` · Bye ${p.bye || "TBD"}`;
  const o = weekOutlook(p, season, week, values);
  if (o.status === "BYE") return " · on bye";
  if (o.status === "OUT") return " · injured";
  if (!o.opp) return " · no game";
  return ` · vs ${o.opp}`;
}

// Floor and ceiling for one player in one week, drawn as a band.
function RangeCell({ p, season, week, values }) {
  const o = weekOutlook(p, season, week, values);
  if (o.status) {
    return <div className="rng"><div className="sub" style={{ color: "var(--mute)" }}>{o.status === "BYE" ? "Bye" : "Out"}</div></div>;
  }
  const cap = Math.max(o.high, 1);
  const l = (o.low / cap) * 100, h = 100, m = (o.mean / cap) * 100;
  return (
    <div className="rng">
      <div className="num" style={{ fontSize: 13, fontWeight: 700 }}>{o.mean.toFixed(1)}</div>
      <div className="rngbar">
        <i style={{ left: `${l}%`, right: `${100 - h}%` }} />
        <b style={{ left: `calc(${m}% - 1px)` }} />
      </div>
      <div className="num" style={{ fontSize: 10, color: "var(--mute)" }}>{o.low.toFixed(1)}–{o.high.toFixed(1)}</div>
      <div className={`opp o-${o.grade}`}>{o.grade === "even" ? "neutral" : o.grade} matchup</div>
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
      <h2 style={{ fontSize: 23, marginBottom: 10 }}>Roster audit</h2>
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
          <b style={{ color: "var(--green)" }}>{team} stack:</b> {v.map((p) => p.name).join(" + ")}. They boom in the same weeks.
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

function SeasonView({ lg, setLg, toast, setTab }) {
  const u = lg.settings.userSlot;
  const s = lg.season;
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState("hub");
  const [claims, setClaims] = useState([]);
  const [odds, setOdds] = useState(null);
  const [claimFor, setClaimFor] = useState(null);
  const [tradeMode, setTradeMode] = useState("desk");

  if (!draftDone(lg)) return <Empty text="Finish your draft first. The season needs a full roster." />;

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
          <button className="btn" onClick={() => setLg((p) => {
              const season = startSeason(p);
              // keep whatever they set up before kickoff
              if (p.preseasonLineup) season.lineups[1] = p.preseasonLineup;
              return { ...p, season };
            })}>Kick off week 1</button>
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
  const faabMode = lg.settings.waiverMode !== "priority";

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
      <div style={{ marginBottom: 10 }}>
        <div className="eyebrow">{done ? "Season complete" : rs ? "Regular season" : "Playoffs"}</div>
        <h1 style={{ fontSize: 34, marginTop: 4 }}>{done ? "Final" : `Week ${s.week}`}</h1>
      </div>
      {/* one row, five equal segments, so nothing scrolls sideways */}
      <div className="segs">
        {[["hub", "Hub"], ["recap", "Scores"], ["standings", "Table"], ["wire", "Wire"], ["trade", "Trade"]].map(([v, l]) => {
          const alert = (v === "wire" && claims.length > 0) || (v === "hub" && s.tradeOffer);
          return (
            <button key={v} className={`seg ${view === v ? "on" : ""}`} onClick={() => setView(v)}>
              {l}{alert ? <span className="badge" aria-hidden="true">1</span> : null}
            </button>
          );
        })}
      </div>

      {done && <ChampionCard lg={lg} s={s} />}

      {view === "hub" && !done && (
        <>
          {s.tradeOffer && <OfferCard lg={lg} setLg={setLg} values={values} toast={toast} />}
          {myMatch ? <MatchPreview lg={lg} s={s} values={values} pair={myMatch} /> :
            <div className="card"><div className="mini">You're not in this round of the playoffs. Sim ahead to see who takes the title.</div></div>}

          <div className="eyebrow" style={{ margin: "16px 0 8px" }}>Before you sim</div>

          <button className="act" onClick={() => setTab && setTab("team")}>
            <div className="ico">LU</div>
            <div style={{ flex: 1 }}>
              <h4>Mock lineup</h4>
              <div className="mini">{lineupWarn(lg, s, values) || "Starters look good for this week"}</div>
            </div>
            <div className="arw">›</div>
          </button>

          <button className="act b" onClick={() => setView("wire")}>
            <div className="ico">W</div>
            <div style={{ flex: 1 }}>
              <h4>Mock waiver wire {claims.length > 0 && <span className="pill">{claims.length} queued</span>}</h4>
              <div className="mini">
                {faabMode ? `$${s.faab[u]} left · ` : `Priority #${s.waiverOrder.indexOf(u) + 1} · `}
                {topFA(lg, s)} is the top add
              </div>
            </div>
            <div className="arw">›</div>
          </button>

          <button className="act g" onClick={() => setView("trade")}>
            <div className="ico">T</div>
            <div style={{ flex: 1 }}>
              <h4>Mock trade</h4>
              <div className="mini">Offer a deal to any of the {lg.settings.teams - 1} simulated teams and hear back</div>
            </div>
            <div className="arw">›</div>
          </button>

          <button className="act r" disabled={busy} onClick={advance} style={{ marginTop: 4 }}>
            <div className="ico">▶</div>
            <div style={{ flex: 1 }}>
              <h4>{busy ? "Simulating…" : `Sim week ${s.week}`}</h4>
              <div className="mini">Locks lineups, scores every game, processes waivers</div>
            </div>
            <div className="arw">›</div>
          </button>

          <div className="grid2" style={{ marginTop: 4 }}>
            <button className="btn alt" disabled={busy} onClick={simRest}>Sim to the end</button>
            <button className="btn alt" onClick={runOdds}>Playoff odds</button>
          </div>
          {odds && (
            <div className="card" style={{ marginTop: 11 }}>
              <h2 style={{ fontSize: 23, marginBottom: 9 }}>Monte Carlo · 260 seasons</h2>
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

      {view === "trade" && (
        <>
          <div className="segs" style={{ marginBottom: 12 }}>
            {[["desk", "Propose"], ["scan", "Scan league"]].map(([k, l]) => (
              <button key={k} className={`seg ${tradeMode === k ? "on" : ""}`} onClick={() => setTradeMode(k)}>{l}</button>
            ))}
          </div>
          {tradeMode === "desk"
            ? <TradeDesk lg={lg} setLg={setLg} values={values} toast={toast} />
            : <TradeFinder lg={lg} toast={toast} />}
        </>
      )}
    </div>
  );
}

// plain-language warning for the lineup action row
function lineupWarn(lg, s, values) {
  const u = lg.settings.userSlot;
  const lu = s.lineups[s.week];
  if (!lu) return "Set for you. Tap to review and change it";
  const bad = lu.filter((id) => id && (BY_ID[id].bye === s.week || s.injuries[id] > 0));
  if (bad.length) return `${bad.length} starter${bad.length > 1 ? "s" : ""} on bye or injured. Fix it`;
  const empty = lu.filter((x) => !x).length;
  if (empty) return `${empty} empty slot${empty > 1 ? "s" : ""} scoring zero`;
  return null;
}
function topFA(lg, s) {
  const b = waiverBoard(lg, s, 1);
  return b.length ? BY_ID[b[0].p.id].name : "nobody";
}

/* ---- ESPN-style trade desk: build an offer, get a real answer ---- */

function TradeDesk({ lg, setLg, values, toast }) {
  const u = lg.settings.userSlot;
  const [partner, setPartner] = useState(null);
  const [mine, setMine] = useState([]);
  const [theirs, setTheirs] = useState([]);
  const [reply, setReply] = useState(null);

  const others = lg.gms.filter((g) => !g.isUser);

  /* Sort partners by how many workable deals exist with them, so the teams
     worth approaching sit at the top instead of being found by trial. */
  const ranked = useMemo(() => {
    if (!lg.season) return [];
    return others.map((g) => ({
      g,
      need: weakestPos(lg, g.idx, values),
      rec: lg.season.record[g.idx],
      fits: findTrades(lg, lg.rosters[u], values, { [g.idx]: lg.rosters[g.idx] }).length,
    })).sort((a, b) => b.fits - a.fits);
  }, [lg, values, u]);

  /* Every hook must run on every render. This memo used to sit below the
     early return for the partner list, so picking a partner changed the hook
     count and React tore the whole screen down. Keep hooks above any return. */
  /* Building an offer piece by piece is slow. These are packages this partner
     would plausibly accept, computed from both rosters, so a fair deal is two
     taps away and the manual builder stays available underneath. */
  const suggestions = useMemo(() => {
    if (partner == null) return [];
    const single = { [partner]: lg.rosters[partner] };
    return findTrades(lg, lg.rosters[u], values, single)
      // predict the answer rather than hiding deals, so nothing looks broken
      // when a partner is simply hard to trade with
      .map((t) => ({ ...t, reply: evaluateOffer(lg, lg.season, partner, t.give, t.getIds) }))
      .sort((a, b) => (b.reply.accept - a.reply.accept) || (b.myGain - a.myGain))
      .slice(0, 3);
  }, [partner, lg, values, u]);

  if (partner == null) {
    return (
      <>
        <div className="card">
          <div className="eyebrow">Step 1</div>
          <h2 style={{ fontSize: 25, margin: "5px 0 6px" }}>Pick a mock trade partner</h2>
          <div className="mini">Each team's biggest hole is listed. Target the one that needs what you have spare.</div>
        </div>
        {ranked.map(({ g, need, rec, fits }) => (
          <button key={g.idx} className={`act ${fits ? "g" : "b"}`}
            onClick={() => { setPartner(g.idx); setMine([]); setTheirs([]); setReply(null); }}>
            <div className="ico">{need}</div>
            <div style={{ flex: 1 }}>
              <h4>{g.name}</h4>
              <div className="mini">
                {rec.w}-{rec.l} · needs {need} help
                {fits ? ` · ${fits} deal${fits > 1 ? "s" : ""} to look at` : " · no clean fit"}
              </div>
            </div>
            <div className="arw">›</div>
          </button>
        ))}
      </>
    );
  }

  const v = tradeVerdict(mine, theirs, values);
  const canSend = mine.length > 0 && theirs.length > 0;


  const send = () => {
    const res = evaluateOffer(lg, lg.season, partner, mine, theirs);
    setReply(res);
    if (res.accept) {
      setLg((prev) => {
        const n = JSON.parse(JSON.stringify(prev));
        n.rosters[u] = n.rosters[u].filter((x) => !mine.includes(x)).concat(theirs);
        n.rosters[partner] = n.rosters[partner].filter((x) => !theirs.includes(x)).concat(mine);
        n.season.log.push({ week: n.season.week, type: "trade", gm: partner, out: mine, in: theirs });
        return n;
      });
      toast("Trade accepted");
    }
  };

  const Col = ({ label, ids, sel, setSel }) => (
    <div className="card tight" style={{ marginBottom: 9 }}>
      <div className="eyebrow" style={{ padding: "11px 11px 7px" }}>{label}</div>
      {ids.slice().sort((a, b) => values[b].tv - values[a].tv).map((id) => {
        const on = sel.includes(id);
        return (
          <div key={id} className="plr" onClick={() => { setSel(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]); setReply(null); }}
            style={{ cursor: "pointer", background: on ? "rgba(127,209,232,.10)" : undefined }}>
            <div className={POSC(BY_ID[id].pos)}>{BY_ID[id].pos === "DST" ? "DEF" : BY_ID[id].pos}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="nm"><Tap id={id}>{BY_ID[id].name}</Tap></div>
              <div className="sub">{BY_ID[id].team} · {values[id].ppg.toFixed(1)} ppg · value {values[id].tv}</div>
            </div>
            <div className={`chip ${on ? "on" : ""}`}>{on ? "Added" : "Add"}</div>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      <div className="row sp" style={{ marginBottom: 10 }}>
        <div>
          <div className="eyebrow">Mock offer to</div>
          <h2 style={{ fontSize: 30, marginTop: 3 }}>{lg.gms[partner].name}</h2>
        </div>
        <button className="chip" onClick={() => setPartner(null)}>Change team</button>
      </div>

      {suggestions.length > 0 && (
        <>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Ready-made offers, best first</div>
          {suggestions.map((t, i) => {
            const loaded = mine.length === t.give.length && theirs.length === t.getIds.length
              && t.give.every((x) => mine.includes(x)) && t.getIds.every((x) => theirs.includes(x));
            return (
              <button key={i} className={`act ${loaded ? "" : "g"}`} style={{ alignItems: "flex-start" }}
                onClick={() => { setMine(t.give); setTheirs(t.getIds); setReply(null); }}>
                <div className="ico">{Math.round(t.ratio * 100)}%</div>
                <div style={{ flex: 1 }}>
                  <h4>
                    {loaded ? "Loaded below"
                      : t.reply.accept ? "They should say yes"
                        : t.reply.close ? "Close, expect a counter"
                          : "Worth asking"}
                  </h4>
                  <div className="mini">
                    Send {t.give.map((id) => BY_ID[id].name).join(" and ")}
                    {" for "}{t.getIds.map((id) => BY_ID[id].name).join(" and ")}
                  </div>
                  <div className="mini" style={{ marginTop: 3, color: t.myGain >= 0 ? "var(--green)" : "var(--mute)" }}>
                    {t.myGain >= 0
                      ? `Your starters gain ${t.myGain.toFixed(1)} points a week`
                      : `Costs ${Math.abs(t.myGain).toFixed(1)} points a week now, buys a better starter`}
                  </div>
                </div>
                <div className="arw">›</div>
              </button>
            );
          })}
          <div className="divider" />
          <div className="eyebrow" style={{ marginBottom: 8 }}>Or build your own</div>
        </>
      )}

      {(mine.length > 0 || theirs.length > 0) && (
        <button className="chip" style={{ marginBottom: 9 }}
          onClick={() => { setMine([]); setTheirs([]); setReply(null); }}>
          Clear selection
        </button>
      )}

      <Col label="You send" ids={lg.rosters[u]} sel={mine} setSel={setMine} />
      <Col label={`You get from ${lg.gms[partner].name}`} ids={lg.rosters[partner]} sel={theirs} setSel={setTheirs} />

      {canSend && (
        <div className="card fdl" style={{ paddingLeft: 15 }}>
          <div className="eyebrow">Value check</div>
          <h2 style={{ fontSize: 25, margin: "5px 0 9px", color: v.pct < -8 ? "var(--green)" : v.pct > 8 ? "var(--red)" : "var(--first)" }}>
            {v.verdict}
          </h2>
          <div className="row sp mini" style={{ marginBottom: 9 }}><span>Out {v.a}</span><span>In {v.b}</span></div>
          <div className="divider" />
          {(() => {
            const meImpact = swapImpact(lg, lg.rosters[u], mine, theirs, values);
            const themImpact = swapImpact(lg, lg.rosters[partner], theirs, mine, values);
            return (
              <>
                <div className="eyebrow" style={{ marginBottom: 6 }}>Weekly lineup impact</div>
                <div className="row sp mini" style={{ marginBottom: 4 }}>
                  <span>You</span>
                  <b className="num" style={{ color: meImpact > 0.4 ? "var(--green)" : meImpact < -0.4 ? "var(--red)" : "var(--mute)" }}>
                    {meImpact > 0 ? "+" : ""}{meImpact.toFixed(1)} pts
                  </b>
                </div>
                <div className="row sp mini" style={{ marginBottom: 7 }}>
                  <span>{lg.gms[partner].name}</span>
                  <b className="num" style={{ color: themImpact > 0.4 ? "var(--green)" : themImpact < -0.4 ? "var(--red)" : "var(--mute)" }}>
                    {themImpact > 0 ? "+" : ""}{themImpact.toFixed(1)} pts
                  </b>
                </div>
                <div className="mini">
                  {meImpact > 0.4 && themImpact > 0.4
                    ? "Both lineups improve. These are the deals that actually get accepted."
                    : themImpact < 0
                      ? "Their starting lineup gets worse, so expect a no unless the value gap is large."
                      : "Check that your own weekly total is moving the right way before you send it."}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {reply && (
        <div className="card" style={{ borderColor: reply.accept ? "var(--green)" : reply.close ? "var(--first)" : "var(--red)" }}>
          <div className="eyebrow" style={{ color: reply.accept ? "var(--green)" : reply.close ? "var(--first)" : "var(--red)" }}>
            {lg.gms[partner].name} {reply.accept ? "accepted" : reply.close ? "countered" : "declined"}
          </div>
          <div className="mini" style={{ marginTop: 6, color: "var(--chalk)" }}>"{reply.reply}"</div>
        </div>
      )}

      <button className="btn" disabled={!canSend || reply?.accept} onClick={send}>
        {reply && !reply.accept ? "Send revised mock offer" : "Send mock offer"}
      </button>
    </>
  );
}

function ChampionCard({ lg, s }) {
  const g = lg.gms[s.champion];
  return (
    <div className="card" style={{ borderColor: "var(--first)", background: "rgba(127,209,232,.07)" }}>
      <div className="eyebrow">Champion</div>
      <h1 style={{ fontSize: 32, margin: "6px 0" }}>{g.name}</h1>
      <div className="mini">{g.isUser ? "You won it. The season broke your way. Check the wire log to see which pickup swung it." : "Better luck next mock. Run it back from the home screen with a different draft slot."}</div>
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
          <h2 style={{ fontSize: 30, marginBottom: 8 }}>Injury report</h2>
          {wk.injuries.map((n) => (
            <div key={n.id} className="mini" style={{ marginBottom: 4 }}>
              <Tap id={n.id} style={{ color: "var(--red)", fontWeight: 700 }}>{BY_ID[n.id].name}</Tap> out {n.wks > 20 ? "for the season" : `${n.wks} week${n.wks > 1 ? "s" : ""}`}
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
          <div key={t.idx} className="plr" style={{ background: t.isUser ? "rgba(127,209,232,.07)" : undefined }}>
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
          <h2 style={{ fontSize: 23, marginBottom: 8 }}>Bracket</h2>
          <div className="mini">Seeds: {s.playoffs.seeds.map((i, k) => `${k + 1}. ${lg.gms[i].name}`).join(" · ")}</div>
        </div>
      )}
      {s.log.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: 23, marginBottom: 9 }}>Transactions</h2>
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
                  <b style={{ color: lg.gms[it.gm].isUser ? "var(--first)" : "var(--chalk)" }}>{lg.gms[it.gm].name}</b> added <Tap id={it.add}>{BY_ID[it.add].name}</Tap>{it.bid != null ? ` ($${it.bid})` : ""}
                  {it.drop ? `, dropped ${BY_ID[it.drop].name}` : ""}
                  {it.losers.length ? `, outbid ${it.losers.length}` : ""}
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
            <div className="eyebrow">{faab ? "Mock FAAB remaining" : "Mock waiver priority"}</div>
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
            : `Claims process when you sim the week. You pick ${s.waiverOrder.indexOf(u) + 1}${["st","nd","rd"][s.waiverOrder.indexOf(u)] || "th"} this week. Claiming sends you to the back of the line.`}
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
          <input type="number" inputMode="numeric" enterKeyHint="done" min={0} max={s.faab[u]} value={bid}
            onChange={(e) => setBid(+e.target.value)} style={{ marginBottom: 11 }}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} />
        </>}
        <div className="eyebrow" style={{ marginBottom: 6 }}>Drop</div>
        <div style={{ maxHeight: 240, overflowY: "auto", marginBottom: 11, WebkitOverflowScrolling: "touch" }}>
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
          {o.wants.map((id) => <div key={id} className="mini" style={{ color: "var(--chalk)" }}><Tap id={id}>{BY_ID[id].name}</Tap></div>)}
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>You get</div>
          {o.gives.map((id) => <div key={id} className="mini" style={{ color: "var(--chalk)" }}><Tap id={id}>{BY_ID[id].name}</Tap></div>)}
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
  const kb = useKeyboardInset();
  const list = (pool || PLAYERS).filter((p) => !q || norm(p.name).includes(norm(q))).slice(0, 50);
  return (
    <Sheet open={open} onClose={onClose} title={title || "Add player"}>
      <input placeholder="Search players" value={q} onChange={(e) => setQ(e.target.value)}
        style={{ marginBottom: 10 }} enterKeyHint="search"
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} />
      <div
        style={{ maxHeight: kb ? `calc(100vh - ${kb + 210}px)` : "58vh", overflowY: "auto", WebkitOverflowScrolling: "touch" }}
        onTouchMove={() => { if (document.activeElement?.blur) document.activeElement.blur(); }}
      >
        {list.map((p) => <PlayerRow key={p.id} p={p} onClick={() => { onPick(p); setQ(""); }} />)}
      </div>
    </Sheet>
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
          <h2 style={{ fontSize: 28, margin: "6px 0 11px", color: v.pct < -8 ? "var(--green)" : v.pct > 8 ? "var(--red)" : "var(--first)" }}>
            {v.verdict}
          </h2>
          <div className="row" style={{ gap: 2, marginBottom: 8 }}>
            <div style={{ height: 22, width: `${(v.a / total) * 100}%`, background: "var(--red)", borderRadius: "4px 0 0 4px" }} />
            <div style={{ height: 22, width: `${(v.b / total) * 100}%`, background: "var(--green)", borderRadius: "0 4px 4px 0" }} />
          </div>
          <div className="row sp mini" style={{ marginBottom: 10 }}>
            <span>Out {v.a}</span><span>In {v.b}</span>
          </div>
          {myIds.length > 0 && (() => {
            const impact = swapImpact(lg, myIds, send.map((p) => p.id), get.map((p) => p.id), values);
            return (
              <>
                <div className="divider" />
                <div className="eyebrow" style={{ marginBottom: 5 }}>What it does to your lineup</div>
                <div className="row sp" style={{ marginBottom: 7 }}>
                  <div className="mini">Weekly starting points</div>
                  <div className="num disp" style={{ fontSize: 22, color: impact > 0.4 ? "var(--green)" : impact < -0.4 ? "var(--red)" : "var(--mute)" }}>
                    {impact > 0 ? "+" : ""}{impact.toFixed(1)}
                  </div>
                </div>
                <div className="mini">
                  {Math.abs(impact) < 0.4
                    ? "Almost no change to what you actually start. Market value moves, your Sunday does not."
                    : impact > 0
                      ? `You would start ${impact.toFixed(1)} more points a week. This is the number that matters more than the raw value split.`
                      : `You would start ${Math.abs(impact).toFixed(1)} fewer points a week, even if the value looks close.`}
                </div>
              </>
            );
          })()}
          <div className="divider" />
          <div className="mini">
            Market value is rest-of-season points over replacement, weighted toward playoff weeks and curved so one
            elite player outweighs two mid pieces. Roster impact above is what those players do for your actual lineup.
            {send.length > get.length && " You're consolidating, which this model rewards."}
            {get.length > send.length && " You're taking on more bodies, and depth only pays off if you can start it."}
          </div>
        </div>
      )}
      <PlayerPicker open={!!pick} onClose={() => setPick(null)} title={pick?.label}
        pool={pick?.pool} onPick={(p) => { pick.setArr([...pick.arr, p]); setPick(null); }} />
    </>
  );
}

/* ---- in-league trade finder ---- */

/* Trade finder.
   Real packages almost never send two of the same scarce position, and nobody
   accepts a deal that hands the other side three times the value. Both of those
   are filtered out here, and every suggestion is checked against what it does to
   the partner's actual starting lineup. */

// which multi-player packages are believable
function packageOK(ids) {
  if (ids.length < 2) return true;
  const count = {};
  ids.forEach((id) => { const p = BY_ID[id].pos; count[p] = (count[p] || 0) + 1; });
  // nobody trades away two quarterbacks or two tight ends together
  if ((count.QB || 0) > 1) return false;
  if ((count.TE || 0) > 1) return false;
  if ((count.K || 0) > 1 || (count.DST || 0) > 1) return false;
  if (count.K || count.DST) return false;          // kickers and defenses are not trade chips
  return true;
}

// two backs or two receivers only work when you are genuinely deep there
function canSpare(ids, playerIds, values) {
  const byPos = {};
  playerIds.forEach((id) => { const p = BY_ID[id].pos; (byPos[p] = byPos[p] || []).push(id); });
  for (const [pos, list] of Object.entries(byPos)) {
    if (list.length < 2) continue;
    const depth = ids.filter((id) => BY_ID[id].pos === pos).length;
    if (depth < 4) return false;
    // the pieces going out must not be your top two at the spot
    const ranked = ids.filter((id) => BY_ID[id].pos === pos).sort((a, b) => values[b].ppg - values[a].ppg);
    if (list.some((id) => ranked.indexOf(id) < 2)) return false;
  }
  return true;
}

// after the deal, can this roster still field a legal starting lineup with a
// real bench? Stops packages that send away your only quarterback.
function stillFieldsATeam(lg, ids, outIds, inIds) {
  const after = ids.filter((x) => !outIds.includes(x)).concat(inIds);
  const c = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0 };
  after.forEach((id) => { c[BY_ID[id].pos] = (c[BY_ID[id].pos] || 0) + 1; });
  const min = lg.settings.superflex
    ? { QB: 2, RB: 3, WR: 3, TE: 1, K: 1, DST: 1 }
    : { QB: 1, RB: 3, WR: 3, TE: 1, K: 1, DST: 1 };
  return Object.entries(min).every(([pos, n]) => (c[pos] || 0) >= n);
}

function findTrades(lg, myIds, values, rosters) {
  const out = [];
  const seen = new Set();
  const myWeak = weakestPosFromIds(myIds, values);

  const add = (gmIdx, give, getIds, theirWeak, ids) => {
    if (!packageOK(give) || !packageOK(getIds)) return;
    if (!canSpare(myIds, give, values)) return;
    if (!canSpare(ids, getIds, values)) return;
    if (!stillFieldsATeam(lg, myIds, give, getIds)) return;
    if (!stillFieldsATeam(lg, ids, getIds, give)) return;
    const v = tradeVerdict(give, getIds, values);
    const ratio = v.b / Math.max(0.1, v.a);
    // both a floor and a ceiling: a deal that is far too good for you is one
    // the other manager simply declines
    if (ratio < 0.82 || ratio > 1.32) return;
    // it has to help their weekly lineup, or they say no
    const theirGain = swapImpact(lg, ids, getIds, give, values);
    const myGain = swapImpact(lg, myIds, give, getIds, values);
    if (theirGain < 0.1) return;
    const consolidating = give.length > getIds.length;
    if (consolidating) {
      /* Sending two for one almost always dips your weekly total, because a
         bench player has to fill the vacated slot. That is the real cost of
         consolidation, and it is worth paying only when the incoming player is
         a genuine top-end starter. */
      const inc = getIds[0];
      const atPos = myIds.filter((id) => BY_ID[id].pos === BY_ID[inc].pos && !give.includes(id))
        .sort((a, b) => values[b].ppg - values[a].ppg);
      const beatsMyBest = values[inc].ppg > (values[atPos[0]]?.ppg ?? 0);
      if (!beatsMyBest || myGain < -1.6) return;
    } else if (myGain < 0.1) return;
    const sig = [gmIdx, give.slice().sort().join(","), getIds.slice().sort().join(",")].join("|");
    if (seen.has(sig)) return;
    seen.add(sig);
    out.push({ gmIdx: Number(gmIdx), give, getIds, v, myWeak, theirWeak, ratio, myGain, theirGain });
  };

  for (const [gmIdxRaw, ids] of Object.entries(rosters)) {
    const gmIdx = Number(gmIdxRaw);
    if (gmIdx === lg.settings.userSlot) continue;
    const theirWeak = weakestPosFromIds(ids, values);

    // pieces I can spare at the spot they need, and what they have at mine
    const myGive = myIds.filter((id) => BY_ID[id].pos === theirWeak)
      .sort((a, b) => values[b].tv - values[a].tv);
    const theirGive = ids.filter((id) => BY_ID[id].pos === myWeak)
      .sort((a, b) => values[b].tv - values[a].tv);

    // straight one for one
    for (const g of myGive.slice(0, 4)) {
      const surplus = myIds.filter((id) => BY_ID[id].pos === BY_ID[g].pos && values[id].ppg >= values[g].ppg).length;
      if (surplus < 2) continue;
      for (const t of theirGive.slice(0, 4)) add(gmIdx, [g], [t], theirWeak, ids);
    }

    // two for one, but the two pieces come from different positions so the
    // package reads like something a real manager would actually send
    const filler = myIds
      .filter((id) => !myGive.includes(id) && !["K", "DST"].includes(BY_ID[id].pos))
      .sort((a, b) => values[b].tv - values[a].tv);
    for (const g of myGive.slice(0, 2)) {
      for (const f of filler.slice(0, 6)) {
        if (BY_ID[f].pos === BY_ID[g].pos) {
          // same position is allowed only for backs and receivers, and only deep
          if (!["RB", "WR"].includes(BY_ID[f].pos)) continue;
        }
        for (const t of theirGive.slice(0, 3)) add(gmIdx, [g, f], [t], theirWeak, ids);
      }
    }
  }

  // spread suggestions across teams instead of stacking one partner
  const perTeam = {};
  return out
    .sort((a, b) => (b.myGain + b.theirGain) - (a.myGain + a.theirGain))
    .filter((t) => {
      perTeam[t.gmIdx] = (perTeam[t.gmIdx] || 0) + 1;
      return perTeam[t.gmIdx] <= 2;
    })
    .slice(0, 8);
}

// plain-language reason a package makes sense, written from the actual pieces
function tradeRationale(t) {
  const outPos = [...new Set(t.give.map((id) => BY_ID[id].pos))];
  const inPos = [...new Set(t.getIds.map((id) => BY_ID[id].pos))];
  const names = t.getIds.map((id) => BY_ID[id].name.split(" ").slice(-1)[0]).join(" and ");
  const consolidating = t.give.length > t.getIds.length;
  const bits = [];
  bits.push(`They need ${t.theirWeak} and you can spare ${outPos.join(" and ")}.`);
  bits.push(consolidating
    ? `You trade depth for ${names}. Your bench gets thinner, which is the price of a better starter.`
    : `${names} slots straight into your ${inPos.join("/")} hole.`);
  return bits.join(" ");
}

export function weakestPosFromIds(ids, values) {
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
              {t.give.map((id) => <div key={id} className="mini" style={{ color: "var(--chalk)" }}><Tap id={id}>{BY_ID[id].name}</Tap> <span style={{ color: "var(--mute)" }}>{BY_ID[id].pos}</span></div>)}
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 4 }}>You get</div>
              {t.getIds.map((id) => <div key={id} className="mini" style={{ color: "var(--chalk)" }}><Tap id={id}>{BY_ID[id].name}</Tap> <span style={{ color: "var(--mute)" }}>{BY_ID[id].pos}</span></div>)}
            </div>
          </div>
          <div className="mini">{tradeRationale(t)}</div>
          <div className="row sp mini" style={{ marginTop: 7 }}>
            <span>Your weekly starters</span>
            <b className="num" style={{ color: "var(--green)" }}>+{t.myGain.toFixed(1)}</b>
          </div>
          <div className="row sp mini">
            <span>Theirs</span>
            <b className="num" style={{ color: "var(--mute)" }}>+{t.theirGain.toFixed(1)}</b>
          </div>
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
          Screenshot your roster in Sleeper, ESPN, Yahoo, whatever you use, and drop it here. Names get matched against
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
            <h2 style={{ fontSize: 30, margin: "5px 0 7px" }}>{analysis.weak}</h2>
            <div className="mini">Deals below all send out a position where this roster already has starters banked.</div>
          </div>
          {analysis.trades.length === 0 && <div className="card"><div className="mini">No clean fits. This roster is balanced, so hold and work the wire instead.</div></div>}
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
   TOOLS: compare, value radar, questions
   ============================================================ */


function Versus({ lg }) {
  const values = useMemo(() => buildValues(lg, lg.season), [lg]);
  // default to a real positional decision rather than two unrelated players
  const [a, setA] = useState(() => PLAYERS.find((p) => p.pos === "WR") || PLAYERS[2]);
  const [b, setB] = useState(() => PLAYERS.filter((p) => p.pos === "WR")[1] || PLAYERS[3]);
  const [pick, setPick] = useState(null);
  const ppr = scoringOf(lg);
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

  const Col = ({ p, s, on }) => (
    <div className="card" style={{ borderColor: on ? "var(--first)" : "var(--line)", marginBottom: 0 }}
      onClick={() => setPick(p === a ? "a" : "b")}>
      <div className={POSC(p.pos)} style={{ marginBottom: 7 }}>{p.pos === "DST" ? "DEF" : p.pos}</div>
      <div className="nm" style={{ fontSize: 15, marginBottom: 3 }}>{p.name}</div>
      <div className="sub" style={{ marginBottom: 9 }}>{p.team} · ADP {p.adp} · Bye {p.bye || "TBD"}</div>
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
        <h2 style={{ fontSize: 28, margin: "6px 0 8px" }}>{winner.name}</h2>
        <div className="mini">
          {margin < 0.06 ? "Effectively a coin flip. Take the one whose role you believe in more." :
            margin < 0.18 ? "A real but modest edge." : "Clear separation between these two."}
        </div>
        <div className="divider" />
        <div className="eyebrow" style={{ marginBottom: 6 }}>Why</div>
        <div className="mini" style={{ marginBottom: 5 }}>
          <b style={{ color: "var(--chalk)" }}>Replacement level.</b> In a {lg.settings.teams}-team league the drop-off after {winner.name}
          {" "}at {winner.pos} is {winner.pos === "RB" || winner.pos === "TE" ? "steep, and the next tier is a real downgrade" : "gentle, so similar production is available later"}.
        </div>
        <div className="mini" style={{ marginBottom: 5 }}>
          <b style={{ color: "var(--chalk)" }}>Cost.</b> {a.name} goes around pick {a.adp}, {b.name} around {b.adp}.
          {Math.abs(a.adp - b.adp) > 12
            ? ` That ${Math.abs(a.adp - b.adp)}-pick gap means you can often get ${a.adp > b.adp ? a.name : b.name} a round later and take the other now.`
            : " They cost about the same, so this is a straight talent call."}
        </div>
        <div className="mini" style={{ marginBottom: 5 }}>
          <b style={{ color: "var(--chalk)" }}>Range of outcomes.</b> {sa.upside > sb.upside ? a.name : b.name} is the more volatile
          of the two, with a higher ceiling and a lower floor. {Math.abs(sa.upside - sb.upside) < 0.04 ? "Though the gap is small." : ""}
        </div>
        {(sa.byeClash > 1 || sb.byeClash > 1) && (
          <div className="mini">
            <b style={{ color: "var(--red)" }}>Bye conflict.</b> {sa.byeClash > 1 ? `${a.name} shares week ${a.bye} with ${sa.byeClash} of your players` : `${b.name} shares week ${b.bye} with ${sb.byeClash} of your players`}.
          </div>
        )}
      </div>
      <PlayerPicker open={!!pick} onClose={() => setPick(null)} title="Pick a player"
        onPick={(p) => { pick === "a" ? setA(p) : setB(p); setPick(null); }} />
    </>
  );
}

function Radar({ lg }) {
  const ppr = scoringOf(lg);
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
  const kb = useKeyboardInset();
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
        "You are a sharp fantasy football analyst helping with the 2026 NFL season. Be specific, decisive and brief: 4 sentences max unless asked for depth. Reference their actual roster. Skip disclaimers. Do not use em dashes.", 700);
      setMsgs((m) => [...m, { role: "gm", text: t }]);
    } catch {
      setMsgs((m) => [...m, { role: "gm", text: "No connection right now. Try again in a moment." }]);
    }
    setBusy(false);
  };

  return (
    <>
      <div className="card">
        <div className="eyebrow">Second opinion</div>
        <div className="mini" style={{ marginTop: 6 }}>Knows your roster, your scoring, and where you sit in the standings. Ask start/sit, buy low, or draft strategy.</div>
      </div>
      {msgs.map((m, i) => (
        <div key={i} className="card" style={{ borderColor: m.role === "user" ? "var(--line)" : "var(--first)", background: m.role === "user" ? "var(--panel2)" : "var(--panel)" }}>
          <div className="eyebrow" style={{ marginBottom: 5 }}>{m.role === "user" ? "You" : "Answer"}</div>
          <div className="mini" style={{ color: "var(--chalk)", whiteSpace: "pre-wrap" }}>{m.text}</div>
        </div>
      ))}
      {busy && <div className="card"><div className="mini">Thinking…</div></div>}
      <div className="row" style={{ gap: 7, marginTop: 4, marginBottom: kb ? kb + 12 : 0 }}>
        <input placeholder="Who do I start at flex?" value={q} onChange={(e) => setQ(e.target.value)}
          enterKeyHint="send"
          onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ block: "center", behavior: "smooth" }), 250)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.currentTarget.blur(); send(); } }} />
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

export const VERSION = "1.13.0";
const MY_KEY = "huddle:myteam";

const DEFAULT_MY = { ids: [], teams: 12, ppr: 1, superflex: false, name: "My Team", topPad: 0, liveInjuries: true };

// a minimal league-shaped object so the engine works outside a mock draft
function shellLeague(my) {
  return {
    id: "real", name: my.name,
    settings: { teams: my.teams, rounds: 15, ppr: my.ppr, scoring: resolveScoring(my.scoring ?? my.ppr), superflex: my.superflex, userSlot: 0, faab: 100, waiverMode: "faab" },
    gms: [{ idx: 0, name: my.name, isUser: true }],
    order: [], picks: [], rosters: { 0: my.ids }, season: null,
  };
}

function useMyTeam() {
  const [my, setMy] = useState(DEFAULT_MY);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    ensureRecoveryRestored()
      .then(() => store.get(MY_KEY))
      .then((v) => { if (v) setMy({ ...DEFAULT_MY, ...v }); setReady(true); });
  }, []);
  const save = useCallback((next) => {
    setMy(next);
    store.set(MY_KEY, next);
    recoverySet(RECOVERY_MY, next);
  }, []);
  return [my, save, ready];
}

/* ---- roster manager: the spine of real-team mode ---- */

function MyRoster({ my, save, toast, compact }) {
  const [pick, setPick] = useState(false);
  const lg = shellLeague(my);
  const values = useMemo(() => buildValues(lg, null), [my.ids.length, my.ppr, my.teams, my.superflex, JSON.stringify(my.scoring || null)]);
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
            <PlayerRow key={id} p={BY_ID[id]} sub={`${BY_ID[id].team} · Bye ${BY_ID[id].bye || "TBD"} · ${values[id].ppg.toFixed(1)} ppg`}
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
        : <div className="card"><div className="mini">Add your roster first. Screenshot it, or tap "My roster" to build it by hand.</div></div>)}
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
        <h2 style={{ fontSize: 30, margin: "5px 0 7px" }}>{weak}</h2>
        <div className="mini">
          Every deal below sends out a spot where you already have starters banked. Values are rest-of-season
          points over replacement for a {my.teams}-team {my.ppr === 1 ? "PPR" : my.ppr === 0.5 ? "half-PPR" : "standard"} league.
        </div>
      </div>
      {trades.length === 0 && <div className="card"><div className="mini">No clean fits. Your roster is balanced enough that every deal costs about what it returns, so work the wire instead.</div></div>}
      {trades.map((t, i) => (
        <div key={i} className="card">
          <div className="row sp" style={{ marginBottom: 9 }}>
            <div className="eyebrow">Target {i + 1}</div>
            <div className="chip on">{Math.round(t.ratio * 100)}% value back</div>
          </div>
          <div className="grid2" style={{ marginBottom: 9 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 4 }}>Send</div>
              {t.give.map((id) => <div key={id} className="mini" style={{ color: "var(--chalk)" }}><Tap id={id}>{BY_ID[id].name}</Tap> <span style={{ color: "var(--mute)" }}>{BY_ID[id].pos}</span></div>)}
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 4 }}>Ask for</div>
              {t.getIds.map((id) => <div key={id} className="mini" style={{ color: "var(--chalk)" }}><Tap id={id}>{BY_ID[id].name}</Tap> <span style={{ color: "var(--mute)" }}>{BY_ID[id].pos}</span></div>)}
            </div>
          </div>
          <div className="mini">{tradeRationale(t)}</div>
          <div className="mini" style={{ marginTop: 6 }}>
            Pitch it to whoever in your league is thinnest at {t.give.map((id) => BY_ID[id].pos).filter((v, i, a) => a.indexOf(v) === i).join(" or ")}.
          </div>
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
        {[["vs", "A over B"], ["radar", "Value radar"], ["gm", "Second opinion"], ["roster", "My roster"]].map(([k, l]) => (
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

function Settings({ my, save, toast, onWipe, injuries }) {
  const liveOn = my.liveInjuries !== false;
  // tolerate being mounted without the loader attached
  const inj = injuries || { meta: null, busy: false, refresh: () => {}, clear: () => {} };
  const [leagues, setLeagues] = useState([]);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState("main");
  const fileRef = useRef(null);
  const [boardCount, setBoardCount] = useState(0);
  useEffect(() => {
    ensureRecoveryRestored()
      .then(() => store.get("huddle:index"))
      .then((v) => setLeagues(v || []))
      .catch(() => setLeagues([]));
    store.get(BOARD_INDEX).then((v) => setBoardCount((v || []).length)).catch(() => setBoardCount(0));
  }, [view]);

  const refresh = async () => {
    setBusy(true);
    try {
      const count = await createRecoverySnapshot(my);
      recoverySet(`${RECOVERY_NS}::refresh`, { version: VERSION, at: Date.now(), leagues: count });
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
          recoverySet(recoveryLeagueKey(id), lg);
          idx.push({ id, name: cleanMockName(lg.name), teams: lg.settings.teams, ppr: lg.settings.ppr, superflex: !!lg.settings.superflex, at: Date.now(), phase: "Imported" });
        }
        await store.set("huddle:index", idx);
        recoverySet(RECOVERY_INDEX, idx);
        setLeagues(idx);
      }
      toast("Save imported");
    } catch { toast("That file didn't parse"); }
  };

  if (view === "boards") return <div className="wrap"><BoardArchive onBack={() => setView("main")} /><div className="navpad" /></div>;
  if (view === "scoring") return (
    <div className="wrap">
      <div className="row sp" style={{ marginBottom: 11 }}>
        <div>
          <div className="eyebrow">Applies to new leagues and your saved roster</div>
          <h2 style={{ fontSize: 30, marginTop: 3 }}>Scoring rules</h2>
        </div>
        <button className="chip" onClick={() => setView("main")}>Back</button>
      </div>
      <ScoringEditor scoring={my.scoring ?? my.ppr} title="Your league scoring"
        onChange={(sc) => save({ ...my, scoring: sc, ppr: sc.rec })} />
      <div className="navpad" />
    </div>
  );

  return (
    <div className="wrap">
      <div className="card fdl m" style={{ paddingLeft: 15 }}>
        <div className="eyebrow">Version</div>
        <h1 className="num" style={{ fontSize: 38, margin: "4px 0 6px" }}>{VERSION}</h1>
        <div className="mini">2026 player pool · consensus ADP through Aug 10 · real 2026 byes</div>
        <button className="btn alt" style={{ marginTop: 12 }} disabled={busy} onClick={refresh}>
          {busy ? "Refreshing…" : "Fetch new version"}
        </button>
        <div className="mini" style={{ marginTop: 7 }}>Creates a recovery snapshot first, then clears the cached app and reloads. Mock seasons are restored automatically if a new build ever loses the normal save keys.</div>
      </div>

      <div className="card">
        <div className="row sp" style={{ marginBottom: 7 }}>
          <h2 style={{ fontSize: 19 }}>Live injury report</h2>
          <button className={`chip ${liveOn ? "on" : ""}`}
            onClick={() => save({ ...my, liveInjuries: !liveOn })}>
            {liveOn ? "On" : "Off"}
          </button>
        </div>
        <div className="mini" style={{ marginBottom: 10 }}>
          Real NFL injury designations from Sleeper, matched onto the player pool. Applies to
          rankings, the trade tools and draft help. A mock season in progress keeps its own
          simulated injuries so it still plays out differently every time.
        </div>
        {liveOn && inj.meta && (
          <div className="grid3" style={{ marginBottom: 10 }}>
            <div className="stat"><b className="num">{inj.meta.matched}</b><span className="eyebrow">matched</span></div>
            <div className="stat"><b className="num">{inj.meta.count}</b><span className="eyebrow">reported</span></div>
            <div className="stat">
              <b className="num" style={{ fontSize: 15 }}>
                {inj.meta.fetchedAt ? new Date(inj.meta.fetchedAt).toLocaleDateString() : "never"}
              </b>
              <span className="eyebrow">updated</span>
            </div>
          </div>
        )}
        {liveOn && inj.meta?.error && (
          <div className="mini" style={{ color: "var(--red)", marginBottom: 9 }}>
            Could not reach Sleeper{inj.meta.source === "stale" ? ", showing the last saved copy." : "."} The rest of Huddle is unaffected.
          </div>
        )}
        {liveOn && (
          <div className="grid2">
            <button className="btn alt" disabled={inj.busy} onClick={() => inj.refresh(true)}>
              {inj.busy ? "Fetching…" : "Refresh now"}
            </button>
            <button className="btn alt" onClick={() => inj.clear()}>Clear cached</button>
          </div>
        )}
        {liveOn && (
          <div className="mini" style={{ marginTop: 8 }}>
            Sleeper asks that this be fetched at most once a day, so it is cached on device and
            refreshes automatically after 12 hours.
          </div>
        )}
      </div>

      <button className="act" onClick={() => setView("boards")}>
        <div className="ico">DB</div>
        <div style={{ flex: 1 }}>
          <h4>Past draft boards</h4>
          <div className="mini">Every completed draft, round by round, saved automatically</div>
        </div>
        <div className="arw">›</div>
      </button>

      <button className="act g" onClick={() => setView("scoring")}>
        <div className="ico">PTS</div>
        <div style={{ flex: 1 }}>
          <h4>Scoring rules</h4>
          <div className="mini">
            {(() => {
              const sc = resolveScoring(my.scoring ?? my.ppr);
              const p = SCORING_PRESETS.find((x) => Object.entries(x.patch).every(([k, v]) => Math.abs((sc[k] ?? 0) - v) < 0.001));
              return p ? `${p.label} · tap to customize` : "Custom rules · tap to edit";
            })()}
          </div>
        </div>
        <div className="arw">›</div>
      </button>

      <div className="card">
        <h2 style={{ fontSize: 23, marginBottom: 9 }}>Save & restore</h2>
        <div className="mini" style={{ marginBottom: 11 }}>
          Everything lives in this browser only. Export before you clear site data, switch phones, or reinstall.
          The file holds your roster and every mock league.
        </div>
        <div className="grid2">
          <button className="btn alt" onClick={exportAll}>Download save</button>
          <button className="btn alt" onClick={() => fileRef.current?.click()}>Import save</button>
        </div>
        <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }}
          onChange={(e) => importAll(e.target.files?.[0])} />
      </div>

      <div className="card">
        <h2 style={{ fontSize: 23, marginBottom: 7 }}>Automatic recovery</h2>
        <div className="mini" style={{ marginBottom: 10 }}>
          Huddle keeps a second, version-proof copy of every mock league on this device. It updates as your league saves and is refreshed again before fetching a new version.
        </div>
        <button className="btn alt" onClick={async () => {
          const count = await createRecoverySnapshot(my);
          toast(`Recovery backup saved · ${count} mock${count === 1 ? "" : "s"}`);
        }}>Back up now</button>
      </div>

      <div className="card">
        <h2 style={{ fontSize: 23, marginBottom: 9 }}>Stored data</h2>
        <div className="row sp mini" style={{ marginBottom: 5 }}>
          <span>Your roster</span><b style={{ color: "var(--chalk)" }}>{my.ids.length} players</b>
        </div>
        <div className="row sp mini" style={{ marginBottom: 5 }}>
          <span>Mock leagues</span><b style={{ color: "var(--chalk)" }}>{leagues.length}</b>
        </div>
        <div className="row sp mini" style={{ marginBottom: 11 }}>
          <span>Saved draft boards</span><b style={{ color: "var(--chalk)" }}>{boardCount}</b>
        </div>
        <button className="btn alt" style={{ color: "var(--red)" }} onClick={async () => {
          if (!window.confirm("Delete your roster and every saved league? This can't be undone.")) return;
          const idx = (await store.get("huddle:index")) || [];
          for (const m of idx) {
            await store.del(`huddle:lg:${m.id}`);
            recoveryDel(recoveryLeagueKey(m.id));
          }
          const bidx = (await store.get(BOARD_INDEX)) || [];
          for (const b of bidx) await store.del(boardKey(b.id));
          await store.set(BOARD_INDEX, []);
          await store.set("huddle:index", []); await store.del(MY_KEY);
          recoverySet(RECOVERY_INDEX, []);
          recoveryDel(RECOVERY_MY); recoveryDel(RECOVERY_ACTIVE);
          save(DEFAULT_MY); setLeagues([]); setBoardCount(0); onWipe(); toast("Everything cleared");
        }}>Clear all data</button>
      </div>

      <div className="card">
        <h2 style={{ fontSize: 23, marginBottom: 6 }}>Top spacing</h2>
        <div className="mini" style={{ marginBottom: 10 }}>
          Phones report status-bar height differently, especially in installed web apps. If the header sits too close
          to the clock, or too far from it, nudge it here.
        </div>
        <div className="grid2" style={{ gap: 7 }}>
          {[0, 10, 20, 34].map((n) => (
            <button key={n} className={`chip ${(my.topPad || 0) === n ? "on" : ""}`}
              style={{ padding: "11px 8px", textAlign: "center", display: "block" }}
              onClick={() => save({ ...my, topPad: n })}>
              {n === 0 ? "Default" : `+${n}px`}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: 23, marginBottom: 9 }}>About the numbers</h2>
        <div className="mini">
          Projections are built from consensus ADP, not scraped expert projections. Ranking order is
          accurate, absolute point totals are estimates. Byes are the real 2026 schedule: six teams are off in
          Week 11, and nobody is off in Week 12.
        </div>
      </div>
    </div>
  );
}

/* ---- live injury loading ----
   Reads the on-device cache immediately so badges appear without waiting on
   the network, then refreshes in the background when the cache is stale. */

function useLiveInjuries(enabled) {
  const [meta, setMeta] = useState(() => getLiveMeta());
  const [busy, setBusy] = useState(false);

  const apply = useCallback((payload) => {
    if (!payload) return null;
    const { byId, matched, unmatched } = matchInjuries(payload.list);
    const next = {
      fetchedAt: payload.fetchedAt, matched, unmatched,
      source: payload.source, error: payload.error || null,
      count: (payload.list || []).length,
    };
    setLiveInjuries(byId, next);
    setMeta(next);
    return next;
  }, []);

  const refresh = useCallback(async (force = false) => {
    setBusy(true);
    try { apply(await loadInjuries({ force })); }
    catch { /* never block the app on this */ }
    setBusy(false);
  }, [apply]);

  useEffect(() => {
    if (!enabled) { setLiveInjuries(null, null); setMeta(null); return; }
    let alive = true;
    (async () => {
      const payload = await loadInjuries({ force: false });
      if (alive) apply(payload);
    })();
    return () => { alive = false; };
  }, [enabled, apply]);

  const clear = useCallback(async () => {
    try { await window.storage.delete(INJURY_CACHE_KEY); } catch { }
    setLiveInjuries(null, null); setMeta(null);
  }, []);

  return { meta, busy, refresh, clear };
}

/* ---- tappable player card ----
   Any player name anywhere opens this. Shows the week-by-week game log, the
   current outlook, and where the player sits at his position. */

const PlayerCtx = React.createContext(null);
export function usePlayerCard() { return React.useContext(PlayerCtx); }

// wrap any name to make it open the card
function Tap({ id, children, style }) {
  const open = usePlayerCard();
  if (!open) return <span style={style}>{children}</span>;
  return (
    <span
      onClick={(e) => { e.stopPropagation(); open(id); }}
      style={{ cursor: "pointer", textDecorationLine: "underline", textDecorationStyle: "dotted",
        textDecorationColor: "var(--line)", textUnderlineOffset: 3, ...style }}
    >{children}</span>
  );
}

/* Full season schedule for one player: who he faces every week, what he
   already scored, and what he projects the rest of the way. This is the view
   that actually settles a waiver claim or a trade, because a good player with
   three tough playoff matchups is worth less than his average suggests. */
function SeasonSchedule({ p, season, values }) {
  const rows = [];
  const logByWeek = {};
  const entry = season?.actual?.[p.id];
  (entry?.log || []).forEach((x, i) => {
    const rec = typeof x === "number" ? { w: i + 1, pts: x } : x;
    logByWeek[rec.w] = rec.pts;
  });

  const now = season ? season.week : 1;
  let restTotal = 0, playoffTotal = 0, tough = 0, great = 0;

  for (let w = 1; w <= 17; w++) {
    if (p.bye === w) { rows.push({ w, bye: true }); continue; }
    const played = season && w < now;
    const opp = season ? oppFor(season, p.team, w) : null;
    const outlook = season ? weekOutlook(p, season, w, values) : null;
    const projected = outlook && !outlook.status
      ? outlook.mean
      : (values[p.id]?.ppg ?? p.base / 17);
    const actual = played ? logByWeek[w] : undefined;
    const injured = played && actual === undefined;

    if (!played) {
      restTotal += projected;
      if (w >= 15) playoffTotal += projected;
      if (outlook?.grade === "tough" || outlook?.grade === "hard") tough++;
      if (outlook?.grade === "great" || outlook?.grade === "good") great++;
    }
    rows.push({ w, opp, played, actual, injured, projected, grade: outlook?.grade || "even" });
  }

  const max = Math.max(...rows.map((r) => (r.bye ? 0 : (r.played ? (r.actual ?? 0) : r.projected))), 1);

  return (
    <>
      <div className="grid3" style={{ marginBottom: 11 }}>
        <div className="stat">
          <b className="num">{Math.round(restTotal)}</b>
          <span className="eyebrow">rest of season</span>
        </div>
        <div className="stat">
          <b className="num">{Math.round(playoffTotal)}</b>
          <span className="eyebrow">weeks 15 to 17</span>
        </div>
        <div className="stat">
          <b className="num">{great}/{tough}</b>
          <span className="eyebrow">good / tough left</span>
        </div>
      </div>

      <div className="eyebrow" style={{ marginBottom: 7 }}>Week by week</div>
      <div style={{ maxHeight: 340, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        {rows.map((r) => {
          if (r.bye) {
            return (
              <div key={r.w} className="wk">
                <div className="wkn">{r.w}</div>
                <div style={{ flex: 1 }} className="mini">Bye week</div>
                <div className="mini">off</div>
              </div>
            );
          }
          const value = r.played ? (r.actual ?? 0) : r.projected;
          const width = Math.max(2, (value / max) * 100);
          return (
            <div key={r.w} className={`wk${r.w >= 15 ? " po" : ""}`}>
              <div className="wkn">{r.w}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row sp" style={{ marginBottom: 3 }}>
                  <span className="mini" style={{ color: "var(--chalk)" }}>
                    {r.opp ? `vs ${r.opp}` : "opponent set at kickoff"}
                    {r.w >= 15 ? " · playoffs" : ""}
                  </span>
                  <span className="num" style={{ fontSize: 12.5, fontWeight: 700, color: r.played ? "var(--chalk)" : "var(--mute)" }}>
                    {r.injured ? "out" : value.toFixed(1)}
                  </span>
                </div>
                <div className="rngbar" style={{ margin: 0 }}>
                  <i style={{ left: 0, right: `${100 - width}%`, opacity: r.played ? 0.95 : 0.45 }} />
                </div>
              </div>
              {!r.played && r.opp && (
                <div className={`opp o-${r.grade}`} style={{ width: 46, textAlign: "right" }}>
                  {r.grade === "even" ? "" : r.grade}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mini" style={{ marginTop: 8 }}>
        Solid bars are weeks already played. Faded bars are projections, adjusted for the defense he faces.
        {season ? "" : " Opponents appear once the season kicks off."}
      </div>
    </>
  );
}

function GameLog({ p, season, values }) {
  const a = season?.actual?.[p.id];
  const raw = a?.log || [];
  const log = raw.map((x, i) => (typeof x === "number" ? { w: i + 1, pts: x } : x));
  if (!log.length) {
    return <div className="mini">No games played yet this season.</div>;
  }
  const max = Math.max(...log.map((x) => x.pts), 1);
  const avg = log.reduce((s, x) => s + x.pts, 0) / log.length;
  const best = log.reduce((b, x) => (x.pts > b.pts ? x : b), log[0]);
  const worst = log.reduce((b, x) => (x.pts < b.pts ? x : b), log[0]);
  return (
    <>
      <div className="grid3" style={{ marginBottom: 11 }}>
        <div className="stat"><b className="num">{avg.toFixed(1)}</b><span className="eyebrow">ppg</span></div>
        <div className="stat"><b className="num">{best.pts.toFixed(1)}</b><span className="eyebrow">best wk {best.w}</span></div>
        <div className="stat"><b className="num">{worst.pts.toFixed(1)}</b><span className="eyebrow">worst wk {worst.w}</span></div>
      </div>
      <div className="eyebrow" style={{ marginBottom: 7 }}>Game log</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 92, marginBottom: 6 }}>
        {log.map((x) => (
          <div key={x.w} style={{ flex: 1, textAlign: "center", minWidth: 0 }}>
            <div className="num" style={{ fontSize: 9.5, color: "var(--mute)", marginBottom: 3 }}>{x.pts.toFixed(0)}</div>
            <div style={{
              height: Math.max(3, (x.pts / max) * 58), borderRadius: 3,
              background: x.pts >= avg ? "var(--first)" : "var(--line)",
            }} />
            <div className="num" style={{ fontSize: 9, color: "var(--mute)", marginTop: 3 }}>{x.w}</div>
          </div>
        ))}
      </div>
      <div className="mini">Week number below each bar. Gold bars are above this player's own average.</div>
    </>
  );
}

function PlayerCardSheet({ id, lg, onClose }) {
  const p = BY_ID[id] || null;
  const season = lg?.season || null;
  // hooks run every render, never behind a conditional return
  const values = useMemo(() => buildValues(lg, season), [lg, season && season.week]);
  const [tab, setTab] = useState("schedule");
  if (!p) return null;
  const v = values[p.id];
  const week = season ? season.week : null;
  const o = season ? weekOutlook(p, season, week, values) : null;
  const inj = season?.injuries?.[p.id] || 0;

  // where he ranks at his position right now
  const posRankNow = PLAYERS.filter((x) => x.pos === p.pos)
    .sort((a, b) => values[b.id].ppg - values[a.id].ppg)
    .findIndex((x) => x.id === p.id) + 1;

  const owner = lg?.rosters
    ? Object.entries(lg.rosters).find(([, ids]) => ids.includes(p.id))
    : null;

  return (
    <Sheet open={true} onClose={onClose} title={p.name}>
      <div className="row" style={{ marginBottom: 12 }}>
        <div className={POSC(p.pos)} style={{ width: 44, height: 28 }}>{p.pos === "DST" ? "DEF" : p.pos}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600 }}>{p.team} · {p.pos}{posRankNow} right now</div>
          <div className="sub">
            Bye {p.bye || "TBD"} · drafted around {p.adp}
            {owner ? ` · rostered by ${lg.gms[Number(owner[0])]?.name || "a team"}` : season ? " · free agent" : ""}
          </div>
        </div>
      </div>

      {inj > 0 && (
        <div className="card" style={{ borderColor: "var(--red)", marginBottom: 11 }}>
          <div className="mini" style={{ color: "var(--red)", fontWeight: 700 }}>
            Out {inj > 20 ? "for the season" : `${inj} more week${inj > 1 ? "s" : ""}`} in this simulation
          </div>
        </div>
      )}

      {(() => {
        const live = injuryFor(p.id);
        if (!live) return null;
        return (
          <div className="card" style={{ borderColor: live.factor === 0 ? "var(--red)" : "#E9A03A", marginBottom: 11 }}>
            <div className="eyebrow" style={{ color: live.factor === 0 ? "var(--red)" : "#E9A03A" }}>
              Real injury report
            </div>
            <div className="nm" style={{ marginTop: 5 }}>{live.label}</div>
            <div className="mini" style={{ marginTop: 4 }}>
              {live.bodyPart ? `${live.bodyPart}. ` : ""}
              {live.note ? `${live.note} ` : ""}
              {live.factor === 0
                ? "Treated as unavailable in preseason rankings and the real-team tools."
                : `Rest-of-season value discounted to ${Math.round(live.factor * 100)}%.`}
            </div>
            <div className="mini" style={{ marginTop: 5, color: "var(--mute)" }}>
              From Sleeper. A running mock season uses its own simulated injuries instead.
            </div>
          </div>
        );
      })()}

      {o && !o.status && (
        <div className="card" style={{ marginBottom: 11 }}>
          <div className="eyebrow">Week {week} outlook</div>
          <div className="row sp" style={{ marginTop: 6 }}>
            <div>
              <div className="disp num" style={{ fontSize: 26, color: "var(--first)" }}>{o.mean.toFixed(1)}</div>
              <div className="sub">projected</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="nm">vs {o.opp || "no game"}</div>
              <div className={`opp o-${o.grade}`}>{o.grade === "even" ? "neutral" : o.grade} matchup</div>
            </div>
          </div>
          <div className="mini" style={{ marginTop: 7 }}>Range {o.low.toFixed(1)} to {o.high.toFixed(1)} in a typical week.</div>
        </div>
      )}
      {o && o.status && (
        <div className="card" style={{ marginBottom: 11 }}>
          <div className="mini">{o.status === "BYE" ? `On bye in week ${week}.` : `Not available in week ${week}.`}</div>
        </div>
      )}

      <div className="segs" style={{ marginBottom: 11 }}>
        {[["schedule", "Schedule"], ["log", "Game log"]].map(([k, l]) => (
          <button key={k} className={`seg ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      <div className="card" style={{ marginBottom: 11 }}>
        {tab === "schedule"
          ? <SeasonSchedule p={p} season={season} values={values} />
          : season
            ? <GameLog p={p} season={season} values={values} />
            : <div className="mini">No games played yet. Start the season to build a game log.</div>}
      </div>

      <div className="grid3" style={{ marginBottom: 11 }}>
        <div className="stat"><b className="num">{v.ppg.toFixed(1)}</b><span className="eyebrow">proj ppg</span></div>
        <div className="stat"><b className="num">{Math.round(v.ros)}</b><span className="eyebrow">rest of season</span></div>
        <div className="stat"><b className="num">{v.tv}</b><span className="eyebrow">trade value</span></div>
      </div>

      {season && v.mult !== 1 && (
        <div className="mini">
          {v.mult > 1.12
            ? `Outproducing his draft cost by about ${Math.round((v.mult - 1) * 100)}%. The projection has moved up to match.`
            : v.mult < 0.9
              ? `Running about ${Math.round((1 - v.mult) * 100)}% below his draft cost so far.`
              : "Producing roughly in line with where he was drafted."}
        </div>
      )}
    </Sheet>
  );
}

/* ---- draft board archive ----
   Every completed draft is snapshotted automatically. Player name, team and
   position are stored inline so an old board still reads correctly even if the
   player pool changes underneath it. */

const BOARD_INDEX = "huddle:boards";
const boardKey = (id) => `huddle:board:${id}`;

export function snapshotBoard(lg) {
  const sc = scoringOf(lg);
  const label = sc.rec >= 1 ? (sc.tePremium > 0 ? "TE Premium" : "PPR") : sc.rec >= 0.5 ? "Half PPR" : "Standard";
  return {
    id: lg.id,
    name: typeof cleanMockName === "function" ? cleanMockName(lg.name) : lg.name,
    at: Date.now(),
    teams: lg.settings.teams,
    rounds: lg.settings.rounds,
    userSlot: lg.settings.userSlot,
    scoringLabel: `${label}${lg.settings.superflex ? " SF" : ""}`,
    gms: lg.gms.map((g) => ({ idx: g.idx, name: g.name, isUser: !!g.isUser })),
    picks: lg.picks.map((pk) => {
      const p = BY_ID[pk.playerId] || {};
      return {
        overall: pk.overall,
        round: Math.floor((pk.overall - 1) / lg.settings.teams) + 1,
        slot: ((pk.overall - 1) % lg.settings.teams) + 1,
        gmIdx: pk.gmIdx,
        name: p.name || "Unknown",
        pos: p.pos || "",
        team: p.team || "",
        adp: p.adp || 0,
        bye: p.bye || 0,
      };
    }),
  };
}

export async function archiveBoard(lg) {
  if (!draftDone(lg)) return false;
  const board = snapshotBoard(lg);
  await store.set(boardKey(board.id), board);
  const idx = (await store.get(BOARD_INDEX)) || [];
  const meta = { id: board.id, name: board.name, at: board.at, teams: board.teams, rounds: board.rounds, scoringLabel: board.scoringLabel };
  const next = [meta, ...idx.filter((m) => m.id !== board.id)].slice(0, 40);
  await store.set(BOARD_INDEX, next);
  return true;
}

function BoardArchive({ onBack }) {
  const [list, setList] = useState(null);
  const [open, setOpen] = useState(null);
  const [mineOnly, setMineOnly] = useState(false);

  useEffect(() => { store.get(BOARD_INDEX).then((v) => setList(v || [])); }, []);

  const load = async (id) => { const b = await store.get(boardKey(id)); if (b) setOpen(b); };
  const remove = async (id) => {
    await store.del(boardKey(id));
    const idx = (await store.get(BOARD_INDEX)) || [];
    const next = idx.filter((m) => m.id !== id);
    await store.set(BOARD_INDEX, next); setList(next);
  };

  if (open) {
    const rounds = [];
    for (let r = 1; r <= open.rounds; r++) {
      const inRound = open.picks.filter((p) => p.round === r);
      if (inRound.length) rounds.push({ r, picks: inRound });
    }
    const mine = open.picks.filter((p) => p.gmIdx === open.userSlot);
    return (
      <>
        <div className="row sp" style={{ marginBottom: 11 }}>
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow">{new Date(open.at).toLocaleDateString()} · {open.scoringLabel}</div>
            <h2 style={{ fontSize: 30, marginTop: 3 }}>{open.name}</h2>
          </div>
          <button className="chip" onClick={() => setOpen(null)}>Back</button>
        </div>

        <div className="grid3" style={{ marginBottom: 11 }}>
          <div className="stat"><b className="num">{open.teams}</b><span className="eyebrow">teams</span></div>
          <div className="stat"><b className="num">{open.rounds}</b><span className="eyebrow">rounds</span></div>
          <div className="stat"><b className="num">{open.userSlot + 1}</b><span className="eyebrow">your slot</span></div>
        </div>

        <div className="row" style={{ gap: 7, marginBottom: 11 }}>
          <button className={`chip ${mineOnly ? "on" : ""}`} onClick={() => setMineOnly(true)}>My picks ({mine.length})</button>
          <button className={`chip ${!mineOnly ? "on" : ""}`} onClick={() => setMineOnly(false)}>Full board</button>
        </div>

        {rounds.map(({ r, picks }) => {
          const shown = mineOnly ? picks.filter((p) => p.gmIdx === open.userSlot) : picks;
          if (!shown.length) return null;
          return (
            <div key={r} className="card tight">
              <div className="eyebrow" style={{ padding: "11px 12px 7px" }}>Round {r}</div>
              {shown.map((p) => {
                const isUser = p.gmIdx === open.userSlot;
                const edge = p.overall - p.adp;
                return (
                  <div key={p.overall} className="plr" style={{ background: isUser ? "rgba(127,209,232,.09)" : undefined }}>
                    <div className="disp num" style={{ width: 34, fontSize: 12, color: "var(--mute)", flex: "none" }}>
                      {r}.{String(p.slot).padStart(2, "0")}
                    </div>
                    <div className={POSC(p.pos)}>{p.pos === "DST" ? "DEF" : p.pos}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="nm" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                      <div className="sub">{p.team}{isUser ? " · you" : ` · ${open.gms.find((g) => g.idx === p.gmIdx)?.name || ""}`}</div>
                    </div>
                    {p.adp > 0 && (
                      <div style={{ textAlign: "right" }}>
                        <div className="num" style={{ fontSize: 11.5, color: edge > 12 ? "var(--green)" : edge < -12 ? "var(--red)" : "var(--mute)" }}>
                          {edge > 0 ? `+${edge}` : edge}
                        </div>
                        <div className="sub">vs ADP</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </>
    );
  }

  return (
    <>
      <div className="row sp" style={{ marginBottom: 11 }}>
        <div>
          <div className="eyebrow">Saved automatically</div>
          <h2 style={{ fontSize: 30, marginTop: 3 }}>Past draft boards</h2>
        </div>
        <button className="chip" onClick={onBack}>Back</button>
      </div>

      {list === null && <div className="card"><div className="mini">Loading…</div></div>}
      {list?.length === 0 && (
        <div className="card"><div className="mini">
          No boards yet. Finish a mock draft and it gets archived here automatically, round by round.
        </div></div>
      )}
      {list?.map((m) => (
        <div key={m.id} className="card">
          <div className="row sp">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="nm">{m.name}</div>
              <div className="sub">{new Date(m.at).toLocaleDateString()} · {m.teams} teams · {m.rounds} rounds · {m.scoringLabel}</div>
            </div>
            <button className="chip on" onClick={() => load(m.id)}>Open</button>
            <button className="chip" onClick={() => remove(m.id)}>Delete</button>
          </div>
        </div>
      ))}
    </>
  );
}

/* ---- scoring editor: presets plus every individual rule ---- */

function ScoringEditor({ scoring, onChange, title }) {
  const sc = resolveScoring(scoring);
  const set = (k, v) => onChange({ ...sc, [k]: v });
  const activePreset = SCORING_PRESETS.find((p) =>
    Object.entries(p.patch).every(([k, v]) => Math.abs((sc[k] ?? 0) - v) < 0.001));

  const Field = ({ k, label, hint, step = 0.5, min = -10, max = 20 }) => (
    <div style={{ marginBottom: 10 }}>
      <div className="row sp" style={{ marginBottom: 4 }}>
        <div className="mini" style={{ color: "var(--chalk)" }}>{label}</div>
        <div className="num" style={{ fontWeight: 700, color: "var(--first)" }}>{sc[k]}</div>
      </div>
      <div className="row" style={{ gap: 7 }}>
        <button className="chip" onClick={() => set(k, Math.round((sc[k] - step) * 1000) / 1000)} disabled={sc[k] <= min}>−</button>
        <div className="bar" style={{ flex: 1 }}>
          <i style={{ width: `${Math.max(0, Math.min(100, ((sc[k] - min) / (max - min)) * 100))}%` }} />
        </div>
        <button className="chip" onClick={() => set(k, Math.round((sc[k] + step) * 1000) / 1000)} disabled={sc[k] >= max}>+</button>
      </div>
      {hint && <div className="mini" style={{ marginTop: 3, fontSize: 10.5 }}>{hint}</div>}
    </div>
  );

  return (
    <>
      <div className="card">
        <div className="eyebrow">{title || "Scoring"}</div>
        <div className="mini" style={{ margin: "6px 0 10px" }}>
          Projections rebuild from these rules, so changing them changes rankings, draft value and trade math.
        </div>
        <div className="scroll-x">
          {SCORING_PRESETS.map((p) => (
            <button key={p.key} className={`chip ${activePreset?.key === p.key ? "on" : ""}`}
              onClick={() => onChange({ ...sc, ...p.patch })}>{p.label}</button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="eyebrow" style={{ marginBottom: 9 }}>Receiving and rushing</div>
        <Field k="rec" label="Per reception" step={0.25} min={0} max={2} hint="0 is standard, 1 is full PPR" />
        <Field k="tePremium" label="Tight end bonus per catch" step={0.25} min={0} max={2} hint="Added on top of the reception value, tight ends only" />
        <Field k="recYd" label="Per receiving yard" step={0.05} min={0} max={0.5} hint={`${(1 / (sc.recYd || 1)).toFixed(0)} yards per point`} />
        <Field k="rushYd" label="Per rushing yard" step={0.05} min={0} max={0.5} />
        <Field k="recTD" label="Receiving touchdown" step={1} min={0} max={12} />
        <Field k="rushTD" label="Rushing touchdown" step={1} min={0} max={12} />
        <Field k="bonus100" label="100 yard game bonus" step={1} min={0} max={10} hint="Rushing or receiving" />
      </div>

      <div className="card">
        <div className="eyebrow" style={{ marginBottom: 9 }}>Passing and turnovers</div>
        <Field k="passYd" label="Per passing yard" step={0.01} min={0} max={0.2} hint={`${(1 / (sc.passYd || 1)).toFixed(0)} yards per point`} />
        <Field k="passTD" label="Passing touchdown" step={1} min={0} max={10} hint="4 is standard, 6 makes quarterbacks far more valuable" />
        <Field k="int" label="Interception" step={1} min={-6} max={0} />
        <Field k="fumble" label="Fumble lost" step={1} min={-6} max={0} />
      </div>

      <div className="card">
        <div className="eyebrow" style={{ marginBottom: 9 }}>Kicker and defense</div>
        <Field k="kMult" label="Kicker scoring" step={0.1} min={0} max={2.5} hint="A multiplier on kicker output" />
        <Field k="dstMult" label="Defense scoring" step={0.1} min={0} max={2.5} />
      </div>

      <ScoringImpact scoring={sc} />
    </>
  );
}

// shows who this ruleset actually favors
function ScoringImpact({ scoring }) {
  const rows = useMemo(() => {
    const skill = PLAYERS.filter((p) => !["K", "DST"].includes(p.pos));
    const now = skill.map((p) => ({ p, v: projectPoints(p, scoring) })).sort((a, b) => b.v - a.v);
    const basePPR = skill.map((p) => ({ p, v: projectPoints(p, DEFAULT_SCORING) })).sort((a, b) => b.v - a.v);
    const baseRank = new Map(basePPR.map((r, i) => [r.p.id, i]));
    return now.slice(0, 60).map((r, i) => ({ ...r, move: (baseRank.get(r.p.id) ?? i) - i })).sort((a, b) => b.move - a.move);
  }, [JSON.stringify(scoring)]);
  const up = rows.filter((r) => r.move > 2).slice(0, 4);
  const down = rows.filter((r) => r.move < -2).slice(-4).reverse();
  if (!up.length && !down.length) {
    return <div className="card"><div className="mini">These rules match standard full PPR, so nobody moves in the rankings.</div></div>;
  }
  return (
    <div className="card fdl" style={{ paddingLeft: 15 }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>Who this favors</div>
      {up.map((r) => (
        <div key={r.p.id} className="row sp" style={{ padding: "3px 0" }}>
          <div className="mini" style={{ color: "var(--chalk)" }}>{r.p.name} <span style={{ color: "var(--mute)" }}>{r.p.pos}</span></div>
          <div className="num" style={{ fontSize: 12, color: "var(--green)" }}>up {r.move}</div>
        </div>
      ))}
      {down.map((r) => (
        <div key={r.p.id} className="row sp" style={{ padding: "3px 0" }}>
          <div className="mini" style={{ color: "var(--chalk)" }}>{r.p.name} <span style={{ color: "var(--mute)" }}>{r.p.pos}</span></div>
          <div className="num" style={{ fontSize: 12, color: "var(--red)" }}>down {Math.abs(r.move)}</div>
        </div>
      ))}
      <div className="mini" style={{ marginTop: 7 }}>Movement is against standard full PPR, top 60 overall.</div>
    </div>
  );
}

/* ============================================================
   APP SHELL
   ============================================================ */

function Hub({ go, my }) {
  const tiles = [
    { k: "trade", cls: "b", h: "Real Trades", d: "Your actual league. Screenshot your roster, analyze any offer, find deals both sides would take.", go: "Open" },
    { k: "draft", cls: "g", h: "Real Draft", d: "Your actual draft. Player A over player B with the reasoning, plus a value radar.", go: "Open" },
    { k: "mock", cls: "", h: "Mock Season", d: "Simulated practice league. Draft, set lineups, play the season. Opens its own screen.", go: "Draft now" },
    { k: "settings", cls: "m", h: "Settings", d: `Version ${VERSION} · save and restore your data.`, go: "Open" },
  ];
  return (
    <div className="wrap top">
      <div style={{ padding: "10px 0 20px" }}>
        <h1 style={{ fontSize: 72, letterSpacing: "-.02em", lineHeight: .9 }}>
          Huddle<span style={{ color: "var(--first)" }}>.</span>
        </h1>
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
            <button className="chip on" onClick={() => go("trade")}>Real trades</button>
          </div>
        </div>
      )}
      <div className="navpad" />
    </div>
  );
}

/* A crash inside any screen used to unmount the whole tree and leave a black
   screen with no explanation. This catches it, shows what broke, and lets the
   person get back to a working screen without losing saved data. */
class Boundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { console.error("Huddle crashed:", err, info); }
  render() {
    if (!this.state.err) return this.props.children;
    const msg = String(this.state.err && this.state.err.message || this.state.err);
    return (
      <div className="wrap top">
        <div className="card" style={{ borderColor: "var(--red)" }}>
          <div className="eyebrow" style={{ color: "var(--red)" }}>Something broke</div>
          <h2 style={{ fontSize: 26, margin: "6px 0 8px" }}>This screen hit an error</h2>
          <div className="mini" style={{ marginBottom: 10 }}>
            Your saved leagues and roster are untouched. Go back and try another tab.
          </div>
          <div className="mini" style={{ fontFamily: "monospace", color: "var(--chalk)", marginBottom: 12, wordBreak: "break-word" }}>
            {msg}
          </div>
          <button className="btn" onClick={() => this.setState({ err: null })}>Try again</button>
        </div>
      </div>
    );
  }
}

export default function App() {
  const [screen, setScreen] = useState("hub");
  const [lg, setLg] = useState(null);
  const [tab, setTab] = useState("draft");
  const [toastMsg, setToastMsg] = useState("");
  const [my, saveMy, myReady] = useMyTeam();
  const [cardId, setCardId] = useState(null);
  const injuries = useLiveInjuries(my.liveInjuries !== false);
  const kbInset = useKeyboardInset();
  const [pwa, setPwa] = useState(false);
  const saveTimer = useRef(null);
  const [recoveryReady, setRecoveryReady] = useState(false);

  useEffect(() => {
    let alive = true;
    ensureRecoveryRestored().then(async () => {
      if (!alive) return;
      const active = recoveryGet(RECOVERY_ACTIVE);
      if (active?.leagueId) {
        const savedLeague = await store.get(`huddle:lg:${active.leagueId}`);
        if (savedLeague && alive) {
          ensureSchedule(savedLeague);   // restored sessions too
          setScreen("mock");
          setLg(savedLeague);
          setTab(safeTab(active.tab, savedLeague));
        }
      }
      if (alive) setRecoveryReady(true);
    });
    return () => { alive = false; };
  }, []);

  // iOS reports safe-area insets inconsistently in installed web apps,
  // so detect standalone directly and pin the padding ourselves.
  useEffect(() => {
    const check = () => setPwa(
      window.navigator.standalone === true ||
      (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      (window.matchMedia && window.matchMedia("(display-mode: fullscreen)").matches)
    );
    check();
    const mq = window.matchMedia?.("(display-mode: standalone)");
    mq?.addEventListener?.("change", check);
    return () => mq?.removeEventListener?.("change", check);
  }, []);

  const toast = useCallback((m) => { setToastMsg(m); setTimeout(() => setToastMsg(""), 1800); }, []);

  useEffect(() => {
    if (!lg) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveLeague(lg), 700);
    return () => clearTimeout(saveTimer.current);
  }, [lg]);

  useEffect(() => {
    if (lg?.id && screen === "mock") recoverySet(RECOVERY_ACTIVE, { leagueId: lg.id, tab, at: Date.now() });
  }, [lg?.id, tab, screen]);

  /* Snapshot the board the first time a draft completes. Without this the
     archive stays empty no matter how many drafts you finish. */
  const archived = useRef(new Set());
  useEffect(() => {
    if (!lg || !draftDone(lg)) return;
    if (archived.current.has(lg.id)) return;
    archived.current.add(lg.id);
    archiveBoard(lg).then((saved) => { if (saved) toast("Draft board saved"); });
  }, [lg && lg.id, lg && lg.picks.length, toast]);

  const MOCK_TAB_KEYS = ["draft", "team", "season"];
  const safeTab = (t, l) => (MOCK_TAB_KEYS.includes(t) ? t : (draftDone(l) ? (l.season ? "season" : "team") : "draft"));

  const openLeague = (l) => {
    ensureSchedule(l);   // older saves get a schedule written in on open
    setLg(l);
    setTab(safeTab(null, l));
  };
  const closeLeague = async () => {
    if (lg) await saveLeague(lg);
    recoveryDel(RECOVERY_ACTIVE);
    setLg(null);
  };
  const home = async () => {
    if (lg) await saveLeague(lg);
    recoveryDel(RECOVERY_ACTIVE);
    setLg(null);
    setScreen("hub");
  };

  const TITLES = { mock: "Mock Season", trade: "Trades", draft: "Draft", settings: "Settings" };

  if (!recoveryReady || !myReady) {
    return <div className="hd"><style>{CSS}</style><div className="wrap"><div className="card"><div className="eyebrow">Huddle</div><h2 style={{ marginTop: 5 }}>Restoring your leagues…</h2><div className="mini">Checking the on-device recovery copy before the app opens.</div></div></div></div>;
  }

  /* The bottom bar is real football only: your own league, all the time.
     The mock season is a place you go into from Home, with its own labelled
     navigation, so two similar looking bars never sit on screen meaning
     different things. */
  const TABS = [
    ["hub", "Home"],
    ["trade", "Trades"],
    ["draft", "Draft"],
    ["settings", "Settings"],
  ];
  // inside a mock league there are only three places to be
  const MOCK_TABS = [["draft", "Draft"], ["team", "Team"], ["season", "Season"]];

  const goTab = (k) => {
    if (k === "mock") { setScreen("mock"); return; }
    if (lg) closeLeague();
    setScreen(k);
  };

  // any player name in the app can open the detail card
  const cardLg = lg || shellLeague(my);

  return (
    <PlayerCtx.Provider value={setCardId}>
    <div className={`hd${pwa ? " pwa" : ""}`} style={{ "--nudge": `${my.topPad || 0}px` }}>
      <style>{CSS}</style>

      {screen === "hub" && <Boundary><Hub go={setScreen} my={my} /></Boundary>}

      {screen !== "hub" && (
        <>
          <div className="hdr">
            {lg && <button className="chip" onClick={closeLeague}>← Leagues</button>}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="nm" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {lg ? leagueHeaderLabel(lg) : TITLES[screen]}
              </div>
              <div className="sub">
                {lg
                  ? `${lg.settings.teams} teams · ${lg.season ? (lg.season.champion != null ? "season complete" : `week ${lg.season.week}`) : draftDone(lg) ? "drafted" : `pick ${lg.picks.length + 1} of ${lg.order.length}`}`
                  : screen === "mock" ? "Simulated league" : screen === "settings" ? `Huddle ${VERSION}` : "Your real league"}
              </div>
            </div>
          </div>

          {screen === "mock" && lg && (
            <div className="subnav">
              {MOCK_TABS.map(([k, l]) => {
                const alert = k === "season" && lg.season?.tradeOffer;
                return (
                  <button key={k} className={`snb ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}
                    aria-label={alert ? `${l}, needs attention` : l}>
                    {l}{alert ? <span className="badge" aria-hidden="true">1</span> : null}
                  </button>
                );
              })}
            </div>
          )}

          <div>
            <Boundary key={`${screen}:${tab}:${lg ? lg.id : "none"}`}>
            {screen === "mock" && !lg && <MockHome onOpen={openLeague} onCreate={(l) => { setLg(l); setTab("draft"); }} customScoring={my.scoring ?? my.ppr} />}
            {screen === "mock" && lg && (
              <>
                {tab === "draft" && <DraftRoom lg={lg} setLg={setLg} toast={toast} />}
                {tab === "team" && <TeamView lg={lg} setLg={setLg} toast={toast} />}
                {tab === "season" && <SeasonView lg={lg} setLg={setLg} toast={toast} setTab={setTab} />}
              </>
            )}
            {screen === "trade" && <TradeHelp my={my} save={saveMy} toast={toast} />}
            {screen === "draft" && <DraftHelp my={my} save={saveMy} toast={toast} />}
            {screen === "settings" && <Settings my={my} save={saveMy} toast={toast} injuries={injuries} onWipe={() => { recoveryDel(RECOVERY_ACTIVE); setLg(null); }} />}
            </Boundary>
            <div className="navpad" />
          </div>
        </>
      )}

      <div className="tabs" style={kbInset ? { display: "none" } : undefined}>
        {TABS.map(([k, l]) => {
          const on = screen === k;
          const alert = k === "mock" && lg?.season?.tradeOffer ? 1 : 0;
          return (
            <button key={k} className={`tab ${on ? "on" : ""}`} onClick={() => goTab(k)}>
              <span style={{ position: "relative" }}>
                <span className="dot" />
                {alert ? <span className="badge" aria-hidden="true">1</span> : null}
              </span>
              {l}
            </button>
          );
        })}
      </div>

      {cardId != null && <Boundary key={`card:${cardId}`}><PlayerCardSheet id={cardId} lg={cardLg} onClose={() => setCardId(null)} /></Boundary>}
      <Toast msg={toastMsg} />
    </div>
    </PlayerCtx.Provider>
  );
}
