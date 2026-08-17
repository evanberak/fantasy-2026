# Fantasy GM 2026

A Streamlit fantasy-football sandbox built around one persistent league state: mock draft -> roster -> lineup -> waivers -> trades -> weekly simulation -> playoffs.

## Main features
- Snake mock drafts with CPU manager personalities and roster-aware drafting.
- Draft saving/export and reload.
- Lineup manager with auto-optimize plus manual slot selection.
- 18-week fantasy season engine with matchups, standings, volatility, injuries, breakouts and playoffs.
- FAAB waiver wire with competing CPU bids.
- Trade calculator with raw value, scarcity and roster-fit adjustments.
- Player A vs Player B decision tool.
- Trade finder using roster needs and mutually beneficial packages.
- Screenshot roster extraction using OpenAI vision when `OPENAI_API_KEY` is configured; manual paste fallback always works.
- Fantasy Lab for Monte Carlo "what if" comparisons.
- Sleeper player-pool refresh for current names/teams; custom projection CSV import for serious use.

## Important data note
Sleeper is used only as an optional read-only player metadata source. The app-generated projections are demo estimates, not betting or expert projections. For current-season competitive use, import your own projection/ADP CSV in Data Center.

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
