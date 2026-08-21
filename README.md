# Huddle

**2026 Fantasy Football**

**Version 1.3.2** — version-proof mock-season recovery and automatic restore.

A phone-first fantasy sandbox built around one persistent league state:
**mock draft, lineup, season simulation, waivers, trades, playoffs.**

Player pool is the consensus PPR ADP top 300 as of **August 10, 2026**, with real
2026 NFL bye weeks.

---

## Run it

```bash
npm install
npm run dev
```

Open the printed URL. On a phone, use **Add to Home Screen**. It installs as a web
app and launches fullscreen with no browser chrome.

```bash
npm run build     # production build into dist/
npm run preview   # serve the build locally
```

Deploy `dist/` anywhere static: Vercel, Netlify, GitHub Pages, Cloudflare Pages.

### Putting it on GitHub

Create an empty repo, then either:

- **Web upload.** Click *Add file*, then *Upload files*, and select all the files (not the
  folder, the files inside it), then commit. Note that `.gitignore` and `.env.example`
  start with a dot and may be hidden in your file picker. Press `Cmd+Shift+.` on
  macOS or enable hidden files on Windows to see them. Neither is required for the
  app to run.
- **Command line**
  ```bash
  git init && git add -A && git commit -m "Huddle"
  git branch -M main
  git remote add origin https://github.com/YOU/huddle.git
  git push -u origin main
  ```

For Vercel or Netlify, point them at the repo and accept the defaults. They detect
Vite, run `npm run build`, and serve `dist/`. No configuration needed.

---

## Features

### Draft room
Snake drafts, 8–14 teams, 13–16 rounds, full/half/standard PPR, optional superflex.
Pause, undo your last pick, or hand the wheel to autopick.

The CPU GMs are the point. Each pick is scored by **how much it improves that
manager's best starting lineup**, not by raw projected points, so a fourth
receiver who cannot crack the flex is correctly valued near zero. On top of that
sit positional run detection, ADP survival probability for the snake turn, tier
gaps, bye stacking, handcuff logic, quarterback stacking, and live injury data
when it is loaded.

Measured head to head against the previous logic, six new drafters against six
old in the same room: the new logic produced the best roster in 24 of 24 PPR
drafts and averages roughly 20 more projected starter points per season, with no
regression across superflex, TE premium, 14-team or standard.

 They don't draft off ADP with noise. For each candidate
they weigh **how much value actually evaporates at that position before their next
snake turn**, plus tier gaps, whether the pick improves a starting slot or just the
bench, and bye-week overlap on their own roster. On top of that sit hard rules:

- No QB in rounds 1–2 (1QB leagues)
- No K or D/ST until the final two rounds
- No QB2 or TE2 unless that specific GM has the tendency, and never early
- No fourth WR before the starting lineup is whole
- Position caps, and reserved slots so nobody finishes without a kicker

Ten drafting personalities sit on top of that: Best Available, Roster Builder,
Zero RB, Hero RB, Late-Round QB, Elite TE, Reacher, Analytics, Upside Hunter and
Floor Merchant. Assign them to specific seats before the draft or leave them
random. The strategies are structural rather than cosmetic: a Zero RB manager is
blocked from taking a back early, so he actually runs Zero RB. Across 25 test drafts: zero rule violations, zero unfillable rosters,
and roster shapes spread across a dozen distinct constructions.

Draft ends with grades, value picks, and biggest reaches for all teams.

### Season simulation
Every player gets a **hidden true-talent draw** before Week 1. Late picks genuinely
break out; first-rounders genuinely bust. That's what makes the waiver wire matter
instead of being decoration.

- 14-week regular season + 6-team playoff (10+ teams), or 15 + 4-team (8 teams)
- Weekly injuries with real duration distributions, from one week to season-ending
- Free agents are scored every week, so the wire is live and trending players surface
- Waivers: **FAAB blind bidding** (budget $50/$100/$200/$1000) **or classic rolling
  priority**, your choice at league creation. CPU teams bid against you either way.
- Mid-season trade offers from CPU teams, already priced
- Monte Carlo playoff odds (260 seasons) from any point in the year
- Sim week-by-week or straight to the title

### Live injuries

