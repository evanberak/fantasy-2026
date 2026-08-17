from __future__ import annotations

import difflib
import io
import json
import os
import random
from pathlib import Path
from html import escape

import numpy as np
import pandas as pd
import requests
import streamlit as st

from fantasy_engine import (
    CPU_PERSONALITIES,
    advance_cpu_until_user,
    auto_lineup,
    build_sleeper_projection_df,
    compare_players,
    cpu_personality_description,
    cpu_team_name,
    default_settings,
    deserialize_state,
    execute_trade,
    fallback_player_pool,
    find_trades,
    free_agents,
    initial_season_state,
    lab_compare,
    lineup_projection,
    new_draft_state,
    normalize_player_df,
    package_value,
    player_lookup,
    process_cpu_waiver_night,
    process_user_waiver,
    record_pick,
    serialize_state,
    simulate_week,
    standings_frame,
    suggested_faab,
    trade_evaluation,
    trade_value,
)
from roster_vision import extract_roster_names

APP_DIR = Path(__file__).resolve().parent
SAMPLE_CSV = APP_DIR / "data" / "sample_projection_import.csv"
APP_VERSION = "0.4.0"

st.set_page_config(page_title="Fantasy GM 2026", page_icon="🏈", layout="centered", initial_sidebar_state="collapsed")

st.markdown(
    """
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Sora:wght@500;600;700;800&display=swap');
:root { --fgm-green:#47e5a4; --fgm-card:#121925; --fgm-card-2:#0e141d; --fgm-border:#243040; --fgm-muted:#98a9ba; --fgm-bg:#081018; --fgm-pink:#ff73b9; --fgm-blue:#73b6ff; }
html, body, [data-testid="stAppViewContainer"] {background:radial-gradient(circle at top,#122033 0%,#0b1320 42%,#081018 100%); font-family:'Inter', system-ui, sans-serif;}
.block-container {padding-top:.7rem; padding-bottom:5.5rem; max-width:860px;}
[data-testid="stHeader"] {background:rgba(11,15,20,.86); backdrop-filter:blur(12px);}
[data-testid="stSidebar"] {border-right:1px solid #202a34;}
.fgm-appbar {display:flex;align-items:center;justify-content:space-between;gap:12px;padding:5px 2px 10px 2px;}
.fgm-brand {font-size:1.08rem;font-weight:900;letter-spacing:-.03em;font-family:'Sora', sans-serif;}
.fgm-brand span {color:var(--fgm-green);}
.fgm-version {font-size:.72rem;color:var(--fgm-muted);border:1px solid var(--fgm-border);border-radius:999px;padding:3px 8px;margin-left:6px;}
.fgm-hero {padding:20px 18px;border:1px solid rgba(255,255,255,.07);border-radius:24px;background:linear-gradient(160deg,rgba(23,35,54,.94),rgba(12,18,28,.94));margin:10px 0 14px 0;box-shadow:0 16px 45px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.05);backdrop-filter: blur(12px);}
.fgm-kicker {font-size:.72rem;letter-spacing:.16em;text-transform:uppercase;color:var(--fgm-green);font-weight:850;font-family:'Sora', sans-serif;}
.fgm-title {font-size:1.95rem;font-weight:900;margin:.2rem 0 .18rem 0;line-height:1.02;letter-spacing:-.05em;font-family:'Sora', sans-serif;}
.fgm-sub {color:#c3d0dc;font-size:.95rem;line-height:1.5;opacity:.92;}
.fgm-card {border:1px solid rgba(255,255,255,.07);background:linear-gradient(180deg,rgba(18,25,37,.96),rgba(12,18,28,.96));border-radius:22px;padding:16px 16px;height:100%;box-shadow:0 10px 30px rgba(0,0,0,.18);backdrop-filter: blur(10px);}
.fgm-card h3 {margin-top:0;font-size:1.02rem;}
.fgm-pill {display:inline-block;padding:5px 10px;border:1px solid rgba(255,255,255,.08);border-radius:999px;margin:2px 4px 2px 0;font-size:.74rem;color:#d7e3ee;background:rgba(255,255,255,.03);}
.fgm-good {color:#5ee6ad;font-weight:700}.fgm-warn {color:#ffd166;font-weight:700}.fgm-bad {color:#ff7b7b;font-weight:700}
.small-muted {font-size:.8rem;color:var(--fgm-muted)}

/* Make Streamlit controls feel like touch-first app controls. */
.stButton > button, .stDownloadButton > button, button[data-testid="baseButton-primary"], button[data-testid="baseButton-secondary"] {
    min-height:48px !important;border-radius:14px !important;font-weight:800 !important;font-size:.95rem !important;
}
div[data-baseweb="select"] > div, .stTextInput input, .stNumberInput input, .stFileUploader section {
    min-height:46px;border-radius:13px !important;
}
div[data-testid="stMetric"] {border:1px solid var(--fgm-border);background:var(--fgm-card);padding:11px 12px;border-radius:16px;}
div[data-testid="stMetricValue"] {font-size:1.45rem;}
[data-testid="stDataFrame"] {border:1px solid var(--fgm-border);border-radius:16px;overflow:hidden;}
hr {border-color:#202a34 !important;}

/* Pills become the app's primary tap navigation and wrap cleanly on phones. */
div[data-testid="stPills"] {margin:.1rem 0 .45rem 0;}
div[data-testid="stPills"] button {min-height:42px !important;border-radius:999px !important;font-weight:750 !important;padding:.45rem .8rem !important;}


.fgm-section-title {font-family:'Sora', sans-serif;font-size:1rem;font-weight:800;letter-spacing:-.02em;margin:.2rem 0 .65rem 0;}
.fgm-list {display:flex;flex-direction:column;gap:12px;margin:.25rem 0 .6rem 0;}
.fgm-list-card {border:1px solid rgba(255,255,255,.07);background:linear-gradient(180deg,rgba(18,25,37,.98),rgba(12,18,28,.98));border-radius:20px;padding:14px 14px 12px 14px;box-shadow:0 10px 25px rgba(0,0,0,.16);}
.fgm-row-top {display:flex;align-items:flex-start;justify-content:space-between;gap:10px;}
.fgm-row-title {font-family:'Sora', sans-serif;font-size:1rem;font-weight:800;letter-spacing:-.02em;line-height:1.15;color:#f4f8fc;}
.fgm-row-sub {font-size:.86rem;color:#b9c8d6;margin-top:5px;line-height:1.35;}
.fgm-badges {display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end;}
.fgm-mini-badge {padding:4px 8px;border-radius:999px;background:rgba(71,229,164,.10);border:1px solid rgba(71,229,164,.18);font-size:.72rem;font-weight:700;color:#c8ffea;white-space:nowrap;}
.fgm-mini-badge.alt {background:rgba(115,182,255,.10);border-color:rgba(115,182,255,.18);color:#d7e8ff;}
.fgm-stats {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:11px;}
.fgm-stat-chip {padding:9px 10px;border-radius:14px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.05);}
.fgm-stat-label {display:block;font-size:.7rem;text-transform:uppercase;letter-spacing:.08em;color:#88a0b6;font-weight:800;font-family:'Sora', sans-serif;}
.fgm-stat-value {display:block;font-size:.96rem;color:#f3f7fb;font-weight:800;line-height:1.15;margin-top:2px;}
.fgm-empty {border:1px dashed rgba(255,255,255,.12);border-radius:18px;padding:18px 16px;text-align:center;color:#b8c8d8;background:rgba(255,255,255,.02);}
.fgm-compare {display:flex;flex-direction:column;gap:10px;margin-top:.4rem;}
.fgm-compare-card {border:1px solid rgba(255,255,255,.07);background:linear-gradient(180deg,rgba(18,25,37,.98),rgba(12,18,28,.98));border-radius:20px;padding:14px;}
.fgm-compare-head {font-family:'Sora', sans-serif;font-size:.98rem;font-weight:800;margin-bottom:8px;color:#f5f9fc;}
.fgm-compare-grid {display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center;}
.fgm-compare-side {padding:10px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05);}
.fgm-compare-name {display:block;font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;color:#89a0b6;font-weight:800;font-family:'Sora', sans-serif;}
.fgm-compare-value {display:block;font-size:1rem;color:#f5f8fb;font-weight:800;margin-top:2px;}
.fgm-compare-vs {font-family:'Sora', sans-serif;font-weight:900;color:#5ee6ad;letter-spacing:.02em;}

@media (max-width: 700px) {
    .block-container {padding:.55rem .72rem 5rem .72rem;}
    .fgm-hero {padding:16px 15px;border-radius:18px;}
    .fgm-title {font-size:1.55rem;}
    .fgm-sub {font-size:.88rem;}
    .fgm-card {padding:14px;border-radius:16px;}
    [data-testid="stHorizontalBlock"] {gap:.55rem;}
    div[data-testid="stMetricValue"] {font-size:1.28rem;}
    .stButton > button, .stDownloadButton > button {min-height:50px !important;}
}
</style>
""",
    unsafe_allow_html=True,
)

