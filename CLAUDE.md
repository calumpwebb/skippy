# Skippy

Arc Raiders game data cache and tooling.

## Data

The `data/` folder contains cached JSON responses from the MetaForge Arc Raiders API:

- `items.json` - All in-game items (519 items)
- `arcs.json` - ARC units/enemies (16 ARCs)
- `quests.json` - Quest data with objectives and rewards (72 quests)
- `traders.json` - Trader inventories
- `events-schedule.json` - Event timers and schedules

Run `uv run src/main.py` to refresh the cache.

## Documentation

See `docs/` for API documentation and guides.
