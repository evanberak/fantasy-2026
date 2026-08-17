from __future__ import annotations

import copy
import json
import math
import random
from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional

import numpy as np
import pandas as pd

FANTASY_POSITIONS = {"QB", "RB", "WR", "TE", "K", "DEF", "DST"}
FLEX_POSITIONS = {"RB", "WR", "TE"}

CPU_PERSONALITIES = [
    {"name": "Balanced", "desc": "Builds a complete roster, takes falling value, and rarely forces a position."},
    {"name": "Zero RB", "desc": "Leans WR/TE early, then attacks RB volume and upside in the middle rounds."},
    {"name": "Hero RB", "desc": "Targets one early anchor RB, then builds WR strength before returning to RB depth."},
    {"name": "RB Bully", "desc": "Aggressively builds an early RB advantage, but still respects ADP and roster balance."},
    {"name": "WR Avalanche", "desc": "Builds a deep WR room early and is comfortable piecing together RB later."},
    {"name": "WR Anchor", "desc": "Prioritizes one or two high-end receivers, then drafts a balanced roster around them."},
    {"name": "Late QB", "desc": "Waits on quarterback and spends early capital on RB/WR depth unless extreme value falls."},
    {"name": "Elite QB Value", "desc": "Shops for a top quarterback in Rounds 3–6, but will not force one above market."},
    {"name": "TE Advantage", "desc": "Will pay for a difference-making tight end in the early-middle rounds, then avoids TE hoarding."},
    {"name": "Upside Hunter", "desc": "Breaks close decisions toward ceiling and volatility, especially on bench picks."},
    {"name": "Safe Floor", "desc": "Prefers reliable weekly production and lower-volatility players when values are close."},
    {"name": "ADP Value", "desc": "Stays disciplined to the market and aggressively takes players who slide past ADP."},
    {"name": "Depth Builder", "desc": "Fills starters sensibly, then piles up useful RB/WR depth instead of backup onesie positions."},
]

CPU_TEAM_NAMES = [
    "Fourth & Long", "Gridiron Goblins", "Sunday Scaries", "Red Zone Rebels", "Waiver Wolves",
    "Goal Line Bandits", "Bye Week Blues", "Touchdown Dept", "Two Minute Drill", "Bench Mob",
    "End Zone Empire", "The Audible", "Pocket Presence", "Monday Miracles", "First Down Club",
    "Sunday Syndicate",
]


def cpu_personality_names() -> List[str]:
    return [p["name"] for p in CPU_PERSONALITIES]


def cpu_personality_description(name: str) -> str:
    return next((p["desc"] for p in CPU_PERSONALITIES if p["name"] == name), "Strategic fantasy manager.")


def cpu_team_name(team_index: int) -> str:
    return CPU_TEAM_NAMES[int(team_index) % len(CPU_TEAM_NAMES)]


def default_settings() -> dict:
    return {
        "season": 2026,
        "league_name": "Fantasy GM League",
        "teams": 12,
        "user_team_index": 0,
        "draft_slot": 7,
        "scoring": "PPR",
        "faab_budget": 100,
        "regular_season_weeks": 14,
        "playoff_teams": 6,
        "roster": {"QB": 1, "RB": 2, "WR": 2, "TE": 1, "FLEX": 2, "K": 0, "DEF": 0, "BENCH": 6},
    }