# ------------------------------ Data + state ------------------------------
@st.cache_data(ttl=60 * 60 * 12, show_spinner=False)
def fetch_sleeper_player_pool(scoring: str):
    url = "https://api.sleeper.app/v1/players/nfl"
    r = requests.get(url, timeout=18)
    r.raise_for_status()
    raw = r.json()
    return build_sleeper_projection_df(raw, scoring)


def init_state():
    if "settings" not in st.session_state:
        st.session_state.settings = default_settings()
    if "draft" not in st.session_state:
        st.session_state.draft = None
    if "season" not in st.session_state:
        st.session_state.season = None
    if "custom_players" not in st.session_state:
        st.session_state.custom_players = None
    if "data_status" not in st.session_state:
        st.session_state.data_status = ""
    if "last_week_result" not in st.session_state:
        st.session_state.last_week_result = None
    if "vision_names" not in st.session_state:
        st.session_state.vision_names = []
    if "show_season_import" not in st.session_state:
        st.session_state.show_season_import = False
    if "cpu_personality_setup" not in st.session_state:
        st.session_state.cpu_personality_setup = {}
    if "cpu_personality_signature" not in st.session_state:
        st.session_state.cpu_personality_signature = None


init_state()


def get_players() -> pd.DataFrame:
    if st.session_state.custom_players is not None:
        return pd.DataFrame(st.session_state.custom_players)
    try:
        df = fetch_sleeper_player_pool(st.session_state.settings["scoring"])
        st.session_state.data_status = "Live Sleeper player metadata + Fantasy GM demo projections"
        return df
    except Exception as exc:
        st.session_state.data_status = f"Offline fallback player pool ({type(exc).__name__})"
        return fallback_player_pool(st.session_state.settings["scoring"])


players = get_players()
lookup = player_lookup(players)


def player_label(pid: str) -> str:
    p = lookup.get(str(pid), {})
    if not p:
        return str(pid)
    return f"{p['name']} — {p['position']} {p['team']} | ADP {float(p['adp']):.1f} | Proj {float(p['projected_points']):.1f}"


def names_for(ids):
    return [lookup.get(str(pid), {}).get("name", str(pid)) for pid in ids]


def require_draft():
    if not st.session_state.draft:
        st.info("Start a mock draft first. The league tools all use that saved draft as their foundation.")
        return False
    return True


def ensure_season():
    if not st.session_state.draft:
        return False
    if not st.session_state.draft.get("completed"):
        st.warning("Finish the mock draft before starting the season universe.")
        return False
    if st.session_state.season is None:
        st.session_state.season = initial_season_state(st.session_state.draft, players)
    return True


def current_user_idx() -> int:
    if st.session_state.draft:
        return int(st.session_state.draft["settings"]["user_team_index"])
    return int(st.session_state.settings.get("draft_slot", 1)) - 1


def user_roster() -> list[str]:
    if st.session_state.season:
        return list(st.session_state.season["rosters"][str(current_user_idx())])
    if st.session_state.draft:
        return list(st.session_state.draft["rosters"][str(current_user_idx())])
    return []


def manager_name(idx: int) -> str:
    if not st.session_state.draft:
        return f"Team {idx + 1}"
    for m in st.session_state.draft["managers"]:
        if m["team_index"] == idx:
            return m["team_name"]
    return f"Team {idx + 1}"


def hero(kicker: str, title: str, sub: str):
    st.markdown(
        f'<div class="fgm-hero"><div class="fgm-kicker">{kicker}</div><div class="fgm-title">{title}</div><div class="fgm-sub">{sub}</div></div>',
        unsafe_allow_html=True,
    )


def _fmt_value(value):
    if value is None:
        return '—'
    try:
        if pd.isna(value):
            return '—'
    except Exception:
        pass
    if isinstance(value, float):
        return f"{value:.1f}"
    return str(value)


def render_card_list(rows, *, title_key: str, subtitle_keys=None, stat_keys=None, badge_keys=None, empty_message='Nothing here yet.', title=None):
    if isinstance(rows, pd.DataFrame):
        records = rows.to_dict(orient='records')
    else:
        records = list(rows)
    if title:
        st.markdown(f"<div class='fgm-section-title'>{escape(str(title))}</div>", unsafe_allow_html=True)
    if not records:
        st.markdown(f"<div class='fgm-empty'>{escape(empty_message)}</div>", unsafe_allow_html=True)
        return
    subtitle_keys = subtitle_keys or []
    stat_keys = stat_keys or []
    badge_keys = badge_keys or []
    html = ["<div class='fgm-list'>"]
    for row in records:
        title_val = escape(_fmt_value(row.get(title_key)))
        subtitle_parts = []
        for key in subtitle_keys:
            val = _fmt_value(row.get(key))
            if val != '—':
                subtitle_parts.append(escape(f"{key}: {val}"))
        badge_html = []
        for idx, key in enumerate(badge_keys):
            val = _fmt_value(row.get(key))
            if val == '—':
                continue
            badge_class = 'fgm-mini-badge alt' if idx % 2 else 'fgm-mini-badge'
            badge_html.append(f"<span class='{badge_class}'>{escape(val)}</span>")
        stat_html = []
        for label, key in stat_keys:
            val = _fmt_value(row.get(key))
            stat_html.append(
                f"<div class='fgm-stat-chip'><span class='fgm-stat-label'>{escape(str(label))}</span><span class='fgm-stat-value'>{escape(val)}</span></div>"
            )
        html.append(
            "<div class='fgm-list-card'>"
            f"<div class='fgm-row-top'><div><div class='fgm-row-title'>{title_val}</div>"
            + (f"<div class='fgm-row-sub'>{' • '.join(subtitle_parts)}</div>" if subtitle_parts else '')
            + "</div>"
            + (f"<div class='fgm-badges'>{''.join(badge_html)}</div>" if badge_html else '')
            + "</div>"
            + (f"<div class='fgm-stats'>{''.join(stat_html)}</div>" if stat_html else '')
            + "</div>"
        )
    html.append('</div>')
    st.markdown(''.join(html), unsafe_allow_html=True)