Real NFL injury designations come from Sleeper's public player endpoint. The
payload is reduced to what Huddle needs, cached on device, and refreshed at most
every 12 hours, which respects Sleeper's guidance of roughly one fetch per day.

Scope is deliberate. Live injuries apply to rankings, draft help and the trade
tools. A **mock season in progress keeps its own simulated injuries**, because the
point of the simulation is that it plays out differently each time. Everything
fails soft: if Sleeper is unreachable the app uses the last saved copy, or none,
and carries on. Toggle it in Settings.

### Trades
- **Calculator.** Any number of players per side. Values are rest-of-season points
  over replacement, curved so one elite player outweighs two mid pieces, with a
  consolidation premium for packaging bodies into a stud.
- **Trade finder.** Scans every roster in your league, surfacing only deals where
  *both* sides gain: you deal from a position with starters banked into a hole, and
  they do the reverse. Each card explains why they'd say yes.
- **From screenshot.** Upload a roster from Sleeper, ESPN, Yahoo, anything. Names
  are read and matched to the 2026 pool, handling suffixes and D/ST naming, and
  anything unmatched is flagged. Then it finds your biggest hole and builds targets.

### Tools
- **A over B.** Two players head to head with value scores, volatility and bye
  conflicts against your actual roster, plus the reasoning behind the call
- **Value radar.** Best points over replacement per unit of draft cost after pick 60
- **Second opinion.** Answers questions using your roster, your scoring and your record

---

## Verifying a change

```bash
npm run test:all
```

Two suites, and both matter.

`npm test` renders every screen and exercises the engine. `npm run test:click`
mounts screens in a real DOM and **taps every row**, which catches a class of bug
rendering alone cannot: React throws "Rendered more hooks than during the previous
render" only when a click sends a component down a different path, and the result
is a blank screen with no message. That is what happened when tapping a trade
partner.

Run both after any edit.

---

## Optional: Claude-powered features

Two features need a connection: screenshot roster reading and the Second opinion
question box. **Everything else works offline**, including drafts, season sim,
calculator, trade desk, trade finder, A over B and the value radar.

To enable them standalone, copy `.env.example` to `.env.local` and set
`VITE_ANTHROPIC_API_KEY`.

A browser-exposed key is visible to anyone who opens devtools, so it's fine for
local use and bad for anything public. For a deployed app, stand up a small backend
that forwards requests to Anthropic and point `VITE_ANTHROPIC_PROXY` at it instead.

---

## Saving

Leagues save automatically to browser storage as you play, and appear on the home
screen. Huddle also keeps a separate **automatic recovery mirror** of every mock league
and your saved roster. Before **Fetch new version**, the app snapshots all current mocks
again, clears only the cached app files, then reloads. On startup it checks the recovery
copy and restores any missing league data automatically.

If the app reloads while a mock league is open, Huddle also remembers that league and
the active bottom tab so it can reopen where you left off. Supporting browsers are asked
to treat the local storage as persistent. Storage is still per browser/device, so clearing
site data yourself can remove both copies. Use **Settings > Download save** for an
off-device backup or to move between phones.

---

## Project layout

Everything sits in one flat folder with no subdirectories, so you can drag the whole
thing into a GitHub repo in one go.

```
index.html              app shell, PWA meta, iOS fullscreen
main.jsx                entry point
App.jsx                 data, engine, and UI
storage.js              localStorage-backed persistence shim
anthropic.js            routes Claude calls (key or proxy)
SMOKE_TEST.mjs          renders every screen, checks the engine
manifest.webmanifest    home-screen install
icon.svg                app icon, plus PNG sizes for iOS and Android
apple-touch-icon.png    iOS requires a PNG here, it will not use an SVG
package.json
vite.config.js
.env.example
```

`App.jsx` opens with a numbered map of its own sections, from the player pool and
scoring rules through CPU drafting, the schedule, valuation, the season engine,
and finally the screens and app shell. Search for `===== 6. VALUATION =====` and
similar banners to jump between them.

---

## A note on the data

Projections are built from consensus ADP, not scraped expert projections.
**Ranking order is accurate; absolute point totals are estimates.** Good enough to
make the simulation behave correctly and the trade math sane, but not a substitute
for real projections on live draft day.

Byes are the real 2026 schedule. Week 11 has six teams off; no team is on bye in
Week 12.
