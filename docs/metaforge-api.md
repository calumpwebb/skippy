# MetaForge Arc Raiders API Guide

Official API documentation for the Arc Raiders game data API.

## Base URL

```
https://metaforge.app/api/arc-raiders
```

## Usage Requirements

- **Attribution Required**: If you use this API in a public project, you must include attribution and a link to `metaforge.app/arc-raiders`
- **Commercial Use**: Contact via Discord before integrating into paid products or monetized services
- **Rate Limiting**: Large requests may be throttled. It's recommended to cache data locally rather than making direct API calls
- **Response Format**: All endpoints return JSON

## Common Response Structure

Most endpoints return paginated responses with this structure:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 519,
    "totalPages": 11,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

## Available Endpoints

### 1. Items (`/items`)

Retrieve game items with filtering, pagination, and component relationships.

**Endpoint**: `GET /api/arc-raiders/items`

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 50)

**Response**:
```json
{
  "data": [
    {
      "id": "acoustic-guitar",
      "name": "Acoustic Guitar",
      "description": "A playable acoustic guitar...",
      "item_type": "Quick Use",
      "loadout_slots": ["backpack", "quickUse"],
      "icon": "https://cdn.metaforge.app/arc-raiders/icons/acoustic-guitar.webp",
      "rarity": "Legendary",
      "value": 7000,
      "workbench": "Med Stations 1",
      "stat_block": {
        "weight": 1,
        "stackSize": 1,
        "damage": 0,
        ...
      },
      "flavor_text": "",
      "subcategory": "",
      "shield_type": "",
      "loot_area": "",
      "sources": null,
      "ammo_type": "",
      "locations": [],
      "guide_links": [],
      "game_asset_id": -229932290,
      "created_at": "2025-12-17T10:08:15.518082+00:00",
      "updated_at": "2026-01-06T22:55:53.547881+00:00"
    }
  ],
  "maxValue": 27500,
  "pagination": { ... }
}
```

**Example**:
```bash
curl "https://metaforge.app/api/arc-raiders/items?page=1&limit=50"
```

### 2. ARCs (`/arcs`)

Retrieve ARC units (enemies/missions) with optional loot data.

**Endpoint**: `GET /api/arc-raiders/arcs`

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 50)

**Response**:
```json
{
  "data": [
    {
      "id": "bastion",
      "name": "Bastion",
      "description": "A massive, heavily armored ARC unit...",
      "icon": "https://cdn.metaforge.app/.../bastion.webp",
      "image": "https://cdn.metaforge.app/.../bastion.webp",
      "created_at": "2025-10-08T11:16:51.624713+00:00",
      "updated_at": "2025-11-04T15:53:56.05961+00:00"
    }
  ],
  "pagination": {
    "total": 16,
    "totalPages": 8,
    ...
  }
}
```

**Example**:
```bash
curl "https://metaforge.app/api/arc-raiders/arcs?limit=20"
```

### 3. Quests (`/quests`)

Retrieve quests with required items and rewards.

**Endpoint**: `GET /api/arc-raiders/quests`

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 50)

**Response**:
```json
{
  "data": [
    {
      "id": "a-bad-feeling",
      "name": "A Bad Feeling",
      "objectives": [
        "Find and search any ARC Probe or ARC Courier"
      ],
      "xp": 0,
      "granted_items": [],
      "locations": [],
      "marker_category": null,
      "image": "https://cdn.metaforge.app/arc-raiders/images/a-bad-feeling.webp",
      "guide_links": [
        {
          "url": "https://metaforge.app/arc-raiders/a-bad-feeling-quest-arc-raiders",
          "label": "A Bad Feeling Quest Guide"
        }
      ],
      "trader_name": "Celeste",
      "sort_order": 0,
      "position": {
        "x": 210,
        "y": 800
      },
      "required_items": [],
      "rewards": [...],
      "created_at": "2025-10-07T14:15:00.671965+00:00",
      "updated_at": "2025-10-07T14:15:00.671965+00:00"
    }
  ],
  "pagination": {
    "total": 72,
    "totalPages": 36,
    ...
  }
}
```

**Example**:
```bash
curl "https://metaforge.app/api/arc-raiders/quests?page=1"
```

### 4. Traders (`/traders`)

Get all trader inventories.

**Endpoint**: `GET /api/arc-raiders/traders`

**Query Parameters**: None

**Response**:
```json
{
  "success": true,
  "data": {
    "Apollo": [
      {
        "id": "barricade-kit",
        "icon": "https://cdn.metaforge.app/arc-raiders/icons/barricade-kit.webp",
        "name": "Barricade Kit",
        "value": 640,
        "rarity": "Uncommon",
        "item_type": "Quick Use",
        "description": "A deployable cover that can block incoming damage...",
        "trader_price": 1920
      }
    ],
    "OtherTrader": [...]
  }
}
```

**Example**:
```bash
curl "https://metaforge.app/api/arc-raiders/traders"
```

### 5. Events Schedule (`/events-schedule`)

Retrieve all event timers and schedules.

**Endpoint**: `GET /api/arc-raiders/events-schedule`

**Query Parameters**: None

**Response**:
```json
{
  "data": [
    {
      "name": "Uncovered Caches",
      "map": "Buried City",
      "icon": "https://cdn.metaforge.app/arc-raiders/custom/cache.webp",
      "startTime": 1768190400000,
      "endTime": 1768194000000
    },
    {
      "name": "Night Raid",
      "map": "Spaceport",
      "icon": "https://cdn.metaforge.app/arc-raiders/custom/night.webp",
      "startTime": 1768194000000,
      "endTime": 1768197600000
    }
  ]
}
```

**Notes**:
- Times are in Unix timestamp format (milliseconds)
- Events are tied to specific maps

**Example**:
```bash
curl "https://metaforge.app/api/arc-raiders/events-schedule"
```

### 6. Game Map Data (`/game-map-data`)

Retrieve map data for specific maps.

**Endpoint**: `GET /api/arc-raiders/game-map-data`

**Query Parameters**:
- `map` (string): Map name (e.g., "Dustwick", "Dam", "Buried City", etc.)

**Response**: TBD (endpoint requires specific map parameter)

**Example**:
```bash
curl "https://metaforge.app/api/arc-raiders/game-map-data?map=Dustwick"
```

## Error Responses

The API returns standard HTTP error codes:

- `400 Bad Request` - Invalid parameters
- `404 Not Found` - Resource not found
- `413 Payload Too Large` - Request too large
- `500 Internal Server Error` - Server error

## Best Practices

1. **Cache Locally**: Download data once and cache it locally rather than making repeated API calls
2. **Respect Rate Limits**: Don't hammer the API with excessive requests
3. **Handle Pagination**: Use the `pagination` object to iterate through all pages
4. **Check `hasNextPage`**: Loop until `hasNextPage` is `false` to get all data
5. **Add Attribution**: Include a link back to MetaForge in your project

## Example: Fetching All Items with Pagination

```python
import httpx

def fetch_all_items():
    all_items = []
    page = 1

    while True:
        response = httpx.get(
            "https://metaforge.app/api/arc-raiders/items",
            params={"page": page, "limit": 50}
        )
        data = response.json()

        all_items.extend(data["data"])

        if not data["pagination"]["hasNextPage"]:
            break

        page += 1

    return all_items
```

## Support

- **Website**: https://metaforge.app/arc-raiders
- **API Docs**: https://metaforge.app/arc-raiders/api
- **Discord**: Contact via their Discord for commercial use or support