def render_compare_cards(rows, left_name: str, right_name: str):
    if not rows:
        st.markdown("<div class='fgm-empty'>Nothing to compare yet.</div>", unsafe_allow_html=True)
        return
    html = ["<div class='fgm-compare'>"]
    for row in rows:
        html.append(
            "<div class='fgm-compare-card'>"
            f"<div class='fgm-compare-head'>{escape(str(row['Metric']))}</div>"
            f"<div class='fgm-compare-grid'><div class='fgm-compare-side'><span class='fgm-compare-name'>{escape(left_name)}</span><span class='fgm-compare-value'>{escape(_fmt_value(row[left_name]))}</span></div><div class='fgm-compare-vs'>VS</div><div class='fgm-compare-side'><span class='fgm-compare-name'>{escape(right_name)}</span><span class='fgm-compare-value'>{escape(_fmt_value(row[right_name]))}</span></div></div>"
            f"<div class='fgm-row-sub' style='margin-top:10px'>Better result: <strong>{escape(str(row['Better']))}</strong></div>"
            "</div>"
        )
    html.append('</div>')
    st.markdown(''.join(html), unsafe_allow_html=True)


def load_save_payload(data: dict) -> None:
    """Restore a season universe from a Fantasy GM JSON save."""
    st.session_state.draft = data["draft"]
    st.session_state.season = data.get("season")
    if data.get("players"):
        st.session_state.custom_players = normalize_player_df(pd.DataFrame(data["players"])).to_dict(orient="records")
        st.session_state.data_status = "Player data embedded in imported season"
    st.session_state.settings = st.session_state.draft.get("settings", st.session_state.settings)
    st.session_state.last_week_result = None
    st.session_state.trade_results = []


def ensure_cpu_personality_setup() -> dict:
    """Keep a selectable strategic CPU profile attached to every non-user draft slot."""
    teams = int(st.session_state.settings["teams"])
    user_idx = int(st.session_state.settings.get("draft_slot", 1)) - 1
    signature = f"{teams}:{user_idx}"
    names = [p["name"] for p in CPU_PERSONALITIES]

    if st.session_state.cpu_personality_signature != signature:
        for i in range(16):
            st.session_state.pop(f"cpu_personality_{i}", None)
        rng = random.Random(2026 + teams * 101 + user_idx * 17)
        mix = names.copy()
        rng.shuffle(mix)
        setup = {}
        cpu_counter = 0
        for i in range(teams):
            if i == user_idx:
                continue
            if cpu_counter and cpu_counter % len(mix) == 0:
                rng.shuffle(mix)
            selected = mix[cpu_counter % len(mix)]
            setup[str(i)] = selected
            st.session_state[f"cpu_personality_{i}"] = selected
            cpu_counter += 1
        st.session_state.cpu_personality_setup = setup
        st.session_state.cpu_personality_signature = signature
    else:
        for i in range(teams):
            if i == user_idx:
                continue
            key = f"cpu_personality_{i}"
            selected = st.session_state.cpu_personality_setup.get(str(i), "Balanced")
            if selected not in names:
                selected = "Balanced"
            if key not in st.session_state or st.session_state[key] not in names:
                st.session_state[key] = selected
    return st.session_state.cpu_personality_setup


def randomize_cpu_personalities() -> None:
    teams = int(st.session_state.settings["teams"])
    user_idx = int(st.session_state.settings.get("draft_slot", 1)) - 1
    names = [p["name"] for p in CPU_PERSONALITIES]
    rng = random.Random()
    shuffled = names.copy()
    rng.shuffle(shuffled)
    setup = {}
    cpu_counter = 0
    for i in range(teams):
        if i == user_idx:
            continue
        if cpu_counter and cpu_counter % len(shuffled) == 0:
            rng.shuffle(shuffled)
        selected = shuffled[cpu_counter % len(shuffled)]
        setup[str(i)] = selected
        st.session_state[f"cpu_personality_{i}"] = selected
        cpu_counter += 1
    st.session_state.cpu_personality_setup = setup


def season_save_text() -> str | None:
    if not st.session_state.draft:
        return None
    custom = pd.DataFrame(st.session_state.custom_players) if st.session_state.custom_players else None
    return serialize_state(st.session_state.draft, st.session_state.season, custom)


# ------------------------------ Navigation ------------------------------
appbar_left, appbar_right = st.columns([2.5, 1.7], vertical_alignment="center")
with appbar_left:
    st.markdown(
        f'<div class="fgm-appbar"><div class="fgm-brand">🏈 Fantasy <span>GM</span><span class="fgm-version">v{APP_VERSION}</span></div></div>',
        unsafe_allow_html=True,
    )
with appbar_right:
    if st.button("↻ Get Latest Version", use_container_width=True, help="Reload the deployed app and refresh cached player data."):
        st.cache_data.clear()
        if st.session_state.custom_players is None:
            fetch_sleeper_player_pool.clear()
            st.session_state.data_status = ""
        st.rerun()

primary = st.pills(
    "Main navigation",
    ["Home", "Draft", "Team", "Season", "Tools"],
    default="Home",
    key="primary_nav",
    label_visibility="collapsed",
    width="stretch",
)
primary = primary or "Home"

if primary == "Draft":
    page = st.pills(
        "Draft navigation", ["League Setup", "Mock Draft"], default="Mock Draft",
        key="draft_nav", label_visibility="collapsed", width="stretch",
    ) or "Mock Draft"
elif primary == "Team":
    page = st.pills(
        "Team navigation", ["My Team", "Waiver Wire", "Trade Center"], default="My Team",
        key="team_nav", label_visibility="collapsed", width="stretch",
    ) or "My Team"
elif primary == "Season":
    page = "Season Simulator"
elif primary == "Tools":
    page = st.pills(
        "Tools navigation", ["Player Compare", "Roster Screenshot", "Fantasy Lab", "Data & Saves"],
        default="Player Compare", key="tools_nav", label_visibility="collapsed", width="stretch",
    ) or "Player Compare"
else:
    page = "Home"

