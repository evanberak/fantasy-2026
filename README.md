# Fantasy GM 2026 — v0.2.0

A Streamlit fantasy-football sandbox built around one persistent league state: mock draft -> roster -> lineup -> waivers -> trades -> weekly simulation -> playoffs.

## Main features
- Mobile-first Streamlit UI with large tap targets, pill navigation, compact cards, and phone-friendly two-column layouts.
- Snake mock drafts with strategic CPU profiles, ADP discipline, roster-aware drafting, no Round 1 CPU QBs, late K/DST logic, and controlled backup-QB/TE usage.
- One-tap **Get Latest Version** rerun/refresh control in the app header.
- **Save Season** and **Import Season** controls directly on the Season screen; saves include draft, rosters, standings, transactions, injuries, FAAB, and embedded custom player data when present.
- Lineup manager with auto-optimize plus manual slot selection.
- 18-week fantasy season engine with matchups, standings, volatility, injuries, breakouts and playoffs.
- FAAB waiver wire with competing CPU bids.
- Trade calculator with raw value, scarcity and roster-fit adjustments.
- Player A vs Player B decision tool.
- Trade finder using roster needs and mutually beneficial packages, with a balanced-roster fallback so realistic options still appear when teams have few obvious holes.
- Screenshot roster extraction using OpenAI vision when `OPENAI_API_KEY` is configured; manual paste fallback always works.
- Fantasy Lab for Monte Carlo "what if" comparisons.
- Sleeper player-pool refresh for current names/teams; custom projection CSV import for serious use.

## v0.2.0 changes
- Rebuilt the navigation around mobile-friendly pill controls.
- Reduced dense 4–7 column layouts to mostly stacked/two-column controls.
- Increased button/input sizes for easier tapping.
- Reworked CPU draft logic to remove chaotic/QB-reaching profiles and add hard strategic guardrails.
- Added quick season save/import controls.
- Added the in-app Get Latest Version action.

## Important data note
Sleeper is used only as an optional read-only player metadata source. The app-generated projections are demo estimates, not betting or expert projections. For current-season competitive use, import your own projection/ADP CSV in Data & Saves.

## Run locally
```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
streamlit run app.py
```

## Deploy on Streamlit Community Cloud
1. Push this folder to GitHub.
2. Create a Streamlit Community Cloud app pointed at `app.py`.
3. Optional: add `OPENAI_API_KEY` and `OPENAI_VISION_MODEL` in Streamlit Secrets for screenshot roster reading.

Example `.streamlit/secrets.toml` for local testing only (do not commit it):
```toml
OPENAI_API_KEY = "your-key"
OPENAI_VISION_MODEL = "gpt-5"
```

## Projection CSV columns
The importer accepts:
`player_id,name,team,position,adp,projected_points,ceiling,floor,volatility,bye_week,injury_risk`

Only `name`, `position`, and `projected_points` are strictly necessary; missing fields are filled with defaults.