def normalize_player_df(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    rename = {
        "full_name": "name", "fantasy_points": "projected_points", "projection": "projected_points",
        "rank": "adp", "overall_rank": "adp", "pos": "position", "bye": "bye_week",
    }
    out = out.rename(columns={k: v for k, v in rename.items() if k in out.columns})
    required = ["name", "position", "projected_points"]
    missing = [c for c in required if c not in out.columns]
    if missing:
        raise ValueError(f"Missing required columns: {', '.join(missing)}")
    if "player_id" not in out.columns:
        out["player_id"] = [f"custom_{i}" for i in range(len(out))]
    if "team" not in out.columns:
        out["team"] = "FA"
    if "adp" not in out.columns:
        out["adp"] = np.arange(1, len(out) + 1)
    if "ceiling" not in out.columns:
        out["ceiling"] = out["projected_points"] * 1.22
    if "floor" not in out.columns:
        out["floor"] = out["projected_points"] * 0.72
    if "volatility" not in out.columns:
        out["volatility"] = out["position"].map({"QB": .15, "RB": .24, "WR": .26, "TE": .25, "K": .19, "DEF": .25}).fillna(.22)
    if "bye_week" not in out.columns:
        out["bye_week"] = 0
    if "injury_risk" not in out.columns:
        out["injury_risk"] = out["position"].map({"QB": .07, "RB": .17, "WR": .12, "TE": .12, "K": .04, "DEF": .01}).fillna(.10)

    out["position"] = out["position"].astype(str).str.upper().replace({"D/ST": "DEF", "DST": "DEF"})
    out = out[out["position"].isin({"QB", "RB", "WR", "TE", "K", "DEF"})].copy()
    numeric = ["adp", "projected_points", "ceiling", "floor", "volatility", "bye_week", "injury_risk"]
    for col in numeric:
        out[col] = pd.to_numeric(out[col], errors="coerce")
    out["adp"] = out["adp"].fillna(9999)
    out["projected_points"] = out["projected_points"].fillna(0)
    out["ceiling"] = out["ceiling"].fillna(out["projected_points"] * 1.22)
    out["floor"] = out["floor"].fillna(out["projected_points"] * .72)
    out["volatility"] = out["volatility"].fillna(.22).clip(.05, .60)
    out["bye_week"] = out["bye_week"].fillna(0).astype(int)
    out["injury_risk"] = out["injury_risk"].fillna(.10).clip(0, .60)
    out["name"] = out["name"].astype(str)
    out["team"] = out["team"].fillna("FA").astype(str)
    out["player_id"] = out["player_id"].astype(str)
    out = out.sort_values(["adp", "projected_points"], ascending=[True, False]).drop_duplicates("player_id").reset_index(drop=True)
    return out


def generate_demo_projection(points_rank: int, position: str, scoring: str = "PPR") -> float:
    # Purposefully transparent heuristic used only when no projection feed is provided.
    baselines = {"QB": 340, "RB": 290, "WR": 300, "TE": 245, "K": 145, "DEF": 135}
    slopes = {"QB": 3.0, "RB": 2.7, "WR": 2.5, "TE": 2.8, "K": 1.1, "DEF": 1.0}
    base = baselines.get(position, 200)
    slope = slopes.get(position, 2.0)
    pos_rank = max(1, points_rank)
    points = base - slope * (pos_rank - 1)
    if scoring == "Standard" and position in {"RB", "WR", "TE"}:
        points *= .83
    elif scoring == "Half PPR" and position in {"RB", "WR", "TE"}:
        points *= .92
    return round(max(points, 55), 1)


def build_sleeper_projection_df(raw_players: dict, scoring: str = "PPR") -> pd.DataFrame:
    rows = []
    by_pos = {p: [] for p in ["QB", "RB", "WR", "TE", "K", "DEF"]}
    for pid, p in raw_players.items():
        pos = str(p.get("position") or "").upper().replace("DST", "DEF")
        if pos not in by_pos:
            continue
        status = str(p.get("status") or "").lower()
        if status in {"inactive", "retired"}:
            continue
        search_rank = p.get("search_rank")
        try:
            sr = int(search_rank)
        except Exception:
            sr = 999999
        by_pos[pos].append((sr, pid, p))

    keep_counts = {"QB": 45, "RB": 95, "WR": 120, "TE": 55, "K": 35, "DEF": 35}
    for pos, items in by_pos.items():
        items.sort(key=lambda x: x[0])
        for pos_rank, (_, pid, p) in enumerate(items[: keep_counts[pos]], start=1):
            overall_rank = p.get("search_rank")
            try:
                adp = float(overall_rank)
                if adp <= 0 or adp > 10000:
                    raise ValueError
            except Exception:
                positional_offset = {"RB": 0, "WR": 2, "QB": 22, "TE": 28, "K": 180, "DEF": 170}[pos]
                adp = positional_offset + pos_rank * (1.35 if pos in {"RB", "WR"} else 2.4)
            proj = generate_demo_projection(pos_rank, pos, scoring)
            vol = {"QB": .15, "RB": .24, "WR": .26, "TE": .25, "K": .19, "DEF": .25}[pos]
            age = p.get("age")
            try:
                age = float(age)
            except Exception:
                age = 26
            age_risk = max(0, age - 29) * .005
            injury = min(.35, {"QB": .06, "RB": .16, "WR": .11, "TE": .12, "K": .03, "DEF": .01}[pos] + age_risk)
            rows.append({
                "player_id": str(pid),
                "name": p.get("full_name") or p.get("first_name") or f"Player {pid}",
                "team": p.get("team") or "FA",
                "position": pos,
                "adp": round(float(adp), 1),
                "projected_points": proj,
                "ceiling": round(proj * (1 + vol * .95), 1),
                "floor": round(proj * (1 - vol * 1.05), 1),
                "volatility": vol,
                "bye_week": 0,
                "injury_risk": injury,
            })
    return normalize_player_df(pd.DataFrame(rows))


def fallback_player_pool(scoring: str = "PPR") -> pd.DataFrame:
    # Generic fallback keeps the app functional if a live player refresh fails.
    # ADP curves are interleaved by position so the mock behaves like a real draft board.
    rows = []
    counts = {"QB": 36, "RB": 84, "WR": 108, "TE": 48, "K": 28, "DEF": 28}
    for pos, count in counts.items():
        for rank in range(1, count + 1):
            proj = generate_demo_projection(rank, pos, scoring)
            if pos == "RB":
                adp = 1.5 + rank * 2.05
            elif pos == "WR":
                adp = 1.0 + rank * 1.85
            elif pos == "QB":
                adp = 17 + rank * 4.8
            elif pos == "TE":
                adp = 20 + rank * 5.2
            elif pos == "DEF":
                adp = 150 + rank * 2.2
            else:  # K
                adp = 165 + rank * 2.0
            rows.append({
                "player_id": f"demo_{pos}_{rank}", "name": f"Demo {pos} {rank}", "team": "NFL",
                "position": pos, "adp": round(adp, 1), "projected_points": proj,
                "ceiling": proj * 1.22, "floor": proj * .72,
                "volatility": {"QB": .15, "RB": .24, "WR": .26, "TE": .25, "K": .19, "DEF": .25}[pos],
                "bye_week": 0, "injury_risk": {"QB": .07, "RB": .17, "WR": .12, "TE": .12, "K": .04, "DEF": .01}[pos],
            })
    return normalize_player_df(pd.DataFrame(rows))

def slots_for_team(settings: dict) -> List[str]:
    slots = []
    r = settings["roster"]
    for pos in ["QB", "RB", "WR", "TE", "FLEX", "K", "DEF"]:
        slots.extend([pos] * int(r.get(pos, 0)))
    slots.extend(["BENCH"] * int(r.get("BENCH", 0)))
    return slots


def starter_slots(settings: dict) -> List[str]:
    return [s for s in slots_for_team(settings) if s != "BENCH"]


def total_roster_size(settings: dict) -> int:
    return len(slots_for_team(settings))


def snake_pick_order(num_teams: int, rounds: int) -> List[int]:
    order = []
    for rnd in range(rounds):
        round_order = list(range(num_teams))
        if rnd % 2 == 1:
            round_order.reverse()
        order.extend(round_order)
    return order


def make_cpu_managers(num_teams: int, user_idx: int, seed: int = 42, personality_overrides: Optional[dict] = None) -> List[dict]:
    rng = random.Random(seed)
    personality_overrides = personality_overrides or {}
    valid_names = set(cpu_personality_names())
    managers = []
    for i in range(num_teams):
        if i == user_idx:
            managers.append({"team_index": i, "team_name": "My Team", "personality": "User", "desc": "You control this team."})
        else:
            selected = personality_overrides.get(str(i), personality_overrides.get(i))
            if selected not in valid_names:
                selected = rng.choice(CPU_PERSONALITIES)["name"]
            managers.append({
                "team_index": i,
                "team_name": cpu_team_name(i),
                "personality": selected,
                "desc": cpu_personality_description(selected),
            })
    return managers


def new_draft_state(settings: dict, seed: int = 42, personality_overrides: Optional[dict] = None) -> dict:
    user_idx = int(settings["draft_slot"]) - 1
    settings = copy.deepcopy(settings)
    settings["user_team_index"] = user_idx
    teams = int(settings["teams"])
    rounds = total_roster_size(settings)
    return {
        "seed": seed,
        "settings": settings,
        "managers": make_cpu_managers(teams, user_idx, seed, personality_overrides),
        "order": snake_pick_order(teams, rounds),
        "pick_index": 0,
        "picks": [],
        "rosters": {str(i): [] for i in range(teams)},
        "completed": False,
    }


def roster_position_counts(roster_ids: List[str], players: pd.DataFrame) -> Dict[str, int]:
    if not roster_ids:
        return {}
    temp = players[players["player_id"].isin(roster_ids)]
    return temp["position"].value_counts().to_dict()


def position_need_score(position: str, counts: Dict[str, int], settings: dict, round_no: int) -> float:
    r = settings["roster"]
    starters = {
        "QB": int(r.get("QB", 0)),
        "RB": int(r.get("RB", 0)),
        "WR": int(r.get("WR", 0)),
        "TE": int(r.get("TE", 0)),
        "K": int(r.get("K", 0)),
        "DEF": int(r.get("DEF", 0)),
    }
    flex = int(r.get("FLEX", 0))
    current = int(counts.get(position, 0))

    # FLEX makes extra RB/WR/TE useful even after their base starting slots are filled.
    flex_weight = {"RB": .50, "WR": .45, "TE": .05}.get(position, 0)
    target = starters.get(position, 0) + flex * flex_weight
    need = target - current
    score = need * 8.5

    # Sensible 1QB/1TE roster construction: avoid backup onesie positions while premium
    # RB/WR depth is still on the board.
    if position == "QB" and current >= max(1, starters["QB"]) and round_no <= 10:
        score -= 70
    if position == "TE" and current >= max(1, starters["TE"]) and round_no <= 9:
        score -= 48

    # K/DST are end-game picks in normal redraft builds.
    roster_rounds = total_roster_size(settings)
    if position in {"K", "DEF"} and round_no < max(1, roster_rounds - 2):
        score -= 140

    # Don't leave required starters empty forever.
    if position == "QB" and starters["QB"] > 0 and current == 0 and round_no >= 8:
        score += 42
    if position == "TE" and starters["TE"] > 0 and current == 0 and round_no >= 9:
        score += 35
    if position in {"RB", "WR"} and current < starters[position] and round_no >= 5:
        score += 28
    return score


def personality_bonus(personality: str, position: str, round_no: int, player: pd.Series, counts: dict) -> float:
    b = 0.0
    current = int(counts.get(position, 0))
    if personality == "Zero RB":
        if position == "WR" and round_no <= 5:
            b += 11
        if position == "TE" and round_no in {2, 3, 4} and counts.get("TE", 0) == 0:
            b += 4
        if position == "RB" and round_no <= 3:
            b -= 10
        if position == "RB" and round_no >= 5:
            b += 9
    elif personality == "Hero RB":
        if position == "RB" and counts.get("RB", 0) == 0 and round_no <= 2:
            b += 18
        if position == "WR" and counts.get("RB", 0) >= 1 and round_no <= 6:
            b += 8
        if position == "RB" and counts.get("RB", 0) >= 1 and round_no <= 4:
            b -= 5
    elif personality == "RB Bully":
        if position == "RB" and round_no <= 4 and current < 3:
            b += 13
        if position == "WR" and round_no >= 3 and counts.get("WR", 0) < 2:
            b += 4
    elif personality == "WR Avalanche":
        if position == "WR" and round_no <= 5 and current < 4:
            b += 13
        if position == "RB" and round_no <= 2:
            b -= 4
        if position == "RB" and round_no >= 5:
            b += 5
    elif personality == "WR Anchor":
        if position == "WR" and counts.get("WR", 0) < 2 and round_no <= 4:
            b += 11
    elif personality == "Late QB":
        if position == "QB" and round_no <= 6:
            b -= 24
        if position in {"RB", "WR"} and round_no <= 6:
            b += 5
    elif personality == "Elite QB Value":
        if position == "QB" and counts.get("QB", 0) == 0 and 3 <= round_no <= 6:
            b += 12
        if position == "QB" and round_no >= 8:
            b -= 4
    elif personality == "Upside Hunter":
        upside = float(player["ceiling"] - player["projected_points"])
        b += min(10.0, upside * .13)
        if round_no >= 8:
            b += min(5.0, float(player.get("volatility", .22)) * 14)
    elif personality == "Safe Floor":
        volatility = float(player.get("volatility", .22))
        floor_ratio = float(player["floor"]) / max(float(player["projected_points"]), 1.0)
        b += max(-4.0, min(9.0, (floor_ratio - .68) * 34))
        b += max(-3.0, min(5.0, (.25 - volatility) * 22))
    elif personality == "ADP Value":
        b += max(0.0, round_no * 12 - float(player["adp"])) * .10
    elif personality == "TE Advantage":
        if position == "TE" and counts.get("TE", 0) == 0 and 2 <= round_no <= 5:
            b += 12
    elif personality == "Depth Builder":
        if position in {"RB", "WR"} and 5 <= round_no <= 11:
            b += 7
        if position in {"QB", "TE"} and current >= 1:
            b -= 12
    return b


def _strategic_candidate_allowed(position: str, counts: Dict[str, int], settings: dict, round_no: int, personality: str = "Balanced") -> bool:
    """Hard guardrails that keep CPU teams inside normal 1QB redraft strategy."""
    r = settings["roster"]
    roster_rounds = total_roster_size(settings)

    if int(r.get(position, 0)) <= 0 and position not in FLEX_POSITIONS:
        return False

    # The user's requested common-sense rule: no CPU quarterback in Round 1.
    # In standard 1QB builds Round 1 is reserved for RB/WR; TE can enter later.
    if round_no == 1 and position not in {"RB", "WR"}:
        return False

    # No QB before Round 3 in a normal one-QB league.
    if position == "QB" and round_no <= 2:
        return False

    # One QB/TE is enough for most teams. Only a subset of strategic profiles will spend
    # a final-round bench spot on a backup, which prevents every CPU from hoarding QBs.
    if position == "QB" and counts.get("QB", 0) >= max(1, int(r.get("QB", 1))):
        backup_qb_profiles = {"Balanced", "ADP Value", "Elite QB Value"}
        if round_no < max(11, roster_rounds - 1) or personality not in backup_qb_profiles:
            return False
    if position == "TE" and counts.get("TE", 0) >= max(1, int(r.get("TE", 1))):
        backup_te_profiles = {"TE Advantage", "Upside Hunter", "Zero RB"}
        if round_no < max(10, roster_rounds - 2) or personality not in backup_te_profiles:
            return False

    # Kicker and defense belong at the end of the draft, not the middle rounds.
    if position in {"K", "DEF"} and round_no < max(1, roster_rounds - 2):
        return False
    if position in {"K", "DEF"} and counts.get(position, 0) >= int(r.get(position, 0)):
        return False

    # Prevent silly bench hoarding at onesie positions.
    if position == "QB" and counts.get("QB", 0) >= max(2, int(r.get("QB", 1))):
        return False
    if position == "TE" and counts.get("TE", 0) >= max(2, int(r.get("TE", 1)) + 1):
        return False
    return True


def cpu_pick_player(draft: dict, players: pd.DataFrame, team_idx: int) -> str:
    taken = {p["player_id"] for p in draft["picks"]}
    avail = players[~players["player_id"].isin(taken)].copy()
    roster = draft["rosters"][str(team_idx)]
    counts = roster_position_counts(roster, players)
    teams = int(draft["settings"]["teams"])
    round_no = draft["pick_index"] // teams + 1
    overall = draft["pick_index"] + 1
    manager = next(m for m in draft["managers"] if m["team_index"] == team_idx)

    # Evaluate a market-relevant window, then apply hard strategic filters. This preserves
    # ADP realism while still allowing modest reaches for roster construction.
    avail = avail.sort_values(["adp", "projected_points"], ascending=[True, False]).head(60)
    allowed = avail[avail["position"].map(lambda pos: _strategic_candidate_allowed(str(pos), counts, draft["settings"], round_no, manager["personality"]))]
    if not allowed.empty:
        avail = allowed

    rng = random.Random(draft["seed"] + draft["pick_index"] * 997 + team_idx * 37)
    scored = []
    for _, p in avail.iterrows():
        adp = float(p["adp"])
        # Best available remains the foundation. Falling players get rewarded while reaches
        # beyond roughly 1.5 rounds become increasingly expensive.
        market = 165 - adp * .82
        value = max(0.0, overall - adp) * .75
        reach = max(0.0, adp - (overall + teams * 1.5)) * 1.55
        need = position_need_score(str(p["position"]), counts, draft["settings"], round_no)
        pers = personality_bonus(manager["personality"], str(p["position"]), round_no, p, counts)
        noise = rng.gauss(0, 2.4)
        scored.append((market + value - reach + need + pers + noise, str(p["player_id"])))
    scored.sort(reverse=True)
    return scored[0][1]


def record_pick(draft: dict, player_id: str, players: pd.DataFrame) -> None:
    if draft["completed"]:
        return
    if player_id in {p["player_id"] for p in draft["picks"]}:
        raise ValueError("That player has already been drafted.")
    team_idx = draft["order"][draft["pick_index"]]
    row = players.loc[players["player_id"] == player_id]
    if row.empty:
        raise ValueError("Player not found in the current player pool.")
    p = row.iloc[0]
    overall = draft["pick_index"] + 1
    teams = int(draft["settings"]["teams"])
    round_no = (overall - 1) // teams + 1
    pick_in_round = (overall - 1) % teams + 1
    draft["picks"].append({
        "overall": overall, "round": round_no, "pick_in_round": pick_in_round,
        "team_index": team_idx, "player_id": str(player_id), "name": p["name"], "position": p["position"],
        "team": p["team"], "adp": float(p["adp"]),
    })
    draft["rosters"][str(team_idx)].append(str(player_id))
    draft["pick_index"] += 1
    draft["completed"] = draft["pick_index"] >= len(draft["order"])


def advance_cpu_until_user(draft: dict, players: pd.DataFrame) -> None:
    user_idx = int(draft["settings"]["user_team_index"])
    while not draft["completed"] and draft["order"][draft["pick_index"]] != user_idx:
        team_idx = draft["order"][draft["pick_index"]]
        pid = cpu_pick_player(draft, players, team_idx)
        record_pick(draft, pid, players)


def player_lookup(players: pd.DataFrame) -> Dict[str, dict]:
    return {str(r["player_id"]): r.to_dict() for _, r in players.iterrows()}


def auto_lineup(roster_ids: List[str], players: pd.DataFrame, settings: dict, unavailable: Optional[set] = None) -> dict:
    unavailable = unavailable or set()
    pool = players[players["player_id"].isin(roster_ids) & ~players["player_id"].isin(unavailable)].copy()
    pool = pool.sort_values("projected_points", ascending=False)
    used = set()
    lineup = {}
    slot_counts = {}
    for slot in starter_slots(settings):
        slot_counts[slot] = slot_counts.get(slot, 0) + 1
        key = f"{slot}{slot_counts[slot]}"
        eligible = FLEX_POSITIONS if slot == "FLEX" else {slot}
        candidates = pool[pool["position"].isin(eligible) & ~pool["player_id"].isin(used)]
        if candidates.empty:
            lineup[key] = None
        else:
            pid = str(candidates.iloc[0]["player_id"])
            lineup[key] = pid
            used.add(pid)
    lineup["BENCH"] = [pid for pid in roster_ids if pid not in used]
    return lineup


def lineup_projection(lineup: dict, players: pd.DataFrame) -> float:
    lookup = player_lookup(players)
    total = 0.0
    for slot, pid in lineup.items():
        if slot == "BENCH" or not pid:
            continue
        total += float(lookup.get(str(pid), {}).get("projected_points", 0)) / 17.0
    return round(total, 2)


def initial_season_state(draft: dict, players: pd.DataFrame) -> dict:
    teams = int(draft["settings"]["teams"])
    faab = int(draft["settings"].get("faab_budget", 100))
    rosters = copy.deepcopy(draft["rosters"])
    standings = {str(i): {"wins": 0, "losses": 0, "ties": 0, "pf": 0.0, "pa": 0.0} for i in range(teams)}
    return {
        "week": 0,
        "rosters": rosters,
        "standings": standings,
        "faab": {str(i): faab for i in range(teams)},
        "injuries": {},
        "weekly_scores": {},
        "weekly_player_points": {},
        "transactions": [],
        "hot_ids": [],
        "champion": None,
        "playoff_bracket": {},
        "manual_lineup": {},
    }


def round_robin_pairs(num_teams: int, week: int) -> List[Tuple[int, int]]:
    teams = list(range(num_teams))
    if num_teams % 2:
        teams.append(-1)
    n = len(teams)
    rotations = n - 1
    w = (week - 1) % rotations
    arr = teams[:1] + teams[1:]
    for _ in range(w):
        arr = [arr[0]] + [arr[-1]] + arr[1:-1]
    pairs = []
    for i in range(n // 2):
        a, b = arr[i], arr[n - 1 - i]
        if a != -1 and b != -1:
            pairs.append((a, b))
    return pairs


def simulate_player_week(row: dict, week: int, rng: np.random.Generator, injured: bool = False) -> float:
    if injured:
        return 0.0
    if int(row.get("bye_week") or 0) == week:
        return 0.0
    mean = float(row.get("projected_points", 0)) / 17.0
    vol = float(row.get("volatility", .22))
    matchup = float(rng.normal(1.0, .09))
    usage = float(rng.normal(1.0, vol * .42))
    big_play = 1.0
    if rng.random() < max(.03, vol * .16):
        big_play += rng.uniform(.28, .85)
    dud = 1.0
    if rng.random() < max(.04, vol * .18):
        dud *= rng.uniform(.25, .65)
    return round(max(0.0, mean * matchup * usage * big_play * dud), 2)


def _decrement_injuries(season: dict) -> None:
    to_remove = []
    for pid, weeks in list(season["injuries"].items()):
        weeks = int(weeks) - 1
        if weeks <= 0:
            to_remove.append(pid)
        else:
            season["injuries"][pid] = weeks
    for pid in to_remove:
        del season["injuries"][pid]


def simulate_week(season: dict, draft: dict, players: pd.DataFrame, seed: int = 2026) -> dict:
    settings = draft["settings"]
    teams = int(settings["teams"])
    week = int(season["week"]) + 1
    reg_weeks = int(settings.get("regular_season_weeks", 14))
    if season.get("champion") is not None:
        return {"error": "Season is complete."}
    if week > min(18, reg_weeks + 3):
        return {"error": "Season is complete."}

    _decrement_injuries(season)
    lookup = player_lookup(players)
    rng = np.random.default_rng(seed + week * 1117 + len(season["transactions"]) * 13)

    # Lock lineups BEFORE outcomes are generated. CPUs use projections plus known injuries/byes.
    lineups = {}
    user_idx = int(settings.get("user_team_index", 0))
    bye_ids = {pid for pid, row in lookup.items() if int(row.get("bye_week") or 0) == week}
    unavailable = set(season["injuries"].keys()) | bye_ids
    manual_user = season.get("manual_lineup", {}).get(str(user_idx))

    for i in range(teams):
        roster = season["rosters"][str(i)]
        if i == user_idx and manual_user:
            # Accept a saved manual lineup only when each starter is unique and still on the roster.
            starter_pids = [pid for pid in manual_user.values() if pid]
            valid = len(starter_pids) == len(set(starter_pids)) and all(pid in roster for pid in starter_pids)
            if valid:
                used = set(starter_pids)
                lineup = dict(manual_user)
                lineup["BENCH"] = [pid for pid in roster if pid not in used]
            else:
                lineup = auto_lineup(roster, players, settings, unavailable=unavailable)
        else:
            lineup = auto_lineup(roster, players, settings, unavailable=unavailable)
        lineups[str(i)] = lineup

    all_points = {}
    for pid, row in lookup.items():
        if row["position"] not in FANTASY_POSITIONS:
            continue
        injured = pid in season["injuries"]
        all_points[pid] = simulate_player_week(row, week, rng, injured)

    team_scores = {}
    for i in range(teams):
        score = 0.0
        for slot, pid in lineups[str(i)].items():
            if slot == "BENCH" or not pid:
                continue
            score += all_points.get(pid, 0.0)
        team_scores[str(i)] = round(score, 2)

    # New injuries happen after this week's games and affect future lineup decisions.
    drafted = {pid for roster in season["rosters"].values() for pid in roster}
    new_injuries = []
    for pid in drafted:
        if pid in season["injuries"] or pid not in lookup:
            continue
        annual_risk = float(lookup[pid].get("injury_risk", .10))
        if rng.random() < annual_risk / 17.0:
            weeks_out = int(rng.choice([1, 1, 2, 2, 3, 4, 6], p=[.22, .18, .20, .14, .12, .09, .05]))
            season["injuries"][pid] = weeks_out
            new_injuries.append({"player_id": pid, "name": lookup[pid]["name"], "weeks": weeks_out})

    results = []
    if week <= reg_weeks:
        pairs = round_robin_pairs(teams, week)
        for a, b in pairs:
            sa, sb = team_scores[str(a)], team_scores[str(b)]
            season["standings"][str(a)]["pf"] += sa
            season["standings"][str(a)]["pa"] += sb
            season["standings"][str(b)]["pf"] += sb
            season["standings"][str(b)]["pa"] += sa
            if sa > sb:
                season["standings"][str(a)]["wins"] += 1
                season["standings"][str(b)]["losses"] += 1
                winner = a
            elif sb > sa:
                season["standings"][str(b)]["wins"] += 1
                season["standings"][str(a)]["losses"] += 1
                winner = b
            else:
                season["standings"][str(a)]["ties"] += 1
                season["standings"][str(b)]["ties"] += 1
                # Fantasy playoffs cannot tie; regular season can.
                winner = None
            results.append({"team_a": a, "score_a": sa, "team_b": b, "score_b": sb, "winner": winner, "playoff_stage": None})
    else:
        # Seed and advance a 4-, 6-, or 8-team playoff bracket.
        bracket = season.setdefault("playoff_bracket", {})
        playoff_teams = int(settings.get("playoff_teams", 6))
        playoff_teams = min(playoff_teams, teams)

        if not bracket.get("seeds"):
            standings = sorted(
                [(i, season["standings"][str(i)]["wins"], season["standings"][str(i)]["pf"]) for i in range(teams)],
                key=lambda x: (x[1], x[2]), reverse=True,
            )
            bracket["seeds"] = [i for i, _, _ in standings[:playoff_teams]]
            bracket["seed_number"] = {str(team): rank + 1 for rank, team in enumerate(bracket["seeds"])}
            bracket["round_winners"] = {}

        seeds = bracket["seeds"]
        offset = week - reg_weeks
        matchups = []
        stage = "Playoffs"

        if playoff_teams == 4:
            if offset == 1:
                stage = "Semifinal"
                matchups = [(seeds[0], seeds[3]), (seeds[1], seeds[2])]
            elif offset == 2:
                stage = "Championship"
                prev = bracket["round_winners"].get(str(offset - 1), [])
                if len(prev) == 2:
                    matchups = [(prev[0], prev[1])]
        elif playoff_teams == 8:
            if offset == 1:
                stage = "Quarterfinal"
                matchups = [(seeds[0], seeds[7]), (seeds[1], seeds[6]), (seeds[2], seeds[5]), (seeds[3], seeds[4])]
            elif offset == 2:
                stage = "Semifinal"
                prev = bracket["round_winners"].get(str(offset - 1), [])
                if len(prev) == 4:
                    matchups = [(prev[0], prev[3]), (prev[1], prev[2])]
            elif offset == 3:
                stage = "Championship"
                prev = bracket["round_winners"].get(str(offset - 1), [])
                if len(prev) == 2:
                    matchups = [(prev[0], prev[1])]
        else:  # default 6-team bracket
            if offset == 1:
                stage = "Wild Card"
                matchups = [(seeds[2], seeds[5]), (seeds[3], seeds[4])]
            elif offset == 2:
                stage = "Semifinal"
                prev = bracket["round_winners"].get(str(offset - 1), [])
                if len(prev) == 2:
                    # Higher seed #1 faces the lowest remaining seed.
                    seed_num = bracket["seed_number"]
                    low_remaining = max(prev, key=lambda t: seed_num[str(t)])
                    other = prev[0] if prev[1] == low_remaining else prev[1]
                    matchups = [(seeds[0], low_remaining), (seeds[1], other)]
            elif offset == 3:
                stage = "Championship"
                prev = bracket["round_winners"].get(str(offset - 1), [])
                if len(prev) == 2:
                    matchups = [(prev[0], prev[1])]

        winners = []
        for a, b in matchups:
            sa, sb = team_scores[str(a)], team_scores[str(b)]
            if sa == sb:
                # Deterministic fractional tiebreaker using season points-for.
                if season["standings"][str(a)]["pf"] >= season["standings"][str(b)]["pf"]:
                    sa = round(sa + .01, 2)
                else:
                    sb = round(sb + .01, 2)
            winner = a if sa > sb else b
            winners.append(winner)
            results.append({"team_a": a, "score_a": sa, "team_b": b, "score_b": sb, "winner": winner, "playoff_stage": stage})
        bracket["round_winners"][str(offset)] = winners
        bracket["last_stage"] = stage
        if stage == "Championship" and len(winners) == 1:
            season["champion"] = winners[0]

    # Identify breakout free agents from this simulated week.
    rostered = {pid for roster in season["rosters"].values() for pid in roster}
    fa = [(pts, pid) for pid, pts in all_points.items() if pid not in rostered and lookup.get(pid, {}).get("position") in {"RB", "WR", "TE", "QB"}]
    fa.sort(reverse=True)
    hot = [pid for pts, pid in fa[:12] if pts >= 8]
    season["hot_ids"] = hot
    season["week"] = week
    season["weekly_scores"][str(week)] = team_scores
    season["weekly_player_points"][str(week)] = all_points

    return {"week": week, "results": results, "team_scores": team_scores, "new_injuries": new_injuries, "hot_ids": hot, "lineups": lineups,
            "champion": season.get("champion")}

def standings_frame(season: dict, draft: dict) -> pd.DataFrame:
    names = {m["team_index"]: m["team_name"] for m in draft["managers"]}
    rows = []
    for idx, s in season["standings"].items():
        i = int(idx)
        rows.append({"Team": names.get(i, f"Team {i+1}"), "W": s["wins"], "L": s["losses"], "T": s["ties"],
                     "PF": round(s["pf"], 1), "PA": round(s["pa"], 1), "Diff": round(s["pf"] - s["pa"], 1), "team_index": i})
    df = pd.DataFrame(rows)
    return df.sort_values(["W", "PF"], ascending=[False, False]).reset_index(drop=True)


def free_agents(season: dict, players: pd.DataFrame) -> pd.DataFrame:
    rostered = {pid for roster in season["rosters"].values() for pid in roster}
    fa = players[~players["player_id"].isin(rostered)].copy()
    if season.get("week", 0) > 0:
        recent = season.get("weekly_player_points", {}).get(str(season["week"]), {})
        fa["last_week"] = fa["player_id"].map(recent).fillna(0)
    else:
        fa["last_week"] = 0.0
    hot = set(season.get("hot_ids", []))
    fa["trending"] = fa["player_id"].isin(hot)
    fa["waiver_score"] = fa["projected_points"] / 17 * .75 + fa["last_week"] * .85 + fa["trending"].astype(int) * 6
    return fa.sort_values(["waiver_score", "projected_points"], ascending=False)


def suggested_faab(player: pd.Series, season: dict) -> Tuple[int, int]:
    score = float(player.get("waiver_score", 0))
    remaining_factor = max(.5, 1 - season.get("week", 0) / 26)
    midpoint = min(45, max(1, int(score * 1.35 * remaining_factor)))
    return max(0, midpoint - 4), min(100, midpoint + 5)


def process_user_waiver(season: dict, draft: dict, players: pd.DataFrame, add_id: str, drop_id: Optional[str], bid: int, seed: int = 7) -> dict:
    user_idx = int(draft["settings"]["user_team_index"])
    budget = season["faab"][str(user_idx)]
    bid = int(min(bid, budget))
    if add_id in {pid for roster in season["rosters"].values() for pid in roster}:
        return {"won": False, "message": "That player is no longer available."}
    row = players.loc[players["player_id"] == add_id].iloc[0]
    low, high = suggested_faab(row, season)
    rng = random.Random(seed + season.get("week", 0) * 101 + hash(add_id) % 10000)
    cpu_bids = []
    for i in range(int(draft["settings"]["teams"])):
        if i == user_idx:
            continue
        interest = rng.random()
        if interest < .38:
            max_budget = season["faab"][str(i)]
            cpu_bid = min(max_budget, max(0, int(rng.gauss((low + high) / 2, max(2, (high - low) / 2)))))
            cpu_bids.append((cpu_bid, i))
    winning_cpu = max(cpu_bids, default=(-1, -1))
    if bid >= winning_cpu[0]:
        roster = season["rosters"][str(user_idx)]
        if drop_id and drop_id in roster:
            roster.remove(drop_id)
        roster.append(add_id)
        season["faab"][str(user_idx)] -= bid
        season["transactions"].append({"week": season.get("week", 0), "type": "waiver", "team": user_idx, "add": add_id, "drop": drop_id, "faab": bid})
        return {"won": True, "message": f"Claim won for ${bid}. Highest CPU bid: ${max(-1, winning_cpu[0])}."}
    cpu_bid, cpu_idx = winning_cpu
    cpu_roster = season["rosters"][str(cpu_idx)]
    # CPU drops its lowest projected bench-like asset at same position or overall lowest.
    cpu_df = players[players["player_id"].isin(cpu_roster)].sort_values("projected_points")
    drop_candidates = cpu_df[cpu_df["position"] == row["position"]]
    drop_pid = str((drop_candidates.iloc[0] if not drop_candidates.empty else cpu_df.iloc[0])["player_id"])
    cpu_roster.remove(drop_pid)
    cpu_roster.append(add_id)
    season["faab"][str(cpu_idx)] -= cpu_bid
    season["transactions"].append({"week": season.get("week", 0), "type": "waiver", "team": cpu_idx, "add": add_id, "drop": drop_pid, "faab": cpu_bid})
    return {"won": False, "message": f"Claim lost. CPU Team {cpu_idx + 1} bid ${cpu_bid}; you bid ${bid}."}



def process_cpu_waiver_night(season: dict, draft: dict, players: pd.DataFrame, max_moves: int = 3, seed: int = 99) -> List[dict]:
    """Let CPU managers make independent post-week waiver moves.

    Intended to run after the user has had a chance to submit a claim. CPU teams prefer
    trending/high waiver-score players, spend FAAB, and usually cut a bench player.
    """
    if season.get("week", 0) <= 0:
        return []
    settings = draft["settings"]
    user_idx = int(settings["user_team_index"])
    rng = random.Random(seed + int(season["week"]) * 313 + len(season.get("transactions", [])) * 17)
    moves = []

    for _ in range(max_moves * 3):
        if len(moves) >= max_moves:
            break
        fa = free_agents(season, players)
        if fa.empty:
            break
        candidates = fa.head(24)
        cpu_choices = [i for i in range(int(settings["teams"])) if i != user_idx and season["faab"][str(i)] >= 0]
        if not cpu_choices:
            break
        team_idx = rng.choice(cpu_choices)
        roster = season["rosters"][str(team_idx)]
        roster_df = players[players["player_id"].isin(roster)].copy()
        if roster_df.empty:
            continue

        # Prefer a candidate at a position where the team's weakest asset is vulnerable.
        weakest_by_pos = roster_df.sort_values("projected_points").groupby("position", as_index=False).first()
        weak_positions = weakest_by_pos.sort_values("projected_points").head(3)["position"].tolist()
        preferred = candidates[candidates["position"].isin(weak_positions)]
        cand = (preferred.iloc[0] if not preferred.empty else candidates.iloc[0])
        add_id = str(cand["player_id"])

        current_lineup = auto_lineup(roster, players, settings)
        bench_ids = current_lineup.get("BENCH", [])
        bench_df = roster_df[roster_df["player_id"].isin(bench_ids)].copy()
        same_pos = bench_df[bench_df["position"] == cand["position"]].sort_values("projected_points")
        if not same_pos.empty:
            drop = same_pos.iloc[0]
        elif not bench_df.empty:
            drop = bench_df.sort_values("projected_points").iloc[0]
        else:
            drop = roster_df.sort_values("projected_points").iloc[0]
        drop_id = str(drop["player_id"])

        # Don't churn for a player who isn't meaningfully better than the cut.
        if float(cand["projected_points"]) < float(drop["projected_points"]) * .92 and not bool(cand.get("trending", False)):
            continue
        low, high = suggested_faab(cand, season)
        budget = int(season["faab"][str(team_idx)])
        bid = min(budget, max(0, int(rng.gauss((low + high) / 2, max(1, (high - low) / 2)))))
        roster.remove(drop_id)
        roster.append(add_id)
        season["faab"][str(team_idx)] -= bid
        move = {"week": season["week"], "type": "cpu_waiver", "team": team_idx, "add": add_id, "drop": drop_id, "faab": bid}
        season["transactions"].append(move)
        moves.append(move)
    return moves

def trade_value(row: pd.Series) -> float:
    pos_mult = {"QB": .72, "RB": 1.06, "WR": 1.0, "TE": .94, "K": .25, "DEF": .25}.get(row["position"], .8)
    season_pts = float(row["projected_points"])
    upside = max(0.0, float(row["ceiling"]) - season_pts)
    market = max(0.0, 120 - float(row["adp"]) * .62)
    raw = season_pts * .22 * pos_mult + upside * .08 + market * .62
    return round(raw, 1)


def package_value(player_ids: List[str], players: pd.DataFrame) -> float:
    if not player_ids:
        return 0.0
    temp = players[players["player_id"].isin(player_ids)]
    vals = sorted([trade_value(r) for _, r in temp.iterrows()], reverse=True)
    # Consolidation premium: the best player in a package matters more.
    weights = [1.0, .82, .68, .55]
    return round(sum(v * weights[min(i, len(weights) - 1)] for i, v in enumerate(vals)), 1)


def team_weekly_strength(roster_ids: List[str], players: pd.DataFrame, settings: dict) -> float:
    return lineup_projection(auto_lineup(roster_ids, players, settings), players)


def trade_evaluation(give_ids: List[str], get_ids: List[str], players: pd.DataFrame,
                     your_roster: Optional[List[str]] = None, their_roster: Optional[List[str]] = None,
                     settings: Optional[dict] = None) -> dict:
    give = package_value(give_ids, players)
    get = package_value(get_ids, players)
    avg = max(1.0, (give + get) / 2)
    fairness = max(0, 100 - abs(give - get) / avg * 100)
    result = {"give_value": give, "get_value": get, "fairness": round(fairness, 1), "value_delta": round(get - give, 1)}
    if settings and your_roster is not None and their_roster is not None:
        your_before = team_weekly_strength(your_roster, players, settings)
        their_before = team_weekly_strength(their_roster, players, settings)
        new_you = [p for p in your_roster if p not in give_ids] + list(get_ids)
        new_them = [p for p in their_roster if p not in get_ids] + list(give_ids)
        your_after = team_weekly_strength(new_you, players, settings)
        their_after = team_weekly_strength(new_them, players, settings)
        yi = your_after - your_before
        ti = their_after - their_before
        acceptance = fairness * .55 + min(25, max(-25, ti * 8)) + 15
        if ti < -1.5:
            acceptance -= 20
        result.update({
            "your_before": your_before, "your_after": your_after, "your_improvement": round(yi, 2),
            "their_before": their_before, "their_after": their_after, "their_improvement": round(ti, 2),
            "acceptance": round(max(2, min(96, acceptance)), 1),
        })
    return result


def roster_needs(roster_ids: List[str], players: pd.DataFrame, settings: dict) -> List[Tuple[str, float]]:
    counts = roster_position_counts(roster_ids, players)
    r = settings["roster"]
    targets = {"QB": r.get("QB", 0) + .5, "RB": r.get("RB", 0) + r.get("FLEX", 0) * .55 + 1,
               "WR": r.get("WR", 0) + r.get("FLEX", 0) * .55 + 1, "TE": r.get("TE", 0) + .7}
    needs = []
    for p, t in targets.items():
        needs.append((p, round(t - counts.get(p, 0), 2)))
    return sorted(needs, key=lambda x: x[1], reverse=True)


def find_trades(user_idx: int, season: dict, draft: dict, players: pd.DataFrame, max_results: int = 12) -> List[dict]:
    settings = draft["settings"]
    user_roster = season["rosters"][str(user_idx)]
    pmap = player_lookup(players)
    managers = {m["team_index"]: m for m in draft["managers"]}

    def fast_strength(roster_ids: List[str]) -> float:
        by_pos = {"QB": [], "RB": [], "WR": [], "TE": [], "K": [], "DEF": []}
        for pid in roster_ids:
            p = pmap.get(str(pid))
            if p and p["position"] in by_pos:
                by_pos[p["position"]].append((float(p["projected_points"]), str(pid)))
        for pos in by_pos:
            by_pos[pos].sort(reverse=True)
        used = set()
        total = 0.0
        r = settings["roster"]
        for pos in ["QB", "RB", "WR", "TE", "K", "DEF"]:
            for pts, pid in by_pos[pos][: int(r.get(pos, 0))]:
                used.add(pid)
                total += pts / 17.0
        flex_pool = []
        for pos in ["RB", "WR", "TE"]:
            for pts, pid in by_pos[pos]:
                if pid not in used:
                    flex_pool.append((pts, pid))
        flex_pool.sort(reverse=True)
        for pts, pid in flex_pool[: int(r.get("FLEX", 0))]:
            total += pts / 17.0
        return total

    baseline = {i: fast_strength(season["rosters"][str(i)]) for i in range(int(settings["teams"]))}
    user_needs = [p for p, score in roster_needs(user_roster, players, settings) if score > .35]
    user_df = players[players["player_id"].isin(user_roster)].copy()
    user_df["tv"] = user_df.apply(trade_value, axis=1)
    results = []

    for other_idx in range(int(settings["teams"])):
        if other_idx == user_idx:
            continue
        other_roster = season["rosters"][str(other_idx)]
        their_needs = [p for p, score in roster_needs(other_roster, players, settings) if score > .35]
        other_df = players[players["player_id"].isin(other_roster)].copy()
        other_df["tv"] = other_df.apply(trade_value, axis=1)

        # Keep candidate windows intentionally tight: starters + strong flex assets.
        your_candidates = user_df.sort_values("tv", ascending=False).head(7)
        their_candidates = other_df.sort_values("tv", ascending=False).head(7)

        for _, give in your_candidates.iterrows():
            for _, get in their_candidates.iterrows():
                if user_needs and get["position"] not in user_needs[:3]:
                    continue
                if their_needs and give["position"] not in their_needs[:3]:
                    continue
                raw = trade_evaluation([give["player_id"]], [get["player_id"]], players)
                if raw["fairness"] < 70:
                    continue
                new_you = [p for p in user_roster if p != give["player_id"]] + [str(get["player_id"])]
                new_them = [p for p in other_roster if p != get["player_id"]] + [str(give["player_id"])]
                yi = fast_strength(new_you) - baseline[user_idx]
                ti = fast_strength(new_them) - baseline[other_idx]
                acceptance = raw["fairness"] * .55 + min(24, max(-24, ti * 9)) + 15
                if ti < -1.25:
                    acceptance -= 18
                acceptance = max(2, min(96, acceptance))
                score = raw["fairness"] + yi * 10 + ti * 8 + acceptance * .25
                if yi > -.45 and ti > -1.1:
                    results.append({
                        "partner_index": other_idx, "partner": managers[other_idx]["team_name"],
                        "give_ids": [str(give["player_id"])], "get_ids": [str(get["player_id"])],
                        "give": give["name"], "get": get["name"],
                        **raw, "your_improvement": round(yi, 2), "their_improvement": round(ti, 2),
                        "acceptance": round(acceptance, 1), "score": score,
                        "reason": f"You add {get['position']} help; {managers[other_idx]['team_name']} gets {give['position']} value."
                    })

        # A few 2-for-1 consolidation possibilities per trade partner.
        your_mid = user_df.sort_values("tv", ascending=False).iloc[2:7].reset_index(drop=True)
        their_elite = other_df.sort_values("tv", ascending=False).head(4)
        pairs = []
        for ai in range(len(your_mid)):
            for bi in range(ai + 1, len(your_mid)):
                pairs.append((your_mid.iloc[ai], your_mid.iloc[bi]))
        for g1, g2 in pairs[:6]:
            for _, get in their_elite.iterrows():
                raw = trade_evaluation([g1["player_id"], g2["player_id"]], [get["player_id"]], players)
                if raw["fairness"] < 74:
                    continue
                new_you = [p for p in user_roster if p not in {g1["player_id"], g2["player_id"]}] + [str(get["player_id"])]
                new_them = [p for p in other_roster if p != get["player_id"]] + [str(g1["player_id"]), str(g2["player_id"])]
                yi = fast_strength(new_you) - baseline[user_idx]
                ti = fast_strength(new_them) - baseline[other_idx]
                acceptance = raw["fairness"] * .55 + min(24, max(-24, ti * 9)) + 15
                if ti < -1.25:
                    acceptance -= 18
                acceptance = max(2, min(96, acceptance))
                score = raw["fairness"] + yi * 9 + ti * 7 + acceptance * .22
                if yi > -.35 and ti > -1.0:
                    results.append({
                        "partner_index": other_idx, "partner": managers[other_idx]["team_name"],
                        "give_ids": [str(g1["player_id"]), str(g2["player_id"])], "get_ids": [str(get["player_id"])],
                        "give": f"{g1['name']} + {g2['name']}", "get": get["name"],
                        **raw, "your_improvement": round(yi, 2), "their_improvement": round(ti, 2),
                        "acceptance": round(acceptance, 1), "score": score,
                        "reason": "You consolidate two assets into one starter while the other roster gains useful depth."
                    })

    # If two well-built rosters have no obvious positional holes, still return a few
    # realistic value-neutral swaps instead of an empty trade finder. These are held to
    # stricter fairness thresholds and may only slightly change either starting lineup.
    if not results:
        for other_idx in range(int(settings["teams"])):
            if other_idx == user_idx:
                continue
            other_roster = season["rosters"][str(other_idx)]
            other_df = players[players["player_id"].isin(other_roster)].copy()
            other_df["tv"] = other_df.apply(trade_value, axis=1)
            your_candidates = user_df.sort_values("tv", ascending=False).head(6)
            their_candidates = other_df.sort_values("tv", ascending=False).head(6)
            for _, give in your_candidates.iterrows():
                for _, get in their_candidates.iterrows():
                    if give["position"] == get["position"] and abs(float(give["tv"]) - float(get["tv"])) < 1.0:
                        continue
                    raw = trade_evaluation([give["player_id"]], [get["player_id"]], players)
                    if raw["fairness"] < 78:
                        continue
                    new_you = [p for p in user_roster if p != give["player_id"]] + [str(get["player_id"])]
                    new_them = [p for p in other_roster if p != get["player_id"]] + [str(give["player_id"])]
                    yi = fast_strength(new_you) - baseline[user_idx]
                    ti = fast_strength(new_them) - baseline[other_idx]
                    if yi < -.75 or ti < -.75:
                        continue
                    acceptance = max(5, min(92, raw["fairness"] * .60 + min(18, max(-18, ti * 8)) + 10))
                    results.append({
                        "partner_index": other_idx, "partner": managers[other_idx]["team_name"],
                        "give_ids": [str(give["player_id"])], "get_ids": [str(get["player_id"])],
                        "give": give["name"], "get": get["name"],
                        **raw, "your_improvement": round(yi, 2), "their_improvement": round(ti, 2),
                        "acceptance": round(acceptance, 1),
                        "score": raw["fairness"] + yi * 7 + ti * 7 + acceptance * .20,
                        "reason": "Both rosters are balanced, so this is a market-value swap with limited downside for either side."
                    })
                    if len(results) >= max_results * 2:
                        break
                if len(results) >= max_results * 2:
                    break
            if len(results) >= max_results * 2:
                break

    seen = set()
    unique = []
    for r in sorted(results, key=lambda x: x["score"], reverse=True):
        key = (tuple(sorted(r["give_ids"])), tuple(sorted(r["get_ids"])), r["partner_index"])
        if key in seen:
            continue
        unique.append(r)
        seen.add(key)
        if len(unique) >= max_results:
            break
    return unique

def execute_trade(season: dict, team_a: int, give_ids: List[str], team_b: int, get_ids: List[str]) -> None:
    a = season["rosters"][str(team_a)]
    b = season["rosters"][str(team_b)]
    for pid in give_ids:
        if pid not in a:
            raise ValueError("A player in the offer is no longer on your roster.")
    for pid in get_ids:
        if pid not in b:
            raise ValueError("A requested player is no longer on the other roster.")
    for pid in give_ids:
        a.remove(pid)
        b.append(pid)
    for pid in get_ids:
        b.remove(pid)
        a.append(pid)
    season["transactions"].append({"week": season.get("week", 0), "type": "trade", "team_a": team_a, "team_b": team_b,
                                   "give": list(give_ids), "get": list(get_ids)})


def compare_players(a: pd.Series, b: pd.Series) -> dict:
    metrics = {
        "Projection": (float(a["projected_points"]), float(b["projected_points"]), "high"),
        "Ceiling": (float(a["ceiling"]), float(b["ceiling"]), "high"),
        "Floor": (float(a["floor"]), float(b["floor"]), "high"),
        "ADP": (float(a["adp"]), float(b["adp"]), "low"),
        "Volatility": (float(a["volatility"]), float(b["volatility"]), "low"),
        "Injury risk": (float(a["injury_risk"]), float(b["injury_risk"]), "low"),
        "Trade value": (trade_value(a), trade_value(b), "high"),
    }
    a_score = 0
    b_score = 0
    for _, (av, bv, direction) in metrics.items():
        if abs(av - bv) < 1e-8:
            continue
        if (direction == "high" and av > bv) or (direction == "low" and av < bv):
            a_score += 1
        else:
            b_score += 1
    winner = a["name"] if a_score >= b_score else b["name"]
    confidence = round(50 + min(42, abs(a_score - b_score) * 7), 0)
    return {"metrics": metrics, "winner": winner, "a_score": a_score, "b_score": b_score, "confidence": confidence}


def monte_carlo_roster(roster_ids: List[str], players: pd.DataFrame, settings: dict, sims: int = 4000, seed: int = 101) -> dict:
    lineup = auto_lineup(roster_ids, players, settings)
    lookup = player_lookup(players)
    starter_ids = [pid for slot, pid in lineup.items() if slot != "BENCH" and pid]
    rng = np.random.default_rng(seed)
    weekly = np.zeros(sims)
    for pid in starter_ids:
        row = lookup.get(str(pid))
        if not row:
            continue
        mean = float(row["projected_points"]) / 17
        sd = max(1.0, mean * float(row["volatility"]))
        outcomes = rng.normal(mean, sd, sims)
        weekly += np.clip(outcomes, 0, None)
    return {
        "mean": round(float(np.mean(weekly)), 2), "median": round(float(np.median(weekly)), 2),
        "p10": round(float(np.percentile(weekly, 10)), 2), "p90": round(float(np.percentile(weekly, 90)), 2),
        "samples": weekly,
    }


def lab_compare(roster_a: List[str], roster_b: List[str], players: pd.DataFrame, settings: dict, sims: int = 4000) -> dict:
    a = monte_carlo_roster(roster_a, players, settings, sims=sims, seed=211)
    b = monte_carlo_roster(roster_b, players, settings, sims=sims, seed=313)
    # Independent samples are fine here; we're comparing distributions, not paired game states.
    rng = np.random.default_rng(999)
    idx_a = rng.integers(0, len(a["samples"]), sims)
    idx_b = rng.integers(0, len(b["samples"]), sims)
    win_b = float(np.mean(b["samples"][idx_b] > a["samples"][idx_a]))
    return {
        "before": {k: v for k, v in a.items() if k != "samples"},
        "after": {k: v for k, v in b.items() if k != "samples"},
        "after_beats_before": round(win_b * 100, 1),
        "weekly_delta": round(b["mean"] - a["mean"], 2),
    }


def serialize_state(draft: dict, season: Optional[dict], custom_players: Optional[pd.DataFrame] = None) -> str:
    payload = {"draft": draft, "season": season}
    if custom_players is not None:
        payload["players"] = custom_players.to_dict(orient="records")
    return json.dumps(payload, indent=2, default=lambda x: float(x) if isinstance(x, np.floating) else int(x) if isinstance(x, np.integer) else str(x))


def deserialize_state(text: str) -> dict:
    data = json.loads(text)
    if "draft" not in data:
        raise ValueError("Save file does not contain a draft state.")
    return data