# Status stays available without occupying mobile screen space.
with st.sidebar:
    st.markdown("## 🏈 Fantasy GM")
    st.caption(f"Version {APP_VERSION}")
    st.caption(st.session_state.data_status or "Loading player data…")
    if st.session_state.draft:
        d = st.session_state.draft
        st.metric("Draft", "Complete" if d.get("completed") else f"Pick {d['pick_index'] + 1}/{len(d['order'])}")
    if st.session_state.season:
        st.metric("Season", f"Week {st.session_state.season['week']}")

# ------------------------------ Home ------------------------------
if page == "Home":
    hero("FANTASY FOOTBALL SANDBOX", "Fantasy GM 2026", "One connected universe: mock draft → lineup → waivers → trades → season simulation → playoffs.")
    c1, c2 = st.columns(2)
    c1.metric("Player pool", f"{len(players):,}")
    c2.metric("League size", st.session_state.settings["teams"])
    c3, c4 = st.columns(2)
    c3.metric("Scoring", st.session_state.settings["scoring"])
    c4.metric("Your slot", f"{st.session_state.settings['draft_slot']}")

    st.markdown("<div class='fgm-card'><h3>🐍 Draft Room</h3><p>Strategic snake-draft CPUs, roster needs, ADP discipline and realistic roster construction.</p><span class='fgm-pill'>Saved draft</span><span class='fgm-pill'>Strategic CPUs</span><span class='fgm-pill'>Auto-pick</span></div>", unsafe_allow_html=True)
    st.markdown("<div class='fgm-card'><h3>🧠 Trade Intelligence</h3><p>Compare packages, estimate roster impact, search mutually beneficial deals and test them in Fantasy Lab.</p><span class='fgm-pill'>Fairness</span><span class='fgm-pill'>Acceptance</span><span class='fgm-pill'>Roster fit</span></div>", unsafe_allow_html=True)
    st.markdown("<div class='fgm-card'><h3>🧪 Season Universe</h3><p>Sim weekly outcomes with volatility, breakouts, injuries, FAAB, standings and playoff progression.</p><span class='fgm-pill'>Season saves</span><span class='fgm-pill'>Waivers</span><span class='fgm-pill'>Monte Carlo</span></div>", unsafe_allow_html=True)

    st.subheader("League status")
    if not st.session_state.draft:
        st.info("Set your league rules, then start your first mock draft.")
    elif not st.session_state.draft.get("completed"):
        st.success(f"Mock draft in progress — {len(st.session_state.draft['picks'])} picks completed.")
    else:
        ensure_season()
        u = current_user_idx()
        roster = user_roster()
        strength = lineup_projection(auto_lineup(roster, players, st.session_state.draft["settings"]), players)
        col1, col2, col3 = st.columns(3)
        col1.metric("Roster size", len(roster))
        col2.metric("Projected weekly", f"{strength:.1f}")
        if st.session_state.season:
            s = st.session_state.season["standings"][str(u)]
            col3.metric("Record", f"{s['wins']}-{s['losses']}")


# ------------------------------ League Setup ------------------------------
elif page == "League Setup":
    hero("BUILD YOUR LEAGUE", "League Setup", "Configure the fantasy universe before starting a new draft.")
    s = st.session_state.settings
    with st.form("league_setup"):
        top1, top2 = st.columns(2)
        league_name = top1.text_input("League name", value=s["league_name"])
        teams = top2.selectbox("Teams", [8, 10, 12, 14, 16], index=[8, 10, 12, 14, 16].index(int(s["teams"])))
        top3, top4 = st.columns(2)
        scoring = top3.selectbox("Scoring", ["PPR", "Half PPR", "Standard"], index=["PPR", "Half PPR", "Standard"].index(s["scoring"]))
        draft_slot = top4.number_input("Your draft slot", 1, int(teams), min(int(s["draft_slot"]), int(teams)), 1)

        st.markdown("### Starting lineup")
        r1, r2 = st.columns(2)
        qb = r1.number_input("QB", 1, 3, int(s["roster"].get("QB", 1)))
        rb = r2.number_input("RB", 1, 4, int(s["roster"].get("RB", 2)))
        r3, r4 = st.columns(2)
        wr = r3.number_input("WR", 1, 5, int(s["roster"].get("WR", 2)))
        te = r4.number_input("TE", 0, 3, int(s["roster"].get("TE", 1)))
        r5, r6 = st.columns(2)
        flex = r5.number_input("FLEX", 0, 4, int(s["roster"].get("FLEX", 2)))
        k = r6.number_input("K", 0, 1, int(s["roster"].get("K", 0)))
        r7, r8 = st.columns(2)
        defense = r7.number_input("DEF", 0, 1, int(s["roster"].get("DEF", 0)))
        bench = r8.number_input("Bench", 3, 12, int(s["roster"].get("BENCH", 6)))
        x1, x2 = st.columns(2)
        faab = x1.number_input("FAAB budget", 0, 1000, int(s.get("faab_budget", 100)), 5)
        playoff_teams = x2.selectbox("Playoff teams", [4, 6, 8], index=[4, 6, 8].index(int(s.get("playoff_teams", 6))) if int(s.get("playoff_teams", 6)) in [4, 6, 8] else 1)
        submitted = st.form_submit_button("Save league settings", type="primary", use_container_width=True)
        if submitted:
            st.session_state.settings = {
                **s,
                "league_name": league_name,
                "teams": int(teams), "draft_slot": int(draft_slot), "scoring": scoring,
                "faab_budget": int(faab), "playoff_teams": min(int(playoff_teams), int(teams)),
                "roster": {"QB": int(qb), "RB": int(rb), "WR": int(wr), "TE": int(te), "FLEX": int(flex), "K": int(k), "DEF": int(defense), "BENCH": int(bench)},
            }
            if st.session_state.custom_players is None:
                fetch_sleeper_player_pool.clear()
            st.success("League settings saved. Start a new draft to use them.")

    if st.session_state.draft:
        st.warning("You already have a draft in progress/saved. Changing setup does not rewrite that draft; start a New Draft to use the new rules.")


