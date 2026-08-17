"""Quick non-UI validation: python SMOKE_TEST.py"""
from fantasy_engine import *

players = fallback_player_pool("PPR")
settings = default_settings()
draft = new_draft_state(settings, 2026)
while not draft["completed"]:
    team = draft["order"][draft["pick_index"]]
    manager = next(m for m in draft["managers"] if m["team_index"] == team)
    old = manager["personality"]
    if old == "User":
        manager["personality"] = "Balanced"
    pid = cpu_pick_player(draft, players, team)
    manager["personality"] = old
    record_pick(draft, pid, players)

season = initial_season_state(draft, players)
for _ in range(17):
    simulate_week(season, draft, players)

assert draft["completed"]
assert season["week"] == 17
assert season["champion"] is not None
assert len(find_trades(settings["draft_slot"] - 1, season, draft, players, 5)) >= 1
print("Fantasy GM smoke test passed.")
