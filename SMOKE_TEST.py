"""Quick non-UI validation: python SMOKE_TEST.py"""
from fantasy_engine import *

players = fallback_player_pool("PPR")
settings = default_settings()

# Verify manual pre-draft personality assignments are honored.
personality_names = cpu_personality_names()
overrides = {}
cpu_counter = 0
for team_idx in range(settings["teams"]):
    if team_idx == settings["draft_slot"] - 1:
        continue
    overrides[str(team_idx)] = personality_names[cpu_counter % len(personality_names)]
    cpu_counter += 1

draft = new_draft_state(settings, 2026, overrides)
for manager in draft["managers"]:
    if manager["personality"] != "User":
        assert manager["personality"] == overrides[str(manager["team_index"])]

while not draft["completed"]:
    team = draft["order"][draft["pick_index"]]
    manager = next(m for m in draft["managers"] if m["team_index"] == team)
    old = manager["personality"]
    if old == "User":
        manager["personality"] = "Balanced"
    pid = cpu_pick_player(draft, players, team)
    manager["personality"] = old
    record_pick(draft, pid, players)

# Strategic guardrails still apply no matter which personality is selected.
user_idx = settings["draft_slot"] - 1
cpu_round_one = [p for p in draft["picks"] if p["round"] == 1 and p["team_index"] != user_idx]
assert all(p["position"] in {"RB", "WR"} for p in cpu_round_one)
cpu_qbs = [p for p in draft["picks"] if p["position"] == "QB" and p["team_index"] != user_idx]
assert min(p["round"] for p in cpu_qbs) >= 3

season = initial_season_state(draft, players)
for _ in range(17):
    simulate_week(season, draft, players)

assert draft["completed"]
assert season["week"] == 17
assert season["champion"] is not None
assert len(find_trades(user_idx, season, draft, players, 5)) >= 1

# Save/import must retain the selected CPU personalities.
save_blob = serialize_state(draft, season, None)
restored = deserialize_state(save_blob)
for manager in restored["draft"]["managers"]:
    if manager["personality"] != "User":
        assert manager["personality"] == overrides[str(manager["team_index"])]

print("Fantasy GM smoke test passed.")