# ------------------------------ Mock Draft ------------------------------
elif page == "Mock Draft":
    hero("WAR ROOM", "Snake Mock Draft", "Choose how every CPU drafts, then carry the exact rosters into the season simulator.")

    cpu_setup = ensure_cpu_personality_setup()
    personality_names = [p["name"] for p in CPU_PERSONALITIES]
    teams_for_setup = int(st.session_state.settings["teams"])
    user_for_setup = int(st.session_state.settings.get("draft_slot", 1)) - 1

    with st.expander("🧠 CPU Draft Personalities", expanded=not bool(st.session_state.draft)):
        st.caption("Assign a strategy to every opponent before the draft. Personalities change positional priorities and risk preference, but all CPUs still obey the realistic draft guardrails.")
        action1, action2 = st.columns(2)
        if action1.button("🎲 Randomize Personalities", use_container_width=True):
            randomize_cpu_personalities()
            st.rerun()
        if action2.button("⚖️ Set All Balanced", use_container_width=True):
            for i in range(teams_for_setup):
                if i == user_for_setup:
                    continue
                st.session_state.cpu_personality_setup[str(i)] = "Balanced"
                st.session_state[f"cpu_personality_{i}"] = "Balanced"
            st.rerun()

        st.markdown(f"**Your slot:** Pick {user_for_setup + 1} — My Team")
        personality_cols = st.columns(2)
        cpu_num = 0
        for i in range(teams_for_setup):
            if i == user_for_setup:
                continue
            widget_key = f"cpu_personality_{i}"
            with personality_cols[cpu_num % 2]:
                selected = st.selectbox(
                    f"{cpu_team_name(i)} • Pick {i + 1}",
                    personality_names,
                    key=widget_key,
                )
                st.session_state.cpu_personality_setup[str(i)] = selected
                st.caption(cpu_personality_description(selected))
            cpu_num += 1

    launch_left, launch_right = st.columns([1.45, 1])
    seed = launch_right.number_input("Draft seed", 1, 999999, 2026)
    if launch_left.button("Start New Draft", type="primary", use_container_width=True):
        personality_overrides = dict(st.session_state.cpu_personality_setup)
        st.session_state.draft = new_draft_state(st.session_state.settings, int(seed), personality_overrides)
        st.session_state.season = None
        advance_cpu_until_user(st.session_state.draft, players)
        st.rerun()

    if not st.session_state.draft:
        st.info("Choose the CPU strategies above, then tap **Start New Draft**. CPU teams will draft until your first pick.")
    else:
        d = st.session_state.draft
        teams = int(d["settings"]["teams"])
        total = len(d["order"])
        picked = len(d["picks"])
        st.progress(picked / total if total else 0, text=f"{picked} / {total} picks")

        if not d.get("completed"):
            overall = d["pick_index"] + 1
            rnd = (overall - 1) // teams + 1
            p_in_round = (overall - 1) % teams + 1
            st.subheader(f"Round {rnd} • Pick {p_in_round} • Overall {overall}")

            drafted_ids = {p["player_id"] for p in d["picks"]}
            avail = players[~players["player_id"].isin(drafted_ids)].copy()
            f1, f2 = st.columns([1, 3])
            pos_filter = f1.selectbox("Position", ["ALL", "QB", "RB", "WR", "TE", "K", "DEF"])
            search = f2.text_input("Search available players", placeholder="Type a player name…")
            if pos_filter != "ALL":
                avail = avail[avail["position"] == pos_filter]
            if search:
                avail = avail[avail["name"].str.contains(search, case=False, na=False)]
            avail = avail.sort_values(["adp", "projected_points"], ascending=[True, False])

            options = avail["player_id"].astype(str).head(120).tolist()
            if options:
                choice = st.selectbox("Your pick", options, format_func=player_label)
                b1, b2 = st.columns(2)
                if b1.button("Draft Selected Player", type="primary", use_container_width=True):
                    record_pick(d, choice, players)
                    advance_cpu_until_user(d, players)
                    if d.get("completed"):
                        st.session_state.season = initial_season_state(d, players)
                    st.rerun()
                if b2.button("Auto-pick Best Fit", use_container_width=True):
                    # Temporarily treat the user as Balanced CPU for a fast mock option.
                    original = next(m for m in d["managers"] if m["team_index"] == current_user_idx())
                    original["personality"] = "Balanced"
                    from fantasy_engine import cpu_pick_player
                    pid = cpu_pick_player(d, players, current_user_idx())
                    original["personality"] = "User"
                    record_pick(d, pid, players)
                    advance_cpu_until_user(d, players)
                    if d.get("completed"):
                        st.session_state.season = initial_season_state(d, players)
                    st.rerun()

            top = avail[["name", "team", "position", "adp", "projected_points", "ceiling", "floor"]].head(20).copy()
            top.columns = ["Player", "Team", "Pos", "ADP", "Proj", "Ceiling", "Floor"]
            render_card_list(top, title_key="Player", subtitle_keys=["Team"], badge_keys=["Pos"], stat_keys=[("ADP", "ADP"), ("Proj", "Proj"), ("Ceiling", "Ceiling"), ("Floor", "Floor")], title="Best available")
        else:
            st.success("Draft complete. Your league is ready for lineup management, waivers, trades and season simulation.")
            if st.session_state.season is None:
                st.session_state.season = initial_season_state(d, players)

        st.subheader("Draft board")
        if d["picks"]:
            board = pd.DataFrame(d["picks"])
            board["Team"] = board["team_index"].map({m["team_index"]: m["team_name"] for m in d["managers"]})
            board = board[["overall", "round", "pick_in_round", "Team", "name", "position", "team", "adp"]]
            board.columns = ["#", "Rnd", "Pick", "Fantasy Team", "Player", "Pos", "NFL", "ADP"]
            render_card_list(board.tail(30).to_dict(orient="records"), title_key="Player", subtitle_keys=["Fantasy Team", "NFL"], badge_keys=["Pos"], stat_keys=[("Overall", "#"), ("Round", "Rnd"), ("Pick", "Pick"), ("ADP", "ADP")], title="Latest picks")

        with st.expander("CPU manager personalities"):
            mdf = pd.DataFrame(d["managers"])[["team_name", "personality", "desc"]]
            mdf.columns = ["Team", "Personality", "Description"]
            render_card_list(mdf, title_key="Team", subtitle_keys=["Description"], badge_keys=["Personality"], title="Manager styles")


# ------------------------------ My Team ------------------------------
elif page == "My Team":
    hero("ROSTER HQ", "My Team & Lineup", "Auto-optimize the roster or set each starting slot yourself.")
    if require_draft() and ensure_season():
        d, season = st.session_state.draft, st.session_state.season
        roster = user_roster()
        rdf = players[players["player_id"].isin(roster)].copy()
        rdf["trade_value"] = rdf.apply(trade_value, axis=1)
        rdf = rdf.sort_values(["position", "projected_points"], ascending=[True, False])
        show = rdf[["name", "team", "position", "projected_points", "ceiling", "floor", "adp", "trade_value"]].copy()
        show.columns = ["Player", "NFL", "Pos", "Season Proj", "Ceiling", "Floor", "ADP", "Trade Value"]
        render_card_list(show, title_key="Player", subtitle_keys=["NFL"], badge_keys=["Pos"], stat_keys=[("Proj", "Season Proj"), ("Ceiling", "Ceiling"), ("Floor", "Floor"), ("Trade", "Trade Value")], title="Roster overview")

        st.subheader("Starting lineup")
        auto = auto_lineup(roster, players, d["settings"], unavailable=set())
        manual = season.get("manual_lineup", {}).get(str(current_user_idx())) or {k: v for k, v in auto.items() if k != "BENCH"}
        selected = {}
        used = []
        starter_keys = [k for k in auto.keys() if k != "BENCH"]
        cols = st.columns(2)
        for idx, slot_key in enumerate(starter_keys):
            slot = ''.join([c for c in slot_key if not c.isdigit()])
            eligible_pos = {"RB", "WR", "TE"} if slot == "FLEX" else {slot}
            eligible = rdf[rdf["position"].isin(eligible_pos)]["player_id"].astype(str).tolist()
            if not eligible:
                selected[slot_key] = None
                cols[idx % 2].warning(f"{slot_key}: No eligible player")
                continue
            current = manual.get(slot_key)
            default_idx = eligible.index(current) if current in eligible else 0
            selected[slot_key] = cols[idx % 2].selectbox(slot_key, eligible, index=default_idx, format_func=player_label, key=f"lineup_{slot_key}")
            used.append(selected[slot_key])
        if len(used) != len(set(used)):
            st.error("A player is selected in more than one starting slot. Fix duplicates before saving.")
        elif st.button("Save Starting Lineup", type="primary"):
            season.setdefault("manual_lineup", {})[str(current_user_idx())] = selected
            st.success("Lineup saved for the next simulation.")

        proj = lineup_projection({**selected, "BENCH": []}, players)
        st.metric("Projected weekly lineup", f"{proj:.1f}")


# ------------------------------ Season Simulator ------------------------------
elif page == "Season Simulator":
    hero("GAME WEEK", "Season Simulator", "Advance one week at a time. Every team gets scores, transactions matter, injuries persist and standings update.")

    save_col, import_col = st.columns(2)
    quick_save = season_save_text()
    if quick_save is not None:
        draft_for_name = st.session_state.draft or {"settings": {}}
        league_file = str(draft_for_name.get("settings", {}).get("league_name", "fantasy_gm")).strip().lower().replace(" ", "_")
        save_col.download_button(
            "💾 Save Season", quick_save, f"{league_file}_season.json", "application/json",
            use_container_width=True,
        )
    else:
        save_col.button("💾 Save Season", disabled=True, use_container_width=True)
    if import_col.button("📥 Import Season", use_container_width=True):
        st.session_state.show_season_import = not st.session_state.show_season_import
    if st.session_state.show_season_import:
        with st.container(border=True):
            season_upload = st.file_uploader("Choose Fantasy GM season save", type=["json"], key="season_quick_import")
            if season_upload and st.button("Load Imported Season", type="primary", use_container_width=True):
                try:
                    data = deserialize_state(season_upload.getvalue().decode("utf-8"))
                    load_save_payload(data)
                    st.session_state.show_season_import = False
                    st.success("Season imported.")
                    st.rerun()
                except Exception as exc:
                    st.error(f"Could not import season: {exc}")

    if require_draft() and ensure_season():
        d, season = st.session_state.draft, st.session_state.season
        u = current_user_idx()
        c1, c2 = st.columns(2)
        c1.metric("Current week", season["week"])
        us = season["standings"][str(u)]
        c2.metric("Record", f"{us['wins']}-{us['losses']}")
        c3, c4 = st.columns(2)
        c3.metric("Points For", f"{us['pf']:.1f}")
        c4.metric("FAAB", f"${season['faab'][str(u)]}")

        if season.get("champion") is not None:
            champ = manager_name(int(season["champion"]))
            st.success(f"🏆 Season complete — **{champ}** won the Fantasy GM championship.")
        elif st.button("Simulate Next Week", type="primary", use_container_width=True):
            result = simulate_week(season, d, players)
            st.session_state.last_week_result = result
            st.rerun()

        result = st.session_state.last_week_result
        if result and result.get("week") == season["week"]:
            st.subheader(f"Week {result['week']} results")
            if result.get("results"):
                rows = []
                for g in result["results"]:
                    rows.append({"Team A": manager_name(g["team_a"]), "Score A": g["score_a"], "Team B": manager_name(g["team_b"]), "Score B": g["score_b"]})
                render_card_list(pd.DataFrame(rows), title_key="Team A", subtitle_keys=["Team B"], stat_keys=[("Score A", "Score A"), ("Score B", "Score B")], title="Matchups")
            if result.get("new_injuries"):
                st.warning("Injuries: " + "; ".join(f"{x['name']} ({x['weeks']} wks)" for x in result["new_injuries"][:8]))

        st.subheader("Standings")
        standings = standings_frame(season, d)
        render_card_list(standings.drop(columns=["team_index"]), title_key="Team", subtitle_keys=["Record"], stat_keys=[("Wins", "W"), ("Losses", "L"), ("PF", "PF"), ("PA", "PA")], title="Standings")

        st.subheader("Power rankings")
        power_rows = []
        games_played = max(1, min(season["week"], int(d["settings"].get("regular_season_weeks", 14))))
        for _, row in standings.iterrows():
            idx = int(row["team_index"])
            strength = lineup_projection(auto_lineup(season["rosters"][str(idx)], players, d["settings"], unavailable=set(season.get("injuries", {}).keys())), players)
            rating = row["W"] * 8 + (row["PF"] / games_played) * .22 + strength * .55
            power_rows.append({"Team": row["Team"], "Record": f"{int(row['W'])}-{int(row['L'])}", "Weekly Strength": round(strength, 1), "Power Score": round(rating, 1)})
        power = pd.DataFrame(power_rows).sort_values("Power Score", ascending=False).reset_index(drop=True)
        power.index = power.index + 1
        power.insert(0, "Rank", power.index)
        render_card_list(power.head(12), title_key="Team", subtitle_keys=["Record"], stat_keys=[("Rank", "Rank"), ("Strength", "Weekly Strength"), ("Power", "Power Score")], title="Power rankings")

        if result and result.get("week") == season["week"]:
            st.subheader("Weekly recap")
            scores = result.get("team_scores", {})
            if scores:
                high_idx = max(scores, key=lambda k: scores[k])
                st.write(f"**High score:** {manager_name(int(high_idx))} — {scores[high_idx]:.2f}")
            hot = result.get("hot_ids", [])[:5]
            if hot:
                st.write("**Waiver watch:** " + ", ".join(names_for(hot)))
            if result.get("new_injuries"):
                st.write("**Injury watch:** " + ", ".join(x["name"] for x in result["new_injuries"][:5]))

        if season.get("injuries"):
            st.subheader("Current injury report")
            ir = []
            for pid, weeks in season["injuries"].items():
                p = lookup.get(pid, {})
                ir.append({"Player": p.get("name", pid), "Pos": p.get("position", ""), "Team": p.get("team", ""), "Weeks Remaining": weeks})
            render_card_list(pd.DataFrame(ir), title_key="Player", subtitle_keys=["Team"], badge_keys=["Pos"], stat_keys=[("Weeks Left", "Weeks Remaining")], title="Injury report")


# ------------------------------ Waiver Wire ------------------------------
elif page == "Waiver Wire":
    hero("TUESDAY NIGHT", "FAAB Waiver Wire", "Bid against CPU managers. Lose a claim and the winning CPU actually adds the player to its roster.")
    if require_draft() and ensure_season():
        d, season = st.session_state.draft, st.session_state.season
        fa = free_agents(season, players)
        show = fa.head(35)[["name", "team", "position", "projected_points", "last_week", "trending", "waiver_score"]].copy()
        show.columns = ["Player", "NFL", "Pos", "Season Proj", "Last Week", "Trending", "Waiver Score"]
        render_card_list(show, title_key="Player", subtitle_keys=["NFL"], badge_keys=["Pos"], stat_keys=[("Proj", "Season Proj"), ("Last Wk", "Last Week"), ("Trend", "Trending"), ("Score", "Waiver Score")], title="Best free agents")

        options = fa.head(100)["player_id"].astype(str).tolist()
        if options:
            add_id = st.selectbox("Player to claim", options, format_func=player_label)
            row = fa.loc[fa["player_id"] == add_id].iloc[0]
            low, high = suggested_faab(row, season)
            st.caption(f"Fantasy GM suggested FAAB: **${low}–${high}**")
            roster = user_roster()
            drop_options = [None] + roster
            drop_id = st.selectbox("Drop player", drop_options, format_func=lambda x: "No drop" if x is None else player_label(x))
            budget = season["faab"][str(current_user_idx())]
            bid = st.number_input("Your FAAB bid", 0, int(budget), min(int(budget), max(low, 1)))
            if st.button("Process Waiver Claim", type="primary"):
                result = process_user_waiver(season, d, players, add_id, drop_id, int(bid))
                (st.success if result["won"] else st.error)(result["message"])

        st.divider()
        if st.button("Run Remaining CPU Waiver Activity", use_container_width=True):
            moves = process_cpu_waiver_night(season, d, players, max_moves=3)
            if moves:
                move_text = []
                for move in moves:
                    move_text.append(f"{manager_name(move['team'])}: added {lookup.get(move['add'], {}).get('name', move['add'])} for ${move['faab']}")
                st.info(" • ".join(move_text))
            else:
                st.caption("No CPU team found a waiver move worth making this cycle.")

        with st.expander("Transaction log"):
            tx = season.get("transactions", [])
            if tx:
                st.json(tx)
            else:
                st.caption("No transactions yet.")


# ------------------------------ Trade Center ------------------------------
elif page == "Trade Center":
    hero("FRONT OFFICE", "Trade Center", "Calculate package value, account for roster fit, then search the league for deals both sides can justify.")
    tabs = st.tabs(["Trade Calculator", "League Trade Finder"])

    with tabs[0]:
        all_ids = players.sort_values("adp")["player_id"].astype(str).tolist()
        c1, c2 = st.columns(2)
        give = c1.multiselect("Side A gives", all_ids, max_selections=3, format_func=player_label)
        get = c2.multiselect("Side B gives", all_ids, max_selections=3, format_func=player_label)
        if give or get:
            ev = trade_evaluation(give, get, players)
            m1, m2, m3 = st.columns(3)
            m1.metric("Side A value", ev["give_value"])
            m2.metric("Side B value", ev["get_value"])
            m3.metric("Fairness", f"{ev['fairness']:.0f}/100")
            if ev["value_delta"] > 3:
                st.success("Value edge: Side A receives the stronger package.")
            elif ev["value_delta"] < -3:
                st.success("Value edge: Side B receives the stronger package.")
            else:
                st.info("Raw package value is close to even.")

        if ensure_season():
            st.divider()
            st.markdown("#### Evaluate against your actual league")
            other_idxs = [i for i in range(int(st.session_state.draft["settings"]["teams"])) if i != current_user_idx()]
            other = st.selectbox("Trade partner", other_idxs, format_func=manager_name)
            your_ids = user_roster()
            their_ids = st.session_state.season["rosters"][str(other)]
            y = st.multiselect("You give", your_ids, max_selections=3, format_func=player_label, key="league_give")
            t = st.multiselect("You receive", their_ids, max_selections=3, format_func=player_label, key="league_get")
            if y and t:
                ev = trade_evaluation(y, t, players, your_ids, their_ids, st.session_state.draft["settings"])
                a, b, c, dcol = st.columns(4)
                a.metric("Fairness", f"{ev['fairness']:.0f}/100")
                b.metric("Your weekly change", f"{ev['your_improvement']:+.2f}")
                c.metric("Their weekly change", f"{ev['their_improvement']:+.2f}")
                dcol.metric("Est. acceptance", f"{ev['acceptance']:.0f}%")

    with tabs[1]:
        if require_draft() and ensure_season():
            if st.button("Find Realistic Trades", type="primary"):
                with st.spinner("Scanning every roster for complementary needs…"):
                    st.session_state.trade_results = find_trades(current_user_idx(), st.session_state.season, st.session_state.draft, players, 12)
            results = st.session_state.get("trade_results", [])
            if results:
                for i, r in enumerate(results):
                    with st.container(border=True):
                        st.markdown(f"### #{i+1} — {r['partner']}")
                        l, rr = st.columns(2)
                        l.markdown(f"**YOU GIVE**  \n{r['give']}")
                        rr.markdown(f"**YOU GET**  \n{r['get']}")
                        x1, x2, x3, x4 = st.columns(4)
                        x1.metric("Fairness", f"{r['fairness']:.0f}/100")
                        x2.metric("Your Δ", f"{r['your_improvement']:+.2f}")
                        x3.metric("Their Δ", f"{r['their_improvement']:+.2f}")
                        x4.metric("Accept", f"{r['acceptance']:.0f}%")
                        st.caption(r["reason"])
                        if st.button("Send Trade Offer", key=f"execute_trade_{i}"):
                            rng = random.Random(2026 + int(st.session_state.season.get("week", 0)) * 101 + i * 17 + r["partner_index"])
                            if rng.random() * 100 <= float(r["acceptance"]):
                                execute_trade(st.session_state.season, current_user_idx(), r["give_ids"], r["partner_index"], r["get_ids"])
                                st.success("Accepted — trade completed in this simulated league.")
                                st.session_state.trade_results = []
                            else:
                                st.warning(f"Rejected by {r['partner']}. Estimated acceptance was {r['acceptance']:.0f}%.")
            else:
                st.caption("Run the finder after completing a draft.")


# ------------------------------ Player Compare ------------------------------
elif page == "Player Compare":
    hero("DECISION DESK", "Draft / Start / Trade: Player A vs Player B", "Compare projection, ceiling, floor, volatility, injury risk, market cost and trade value.")
    ids = players.sort_values("adp")["player_id"].astype(str).tolist()
    a, b = st.columns(2)
    pa = a.selectbox("Player A", ids, index=0, format_func=player_label)
    pb = b.selectbox("Player B", ids, index=min(1, len(ids)-1), format_func=player_label)
    if pa == pb:
        st.warning("Choose two different players.")
    else:
        ra = players.loc[players["player_id"] == pa].iloc[0]
        rb = players.loc[players["player_id"] == pb].iloc[0]
        comp = compare_players(ra, rb)
        st.success(f"Fantasy GM lean: **{comp['winner']}** ({comp['confidence']:.0f}% confidence on this heuristic model)")
        rows = []
        for metric, (av, bv, direction) in comp["metrics"].items():
            rows.append({"Metric": metric, ra["name"]: round(av, 2), rb["name"]: round(bv, 2), "Better": "Higher" if direction == "high" else "Lower"})
        render_compare_cards(rows, ra["name"], rb["name"])


# ------------------------------ Roster Screenshot ------------------------------
elif page == "Roster Screenshot":
    hero("VISION IMPORT", "Screenshot → Roster → Trade Ideas", "Upload a fantasy roster screenshot. Vision can read visible player names, then the app maps them into the trade engine.")
    uploaded = st.file_uploader("Upload roster screenshot", type=["png", "jpg", "jpeg", "webp"])
    api_key_default = ""
    try:
        api_key_default = st.secrets.get("OPENAI_API_KEY", "")
    except Exception:
        pass
    api_key = st.text_input("OpenAI API key (optional if configured in Streamlit Secrets)", value=api_key_default, type="password")
    if uploaded:
        st.image(uploaded, caption="Roster screenshot", width=500)
        if st.button("Read Roster From Screenshot", type="primary"):
            if not api_key and not os.getenv("OPENAI_API_KEY"):
                st.error("No OpenAI API key is configured. Use the manual roster box below instead.")
            else:
                try:
                    with st.spinner("Reading visible player names…"):
                        st.session_state.vision_names = extract_roster_names(uploaded.getvalue(), api_key=api_key or None)
                    st.success(f"Found {len(st.session_state.vision_names)} possible player names.")
                except Exception as exc:
                    st.error(f"Vision import failed: {exc}")

    default_text = "\n".join(st.session_state.vision_names)
    manual = st.text_area("Roster names — review/edit or paste manually", value=default_text, height=220, placeholder="One player per line")
    raw_names = [x.strip() for x in manual.splitlines() if x.strip()]
    if raw_names:
        pool_names = players["name"].tolist()
        name_to_pid = dict(zip(players["name"], players["player_id"].astype(str)))
        mapped = []
        for raw in raw_names:
            match = difflib.get_close_matches(raw, pool_names, n=1, cutoff=.67)
            if match:
                mapped.append((raw, match[0], name_to_pid[match[0]]))
            else:
                mapped.append((raw, "No confident match", None))
        mdf = pd.DataFrame(mapped, columns=["Screenshot/Paste", "Matched Player", "player_id"])
        matches_view = mdf.drop(columns=["player_id"]).rename(columns={"Screenshot/Paste": "Submitted Name"})
        render_card_list(matches_view, title_key="Matched Player", subtitle_keys=["Submitted Name"], title="Matched players")

        matched_ids = [pid for _, _, pid in mapped if pid]
        if matched_ids:
            st.metric("Matched roster value", package_value(matched_ids, players))
            st.caption("For full league-specific realistic offers, complete a mock draft or import a saved Fantasy GM league so the app has trade partners to analyze.")
            if ensure_season():
                st.markdown("#### Your current league trade finder")
                if st.button("Find Deals Using Current League", key="screenshot_trade_find"):
                    st.session_state.trade_results = find_trades(current_user_idx(), st.session_state.season, st.session_state.draft, players, 10)
                    st.success("Trade ideas generated in Trade Center.")


# ------------------------------ Fantasy Lab ------------------------------
elif page == "Fantasy Lab":
    hero("WHAT IF?", "Fantasy Lab", "Swap an asset, run thousands of weekly roster outcomes, and see whether the change improves your distribution.")
    if require_draft() and ensure_season():
        roster = user_roster()
        all_ids = players.sort_values("adp")["player_id"].astype(str).tolist()
        c1, c2 = st.columns(2)
        remove = c1.selectbox("Remove from your roster", [None] + roster, format_func=lambda x: "Nobody" if x is None else player_label(x))
        add_options = [pid for pid in all_ids if pid not in roster]
        add = c2.selectbox("Add to your roster", [None] + add_options, format_func=lambda x: "Nobody" if x is None else player_label(x))
        sims = st.slider("Monte Carlo simulations", 1000, 10000, 4000, 500)
        if st.button("Run What-If Simulation", type="primary"):
            after = [pid for pid in roster if pid != remove]
            if add:
                after.append(add)
            res = lab_compare(roster, after, players, st.session_state.draft["settings"], int(sims))
            a, b, c = st.columns(3)
            a.metric("Before weekly mean", res["before"]["mean"])
            b.metric("After weekly mean", res["after"]["mean"], delta=f"{res['weekly_delta']:+.2f}")
            c.metric("After beats before", f"{res['after_beats_before']:.1f}%")
            details = pd.DataFrame([
                {"Scenario": "Before", **res["before"]},
                {"Scenario": "After", **res["after"]},
            ])
            render_card_list(details, title_key="Scenario", stat_keys=[("Mean", "mean"), ("Median", "median"), ("Floor", "p10"), ("Ceiling", "p90")], title="Simulation summary")


# ------------------------------ Data & Saves ------------------------------
elif page == "Data & Saves":
    hero("CONTROL ROOM", "Data, Imports & Save Files", "Refresh player metadata, bring your own rankings/projections, and export the entire fantasy universe.")
    st.subheader("Player data")
    st.write(f"**Current source:** {st.session_state.data_status}")
    st.caption("The built-in projection model is intentionally a demo heuristic. Import current projections/ADP for competitive decisions.")

    d1, d2 = st.columns(2)
    if d1.button("Refresh Sleeper Player Metadata", use_container_width=True):
        st.session_state.custom_players = None
        fetch_sleeper_player_pool.clear()
        st.rerun()
    if d2.button("Use Offline Demo Pool", use_container_width=True):
        st.session_state.custom_players = fallback_player_pool(st.session_state.settings["scoring"]).to_dict(orient="records")
        st.session_state.data_status = "Offline demo pool"
        st.rerun()

    sample_bytes = SAMPLE_CSV.read_bytes() if SAMPLE_CSV.exists() else b""
    st.download_button("Download Projection CSV Template", sample_bytes, "sample_projection_import.csv", "text/csv")
    custom = st.file_uploader("Import projection/ADP CSV", type=["csv"], key="projection_import")
    if custom and st.button("Load Projection CSV", type="primary"):
        try:
            df = pd.read_csv(custom)
            df = normalize_player_df(df)
            st.session_state.custom_players = df.to_dict(orient="records")
            st.session_state.data_status = f"Custom projection CSV ({len(df)} players)"
            st.success(f"Loaded {len(df)} players.")
            st.rerun()
        except Exception as exc:
            st.error(f"Could not import CSV: {exc}")

    st.divider()
    st.subheader("Save / import season")
    if st.session_state.draft:
        save_text = serialize_state(st.session_state.draft, st.session_state.season, pd.DataFrame(st.session_state.custom_players) if st.session_state.custom_players else None)
        st.download_button("💾 Save Season", save_text, "fantasy_gm_season.json", "application/json", type="primary", use_container_width=True)
    else:
        st.caption("Start a draft before saving a season.")

    save_upload = st.file_uploader("Import Fantasy GM season (.json)", type=["json"], key="save_import")
    if save_upload and st.button("📥 Import Season", type="primary", use_container_width=True):
        try:
            data = deserialize_state(save_upload.getvalue().decode("utf-8"))
            load_save_payload(data)
            st.success("Season imported.")
            st.rerun()
        except Exception as exc:
            st.error(f"Could not load save: {exc}")

    st.divider()
    st.subheader("Danger zone")
    if st.button("Reset Draft & Season"):
        st.session_state.draft = None
        st.session_state.season = None
        st.session_state.last_week_result = None
        st.session_state.trade_results = []
        st.success("Draft and season reset. Player data/settings were kept.")
